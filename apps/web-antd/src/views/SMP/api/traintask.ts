// src/traintask.ts
import type { TaskFormState } from './types';

import { message } from 'ant-design-vue';

import { mtpRequestClient } from '#/api/request';

// 定义训练任务接口响应类型
interface TrainTaskResponse {
  id: number;
  uid: string;
  userId: string;
  tenant_uid: string;
  task_name: string;
  task_type: string;
  encryption: string;
  task_zone: string;
  pod_type: string;
  resources: string;
  train_type: string;
  image: string;
  description: string;
  algorithm_name: string;
  algorithm_version: string;
  task_route: string;
  train_config_content: string;
  train_config_format: string;
  notification_config: string;
  output_config: string;
  schedule_config: string;
  datasets: Array<{ dataset_id: string }>;
  custom_variables: Array<{ name: string; value: string }>;
  created_at: string;
  updated_at: string;
}

/**
 * 转换前端表单状态为后端需要的请求体
 */
const convertFormToRequest = (formState: TaskFormState) => {
  return {
    task_name: formState.taskStep1.taskName,
    task_type: formState.taskStep1.taskType,
    encryption: formState.taskStep1.encryption,
    task_zone: formState.taskStep1.taskZone,
    pod_type: formState.taskStep1.podType,
    resources: formState.taskStep1.resources,
    train_type: formState.taskStep1.trainType,
    image: formState.taskStep1.image,
    description: formState.taskStep1.describe,
    algorithm_name: formState.taskStep2.algorithmName,
    algorithm_version: formState.taskStep2.algorithmVersion,
    task_route: formState.taskStep2.taskroute,
    train_config_content: formState.taskStep3.trainConfig.content,
    train_config_format: formState.taskStep3.trainConfig.format,
    notification_config: JSON.stringify(formState.taskStep4.notificationConfig),
    output_config: JSON.stringify(formState.taskStep4.outputConfig),
    schedule_config: JSON.stringify(formState.taskStep4.scheduleConfig),
    datasets: formState.taskStep2.datasets.map((ds) => ({
      dataset_id: ds.id,
    })),
    custom_variables: formState.taskStep3.customVariables.map((cv) => ({
      name: cv.name,
      value: cv.value,
    })),
  };
};

/**
 * 创建训练任务
 */
export const createTrainTask = async (
  formState: TaskFormState,
  userId: string,
  tenantUid: string,
) => {
  try {
    const payload = convertFormToRequest(formState);
    const response = await mtpRequestClient.post<TrainTaskResponse>(
      '/mtp/tasks-creat',
      payload,
      {
        headers: {
          'X-Tenant-Uid': tenantUid,
          'X-User-Id': userId,
        },
      },
    );
    return response;
  } catch (error) {
    message.error('创建训练任务失败');
    throw error;
  }
};

/**
 * 更新训练任务
 */
export const updateTrainTask = async (
  uid: string,
  formState: TaskFormState,
  userId: string,
  tenantUid: string,
) => {
  try {
    const payload = {
      uid, // 确保包含UID
      ...convertFormToRequest(formState),
    };

    const response = await mtpRequestClient.put<TrainTaskResponse>(
      `/mtp/tasks/${uid}`,
      payload,
      {
        headers: {
          'X-Tenant-Uid': tenantUid,
          'X-User-Id': userId,
        },
      },
    );
    return response;
  } catch (error) {
    message.error('更新训练任务失败');
    throw error;
  }
};

/**
 * 获取任务详情
 */
export const fetchTrainTaskDetail = async (uid: string, tenantUid: string) => {
  try {
    const response = await mtpRequestClient.get<TrainTaskResponse>(
      `/mtp/tasks/${uid}`,
      {
        headers: {
          'X-Tenant-Uid': tenantUid,
        },
      },
    );
    return response;
  } catch (error) {
    message.error('获取任务详情失败');
    throw error;
  }
};

/**
 * 删除训练任务
 */
export const deleteTrainTask = async (uid: string, tenantUid: string) => {
  try {
    await mtpRequestClient.delete(`/mtp/tasks/${uid}`, {
      headers: {
        'X-Tenant-Uid': tenantUid,
      },
    });
  } catch (error) {
    message.error('删除任务失败');
    throw error;
  }
};

/**
 * 获取所有训练任务
 */
export const fetchAllTrainTasks = async (tenantUid: string) => {
  try {
    const response = await mtpRequestClient.get<TrainTaskResponse[]>(
      '/mtp/tasks',
      {
        headers: {
          'X-Tenant-Uid': tenantUid,
        },
      },
    );
    return response;
  } catch (error) {
    message.error('获取任务列表失败');
    throw error;
  }
};

/**
 * 执行任务
 */
export const TrainTaskStart = async (
  uid: string,
  tenantUid: string,
  userId: string,
) => {
  try {
    const response = await mtpRequestClient.post<TrainTaskResponse>(
      `/mtp/tasks-train/${uid}`,
      {},
      {
        headers: {
          'X-Tenant-Uid': tenantUid,
          'X-User-Id': userId,
        },
      },
    );
    return response;
  } catch (error) {
    message.error('获取任务详情失败');
    throw error;
  }
};
