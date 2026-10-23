import { BachsConfigError } from './errors.js';
import type { BachsLogLevel, BachsLogger } from './types.js';

const levels: Record<BachsLogLevel, number> = { debug: 0, info: 1, warn: 2, off: 3 };

// Without a logger, warnings reach console.warn and nothing else is printed.
const consoleOnly: BachsLogger = {
  debug() {},
  info() {},
  warn(message) { console.warn(message); },
  error(message) { console.error(message); },
};

function resolveLevel(explicit: BachsLogLevel | undefined): BachsLogLevel {
  const fromEnv = typeof process !== 'undefined' ? process.env?.BACHS_LOG : undefined;
  const candidate = explicit ?? fromEnv ?? 'warn';
  if (!(candidate in levels)) {
    if (explicit !== undefined) throw new BachsConfigError('logLevel must be debug, info, warn or off.');
    return 'warn';
  }
  return candidate as BachsLogLevel;
}

/** Log lines from the SDK. Never given the API key, request or response bodies, portal URLs or webhook secrets. */
export class Log {
  readonly #logger: BachsLogger;
  readonly #threshold: number;

  constructor(logger: BachsLogger | undefined, level: BachsLogLevel | undefined) {
    const methods: unknown = logger;
    if (logger !== undefined && (typeof methods !== 'object' || methods === null || ['debug', 'info', 'warn', 'error'].some(m => typeof (methods as Record<string, unknown>)[m] !== 'function'))) {
      throw new BachsConfigError('logger must have debug, info, warn and error methods.');
    }
    this.#logger = logger ?? consoleOnly;
    this.#threshold = levels[resolveLevel(level)];
  }

  debug(message: string): void { if (this.#threshold <= levels.debug) this.#logger.debug('Bachs: ' + message); }
  info(message: string): void { if (this.#threshold <= levels.info) this.#logger.info('Bachs: ' + message); }
  warn(message: string): void { if (this.#threshold <= levels.warn) this.#logger.warn('Bachs: ' + message); }
}
