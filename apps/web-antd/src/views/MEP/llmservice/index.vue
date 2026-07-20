<script lang="ts" setup>
import type { LLMService, LLMServiceType, ServiceStatus } from '../api/types';

import { computed, h, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SyncOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Input,
  message,
  Popconfirm,
  Select,
  SelectOption,
  Space,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import {
  deleteLLMService,
  fetchLLMServiceList,
  startLLMService,
  stopLLMService,
} from '../api/llmService';

const router = useRouter();

// 服务类型选项
const serviceTypeOptions: { label: string; value: LLMServiceType }[] = [
  { label: 'Ollama', value: 'ollama' },
  { label: 'OpenAI', value: 'openai' },
  { label: 'DeepSeek', value: 'deepseek' },
  { label: '自定义', value: 'custom' },
];

// 服务列表数据
const serviceList = ref<LLMService[]>([]);
const loading = ref(false);

// 搜索条件
const searchParams = reactive({
  name: '',
  type: undefined as LLMServiceType | undefined,
  status: undefined as ServiceStatus | undefined,
});

// 表格列定义
const columns = [
  {
    title: '服务名称',
    dataIndex: 'name',
    key: 'name',
    width: 180,
  },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: 120,
    customRender: ({ record }: { record: LLMService }) => {
      const typeMap: Record<LLMServiceType, { color: string; label: string }> = {
        ollama: { color: 'blue', label: 'Ollama' },
        openai: { color: 'green', label: 'OpenAI' },
        deepseek: { color: 'purple', label: 'DeepSeek' },
        custom: { color: 'orange', label: '自定义' },
      };
      const config = typeMap[record.type] || { color: 'default', label: record.type };
      return h(Tag, { color: config.color }, () => config.label);
    },
  },
  {
    title: '模型名称',
    dataIndex: 'model_name',
    key: 'model_name',
    width: 150,
  },
  {
    title: '服务端点',
    dataIndex: 'endpoint',
    key: 'endpoint',
    ellipsis: true,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 120,
    customRender: ({ record }: { record: LLMService }) => {
      const statusMap: Record<ServiceStatus, { color: string; icon: any; label: string }> = {
        running: { color: 'success', icon: CheckCircleOutlined, label: '运行中' },
        stopped: { color: 'default', icon: PauseCircleOutlined, label: '已停止' },
        error: { color: 'error', icon: CloseCircleOutlined, label: '异常' },
        deploying: { color: 'processing', icon: SyncOutlined, label: '部署中' },
      };
      const config = statusMap[record.status] || { color: 'default', icon: ExclamationCircleOutlined, label: record.status };
      return h(Tag, { color: config.color }, () => [
        h(config.icon, { spin: record.status === 'deploying' }),
        ` ${config.label}`,
      ]);
    },
  },
  {
    title: '描述',
    dataIndex: 'description',
    key: 'description',
    ellipsis: true,
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 180,
  },
  {
    title: '操作',
    key: 'action',
    width: 200,
    fixed: 'right',
  },
];

// 获取数据
const fetchData = async () => {
  try {
    loading.value = true;
    const data = await fetchLLMServiceList();
    serviceList.value = data.map((item) => ({ ...item, key: item.id }));
  } catch (error) {
    console.error('获取服务列表失败:', error);
  } finally {
    loading.value = false;
  }
};

// 过滤后的列表
const filteredList = computed(() => {
  return serviceList.value.filter((item) => {
    if (searchParams.name && !item.name.toLowerCase().includes(searchParams.name.toLowerCase())) {
      return false;
    }
    if (searchParams.type && item.type !== searchParams.type) {
      return false;
    }
    if (searchParams.status && item.status !== searchParams.status) {
      return false;
    }
    return true;
  });
});

// 搜索
const handleSearch = () => {
  // 前端过滤，无需重新请求
};

// 重置
const handleReset = () => {
  searchParams.name = '';
  searchParams.type = undefined;
  searchParams.status = undefined;
};

// 新增服务
const handleAdd = () => {
  router.push('/MEP/llmservice/create');
};

// 编辑服务
const handleEdit = (record: LLMService) => {
  router.push({
    path: '/MEP/llmservice/modify',
    query: { id: record.id },
  });
};

// 删除服务
const handleDelete = async (id: number) => {
  try {
    await deleteLLMService(id);
    await fetchData();
  } catch (error) {
    console.error('删除失败:', error);
  }
};

// 启动服务
const handleStart = async (id: number) => {
  try {
    await startLLMService(id);
    await fetchData();
  } catch (error) {
    console.error('启动失败:', error);
  }
};

// 停止服务
const handleStop = async (id: number) => {
  try {
    await stopLLMService(id);
    await fetchData();
  } catch (error) {
    console.error('停止失败:', error);
  }
};

// 批量删除
const state = reactive({
  selectedRowKeys: [] as number[],
  deleteLoading: false,
});

const hasSelected = computed(() => state.selectedRowKeys.length > 0);

const onSelectChange = (selectedRowKeys: number[]) => {
  state.selectedRowKeys = selectedRowKeys;
};

const handleBatchDelete = async () => {
  if (state.selectedRowKeys.length === 0) return;
  try {
    state.deleteLoading = true;
    await Promise.all(state.selectedRowKeys.map((id) => deleteLLMService(id)));
    await fetchData();
    state.selectedRowKeys = [];
    message.success('批量删除成功');
  } catch (error) {
    console.error('批量删除失败:', error);
    message.error('批量删除失败');
  } finally {
    state.deleteLoading = false;
  }
};

onMounted(() => {
  fetchData();
});
</script>

<template>
  <Card class="p-4 shadow">
    <!-- 搜索区域 -->
    <div class="mb-4 flex flex-wrap items-center justify-between gap-4">
      <div class="flex flex-wrap items-center gap-2">
        <Input
          v-model:value="searchParams.name"
          placeholder="服务名称"
          style="width: 180px"
          allow-clear
          @press-enter="handleSearch"
        >
          <template #prefix>
            <SearchOutlined />
          </template>
        </Input>
        <Select
          v-model:value="searchParams.type"
          placeholder="服务类型"
          style="width: 140px"
          allow-clear
        >
          <SelectOption v-for="opt in serviceTypeOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </SelectOption>
        </Select>
        <Select
          v-model:value="searchParams.status"
          placeholder="服务状态"
          style="width: 140px"
          allow-clear
        >
          <SelectOption value="running">运行中</SelectOption>
          <SelectOption value="stopped">已停止</SelectOption>
          <SelectOption value="error">异常</SelectOption>
          <SelectOption value="deploying">部署中</SelectOption>
        </Select>
        <Button type="primary" @click="handleSearch">搜索</Button>
        <Button @click="handleReset">重置</Button>
      </div>

      <div class="flex items-center gap-2">
        <Button type="primary" @click="handleAdd">
          <PlusOutlined />
          新增服务
        </Button>
        <Button
          type="primary"
          danger
          :disabled="!hasSelected"
          :loading="state.deleteLoading"
          @click="handleBatchDelete"
        >
          <DeleteOutlined />
          批量删除
        </Button>
        <Tooltip title="刷新">
          <Button @click="fetchData">
            <ReloadOutlined />
          </Button>
        </Tooltip>
        <span v-if="hasSelected" class="text-gray-500">
          已选择 {{ state.selectedRowKeys.length }} 项
        </span>
      </div>
    </div>

    <!-- 表格 -->
    <Table
      :columns="columns"
      :data-source="filteredList"
      :loading="loading"
      :row-selection="{
        selectedRowKeys: state.selectedRowKeys,
        onChange: onSelectChange,
      }"
      row-key="id"
      :pagination="{ pageSize: 10, showSizeChanger: true, showQuickJumper: true }"
      :scroll="{ x: 1200 }"
      bordered
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <a @click="handleEdit(record)" class="text-blue-500 hover:text-blue-600">
            {{ record.name }}
          </a>
        </template>
        <template v-if="column.key === 'action'">
          <Space>
            <Tooltip :title="record.status === 'running' ? '停止' : '启动'">
              <Button
                v-if="record.status === 'running'"
                type="text"
                size="small"
                @click="handleStop(record.id)"
              >
                <PauseCircleOutlined class="text-orange-500" />
              </Button>
              <Button
                v-else
                type="text"
                size="small"
                :disabled="record.status === 'deploying'"
                @click="handleStart(record.id)"
              >
                <PlayCircleOutlined class="text-green-500" />
              </Button>
            </Tooltip>
            <Tooltip title="编辑">
              <Button type="text" size="small" @click="handleEdit(record)">
                <EditOutlined class="text-blue-500" />
              </Button>
            </Tooltip>
            <Popconfirm
              title="确定要删除该服务吗？"
              ok-text="确定"
              cancel-text="取消"
              @confirm="handleDelete(record.id)"
            >
              <Tooltip title="删除">
                <Button type="text" size="small" danger>
                  <DeleteOutlined />
                </Button>
              </Tooltip>
            </Popconfirm>
          </Space>
        </template>
      </template>
    </Table>
  </Card>
</template>

<style scoped>
:deep(.ant-table-thead > tr > th) {
  font-weight: 600;
}

:deep(.ant-table) {
  border-radius: 6px;
  overflow: hidden;
}
</style>
