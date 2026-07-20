import type { ConfigItem, DatasetConfig } from './types';

import { smpRequestClient } from '#/api/request'; // 根据实际路径调整

/**
 * 获取数据集配置
 */
export const fetchConfig = async (): Promise<DatasetConfig> => {
  try {
    return await smpRequestClient.get<DatasetConfig>('/smp/dataset-config');
  } catch (error) {
    console.error('获取配置失败:', error);
    throw error;
  }
};

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
