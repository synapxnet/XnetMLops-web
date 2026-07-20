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
  deleteJenkinsJob,
  deleteTrainTask,
  fetchAllTrainTasks,
  fetchPipelineRecords,
  fetchPipelineStatus,
  getScheduleStatus,
  startSchedule,
  stopSchedule,
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
  id: string; // 作业UID
  jobUid: string; // 新增作业UID字段
  algorithmName: string;
  status: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // 毫秒
  stages: PipelineStage[];
  buildUrl: string;
  queueUrl: string;
  parentTaskUid: string; // 父任务UID
}

interface DataItem {
  tabActiveKey: string;
  key: string;
  uid: string;
  name: string;
  task_type: string;
  status: string;
  scheduleStatus: 'error' | 'scheduled' | 'stopped'; // 新增：调度状态
  updated_at: string;
  description: string;
  creator: string;
  createdAt: string;
  detail?: TaskDetail;
  executeRecords: ExecuteRecord[]; // 执行记录
  activeExecuteRecord?: ExecuteRecord | null; // 当前活跃的执行记录
  pollingTimer?: number; // 轮询定时器
  scheduleJobName?: string; // 新增：调度作业名称
  scheduleJobStatus?: 'error' | 'scheduled' | 'stopped'; // 新增：调度作业状态
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
        DELETING: { color: 'orange', text: '删除中' }, // 新增
        DELETED: { color: 'gray', text: '已删除' }, // 新增
      };

      const statusInfo = statusMap[record.status] || {
        color: 'default',
        text: record.status,
      };

      return h(Tag, { color: statusInfo.color }, () => statusInfo.text);
    },
  },
  {
    title: '调度状态', // 新增列
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
const tenantUid = computed(
  () => currentTenantInfo.value?.tenantUid || 'default',
);
const userId = computed(() => currentUserInfo.value?.userId || '');

// 搜索相关逻辑
const searchName = ref('');
const searchType = ref('');
const searchStatus = ref('');
const searchScheduleStatus = ref(''); // 新增：调度状态搜索

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
  // 新增：调度状态选项
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
    const scheduleStatusMatch = searchScheduleStatus.value // 新增：调度状态过滤
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
};

// 执行记录表格列定义 - 修改部分
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
  // 新增结束时间列
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
      // 定义活跃状态
      const ACTIVE_STATUSES = new Set(['IN_PROGRESS', 'QUEUED', 'WAITING']);

      return h('div', { class: 'flex gap-1' }, [
        // 取消按钮（只在活跃状态显示）
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

        // 查看日志按钮
        h(
          Button,
          {
            type: 'link',
            size: 'small',
            onClick: () => showConsoleOutput(record),
          },
          '查看日志',
        ),

        // 删除按钮
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

        // 强制删除按钮（仅在活跃状态显示）
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

        // 更多操作下拉菜单
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

// 新增函数：取消任务执行
const handleCancelExecution = async (execRecord: ExecuteRecord) => {
  try {
    // 调用删除作业接口，但不强制停止构建
    const result = await deleteJenkinsJob(execRecord.jobUid, false);

    if (result.code === 0) {
      message.success('任务已取消');

      // 更新任务状态
      const parentTask = data.value.find(
        (t) => t.uid === execRecord.parentTaskUid,
      );

      if (parentTask && parentTask.activeExecuteRecord) {
        parentTask.activeExecuteRecord.status = 'ABORTED';
        parentTask.activeExecuteRecord.endTime = new Date();

        // 停止轮询
        if (parentTask.pollingTimer) {
          clearInterval(parentTask.pollingTimer);
          parentTask.pollingTimer = undefined;
        }

        // 更新任务状态
        parentTask.status = 'canceled';
        parentTask.activeExecuteRecord = null;
      }
    } else {
      message.error(`取消失败: ${result.message}`);
    }
  } catch (error: any) {
    message.error(`取消失败: ${error.message || '未知错误'}`);
  }
};

// 新增函数：查看任务详情
const handleViewJobDetail = (execRecord: ExecuteRecord) => {
  router.push({
    path: '/MTP/train/job',
    query: { id: execRecord.jobUid, tenantUid: tenantUid.value },
  });
};

// 新增函数：删除执行记录
const handleDeleteExecution = async (execRecord: ExecuteRecord) => {
  // 临时更新状态为删除中
  const parentTask = data.value.find((t) => t.uid === execRecord.parentTaskUid);

  if (parentTask) {
    const targetRecord = parentTask.executeRecords.find(
      (r) => r.jobUid === execRecord.jobUid,
    );
    if (targetRecord) {
      targetRecord.status = 'DELETING';
    }
  }
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除执行记录 ${execRecord.jobUid} 吗？此操作将：\n1. 删除 Jenkins 作业\n2. 删除数据库记录\n3. 清理缓存`,
    okText: '删除',
    cancelText: '取消',
    okType: 'danger',
    async onOk() {
      try {
        // 调用删除作业接口
        const result = await deleteJenkinsJob(execRecord.jobUid);
        console.log('取消任务执行结果:', result);

        if (result === null) {
          message.success('执行记录已删除');

          // 找到父任务并更新执行记录列表
          const parentTask = data.value.find(
            (t) => t.uid === execRecord.parentTaskUid,
          );

          if (parentTask) {
            // 从执行记录列表中移除
            parentTask.executeRecords = parentTask.executeRecords.filter(
              (r) => r.jobUid !== execRecord.jobUid,
            );

            // 如果删除的是活跃记录，清活跃记录
            if (parentTask.activeExecuteRecord?.jobUid === execRecord.jobUid) {
              parentTask.activeExecuteRecord = null;

              // 停止轮询
              if (parentTask.pollingTimer) {
                clearInterval(parentTask.pollingTimer);
                parentTask.pollingTimer = undefined;
              }

              // 更新任务状态
              parentTask.status = 'pending';
            }
          }
        } else {
          message.error(`删除失败: ${result.message}`);
        }
      } catch (error: any) {
        message.error(`删除失败: ${error.message || '未知错误'}`);
      }
    },
  });
};

// 新增：强制删除函数（停止构建后再删除）
const handleForceDeleteExecution = async (execRecord: ExecuteRecord) => {
  Modal.confirm({
    title: '强制删除',
    content: `确定要强制删除执行记录 ${execRecord.jobUid} 吗？\n此操作将：\n1. 强制停止正在运行的构建\n2. 删除 Jenkins 作业\n3. 删除数据库记录`,
    okText: '强制删除',
    cancelText: '取消',
    okType: 'danger',
    async onOk() {
      try {
        // 调用删除作业接口，强制停止构建
        const result = await deleteJenkinsJob(execRecord.jobUid, true);

        if (result === null) {
          message.success('执行记录已强制删除');

          // 更新前端数据
          const parentTask = data.value.find(
            (t) => t.uid === execRecord.parentTaskUid,
          );

          if (parentTask) {
            // 从执行记录列表中移除
            parentTask.executeRecords = parentTask.executeRecords.filter(
              (r) => r.jobUid !== execRecord.jobUid,
            );

            // 如果删除的是活跃记录
            if (parentTask.activeExecuteRecord?.jobUid === execRecord.jobUid) {
              parentTask.activeExecuteRecord = null;

              // 停止轮询
              if (parentTask.pollingTimer) {
                clearInterval(parentTask.pollingTimer);
                parentTask.pollingTimer = undefined;
              }

              // 更新任务状态
              parentTask.status = 'canceled';
            }
          }
        } else {
          message.error(`删除失败: ${result.message}`);
        }
      } catch (error: any) {
        message.error(`删除失败: ${error.message || '未知错误'}`);
      }
    },
  });
};

// 新增函数：重新执行
const handleRerunExecution = (execRecord: ExecuteRecord) => {
  const parentTask = data.value.find((t) => t.uid === execRecord.parentTaskUid);
  if (parentTask) {
    handleExecute(parentTask);
  }
};
// 新增：批量删除任务的所有作业
const handleDeleteAllExecutions = (record: DataItem) => {
  Modal.confirm({
    title: '批量删除确认',
    content: `确定要删除任务 "${record.name}" 的所有 ${record.executeRecords.length} 个执行记录吗？`,
    okText: '删除全部',
    cancelText: '取消',
    okType: 'danger',
    async onOk() {
      try {
        // 这里可以调用批量删除接口或循环调用单个删除
        const deletePromises = record.executeRecords.map((execRecord) =>
          deleteJenkinsJob(execRecord.jobUid, false),
        );

        await Promise.all(deletePromises);

        // 清空执行记录
        record.executeRecords = [];

        // 清除活跃记录和轮询
        record.activeExecuteRecord = null;
        if (record.pollingTimer) {
          clearInterval(record.pollingTimer);
          record.pollingTimer = undefined;
        }

        // 重置任务状态
        record.status = 'pending';

        message.success('所有执行记录已删除');
      } catch (error: any) {
        message.error(`批量删除失败: ${error.message || '未知错误'}`);
      }
    },
  });
};

// 新增函数：开始调度
const handleStartSchedule = async (record: DataItem) => {
  try {
    // 检查是否有调度配置
    const scheduleConfig = record.detail?.taskStep4.scheduleConfig;
    if (!scheduleConfig || !scheduleConfig.isActive) {
      message.warning('请先配置调度信息并激活调度');
      return;
    }

    Modal.confirm({
      title: '开始调度确认',
      content: h('div', [
        h('p', `确定要开始调度任务 "${record.name}" 吗？`),
        scheduleConfig.isActive &&
          h('div', { class: 'mt-2 p-2 bg-blue-50 rounded' }, [
            h('p', { class: 'font-medium' }, '调度配置信息:'),
            h(
              'p',
              { class: 'text-sm' },
              `调度类型: ${scheduleConfig.intervalType}`,
            ),
            scheduleConfig.intervalType === 'daily' &&
              scheduleConfig.dailyTime &&
              h(
                'p',
                { class: 'text-sm' },
                `执行时间: 每天 ${scheduleConfig.dailyTime}`,
              ),
            scheduleConfig.intervalType === 'weekly' &&
              scheduleConfig.weeklyDays &&
              scheduleConfig.weeklyTime &&
              h(
                'p',
                { class: 'text-sm' },
                `执行时间: 每周 ${scheduleConfig.weeklyDays?.join('、')} ${scheduleConfig.weeklyTime}`,
              ),
            scheduleConfig.intervalType === 'hourly' &&
              scheduleConfig.hourlyMinute &&
              h(
                'p',
                { class: 'text-sm' },
                `执行时间: 每小时第 ${scheduleConfig.hourlyMinute} 分钟`,
              ),
            scheduleConfig.intervalType === 'interval' &&
              scheduleConfig.intervalDuration &&
              scheduleConfig.intervalUnit &&
              h(
                'p',
                { class: 'text-sm' },
                `执行间隔: 每 ${scheduleConfig.intervalDuration} ${scheduleConfig.intervalUnit}`,
              ),
            scheduleConfig.intervalType === 'cron' &&
              scheduleConfig.cronExpression &&
              h(
                'p',
                { class: 'text-sm' },
                `Cron表达式: ${scheduleConfig.cronExpression}`,
              ),
          ]),
      ]),
      okText: '开始调度',
      cancelText: '取消',
      async onOk() {
        try {
          // 调用开始调度API
          const result = await startSchedule(
            record.uid,
            tenantUid.value,
            userId.value,
            scheduleConfig,
          );

          if (result === null) {
            message.error(`开始调度失败: ${result.message}`);
            record.scheduleJobStatus = 'error';
            record.scheduleStatus = 'error';
          } else {
            message.success('调度任务创建成功');

            // 保存调度作业信息到record
            record.scheduleJobName = result.jobName;
            record.scheduleJobStatus = result.scheduleActive
              ? 'scheduled'
              : 'stopped';
            record.scheduleStatus = result.scheduleActive
              ? 'scheduled'
              : 'stopped';

            // 显示调度信息
            message.info(
              `调度任务创建成功！作业名称: ${result.jobName}, 调度状态: ${
                result.scheduleActive ? '已激活' : '未激活'
              }`,
            );
          }
        } catch (error: any) {
          message.error(`开始调度失败: ${error.message || '未知错误'}`);
          record.scheduleJobStatus = 'error';
          record.scheduleStatus = 'error';
        }
      },
    });
  } catch (error: any) {
    message.error(`开始调度失败: ${error.message || '未知错误'}`);
  }
};

// 新增函数：结束调度
const handleStopSchedule = async (record: DataItem) => {
  if (!record.scheduleJobName) {
    message.warning('该任务没有调度作业');
    return;
  }

  Modal.confirm({
    title: '结束调度确认',
    content: h('div', [
      h('p', `确定要结束任务 "${record.name}" 的调度吗？`),
      h(
        'p',
        { class: 'text-sm text-gray-500' },
        `调度作业: ${record.scheduleJobName}`,
      ),
      h(
        'p',
        { class: 'text-sm text-red-500' },
        '此操作将停止所有相关构建并删除调度配置',
      ),
    ]),
    okText: '结束调度',
    cancelText: '取消',
    okType: 'danger',
    async onOk() {
      try {
        // 调用结束调度API
        const result = await stopSchedule(
          record.scheduleJobName!,
          tenantUid.value,
          userId.value,
          true, // 删除调度作业
        );

        if (result === null) {
          message.error(`结束调度失败: ${result.message}`);
        } else {
          message.success('调度任务已结束');

          // 更新任务状态
          record.scheduleJobStatus = 'stopped';
          record.scheduleStatus = 'stopped';

          // 显示详细信息
          const details = [];
          if (result.buildsStopped) details.push('构建已停止');
          if (result.scheduleConfigDeleted) details.push('调度配置已删除');
          if (result.jobDeleted) details.push('作业已删除');

          message.info(`调度结束完成: ${details.join(', ')}`);
        }
      } catch (error: any) {
        message.error(`结束调度失败: ${error.message || '未知错误'}`);
      }
    },
  });
};

// 新增：查看调度状态函数
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
    console.log('xxxxxxxxxxxxx', result);
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

// 辅助函数：获取状态颜色
const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    SUCCESS: 'green',
    FAILED: 'red',
    IN_PROGRESS: 'blue',
    QUEUED: 'orange',
    ABORTED: 'gray',
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
        scheduleStatus: task.schedule_status || 'stopped', // 新增：调度状态
        creator: task.userId || '未知',
        updated_at: task.updated_at,
        description: task.description || '暂无描述',
        createdAt: task.created_at,
        tabActiveKey: '2', // 默认打开第二个标签页
        detail: mapTaskDetail(task),
        executeRecords: [], // 初始化为空数组
        activeExecuteRecord: null,
        pollingTimer: undefined,
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
              // 确保所有必需字段都有值
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
                parentTaskUid: item.uid, // 添加父任务UID
              };
            });
          } catch (error) {
            console.error(`获取任务 ${item.uid} 的执行记录失败:`, error);
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

// 批量删除函数
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

// 单个任务删除函数
const handleDelete = async (uid: string) => {
  try {
    await deleteTrainTask(uid, tenantUid.value);
    message.success('删除成功');
    fetchData();
  } catch {
    message.error('删除失败');
  }
};

// 创建更多操作菜单 - 修改部分，添加调度相关操作
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

  // 根据调度状态添加不同的调度菜单项
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
          onClick: () => handleStopSchedule(record),
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
          onClick: () => handleStartSchedule(record),
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
    // 初始化上游依赖
    if (!upstreamState.dependencies[item.uid]) {
      upstreamState.dependencies[item.uid] = [];
    }

    // 初始化下游任务
    if (!downstreamTasks.value[item.uid]) {
      downstreamTasks.value[item.uid] = [
        { name: '下游任务A', type: '数据任务' },
        { name: '下游任务B', type: '训练任务' },
        { name: '下游任务C', type: '训练任务' },
      ];
    }
  });
};

// 添加新的依赖项
const addDependency = (uid: string) => {
  upstreamState.dependencies[uid].push({
    id: Date.now(),
    type: '',
    task: '',
    isEditing: true,
  });
};

// 确认单个依赖项
const confirmDependency = (uid: string, index: number) => {
  upstreamState.dependencies[uid][index].isEditing = false;
};

// 取消单个依赖项
const cancelDependency = (uid: string, index: number) => {
  upstreamState.dependencies[uid][index].type = '';
  upstreamState.dependencies[uid][index].task = '';
};

// 删除单个依赖项
const deleteDependency = (uid: string, index: number) => {
  upstreamState.dependencies[uid].splice(index, 1);
};

// 获取任务选项的方法
const getTaskOptionsForRecord = (type: string) => {
  if (!type) return [];
  return (
    upstreamState.taskOptions[type as keyof typeof upstreamState.taskOptions] ||
    []
  );
};

// 执行任务函数
const handleExecute = async (record: DataItem) => {
  try {
    // 1. 调用API创建流水线
    const pipelineInfo = await TrainTaskStart(
      record.uid,
      tenantUid.value,
      userId.value,
    );

    // 2. 创建执行记录
    const newRecord: ExecuteRecord = {
      id: pipelineInfo.jobName,
      jobUid: pipelineInfo.jobName, // 保存作业UID
      algorithmName: record.detail?.taskStep2.algorithmName || '未知算法',
      status: pipelineInfo.overallStatus,
      startTime: new Date(),
      duration: 0,
      stages: pipelineInfo.stages || [],
      buildUrl: pipelineInfo.buildUrl || '',
      queueUrl: pipelineInfo.queueUrl || '',
      parentTaskUid: record.uid, // 添加父任务UID
    };

    // 3. 更新任务状态
    record.status = 'running';
    record.executeRecords.unshift(newRecord);
    record.activeExecuteRecord = newRecord;

    // 4. 开始轮询状态
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

// 开始轮询流水线状态
const startPolling = (record: DataItem) => {
  // 清除现有定时器
  if (record.pollingTimer) {
    clearInterval(record.pollingTimer);
  }

  // 设置新定时器
  record.pollingTimer = window.setInterval(async () => {
    if (!record.activeExecuteRecord) return;

    try {
      const status = await fetchPipelineStatus(
        record.activeExecuteRecord.jobUid, // 使用作业UID查询
        tenantUid.value,
      );

      // 更新执行记录
      Object.assign(record.activeExecuteRecord, {
        status: status.overallStatus,
        stages: status.stages || [],
        buildUrl: status.buildUrl || record.activeExecuteRecord.buildUrl,
        queueUrl: status.queueUrl || record.activeExecuteRecord.queueUrl,
      });

      // 如果构建完成
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

        // 更新任务状态
        record.status =
          status.overallStatus === 'SUCCESS' ? 'completed' : 'failed';
        record.activeExecuteRecord = null;
      }
    } catch (error) {
      console.error('获取流水线状态失败:', error);
    }
  }, 5000); // 每5秒轮询一次
};

// 刷新数据
const handleRefresh = () => {
  fetchData();
};

// 分页设置
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

// 组件卸载时清除所有轮询定时器
onUnmounted(() => {
  data.value.forEach((item) => {
    if (item.pollingTimer) {
      clearInterval(item.pollingTimer);
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

                  <!-- 输出与调度 -->
                  <!-- 在任务详情卡片的输出与调度部分添加调度作业信息 -->
                  <Card title="输出与调度" class="h-full">
                    <Descriptions layout="vertical" bordered>
                      <!-- 其他描述项... -->

                      <!-- 调度作业信息 -->
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
                      <Descriptions.Item label="输出路径">
                        {{
                          record.detail?.taskStep4.outputConfig.outputPath ||
                          '未配置'
                        }}
                      </Descriptions.Item>
                      <Descriptions.Item label="输出类型">
                        {{
                          record.detail?.taskStep4.outputConfig.outputType ||
                          '未配置'
                        }}
                      </Descriptions.Item>
                      <Descriptions.Item label="自动发布">
                        <Tag
                          :color="
                            record.detail?.taskStep4.outputConfig.autoPublish
                              ? 'green'
                              : 'red'
                          "
                        >
                          {{
                            record.detail?.taskStep4.outputConfig.autoPublish
                              ? '是'
                              : '否'
                          }}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="通知用户">
                        {{
                          record.detail?.taskStep4.notificationConfig
                            .notificationUserID || '无'
                        }}
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

                    <!-- 自定义阶段信息展示 -->
                    <template #expandedRowRender="{ record: execRecord }">
                      <div class="pipeline-stages">
                        <div
                          v-for="(stage, index) in execRecord.stages"
                          :key="index"
                          class="stage-item"
                        >
                          <div class="stage-header">
                            <Tag
                              :color="
                                statusMap[stage.status]?.color || 'default'
                              "
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
                </Table>
              </TabPane>

              <TabPane key="3" tab="上游依赖">
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

              <TabPane key="4" tab="下游任务">
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
