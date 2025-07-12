// 配置项接口
export interface ConfigItem {
  label: string;
  value: string;
}

// 完整配置数据结构
export interface DatasetConfig {
  datasetTypes: ConfigItem[];
  datasetZones: ConfigItem[];
}

// 树状结构数据项
export interface DeptTreeDataItem {
  label: string;
  value: string;
  children?: DeptTreeDataItem[];
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  error: null | string;
}

export interface BucketItem {
  id: number; // 改为 number 类型
  uid: string; // 新增 uid 字段
  name: string;
  identifier: string;
  type: 'public' | 'tenant';
  tenant_uid?: null | string; // 改为后端字段名
  dept_uid?: null | string; // 改为后端字段名
  team_uid?: null | string; // 改为后端字段名
  current_size: null | number; // 允许 null
  max_size: null | number; // 允许 null
  status: 'active' | 'disabled';
  access_key: string;
  authorized_tenants: [];
  created_at: null | string; // 允许 null
}

export interface DatasetItem {
  id: number;
  uid: string;
  userId: string;
  dataset_file: string;
  type: string;
  type_label?: string;
  zone: string;
  zone_label?: string;
  subdata_area: string;
  bucket_name: string;
  bucket_identifier: string;
  team_uid: string;
  team_name?: string;
  description?: string;
  tenant_uid: string;
  dept_uid?: null | string;
  level: number;
  encryption: boolean;
}

// 算法

export interface AlgorithmItem {
  id: number;
  uid: string;
  userId: string;
  algorithm_name: string;
  version: string;
  zone: string;
  zone_label?: string;
  encryption: boolean;
  subdata_area: string;
  bucket_name: string;
  bucket_identifier: string;
  team_uid: string;
  team_name: string;
  description: string;
  tenant_uid: string;
  dept_uid: string;
  level: number;
  is_CAS: boolean;
}

// HDFS文件接口
export interface HdfsFile {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modificationTime: number;
  permissions: string;
  owner: string;
  group: string;
}

// 文件列表响应数据
export interface HdfsFileListData {
  files: HdfsFile[];
}

// 空响应数据（用于删除等操作）
export interface EmptyData {}

// 文件上传响应数据
export interface FileUploadData {
  filePath: string;
}

// mtp 任务
// 增强formState类型定义
export interface TaskFormStep1 {
  taskName: string;
  taskType: string;
  encryption: string;
  taskZone: string;
  podType: string;
  resources: string;
  trainType: string;
  image: string;
  describe: string;
}

export interface TaskFormStep2 {
  algorithmName?: string;
  // 算法版本
  algorithmVersion?: string;
  // 数据集
  datasets?: Array<{ id?: string; name: string; selectedName: string }>;

  // 任务路由
  taskroute?: string;
}
export interface TaskFormStep3 {
  // 自定义变量配置
  customVariables: Array<{
    id?: string;
    name: string;
    value: string;
  }>;
  // 训练配置
  trainConfig: {
    content: string; // 配置内容
    format: string; // 文件格式（txt/json/py/yml）
  };
}
export interface TaskFormStep4 {
  // 通知配置
  notificationConfig: {
    isActive: boolean;
    // 通知内容
    notificationContent: string;
    // 通知标题
    notificationTitle: string;
    // 通知类型
    notificationUserID: string;
  };

  // 输出配置
  outputConfig: {
    autoPublish: boolean; // 是否自动发布
    isActive: boolean;
    // 输出路径
    outputPath: string;
    // 输出类型
    outputType: string;
  };

  // 调度配置
  scheduleConfig: {
    cronExpression?: string; // cron表达式
    dailyTime?: string; // 每天的时间（HH:mm格式）
    dateRange?: Date[]; // 日期范围（使用Date对象数组）
    hourlyMinute?: string; // 每小时的第几分钟（00-59）
    intervalDuration?: number; // 间隔时长
    intervalType: 'cron' | 'daily' | 'hourly' | 'interval' | 'once' | 'weekly';
    intervalUnit?: 'days' | 'hours' | 'months' | 'weeks'; // 间隔单位
    isActive: boolean;
    offsetTime?: string; // 偏移时间（HH:mm）
    onceTime?: Date; // 单次执行时间
    weeklyDays?: string[]; // 选择的星期数组（["1","2"...]）
    weeklyTime?: string; // 每周的时间（HH:mm）
  };
}
export interface TaskFormState {
  taskStep1: TaskFormStep1;
  taskStep2: TaskFormStep2;
  taskStep3: TaskFormStep3;
  taskStep4: TaskFormStep4;
}
