<script lang="ts" setup>
import type { ApiKeyItem, LLMServiceType } from '../api/types';

import { computed, h, onMounted, reactive, ref } from 'vue';

import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  KeyOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  SelectOption,
  Space,
  Table,
  Tag,
  Textarea,
  Tooltip,
} from 'ant-design-vue';

import {
  createApiKey,
  deleteApiKey,
  fetchApiKeyList,
  regenerateApiKey,
  toggleApiKeyStatus,
  updateApiKey,
} from '../api/apiKey';

// 服务商选项
const providerOptions: { label: string; value: LLMServiceType }[] = [
  { label: 'Ollama', value: 'ollama' },
  { label: 'OpenAI', value: 'openai' },
  { label: 'DeepSeek', value: 'deepseek' },
  { label: '自定义', value: 'custom' },
];

// API Key列表
const apiKeyList = ref<ApiKeyItem[]>([]);
const loading = ref(false);

// 搜索条件
const searchParams = reactive({
  name: '',
  provider: undefined as LLMServiceType | undefined,
});

// 模态框状态
const modalVisible = ref(false);
const modalLoading = ref(false);
const isEditing = ref(false);
const showNewKey = ref(false);
const newKeyValue = ref('');

// 表单数据
const formState = reactive({
  id: 0,
  name: '',
  key: '',
  provider: 'openai' as LLMServiceType,
  description: '',
  usage_limit: null as number | null,
  expires_at: null as string | null,
});

// 密钥显示状态
const visibleKeys = ref<Set<number>>(new Set());

// 表格列定义
const columns = [
  {
    title: '名称',
    dataIndex: 'name',
    key: 'name',
    width: 150,
  },
  {
    title: 'API Key',
    key: 'key',
    width: 280,
  },
  {
    title: '服务商',
    dataIndex: 'provider',
    key: 'provider',
    width: 120,
    customRender: ({ record }: { record: ApiKeyItem }) => {
      const colorMap: Record<LLMServiceType, string> = {
        ollama: 'blue',
        openai: 'green',
        deepseek: 'purple',
        custom: 'orange',
      };
      const labelMap: Record<LLMServiceType, string> = {
        ollama: 'Ollama',
        openai: 'OpenAI',
        deepseek: 'DeepSeek',
        custom: '自定义',
      };
      return h(Tag, { color: colorMap[record.provider] }, () => labelMap[record.provider]);
    },
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    customRender: ({ record }: { record: ApiKeyItem }) => {
      const statusMap = {
        active: { color: 'success', label: '正常' },
        disabled: { color: 'default', label: '已禁用' },
        expired: { color: 'error', label: '已过期' },
      };
      const config = statusMap[record.status];
      return h(Tag, { color: config.color }, () => config.label);
    },
  },
  {
    title: '使用情况',
    key: 'usage',
    width: 150,
  },
  {
    title: '过期时间',
    dataIndex: 'expires_at',
    key: 'expires_at',
    width: 150,
    customRender: ({ record }: { record: ApiKeyItem }) => {
      if (!record.expires_at) return '永不过期';
      return new Date(record.expires_at).toLocaleDateString();
    },
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 150,
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
    const data = await fetchApiKeyList();
    apiKeyList.value = data.map((item) => ({ ...item, key: item.id }));
  } catch (error) {
    console.error('获取API Key列表失败:', error);
  } finally {
    loading.value = false;
  }
};

// 过滤后的列表
const filteredList = computed(() => {
  return apiKeyList.value.filter((item) => {
    if (searchParams.name && !item.name.toLowerCase().includes(searchParams.name.toLowerCase())) {
      return false;
    }
    if (searchParams.provider && item.provider !== searchParams.provider) {
      return false;
    }
    return true;
  });
});

// 重置搜索
const handleReset = () => {
  searchParams.name = '';
  searchParams.provider = undefined;
};

// 打开新增模态框
const handleAdd = () => {
  isEditing.value = false;
  showNewKey.value = false;
  newKeyValue.value = '';
  Object.assign(formState, {
    id: 0,
    name: '',
    key: '',
    provider: 'openai',
    description: '',
    usage_limit: null,
    expires_at: null,
  });
  modalVisible.value = true;
};

// 打开编辑模态框
const handleEdit = (record: ApiKeyItem) => {
  isEditing.value = true;
  showNewKey.value = false;
  Object.assign(formState, {
    id: record.id,
    name: record.name,
    key: '',
    provider: record.provider,
    description: record.description,
    usage_limit: record.usage_limit,
    expires_at: record.expires_at,
  });
  modalVisible.value = true;
};

// 提交表单
const handleSubmit = async () => {
  if (!formState.name) {
    message.warning('请输入名称');
    return;
  }
  if (!isEditing.value && !formState.key) {
    message.warning('请输入API Key');
    return;
  }

  try {
    modalLoading.value = true;
    if (isEditing.value) {
      await updateApiKey(formState.id, {
        name: formState.name,
        description: formState.description,
        usage_limit: formState.usage_limit,
        expires_at: formState.expires_at,
      });
      modalVisible.value = false;
    } else {
      const result = await createApiKey({
        name: formState.name,
        api_key: formState.key,
        provider: formState.provider,
        description: formState.description,
        status: 'active',
        usage_limit: formState.usage_limit,
        expires_at: formState.expires_at,
      });
      // 显示新创建的Key
      if (result.plain_key) {
        showNewKey.value = true;
        newKeyValue.value = result.plain_key;
      } else {
        modalVisible.value = false;
      }
    }
    await fetchData();
  } catch (error) {
    console.error('操作失败:', error);
  } finally {
    modalLoading.value = false;
  }
};

// 删除
const handleDelete = async (id: number) => {
  try {
    await deleteApiKey(id);
    await fetchData();
  } catch (error) {
    console.error('删除失败:', error);
  }
};

// 切换状态
const handleToggleStatus = async (record: ApiKeyItem) => {
  const newStatus = record.status === 'active' ? 'disabled' : 'active';
  try {
    await toggleApiKeyStatus(record.id, newStatus);
    await fetchData();
  } catch (error) {
    console.error('切换状态失败:', error);
  }
};

// 重新生成Key
const handleRegenerate = async (id: number) => {
  try {
    const result = await regenerateApiKey(id);
    if (result.plain_key) {
      Modal.success({
        title: '新的API Key',
        content: h('div', [
          h('p', { class: 'mb-2 text-orange-500' }, '请立即复制保存，此密钥只显示一次！'),
          h('code', { class: 'block bg-gray-100 dark:bg-gray-800 p-2 rounded break-all' }, result.plain_key),
        ]),
        okText: '我已复制',
      });
    }
    await fetchData();
  } catch (error) {
    console.error('重新生成失败:', error);
  }
};

// 切换密钥显示
const toggleKeyVisibility = (id: number) => {
  if (visibleKeys.value.has(id)) {
    visibleKeys.value.delete(id);
  } else {
    visibleKeys.value.add(id);
  }
};

// 复制到剪贴板
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    message.success('已复制到剪贴板');
  } catch {
    message.error('复制失败');
  }
};

// 复制新密钥并关闭弹窗
const copyAndClose = async () => {
  await copyToClipboard(newKeyValue.value);
  modalVisible.value = false;
};

onMounted(() => {
  fetchData();
});
</script>

<template>
  <div>
    <Card class="p-4 shadow">
    <!-- 搜索区域 -->
    <div class="mb-4 flex flex-wrap items-center justify-between gap-4">
      <div class="flex flex-wrap items-center gap-2">
        <Input
          v-model:value="searchParams.name"
          placeholder="名称"
          style="width: 180px"
          allow-clear
        >
          <template #prefix>
            <SearchOutlined />
          </template>
        </Input>
        <Select
          v-model:value="searchParams.provider"
          placeholder="服务商"
          style="width: 140px"
          allow-clear
        >
          <SelectOption v-for="opt in providerOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </SelectOption>
        </Select>
        <Button @click="handleReset">重置</Button>
      </div>

      <div class="flex items-center gap-2">
        <Button type="primary" @click="handleAdd">
          <PlusOutlined />
          新增API Key
        </Button>
        <Tooltip title="刷新">
          <Button @click="fetchData">
            <ReloadOutlined />
          </Button>
        </Tooltip>
      </div>
    </div>

    <!-- 表格 -->
    <Table
      :columns="columns"
      :data-source="filteredList"
      :loading="loading"
      row-key="id"
      :pagination="{ pageSize: 10, showSizeChanger: true }"
      :scroll="{ x: 1300 }"
      bordered
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'key'">
          <div class="flex items-center gap-2">
            <code class="rounded bg-gray-100 dark:bg-gray-800 px-2 py-1">
              {{ visibleKeys.has(record.id) ? record.key_masked : '••••••••••••••••' }}
            </code>
            <Button type="text" size="small" @click="toggleKeyVisibility(record.id)">
              <EyeOutlined v-if="!visibleKeys.has(record.id)" />
              <EyeInvisibleOutlined v-else />
            </Button>
            <Button type="text" size="small" @click="copyToClipboard(record.key_masked)">
              <CopyOutlined />
            </Button>
          </div>
        </template>

        <template v-if="column.key === 'usage'">
          <div v-if="record.usage_limit">
            <Progress
              :percent="Math.round((record.usage_count / record.usage_limit) * 100)"
              :status="record.usage_count >= record.usage_limit ? 'exception' : 'active'"
              size="small"
            />
            <span class="text-xs text-gray-500">
              {{ record.usage_count }} / {{ record.usage_limit }}
            </span>
          </div>
          <span v-else class="text-gray-400">无限制</span>
        </template>

        <template v-if="column.key === 'action'">
          <Space>
            <Tooltip title="编辑">
              <Button type="text" size="small" @click="handleEdit(record)">
                <EditOutlined class="text-blue-500" />
              </Button>
            </Tooltip>
            <Tooltip :title="record.status === 'active' ? '禁用' : '启用'">
              <Button
                type="text"
                size="small"
                @click="handleToggleStatus(record)"
              >
                <span :class="record.status === 'active' ? 'text-orange-500' : 'text-green-500'">
                  {{ record.status === 'active' ? '禁用' : '启用' }}
                </span>
              </Button>
            </Tooltip>
            <Popconfirm
              title="重新生成后原密钥将失效，确定继续？"
              ok-text="确定"
              cancel-text="取消"
              @confirm="handleRegenerate(record.id)"
            >
              <Tooltip title="重新生成">
                <Button type="text" size="small">
                  <KeyOutlined class="text-purple-500" />
                </Button>
              </Tooltip>
            </Popconfirm>
            <Popconfirm
              title="确定要删除此API Key吗？"
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

  <!-- 新增/编辑模态框 -->
  <Modal
    v-model:open="modalVisible"
    :title="showNewKey ? '密钥已创建' : (isEditing ? '编辑API Key' : '新增API Key')"
    :confirm-loading="modalLoading"
    :footer="showNewKey ? null : undefined"
    :width="600"
    @ok="handleSubmit"
  >
    <template v-if="showNewKey">
      <div class="py-4">
        <div class="mb-4 rounded-lg bg-orange-50 p-4 text-orange-600">
          <p class="mb-2 font-semibold">请立即复制并安全保存此密钥！</p>
          <p class="text-sm">此密钥只显示一次，关闭后将无法再次查看。</p>
        </div>
        <div class="flex items-center gap-2">
          <code class="block flex-1 break-all rounded bg-gray-100 dark:bg-gray-800 p-3">{{ newKeyValue }}</code>
          <Button type="primary" @click="copyAndClose">
            <CopyOutlined />
            复制
          </Button>
        </div>
      </div>
    </template>
    <template v-else>
      <Form :model="formState" layout="vertical" class="mt-4">
        <Row :gutter="16">
          <Col :span="12">
            <FormItem label="名称" required>
              <Input v-model:value="formState.name" placeholder="请输入名称" :maxlength="50" />
            </FormItem>
          </Col>
          <Col :span="12">
            <FormItem label="服务商" required>
              <Select v-model:value="formState.provider" :disabled="isEditing">
                <SelectOption v-for="opt in providerOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </SelectOption>
              </Select>
            </FormItem>
          </Col>
        </Row>

        <FormItem v-if="!isEditing" label="API Key" required>
          <Input.Password
            v-model:value="formState.key"
            placeholder="请输入API Key"
          />
        </FormItem>

        <Row :gutter="16">
          <Col :span="12">
            <FormItem label="使用次数限制">
              <InputNumber
                v-model:value="formState.usage_limit"
                :min="1"
                placeholder="留空为无限制"
                style="width: 100%"
              />
            </FormItem>
          </Col>
          <Col :span="12">
            <FormItem label="过期时间">
              <DatePicker
                v-model:value="formState.expires_at"
                placeholder="留空为永不过期"
                style="width: 100%"
                value-format="YYYY-MM-DD"
              />
            </FormItem>
          </Col>
        </Row>

        <FormItem label="描述">
          <Textarea
            v-model:value="formState.description"
            placeholder="请输入描述"
            :rows="3"
            :maxlength="200"
          />
        </FormItem>
      </Form>
    </template>
  </Modal>
  </div>
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
