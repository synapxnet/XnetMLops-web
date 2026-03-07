// src/SMP/api/traintask.ts
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
  image_uid: string;
  image: string;
  description: string;
  // 算法UID
  algorithm_uid: string;
  algorithm_name: string;
  algorithm_version: string;
  task_route: string;
  train_config_content: string;
  train_config_format: string;
  notification_config: string;
  output_config: string;
  schedule_config: string;
  datasets: Array<{
    bucket_identifier: string;
    dataset_id: string;
    dataset_name: string;
    dataset_uid: string;
    id: string;
  }>;
  custom_variables: Array<{ name: string; value: string }>;
  created_at: string;
  updated_at: string;
}

// 新增接口类型定义
export interface PipelineStage {
  stageName: string;
  status: string; // "SUCCESS", "FAILED", "IN_PROGRESS", "QUEUED"
  durationMillis: number;
  startTime: Date;
}

export interface PipelineBuildStatus {
  jobName: string;
  buildUrl: string;
  queueUrl: string;
  overallStatus: string;
  stages: PipelineStage[];
  consoleOutput?: string;
  startTime: Date;
  endTime?: Date;
}
export interface ScheduleBuildStatus {
  jobName: string;
  scheduleConfig: string;
  nextBuildNumber: number;
  queueUrl: string;
  overallStatus: string;
  jobHistoryBuild: PipelineBuildStatus[];
  consoleOutput?: string;
  startTime: Date;
  endTime?: Date;
}
// 新增作业信息接口类型
export interface JobInfo {
  jobUid: string;
  jobStatus: string;
  jobContent: string;
  startAt: Date;
  endAt?: Date;
}

// 调度作业列表项接口
export interface ScheduleJobItem {
  jobUid: string;
  jobStatus: string;
  startAt: Date;
  endAt?: Date;
  scheduleActive: number;
}

// 调度接口类型定义
export interface ScheduleConfig {
  intervalType: string;
  cronExpression?: string;
  dailyTime?: string;
  dateRange?: string[];
  hourlyMinute?: string;
  intervalDuration?: number;
  intervalUnit?: string;
  offsetTime?: string;
  weeklyDays?: string[];
  weeklyTime?: string;
  isActive: boolean;
}

export interface ScheduleStartResponse {
  code: number;
  data: {
    cronExpression: string;
    jobName: string;
    queueUrl: string;
    scheduleActive: number;
  };
  message: string;
  error: null | string;
}

export interface ScheduleStopResponse {
  code: number;
  data: {
    buildsStopped: boolean;
    jobDeleted?: boolean;
    scheduleConfigDeleted: boolean;
  };
  message: string;
  error: null | string;
}

export interface ScheduleStatusResponse {
  code: number;
  data: {
    jobName: string;
    lastBuild?: {
      buildUrl: string;
      endTime: string;
      startTime: string;
      status: string;
    };
    nextExecution?: string;
    scheduleConfig: any;
  };
  message: string;
  error: null | string;
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
    image_uid: formState.taskStep1.imageUid,
    image: formState.taskStep1.image,
    description: formState.taskStep1.describe,
    // 算法UID
    algorithm_uid: formState.taskStep2.algorithmUID,
    algorithm_name: formState.taskStep2.algorithmName,
    algorithm_version: formState.taskStep2.algorithmVersion,
    task_route: formState.taskStep2.taskroute,
    train_config_content: formState.taskStep3.trainConfig.content,
    train_config_format: formState.taskStep3.trainConfig.format,
    notification_config: JSON.stringify(formState.taskStep4.notificationConfig),
    output_config: JSON.stringify(formState.taskStep4.outputConfig),
    schedule_config: JSON.stringify(formState.taskStep4.scheduleConfig),
    datasets: formState.taskStep2.datasets.map((ds) => ({
      dataset_uid: ds.selectedUID,
      dataset_file: ds.name,
      bucket_identifier: ds.bucketIdentifier,
      dataset_id: ds.selectedId,
      dataset_name: ds.datasetName,
      id: ds.id,
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
    console.log(payload);
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
 * 启动训练任务
 */
export const TrainTaskStart = async (
  uid: string,
  tenantUid: string,
  userId: string,
): Promise<PipelineBuildStatus> => {
  try {
    const response = await mtpRequestClient.post(
      '/mtp/pipeline', // 创建流水线接口
      {}, // 空请求体
      {
        params: {
          taskUID: `${uid}`, // 使用任务UID作为作业名称
        },
        headers: {
          'X-Tenant-Uid': tenantUid,
          'X-User-Id': userId,
        },
      },
    );

    // 返回流水线创建信息
    return {
      jobName: uid,
      queueUrl: response.queueUrl,
      buildUrl: response.buildUrl || '',
      overallStatus: 'QUEUED',
      stages: [],
      startTime: new Date(),
      ...response,
    };
  } catch (error) {
    message.error('启动训练任务失败');
    throw error;
  }
};

/**
 * 获取流水线构建状态
 */
export const fetchPipelineStatus = async (
  jobName: string,
  tenantUid: string,
  includeConsole = false,
): Promise<PipelineBuildStatus> => {
  try {
    const response = await mtpRequestClient.get(
      `/mtp/build/status/${encodeURIComponent(jobName)}`,
      {
        params: { includeConsole },
        headers: { 'X-Tenant-Uid': tenantUid },
      },
    );
    return response;
  } catch (error) {
    message.error('获取流水线状态失败');
    throw error;
  }
};

/**
 * 获取任务下的所有作业
 */
export const fetchJobsByTaskUid = async (
  taskUid: string,
  tenantUid: string,
): Promise<JobInfo[]> => {
  try {
    const response = await mtpRequestClient.get(`/mtp/task/${taskUid}/jobs`, {
      headers: { 'X-Tenant-Uid': tenantUid },
    });
    return response || [];
  } catch (error) {
    message.error('获取作业列表失败');
    throw error;
  }
};

/**
 * 获取单个作业详情
 */
export const fetchJobByJobUid = async (
  jobUid: string,
  tenantUid: string,
): Promise<JobInfo> => {
  try {
    const response = await mtpRequestClient.get(`/mtp/job/${jobUid}`, {
      headers: { 'X-Tenant-Uid': tenantUid },
    });
    return response;
  } catch (error) {
    message.error('获取作业详情失败');
    throw error;
  }
};

/**
 * 获取任务的所有流水线执行记录
 */
export const fetchPipelineRecords = async (
  taskUid: string,
  tenantUid: string,
): Promise<PipelineBuildStatus[]> => {
  try {
    // 1. 获取任务下的所有作业
    const jobs = await fetchJobsByTaskUid(taskUid, tenantUid);

    // 2. 并行获取每个作业的详情和流水线状态
    const records = await Promise.all(
      jobs.map(async (job) => {
        try {
          // 获取作业的流水线状态
          const pipelineStatus = await fetchPipelineStatus(
            job.jobUid,
            tenantUid,
          );

          // 返回合并后的记录
          return {
            jobUid: job.jobUid,
            jobStatus: job.jobStatus,
            startAt: job.startAt,
            endAt: job.endAt,
            // 流水线状态
            ...pipelineStatus,
          } as PipelineBuildStatus;
        } catch (error) {
          console.error(`获取作业 ${job.jobUid} 的流水线状态失败:`, error);
          return null;
        }
      }),
    );

    // 3. 过滤掉失败的请求
    return records.filter((record) => record !== null) as PipelineBuildStatus[];
  } catch (error) {
    console.error('获取执行记录失败:', error);
    return [];
  }
};
/**
 * 删除 Jenkins 作业
 * @param jobUid 作业UID
 * @param forceStop 是否强制停止构建
 * @returns 删除结果
 */
export const deleteJenkinsJob = async (
  jobUid: string,
  forceStop: boolean = false,
) => {
  try {
    const response = await mtpRequestClient.delete<{
      code: number;
      data: {
        dbDeleted: boolean;
        forceStop?: boolean;
        jenkinsDeleted: boolean;
        jobUid: string;
      };
      error: null | string;
      message: string;
    }>(`/mtp/job/${encodeURIComponent(jobUid)}`, {
      params: { forceStop },
    });
    return response;
  } catch (error) {
    message.error('删除作业失败');
    throw error;
  }
};

/**
 * 批量删除作业（根据taskUid）
 * @param taskUid 任务UID
 * @returns 批量删除结果
 */
export const deleteJobsByTaskUid = async (taskUid: string) => {
  try {
    const response = await mtpRequestClient.delete<{
      code: number;
      data: {
        details: Array<{
          error?: string;
          jobUid: string;
          status: string;
        }>;
        failedToDelete: number;
        successfullyDeleted: number;
        taskUid: string;
        totalJobs: number;
      };
      error: null | string;
      message: string;
    }>(`/mtp/task/${encodeURIComponent(taskUid)}/jobs`);
    return response;
  } catch (error) {
    message.error('批量删除作业失败');
    throw error;
  }
};

// 调度接口函数
/**
 * 开始调度任务
 */
export const startSchedule = async (
  taskUID: string,
  tenantUid: string,
  userId: string,
  scheduleConfig: ScheduleConfig,
): Promise<ScheduleStartResponse> => {
  try {
    const response = await mtpRequestClient.post<ScheduleStartResponse>(
      '/mtp/schedule/pipeline',
      { scheduleConfig },
      {
        params: { taskUID },
        headers: {
          'X-Tenant-Uid': tenantUid,
          'X-User-Id': userId,
        },
      },
    );
    console.log('开始调度响应:', response);
    return response;
  } catch (error) {
    message.error('开始调度失败');
    throw error;
  }
};

/**
 * 结束调度任务
 */
export const stopSchedule = async (
  jobName: string,
  tenantUid: string,
  userId: string,
  deleteJob: boolean = false,
): Promise<ScheduleStopResponse> => {
  try {
    const response = await mtpRequestClient.delete<ScheduleStopResponse>(
      `/mtp/schedule/stop/${jobName}`,
      {
        params: { deleteJob },
        headers: {
          'X-Tenant-Uid': tenantUid,
          'X-User-Id': userId,
        },
      },
    );
    return response;
  } catch (error) {
    message.error('结束调度失败');
    throw error;
  }
};

/**
 * 获取调度状态
 */
export const getScheduleStatus = async (
  jobName: string,
  tenantUid: string,
): Promise<ScheduleBuildStatus> => {
  try {
    const response = await mtpRequestClient.get<ScheduleBuildStatus>(
      `/mtp/schedule/status/${jobName}`,
      {
        headers: {
          'X-Tenant-Uid': tenantUid,
        },
      },
    );
    return response;
  } catch (error) {
    message.error('获取调度状态失败');
    throw error;
  }
};

/**
 * 更新调度配置
 */
export const updateSchedule = async (
  jobName: string,
  tenantUid: string,
  scheduleConfig: any,
): Promise<any> => {
  try {
    const response = await mtpRequestClient.put(
      `/mtp/schedule/update/${jobName}`,
      scheduleConfig,
      {
        headers: {
          'X-Tenant-Uid': tenantUid,
        },
      },
    );
    return response;
  } catch (error) {
    message.error('更新调度配置失败');
    throw error;
  }
};

/**
 * 获取任务的调度作业列表
 */
export const fetchScheduleRecords = async (
  taskUid: string,
  tenantUid: string,
): Promise<ScheduleJobItem[]> => {
  try {
    // 注意：这里使用 taskUid 而不是 jobUid
    const response = await mtpRequestClient.get<ScheduleJobItem[]>(
      `/mtp/schedule/${taskUid}/jobs`,
      {
        headers: { 'X-Tenant-Uid': tenantUid },
      },
    );
    return response || [];
  } catch {
    // 静默处理，不显示错误消息
    return [];
  }
};

export const fetchScheduleJobsByTaskUid = async (
  taskUid: string,
  tenantUid: string,
): Promise<(ScheduleBuildStatus & { scheduleActive: number }) | null> => {
  try {
    // 第一步：获取任务下的所有调度作业
    const jobs = await fetchScheduleRecords(taskUid, tenantUid);
    if (!jobs || jobs.length === 0) {
      return null;
    }
    // 第二步：使用实际的 jobUid 获取调度状态（jobUid 就是 Jenkins 的 jobName）
    const jobUid = jobs[0].jobUid;
    if (!jobUid) {
      console.warn('调度作业缺少 jobUid');
      return null;
    }
    const scheduleJob = await getScheduleStatus(jobUid, tenantUid);
    return { ...scheduleJob, scheduleActive: jobs[0].scheduleActive };
  } catch (error) {
    console.error('获取调度作业失败:', error);
    return null;
  }
};
