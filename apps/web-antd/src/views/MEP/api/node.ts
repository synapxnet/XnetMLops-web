import { toEntityPayload } from './normalizers';
import type { DeployNode } from './types';

import { message } from 'ant-design-vue';

import { mepRequestClient } from '#/api/request';

/** 节点编辑表单字段；请求适配器转换为Java实体。Node form fields converted by the request adapter into the Java entity. */
export interface DeployNodeInput {
  name: string;
  ip_address: string;
  port: number;
  cpu_cores: number;
  memory_gb: number;
  gpu_info: null | string;
  labels: string | string[];
  description: string;
}

/**
 * 获取部署节点列表
 */
export const fetchNodeList = async (): Promise<DeployNode[]> => {
  try {
    const response = await mepRequestClient.get<DeployNode[]>('/nodes');
    return response;
  } catch (error) {
    console.error('获取节点列表失败:', error);
    message.error('获取节点列表失败');
    throw error;
  }
};

/**
 * 获取节点详情
 */
export const fetchNodeDetail = async (id: number): Promise<DeployNode> => {
  try {
    const response = await mepRequestClient.get<DeployNode>(`/nodes/${id}`);
    return response;
  } catch (error) {
    console.error('获取节点详情失败:', error);
    message.error('获取节点详情失败');
    throw error;
  }
};

/**
 * 创建部署节点
 */
/** 对接实际后端实体字段与JSON配置。Use actual backend entity fields and serialized JSON configuration. */
export const createNode = async (
  payload: DeployNodeInput,
): Promise<DeployNode> => {
  try {
    const response = await mepRequestClient.post<DeployNode>('/nodes', toEntityPayload(payload));
    message.success('创建节点成功');
    return response;
  } catch (error) {
    console.error('创建节点失败:', error);
    message.error('创建节点失败');
    throw error;
  }
};

/**
 * 更新部署节点
 */
/** 对接实际后端实体字段与JSON配置。Use actual backend entity fields and serialized JSON configuration. */
export const updateNode = async (
  id: number,
  payload: Partial<DeployNodeInput>,
): Promise<DeployNode> => {
  try {
    const response = await mepRequestClient.put<DeployNode>(
      `/nodes/${id}`,
      toEntityPayload(payload),
    );
    message.success('更新节点成功');
    return response;
  } catch (error) {
    console.error('更新节点失败:', error);
    message.error('更新节点失败');
    throw error;
  }
};

/**
 * 删除部署节点
 */
export const deleteNode = async (id: number): Promise<void> => {
  try {
    await mepRequestClient.delete(`/nodes/${id}`);
    message.success('删除节点成功');
  } catch (error) {
    console.error('删除节点失败:', error);
    message.error('删除节点失败');
    throw error;
  }
};

/**
 * 测试节点连接
 */
export const testNodeConnection = async (payload: {
  ip_address: string;
  port: number;
}): Promise<{ success: boolean; message: string; docker_version?: string }> => {
  try {
    const response = await mepRequestClient.post<{
      success: boolean;
      message: string;
      docker_version?: string;
    }>('/nodes/test-connection', payload);
    return response;
  } catch (error) {
    console.error('测试节点连接失败:', error);
    throw error;
  }
};

/**
 * 刷新节点状态
 */
export const refreshNodeStatus = async (id: number): Promise<DeployNode> => {
  try {
    const response = await mepRequestClient.post<DeployNode>(
      `/nodes/${id}/refresh`,
    );
    return response;
  } catch (error) {
    console.error('刷新节点状态失败:', error);
    message.error('刷新节点状态失败');
    throw error;
  }
};

/**
 * 获取节点资源使用情况
 */
export const fetchNodeResources = async (
  id: number,
): Promise<{
  cpu_usage: number;
  memory_usage: number;
  memory_total: number;
  disk_usage: number;
  disk_total: number;
  containers_running: number;
}> => {
  try {
    const response = await mepRequestClient.get(`/nodes/${id}/resources`);
    return response;
  } catch (error) {
    console.error('获取节点资源失败:', error);
    throw error;
  }
};

/**
 * 设置节点维护模式
 */
export const setNodeMaintenance = async (
  id: number,
  maintenance: boolean,
): Promise<void> => {
  try {
    await mepRequestClient.post(`/nodes/${id}/maintenance`, {
      maintenance,
    });
    message.success(maintenance ? '已进入维护模式' : '已退出维护模式');
  } catch (error) {
    console.error('设置维护模式失败:', error);
    message.error('设置维护模式失败');
    throw error;
  }
};
