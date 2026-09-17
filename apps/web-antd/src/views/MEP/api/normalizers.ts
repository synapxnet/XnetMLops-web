/** 将现有实体响应转换为页面字段。Convert existing entity responses to UI field names. */
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

/** 映射顶层实体字段，JSON配置内部键原样保留。Map top-level entity fields while preserving keys inside JSON configuration. */
export function toEntityPayload(value: object): Record<string, unknown> {
  const jsonFields = new Set(['config', 'resource_config', 'nginx_config', 'health_check', 'labels']);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase()),
    jsonFields.has(key) && item !== null && typeof item === 'object' ? JSON.stringify(item) : item,
  ]));
}

/** 还原后端以String存储的配置，解析失败明确报错。Restore string-backed configuration and report invalid JSON explicitly. */
export function fromEntityResponse<T>(value: unknown): T {
  if (Array.isArray(value)) return value.map((item) => fromEntityResponse(item)) as T;
  const record = toSnakeCaseKeys<Record<string, unknown>>(value);
  if (!record || typeof record !== 'object') return record as T;
  for (const key of ['config', 'resource_config', 'nginx_config', 'health_check']) {
    if (typeof record[key] === 'string' && record[key] !== '') {
      try { record[key] = JSON.parse(record[key] as string); }
      catch { throw new Error('服务配置格式不可用，请修复配置后重试'); }
    }
  }
  return record as T;
}
