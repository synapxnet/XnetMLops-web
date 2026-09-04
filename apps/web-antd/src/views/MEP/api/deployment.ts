import type {
  DeploymentLog,
  ModelDeployment,
  MTPOutputModel,
  ServiceMetricSummary,
  ServiceMetrics,
} from './types';

import { message } from 'ant-design-vue';

import { mepRequestClient } from '#/api/request';

import { toSnakeCaseKeys } from './normalizers';

/**
 * 获取模型部署列表
 */
export const fetchDeploymentList = async (): Promise<ModelDeployment[]> => {
  try {
    const response =
      await mepRequestClient.get<ModelDeployment[]>('/deployments');
    return toSnakeCaseKeys(response);
  } catch (error) {
    console.error('获取部署列表失败:', error);
    message.error('获取部署列表失败');
    throw error;
  }
};

/**
 * 获取部署详情
 */
export const fetchDeploymentDetail = async (
  id: number,
): Promise<ModelDeployment> => {
  try {
    const response = await mepRequestClient.get<ModelDeployment>(
      `/deployments/${id}`,
    );
    return toSnakeCaseKeys(response);
  } catch (error) {
    console.error('获取部署详情失败:', error);
    message.error('获取部署详情失败');
    throw error;
  }
};

/**
 * 创建模型部署
 */
export const createDeployment = async (
  payload: Omit<
    ModelDeployment,
    | 'id'
    | 'uid'
    | 'status'
    | 'container_id'
    | 'endpoint'
    | 'created_at'
    | 'updated_at'
    | 'created_by'
  >,
): Promise<ModelDeployment> => {
  try {
    const response = await mepRequestClient.post<ModelDeployment>(
      '/deployments',
      payload,
    );
    message.success('创建部署任务成功');
    return toSnakeCaseKeys(response);
  } catch (error) {
    console.error('创建部署失败:', error);
    message.error('创建部署失败');
    throw error;
  }
};

/**
 * 更新模型部署
 */
export const updateDeployment = async (
  id: number,
  payload: Partial<ModelDeployment>,
): Promise<ModelDeployment> => {
  try {
    const response = await mepRequestClient.put<ModelDeployment>(
      `/deployments/${id}`,
      payload,
    );
    message.success('更新部署配置成功');
    return toSnakeCaseKeys(response);
  } catch (error) {
    console.error('更新部署失败:', error);
    message.error('更新部署失败');
    throw error;
  }
};

/**
 * 删除模型部署
 */
export const deleteDeployment = async (id: number): Promise<void> => {
  try {
    await mepRequestClient.delete(`/deployments/${id}`);
    message.success('删除部署成功');
  } catch (error) {
    console.error('删除部署失败:', error);
    message.error('删除部署失败');
    throw error;
  }
};

/**
 * 启动部署
 */
export const startDeployment = async (id: number): Promise<void> => {
  try {
    await mepRequestClient.post(`/deployments/${id}/start`);
    message.success('启动部署成功');
  } catch (error) {
    console.error('启动部署失败:', error);
    message.error('启动部署失败');
    throw error;
  }
};

/**
 * 停止部署
 */
export const stopDeployment = async (id: number): Promise<void> => {
  try {
    await mepRequestClient.post(`/deployments/${id}/stop`);
    message.success('停止部署成功');
  } catch (error) {
    console.error('停止部署失败:', error);
    message.error('停止部署失败');
    throw error;
  }
};

/**
 * 重启部署
 */
export const restartDeployment = async (id: number): Promise<void> => {
  try {
    await mepRequestClient.post(`/deployments/${id}/restart`);
    message.success('重启部署成功');
  } catch (error) {
    console.error('重启部署失败:', error);
    message.error('重启部署失败');
    throw error;
  }
};

/**
 * 获取部署日志
 */
export const fetchDeploymentLogs = async (
  deploymentId: number,
  params?: { limit?: number; since?: string },
): Promise<DeploymentLog[]> => {
  try {
    const response = await mepRequestClient.get<DeploymentLog[]>(
      `/deployments/${deploymentId}/logs`,
      { params },
    );
    return response;
  } catch (error) {
    console.error('获取部署日志失败:', error);
    throw error;
  }
};

/**
 * 获取部署监控指标
 */
export const fetchDeploymentMetrics = async (
  deploymentId: number,
  params?: { start?: string; end?: string },
): Promise<ServiceMetrics[]> => {
  try {
    const response = await mepRequestClient.get<ServiceMetrics[]>(
      `/deployments/${deploymentId}/metrics`,
      { params },
    );
    return response;
  } catch (error) {
    console.error('获取监控指标失败:', error);
    throw error;
  }
};

/**
 * 获取部署实时聚合指标
 */
export const fetchDeploymentMetricSummary = async (
  deploymentId: number,
): Promise<ServiceMetricSummary> => {
  try {
    const response = await mepRequestClient.get<ServiceMetricSummary>(
      `/deployments/${deploymentId}/metrics/summary`,
    );
    return toSnakeCaseKeys(response);
  } catch (error) {
    console.error('获取实时指标失败:', error);
    throw error;
  }
};

/**
 * 扩缩容
 */
export const scaleDeployment = async (
  id: number,
  replicas: number,
): Promise<void> => {
  try {
    await mepRequestClient.post(`/deployments/${id}/scale`, { replicas });
    message.success('扩缩容操作成功');
  } catch (error) {
    console.error('扩缩容失败:', error);
    message.error('扩缩容失败');
    throw error;
  }
};

/**
 * 获取MTP输出模型列表(可用于部署)
 */
export const fetchMTPOutputModels = async (): Promise<MTPOutputModel[]> => {
  try {
    const response =
      await mepRequestClient.get<MTPOutputModel[]>('/mtp-models');
    return response;
  } catch (error) {
    console.error('获取MTP模型列表失败:', error);
    message.error('获取MTP模型列表失败');
    throw error;
  }
};
