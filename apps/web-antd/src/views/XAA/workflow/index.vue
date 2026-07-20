<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  Button,
  Card,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  SelectOption,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  archiveWorkflow,
  deleteWorkflow,
  fetchWorkflowList,
  publishWorkflow,
} from '../api/workflow';

import type { Workflow } from '../api/types';

const router = useRouter();

// 工作流列表数据
const workflowList = ref<Workflow[]>([]);
const loading = ref(false);

// 搜索条件
const searchName = ref('');
const searchStatus = ref('');

// 表格列定义
const columns = [
  { title: '工作流名称', dataIndex: 'name', key: 'name' },
  { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: '类型', dataIndex: 'type', key: 'type', width: 100 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '版本', dataIndex: 'version', key: 'version', width: 80 },
  { title: '创建者', dataIndex: 'creatorName', key: 'creatorName', width: 120 },
  { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 180 },
  { title: '操作', key: 'action', width: 280 },
];

// 状态选项
const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已发布' },
  { value: 'archived', label: '已归档' },
];

// 加载工作流列表
const loadWorkflows = async () => {
  loading.value = true;
  try {
    const status = searchStatus.value || undefined;
    workflowList.value = await fetchWorkflowList(status);
  } catch (error) {
    console.error('加载工作流列表失败:', error);
    message.error('加载工作流列表失败');
  } finally {
    loading.value = false;
  }
};

// 过滤后的数据
const filteredData = computed(() => {
  return workflowList.value.filter((item) => {
    const nameMatch = (item.name || '')
      .toLowerCase()
      .includes((searchName.value || '').toLowerCase());
    return nameMatch;
  });
});

// 获取状态标签颜色
const getStatusColor = (status: string) => {
  switch (status) {
    case 'draft':
      return 'default';
    case 'published':
      return 'success';
    case 'archived':
      return 'warning';
    default:
      return 'default';
  }
};

// 获取状态标签文本
const getStatusText = (status: string) => {
  switch (status) {
    case 'draft':
      return '草稿';
    case 'published':
      return '已发布';
    case 'archived':
      return '已归档';
    default:
      return status;
  }
};

// 格式化时间
const formatTime = (timeStr: string) => {
  if (!timeStr) return '-';
  return new Date(timeStr).toLocaleString();
};

// 创建工作流
const handleCreate = () => {
  router.push({ path: '/XAA/workflow/create' });
};

// 编辑工作流
const handleEdit = (record: Workflow) => {
  router.push({
    path: '/XAA/workflow/edit',
    query: { id: record.id },
  });
};

// 设计工作流
const handleDesign = (record: Workflow) => {
  router.push({
    path: '/XAA/workflow/designer',
    query: { id: record.id },
  });
};

// 查看执行记录
const handleViewExecutions = (record: Workflow) => {
  router.push({
    path: '/XAA/workflow/executions',
    query: { workflowId: record.id },
  });
};

// 发布工作流
const handlePublish = async (record: Workflow) => {
  try {
    await publishWorkflow(record.id);
    message.success('工作流发布成功');
    await loadWorkflows();
  } catch (error) {
    console.error('发布工作流失败:', error);
    message.error('发布工作流失败');
  }
};

// 归档工作流
const handleArchive = async (record: Workflow) => {
  try {
    await archiveWorkflow(record.id);
    message.success('工作流归档成功');
    await loadWorkflows();
  } catch (error) {
    console.error('归档工作流失败:', error);
    message.error('归档工作流失败');
  }
};

// 删除工作流
const handleDelete = async (record: Workflow) => {
  try {
    await deleteWorkflow(record.id);
    message.success('工作流删除成功');
    await loadWorkflows();
  } catch (error) {
    console.error('删除工作流失败:', error);
    message.error('删除工作流失败');
  }
};

// 选择状态
const handleStatusChange = () => {
  loadWorkflows();
};

// 初始化
onMounted(() => {
  loadWorkflows();
});
</script>

<template>
  <Card class="p-4 shadow">
    <!-- 顶部操作区域 -->
    <div class="mb-4 flex w-full justify-between">
      <div>
        <Button type="primary" @click="handleCreate">
          新建工作流
        </Button>
      </div>

      <!-- 搜索区域 -->
      <div class="flex space-x-2">
        <Input
          v-model:value="searchName"
          placeholder="搜索工作流名称"
          allow-clear
          style="width: 200px"
        />
        <Select
          v-model:value="searchStatus"
          placeholder="筛选状态"
          style="width: 120px"
          @change="handleStatusChange"
        >
          <SelectOption
            v-for="option in statusOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </SelectOption>
        </Select>
      </div>
    </div>

    <!-- 工作流表格 -->
    <Table
      :columns="columns"
      :data-source="filteredData"
      :loading="loading"
      row-key="id"
      bordered
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <a @click="handleDesign(record)">{{ record.name }}</a>
        </template>

        <template v-else-if="column.key === 'status'">
          <Tag :color="getStatusColor(record.status)">
            {{ getStatusText(record.status) }}
          </Tag>
        </template>

        <template v-else-if="column.key === 'updatedAt'">
          {{ formatTime(record.updatedAt) }}
        </template>

        <template v-else-if="column.key === 'action'">
          <Button type="link" size="small" @click="handleDesign(record)">
            设计
          </Button>
          <Button type="link" size="small" @click="handleEdit(record)">
            编辑
          </Button>
          <Button type="link" size="small" @click="handleViewExecutions(record)">
            执行记录
          </Button>
          <Button
            v-if="record.status === 'draft'"
            type="link"
            size="small"
            @click="handlePublish(record)"
          >
            发布
          </Button>
          <Button
            v-if="record.status === 'published'"
            type="link"
            size="small"
            @click="handleArchive(record)"
          >
            归档
          </Button>
          <Popconfirm
            title="确定删除该工作流吗？"
            ok-text="确定"
            cancel-text="取消"
            @confirm="handleDelete(record)"
          >
            <Button type="link" size="small" danger>
              删除
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
