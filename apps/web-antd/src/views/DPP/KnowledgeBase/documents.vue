<template>
  <BusinessPage domain="数据准备" description="从数据集、特征到知识库，组织好训练与检索所需的数据。" existing-title>
  <div class="kb-documents">
    <Card class="kb-documents__header">
      <div class="kb-documents__title-row">
        <div class="kb-documents__back">
          <Button @click="goBack">
            <template #icon><ArrowLeftOutlined /></template>
            返回知识库列表
          </Button>
        </div>
        <div class="kb-documents__info">
          <h2 class="kb-documents__title">
            <FolderOpenOutlined />
            {{ kbName }} - 文档管理
          </h2>
          <p class="kb-documents__subtitle">
            管理知识库中的文档，上传新文档或重新索引已有文档
          </p>
        </div>
        <div class="kb-documents__actions">
          <Button @click="handleRefresh">
            <template #icon><ReloadOutlined /></template>
            刷新
          </Button>
          <Button type="primary" @click="handleUpload">
            <template #icon><UploadOutlined /></template>
            上传文档
          </Button>
        </div>
      </div>

      <!-- 搜索和筛选 -->
      <div class="kb-documents__filters">
        <Input
          v-model:value="searchKeyword"
          placeholder="搜索文档..."
          style="width: 300px"
          allow-clear
          @pressEnter="loadDocuments"
        >
          <template #prefix><SearchOutlined /></template>
        </Input>
        <Select
          v-model:value="statusFilter"
          placeholder="状态筛选"
          style="width: 150px"
          allow-clear
          @change="loadDocuments"
        >
          <SelectOption value="pending">待处理</SelectOption>
          <SelectOption value="processing">处理中</SelectOption>
          <SelectOption value="completed">已完成</SelectOption>
          <SelectOption value="failed">失败</SelectOption>
        </Select>
      </div>
    </Card>

    <!-- 文档统计 -->
    <Row :gutter="16" class="kb-documents__stats">
      <Col :span="6">
        <Card class="stat-card">
          <Statistic
            title="总文档数"
            :value="stats.total"
            :value-style="{ color: '#1890ff' }"
          >
            <template #prefix><FileTextOutlined /></template>
          </Statistic>
        </Card>
      </Col>
      <Col :span="6">
        <Card class="stat-card">
          <Statistic
            title="已完成"
            :value="stats.completed"
            :value-style="{ color: '#52c41a' }"
          >
            <template #prefix><CheckCircleOutlined /></template>
          </Statistic>
        </Card>
      </Col>
      <Col :span="6">
        <Card class="stat-card">
          <Statistic
            title="处理中"
            :value="stats.processing"
            :value-style="{ color: '#faad14' }"
          >
            <template #prefix><SyncOutlined spin /></template>
          </Statistic>
        </Card>
      </Col>
      <Col :span="6">
        <Card class="stat-card">
          <Statistic
            title="总分块数"
            :value="stats.totalChunks"
            :value-style="{ color: '#722ed1' }"
          >
            <template #prefix><BlockOutlined /></template>
          </Statistic>
        </Card>
      </Col>
    </Row>

    <!-- 文档列表 -->
    <Card class="kb-documents__content">
      <Table
        :data-source="filteredDocuments"
        :columns="columns"
        :loading="loading"
        :row-selection="rowSelection"
        row-key="id"
        :pagination="{ pageSize: 10, showSizeChanger: true, showTotal: (total: number) => `共 ${total} 条` }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="doc-name">
              <component :is="getFileIcon(record.type)" class="doc-name__icon" />
              <span class="doc-name__text">{{ record.name }}</span>
            </div>
          </template>

          <template v-if="column.key === 'status'">
            <Tag :color="getStatusColor(record.status)">
              <template v-if="record.status === 'processing'">
                <SyncOutlined spin />
              </template>
              {{ getStatusText(record.status) }}
            </Tag>
            <Progress
              v-if="record.status === 'processing'"
              :percent="record.processProgress"
              :show-info="false"
              size="small"
              style="width: 80px; margin-left: 8px"
            />
          </template>

          <template v-if="column.key === 'size'">
            {{ formatSize(record.fileSize) }}
          </template>

          <template v-if="column.key === 'chunks'">
            <span class="chunk-count">
              {{ record.chunkCount }}
              <span class="chunk-count__tokens">({{ record.tokenCount }} tokens)</span>
            </span>
          </template>

          <template v-if="column.key === 'createdAt'">
            {{ formatDate(record.createdAt) }}
          </template>

          <template v-if="column.key === 'action'">
            <Space>
              <Tooltip title="查看分块">
                <Button type="text" size="small" @click="handleViewChunks(record)">
                  <template #icon><EyeOutlined /></template>
                </Button>
              </Tooltip>
              <Tooltip title="重新索引">
                <Button
                  type="text"
                  size="small"
                  :disabled="record.status === 'processing'"
                  @click="handleReindex(record)"
                >
                  <template #icon><SyncOutlined /></template>
                </Button>
              </Tooltip>
              <Tooltip title="删除">
                <Button type="text" size="small" danger @click="handleDelete(record)">
                  <template #icon><DeleteOutlined /></template>
                </Button>
              </Tooltip>
            </Space>
          </template>
        </template>

        <template #expandedRowRender="{ record }">
          <div class="doc-detail">
            <Descriptions :column="3" size="small">
              <DescriptionsItem label="原始文件名">{{ record.originalName || record.name }}</DescriptionsItem>
              <DescriptionsItem label="MIME类型">{{ record.mimeType || '-' }}</DescriptionsItem>
              <DescriptionsItem label="文件哈希">{{ record.fileHash || '-' }}</DescriptionsItem>
              <DescriptionsItem label="字数">{{ record.wordCount }}</DescriptionsItem>
              <DescriptionsItem label="字符数">{{ record.charCount }}</DescriptionsItem>
              <DescriptionsItem label="页数">{{ record.pageCount || '-' }}</DescriptionsItem>
              <DescriptionsItem label="来源">{{ getSourceText(record.sourceType) }}</DescriptionsItem>
              <DescriptionsItem label="索引时间">{{ record.indexedAt ? formatDate(record.indexedAt) : '-' }}</DescriptionsItem>
              <DescriptionsItem label="上传者">{{ record.uploadedBy || '-' }}</DescriptionsItem>
            </Descriptions>
            <div v-if="record.errorMessage" class="doc-error">
              <ExclamationCircleOutlined />
              {{ record.errorMessage }}
            </div>
          </div>
        </template>
      </Table>

      <!-- 批量操作 -->
      <div v-if="selectedDocIds.length > 0" class="batch-actions">
        <span class="batch-actions__count">已选择 {{ selectedDocIds.length }} 个文档</span>
        <Button size="small" @click="handleBatchReindex">批量重新索引</Button>
        <Button size="small" danger @click="handleBatchDelete">批量删除</Button>
      </div>
    </Card>

    <!-- 上传文档弹窗 -->
    <DocumentUpload
      v-model:open="uploadModalVisible"
      :kb-id="kbId"
      @success="handleUploadSuccess"
    />

    <!-- 分块查看抽屉 -->
    <ChunkViewer
      v-model:open="chunkViewerVisible"
      :kb-id="kbId"
      :doc-id="currentDocId"
      :doc-name="currentDocName"
    />
  </div>

  </BusinessPage>
</template>

<script setup lang="ts">
import BusinessPage from '#/components/workspace/BusinessPage.vue';
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Card,
  Button,
  Input,
  Select,
  SelectOption,
  Row,
  Col,
  Table,
  Tag,
  Space,
  Tooltip,
  Progress,
  Statistic,
  Descriptions,
  DescriptionsItem,
  Modal,
  message,
} from 'ant-design-vue';
import {
  ArrowLeftOutlined,
  FolderOpenOutlined,
  UploadOutlined,
  ReloadOutlined,
  SearchOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileMarkdownOutlined,
  FileOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  BlockOutlined,
  EyeOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons-vue';

import type { KBDocument } from './types';
import { fetchDocuments, deleteDocument, reindexDocument } from './api';
import DocumentUpload from './components/DocumentUpload.vue';
import ChunkViewer from './components/ChunkViewer.vue';

const route = useRoute();
const router = useRouter();

// 路由参数
const kbId = computed(() => Number(route.query.id));
const kbName = computed(() => (route.query.name as string) || '知识库');

// 状态
const loading = ref(false);
const documents = ref<KBDocument[]>([]);
const searchKeyword = ref('');
const statusFilter = ref<string | undefined>(undefined);
const selectedDocIds = ref<number[]>([]);

// 弹窗状态
const uploadModalVisible = ref(false);
const chunkViewerVisible = ref(false);
const currentDocId = ref(0);
const currentDocName = ref('');

// 统计信息
const stats = computed(() => {
  const docs = documents.value;
  return {
    total: docs.length,
    completed: docs.filter((d) => d.status === 'completed').length,
    processing: docs.filter((d) => d.status === 'processing').length,
    totalChunks: docs.reduce((sum, d) => sum + d.chunkCount, 0),
  };
});

// 表格列
const columns = [
  {
    title: '文档名称',
    dataIndex: 'name',
    key: 'name',
    width: 300,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 180,
  },
  {
    title: '大小',
    dataIndex: 'fileSize',
    key: 'size',
    width: 100,
  },
  {
    title: '分块数',
    dataIndex: 'chunkCount',
    key: 'chunks',
    width: 150,
  },
  {
    title: '上传时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 150,
  },
  {
    title: '操作',
    key: 'action',
    width: 150,
  },
];

// 行选择配置
const rowSelection = computed(() => ({
  selectedRowKeys: selectedDocIds.value,
  onChange: (selectedKeys: number[]) => {
    selectedDocIds.value = selectedKeys;
  },
}));

// 过滤后的文档
const filteredDocuments = computed(() => {
  let result = documents.value;

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter((doc) => doc.name.toLowerCase().includes(keyword));
  }

  if (statusFilter.value) {
    result = result.filter((doc) => doc.status === statusFilter.value);
  }

  return result;
});

// 文件图标映射
function getFileIcon(type: string) {
  const iconMap: Record<string, any> = {
    pdf: FilePdfOutlined,
    doc: FileWordOutlined,
    docx: FileWordOutlined,
    xls: FileExcelOutlined,
    xlsx: FileExcelOutlined,
    md: FileMarkdownOutlined,
    markdown: FileMarkdownOutlined,
    txt: FileTextOutlined,
  };
  return iconMap[type] || FileOutlined;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'default',
    processing: 'processing',
    completed: 'success',
    failed: 'error',
  };
  return colors[status] || 'default';
}

function getStatusText(status: string): string {
  const texts: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    completed: '已完成',
    failed: '失败',
  };
  return texts[status] || status;
}

function getSourceText(sourceType: string): string {
  const texts: Record<string, string> = {
    upload: '上传',
    url: 'URL导入',
    sync: '同步',
  };
  return texts[sourceType] || sourceType;
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
  return date.toLocaleString('zh-CN');
}

async function loadDocuments() {
  if (!kbId.value) return;

  loading.value = true;
  try {
    documents.value = await fetchDocuments(kbId.value, statusFilter.value);
  } catch (error) {
    message.error('加载文档列表失败');
  } finally {
    loading.value = false;
  }
}

function goBack() {
  router.push('/DPP/KnowledgeBase');
}

function handleRefresh() {
  loadDocuments();
}

function handleUpload() {
  uploadModalVisible.value = true;
}

function handleUploadSuccess() {
  loadDocuments();
}

function handleViewChunks(doc: KBDocument) {
  currentDocId.value = doc.id;
  currentDocName.value = doc.name;
  chunkViewerVisible.value = true;
}

async function handleReindex(doc: KBDocument) {
  try {
    await reindexDocument(kbId.value, doc.id);
    message.success('已开始重新索引');
    loadDocuments();
  } catch (error) {
    message.error('重新索引失败');
  }
}

function handleDelete(doc: KBDocument) {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除文档 "${doc.name}" 吗？相关的分块数据也将被删除。`,
    okType: 'danger',
    onOk: async () => {
      try {
        await deleteDocument(kbId.value, doc.id);
        message.success('删除成功');
        loadDocuments();
      } catch (error) {
        message.error('删除失败');
      }
    },
  });
}

async function handleBatchReindex() {
  if (selectedDocIds.value.length === 0) return;

  try {
    for (const docId of selectedDocIds.value) {
      await reindexDocument(kbId.value, docId);
    }
    message.success(`已开始重新索引 ${selectedDocIds.value.length} 个文档`);
    selectedDocIds.value = [];
    loadDocuments();
  } catch (error) {
    message.error('批量重新索引失败');
  }
}

function handleBatchDelete() {
  if (selectedDocIds.value.length === 0) return;

  Modal.confirm({
    title: '确认批量删除',
    content: `确定要删除选中的 ${selectedDocIds.value.length} 个文档吗？`,
    okType: 'danger',
    onOk: async () => {
      try {
        for (const docId of selectedDocIds.value) {
          await deleteDocument(kbId.value, docId);
        }
        message.success('批量删除成功');
        selectedDocIds.value = [];
        loadDocuments();
      } catch (error) {
        message.error('批量删除失败');
      }
    },
  });
}

onMounted(() => {
  loadDocuments();
});
</script>

<style lang="scss" scoped>
.kb-documents {
  padding: 16px;
  min-height: 100%;
  background: hsl(var(--background-deep));

  &__header {
    margin-bottom: 16px;
    border-radius: 12px;
  }

  &__title-row {
    display: flex;
    align-items: flex-start;
    gap: 24px;
    margin-bottom: 20px;
  }

  &__back {
    flex-shrink: 0;
  }

  &__info {
    flex: 1;
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

  &__actions {
    display: flex;
    gap: 8px;
  }

  &__filters {
    display: flex;
    gap: 12px;
  }

  &__stats {
    margin-bottom: 16px;
  }

  &__content {
    border-radius: 12px;
  }
}

.stat-card {
  border-radius: 12px;
  text-align: center;
}

.doc-name {
  display: flex;
  align-items: center;
  gap: 8px;

  &__icon {
    font-size: 18px;
    color: #1890ff;
  }

  &__text {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.chunk-count {
  &__tokens {
    color: hsl(var(--muted-foreground));
    font-size: 12px;
    margin-left: 4px;
  }
}

.doc-detail {
  padding: 16px;
  background: hsl(var(--muted));
  border-radius: 8px;
}

.doc-error {
  margin-top: 12px;
  padding: 8px 12px;
  background: hsl(var(--destructive) / 10%);
  border: 1px solid hsl(var(--destructive) / 35%);
  border-radius: 4px;
  color: #ff4d4f;
  display: flex;
  align-items: center;
  gap: 8px;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding: 12px;
  background: hsl(var(--primary) / 10%);
  border-radius: 8px;

  &__count {
    font-weight: 500;
    color: hsl(var(--primary));
  }
}
</style>
