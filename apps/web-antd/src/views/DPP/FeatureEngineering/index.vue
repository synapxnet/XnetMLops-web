<script lang="ts" setup>
import BusinessPage from '#/components/workspace/BusinessPage.vue';
import type { FeatureEngineering, FeatureTaskInfo } from '../../SMP/api/featureEngineering';

import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  HistoryOutlined,
  LoadingOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  ScheduleOutlined,
  SettingOutlined,
  StopOutlined,
  SyncOutlined,
} from '@ant-design/icons-vue';
import {
  Alert,
  Button,
  Card,
  Drawer,
  message,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Timeline,
  Tooltip,
} from 'ant-design-vue';

import {
  deleteFeatureEngineering,
  executeFeatureEngineering,
  fetchFeatureEngineeringList,
  getFeatureBuildStatus,
  getFeatureExecutionHistory,
  stopFeatureBuild,
} from '../../SMP/api/featureEngineering';

const router = useRouter();
const loading = ref(false);
const loadError = ref('');
const featureList = ref<FeatureEngineering[]>([]);

// 执行历史相关
const historyDrawerVisible = ref(false);
const historyLoading = ref(false);
const executionHistory = ref<FeatureTaskInfo[]>([]);
const currentFeatureName = ref('');

// 状态轮询
const statusPollingMap = ref<Map<number, ReturnType<typeof setInterval>>>(new Map());

// 表格列定义
const columns = [
  { title: '名称', dataIndex: 'name', key: 'name', width: 180 },
  { title: '算子', dataIndex: 'operatorName', key: 'operatorName', width: 120 },
  { title: '数据源', dataIndex: 'datasourceName', key: 'datasourceName', width: 120 },
  { title: '数据表', dataIndex: 'tableName', key: 'tableName', width: 150 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '构建状态', dataIndex: 'lastBuildStatus', key: 'lastBuildStatus', width: 100 },
  { title: '调度', dataIndex: 'scheduleActive', key: 'scheduleActive', width: 80 },
  { title: '团队', dataIndex: 'teamName', key: 'teamName', width: 100 },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 160 },
  { title: '操作', key: 'action', width: 320, fixed: 'right' },
];

// 状态颜色映射
const statusColors: Record<string, string> = {
  draft: 'default',
  processing: 'processing',
  completed: 'success',
  failed: 'error',
  stopped: 'warning',
};

const statusLabels: Record<string, string> = {
  draft: '草稿',
  processing: '处理中',
  completed: '已完成',
  failed: '失败',
  stopped: '已停止',
};

// 构建状态颜色映射
const buildStatusColors: Record<string, string> = {
  QUEUED: 'processing',
  IN_PROGRESS: 'processing',
  SUCCESS: 'success',
  FAILURE: 'error',
  ABORTED: 'warning',
  TIMEOUT: 'warning',
  ERROR: 'error',
};

const buildStatusLabels: Record<string, string> = {
  QUEUED: '排队中',
  IN_PROGRESS: '执行中',
  SUCCESS: '成功',
  FAILURE: '失败',
  ABORTED: '已中止',
  TIMEOUT: '超时',
  ERROR: '错误',
};

// 获取构建状态图标
const getBuildStatusIcon = (status: string) => {
  switch (status) {
    case 'QUEUED':
      return ClockCircleOutlined;
    case 'IN_PROGRESS':
      return LoadingOutlined;
    case 'SUCCESS':
      return CheckCircleOutlined;
    case 'FAILURE':
    case 'ERROR':
      return CloseCircleOutlined;
    case 'ABORTED':
    case 'TIMEOUT':
      return PauseCircleOutlined;
    default:
      return ClockCircleOutlined;
  }
};

/** 区分读取失败与真实空列表，重试完成后才展示任务。Distinguish failed reads from genuine empty lists and render tasks after retry completes. */
const loadFeatureList = async () => {
  if (loading.value) return;
  loading.value = true;
  loadError.value = '';
  stopAllPolling();
  try {
    const result = await fetchFeatureEngineeringList();
    if (!Array.isArray(result)) throw new Error('特征工程列表响应格式无效');
    featureList.value = result;
    // 为处理中的任务启动状态轮询
    featureList.value.forEach((item) => {
      if (item.status === 'processing' && item.id) {
        startStatusPolling(item.id);
      }
    });
  } catch (error) {
    featureList.value = [];
    loadError.value = error instanceof Error ? error.message : '服务暂不可用，请重试。';
    console.error('加载特征工程列表失败:', error);
  } finally {
    loading.value = false;
  }
};

// 启动状态轮询
const startStatusPolling = (id: number) => {
  // 避免重复轮询
  if (statusPollingMap.value.has(id)) return;

  const intervalId = setInterval(async () => {
    try {
      const status = await getFeatureBuildStatus(id);
      // 更新列表中的状态
      const item = featureList.value.find((f) => f.id === id);
      if (item) {
        item.status = status.status;
        item.lastBuildStatus = status.lastBuildStatus;
      }
      // 如果不再是处理中状态，停止轮询
      if (status.status !== 'processing') {
        stopStatusPolling(id);
      }
    } catch (error) {
      console.error('获取状态失败:', error);
    }
  }, 5000); // 每5秒轮询一次

  statusPollingMap.value.set(id, intervalId);
};

// 停止状态轮询
const stopStatusPolling = (id: number) => {
  const intervalId = statusPollingMap.value.get(id);
  if (intervalId) {
    clearInterval(intervalId);
    statusPollingMap.value.delete(id);
  }
};

// 停止所有轮询
const stopAllPolling = () => {
  statusPollingMap.value.forEach((intervalId) => {
    clearInterval(intervalId);
  });
  statusPollingMap.value.clear();
};

// 新建特征工程
const handleAdd = () => {
  router.push('/DPP/feature-engineering/create');
};

// 编辑特征工程
const handleEdit = (record: FeatureEngineering) => {
  router.push(`/DPP/feature-engineering/edit/${record.id}`);
};

// 删除特征工程
const handleDelete = async (id: number) => {
  try {
    stopStatusPolling(id);
    await deleteFeatureEngineering(id);
    message.success('删除成功');
    await loadFeatureList();
  } catch (error) {
    console.error('删除失败:', error);
    message.error('删除失败');
  }
};

// 执行特征工程
const handleExecute = async (record: FeatureEngineering) => {
  if (!record.id) return;

  // 检查是否已配置镜像
  if (!record.imageName) {
    Modal.confirm({
      title: '未配置镜像',
      content: '该特征工程任务尚未配置执行镜像，是否前往编辑页面配置？',
      okText: '去配置',
      cancelText: '取消',
      onOk: () => {
        router.push(`/DPP/feature-engineering/edit/${record.id}`);
      },
    });
    return;
  }

  try {
    message.loading({ content: '正在提交任务...', key: 'execute' });
    const result = await executeFeatureEngineering(record.id);
    message.success({ content: '任务已提交，开始执行', key: 'execute' });

    // 更新本地状态
    record.status = 'processing';
    record.lastBuildStatus = 'QUEUED';
    record.jobUid = result.jobPath;

    // 启动状态轮询
    startStatusPolling(record.id);
  } catch (error: any) {
    console.error('执行失败:', error);
    message.error({ content: error?.message || '执行失败', key: 'execute' });
  }
};

// 停止构建
const handleStop = async (record: FeatureEngineering) => {
  if (!record.id) return;

  try {
    message.loading({ content: '正在停止任务...', key: 'stop' });
    const result = await stopFeatureBuild(record.id);
    if (result.stopped) {
      message.success({ content: '任务已停止', key: 'stop' });
      record.status = 'stopped';
      record.lastBuildStatus = 'ABORTED';
      stopStatusPolling(record.id);
    } else {
      message.warning({ content: '停止任务失败', key: 'stop' });
    }
  } catch (error: any) {
    console.error('停止失败:', error);
    message.error({ content: error?.message || '停止失败', key: 'stop' });
  }
};

// 查看执行历史
const handleViewHistory = async (record: FeatureEngineering) => {
  if (!record.id) return;

  currentFeatureName.value = record.name;
  historyDrawerVisible.value = true;
  historyLoading.value = true;

  try {
    executionHistory.value = await getFeatureExecutionHistory(record.id);
  } catch (error) {
    console.error('加载执行历史失败:', error);
    message.error('加载执行历史失败');
  } finally {
    historyLoading.value = false;
  }
};

// 格式化时间
const formatTime = (time: string | undefined) => {
  if (!time) return '-';
  return new Date(time).toLocaleString();
};

// 获取历史记录图标颜色
const getHistoryDotColor = (status: string) => {
  switch (status) {
    case 'SUCCESS':
      return 'green';
    case 'FAILURE':
    case 'ERROR':
      return 'red';
    case 'IN_PROGRESS':
    case 'QUEUED':
      return 'blue';
    default:
      return 'gray';
  }
};

onMounted(() => {
  loadFeatureList();
});

onUnmounted(() => {
  stopAllPolling();
});
</script>

<template>
  <BusinessPage domain="数据准备" description="从数据集、特征到知识库，组织好训练与检索所需的数据。">
  <Card class="p-4 shadow">
    <div class="mb-4 flex justify-between items-center">
      <div class="flex items-center">
        <SettingOutlined class="text-2xl mr-2 text-blue-500" />
        <span class="text-lg font-semibold">特征工程</span>
      </div>
      <div class="flex gap-2">
        <Button @click="loadFeatureList" :loading="loading">
          <ReloadOutlined /> 刷新
        </Button>
        <Button type="primary" @click="handleAdd">
          <PlusOutlined /> 新建特征工程
        </Button>
      </div>
    </div>

    <Alert
      v-if="loadError"
      role="alert"
      type="error"
      show-icon
      message="特征工程任务读取失败"
      :description="loadError"
    >
      <template #action>
        <Button :loading="loading" @click="loadFeatureList">重试读取</Button>
      </template>
    </Alert>
    <Table
      v-else
      :columns="columns"
      :data-source="featureList"
      :loading="loading"
      row-key="id"
      bordered
      :scroll="{ x: 1500 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <a @click="handleEdit(record)" class="text-blue-500 cursor-pointer font-medium">
            {{ record.name }}
          </a>
          <div v-if="record.description" class="text-gray-400 text-xs truncate max-w-[160px]">
            {{ record.description }}
          </div>
        </template>

        <template v-else-if="column.key === 'operatorName'">
          <Tag v-if="record.operatorName" color="purple">
            {{ record.operatorName }}
          </Tag>
          <span v-else class="text-gray-400">-</span>
        </template>

        <template v-else-if="column.key === 'status'">
          <Tag :color="statusColors[record.status] || 'default'">
            <template v-if="record.status === 'processing'">
              <SyncOutlined spin class="mr-1" />
            </template>
            {{ statusLabels[record.status] || record.status }}
          </Tag>
        </template>

        <template v-else-if="column.key === 'lastBuildStatus'">
          <template v-if="record.lastBuildStatus">
            <Tag :color="buildStatusColors[record.lastBuildStatus] || 'default'">
              <component :is="getBuildStatusIcon(record.lastBuildStatus)"
                :spin="record.lastBuildStatus === 'IN_PROGRESS'"
                class="mr-1" />
              {{ buildStatusLabels[record.lastBuildStatus] || record.lastBuildStatus }}
            </Tag>
          </template>
          <span v-else class="text-gray-400">-</span>
        </template>

        <template v-else-if="column.key === 'scheduleActive'">
          <Tag v-if="record.scheduleActive" color="green">
            <ScheduleOutlined class="mr-1" /> 已启用
          </Tag>
          <Tag v-else color="default">未启用</Tag>
        </template>

        <template v-else-if="column.key === 'createdAt'">
          {{ formatTime(record.createdAt) }}
        </template>

        <template v-else-if="column.key === 'action'">
          <Space>
            <Tooltip title="编辑">
              <Button type="link" size="small" @click="handleEdit(record)">
                <EditOutlined />
              </Button>
            </Tooltip>

            <Tooltip v-if="record.status === 'processing'" title="停止执行">
              <Button type="link" size="small" danger @click="handleStop(record)">
                <StopOutlined />
              </Button>
            </Tooltip>
            <Tooltip v-else title="执行">
              <Button
                type="link"
                size="small"
                @click="handleExecute(record)"
                :disabled="!record.operatorId"
              >
                <PlayCircleOutlined />
              </Button>
            </Tooltip>

            <Tooltip title="执行历史">
              <Button type="link" size="small" @click="handleViewHistory(record)">
                <HistoryOutlined />
              </Button>
            </Tooltip>

            <Popconfirm
              title="确定要删除这个特征工程吗？"
              description="删除后相关的Jenkins任务和执行记录也将被清除"
              @confirm="handleDelete(record.id)"
            >
              <Tooltip title="删除">
                <Button type="link" size="small" danger>
                  <DeleteOutlined />
                </Button>
              </Tooltip>
            </Popconfirm>
          </Space>
        </template>
      </template>

      <template #emptyText>
        <div v-if="loading" role="status" class="py-8 text-center text-gray-500">正在读取特征工程任务…</div>
        <div v-else class="py-8 text-center text-gray-500">
          <SettingOutlined class="text-4xl mb-2" />
          <p>暂无特征工程任务</p>
          <Button type="primary" size="small" @click="handleAdd" class="mt-2">
            <PlusOutlined /> 创建第一个特征工程
          </Button>
        </div>
      </template>
    </Table>

    <!-- 执行历史抽屉 -->
    <Drawer
      v-model:open="historyDrawerVisible"
      :title="`执行历史 - ${currentFeatureName}`"
      width="500"
      placement="right"
    >
      <div v-if="historyLoading" class="text-center py-8">
        <LoadingOutlined class="text-2xl text-blue-500" spin />
        <p class="mt-2 text-gray-500">加载中...</p>
      </div>

      <div v-else-if="executionHistory.length === 0" class="text-center py-8 text-gray-500">
        <HistoryOutlined class="text-4xl mb-2" />
        <p>暂无执行记录</p>
      </div>

      <Timeline v-else>
        <Timeline.Item
          v-for="item in executionHistory"
          :key="item.id"
          :color="getHistoryDotColor(item.jobStatus || '')"
        >
          <div class="history-item">
            <div class="flex items-center justify-between mb-1">
              <Tag :color="buildStatusColors[item.jobStatus || ''] || 'default'">
                {{ buildStatusLabels[item.jobStatus || ''] || item.jobStatus || '未知' }}
              </Tag>
              <Tag v-if="item.scheduleActive === 1" color="blue" size="small">
                <ScheduleOutlined /> 调度
              </Tag>
              <Tag v-else color="default" size="small">手动</Tag>
            </div>
            <div class="text-xs text-gray-500">
              <div>开始: {{ formatTime(item.startAt) }}</div>
              <div v-if="item.endAt">结束: {{ formatTime(item.endAt) }}</div>
            </div>
          </div>
        </Timeline.Item>
      </Timeline>
    </Drawer>
  </Card>

  </BusinessPage>
</template>

<style scoped>
:deep(.ant-table-thead > tr > th) {
  font-weight: 600;
}

.history-item {
  padding: 8px 0;
}
</style>
