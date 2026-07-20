<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  Button,
  Card,
  message,
  Popconfirm,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  fetchWorkflowById,
  fetchWorkflowExecutions,
  stopExecution,
} from '../api/workflow';

import type { Workflow, WorkflowExecution } from '../api/types';

const router = useRouter();
const route = useRoute();

// 数据
const workflow = ref<Workflow | null>(null);
const executions = ref<WorkflowExecution[]>([]);
const loading = ref(false);
const workflowId = ref<number>(0);

// 表格列定义
const columns = [
  { title: '执行ID', dataIndex: 'uid', key: 'uid', width: 280 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 120 },
  { title: '触发方式', dataIndex: 'triggerType', key: 'triggerType', width: 100 },
  { title: '触发者', dataIndex: 'triggeredBy', key: 'triggeredBy', width: 120 },
  { title: '开始时间', dataIndex: 'startedAt', key: 'startedAt', width: 180 },
  { title: '结束时间', dataIndex: 'finishedAt', key: 'finishedAt', width: 180 },
  { title: '耗时', dataIndex: 'elapsedTime', key: 'elapsedTime', width: 100 },
  { title: '操作', key: 'action', width: 150 },
];

// 加载数据
const loadData = async () => {
  const id = route.query.workflowId;
  if (!id) {
    message.error('缺少工作流ID');
    router.push({ path: '/XAA/workflow/index' });
    return;
  }

  workflowId.value = Number(id);
  loading.value = true;

  try {
    workflow.value = await fetchWorkflowById(workflowId.value);
    executions.value = await fetchWorkflowExecutions(workflowId.value);
  } catch (error) {
    console.error('加载执行记录失败:', error);
    message.error('加载执行记录失败');
  } finally {
    loading.value = false;
  }
};

// 获取状态颜色
const getStatusColor = (status: string) => {
  switch (status) {
    case 'scheduled':
      return 'default';
    case 'running':
      return 'processing';
    case 'succeeded':
      return 'success';
    case 'failed':
      return 'error';
    case 'stopped':
      return 'warning';
    case 'paused':
      return 'orange';
    default:
      return 'default';
  }
};

// 获取状态文本
const getStatusText = (status: string) => {
  switch (status) {
    case 'scheduled':
      return '已调度';
    case 'running':
      return '运行中';
    case 'succeeded':
      return '成功';
    case 'failed':
      return '失败';
    case 'stopped':
      return '已停止';
    case 'paused':
      return '已暂停';
    default:
      return status;
  }
};

// 获取触发方式文本
const getTriggerTypeText = (type: string) => {
  switch (type) {
    case 'manual':
      return '手动';
    case 'scheduled':
      return '定时';
    case 'api':
      return 'API';
    default:
      return type;
  }
};

// 格式化时间
const formatTime = (timeStr: string) => {
  if (!timeStr) return '-';
  return new Date(timeStr).toLocaleString();
};

// 格式化耗时
const formatElapsedTime = (ms: number) => {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
};

// 查看详情
const handleViewDetail = (record: WorkflowExecution) => {
  router.push({
    path: '/XAA/workflow/execution-detail',
    query: { id: record.id },
  });
};

// 停止执行
const handleStop = async (record: WorkflowExecution) => {
  try {
    await stopExecution(record.id);
    message.success('执行已停止');
    await loadData();
  } catch (error) {
    console.error('停止执行失败:', error);
    message.error('停止执行失败');
  }
};

// 返回
const handleBack = () => {
  router.push({ path: '/XAA/workflow/index' });
};

onMounted(() => {
  loadData();
});
</script>

<template>
  <Card class="p-4 shadow">
    <template #title>
      <div class="flex items-center">
        <Button @click="handleBack" style="margin-right: 16px;">返回</Button>
        <span>{{ workflow?.name }} - 执行记录</span>
      </div>
    </template>

    <Table
      :columns="columns"
      :data-source="executions"
      :loading="loading"
      row-key="id"
      bordered
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'uid'">
          <a @click="handleViewDetail(record)">{{ record.uid }}</a>
        </template>

        <template v-else-if="column.key === 'status'">
          <Tag :color="getStatusColor(record.status)">
            {{ getStatusText(record.status) }}
          </Tag>
        </template>

        <template v-else-if="column.key === 'triggerType'">
          {{ getTriggerTypeText(record.triggerType) }}
        </template>

        <template v-else-if="column.key === 'startedAt'">
          {{ formatTime(record.startedAt) }}
        </template>

        <template v-else-if="column.key === 'finishedAt'">
          {{ formatTime(record.finishedAt) }}
        </template>

        <template v-else-if="column.key === 'elapsedTime'">
          {{ formatElapsedTime(record.elapsedTime) }}
        </template>

        <template v-else-if="column.key === 'action'">
          <Button type="link" size="small" @click="handleViewDetail(record)">
            详情
          </Button>
          <Popconfirm
            v-if="['scheduled', 'running', 'paused'].includes(record.status)"
            title="确定停止该执行吗？"
            ok-text="确定"
            cancel-text="取消"
            @confirm="handleStop(record)"
          >
            <Button type="link" size="small" danger>
              停止
            </Button>
          </Popconfirm>
        </template>
      </template>
    </Table>
  </Card>
</template>

<style scoped>
a {
  color: var(--ant-color-primary);
  cursor: pointer;
}
a:hover {
  color: var(--ant-color-primary-hover);
}
</style>
