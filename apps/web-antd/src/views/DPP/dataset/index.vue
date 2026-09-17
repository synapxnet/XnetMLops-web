<script lang="ts" setup>
import BusinessPage from '#/components/workspace/BusinessPage.vue';
import type { Ref } from 'vue';

import { computed, inject, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  Alert,
  Button,
  Descriptions,
  DescriptionsItem,
  Empty,
  Input,
  Modal,
  Select,
  SelectOption,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  TypographyText,
  message,
} from 'ant-design-vue';
import {
  CloudDownloadOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';

import type { DatasetItem } from '../../SMP/api/types';

import {
  deleteDataset,
  fetchDataOpsProducts,
  fetchDatasetList,
  importDataOpsProduct,
  type DataOpsProduct,
} from '../../SMP/api/dataset';

interface SelectedOrganization {
  deptUid: null | string;
  level: number;
  teamUid: null | string;
  tenantUid: null | string;
}

const router = useRouter();
const currentUserInfo = inject<Ref<any>>('currentUserInfo', ref(null));
const selectedOrganization = inject<Ref<SelectedOrganization>>(
  'selectedOrganization',
  ref({ deptUid: null, level: 0, teamUid: null, tenantUid: null }),
);

const loading = ref(false);
const readError = ref('');
const importing = ref(false);
const productLoading = ref(false);
const importVisible = ref(false);
const datasets = ref<DatasetItem[]>([]);
const dataOpsProducts = ref<DataOpsProduct[]>([]);
const searchName = ref('');
const sourceFilter = ref('');

const columns = [
  { dataIndex: 'dataset_file', key: 'name', title: '数据集名称', width: 270 },
  { key: 'source', title: '来源', width: 150 },
  { key: 'version', title: '产品版本', width: 220 },
  { key: 'rowCount', title: '记录数', width: 110 },
  { key: 'organization', title: '所属组织', width: 180 },
  { key: 'status', title: '导入状态', width: 110 },
  { key: 'updatedAt', title: '更新时间', width: 170 },
  { key: 'actions', title: '操作', width: 130, fixed: 'right' as const },
];

const productColumns = [
  { key: 'version', title: 'DataOps 产品版本', width: 250 },
  { key: 'status', title: '状态', width: 100 },
  { key: 'rows', title: '记录数', width: 110 },
  { key: 'labels', title: '标签分布', width: 180 },
  { key: 'action', title: '操作', width: 110, fixed: 'right' as const },
];

const importedVersions = computed(
  () => new Set(datasets.value.map((dataset) => dataset.sourceProductVersion).filter(Boolean)),
);
const filteredDatasets = computed(() =>
  datasets.value.filter((dataset) => {
    const nameMatched = dataset.dataset_file
      .toLowerCase()
      .includes(searchName.value.trim().toLowerCase());
    const sourceMatched = sourceFilter.value
      ? getSourceLabel(dataset) === sourceFilter.value
      : true;
    return nameMatched && sourceMatched;
  }),
);
const totalRows = computed(() =>
  datasets.value.reduce((total, dataset) => total + Number(dataset.rowCount || 0), 0),
);
const dataOpsDatasetCount = computed(
  () => datasets.value.filter((dataset) => dataset.sourcePlatform === 'XnetDataOps').length,
);

/** 从后端读取数据集元数据，失败不能显示为零条数据。 Read dataset metadata without presenting failures as zero records. */
async function loadDatasets() {
  loading.value = true;
  try {
    datasets.value = await fetchDatasetList();
    readError.value = '';
  } catch (error: any) {
    readError.value = '数据集读取失败，请检查服务与权限后重试。';
    message.error(`加载数据集失败: ${error?.message || '未知错误'}`);
  } finally {
    loading.value = false;
  }
}

/** 打开普通文件数据集创建页面。 */
function createFileDataset() {
  router.push({ path: '/DPP/dataset/datafileCreate' });
}

/** 加载 DataOps 产品并打开导入窗口。 */
async function openDataOpsImport() {
  importVisible.value = true;
  productLoading.value = true;
  try {
    dataOpsProducts.value = await fetchDataOpsProducts();
  } catch (error: any) {
    message.error(`读取 DataOps 数据产品失败: ${error?.message || '未知错误'}`);
  } finally {
    productLoading.value = false;
  }
}

/** 使用当前企业组织身份导入已发布的数据产品。 */
async function importProduct(product: DataOpsProduct) {
  const organization = selectedOrganization.value;
  const userId = currentUserInfo.value?.userId;
  if (!userId || !organization.tenantUid || !organization.teamUid) {
    message.error('请先在顶部组织选择器中选择具体团队');
    return;
  }
  importing.value = true;
  try {
    await importDataOpsProduct(product.productVersion, {
      deptUid: organization.deptUid,
      level: organization.level,
      teamName: organization.teamUid,
      teamUid: organization.teamUid,
      tenantUid: organization.tenantUid,
      userId,
    });
    message.success('DataOps 数据产品已导入 MLOps');
    await loadDatasets();
  } catch (error: any) {
    message.error(`导入失败: ${error?.message || '未知错误'}`);
  } finally {
    importing.value = false;
  }
}

/** 打开数据集详情页面。 */
function openDataset(dataset: DatasetItem) {
  router.push({
    path: '/DPP/dataset/datafileModify',
    query: { id: dataset.id },
  });
}

/** 删除前要求用户二次确认，并在完成后刷新列表。 */
function confirmDelete(dataset: DatasetItem) {
  Modal.confirm({
    cancelText: '取消',
    content: `确认删除数据集“${dataset.dataset_file}”吗？`,
    okButtonProps: { danger: true },
    okText: '删除',
    title: '删除数据集',
    async onOk() {
      await deleteDataset(dataset.id);
      message.success('数据集已删除');
      await loadDatasets();
    },
  });
}

/** 返回数据集的真实来源平台名称。 */
function getSourceLabel(dataset: DatasetItem) {
  return dataset.sourcePlatform || (dataset.type === 'POSTGRESQL_DATA_PRODUCT' ? 'XnetDataOps' : '本地上传');
}

/** 返回数据集来源对应的语义颜色。 */
function getSourceColor(dataset: DatasetItem) {
  return getSourceLabel(dataset) === 'XnetDataOps' ? 'cyan' : 'default';
}

/** 返回导入状态对应的语义颜色。 */
function getImportStatusColor(status?: string) {
  return {
    failed: 'error',
    importing: 'processing',
    ready: 'success',
  }[status || ''] || 'default';
}

/** 返回导入状态的中文文本。 */
function getImportStatusLabel(status?: string) {
  return {
    failed: '失败',
    importing: '导入中',
    ready: '可训练',
  }[status || ''] || '普通数据集';
}

/** 格式化记录数并为缺失值返回短横线。 */
function formatCount(value?: number) {
  return value == null ? '-' : Number(value).toLocaleString('zh-CN');
}

/** 格式化后端时间为当前浏览器本地时间。 */
function formatTime(value?: string) {
  return value ? new Date(value).toLocaleString('zh-CN') : '-';
}

/** 缩短摘要显示并保留首尾识别信息。 */
function shortDigest(value?: string) {
  return value ? `${value.slice(0, 10)}...${value.slice(-6)}` : '-';
}

onMounted(loadDatasets);
</script>

<template>
  <BusinessPage domain="数据准备" description="从数据集、特征到知识库，组织好训练与检索所需的数据。" existing-title :error="readError" :loading="loading" @retry="loadDatasets">
  <div class="dataset-page">
    <header class="page-header">
      <div>
        <h1>数据集</h1>
        <p>管理本地数据与 XnetDataOps 发布的版本化训练数据产品。</p>
      </div>
      <Space wrap>
        <Button :loading="loading" @click="loadDatasets">
          <template #icon><ReloadOutlined /></template>
          刷新
        </Button>
        <Button @click="createFileDataset">
          <template #icon><PlusOutlined /></template>
          新增文件数据集
        </Button>
        <Button type="primary" @click="openDataOpsImport">
          <template #icon><CloudDownloadOutlined /></template>
          从 DataOps 导入
        </Button>
      </Space>
    </header>

    <Alert
      class="source-alert"
      message="导入边界"
      description="MLOps 只接受 DataOps 已发布版本，并保存来源、行数、Schema 摘要、制品摘要与血缘引用。"
      show-icon
      type="info"
    />

    <section class="metric-band" aria-label="数据集摘要">
      <Statistic title="数据集总数" :value="datasets.length" />
      <Statistic title="DataOps 数据产品" :value="dataOpsDatasetCount" />
      <Statistic title="已登记训练记录" :value="formatCount(totalRows)" />
    </section>

    <section class="dataset-section">
      <div class="toolbar">
        <Input v-model:value="searchName" allow-clear placeholder="搜索数据集名称" />
        <Select v-model:value="sourceFilter" allow-clear placeholder="全部来源">
          <SelectOption value="XnetDataOps">XnetDataOps</SelectOption>
          <SelectOption value="本地上传">本地上传</SelectOption>
        </Select>
      </div>

      <Table
        :columns="columns"
        :data-source="filteredDatasets"
        :loading="loading"
        :pagination="{ pageSize: 12, showSizeChanger: false }"
        :row-key="(record: DatasetItem) => record.id"
        :scroll="{ x: 1250 }"
        size="middle"
      >
        <template #emptyText><Empty description="暂无数据集" /></template>
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <Button class="dataset-name" type="link" @click="openDataset(record as DatasetItem)">
              {{ record.dataset_file }}
            </Button>
          </template>
          <template v-else-if="column.key === 'source'">
            <Tag :color="getSourceColor(record as DatasetItem)">{{ getSourceLabel(record as DatasetItem) }}</Tag>
          </template>
          <template v-else-if="column.key === 'version'">
            <TypographyText>{{ record.sourceProductVersion || '-' }}</TypographyText>
          </template>
          <template v-else-if="column.key === 'rowCount'">
            <TypographyText strong>{{ formatCount(record.rowCount) }}</TypographyText>
          </template>
          <template v-else-if="column.key === 'organization'">
            <div class="organization-cell">
              <span>{{ record.team_name || record.team_uid }}</span>
              <small>{{ record.tenant_uid }}</small>
            </div>
          </template>
          <template v-else-if="column.key === 'status'">
            <Tag :color="getImportStatusColor(record.importStatus)">
              {{ getImportStatusLabel(record.importStatus) }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'updatedAt'">
            {{ formatTime(record.importedAt || record.updated_at || record.created_at) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <Space>
              <Button size="small" type="link" @click="openDataset(record as DatasetItem)">详情</Button>
              <Tooltip title="删除数据集">
                <Button danger size="small" type="text" @click="confirmDelete(record as DatasetItem)">
                  <template #icon><DeleteOutlined /></template>
                </Button>
              </Tooltip>
            </Space>
          </template>
        </template>
        <template #expandedRowRender="{ record }">
          <Descriptions bordered size="small" :column="2">
            <DescriptionsItem label="来源 URI">{{ record.sourceUri || '-' }}</DescriptionsItem>
            <DescriptionsItem label="血缘引用">{{ record.lineageReference || '-' }}</DescriptionsItem>
            <DescriptionsItem label="Schema 摘要">
              <TypographyText :copyable="record.schemaDigestSha256 ? { text: record.schemaDigestSha256 } : false">
                {{ shortDigest(record.schemaDigestSha256) }}
              </TypographyText>
            </DescriptionsItem>
            <DescriptionsItem label="制品摘要">
              <TypographyText :copyable="record.artifactDigestSha256 ? { text: record.artifactDigestSha256 } : false">
                {{ shortDigest(record.artifactDigestSha256) }}
              </TypographyText>
            </DescriptionsItem>
            <DescriptionsItem label="数据区域">{{ record.zone_label || record.zone }}</DescriptionsItem>
            <DescriptionsItem label="创建者">{{ record.userId }}</DescriptionsItem>
            <DescriptionsItem label="描述" :span="2">{{ record.description || '-' }}</DescriptionsItem>
          </Descriptions>
        </template>
      </Table>
    </section>

    <Modal
      v-model:open="importVisible"
      :footer="null"
      title="从 XnetDataOps 导入"
      width="920px"
    >
      <Alert
        class="import-alert"
        message="当前组织归属由登录网关注入"
        show-icon
        type="warning"
      />
      <Table
        :columns="productColumns"
        :data-source="dataOpsProducts"
        :loading="productLoading"
        :pagination="false"
        :row-key="(record: DataOpsProduct) => record.productVersion"
        :scroll="{ x: 780 }"
        size="middle"
      >
        <template #emptyText><Empty description="DataOps 暂无可用数据产品" /></template>
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'version'">
            <div class="product-cell">
              <strong>{{ record.productVersion }}</strong>
              <span>{{ record.productName }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'status'">
            <Tag :color="record.status === 'published' ? 'success' : 'warning'">
              {{ record.status === 'published' ? '已发布' : '未发布' }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'rows'">{{ formatCount(record.rowCount) }}</template>
          <template v-else-if="column.key === 'labels'">
            正 {{ formatCount(record.positiveCount) }} / 负 {{ formatCount(record.negativeCount) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <Button
              :disabled="record.status !== 'published' || importedVersions.has(record.productVersion)"
              :loading="importing"
              size="small"
              type="primary"
              @click="importProduct(record as DataOpsProduct)"
            >
              {{ importedVersions.has(record.productVersion) ? '已导入' : '导入' }}
            </Button>
          </template>
        </template>
      </Table>
    </Modal>
  </div>

  </BusinessPage>
</template>

<style scoped>
.dataset-page {
  max-width: 1480px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.page-header h1 {
  margin: 0;
  color: var(--ant-color-text);
  font-size: 24px;
  line-height: 32px;
  letter-spacing: 0;
}

.page-header p {
  margin: 6px 0 0;
  color: var(--ant-color-text-secondary);
}

.source-alert {
  margin-top: 20px;
}

.metric-band {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 24px 0;
  padding: 20px 0;
  border-top: 1px solid var(--ant-color-border-secondary);
  border-bottom: 1px solid var(--ant-color-border-secondary);
}

.metric-band :deep(.ant-statistic) {
  padding: 0 24px;
  border-right: 1px solid var(--ant-color-border-secondary);
}

.metric-band :deep(.ant-statistic:first-child) {
  padding-left: 0;
}

.metric-band :deep(.ant-statistic:last-child) {
  border-right: 0;
}

.toolbar {
  display: grid;
  grid-template-columns: minmax(240px, 420px) 180px;
  gap: 12px;
  margin-bottom: 14px;
}

.dataset-name {
  max-width: 250px;
  height: auto;
  overflow: hidden;
  padding: 0;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.organization-cell,
.product-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.organization-cell small,
.product-cell span {
  color: var(--ant-color-text-secondary);
  font-size: 12px;
}

.import-alert {
  margin-bottom: 16px;
}

@media (max-width: 820px) {
  .dataset-page {
    padding: 16px;
  }

  .page-header {
    align-items: stretch;
    flex-direction: column;
  }

  .metric-band {
    grid-template-columns: 1fr;
    row-gap: 18px;
  }

  .metric-band :deep(.ant-statistic) {
    padding: 0;
    border-right: 0;
  }

  .toolbar {
    grid-template-columns: 1fr;
  }
}
</style>
