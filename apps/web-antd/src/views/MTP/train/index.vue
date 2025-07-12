<script lang="ts" setup>
import type { Ref } from 'vue';

import { computed, h, inject, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  Badge,
  Button,
  Card,
  Descriptions,
  Dropdown,
  Input,
  Menu,
  message,
  Select,
  Table,
  TabPane,
  Tabs,
} from 'ant-design-vue';

import {
  deleteTrainTask,
  fetchAllTrainTasks,
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

interface DataItem {
  tabActiveKey: string;
  key: string;
  uid: string;
  name: string;
  task_type: string;
  status: string;
  updated_at: string;
  description: string;
  creator: string;
  createdAt: string;
  detail?: TaskDetail;
}

const columns = [
  { title: '任务名称', dataIndex: 'name', key: 'name' },
  { title: '任务类型', dataIndex: 'task_type', key: 'task_type' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '修改者', dataIndex: 'creator', key: 'creator' },
  { title: '更新时间', dataIndex: 'updated_at', key: 'updated_at' },
  { title: '描述', dataIndex: 'description', key: 'description' },
  { title: '操作', key: 'operation' },
];

// 从后端API获取任务数据
const loading = ref(false);
const data = ref<DataItem[]>([]);
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
});

const mapTaskDetail = (task: any): TaskDetail => {
  // 1. 修复JSON解析 - 添加try-catch
  const parseSafe = (jsonString: string, defaultValue: any) => {
    try {
      return jsonString ? JSON.parse(jsonString) : defaultValue;
    } catch (error) {
      console.error('JSON解析失败', error);
      return defaultValue;
    }
  };

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

  // 2. 使用安全的解析函数
  const notificationConfig = parseSafe(
    task.notification_config,
    defaultNotificationConfig,
  );
  const outputConfig = parseSafe(task.output_config, defaultOutputConfig);
  const scheduleConfig = parseSafe(task.schedule_config, defaultScheduleConfig);

  // 3. 修复数据集访问 - 添加空数组回退
  const datasets = task.datasets
    ? task.datasets.map((ds: any) => ({
        id: ds.dataset_id || '',
        name: ds.name || '未知数据集',
        selectedName: ds.selectedName || ds.name || '未知',
      }))
    : [];

  // 4. 修复自定义变量访问
  const customVariables = task.custom_variables
    ? task.custom_variables.map((cv: any) => ({
        id: cv.uid || Date.now().toString(),
        name: cv.name || '',
        value: cv.value || '',
      }))
    : [];

  return {
    taskStep1: {
      taskName: task.task_name || '',
      taskType: task.task_type || '',
      encryption: task.encryption || '',
      taskZone: task.task_zone || '',
      podType: task.pod_type || '',
      resources: task.resources || '',
      trainType: task.train_type || '',
      image: task.image || '',
      describe: task.description || '',
    },
    taskStep2: {
      algorithmName: task.algorithm_name || '',
      algorithmVersion: task.algorithm_version || '',
      datasets,
      taskroute: task.task_route || '',
    },
    taskStep3: {
      customVariables,
      trainConfig: {
        content: task.train_config_content || '',
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
const tenantUid = computed(() => currentUserInfo.value?.tenantUid || '');
const userId = computed(() => currentUserInfo.value?.userId || '');

// 搜索相关逻辑
const searchName = ref('');
const searchType = ref('');

const platformOptions = computed(() => {
  return [...new Set(data.value.map((item) => item.task_type))];
});

const filteredData = computed(() => {
  return data.value.filter((item) => {
    const nameMatch = item.name
      .toLowerCase()
      .includes(searchName.value.toLowerCase());
    const typeMatch = searchType.value
      ? item.task_type === searchType.value
      : true;
    return nameMatch && typeMatch;
  });
});

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
        status: '运行中',
        creator: task.userId || '未知',
        updated_at: task.updated_at,
        description: task.description || '暂无描述',
        createdAt: task.created_at,
        tabActiveKey: '1', // 默认打开第一个标签页
        detail: mapTaskDetail(task),
      }));

      pagination.total = response.length;

      // 初始化上游依赖和下游任务
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
  state.loading = true;
  try {
    const deletePromises = state.selectedRowKeys.map((uid) =>
      deleteTrainTask(uid, tenantUid.value),
    );
    await Promise.all(deletePromises);
    message.success('删除成功');
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
    fetchData(); // 刷新数据
  } catch {
    message.error('删除失败');
  }
};

// 开始调度函数（暂无功能）
const handleStartSchedule = (record: DataItem) => {
  message.info(`开始调度任务：${record.name}（功能暂未实现）`);
};

// 创建更多操作菜单
const createMoreMenu = (record: DataItem) => {
  return h(
    Menu,
    {},
    {
      default: () => [
        h(
          Menu.Item,
          {
            key: 'start',
            onClick: () => handleStartSchedule(record),
          },
          '开始调度',
        ),
        h(
          Menu.Item,
          {
            key: 'delete',
            onClick: () => handleDelete(record.uid),
          },
          '删除',
        ),
      ],
    },
  );
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

// 添加下游任务状态管理（示例数据）
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

    // 初始化下游任务（示例数据）
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

// 执行记录表格列定义
const executeRecordColumns = [
  { title: '算法名称', dataIndex: 'algorithmName', key: 'algorithmName' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '周期时间', dataIndex: 'scheduleTime', key: 'scheduleTime' },
  { title: '开始时间', dataIndex: 'startTime', key: 'startTime' },
  { title: '结束时间', dataIndex: 'endTime', key: 'endTime' },
  { title: '执行时间', dataIndex: 'duration', key: 'duration' },
  { title: '操作', dataIndex: 'operation', key: 'operation' },
];

// 执行记录数据（模拟）
const getExecuteRecords = () => [
  {
    key: '1',
    algorithmName: '神经网络',
    status: '成功',
    scheduleTime: '2023-06-01 10:00',
    startTime: '2023-06-01 10:05',
    endTime: '2023-06-01 12:30',
    duration: '2小时25分',
  },
  {
    key: '2',
    algorithmName: '随机森林',
    status: '失败',
    scheduleTime: '2023-06-02 14:00',
    startTime: '2023-06-02 14:05',
    endTime: '2023-06-02 14:45',
    duration: '40分钟',
  },
  {
    key: '3',
    algorithmName: '支持向量机',
    status: '运行中',
    scheduleTime: '2023-06-03 09:00',
    startTime: '2023-06-03 09:05',
    endTime: '-',
    duration: '1小时15分',
  },
];

// 执行任务函数
const handleExecute = async (record: DataItem) => {
  try {
    // 显示执行中状态
    record.status = '执行中';
    console.log('执行任务:', record.uid, tenantUid.value, userId.value);
    // 传递三个参数：任务UID、租户UID、用户ID
    const response = await TrainTaskStart(
      record.uid,
      tenantUid.value,
      userId.value, // 传递用户ID
    );

    // 处理API响应
    if (response && response.success) {
      message.success(`任务 ${record.name} 开始执行`);
      // 更新任务状态为执行中
      record.status = '执行中';

      // 可以添加轮询逻辑检查任务状态
      // pollTaskStatus(record.uid);
    } else {
      message.error(response?.message || '任务启动失败');
      record.status = '失败';
    }
  } catch (error) {
    console.error('执行任务出错:', error);
    message.error('任务执行失败');
    record.status = '失败';
  }
};
</script>

<template>
  <Card class="p-4 shadow">
    <div class="search-container flex items-center">
      <span class="search-label mr-2">任务名称：</span>
      <Input
        v-model:value="searchName"
        placeholder="搜索任务名称"
        style="width: 200px; margin-right: 16px"
        @press-enter="fetchData"
      />

      <span class="search-label mr-2">任务类型：</span>
      <Select
        v-model:value="searchType"
        placeholder="选择任务类型"
        style="width: 200px"
        allow-clear
      >
        <Select-Option
          v-for="platform in platformOptions"
          :key="platform"
          :value="platform"
        >
          {{ platform }}
        </Select-Option>
      </Select>

      <Button type="primary" @click="fetchData" style="margin-left: 16px">
        搜索
      </Button>
    </div>
  </Card>
  <Card class="p-4 shadow">
    <div class="mb-4 flex w-full justify-between">
      <div>
        <Button type="primary" @click="handleAdd"> 新增任务 </Button>
        <Button
          type="primary"
          danger
          :disabled="!hasSelected"
          :loading="state.loading"
          @click="handleBatchDelete"
          style="margin-left: 8px"
        >
          批量删除
        </Button>
        <span style="margin-left: 8px">
          <template v-if="hasSelected">
            {{ `已选择 ${state.selectedRowKeys.length} 项` }}
          </template>
        </span>
      </div>
    </div>

    <Table
      :columns="columns"
      :row-selection="{
        selectedRowKeys: state.selectedRowKeys,
        onChange: onSelectChange,
      }"
      row-key="key"
      :data-source="filteredData"
      class="custom-table"
      bordered
      :loading="loading"
      :pagination="pagination"
      @change="fetchData"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <a @click="handleNameClick(record)">{{ record.name }}</a>
        </template>
        <template v-if="column.key === 'operation'">
          <Button type="link" size="small" @click="handleExecute(record)">
            执行
          </Button>
          <span class="divider"></span>
          <Button type="link" size="small">编辑</Button>
          <span class="divider"></span>
          <Dropdown :overlay="createMoreMenu(record)">
            <Button type="link" size="small">更多</Button>
          </Dropdown>
        </template>
      </template>
      <template #expandedRowRender="{ record }">
        <Tabs
          :active-key="record.tabActiveKey"
          @update:active-key="(key) => (record.tabActiveKey = key)"
        >
          <TabPane key="1" tab="任务详情">
            <div class="section-divider">
              <div class="divider-line"></div>
              <div class="divider-title">任务基础信息</div>
              <div class="divider-line"></div>
            </div>
            <Descriptions bordered :column="2" class="equal-columns mb-6">
              <Descriptions.Item label="任务名称" class="label-width">
                {{ record.detail?.taskStep1.taskName || '未命名' }}
              </Descriptions.Item>
              <Descriptions.Item label="任务类型" class="label-width">
                {{ record.detail?.taskStep1.taskType || '未知类型' }}
              </Descriptions.Item>
              <Descriptions.Item label="加密方式" class="label-width">
                {{ record.detail?.taskStep1.encryption || '无' }}
              </Descriptions.Item>
              <Descriptions.Item label="任务区域" class="label-width">
                {{ record.detail?.taskStep1.taskZone || '默认区域' }}
              </Descriptions.Item>
              <Descriptions.Item label="Pod类型" class="label-width">
                {{ record.detail?.taskStep1.podType || '标准' }}
              </Descriptions.Item>
              <Descriptions.Item label="资源类型" class="label-width">
                {{ record.detail?.taskStep1.resources || '默认资源' }}
              </Descriptions.Item>
              <Descriptions.Item label="训练类型" class="label-width">
                {{ record.detail?.taskStep1.trainType || '训练' }}
              </Descriptions.Item>
              <Descriptions.Item label="镜像" class="label-width">
                {{ record.detail?.taskStep1.image || '无' }}
              </Descriptions.Item>
              <Descriptions.Item label="描述" :span="2" class="label-width">
                {{ record.detail?.taskStep1.describe || '无描述' }}
              </Descriptions.Item>
            </Descriptions>

            <div class="section-divider">
              <div class="divider-line"></div>
              <div class="divider-title">算法与数据</div>
              <div class="divider-line"></div>
            </div>
            <Descriptions bordered :column="2" class="equal-columns mb-6">
              <Descriptions.Item label="算法名称" class="label-width">
                {{ record.detail?.taskStep2.algorithmName || '未知算法' }}
              </Descriptions.Item>
              <Descriptions.Item label="算法版本" class="label-width">
                {{ record.detail?.taskStep2.algorithmVersion || '未知版本' }}
              </Descriptions.Item>
              <Descriptions.Item label="任务入口" class="label-width">
                {{ record.detail?.taskStep2.taskroute || '无' }}
              </Descriptions.Item>
              <Descriptions.Item label="数据集" :span="2" class="label-width">
                <div
                  v-for="(dataset, index) in record.detail?.taskStep2.datasets"
                  :key="index"
                >
                  {{ dataset.selectedName }} ({{ dataset.name }})
                </div>
                <div v-if="!record.detail?.taskStep2.datasets?.length">
                  未配置数据集
                </div>
              </Descriptions.Item>
            </Descriptions>

            <div class="section-divider">
              <div class="divider-line"></div>
              <div class="divider-title">训练配置</div>
              <div class="divider-line"></div>
            </div>
            <Descriptions bordered :column="2" class="equal-columns mb-6">
              <Descriptions.Item
                label="自定义变量"
                :span="2"
                class="label-width"
              >
                <div
                  v-for="(variable, index) in record.detail?.taskStep3
                    .customVariables"
                  :key="index"
                >
                  {{ variable.name }} = {{ variable.value }}
                </div>
                <div v-if="!record.detail?.taskStep3.customVariables?.length">
                  未配置自定义变量
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="训练配置格式" class="label-width">
                {{ record.detail?.taskStep3.trainConfig.format || '无' }}
              </Descriptions.Item>
              <Descriptions.Item
                label="训练配置内容"
                :span="2"
                class="label-width"
              >
                <pre>{{
                  record.detail?.taskStep3.trainConfig.content || '无配置内容'
                }}</pre>
              </Descriptions.Item>
            </Descriptions>

            <div class="section-divider">
              <div class="divider-line"></div>
              <div class="divider-title">调度配置</div>
              <div class="divider-line"></div>
            </div>
            <Descriptions bordered :column="2" class="equal-columns mb-6">
              <Descriptions.Item label="调度类型" class="label-width">
                {{
                  record.detail?.taskStep4.scheduleConfig.intervalType || '无'
                }}
              </Descriptions.Item>
              <Descriptions.Item label="间隔时间" class="label-width">
                {{
                  record.detail?.taskStep4.scheduleConfig.intervalDuration ||
                  '0'
                }}
                {{
                  record.detail?.taskStep4.scheduleConfig.intervalUnit || '无'
                }}
              </Descriptions.Item>
              <Descriptions.Item label="激活状态" class="label-width">
                {{
                  record.detail?.taskStep4.scheduleConfig.isActive ? '是' : '否'
                }}
              </Descriptions.Item>
            </Descriptions>

            <div class="section-divider">
              <div class="divider-line"></div>
              <div class="divider-title">输出配置</div>
              <div class="divider-line"></div>
            </div>
            <Descriptions bordered :column="2" class="equal-columns mb-6">
              <Descriptions.Item label="输出路径" class="label-width">
                {{
                  record.detail?.taskStep4.outputConfig.outputPath || '未配置'
                }}
              </Descriptions.Item>
              <Descriptions.Item label="输出类型" class="label-width">
                {{
                  record.detail?.taskStep4.outputConfig.outputType || '未配置'
                }}
              </Descriptions.Item>
              <Descriptions.Item label="自动发布" class="label-width">
                {{
                  record.detail?.taskStep4.outputConfig.autoPublish
                    ? '是'
                    : '否'
                }}
              </Descriptions.Item>
              <Descriptions.Item label="激活状态" class="label-width">
                {{
                  record.detail?.taskStep4.outputConfig.isActive ? '是' : '否'
                }}
              </Descriptions.Item>
            </Descriptions>

            <div class="section-divider">
              <div class="divider-line"></div>
              <div class="divider-title">通知配置</div>
              <div class="divider-line"></div>
            </div>
            <Descriptions bordered :column="2" class="equal-columns">
              <Descriptions.Item label="通知标题" class="label-width">
                {{
                  record.detail?.taskStep4.notificationConfig
                    .notificationTitle || '无'
                }}
              </Descriptions.Item>
              <Descriptions.Item label="通知内容" class="label-width">
                {{
                  record.detail?.taskStep4.notificationConfig
                    .notificationContent || '无'
                }}
              </Descriptions.Item>
              <Descriptions.Item label="通知用户ID" class="label-width">
                {{
                  record.detail?.taskStep4.notificationConfig
                    .notificationUserID || '无'
                }}
              </Descriptions.Item>
              <Descriptions.Item label="激活状态" class="label-width">
                {{
                  record.detail?.taskStep4.notificationConfig.isActive
                    ? '是'
                    : '否'
                }}
              </Descriptions.Item>
            </Descriptions>
          </TabPane>

          <TabPane key="2" tab="执行记录">
            <Table
              :columns="executeRecordColumns"
              :data-source="getExecuteRecords()"
              :pagination="false"
            >
              <template #bodyCell="{ column, record: innerRecord }">
                <template v-if="column.key === 'status'">
                  <span v-if="innerRecord.status === '成功'">
                    <Badge status="success" />
                    成功
                  </span>
                  <span v-else-if="innerRecord.status === '失败'">
                    <Badge status="error" />
                    失败
                  </span>
                  <span v-else>
                    <Badge status="processing" />
                    运行中
                  </span>
                </template>
                <template v-else-if="column.key === 'operation'">
                  <span class="table-operation">
                    <Button type="link" size="small">训练详情</Button>
                    <span class="divider"></span>
                    <Button type="link" size="small">日志</Button>
                    <span class="divider"></span>
                    <Button type="link" size="small">更多</Button>
                  </span>
                </template>
              </template>
            </Table>
          </TabPane>

          <TabPane key="3" tab="执行实例">
            <Table
              :columns="executeRecordColumns"
              :data-source="getExecuteRecords()"
              :pagination="false"
            >
              <template #bodyCell="{ column, record: innerRecord }">
                <template v-if="column.key === 'status'">
                  <span v-if="innerRecord.status === '成功'">
                    <Badge status="success" />
                    成功
                  </span>
                  <span v-else-if="innerRecord.status === '失败'">
                    <Badge status="error" />
                    失败
                  </span>
                  <span v-else>
                    <Badge status="processing" />
                    运行中
                  </span>
                </template>
                <template v-else-if="column.key === 'operation'">
                  <span class="table-operation">
                    <Button type="link" size="small">取消</Button>
                    <span class="divider"></span>
                    <Button type="link" size="small">编辑</Button>
                    <span class="divider"></span>
                    <Button type="link" size="small">更多</Button>
                  </span>
                </template>
              </template>
            </Table>
          </TabPane>

          <TabPane key="4" tab="上游依赖">
            <Card class="p-4 shadow">
              <div class="upstream-dependency">
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
                  class="dependency-item mb-4 rounded border p-4"
                >
                  <div v-if="dependency.isEditing" class="edit-mode">
                    <div class="dependency-selectors mb-3 flex items-center">
                      <Select
                        v-model:value="dependency.type"
                        placeholder="请选择任务类型"
                        style="width: 200px; margin-right: 16px"
                        @change="dependency.task = ''"
                      >
                        <Select-Option
                          v-for="type in upstreamState.taskTypes"
                          :key="type"
                          :value="type"
                        >
                          {{ type }}
                        </Select-Option>
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
                              .includes(input.toLowerCase())
                        "
                      >
                        <Select-Option
                          v-for="task in getTaskOptionsForRecord(
                            dependency.type,
                          )"
                          :key="task"
                          :value="task"
                        >
                          {{ task }}
                        </Select-Option>
                      </Select>

                      <Button
                        type="link"
                        danger
                        @click="deleteDependency(record.uid, index)"
                        class="ml-4"
                      >
                        删除
                      </Button>
                    </div>

                    <div class="action-buttons">
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
                      <div class="selected-text">
                        依赖项 {{ index + 1 }}: {{ dependency.type }} -
                        {{ dependency.task }}
                      </div>
                    </div>
                    <div>
                      <Button
                        type="link"
                        danger
                        @click="deleteDependency(record.uid, index)"
                        class="delete-btn"
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
                  暂无上游依赖配置，点击"新增依赖"按钮添加
                </div>
              </div>
            </Card>
          </TabPane>

          <TabPane key="5" tab="下游任务">
            <Card class="p-4 shadow">
              <div class="downstream-tasks">
                <div
                  v-if="downstreamTasks[record.uid]?.length"
                  class="task-list"
                >
                  <div class="task-header">
                    <div class="header-item" style="width: 40%">任务名称</div>
                    <div class="header-item" style="width: 40%">任务类型</div>
                  </div>

                  <div
                    v-for="(task, index) in downstreamTasks[record.uid]"
                    :key="index"
                    class="task-item"
                  >
                    <div style="width: 40%">{{ task.name }}</div>
                    <div style="width: 40%">{{ task.type }}</div>
                  </div>
                </div>

                <div v-else class="no-tasks">
                  当前任务没有被任何下游任务依赖
                </div>
              </div>
            </Card>
          </TabPane>
        </Tabs>
      </template>
    </Table>
  </Card>
</template>
<style scoped>
.custom-table {
  border: 1px solid #e8e8e8;
  border-radius: 4px;
}

.custom-table :deep(.ant-table-thead) > tr > th {
  background-color: #f0f8ff;
  color: #2c3e50;
  font-weight: 600;
  border-bottom: 1px solid #d9d9d9 !important;
}

.custom-table :deep(.ant-table-tbody) > tr > td {
  border-right: 1px solid #e8e8e8;
}

.custom-table :deep(.ant-table-tbody) > tr > td:last-child {
  border-right: none;
}

.custom-table :deep(.ant-table-tbody) > tr:hover > td {
  background-color: #fafafa;
}

.custom-table :deep(.ant-table-tbody) a {
  color: #1890ff;
  cursor: pointer;
}

.custom-table :deep(.ant-table-tbody) a:hover {
  color: #40a9ff;
}

.mb-6 {
  margin-bottom: 1.5rem;
}

:deep(.ant-descriptions-item-label) {
  font-weight: 600;
  background-color: #fafafa;
  width: 150px;
}

pre {
  background-color: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  overflow: auto;
  max-height: 150px;
  margin: 0;
}

.section-divider {
  display: flex;
  align-items: center;
  margin: 24px 0 16px;
}

.divider-line {
  flex-grow: 1;
  height: 1px;
  background-color: #e8e8e8;
}

.divider-title {
  padding: 0 12px;
  font-weight: 600;
  color: #1890ff;
  white-space: nowrap;
}

.dependency-item {
  border: 1px solid #e8e8e8;
  background-color: #fafafa;
}

.dependency-selectors {
  display: flex;
  margin-bottom: 16px;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
}

.selected-info {
  padding: 12px 16px;
  background-color: #f0f8ff;
  border: 1px solid #91d5ff;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.selected-text {
  font-weight: 500;
}

.delete-btn {
  color: #ff4d4f;
  padding: 0;
}

.confirmed-mode,
.edit-mode {
  transition: all 0.3s ease;
}

.no-dependencies {
  border: 1px dashed #d9d9d9;
  border-radius: 4px;
  padding: 20px;
  text-align: center;
  color: #999;
}

.upstream-dependency {
  padding: 16px;
}

.downstream-tasks {
  padding: 16px;
}

.task-header {
  display: flex;
  padding: 8px 12px;
  background-color: #f0f8ff;
  border-bottom: 1px solid #91d5ff;
  font-weight: 600;
}

.task-item {
  display: flex;
  padding: 12px;
  border-bottom: 1px solid #e8e8e8;
}

.task-item:hover {
  background-color: #fafafa;
}

.no-tasks {
  padding: 24px;
  text-align: center;
  color: #999;
  font-size: 16px;
}

.divider {
  display: inline-block;
  width: 1px;
  height: 14px;
  margin: 0 8px;
  background-color: #e8e8e8;
  vertical-align: middle;
}

.table-operation {
  display: flex;
  align-items: center;
}

/* 确保空内容可见 */
:deep(.ant-descriptions-item-content) {
  min-height: 24px;
}
</style>
