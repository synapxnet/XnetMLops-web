export function toSnakeCaseKeys<T>(value: unknown): T {
  if (Array.isArray(value)) {
    return value.map((item) => toSnakeCaseKeys(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
        toSnakeCaseKeys(item),
      ]),
    ) as T;
  }

  return value as T;
}
