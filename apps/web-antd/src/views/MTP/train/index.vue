<!-- src/views/MTP/train/TrainTaskManagement.vue -->
<script lang="ts" setup>
import type { Ref } from 'vue';

import type { PipelineStage } from '../../SMP/api/traintask';

import {
  computed,
  h,
  inject,
  onMounted,
  onUnmounted,
  reactive,
  ref,
} from 'vue';
import { useRouter } from 'vue-router';

import {
  Button,
  Card,
  Descriptions,
  Dropdown,
  Empty,
  Input,
  Menu,
  message,
  Modal,
  Select,
  SelectOption,
  Table,
  TabPane,
  Tabs,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import {
  // deleteScheduleRecord, // 新增：删除调度记录接口
  deleteTrainTask,
  fetchAllTrainTasks,
  fetchPipelineRecords,
  fetchPipelineStatus,
  // fetchScheduleRecords, // 新增：获取调度记录接口
  getScheduleStatus,
  TrainTaskStart,
} from '../../SMP/api/traintask';

const router = useRouter();

// 定义任务详情数据结构
interface TaskDetail {
  taskStep1: {
    describe: string;
    encryption: string;
    image: string;
    podType: string;
    resources: string;
    taskName: string;
    taskType: string;
    taskZone: string;
    trainType: string;
  };
  taskStep2: {
    algorithmName: string;
    algorithmUID: string;
    algorithmVersion: string;
    datasets: Array<{
      id: string;
      name: string;
      selectedName: string;
    }>;
    taskroute: string;
  };
  taskStep3: {
    customVariables: Array<{
      id: string;
      name: string;
      value: string;
    }>;
    trainConfig: {
      content: string;
      format: string;
    };
  };
  taskStep4: {
    notificationConfig: {
      isActive: boolean;
      notificationContent: string;
      notificationTitle: string;
      notificationUserID: string;
    };
    outputConfig: {
      autoPublish: boolean;
      isActive: boolean;
      outputPath: string;
      outputType: string;
    };
    scheduleConfig: {
      cronExpression: string;
      dailyTime: string;
      dateRange: string[];
      hourlyMinute: string;
      intervalDuration: number;
      intervalType: string;
      intervalUnit: string;
      isActive: boolean;
      offsetTime: string;
      weeklyDays: string[];
      weeklyTime: string;
    };
  };
}

// 执行记录数据结构
interface ExecuteRecord {
  id: string;
  jobUid: string;
  algorithmName: string;
  status: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  stages: PipelineStage[];
  buildUrl: string;
  queueUrl: string;
  parentTaskUid: string;
}

// 新增：调度记录数据结构
interface ScheduleRecord {
  scheduleId: string;
  scheduleStatus: 'canceled' | 'completed' | 'failed' | 'pending' | 'running';
  stageProgress: string; // 格式：完成阶段/总阶段
  scheduleTime: Date;
  startTime: Date;
  endTime?: Date;
  duration: number;
  nextExecutionTime?: Date; // 下次执行时间
  cronExpression: string;
}

interface DataItem {
  tabActiveKey: string;
  key: string;
  uid: string;
  name: string;
  task_type: string;
  status: string;
  scheduleStatus: 'error' | 'scheduled' | 'stopped';
  updated_at: string;
  description: string;
  creator: string;
  createdAt: string;
  detail?: TaskDetail;
  executeRecords: ExecuteRecord[];
  scheduleRecords: ScheduleRecord[]; // 新增：调度记录
  activeExecuteRecord?: ExecuteRecord | null;
  pollingTimer?: number;
  scheduleJobName?: string;
  scheduleJobStatus?: 'error' | 'scheduled' | 'stopped';
  schedulePollingTimer?: number; // 新增：调度记录轮询定时器
}

const columns = [
  { title: '任务名称', dataIndex: 'name', key: 'name' },
  { title: '任务类型', dataIndex: 'task_type', key: 'task_type' },
  {
    title: '状态',
    key: 'status',
    customRender: ({ record }: { record: DataItem }) => {
      const statusMap: Record<string, { color: string; text: string }> = {
        pending: { color: 'blue', text: '等待中' },
        running: { color: 'green', text: '运行中' },
        completed: { color: 'success', text: '已完成' },
        failed: { color: 'red', text: '失败' },
        canceled: { color: 'orange', text: '已取消' },
        DELETING: { color: 'orange', text: '删除中' },
        DELETED: { color: 'gray', text: '已删除' },
      };

      const statusInfo = statusMap[record.status] || {
        color: 'default',
        text: record.status,
      };

      return h(Tag, { color: statusInfo.color }, () => statusInfo.text);
    },
  },
  {
    title: '调度状态',
    key: 'scheduleStatus',
    customRender: ({ record }: { record: DataItem }) => {
      const scheduleMap: Record<string, { color: string; text: string }> = {
        stopped: { color: 'gray', text: '未调度' },
        scheduled: { color: 'green', text: '调度中' },
        error: { color: 'red', text: '调度错误' },
      };

      const scheduleInfo = scheduleMap[record.scheduleStatus] || {
        color: 'default',
        text: '未知',
      };

      return h(Tag, { color: scheduleInfo.color }, () => scheduleInfo.text);
    },
  },
  { title: '修改者', dataIndex: 'creator', key: 'creator' },
  {
    title: '更新时间',
    dataIndex: 'updated_at',
    key: 'updated_at',
    customRender: ({ text }: { text: string }) => {
      return new Date(text).toLocaleString();
    },
  },
  {
    title: '描述',
    dataIndex: 'description',
    key: 'description',
    customRender: ({ text }: { text: string }) => {
      return text || '暂无描述';
    },
  },
  { title: '操作', key: 'operation' },
];

// 安全解析JSON
const parseSafe = (jsonString: string, defaultValue: any) => {
  try {
    return jsonString ? JSON.parse(jsonString) : defaultValue;
  } catch (error) {
    console.error('JSON解析失败', error);
    return defaultValue;
  }
};

const mapTaskDetail = (task: any): TaskDetail => {
  // 默认配置
  const defaultNotificationConfig = {
    isActive: false,
    notificationContent: '',
    notificationTitle: '',
    notificationUserID: '',
  };

  const defaultOutputConfig = {
    autoPublish: false,
    isActive: false,
    outputPath: '',
    outputType: '',
  };

  const defaultScheduleConfig = {
    intervalType: 'daily',
    cronExpression: '',
    dailyTime: '',
    dateRange: [],
    hourlyMinute: '',
    intervalDuration: 1,
    intervalUnit: 'hours',
    offsetTime: '',
    weeklyDays: [],
    weeklyTime: '',
    isActive: false,
  };

  // 使用安全解析函数
  const notificationConfig = parseSafe(
    task.notification_config,
    defaultNotificationConfig,
  );
  const outputConfig = parseSafe(task.output_config, defaultOutputConfig);
  const scheduleConfig = parseSafe(task.schedule_config, defaultScheduleConfig);

  // 处理数据集
  const datasets = Array.isArray(task.datasets)
    ? task.datasets.map((ds: any) => ({
        id: ds.dataset_id || '',
        name: ds.dataset_file || '未知数据集',
        selectedName: ds.dataset_name || '未知',
      }))
    : [];

  // 处理自定义变量
  const customVariables = Array.isArray(task.custom_variables)
    ? task.custom_variables.map((cv: any) => ({
        id: cv.uid || Date.now().toString(),
        name: cv.name || '',
        value: cv.value || '',
      }))
    : [];

  return {
    taskStep1: {
      taskName: task.task_name || '未命名任务',
      taskType: task.task_type || '未指定',
      encryption: task.encryption || '无',
      taskZone: task.task_zone || '默认区域',
      podType: task.pod_type || '标准',
      resources: task.resources || '默认资源',
      trainType: task.train_type || '未指定',
      image: task.image || '未指定',
      describe: task.description || '无描述',
    },
    taskStep2: {
      algorithmName: task.algorithm_name || '未命名算法',
      algorithmVersion: task.algorithm_version || '未指定',
      datasets: datasets || [],
      taskroute: task.task_route || '/',
    },
    taskStep3: {
      customVariables,
      trainConfig: {
        content: task.train_config_content || '无配置内容',
        format: task.train_config_format || 'txt',
      },
    },
    taskStep4: {
      notificationConfig,
      outputConfig,
      scheduleConfig,
    },
  };
};

// 添加租户信息
const currentUserInfo = inject<Ref<any>>('currentUserInfo', ref(null));
const currentTenantInfo = inject<Ref<any>>('selectedOrganization', ref(null));
const tenantUid = computed(() => currentTenantInfo.value?.tenantUid || '');
const userId = computed(() => currentUserInfo.value?.userId || '');

// 搜索相关逻辑
const searchName = ref('');
const searchType = ref('');
const searchStatus = ref('');
const searchScheduleStatus = ref('');

const platformOptions = computed(() => {
  return [...new Set(data.value.map((item) => item.task_type))];
});

const statusOptions = computed(() => {
  return [
    { value: 'pending', label: '等待中' },
    { value: 'running', label: '运行中' },
    { value: 'completed', label: '已完成' },
    { value: 'failed', label: '失败' },
    { value: 'canceled', label: '已取消' },
  ];
});

const scheduleStatusOptions = computed(() => {
  return [
    { value: 'stopped', label: '未调度' },
    { value: 'scheduled', label: '调度中' },
    { value: 'error', label: '调度错误' },
  ];
});

const filteredData = computed(() => {
  return data.value.filter((item) => {
    const nameMatch = item.name
      .toLowerCase()
      .includes(searchName.value.toLowerCase());
    const typeMatch = searchType.value
      ? item.task_type === searchType.value
      : true;
    const statusMatch = searchStatus.value
      ? item.status === searchStatus.value
      : true;
    const scheduleStatusMatch = searchScheduleStatus.value
      ? item.scheduleStatus === searchScheduleStatus.value
      : true;
    return nameMatch && typeMatch && statusMatch && scheduleStatusMatch;
  });
});

// 状态映射
const statusMap: Record<string, { color: string; text: string }> = {
  QUEUED: { color: 'blue', text: '排队中' },
  IN_PROGRESS: { color: 'green', text: '运行中' },
  SUCCESS: { color: 'success', text: '成功' },
  FAILED: { color: 'red', text: '失败' },
  ABORTED: { color: 'orange', text: '已中止' },
  TIMEOUT: { color: 'volcano', text: '超时' },
  ERROR: { color: 'magenta', text: '错误' },
  pending: { color: 'blue', text: '等待中' },
  running: { color: 'green', text: '运行中' },
  completed: { color: 'success', text: '已完成' },
  failed: { color: 'red', text: '失败' },
  canceled: { color: 'orange', text: '已取消' },
};

// 执行记录表格列定义
const executeRecordColumns = [
  { title: '作业ID', dataIndex: 'jobUid', key: 'jobUid', width: 100 },
  {
    title: '状态',
    key: 'status',
    customRender: ({ record }: { record: ExecuteRecord }) => {
      const statusInfo = statusMap[record.status] || {
        color: 'default',
        text: record.status,
      };
      return h(Tag, { color: statusInfo.color }, () => statusInfo.text);
    },
  },
  {
    title: '阶段进度',
    key: 'stages',
    customRender: ({ record }: { record: ExecuteRecord }) => {
      const completed = record.stages.filter((s) =>
        ['ABORTED', 'FAILED', 'SUCCESS'].includes(s.status),
      ).length;
      const total = record.stages.length;
      const percent = total ? Math.round((completed / total) * 100) : 0;

      return h('div', { class: 'flex items-center' }, [
        h('span', { class: 'mr-2' }, `${completed}/${total}`),
        h('div', { class: 'flex-1 bg-gray-200 rounded-full h-2' }, [
          h('div', {
            class: 'bg-green-500 h-2 rounded-full',
            style: { width: `${percent}%` },
          }),
        ]),
      ]);
    },
  },
  {
    title: '开始时间',
    dataIndex: 'startTime',
    key: 'startTime',
    customRender: ({ text }: { text: Date }) => text.toLocaleString(),
  },
  {
    title: '结束时间',
    key: 'endTime',
    customRender: ({ record }: { record: ExecuteRecord }) => {
      return record.endTime ? record.endTime.toLocaleString() : '-';
    },
  },
  {
    title: '持续时间',
    key: 'duration',
    customRender: ({ record }: { record: ExecuteRecord }) => {
      const end = record.endTime || new Date();
      const duration = end.getTime() - record.startTime.getTime();
      return formatDuration(duration);
    },
  },
  {
    title: '操作',
    key: 'operation',
    customRender: ({ record }: { record: ExecuteRecord }) => {
      const ACTIVE_STATUSES = new Set(['IN_PROGRESS', 'QUEUED', 'WAITING']);

      return h('div', { class: 'flex gap-1' }, [
        ACTIVE_STATUSES.has(record.status)
          ? h(
              Button,
              {
                type: 'link',
                size: 'small',
                danger: true,
                onClick: () => handleCancelExecution(record),
              },
              '取消',
            )
          : null,

        h(
          Button,
          {
            type: 'link',
            size: 'small',
            onClick: () => showConsoleOutput(record),
          },
          '查看日志',
        ),

        h(
          Button,
          {
            type: 'link',
            size: 'small',
            danger: true,
            onClick: () => handleDeleteExecution(record),
          },
          '删除',
        ),

        ACTIVE_STATUSES.has(record.status)
          ? h(
              Button,
              {
                type: 'link',
                size: 'small',
                danger: true,
                onClick: () => handleForceDeleteExecution(record),
              },
              { default: () => '强制删除' },
            )
          : null,

        h(
          Dropdown,
          {
            trigger: ['click'],
            overlay: h(
              Menu,
              {},
              {
                default: () => [
                  h(
                    Menu.Item,
                    {
                      key: 'view',
                      onClick: () => handleViewJobDetail(record),
                    },
                    '查看任务详情',
                  ),
                  h(
                    Menu.Item,
                    {
                      key: 'rerun',
                      onClick: () => handleRerunExecution(record),
                    },
                    '重新执行',
                  ),
                ],
              },
            ),
          },
          {
            default: () =>
              h(
                Button,
                { type: 'link', size: 'small' },
                { default: () => '更多' },
              ),
          },
        ),
      ]);
    },
  },
];

// 新增：调度记录表格列定义
const scheduleRecordColumns = [
  { title: '调度ID', dataIndex: 'scheduleId', key: 'scheduleId', width: 100 },
  {
    title: '调度状态',
    key: 'scheduleStatus',
    customRender: ({ record }: { record: ScheduleRecord }) => {
      const statusInfo = statusMap[record.scheduleStatus] || {
        color: 'default',
        text: record.scheduleStatus,
      };
      return h(Tag, { color: statusInfo.color }, () => statusInfo.text);
    },
  },
  {
    title: '阶段进度',
    dataIndex: 'stageProgress',
    key: 'stageProgress',
    width: 100,
  },
  {
    title: '调度时间',
    dataIndex: 'scheduleTime',
    key: 'scheduleTime',
    customRender: ({ text }: { text: Date }) => text.toLocaleString(),
  },
  {
    title: '开始时间',
    dataIndex: 'startTime',
    key: 'startTime',
    customRender: ({ text }: { text: Date }) => text.toLocaleString(),
  },
  {
    title: '结束时间',
    key: 'endTime',
    customRender: ({ record }: { record: ScheduleRecord }) => {
      return record.endTime ? record.endTime.toLocaleString() : '-';
    },
  },
  {
    title: '持续时间',
    key: 'duration',
    customRender: ({ record }: { record: ScheduleRecord }) => {
      return formatDuration(record.duration);
    },
  },
  {
    title: '下次执行时间',
    key: 'nextExecutionTime',
    customRender: ({ record }: { record: ScheduleRecord }) => {
      return record.nextExecutionTime
        ? record.nextExecutionTime.toLocaleString()
        : '-';
    },
  },
  {
    title: '操作',
    key: 'operation',
    customRender: ({ record }: { record: ScheduleRecord }) => {
      return h('div', { class: 'flex gap-1' }, [
        h(
          Button,
          {
            type: 'link',
            size: 'small',
            onClick: () => showScheduleLog(record),
          },
          '查看日志',
        ),
        h(
          Button,
          {
            type: 'link',
            size: 'small',
            danger: true,
            onClick: () => handleDeleteScheduleRecord(record),
          },
          '删除',
        ),
      ]);
    },
  },
];

// 格式化持续时间
const formatDuration = (millis: number) => {
  const seconds = Math.floor(millis / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
};

// 显示控制台输出
const showConsoleOutput = (record: ExecuteRecord) => {
  Modal.info({
    title: `执行日志 - ${record.jobUid}`,
    width: '80%',
    content: h('div', { class: 'console-output' }, [
      h(
        'pre',
        record.stages.flatMap((s) => [
          h(
            'div',
            { class: 'stage-header' },
            `[${s.stageName}] - ${statusMap[s.status]?.text || s.status}`,
          ),
          h('div', { class: 'stage-content' }, s.logs || '暂无日志'),
        ]),
      ),
    ]),
    okText: '关闭',
  });
};

// 新增：显示调度日志
const showScheduleLog = (record: ScheduleRecord) => {
  Modal.info({
    title: `调度日志 - ${record.scheduleId}`,
    width: '80%',
    content: h('div', { class: 'console-output' }, [
      h('pre', [
        h('div', { class: 'stage-header' }, `调度ID: ${record.scheduleId}`),
        h('div', { class: 'stage-content' }, `状态: ${record.scheduleStatus}`),
        h(
          'div',
          { class: 'stage-content' },
          `阶段进度: ${record.stageProgress}`,
        ),
        h(
          'div',
          { class: 'stage-content' },
          `Cron表达式: ${record.cronExpression}`,
        ),
        h('div', { class: 'stage-content' }, '日志内容: 暂无日志'),
      ]),
    ]),
    okText: '关闭',
  });
};

// 新增：删除调度记录
const handleDeleteScheduleRecord = async (record: ScheduleRecord) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除调度记录 ${record.scheduleId} 吗？`,
    okText: '删除',
    cancelText: '取消',
    okType: 'danger',
    async onOk() {
      try {
        // 调用删除调度记录API
        const result = await deleteScheduleRecord(record.scheduleId);
        if (result === null) {
          message.success('调度记录已删除');
          // 重新获取调度记录
          fetchData();
        } else {
          message.error(`删除失败: ${result.message}`);
        }
      } catch (error: any) {
        message.error(`删除失败: ${error.message || '未知错误'}`);
      }
    },
  });
};

// 原有函数保持不变...
const handleCancelExecution = async (execRecord: ExecuteRecord) => {
  // ... 保持不变
};

const handleViewJobDetail = (execRecord: ExecuteRecord) => {
  router.push({
    path: '/MTP/train/job',
    query: { id: execRecord.jobUid, tenantUid: tenantUid.value },
  });
};

const handleDeleteExecution = async (execRecord: ExecuteRecord) => {
  // ... 保持不变
};

const handleForceDeleteExecution = async (execRecord: ExecuteRecord) => {
  // ... 保持不变
};

const handleRerunExecution = (execRecord: ExecuteRecord) => {
  const parentTask = data.value.find((t) => t.uid === execRecord.parentTaskUid);
  if (parentTask) {
    handleExecute(parentTask);
  }
};

const handleDeleteAllExecutions = (record: DataItem) => {
  // ... 保持不变
};

const handleStartSchedule = async (record: DataItem) => {
  // ... 保持不变
};

const handleStopSchedule = async (record: DataItem) => {
  // ... 保持不变
};

const handleViewScheduleStatus = async (record: DataItem) => {
  if (!record.scheduleJobName) {
    message.warning('该任务没有调度作业');
    return;
  }

  try {
    const result = await getScheduleStatus(
      record.scheduleJobName,
      tenantUid.value,
    );
    if (result === null) {
      Modal.info({
        title: `调度状态 - ${record.name}`,
        width: 600,
        content: h('div', { class: 'space-y-3' }, [
          h('div', { class: 'grid grid-cols-2 gap-2' }, [
            h('div', { class: 'font-medium' }, '作业名称:'),
            h('div', result.jobName),
            h('div', { class: 'font-medium' }, '调度类型:'),
            h('div', result.scheduleConfig?.intervalType || '未知'),
            result.lastBuild && [
              h('div', { class: 'font-medium' }, '上次构建状态:'),
              h(
                Tag,
                {
                  color: getStatusColor(result.lastBuild.status),
                },
                result.lastBuild.status,
              ),
              h('div', { class: 'font-medium' }, '上次构建时间:'),
              h('div', new Date(result.lastBuild.startTime).toLocaleString()),
              h('div', { class: 'font-medium' }, '构建链接:'),
              h(
                'a',
                {
                  href: result.lastBuild.buildUrl,
                  target: '_blank',
                  class: 'text-blue-500 hover:underline',
                },
                '查看构建详情',
              ),
            ],
            result.nextExecution && [
              h('div', { class: 'font-medium' }, '下次执行时间:'),
              h('div', result.nextExecution),
            ],
          ]),
          h('div', { class: 'mt-4' }, [
            h('h4', { class: 'font-medium mb-2' }, '调度配置详情:'),
            h(
              'pre',
              { class: 'bg-gray-100 p-3 rounded max-h-60 overflow-auto' },
              JSON.stringify(result.scheduleConfig, null, 2),
            ),
          ]),
        ]),
        okText: '关闭',
      });
    } else {
      message.error(`获取调度状态失败: ${result.message}`);
    }
  } catch (error: any) {
    message.error(`获取调度状态失败: ${error.message || '未知错误'}`);
  }
};

// 新增：获取调度记录
const fetchScheduleRecordsForTask = async (record: DataItem) => {
  try {
    const response = await fetchScheduleRecords(record.uid, tenantUid.value);
    if (response && Array.isArray(response)) {
      record.scheduleRecords = response.map((item: any) => ({
        scheduleId: item.scheduleId || item.id,
        scheduleStatus: item.scheduleStatus || item.status,
        stageProgress: item.stageProgress || '0/0',
        scheduleTime: new Date(item.scheduleTime || item.createdAt),
        startTime: new Date(item.startTime || item.scheduleTime),
        endTime: item.endTime ? new Date(item.endTime) : undefined,
        duration: item.duration || 0,
        nextExecutionTime: item.nextExecutionTime
          ? new Date(item.nextExecutionTime)
          : undefined,
        cronExpression:
          item.cronExpression ||
          record.detail?.taskStep4.scheduleConfig.cronExpression ||
          '',
      }));
    }
  } catch (error) {
    console.error(`获取任务 ${record.uid} 的调度记录失败:`, error);
  }
};

// 新增：开始调度记录轮询
const startSchedulePolling = (record: DataItem) => {
  if (record.schedulePollingTimer) {
    clearInterval(record.schedulePollingTimer);
  }

  record.schedulePollingTimer = window.setInterval(async () => {
    await fetchScheduleRecordsForTask(record);
  }, 10_000); // 每10秒轮询一次
};

// 新增：停止调度记录轮询
const stopSchedulePolling = (record: DataItem) => {
  if (record.schedulePollingTimer) {
    clearInterval(record.schedulePollingTimer);
    record.schedulePollingTimer = undefined;
  }
};

const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    SUCCESS: 'green',
    FAILED: 'red',
    IN_PROGRESS: 'blue',
    QUEUED: 'orange',
    ABORTED: 'gray',
    pending: 'blue',
    running: 'green',
    completed: 'success',
    failed: 'red',
    canceled: 'orange',
  };
  return colorMap[status] || 'default';
};

const fetchData = async () => {
  try {
    loading.value = true;
    const response = await fetchAllTrainTasks(tenantUid.value);
    if (response && Array.isArray(response)) {
      data.value = response.map((task: any) => ({
        key: task.uid,
        uid: task.uid,
        name: task.task_name,
        task_type: task.task_type,
        status: task.status || 'pending',
        scheduleStatus: task.schedule_status || 'stopped',
        creator: task.userId || '未知',
        updated_at: task.updated_at,
        description: task.description || '暂无描述',
        createdAt: task.created_at,
        tabActiveKey: '2',
        detail: mapTaskDetail(task),
        executeRecords: [],
        scheduleRecords: [], // 初始化调度记录
        activeExecuteRecord: null,
        pollingTimer: undefined,
        schedulePollingTimer: undefined,
      }));

      // 为每个任务获取执行记录
      await Promise.all(
        data.value.map(async (item) => {
          try {
            const records = await fetchPipelineRecords(
              item.uid,
              tenantUid.value,
            );
            item.executeRecords = records.map((record) => {
              const startTime = record.startTime
                ? new Date(record.startTime)
                : record.startAt
                  ? new Date(record.startAt)
                  : new Date();

              const endTime = record.endTime
                ? new Date(record.endTime)
                : record.endAt
                  ? new Date(record.endAt)
                  : undefined;

              return {
                id: record.jobUid,
                jobUid: record.jobUid,
                algorithmName:
                  item.detail?.taskStep2.algorithmName || '未知算法',
                status: record.overallStatus || record.jobStatus || 'UNKNOWN',
                startTime,
                endTime,
                duration:
                  endTime && startTime
                    ? endTime.getTime() - startTime.getTime()
                    : 0,
                stages: record.stages || [],
                buildUrl: record.buildUrl || '',
                queueUrl: record.queueUrl || '',
                parentTaskUid: item.uid,
              };
            });

            // 获取调度记录
            await fetchScheduleRecordsForTask(item);

            // 如果调度状态是scheduled，开始轮询调度记录
            if (item.scheduleStatus === 'scheduled') {
              startSchedulePolling(item);
            }
          } catch (error) {
            console.error(`获取任务 ${item.uid} 的记录失败:`, error);
          }
        }),
      );

      pagination.total = response.length;
      initDependencies();
    }
  } catch {
    message.error('获取任务列表失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchData();
});

const handleAdd = () => {
  router.push({ path: '/MTP/train/task' });
};

const handleNameClick = (record: DataItem) => {
  router.push({
    path: '/MTP/train/task',
    query: { id: record.uid },
  });
};

const state = reactive({
  selectedRowKeys: [] as string[],
  loading: false,
});

const hasSelected = computed(() => state.selectedRowKeys.length > 0);

const onSelectChange = (selectedRowKeys: string[]) => {
  state.selectedRowKeys = selectedRowKeys;
};

const handleBatchDelete = async () => {
  if (state.selectedRowKeys.length === 0) return;

  state.loading = true;
  try {
    const deletePromises = state.selectedRowKeys.map((uid) =>
      deleteTrainTask(uid, tenantUid.value),
    );
    await Promise.all(deletePromises);
    message.success(`成功删除 ${state.selectedRowKeys.length} 个任务`);
    fetchData();
    state.selectedRowKeys = [];
  } catch {
    message.error('删除失败');
  } finally {
    state.loading = false;
  }
};

const handleDelete = async (uid: string) => {
  try {
    await deleteTrainTask(uid, tenantUid.value);
    message.success('删除成功');
    fetchData();
  } catch {
    message.error('删除失败');
  }
};

// 创建更多操作菜单
const createMoreMenu = (record: DataItem) => {
  const menuItems = [
    h(
      Menu.Item,
      {
        key: 'edit',
        onClick: () =>
          router.push({
            path: '/MTP/train/task',
            query: { id: record.uid },
          }),
      },
      '编辑',
    ),
  ];

  if (record.scheduleStatus === 'stopped' || !record.scheduleStatus) {
    menuItems.push(
      h(
        Menu.Item,
        {
          key: 'startSchedule',
          onClick: () => handleStartSchedule(record),
        },
        '开始调度',
      ),
    );
  } else if (record.scheduleStatus === 'scheduled') {
    menuItems.push(
      h(
        Menu.Item,
        {
          key: 'viewScheduleStatus',
          onClick: () => handleViewScheduleStatus(record),
        },
        '查看调度状态',
      ),
      h(
        Menu.Item,
        {
          key: 'stopSchedule',
          onClick: () => {
            handleStopSchedule(record);
            stopSchedulePolling(record);
          },
        },
        '结束调度',
      ),
    );
  } else if (record.scheduleStatus === 'error') {
    menuItems.push(
      h(
        Menu.Item,
        {
          key: 'restartSchedule',
          onClick: () => {
            handleStartSchedule(record);
            startSchedulePolling(record);
          },
        },
        '重新启动调度',
      ),
    );
  }

  menuItems.push(
    h(
      Menu.Item,
      {
        key: 'delete',
        onClick: () => handleDelete(record.uid),
      },
      '删除',
    ),
  );

  return h(Menu, {}, { default: () => menuItems });
};

// 修改上游依赖状态管理
const upstreamState = reactive({
  taskTypes: ['数据任务', '训练任务'] as const,
  taskOptions: {
    数据任务: ['数据清洗任务', '数据转换任务', '数据导入任务'],
    训练任务: ['模型训练任务', '模型验证任务', '模型优化任务'],
  },
  dependencies: {} as Record<
    string,
    Array<{
      id: number;
      isEditing: boolean;
      task: string;
      type: string;
    }>
  >,
});

// 添加下游任务状态管理
const downstreamTasks = ref<
  Record<string, Array<{ name: string; type: string }>>
>({});

// 初始化依赖数据
const initDependencies = () => {
  data.value.forEach((item) => {
    if (!upstreamState.dependencies[item.uid]) {
      upstreamState.dependencies[item.uid] = [];
    }

    if (!downstreamTasks.value[item.uid]) {
      downstreamTasks.value[item.uid] = [
        { name: '下游任务A', type: '数据任务' },
        { name: '下游任务B', type: '训练任务' },
        { name: '下游任务C', type: '训练任务' },
      ];
    }
  });
};

const addDependency = (uid: string) => {
  upstreamState.dependencies[uid].push({
    id: Date.now(),
    type: '',
    task: '',
    isEditing: true,
  });
};

const confirmDependency = (uid: string, index: number) => {
  upstreamState.dependencies[uid][index].isEditing = false;
};

const cancelDependency = (uid: string, index: number) => {
  upstreamState.dependencies[uid][index].type = '';
  upstreamState.dependencies[uid][index].task = '';
};

const deleteDependency = (uid: string, index: number) => {
  upstreamState.dependencies[uid].splice(index, 1);
};

const getTaskOptionsForRecord = (type: string) => {
  if (!type) return [];
  return (
    upstreamState.taskOptions[type as keyof typeof upstreamState.taskOptions] ||
    []
  );
};

const handleExecute = async (record: DataItem) => {
  try {
    const pipelineInfo = await TrainTaskStart(
      record.uid,
      tenantUid.value,
      userId.value,
    );

    const newRecord: ExecuteRecord = {
      id: pipelineInfo.jobName,
      jobUid: pipelineInfo.jobName,
      algorithmName: record.detail?.taskStep2.algorithmName || '未知算法',
      status: pipelineInfo.overallStatus,
      startTime: new Date(),
      duration: 0,
      stages: pipelineInfo.stages || [],
      buildUrl: pipelineInfo.buildUrl || '',
      queueUrl: pipelineInfo.queueUrl || '',
      parentTaskUid: record.uid,
    };

    record.status = 'running';
    record.executeRecords.unshift(newRecord);
    record.activeExecuteRecord = newRecord;

    startPolling(record);

    message.success(`任务 ${record.name} 已开始执行`);
  } catch (error) {
    console.error('任务执行失败:', error);
    message.error('任务执行失败');
    record.status = 'failed';
    if (record.activeExecuteRecord) {
      record.activeExecuteRecord.status = 'FAILED';
      record.activeExecuteRecord.endTime = new Date();
    }
  }
};

const startPolling = (record: DataItem) => {
  if (record.pollingTimer) {
    clearInterval(record.pollingTimer);
  }

  record.pollingTimer = window.setInterval(async () => {
    if (!record.activeExecuteRecord) return;

    try {
      const status = await fetchPipelineStatus(
        record.activeExecuteRecord.jobUid,
        tenantUid.value,
      );

      Object.assign(record.activeExecuteRecord, {
        status: status.overallStatus,
        stages: status.stages || [],
        buildUrl: status.buildUrl || record.activeExecuteRecord.buildUrl,
        queueUrl: status.queueUrl || record.activeExecuteRecord.queueUrl,
      });

      if (
        ['ABORTED', 'ERROR', 'FAILED', 'SUCCESS', 'TIMEOUT'].includes(
          status.overallStatus,
        )
      ) {
        clearInterval(record.pollingTimer);
        record.activeExecuteRecord.endTime = new Date();
        record.activeExecuteRecord.duration =
          record.activeExecuteRecord.endTime.getTime() -
          record.activeExecuteRecord.startTime.getTime();

        record.status =
          status.overallStatus === 'SUCCESS' ? 'completed' : 'failed';
        record.activeExecuteRecord = null;
      }
    } catch (error) {
      console.error('获取流水线状态失败:', error);
    }
  }, 5000);
};

const handleRefresh = () => {
  fetchData();
};

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条`,
  onChange: (page: number) => {
    pagination.current = page;
  },
  onShowSizeChange: (current: number, size: number) => {
    pagination.pageSize = size;
    pagination.current = current;
  },
});

// 组件卸载时清除所有定时器
onUnmounted(() => {
  data.value.forEach((item) => {
    if (item.pollingTimer) {
      clearInterval(item.pollingTimer);
    }
    if (item.schedulePollingTimer) {
      clearInterval(item.schedulePollingTimer);
    }
  });
});

const loading = ref(false);
const data = ref<DataItem[]>([]);
</script>

<template>
  <Card class="p-4 shadow-sm">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-xl font-bold">训练任务管理</h1>
      <div class="flex gap-2">
        <Button type="primary" @click="handleRefresh" icon="reload">
          刷新
        </Button>
        <Button type="primary" @click="handleAdd" icon="plus">新增任务</Button>
      </div>
    </div>

    <div class="search-container mb-6 rounded-lg bg-white p-4 shadow">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-5">
        <div>
          <label class="mb-2 block font-medium">任务名称</label>
          <Input
            v-model:value="searchName"
            placeholder="搜索任务名称"
            allow-clear
          />
        </div>

        <div>
          <label class="mb-2 block font-medium">任务类型</label>
          <Select
            v-model:value="searchType"
            placeholder="选择任务类型"
            allow-clear
          >
            <SelectOption
              v-for="platform in platformOptions"
              :key="platform"
              :value="platform"
            >
              {{ platform }}
            </SelectOption>
          </Select>
        </div>

        <div>
          <label class="mb-2 block font-medium">任务状态</label>
          <Select
            v-model:value="searchStatus"
            placeholder="选择任务状态"
            allow-clear
          >
            <SelectOption
              v-for="status in statusOptions"
              :key="status.value"
              :value="status.value"
            >
              {{ status.label }}
            </SelectOption>
          </Select>
        </div>

        <div>
          <label class="mb-2 block font-medium">调度状态</label>
          <Select
            v-model:value="searchScheduleStatus"
            placeholder="选择调度状态"
            allow-clear
          >
            <SelectOption
              v-for="status in scheduleStatusOptions"
              :key="status.value"
              :value="status.value"
            >
              {{ status.label }}
            </SelectOption>
          </Select>
        </div>

        <div class="flex items-end">
          <Button type="primary" @click="fetchData" class="w-full">搜索</Button>
        </div>
      </div>
    </div>

    <div class="mb-4 flex items-center justify-between">
      <div>
        <Button
          type="primary"
          danger
          :disabled="!hasSelected"
          :loading="state.loading"
          @click="handleBatchDelete"
        >
          批量删除
        </Button>
        <span class="ml-3 text-gray-500" v-if="hasSelected">
          已选择 {{ state.selectedRowKeys.length }} 个任务
        </span>
      </div>
      <div class="text-sm text-gray-500">共 {{ pagination.total }} 个任务</div>
    </div>

    <Card class="overflow-hidden p-0">
      <Table
        :columns="columns"
        :row-selection="{
          selectedRowKeys: state.selectedRowKeys,
          onChange: onSelectChange,
        }"
        row-key="key"
        :data-source="filteredData"
        :pagination="pagination"
        :loading="loading"
        bordered
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <a
              @click="handleNameClick(record)"
              class="text-blue-500 hover:underline"
            >
              {{ record.name }}
            </a>
          </template>
          <template v-if="column.key === 'operation'">
            <div class="flex gap-2">
              <Tooltip title="执行任务">
                <Button
                  type="primary"
                  size="small"
                  @click="handleExecute(record)"
                  :disabled="record.status === 'running'"
                >
                  执行
                </Button>
              </Tooltip>

              <Tooltip title="编辑任务">
                <Button
                  type="primary"
                  size="small"
                  ghost
                  @click="handleNameClick(record)"
                >
                  编辑
                </Button>
              </Tooltip>

              <Dropdown :overlay="createMoreMenu(record)">
                <Button type="link" size="small">更多</Button>
              </Dropdown>
            </div>
          </template>
        </template>

        <template #expandedRowRender="{ record }">
          <div class="bg-gray-50 p-4">
            <Tabs
              :active-key="record.tabActiveKey"
              @update:active-key="(key) => (record.tabActiveKey = key)"
            >
              <TabPane key="1" tab="任务详情">
                <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <!-- 基础信息 -->
                  <Card title="任务基础信息" class="h-full">
                    <Descriptions layout="vertical" bordered>
                      <Descriptions.Item label="任务名称">
                        {{ record.detail?.taskStep1.taskName || '未命名' }}
                      </Descriptions.Item>
                      <Descriptions.Item label="任务类型">
                        {{ record.detail?.taskStep1.taskType || '未知类型' }}
                      </Descriptions.Item>
                      <Descriptions.Item label="加密方式">
                        {{ record.detail?.taskStep1.encryption || '无' }}
                      </Descriptions.Item>
                      <Descriptions.Item label="任务区域">
                        {{ record.detail?.taskStep1.taskZone || '默认区域' }}
                      </Descriptions.Item>
                      <Descriptions.Item label="Pod类型">
                        {{ record.detail?.taskStep1.podType || '标准' }}
                      </Descriptions.Item>
                      <Descriptions.Item label="资源类型">
                        {{ record.detail?.taskStep1.resources || '默认资源' }}
                      </Descriptions.Item>
                      <Descriptions.Item label="训练类型">
                        {{ record.detail?.taskStep1.trainType || '训练' }}
                      </Descriptions.Item>
                      <Descriptions.Item label="镜像">
                        {{ record.detail?.taskStep1.image || '无' }}
                      </Descriptions.Item>
                      <Descriptions.Item label="描述" :span="2">
                        {{ record.detail?.taskStep1.describe || '无描述' }}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>

                  <!-- 算法与数据 -->
                  <Card title="算法与数据" class="h-full">
                    <Descriptions layout="vertical" bordered>
                      <Descriptions.Item label="算法名称">
                        {{
                          record.detail?.taskStep2.algorithmName || '未知算法'
                        }}
                      </Descriptions.Item>
                      <Descriptions.Item label="算法版本">
                        {{
                          record.detail?.taskStep2.algorithmVersion ||
                          '未知版本'
                        }}
                      </Descriptions.Item>
                      <Descriptions.Item label="任务入口">
                        {{ record.detail?.taskStep2.taskroute || '无' }}
                      </Descriptions.Item>
                      <Descriptions.Item label="数据集" :span="2">
                        <div v-if="record.detail?.taskStep2.datasets?.length">
                          <div
                            v-for="(dataset, index) in record.detail?.taskStep2
                              .datasets"
                            :key="index"
                            class="mb-1"
                          >
                            <Tag color="blue">
                              {{ dataset.name }} = {{ dataset.selectedName }}
                            </Tag>
                          </div>
                        </div>
                        <div v-else class="text-gray-400">未配置数据集</div>
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>

                  <!-- 训练配置 -->
                  <Card title="训练配置" class="h-full">
                    <Descriptions layout="vertical" bordered>
                      <Descriptions.Item label="自定义变量" :span="2">
                        <div
                          v-if="
                            record.detail?.taskStep3.customVariables?.length
                          "
                        >
                          <div
                            v-for="(variable, index) in record.detail?.taskStep3
                              .customVariables"
                            :key="index"
                            class="mb-1"
                          >
                            <Tag color="purple">
                              {{ variable.name }} = {{ variable.value }}
                            </Tag>
                          </div>
                        </div>
                        <div v-else class="text-gray-400">未配置自定义变量</div>
                      </Descriptions.Item>
                      <Descriptions.Item label="训练配置格式">
                        {{
                          record.detail?.taskStep3.trainConfig.format || '无'
                        }}
                      </Descriptions.Item>
                      <Descriptions.Item label="训练配置内容" :span="2">
                        <pre
                          class="max-h-40 overflow-auto rounded bg-gray-100 p-3"
                          >{{
                            record.detail?.taskStep3.trainConfig.content ||
                            '无配置内容'
                          }}</pre
                        >
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>

                  <!-- 输出与调度（只显示调度信息） -->
                  <Card title="输出与调度" class="h-full">
                    <Descriptions layout="vertical" bordered>
                      <!-- 调度配置信息 -->
                      <Descriptions.Item label="调度状态">
                        <Tag
                          :color="
                            record.scheduleStatus === 'scheduled'
                              ? 'green'
                              : record.scheduleStatus === 'error'
                                ? 'red'
                                : 'gray'
                          "
                        >
                          {{
                            record.scheduleStatus === 'scheduled'
                              ? '调度中'
                              : record.scheduleStatus === 'error'
                                ? '调度错误'
                                : '未调度'
                          }}
                        </Tag>
                      </Descriptions.Item>

                      <Descriptions.Item label="调度类型">
                        {{
                          record.detail?.taskStep4.scheduleConfig
                            .intervalType || '未配置'
                        }}
                      </Descriptions.Item>

                      <Descriptions.Item label="Cron表达式">
                        {{
                          record.detail?.taskStep4.scheduleConfig
                            .cronExpression || '未配置'
                        }}
                      </Descriptions.Item>

                      <Descriptions.Item label="调度作业">
                        <div v-if="record.scheduleJobName">
                          <Tag color="blue" class="mb-1">
                            {{ record.scheduleJobName }}
                          </Tag>
                          <div class="mt-2 flex gap-2">
                            <Button
                              type="link"
                              size="small"
                              @click="handleViewScheduleStatus(record)"
                            >
                              查看调度状态
                            </Button>
                            <Button
                              v-if="record.scheduleStatus === 'scheduled'"
                              type="link"
                              size="small"
                              danger
                              @click="handleStopSchedule(record)"
                            >
                              结束调度
                            </Button>
                          </div>
                        </div>
                        <div v-else class="text-gray-400">未创建调度作业</div>
                      </Descriptions.Item>

                      <Descriptions.Item label="下次执行时间">
                        <div v-if="record.scheduleStatus === 'scheduled'">
                          <!-- 这里可以显示通过cron表达式计算的下次执行时间 -->
                          <Tag color="green">
                            {{
                              new Date(Date.now() + 3600000).toLocaleString()
                            }}
                          </Tag>
                        </div>
                        <div v-else class="text-gray-400">未调度</div>
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </div>
              </TabPane>

              <TabPane key="2" tab="执行记录">
                <div class="mb-4 flex items-center justify-between">
                  <div>
                    <Button
                      type="primary"
                      danger
                      :disabled="record.executeRecords.length === 0"
                      @click="handleDeleteAllExecutions(record)"
                      class="mr-2"
                    >
                      删除全部记录
                    </Button>
                    <span class="text-sm text-gray-500">
                      共 {{ record.executeRecords.length }} 个执行记录
                    </span>
                  </div>
                  <Button
                    type="primary"
                    @click="handleExecute(record)"
                    :disabled="record.status === 'running'"
                  >
                    新建执行
                  </Button>
                </div>

                <Table
                  :columns="executeRecordColumns"
                  :data-source="record.executeRecords"
                  :pagination="false"
                  row-key="jobUid"
                >
                  <template #emptyText>
                    <Empty description="暂无执行记录">
                      <Button type="primary" @click="handleExecute(record)">
                        执行任务
                      </Button>
                    </Empty>
                  </template>

                  <template #expandedRowRender="{ record: execRecord }">
                    <div class="pipeline-stages">
                      <div
                        v-for="(stage, index) in execRecord.stages"
                        :key="index"
                        class="stage-item"
                      >
                        <div class="stage-header">
                          <Tag
                            :color="statusMap[stage.status]?.color || 'default'"
                          >
                            {{ index + 1 }}. {{ stage.stageName }}
                          </Tag>
                          <span class="stage-status">{{
                            statusMap[stage.status]?.text || stage.status
                          }}</span>
                          <span class="stage-duration">{{
                            formatDuration(stage.durationMillis)
                          }}</span>
                        </div>
                        <div class="stage-time">
                          {{ stage.startTime.toLocaleTimeString() }}
                        </div>
                      </div>
                    </div>
                  </template>
                </Table>
              </TabPane>

              <!-- 新增：调度记录TabPane -->
              <TabPane key="3" tab="调度记录">
                <div class="mb-4 flex items-center justify-between">
                  <div>
                    <Button
                      type="primary"
                      @click="fetchScheduleRecordsForTask(record)"
                      class="mr-2"
                    >
                      刷新记录
                    </Button>
                    <span class="text-sm text-gray-500">
                      共 {{ record.scheduleRecords.length }} 个调度记录
                    </span>
                  </div>
                  <div class="text-sm text-gray-400">
                    自动刷新:
                    {{
                      record.scheduleStatus === 'scheduled' ? '开启' : '关闭'
                    }}
                  </div>
                </div>

                <Table
                  :columns="scheduleRecordColumns"
                  :data-source="record.scheduleRecords"
                  :pagination="false"
                  row-key="scheduleId"
                >
                  <template #emptyText>
                    <Empty description="暂无调度记录">
                      <Button
                        type="primary"
                        @click="handleStartSchedule(record)"
                        v-if="record.scheduleStatus !== 'scheduled'"
                      >
                        开始调度
                      </Button>
                    </Empty>
                  </template>
                </Table>
              </TabPane>

              <!-- 调整原有的TabPane key -->
              <TabPane key="4" tab="上游依赖">
                <Card class="p-4">
                  <div class="mb-4">
                    <Button type="primary" @click="addDependency(record.uid)">
                      + 新增依赖
                    </Button>
                  </div>

                  <div
                    v-for="(dependency, index) in upstreamState.dependencies[
                      record.uid
                    ]"
                    :key="dependency.id"
                    class="dependency-item mb-4 rounded border bg-white p-4"
                  >
                    <div v-if="dependency.isEditing" class="edit-mode">
                      <div
                        class="dependency-selectors mb-3 flex flex-wrap gap-3"
                      >
                        <Select
                          v-model:value="dependency.type"
                          placeholder="请选择任务类型"
                          style="width: 200px"
                          @change="dependency.task = ''"
                        >
                          <SelectOption
                            v-for="type in upstreamState.taskTypes"
                            :key="type"
                            :value="type"
                          >
                            {{ type }}
                          </SelectOption>
                        </Select>

                        <Select
                          v-model:value="dependency.task"
                          placeholder="请选择任务名称"
                          style="width: 300px"
                          :disabled="!dependency.type"
                          show-search
                          :filter-option="
                            (input, option) =>
                              option.children
                                .toLowerCase()
                                .indexOf(input.toLowerCase()) >= 0
                          "
                        >
                          <SelectOption
                            v-for="task in getTaskOptionsForRecord(
                              dependency.type,
                            )"
                            :key="task"
                            :value="task"
                          >
                            {{ task }}
                          </SelectOption>
                        </Select>

                        <Button
                          type="link"
                          danger
                          @click="deleteDependency(record.uid, index)"
                          class="ml-2"
                        >
                          删除
                        </Button>
                      </div>

                      <div class="action-buttons flex justify-end">
                        <Button
                          type="primary"
                          :disabled="!dependency.task"
                          @click="confirmDependency(record.uid, index)"
                        >
                          确认
                        </Button>
                        <Button
                          style="margin-left: 8px"
                          @click="cancelDependency(record.uid, index)"
                        >
                          取消
                        </Button>
                      </div>
                    </div>

                    <div
                      v-else
                      class="confirmed-mode flex items-center justify-between"
                    >
                      <div class="selected-info">
                        <div class="selected-text font-medium">
                          依赖项 {{ index + 1 }}: {{ dependency.type }} -
                          {{ dependency.task }}
                        </div>
                      </div>
                      <div>
                        <Button
                          type="link"
                          danger
                          @click="deleteDependency(record.uid, index)"
                        >
                          删除
                        </Button>
                        <Button
                          type="link"
                          @click="dependency.isEditing = true"
                          class="ml-2"
                        >
                          编辑
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div
                    v-if="!upstreamState.dependencies[record.uid]?.length"
                    class="no-dependencies py-8 text-center text-gray-400"
                  >
                    <Empty description="暂无上游依赖配置" />
                  </div>
                </Card>
              </TabPane>

              <TabPane key="5" tab="下游任务">
                <Card class="p-4">
                  <div
                    v-if="downstreamTasks[record.uid]?.length"
                    class="task-list"
                  >
                    <div class="task-header flex bg-gray-100 p-3 font-medium">
                      <div class="header-item" style="width: 40%">任务名称</div>
                      <div class="header-item" style="width: 40%">任务类型</div>
                      <div class="header-item" style="width: 20%">操作</div>
                    </div>

                    <div
                      v-for="(task, index) in downstreamTasks[record.uid]"
                      :key="index"
                      class="task-item flex items-center border-b p-3"
                    >
                      <div style="width: 40%" class="font-medium">
                        {{ task.name }}
                      </div>
                      <div style="width: 40%">
                        <Tag color="blue">{{ task.type }}</Tag>
                      </div>
                      <div style="width: 20%">
                        <Button type="link" size="small">查看</Button>
                      </div>
                    </div>
                  </div>

                  <div v-else class="no-tasks py-8">
                    <Empty description="当前任务没有被任何下游任务依赖" />
                  </div>
                </Card>
              </TabPane>
            </Tabs>
          </div>
        </template>

        <template #empty>
          <Empty description="暂无训练任务">
            <Button type="primary" @click="handleAdd">创建新任务</Button>
          </Empty>
        </template>
      </Table>
    </Card>
  </Card>
</template>

<style scoped>
.search-container {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.dependency-item {
  transition: all 0.3s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.dependency-item:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.task-header {
  border-radius: 4px 4px 0 0;
}

.task-item:last-child {
  border-bottom: none;
}

:deep(.ant-descriptions-item-label) {
  font-weight: 500;
  color: #4a5568;
}

:deep(.ant-card-head) {
  background-color: #f7fafc;
}

.pipeline-stages {
  padding: 12px;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.stage-item {
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.stage-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stage-status {
  font-weight: 500;
}

.stage-duration {
  margin-left: auto;
  color: #666;
  font-size: 0.9em;
}

.stage-time {
  margin-top: 4px;
  color: #888;
  font-size: 0.85em;
}

.console-output {
  max-height: 60vh;
  overflow: auto;
  background: #1e1e1e;
  color: #dcdcdc;
  padding: 16px;
  font-family: monospace;
  white-space: pre-wrap;
}

.stage-header {
  color: #569cd6;
  font-weight: bold;
  margin-top: 10px;
}

.stage-content {
  margin-left: 20px;
}
</style>
