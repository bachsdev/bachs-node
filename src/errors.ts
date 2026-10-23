export class BachsError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = new.target.name;
  }
}

export class BachsConfigError extends BachsError {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The API answered with a non-2xx HTTP status code: `statusCode` is that number, `errorCode` the Bachs error code from the body. */
export class BachsApiError extends BachsError {
  readonly statusCode: number;
  readonly body: unknown;
  readonly errorCode: string | undefined;
  readonly fieldErrors: unknown[] | undefined;
  readonly requestId: string | undefined;
  readonly retryAfter: string | undefined;
  readonly outcomeUnknown: boolean;

  constructor(statusCode: number, body: unknown, requestId?: string, retryAfter?: string, outcomeUnknown = false) {
    super(isRecord(body) && typeof body.detail === 'string' ? body.detail : 'Bachs returned HTTP ' + statusCode);
    this.statusCode = statusCode;
    this.body = body;
    this.errorCode = isRecord(body) && typeof body.error_code === 'string' ? body.error_code : undefined;
    this.fieldErrors = isRecord(body) && Array.isArray(body.errors) ? body.errors : undefined;
    this.requestId = requestId;
    this.retryAfter = retryAfter;
    this.outcomeUnknown = outcomeUnknown;
  }
}

export class BachsNetworkError extends BachsError {
  readonly outcomeUnknown: boolean;
  readonly responseStatusCode: number | undefined;

  constructor(message: string, cause: unknown, outcomeUnknown: boolean, responseStatusCode?: number) {
    super(message, cause);
    this.outcomeUnknown = outcomeUnknown;
    this.responseStatusCode = responseStatusCode;
  }
}

export class BachsTimeoutError extends BachsNetworkError {}
export class BachsAbortError extends BachsNetworkError {}

export class BachsResponseError extends BachsError {
  readonly statusCode: number;
  readonly body: unknown;
  readonly outcomeUnknown: boolean;
  readonly requestId: string | undefined;

  constructor(statusCode: number, body: unknown, cause: unknown, outcomeUnknown: boolean, requestId?: string) {
    super('Bachs returned a successful HTTP response with an unusable response body.', cause);
    this.statusCode = statusCode;
    this.body = body;
    this.outcomeUnknown = outcomeUnknown;
    this.requestId = requestId;
  }
}

export class BachsWebhookError extends BachsError {}
