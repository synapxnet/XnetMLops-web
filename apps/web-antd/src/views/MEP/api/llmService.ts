import type { LLMService, LLMServiceConfig } from './types';

import { message } from 'ant-design-vue';

import { mepRequestClient } from '#/api/request';

/**
 * 获取大模型服务列表
 */
export const fetchLLMServiceList = async (): Promise<LLMService[]> => {
  try {
    const response = await mepRequestClient.get<LLMService[]>('/llm-services');
    return response;
  } catch (error) {
    console.error('获取大模型服务列表失败:', error);
    message.error('获取大模型服务列表失败');
    throw error;
  }
};

/**
 * 获取大模型服务详情
 */
export const fetchLLMServiceDetail = async (
  id: number,
): Promise<LLMService> => {
  try {
    const response = await mepRequestClient.get<LLMService>(
      `/llm-services/${id}`,
    );
    return response;
  } catch (error) {
    console.error('获取大模型服务详情失败:', error);
    message.error('获取大模型服务详情失败');
    throw error;
  }
};

/**
 * 创建大模型服务
 */
export const createLLMService = async (
  payload: Omit<
    LLMService,
    | 'id'
    | 'uid'
    | 'status'
    | 'created_at'
    | 'updated_at'
    | 'created_by'
    | 'updated_by'
  >,
): Promise<LLMService> => {
  try {
    const response = await mepRequestClient.post<LLMService>(
      '/llm-services',
      payload,
    );
    message.success('创建大模型服务成功');
    return response;
  } catch (error) {
    console.error('创建大模型服务失败:', error);
    message.error('创建大模型服务失败');
    throw error;
  }
};

/**
 * 更新大模型服务
 */
export const updateLLMService = async (
  id: number,
  payload: Partial<LLMService>,
): Promise<LLMService> => {
  try {
    const response = await mepRequestClient.put<LLMService>(
      `/llm-services/${id}`,
      payload,
    );
    message.success('更新大模型服务成功');
    return response;
  } catch (error) {
    console.error('更新大模型服务失败:', error);
    message.error('更新大模型服务失败');
    throw error;
  }
};

/**
 * 删除大模型服务
 */
export const deleteLLMService = async (id: number): Promise<void> => {
  try {
    await mepRequestClient.delete(`/llm-services/${id}`);
    message.success('删除大模型服务成功');
  } catch (error) {
    console.error('删除大模型服务失败:', error);
    message.error('删除大模型服务失败');
    throw error;
  }
};

/**
 * 启动大模型服务
 */
export const startLLMService = async (id: number): Promise<void> => {
  try {
    await mepRequestClient.post(`/llm-services/${id}/start`);
    message.success('启动服务成功');
  } catch (error) {
    console.error('启动服务失败:', error);
    message.error('启动服务失败');
    throw error;
  }
};

/**
 * 停止大模型服务
 */
export const stopLLMService = async (id: number): Promise<void> => {
  try {
    await mepRequestClient.post(`/llm-services/${id}/stop`);
    message.success('停止服务成功');
  } catch (error) {
    console.error('停止服务失败:', error);
    message.error('停止服务失败');
    throw error;
  }
};

/**
 * 测试大模型服务连接
 */
export const testLLMServiceConnection = async (payload: {
  endpoint: string;
  api_key?: string;
  type: string;
}): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await mepRequestClient.post<{
      success: boolean;
      message: string;
    }>('/llm-services/test-connection', payload);
    return response;
  } catch (error) {
    console.error('测试连接失败:', error);
    throw error;
  }
};
