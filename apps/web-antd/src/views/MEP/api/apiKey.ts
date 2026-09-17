import type { ApiKeyItem } from './types';

import { message } from 'ant-design-vue';

import { mepRequestClient } from '#/api/request';

import { toSnakeCaseKeys, toEntityPayload } from './normalizers';

/**
 * 获取API Key列表
 */
export const fetchApiKeyList = async (): Promise<ApiKeyItem[]> => {
  try {
    const response = await mepRequestClient.get<ApiKeyItem[]>('/api-keys');
    return toSnakeCaseKeys(response);
  } catch (error) {
    console.error('获取API Key列表失败:', error);
    message.error('获取API Key列表失败');
    throw error;
  }
};

/**
 * 获取API Key详情
 */
export const fetchApiKeyDetail = async (id: number): Promise<ApiKeyItem> => {
  try {
    const response = await mepRequestClient.get<ApiKeyItem>(`/api-keys/${id}`);
    return toSnakeCaseKeys(response);
  } catch (error) {
    console.error('获取API Key详情失败:', error);
    message.error('获取API Key详情失败');
    throw error;
  }
};

/**
 * 创建API Key
 */
export const createApiKey = async (
  payload: Omit<
    ApiKeyItem,
    | 'id'
    | 'uid'
    | 'key'
    | 'key_masked'
    | 'usage_count'
    | 'created_at'
    | 'updated_at'
    | 'created_by'
  >,
): Promise<ApiKeyItem & { plain_key: string }> => {
  try {
    const response = await mepRequestClient.post<
      ApiKeyItem & { plain_key: string }
    >('/api-keys', payload);
    message.success('创建API Key成功');
    return toSnakeCaseKeys(response);
  } catch (error) {
    console.error('创建API Key失败:', error);
    message.error('创建API Key失败');
    throw error;
  }
};

/**
 * 更新API Key
 */
/** 对接实际后端实体字段与JSON配置。Use actual backend entity fields and serialized JSON configuration. */
export const updateApiKey = async (
  id: number,
  payload: Partial<
    Pick<
      ApiKeyItem,
      'name' | 'description' | 'status' | 'usage_limit' | 'expires_at'
    >
  >,
): Promise<ApiKeyItem> => {
  try {
    const response = await mepRequestClient.put<ApiKeyItem>(
      `/api-keys/${id}`,
      toEntityPayload(payload),
    );
    message.success('更新API Key成功');
    return toSnakeCaseKeys(response);
  } catch (error) {
    console.error('更新API Key失败:', error);
    message.error('更新API Key失败');
    throw error;
  }
};

/**
 * 删除API Key
 */
export const deleteApiKey = async (id: number): Promise<void> => {
  try {
    await mepRequestClient.delete(`/api-keys/${id}`);
    message.success('删除API Key成功');
  } catch (error) {
    console.error('删除API Key失败:', error);
    message.error('删除API Key失败');
    throw error;
  }
};

/**
 * 重新生成API Key
 */
export const regenerateApiKey = async (
  id: number,
): Promise<{ plain_key: string }> => {
  try {
    const response = await mepRequestClient.post<{ plain_key: string }>(
      `/api-keys/${id}/regenerate`,
    );
    message.success('重新生成API Key成功');
    return toSnakeCaseKeys(response);
  } catch (error) {
    console.error('重新生成API Key失败:', error);
    message.error('重新生成API Key失败');
    throw error;
  }
};

/**
 * 启用/禁用API Key
 */
export const toggleApiKeyStatus = async (
  id: number,
  status: 'active' | 'disabled',
): Promise<void> => {
  try {
    await mepRequestClient.put(`/api-keys/${id}/status`, { status });
    message.success(status === 'active' ? '已启用API Key' : '已禁用API Key');
  } catch (error) {
    console.error('更新API Key状态失败:', error);
    message.error('更新API Key状态失败');
    throw error;
  }
};
