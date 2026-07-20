// src/services/jenkinsService.ts
import type { PipelineConfigParams } from '@/types'; // 假设有对应的类型定义

import { message } from 'ant-design-vue';

import { mtpRequestClient } from '#/api/request';

// Jenkins 作业信息接口
interface JenkinsJobInfo {
  name: string;
  url: string;
  buildable: boolean;
  lastBuild?: {
    building?: boolean;
    number: number;
    result?: string;
    url: string;
  };
  // 可根据需要扩展其他字段
}

/**
 * 创建 Jenkins 流水线
 * @param jobName 作业名称
 * @param params 流水线配置参数
 * @returns 创建结果消息
 */
export const createJenkinsPipeline = async (
  jobName: string,
  params: PipelineConfigParams,
) => {
  try {
    const response = await mtpRequestClient.post<string>(
      '/api/mtp/pipeline',
      params,
      {
        params: { jobName },
      },
    );
    return response;
  } catch (error) {
    message.error('创建 Jenkins 流水线失败');
    throw error;
  }
};

/**
 * 触发 Jenkins 构建
 * @param jobName 作业名称
 * @returns 触发结果消息
 */
export const triggerJenkinsBuild = async (jobName: string) => {
  try {
    const response = await mtpRequestClient.post<string>(
      `/api/mtp/build/${encodeURIComponent(jobName)}`,
    );
    return response;
  } catch (error) {
    message.error('触发 Jenkins 构建失败');
    throw error;
  }
};

/**
 * 获取 Jenkins 作业信息
 * @param jobName 作业名称
 * @returns 作业信息
 */
export const getJenkinsJobInfo = async (jobName: string) => {
  try {
    const response = await mtpRequestClient.get<JenkinsJobInfo>(
      `/api/mtp/job/${encodeURIComponent(jobName)}`,
    );
    return response;
  } catch (error) {
    message.error('获取 Jenkins 作业信息失败');
    throw error;
  }
};

/**
 * 获取 Jenkins 构建控制台输出
 * @param jobName 作业名称
 * @param buildNumber 构建编号
 * @returns 控制台输出文本
 */
export const getJenkinsConsoleOutput = async (
  jobName: string,
  buildNumber: number,
) => {
  try {
    const response = await mtpRequestClient.get<string>(
      `/api/mtp/build/${encodeURIComponent(jobName)}/${buildNumber}/console`,
    );
    return response;
  } catch (error) {
    message.error('获取构建控制台输出失败');
    throw error;
  }
};

/**
 * 停止 Jenkins 构建
 * @param jobName 作业名称
 * @param buildNumber 构建编号
 * @returns 停止结果消息
 */
export const stopJenkinsBuild = async (
  jobName: string,
  buildNumber: number,
) => {
  try {
    const response = await mtpRequestClient.post<string>(
      `/api/mtp/build/${encodeURIComponent(jobName)}/${buildNumber}/stop`,
    );
    return response;
  } catch (error) {
    message.error('停止构建失败');
    throw error;
  }
};

/**
 * 获取 Jenkins 构建状态
 * @param jobName 作业名称
 * @param buildNumber 构建编号
 * @returns 构建状态信息
 */
export const getJenkinsBuildStatus = async (
  jobName: string,
  buildNumber: number,
) => {
  try {
    const response = await mtpRequestClient.get<{
      building: boolean;
      duration: number;
      result: string;
      timestamp: number;
    }>(`/api/mtp/build/${encodeURIComponent(jobName)}/${buildNumber}/status`);
    return response;
  } catch (error) {
    message.error('获取构建状态失败');
    throw error;
  }
};
