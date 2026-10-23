import { BachsConfigError } from '../errors.js';
export function idPath(value: string, name: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new BachsConfigError(name + ' must be a non-empty string.');
  // encodeURIComponent leaves "." and ".." alone, and URL parsing then resolves them as path navigation,
  // which would send the request (and the API key) to a different endpoint.
  if (value === '.' || value === '..') throw new BachsConfigError(name + ' must be an identifier, not a path segment like "' + value + '".');
  return encodeURIComponent(value);
}
