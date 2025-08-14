// 增强formState类型定义
export interface TaskFormStep1 {
  taskName: string;
  taskType: string;
  encryption: string;
  taskZone: string;
  podType: string;
  resources: string;
  trainType: string;
  imageUid: string;
  image: string;
  describe: string;
}

export interface TaskFormStep2 {
  // 算法UID
  algorithmUID?: string;
  // 算法名称
  algorithmName?: string;
  // 算法版本
  algorithmVersion?: string;
  // 数据集
  datasets?: Array<{
    bucketIdentifier: string;
    datasetName: string;
    id?: string;
    name: string;
    selectedId: string;
    selectedName: string;
    selectedUID: string;
  }>;

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
