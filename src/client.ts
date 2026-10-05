import { BachsAbortError, BachsApiError, BachsConfigError, BachsError, BachsNetworkError, BachsResponseError, BachsTimeoutError } from './errors.js';
import type { BachsOptions, ReadRequestOptions, WriteRequestOptions } from './types.js';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';
type QueryValue = string | number | boolean | undefined;
interface Operation {
  body?: unknown;
  query?: Record<string, QueryValue>;
  options?: ReadRequestOptions | WriteRequestOptions;
}

const retryStatuses = new Set([429, 500, 502, 503, 504]);

function positiveInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value <= 0 || value > 2147483647) throw new BachsConfigError(field + ' must be an integer between 1 and 2147483647 milliseconds.');
  return value;
}
function retries(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new BachsConfigError('maxRetries must be a non-negative integer.');
  return value;
}
function retryAfterMs(value: string | null): number {
  if (value === null) return 0;
  if (/^\d+(?:\.\d+)?$/.test(value.trim())) return Number(value) * 1000;
  const date = Date.parse(value);
  return Number.isNaN(date) ? 0 : Math.max(0, date - Date.now());
}
function delayMs(attempt: number, hint: string | null): number {
  // Small random spread avoids synchronized retries; the overall deadline bounds all waits.
  const backoff = Math.min(2000, 500 * 2 ** Math.min(attempt, 3));
  return Math.max(backoff * (0.75 + Math.random() * 0.5), retryAfterMs(hint));
}
function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(signal.reason); return; }
    const finish = () => { signal.removeEventListener('abort', abort); resolve(); };
    const timer = setTimeout(finish, ms);
    const abort = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); reject(signal.reason); };
    signal.addEventListener('abort', abort, { once: true });
  });
}

export class Transport {
  readonly #apiKey: string;
  readonly #baseURL: URL;
  readonly #timeoutMs: number;
  readonly #maxRetries: number;

  constructor(options: BachsOptions) {
    if (!options || typeof options.apiKey !== 'string' || options.apiKey.trim() === '') {
      throw new BachsConfigError('A server API key is required.');
    }
    if (options.apiKey !== options.apiKey.trim() || /[\r\n]/.test(options.apiKey)) {
      throw new BachsConfigError('The API key cannot contain surrounding whitespace or line breaks.');
    }
    if (options.environment !== 'sandbox' && options.environment !== 'production') {
      throw new BachsConfigError('Choose environment sandbox or production explicitly.');
    }
    let base: URL;
    try {
      base = new URL(options.baseURL ?? (options.environment === 'sandbox' ? 'https://sandbox-api.bachs.io' : 'https://api.bachs.io'));
    } catch (cause) { throw new BachsConfigError('baseURL must be an absolute URL.', cause); }
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
    if ((base.protocol !== 'https:' && !(base.protocol === 'http:' && loopback)) || base.username || base.password || base.search || base.hash) {
      throw new BachsConfigError('baseURL must use HTTPS (or local HTTP for tests), without credentials, query or fragment.');
    }
    this.#apiKey = options.apiKey;
    this.#baseURL = base;
    this.#timeoutMs = positiveInteger(options.timeoutMs ?? 30_000, 'timeoutMs');
    this.#maxRetries = retries(options.maxRetries ?? 2);
  }

  async request<T>(method: Method, path: string, operation: Operation, decode: (value: unknown) => T): Promise<T> {
    const started = performance.now();
    const options = operation.options ?? {};
    const timeoutMs = positiveInteger(options.timeoutMs ?? this.#timeoutMs, 'timeoutMs');
    const maxRetries = method === 'GET' ? retries('maxRetries' in options ? options.maxRetries ?? this.#maxRetries : this.#maxRetries) : 0;
    const deadline = started + timeoutMs;
    const signal = options.signal;
    const write = method !== 'GET';
    let sent = false;
    let responseStatus: number | undefined;
    let abortSource: 'caller' | 'deadline' | undefined;
    const controller = new AbortController();
    const callerAbort = () => {
      if (!controller.signal.aborted) { abortSource = 'caller'; controller.abort(signal?.reason); }
    };
    if (signal?.aborted) callerAbort();
    signal?.addEventListener('abort', callerAbort, { once: true });
    const timer = setTimeout(() => {
      if (!controller.signal.aborted) { abortSource = 'deadline'; controller.abort(new Error('Operation deadline exceeded.')); }
    }, timeoutMs);
    const failure = (cause: unknown): BachsNetworkError => {
      const unknown = write && sent;
      if (abortSource === 'deadline') return new BachsTimeoutError('The operation exceeded its total deadline.', cause, unknown, responseStatus);
      if (abortSource === 'caller') return new BachsAbortError('The operation was canceled by the caller.', cause, unknown, responseStatus);
      return new BachsNetworkError('No usable response was received from Bachs.', cause, unknown, responseStatus);
    };

    try {
      if (controller.signal.aborted) throw failure(controller.signal.reason);
      const url = new URL(this.#baseURL);
      url.pathname = url.pathname.replace(/\/$/, '') + path;
      for (const [key, value] of Object.entries(operation.query ?? {})) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
      let body: string | undefined;
      try { body = operation.body === undefined ? undefined : JSON.stringify(operation.body); }
      catch (cause) { throw new BachsConfigError('Request data must be JSON-serializable.', cause); }
      let headers: Headers;
      try {
        headers = new Headers({ Accept: 'application/json', Authorization: 'Bearer ' + this.#apiKey });
        if (body !== undefined) headers.set('Content-Type', 'application/json');
        if (write && 'idempotencyKey' in options && options.idempotencyKey !== undefined) {
          if (typeof options.idempotencyKey !== 'string' || options.idempotencyKey.trim() === '' || options.idempotencyKey !== options.idempotencyKey.trim() || /[\r\n]/.test(options.idempotencyKey)) {
            throw new BachsConfigError('idempotencyKey must be a non-empty header value without surrounding whitespace or line breaks.');
          }
          headers.set('Idempotency-Key', options.idempotencyKey);
        }
      } catch (cause) {
        if (cause instanceof BachsConfigError) throw cause;
        throw new BachsConfigError('Request headers could not be constructed.', cause);
      }

      for (let attempt = 0; ; attempt++) {
        responseStatus = undefined;
        if (performance.now() >= deadline && !controller.signal.aborted) {
          abortSource = 'deadline'; controller.abort(new Error('Operation deadline exceeded.'));
        }
        if (controller.signal.aborted) throw failure(controller.signal.reason);
        try {
          sent = true;
          const response = await fetch(url, { method, headers, ...(body === undefined ? {} : { body }), signal: controller.signal, redirect: 'manual' });
          responseStatus = response.status;
          const text = await response.text();
          const requestId = response.headers.get('x-request-id') ?? undefined;
          let value: unknown;
          let parseCause: unknown;
          try { value = JSON.parse(text); }
          catch (cause) { value = text; parseCause = cause; }

          if (!response.ok) {
            const error = new BachsApiError(response.status, value, requestId, response.headers.get('retry-after') ?? undefined, write && response.status >= 500);
            if (method === 'GET' && attempt < maxRetries && retryStatuses.has(response.status)) {
              const delay = delayMs(attempt, response.headers.get('retry-after'));
              if (delay < deadline - performance.now()) {
                await sleep(delay, controller.signal);
                continue;
              }
            }
            throw error;
          }
          if (parseCause !== undefined) throw new BachsResponseError(response.status, text, parseCause, write && sent, requestId);
          let result: T;
          try { result = decode(value); }
          catch (cause) { throw new BachsResponseError(response.status, value, cause, write && sent, requestId); }
          if (performance.now() >= deadline && !controller.signal.aborted) {
            abortSource = 'deadline'; controller.abort(new Error('Operation deadline exceeded.'));
          }
          if (controller.signal.aborted) throw failure(controller.signal.reason);
          return result;
        } catch (cause) {
          if (controller.signal.aborted) throw failure(cause);
          if (cause instanceof BachsError) throw cause;
          const error = failure(cause);
          if (method === 'GET' && attempt < maxRetries) {
            const delay = delayMs(attempt, null);
            if (delay < deadline - performance.now()) {
              try { await sleep(delay, controller.signal); }
              catch (waitCause) { throw failure(waitCause); }
              continue;
            }
          }
          throw error;
        }
      }
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', callerAbort);
    }
  }
}
