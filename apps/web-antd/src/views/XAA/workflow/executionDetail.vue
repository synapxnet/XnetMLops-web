<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  message,
  Table,
  Tag,
  Timeline,
  TimelineItem,
} from 'ant-design-vue';

import {
  fetchExecutionById,
  fetchNodeExecutions,
  stopExecution,
} from '../api/workflow';

import type { NodeExecution, WorkflowExecution } from '../api/types';

const router = useRouter();
const route = useRoute();

// 数据
const execution = ref<WorkflowExecution | null>(null);
const nodeExecutions = ref<NodeExecution[]>([]);
const loading = ref(false);
const executionId = ref<number>(0);

// 表格列定义
const columns = [
  { title: '节点', dataIndex: 'nodeTitle', key: 'nodeTitle' },
  { title: '类型', dataIndex: 'nodeType', key: 'nodeType', width: 120 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '开始时间', dataIndex: 'startedAt', key: 'startedAt', width: 180 },
  { title: '耗时', dataIndex: 'elapsedTime', key: 'elapsedTime', width: 100 },
  { title: '错误信息', dataIndex: 'errorMessage', key: 'errorMessage', ellipsis: true },
];

// 加载数据
const loadData = async () => {
  const id = route.query.id;
  if (!id) {
    message.error('缺少执行ID');
    router.push({ path: '/XAA/workflow/index' });
    return;
  }

  executionId.value = Number(id);
  loading.value = true;

  try {
    execution.value = await fetchExecutionById(executionId.value);
    nodeExecutions.value = await fetchNodeExecutions(executionId.value);
  } catch (error) {
    console.error('加载执行详情失败:', error);
    message.error('加载执行详情失败');
  } finally {
    loading.value = false;
  }
};

// 获取状态颜色
const getStatusColor = (status: string) => {
  switch (status) {
    case 'scheduled':
    case 'pending':
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
    case 'skipped':
      return 'default';
    default:
      return 'default';
  }
};

// 获取状态文本
const getStatusText = (status: string) => {
  switch (status) {
    case 'scheduled':
      return '已调度';
    case 'pending':
      return '等待中';
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
    case 'skipped':
      return '已跳过';
    default:
      return status;
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

// 停止执行
const handleStop = async () => {
  try {
    await stopExecution(executionId.value);
    message.success('执行已停止');
    await loadData();
  } catch (error) {
    console.error('停止执行失败:', error);
    message.error('停止执行失败');
  }
};

// 返回
const handleBack = () => {
  router.back();
};

// 刷新
const handleRefresh = () => {
  loadData();
};

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="execution-detail">
    <!-- 执行概览 -->
    <Card class="mb-4">
      <template #title>
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <Button @click="handleBack" style="margin-right: 16px;">返回</Button>
            <span>执行详情</span>
          </div>
          <div class="flex space-x-2">
            <Button @click="handleRefresh">刷新</Button>
            <Button
              v-if="execution && ['scheduled', 'running', 'paused'].includes(execution.status)"
              danger
              @click="handleStop"
            >
              停止执行
            </Button>
          </div>
        </div>
      </template>

      <Descriptions v-if="execution" bordered :column="2">
        <DescriptionsItem label="执行ID">
          {{ execution.uid }}
        </DescriptionsItem>
        <DescriptionsItem label="状态">
          <Tag :color="getStatusColor(execution.status)">
            {{ getStatusText(execution.status) }}
          </Tag>
        </DescriptionsItem>
        <DescriptionsItem label="触发方式">
          {{ execution.triggerType === 'manual' ? '手动' : execution.triggerType }}
        </DescriptionsItem>
        <DescriptionsItem label="触发者">
          {{ execution.triggeredBy || '-' }}
        </DescriptionsItem>
        <DescriptionsItem label="开始时间">
          {{ formatTime(execution.startedAt || '') }}
        </DescriptionsItem>
        <DescriptionsItem label="结束时间">
          {{ formatTime(execution.finishedAt || '') }}
        </DescriptionsItem>
        <DescriptionsItem label="执行耗时">
          {{ formatElapsedTime(execution.elapsedTime || 0) }}
        </DescriptionsItem>
        <DescriptionsItem label="创建时间">
          {{ formatTime(execution.createdAt) }}
        </DescriptionsItem>
        <DescriptionsItem v-if="execution.errorMessage" label="错误信息" :span="2">
          <span class="text-red-500">{{ execution.errorMessage }}</span>
        </DescriptionsItem>
      </Descriptions>
    </Card>

    <!-- 节点执行时间线 -->
    <Card class="mb-4" title="执行时间线">
      <Timeline v-if="nodeExecutions.length > 0">
        <TimelineItem
          v-for="node in nodeExecutions"
          :key="node.id"
          :color="getStatusColor(node.status)"
        >
          <div class="timeline-item">
            <div class="flex items-center">
              <Tag :color="getStatusColor(node.status)">
                {{ getStatusText(node.status) }}
              </Tag>
              <span class="ml-2 font-semibold">{{ node.nodeTitle }}</span>
              <span class="ml-2 text-gray-500">({{ node.nodeType }})</span>
            </div>
            <div class="text-gray-500 text-sm mt-1">
              开始: {{ formatTime(node.startedAt || '') }}
              <span v-if="node.elapsedTime" class="ml-4">
                耗时: {{ formatElapsedTime(node.elapsedTime) }}
              </span>
            </div>
            <div v-if="node.errorMessage" class="text-red-500 text-sm mt-1">
              错误: {{ node.errorMessage }}
            </div>
          </div>
        </TimelineItem>
      </Timeline>
      <div v-else class="text-gray-500 text-center py-4">
        暂无节点执行记录
      </div>
    </Card>

    <!-- 节点执行详情表格 -->
    <Card title="节点执行详情">
      <Table
        :columns="columns"
        :data-source="nodeExecutions"
        :loading="loading"
        row-key="id"
        bordered
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <Tag :color="getStatusColor(record.status)">
              {{ getStatusText(record.status) }}
            </Tag>
          </template>

          <template v-else-if="column.key === 'startedAt'">
            {{ formatTime(record.startedAt) }}
          </template>

          <template v-else-if="column.key === 'elapsedTime'">
            {{ formatElapsedTime(record.elapsedTime) }}
          </template>

          <template v-else-if="column.key === 'errorMessage'">
            <span v-if="record.errorMessage" class="text-red-500">
              {{ record.errorMessage }}
            </span>
            <span v-else>-</span>
          </template>
        </template>
      </Table>
    </Card>
  </div>
</template>

<style scoped>
.execution-detail {
  padding: 16px;
}

.timeline-item {
  padding: 8px 0;
}
</style>
