import { BachsConfigError } from '../errors.js';
export function idPath(value: string, name: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new BachsConfigError(name + ' must be a non-empty string.');
  return encodeURIComponent(value);
}
