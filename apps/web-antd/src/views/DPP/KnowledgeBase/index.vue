<template>
  <BusinessPage domain="数据准备" description="从数据集、特征到知识库，组织好训练与检索所需的数据。" existing-title :error="readError" :loading="loading" @retry="loadData">
  <div class="knowledge-base">
    <Card class="knowledge-base__header">
      <div class="knowledge-base__title-row">
        <div>
          <h2 class="knowledge-base__title">
            <DatabaseOutlined />
            RAG 知识库
          </h2>
          <p class="knowledge-base__subtitle">
            管理您的知识库，上传文档并进行智能检索
          </p>
        </div>
        <div class="knowledge-base__actions">
          <Button type="primary" @click="handleCreate">
            <template #icon><PlusOutlined /></template>
            创建知识库
          </Button>
        </div>
      </div>

      <!-- 搜索和筛选 -->
      <div class="knowledge-base__filters">
        <Input
          v-model:value="searchKeyword"
          placeholder="搜索知识库..."
          style="width: 300px"
          allow-clear
          @pressEnter="loadData"
        >
          <template #prefix><SearchOutlined /></template>
        </Input>
        <Select
          v-model:value="statusFilter"
          placeholder="状态筛选"
          style="width: 150px"
          allow-clear
          @change="loadData"
        >
          <SelectOption value="active">活跃</SelectOption>
          <SelectOption value="indexing">索引中</SelectOption>
          <SelectOption value="error">错误</SelectOption>
          <SelectOption value="archived">已归档</SelectOption>
        </Select>
      </div>
    </Card>

    <!-- 知识库列表 -->
    <div class="knowledge-base__content">
      <Spin :spinning="loading">
        <Row v-if="filteredKBs.length > 0" :gutter="[16, 16]">
          <Col v-for="kb in filteredKBs" :key="kb.id" :xs="24" :sm="12" :md="8" :lg="6">
            <Card class="kb-card" hoverable @click="handleView(kb)">
              <template #actions>
                <Tooltip title="文档管理">
                  <FileTextOutlined @click.stop="handleDocuments(kb)" />
                </Tooltip>
                <Tooltip title="检索测试">
                  <SearchOutlined @click.stop="handleRetrievalTest(kb)" />
                </Tooltip>
                <Tooltip title="设置">
                  <SettingOutlined @click.stop="handleSettings(kb)" />
                </Tooltip>
                <Dropdown>
                  <MoreOutlined @click.stop />
                  <template #overlay>
                    <Menu @click="({ key }) => handleMenuClick(key, kb)">
                      <MenuItem key="rebuild">
                        <SyncOutlined /> 重建索引
                      </MenuItem>
                      <MenuItem key="archive">
                        <InboxOutlined /> 归档
                      </MenuItem>
                      <MenuDivider />
                      <MenuItem key="delete" danger>
                        <DeleteOutlined /> 删除
                      </MenuItem>
                    </Menu>
                  </template>
                </Dropdown>
              </template>

              <div class="kb-card__header">
                <div class="kb-card__icon" :style="{ backgroundColor: getStatusColor(kb.status) }">
                  <DatabaseOutlined />
                </div>
                <div class="kb-card__status">
                  <Tag :color="getStatusColor(kb.status)">{{ getStatusText(kb.status) }}</Tag>
                </div>
              </div>

              <div class="kb-card__body">
                <div class="kb-card__name">{{ kb.name }}</div>
                <div class="kb-card__desc">{{ kb.description || '暂无描述' }}</div>
              </div>

              <div class="kb-card__stats">
                <div class="kb-card__stat">
                  <span class="kb-card__stat-value">{{ kb.docCount }}</span>
                  <span class="kb-card__stat-label">文档</span>
                </div>
                <div class="kb-card__stat">
                  <span class="kb-card__stat-value">{{ kb.chunkCount }}</span>
                  <span class="kb-card__stat-label">分块</span>
                </div>
                <div class="kb-card__stat">
                  <span class="kb-card__stat-value">{{ formatSize(kb.totalSizeBytes) }}</span>
                  <span class="kb-card__stat-label">大小</span>
                </div>
              </div>

              <div class="kb-card__footer">
                <span class="kb-card__method">
                  <ApiOutlined />
                  {{ getMethodText(kb.retrievalMethod) }}
                </span>
                <span class="kb-card__time">
                  {{ formatDate(kb.updatedAt) }}
                </span>
              </div>
            </Card>
          </Col>
        </Row>
        <Empty v-else description="暂无知识库">
          <Button type="primary" @click="handleCreate">创建知识库</Button>
        </Empty>
      </Spin>
    </div>

    <!-- 创建知识库弹窗 -->
    <Modal
      v-model:open="createModalVisible"
      :title="editingId === null ? '创建知识库' : '知识库设置'"
      :width="600"
      @ok="handleCreateSubmit"
      :confirm-loading="createLoading"
    >
      <Form ref="createFormRef" :model="createForm" :rules="createRules" layout="vertical">
        <FormItem label="知识库名称" name="name">
          <Input v-model:value="createForm.name" placeholder="输入知识库名称" />
        </FormItem>
        <FormItem label="描述" name="description">
          <Textarea v-model:value="createForm.description" placeholder="输入描述" :rows="3" />
        </FormItem>

        <Divider orientation="left">嵌入模型配置</Divider>

        <Row :gutter="16">
          <Col :span="12">
            <FormItem label="嵌入模型" name="embeddingModelId">
              <Select v-model:value="createForm.embeddingModelId" :disabled="editingId !== null" placeholder="选择嵌入模型">
                <SelectOption v-for="model in embeddingModels" :key="model.id" :value="model.id">
                  {{ model.name }} ({{ model.dimension }}维)
                </SelectOption>
              </Select>
            </FormItem>
          </Col>
          <Col :span="12">
            <FormItem label="向量数据库" name="vectorDbType">
              <Select v-model:value="createForm.vectorDbType" :disabled="editingId !== null">
                <SelectOption value="milvus">Milvus</SelectOption>
                <SelectOption value="pgvector">PgVector</SelectOption>
                <SelectOption value="chroma">Chroma</SelectOption>
              </Select>
            </FormItem>
          </Col>
        </Row>

        <Divider orientation="left">分块配置</Divider>

        <Row :gutter="16">
          <Col :span="8">
            <FormItem label="分块策略" name="chunkStrategy">
              <Select v-model:value="createForm.chunkStrategy">
                <SelectOption value="recursive">递归分割</SelectOption>
                <SelectOption value="fixed">固定大小</SelectOption>
                <SelectOption value="semantic">语义分割</SelectOption>
              </Select>
            </FormItem>
          </Col>
          <Col :span="8">
            <FormItem label="分块大小" name="chunkSize">
              <InputNumber v-model:value="createForm.chunkSize" :min="100" :max="2000" style="width: 100%" />
            </FormItem>
          </Col>
          <Col :span="8">
            <FormItem label="重叠大小" name="chunkOverlap">
              <InputNumber v-model:value="createForm.chunkOverlap" :min="0" :max="500" style="width: 100%" />
            </FormItem>
          </Col>
        </Row>

        <Divider orientation="left">检索配置</Divider>

        <Row :gutter="16">
          <Col :span="8">
            <FormItem label="检索方法" name="retrievalMethod">
              <Select v-model:value="createForm.retrievalMethod">
                <SelectOption value="hybrid">混合检索</SelectOption>
                <SelectOption value="semantic">语义检索</SelectOption>
                <SelectOption value="keyword">关键词检索</SelectOption>
              </Select>
            </FormItem>
          </Col>
          <Col :span="8">
            <FormItem label="返回数量" name="topK">
              <InputNumber v-model:value="createForm.topK" :min="1" :max="20" style="width: 100%" />
            </FormItem>
          </Col>
          <Col :span="8">
            <FormItem label="分数阈值" name="scoreThreshold">
              <InputNumber v-model:value="createForm.scoreThreshold" :min="0" :max="1" :step="0.1" style="width: 100%" />
            </FormItem>
          </Col>
        </Row>

        <FormItem name="rerankEnabled">
          <Checkbox v-model:checked="createForm.rerankEnabled">启用重排序</Checkbox>
        </FormItem>
      </Form>
    </Modal>
  </div>

  <Drawer v-model:open="detailVisible" title="知识库详情" width="580">
    <Descriptions v-if="selectedKnowledgeBase" bordered :column="1">
      <DescriptionsItem label="名称">{{ selectedKnowledgeBase.name }}</DescriptionsItem>
      <DescriptionsItem label="说明">{{ selectedKnowledgeBase.description || '暂无说明' }}</DescriptionsItem>
      <DescriptionsItem label="嵌入模型">{{ selectedKnowledgeBase.embeddingModel || '尚未配置' }}</DescriptionsItem>
      <DescriptionsItem label="向量存储">{{ selectedKnowledgeBase.vectorDbType }}</DescriptionsItem>
      <DescriptionsItem label="分块">{{ selectedKnowledgeBase.chunkStrategy }} · {{ selectedKnowledgeBase.chunkSize }}</DescriptionsItem>
      <DescriptionsItem label="检索">{{ getMethodText(selectedKnowledgeBase.retrievalMethod) }}</DescriptionsItem>
      <DescriptionsItem label="文档 / 分块">{{ selectedKnowledgeBase.docCount }} / {{ selectedKnowledgeBase.chunkCount }}</DescriptionsItem>
      <DescriptionsItem label="状态">{{ getStatusText(selectedKnowledgeBase.status) }}</DescriptionsItem>
    </Descriptions>
    <Button v-if="selectedKnowledgeBase" class="mt-4" type="primary" @click="handleDocuments(selectedKnowledgeBase)">管理文档</Button>
  </Drawer>
  </BusinessPage>
</template>

<script setup lang="ts">
import BusinessPage from '#/components/workspace/BusinessPage.vue';
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  Card,
  Drawer,
  Descriptions,
  DescriptionsItem,
  Button,
  Input,
  Select,
  SelectOption,
  Row,
  Col,
  Spin,
  Empty,
  Tag,
  Tooltip,
  Dropdown,
  Menu,
  MenuItem,
  MenuDivider,
  Modal,
  Form,
  FormItem,
  Textarea,
  InputNumber,
  Checkbox,
  Divider,
  message,
  Popconfirm,
} from 'ant-design-vue';
import {
  DatabaseOutlined,
  PlusOutlined,
  SearchOutlined,
  FileTextOutlined,
  SettingOutlined,
  MoreOutlined,
  SyncOutlined,
  InboxOutlined,
  DeleteOutlined,
  ApiOutlined,
} from '@ant-design/icons-vue';

import type { KnowledgeBase, EmbeddingModel, CreateKBRequest } from './types';
import {
  fetchKnowledgeBases,
  createKnowledgeBase,
  updateKnowledgeBase,
  deleteKnowledgeBase,
  rebuildKnowledgeBase,
  fetchEmbeddingModels,
} from './api';

const router = useRouter();

// 状态
const loading = ref(false);
const readError = ref('');
const knowledgeBases = ref<KnowledgeBase[]>([]);
const embeddingModels = ref<EmbeddingModel[]>([]);
const searchKeyword = ref('');
const statusFilter = ref<string | undefined>(undefined);

// 创建弹窗
const createModalVisible = ref(false);
const createLoading = ref(false);
const editingId = ref<number | null>(null);
const selectedKnowledgeBase = ref<KnowledgeBase | null>(null);
const detailVisible = ref(false);
const createFormRef = ref();
const createForm = reactive<CreateKBRequest>({
  name: '',
  description: '',
  embeddingModelId: undefined,
  vectorDbType: 'milvus',
  chunkStrategy: 'recursive',
  chunkSize: 500,
  chunkOverlap: 50,
  retrievalMethod: 'hybrid',
  topK: 5,
  scoreThreshold: 0.5,
  rerankEnabled: false,
});

const createRules = {
  name: [{ required: true, message: '请输入知识库名称', trigger: 'blur' }],
};

// 计算属性
const filteredKBs = computed(() => {
  let result = knowledgeBases.value;

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(kb =>
      kb.name.toLowerCase().includes(keyword) ||
      (kb.description && kb.description.toLowerCase().includes(keyword))
    );
  }

  if (statusFilter.value) {
    result = result.filter(kb => kb.status === statusFilter.value);
  }

  return result;
});

/** 读取知识库列表并保留可重试错误。 Read knowledge bases and retain a retryable failure state. */
async function loadData() {
  loading.value = true;
  try {
    knowledgeBases.value = await fetchKnowledgeBases(statusFilter.value);
    readError.value = '';
  } catch (error) {
    readError.value = '知识库列表读取失败，请检查服务与权限后重试。';
    message.error('加载知识库列表失败');
  } finally {
    loading.value = false;
  }
}

async function loadEmbeddingModels() {
  try {
    embeddingModels.value = await fetchEmbeddingModels();
    // 设置默认模型
    const defaultModel = embeddingModels.value.find(m => m.isDefault);
    if (defaultModel) {
      createForm.embeddingModelId = defaultModel.id;
    }
  } catch (error) {
    console.error('Failed to load embedding models:', error);
  }
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: '#52c41a',
    indexing: '#1890ff',
    error: '#ff4d4f',
    archived: '#8c8c8c',
  };
  return colors[status] || '#8c8c8c';
}

function getStatusText(status: string): string {
  const texts: Record<string, string> = {
    active: '活跃',
    indexing: '索引中',
    error: '错误',
    archived: '已归档',
  };
  return texts[status] || status;
}

function getMethodText(method: string): string {
  const texts: Record<string, string> = {
    hybrid: '混合检索',
    semantic: '语义检索',
    keyword: '关键词检索',
  };
  return texts[method] || method;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN');
}

/** 新建时清空编辑对象，避免覆盖旧知识库。Clear the editing target before creating a new knowledge base. */
function handleCreate() {
  editingId.value = null;
  Object.assign(createForm, {
    name: '',
    description: '',
    vectorDbType: 'milvus',
    chunkStrategy: 'recursive',
    chunkSize: 500,
    chunkOverlap: 50,
    retrievalMethod: 'hybrid',
    topK: 5,
    scoreThreshold: 0.5,
    rerankEnabled: false,
  });
  createModalVisible.value = true;
}

/** 保存已有创建/更新接口，失败时保留表单。Use existing create/update APIs and retain the form on failure. */
async function handleCreateSubmit() {
  if (createLoading.value) return;
  try {
    await createFormRef.value.validate();
    if (!Number.isFinite(createForm.chunkSize) || !Number.isFinite(createForm.chunkOverlap) || createForm.chunkOverlap < 0 || createForm.chunkOverlap >= createForm.chunkSize) {
      message.warning('分块重叠大小必须小于分块大小');
      return;
    }
    createLoading.value = true;
    if (editingId.value === null) await createKnowledgeBase(createForm);
    else await updateKnowledgeBase(editingId.value, createForm);
    message.success(editingId.value === null ? '知识库创建成功' : '知识库设置已保存');
    createModalVisible.value = false;
    loadData();
  } catch (error: any) {
    if (!error.errorFields) {
      message.error(error.message || '创建失败');
    }
  } finally {
    createLoading.value = false;
  }
}

/** 在当前页面打开真实详情，避免跳到未注册路由。Open real details without navigating to an unregistered route. */
function handleView(kb: KnowledgeBase) {
  selectedKnowledgeBase.value = kb;
  detailVisible.value = true;
}

function handleDocuments(kb: KnowledgeBase) {
  router.push({ path: '/DPP/KnowledgeBase/documents', query: { id: kb.id, name: kb.name } });
}

function handleRetrievalTest(kb: KnowledgeBase) {
  router.push({ path: '/DPP/KnowledgeBase/retrieval-test', query: { id: kb.id, name: kb.name } });
}

/** 复用完整配置表单并只发送可编辑配置。Reuse the complete form for editable knowledge-base settings. */
function handleSettings(kb: KnowledgeBase) {
  editingId.value = kb.id;
  Object.assign(createForm, { name: kb.name, description: kb.description || '', embeddingModelId: kb.embeddingModelId, vectorDbType: kb.vectorDbType, chunkStrategy: kb.chunkStrategy, chunkSize: kb.chunkSize, chunkOverlap: kb.chunkOverlap, retrievalMethod: kb.retrievalMethod, topK: kb.topK, scoreThreshold: kb.scoreThreshold, rerankEnabled: kb.rerankEnabled });
  createModalVisible.value = true;
}

/** 将归档交由已有更新接口，并等待真实结果。Persist archive state through the existing update API. */
async function handleMenuClick(key: string, kb: KnowledgeBase) {
  if (key === 'rebuild') {
    try {
      await rebuildKnowledgeBase(kb.id);
      message.success('开始重建索引');
      loadData();
    } catch (error) {
      message.error('重建索引失败');
    }
  } else if (key === 'archive') {
    Modal.confirm({ title: '归档知识库', content: `归档“${kb.name}”后可以在已归档筛选中查看。`,
      /** 只有服务器确认后才显示归档完成。Report archive completion only after server confirmation. */
      async onOk() { await updateKnowledgeBase(kb.id, { status: 'archived' }); message.success('知识库已归档'); await loadData(); },
    });
  } else if (key === 'delete') {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除知识库 "${kb.name}" 吗？此操作不可恢复。`,
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteKnowledgeBase(kb.id);
          message.success('删除成功');
          loadData();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  }
}

onMounted(() => {
  loadData();
  loadEmbeddingModels();
});
</script>

<style lang="scss" scoped>
.knowledge-base {
  padding: 16px;
  min-height: 100%;
  background: hsl(var(--background-deep));

  &__header {
    margin-bottom: 16px;
    border-radius: 12px;
  }

  &__title-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
  }

  &__title {
    font-size: 24px;
    font-weight: 600;
    color: hsl(var(--foreground));
    margin: 0 0 8px 0;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__subtitle {
    font-size: 14px;
    color: hsl(var(--muted-foreground));
    margin: 0;
  }

  &__filters {
    display: flex;
    gap: 12px;
  }

  &__content {
    min-height: 400px;
  }
}

.kb-card {
  height: 100%;
  border-radius: 12px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    color: #fff;
    font-size: 24px;
  }

  &__body {
    margin-bottom: 16px;
  }

  &__name {
    font-size: 16px;
    font-weight: 600;
    color: hsl(var(--foreground));
    margin-bottom: 8px;
  }

  &__desc {
    font-size: 13px;
    color: hsl(var(--muted-foreground));
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &__stats {
    display: flex;
    justify-content: space-between;
    padding: 12px 0;
    border-top: 1px solid hsl(var(--border));
    border-bottom: 1px solid hsl(var(--border));
    margin-bottom: 12px;
  }

  &__stat {
    text-align: center;
  }

  &__stat-value {
    display: block;
    font-size: 18px;
    font-weight: 600;
    color: hsl(var(--foreground));
  }

  &__stat-label {
    font-size: 12px;
    color: hsl(var(--muted-foreground));
  }

  &__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: hsl(var(--muted-foreground));
  }

  &__method {
    display: flex;
    align-items: center;
    gap: 4px;
  }
}
</style>
