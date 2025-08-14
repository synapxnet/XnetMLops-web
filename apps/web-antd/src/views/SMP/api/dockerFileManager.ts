import type { ApiResponse, DockerFile, DockerFilePushStatus } from './types';

import { message } from 'ant-design-vue';

import { smpRequestClient } from '#/api/request';
/**
 * 获取所有Docker文件
 */
export function getDockerFiles(): Promise<ApiResponse<DockerFile[]>> {
  return smpRequestClient.get('/smp/dockerfile');
}

/**
 * 创建Docker文件
 * @param data Docker文件数据
 */
export function createDockerFile(
  data: DockerFile,
): Promise<ApiResponse<DockerFile>> {
  return smpRequestClient.post('/smp/dockerfile/create', data);
}

/**
 * 更新Docker文件
 * @param id Docker文件ID
 * @param data Docker文件数据
 */
export function updateDockerFile(
  id: number,
  data: DockerFile,
): Promise<ApiResponse<DockerFile>> {
  return smpRequestClient.put(`/smp/dockerfile/${id}`, data);
}

/**
 * 删除Docker文件
 * @param id Docker文件ID
 */
export function deleteDockerFile(id: number): Promise<ApiResponse<void>> {
  return smpRequestClient.delete(`/smp/dockerfile/${id}`);
}

/**
 * 更新推送状态
 * @param uid Docker文件UID
 * @param status 推送状态
 * @param history 推送历史
 */
export function updatePushStatus(
  uid: string,
  status: DockerFilePushStatus,
  history: string,
): Promise<ApiResponse<void>> {
  const data = {
    uid,
    status,
    pushHistory: history, // 使用后端期望的参数名
  };
  return smpRequestClient.post('/smp/dockerfile/update-push-status', data);
}

// 在 dockerFileManager.ts 中添加以下内容

// 定义流水线配置参数类型（根据后端 PipelineConfigParams 结构）
export interface PipelineConfigParams {
  buildArgs?: Record<string, string>;
  envVars?: Array<{ name: string; value: string }>;
  sourceCodeUrl: string;
  branch: string;
  buildCommand?: string;
  outputPath?: string;
  // 根据实际需要添加其他字段
}

/**
 * 创建Docker流水线
 * @param dockerUID Docker文件UID
 * @param tenantUid 租户ID
 * @param params 流水线配置参数
 */
export const createPipeline = async (
  uid: string,
  tenantUid: string,
  userId: string,
) => {
  try {
    const response = await smpRequestClient.post(
      '/smp/dockerfile/pipeline', // 创建流水线接口
      {}, // 空请求体
      {
        params: {
          dockerUID: `${uid}`, // 使用任务UID作为作业名称
        },
        headers: {
          'X-Tenant-Uid': tenantUid,
          'X-User-Id': userId,
        },
      },
    );

    return response;
  } catch (error) {
    message.error('启动训练任务失败');
    throw error;
  }
};
