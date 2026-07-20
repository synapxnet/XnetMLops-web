import { dppRequestClient } from '#/api/request';

export interface FeatureEngineering {
  id?: number;
  uid?: string;
  name: string;
  description?: string;
  datasourceId: number;
  datasourceName?: string;
  database: string;
  tableName: string;
  selectedColumns?: string; // JSON string
  transformConfig?: string; // JSON string
  zone?: string; // 数据区域
  bucketUid?: string; // 存储桶UID
  bucketName?: string; // 存储桶名称
  // 新增字段：子数据域、数据类型、是否加密
  subDataArea?: string; // 子数据域
  dataType?: string; // 数据类型
  encryption?: boolean; // 是否需要加密
  // 输出配置
  pushToDataset?: boolean; // 是否推送至数据集
  targetDatasetId?: number; // 目标数据集ID
  targetDatasetName?: string; // 目标数据集名称
  outputPath?: string; // 输出路径
  // 特征算子相关字段
  operatorId?: number; // 特征算子ID
  operatorCode?: string; // 特征算子代码
  operatorName?: string; // 特征算子名称
  outputFormat?: string; // 输出文件格式
  featureConfig?: string; // 字段特征配置（JSON格式）
  operatorParams?: string; // 算子参数配置（JSON格式）
  // 镜像相关字段
  imageUid?: string; // 镜像UID
  imageName?: string; // 镜像名称
  imageTag?: string; // 镜像标签
  harborUrl?: string; // Harbor仓库地址
  harborCredentialsId?: string; // Harbor凭证ID
  // 调度配置
  scheduleConfig?: string; // 调度配置（JSON格式）
  scheduleActive?: boolean; // 是否启用调度
  // 通知配置
  notificationConfig?: string; // 通知配置（JSON格式）
  notificationEnabled?: boolean; // 是否启用通知
  // Jenkins相关
  jobUid?: string; // Jenkins任务UID
  lastBuildStatus?: string; // 最后构建状态
  status?: string;
  createdBy?: string;
  teamUid?: string;
  teamName?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 构建状态接口
export interface JenkinsBuildStatus {
  parentTaskUID?: string;
  jobName?: string;
  buildUrl?: string;
  queueUrl?: string;
  stages?: StageInfo[];
  overallStatus?: string;
  consoleOutput?: string;
  startTime?: string;
  endTime?: string;
}

export interface StageInfo {
  stageName?: string;
  status?: string;
  durationMillis?: number;
  startTime?: string;
}

// 任务执行记录接口
export interface FeatureTaskInfo {
  id?: number;
  uid?: string;
  taskUid?: string;
  jobUid?: string;
  jobStatus?: string;
  jobContent?: string;
  startAt?: string;
  endAt?: string;
  scheduleActive?: number;
  createdAt?: string;
  updatedAt?: string;
}

// 获取所有特征工程任务
export const fetchFeatureEngineeringList = async (): Promise<
  FeatureEngineering[]
> => {
  const response = await dppRequestClient.get('/dpp/feature-engineering');
  return response.data || response;
};

// 根据团队获取特征工程任务
export const fetchFeatureEngineeringByTeam = async (
  teamUid: string,
): Promise<FeatureEngineering[]> => {
  const response = await dppRequestClient.get(
    `/dpp/feature-engineering/team/${teamUid}`,
  );
  return response.data || response;
};

// 获取单个特征工程任务
export const fetchFeatureEngineeringById = async (
  id: number,
): Promise<FeatureEngineering> => {
  const response = await dppRequestClient.get(`/dpp/feature-engineering/${id}`);
  return response.data || response;
};

// 创建特征工程任务
export const createFeatureEngineering = async (
  data: FeatureEngineering,
): Promise<FeatureEngineering> => {
  const response = await dppRequestClient.post(
    '/dpp/feature-engineering',
    data,
    {
      responseReturn: 'body',
    },
  );
  if (response.code === 0) {
    return response.data;
  }
  throw new Error(response.message || '创建失败');
};

// 更新特征工程任务
export const updateFeatureEngineering = async (
  id: number,
  data: FeatureEngineering,
): Promise<FeatureEngineering> => {
  const response = await dppRequestClient.put(
    `/dpp/feature-engineering/${id}`,
    data,
    {
      responseReturn: 'body',
    },
  );
  if (response.code === 0) {
    return response.data;
  }
  throw new Error(response.message || '更新失败');
};

// 删除特征工程任务
export const deleteFeatureEngineering = async (id: number): Promise<void> => {
  const response = await dppRequestClient.delete(
    `/dpp/feature-engineering/${id}`,
    {
      responseReturn: 'body',
    },
  );
  if (response.code !== 0) {
    throw new Error(response.message || '删除失败');
  }
};

// 立即执行特征工程任务
export const executeFeatureEngineering = async (
  id: number,
): Promise<{ jobPath: string; queueUrl: string; status: string }> => {
  const response = await dppRequestClient.post(
    `/dpp/feature-engineering/${id}/execute`,
    {},
    {
      responseReturn: 'body',
    },
  );
  if (response.code === 0) {
    return response.data;
  }
  throw new Error(response.message || '执行失败');
};

// 创建调度任务
export const createScheduleTask = async (
  id: number,
): Promise<{ jobPath: string; scheduleActive: boolean }> => {
  const response = await dppRequestClient.post(
    `/dpp/feature-engineering/${id}/schedule`,
    {},
    {
      responseReturn: 'body',
    },
  );
  if (response.code === 0) {
    return response.data;
  }
  throw new Error(response.message || '创建调度任务失败');
};

// 停止调度任务
export const stopScheduleTask = async (
  id: number,
): Promise<{ scheduleActive: boolean }> => {
  const response = await dppRequestClient.post(
    `/dpp/feature-engineering/${id}/stop-schedule`,
    {},
    {
      responseReturn: 'body',
    },
  );
  if (response.code === 0) {
    return response.data;
  }
  throw new Error(response.message || '停止调度任务失败');
};

// 停止当前构建
export const stopFeatureBuild = async (
  id: number,
): Promise<{ stopped: boolean }> => {
  const response = await dppRequestClient.post(
    `/dpp/feature-engineering/${id}/stop`,
    {},
    {
      responseReturn: 'body',
    },
  );
  if (response.code === 0) {
    return response.data;
  }
  throw new Error(response.message || '停止构建失败');
};

// 获取构建状态
export const getFeatureBuildStatus = async (
  id: number,
): Promise<{
  status: string;
  lastBuildStatus?: string;
  hasJob: boolean;
  jobUid?: string;
  buildStatus?: JenkinsBuildStatus;
}> => {
  const response = await dppRequestClient.get(
    `/dpp/feature-engineering/${id}/status`,
  );
  return response.data || response;
};

// 获取任务执行历史
export const getFeatureExecutionHistory = async (
  id: number,
): Promise<FeatureTaskInfo[]> => {
  const response = await dppRequestClient.get(
    `/dpp/feature-engineering/${id}/history`,
  );
  return response.data || response;
};
