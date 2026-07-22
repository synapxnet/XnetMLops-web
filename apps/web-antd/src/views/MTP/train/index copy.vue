<script lang="ts" setup>
import type { Ref } from 'vue';

import { computed, h, inject, onMounted, reactive, ref } from 'vue';
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
  Select,
  Table,
  TabPane,
  Tabs,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import {
  deleteTrainTask,
  fetchAllTrainTasks,
  fetchTrainTaskDetail,
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
      };

      const statusInfo = statusMap[record.status] || {
        color: 'default',
        text: record.status,
      };

      return h(Tag, { color: statusInfo.color }, () => statusInfo.text);
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
        name: ds.name || '未知数据集',
        selectedName: ds.selectedName || ds.name || '未知',
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
      datasets,
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
const tenantUid = computed(() => currentUserInfo.value?.tenantUid || '');
const userId = computed(() => currentUserInfo.value?.userId || '');

// 搜索相关逻辑
const searchName = ref('');
const searchType = ref('');
const searchStatus = ref('');

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
    return nameMatch && typeMatch && statusMatch;
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
        status: task.status || 'pending',
        creator: task.userId || '未知',
        updated_at: task.updated_at,
        description: task.description || '暂无描述',
        createdAt: task.created_at,
        tabActiveKey: '1', // 默认打开第一个标签页
        detail: mapTaskDetail(task),
      }));

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
            key: 'edit',
            onClick: () =>
              router.push({
                path: '/MTP/train/task',
                query: { id: record.uid },
              }),
          },
          '编辑',
        ),
        h(
          Menu.Item,
          {
            key: 'view',
            onClick: () => handleViewDetail(record.uid),
          },
          '查看详情',
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

// 执行记录表格列定义
const executeRecordColumns = [
  { title: '执行ID', dataIndex: 'id', key: 'id' },
  { title: '算法名称', dataIndex: 'algorithmName', key: 'algorithmName' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '开始时间', dataIndex: 'startTime', key: 'startTime' },
  { title: '结束时间', dataIndex: 'endTime', key: 'endTime' },
  { title: '执行时间', dataIndex: 'duration', key: 'duration' },
  { title: '操作', dataIndex: 'operation', key: 'operation' },
];

// 获取任务详情
const handleViewDetail = async (uid: string) => {
  try {
    const response = await fetchTrainTaskDetail(uid, tenantUid.value);
    if (response) {
      const task = response.data;
      router.push({
        path: '/MTP/train/task-detail',
        query: { id: task.uid },
      });
    }
  } catch {
    message.error('获取任务详情失败');
  }
};

// 执行任务函数
const handleExecute = async (record: DataItem) => {
  try {
    // 保存原始状态
    const originalStatus = record.status;

    // 更新为执行中状态
    record.status = 'running';

    // 执行任务
    const response = await TrainTaskStart(
      record.uid,
      tenantUid.value,
      userId.value,
    );

    // 处理API响应
    if (response) {
      message.success(`任务 ${record.name} 开始执行`);

      // 更新任务状态
      record.status = 'running';

      // 可以添加轮询逻辑检查任务状态
      // pollTaskStatus(record.uid);
    } else {
      message.error(response?.message || '任务启动失败');
      record.status = originalStatus;
    }
  } catch (error) {
    console.error('执行任务出错:', error);
    message.error('任务执行失败');
    record.status = 'failed';
  }
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
      <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
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
            <Select-Option
              v-for="platform in platformOptions"
              :key="platform"
              :value="platform"
            >
              {{ platform }}
            </Select-Option>
          </Select>
        </div>

        <div>
          <label class="mb-2 block font-medium">任务状态</label>
          <Select
            v-model:value="searchStatus"
            placeholder="选择任务状态"
            allow-clear
          >
            <Select-Option
              v-for="status in statusOptions"
              :key="status.value"
              :value="status.value"
            >
              {{ status.label }}
            </Select-Option>
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
                              {{ dataset.selectedName }} ({{ dataset.name }})
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
                          }}</pre>
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>

                  <!-- 输出与调度 -->
                  <Card title="输出与调度" class="h-full">
                    <Descriptions layout="vertical" bordered>
                      <Descriptions.Item label="调度类型">
                        {{
                          record.detail?.taskStep4.scheduleConfig
                            .intervalType || '无'
                        }}
                      </Descriptions.Item>
                      <Descriptions.Item label="间隔时间">
                        {{
                          record.detail?.taskStep4.scheduleConfig
                            .intervalDuration || '0'
                        }}
                        {{
                          record.detail?.taskStep4.scheduleConfig
                            .intervalUnit || '无'
                        }}
                      </Descriptions.Item>
                      <Descriptions.Item label="激活状态">
                        <Tag
                          :color="
                            record.detail?.taskStep4.scheduleConfig.isActive
                              ? 'green'
                              : 'red'
                          "
                        >
                          {{
                            record.detail?.taskStep4.scheduleConfig.isActive
                              ? '已激活'
                              : '未激活'
                          }}
                        </Tag>
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
                <Table
                  :columns="executeRecordColumns"
                  :data-source="[]"
                  :pagination="false"
                >
                  <template #emptyText>
                    <Empty description="暂无执行记录" />
                  </template>
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
  background-color: hsl(var(--muted));
  border: 1px solid hsl(var(--border));
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
  color: hsl(var(--muted-foreground));
}

:deep(.ant-card-head) {
  background-color: hsl(var(--muted));
}
</style>
