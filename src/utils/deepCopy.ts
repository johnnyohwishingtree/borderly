/**
 * Deep-copies a JSON-serialisable value using JSON round-trip.
 *
 * `structuredClone` is not available on the Hermes JS engine (used by React
 * Native), so this utility centralises the workaround and makes it easy to
 * replace with a native implementation if Hermes gains support in the future.
 */
export function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
