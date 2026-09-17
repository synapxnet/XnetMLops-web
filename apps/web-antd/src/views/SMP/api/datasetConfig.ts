import type { ConfigItem, DatasetConfig } from './types';
export type { ConfigItem, DatasetConfig } from './types';

import { smpRequestClient } from '#/api/request'; // 根据实际路径调整

/**
 * 获取数据集配置
 */
export const fetchConfig = async (): Promise<DatasetConfig> => {
  try {
    return validateDatasetConfig(await smpRequestClient.get<DatasetConfig>('/smp/dataset-config'));
  } catch (error) {
    console.error('获取配置失败:', error);
    throw error;
  }
};

/** 验证配置数组，错误结构不能使整个页面崩溃。Validate configuration arrays so malformed responses cannot crash the page. */
export function validateDatasetConfig(value: unknown): DatasetConfig {
  const config = value as DatasetConfig | null;
  if (!config || !Array.isArray(config.datasetTypes) || !Array.isArray(config.datasetZones)) throw new Error('数据集配置返回结构不完整，请重试');
  for (const item of [...config.datasetTypes, ...config.datasetZones]) {
    if (!item || typeof item.label !== 'string' || typeof item.value !== 'string') throw new Error('数据集配置项格式无效，请重试');
  }
  return config;
}

/** 更新既有配置的标签，标识保持不变。Update an existing configuration label while keeping its identifier. */
export async function updateConfigItem(type: keyof DatasetConfig, value: string, item: ConfigItem): Promise<void> {
  await smpRequestClient.put(`/smp/dataset-config/${type}/${encodeURIComponent(value)}`, { label: item.label });
}

/**
 * 保存数据集配置
 */
export const addConfigItem = async (
  type: keyof DatasetConfig,
  item: ConfigItem,
): Promise<void> => {
  try {
    await smpRequestClient.post(`/smp/dataset-config/${type}`, item);
  } catch (error) {
    console.error('添加配置项失败:', error);
    throw error;
  }
};

/**
 * 删除配置项
 */
export const deleteConfigItem = async (
  type: keyof DatasetConfig,
  value: string,
): Promise<void> => {
  try {
    await smpRequestClient.delete(`/smp/dataset-config/${type}/${value}`);
  } catch (error) {
    console.error('删除配置项失败:', error);
    throw error;
  }
};
