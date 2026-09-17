<script lang="ts" setup>
import BusinessPage from '#/components/workspace/BusinessPage.vue';
import type { Ref } from 'vue';

import { computed, inject, onMounted, ref, watch } from 'vue';

import {
  Alert,
  Button,
  Descriptions,
  DescriptionsItem,
  Empty,
  Input,
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
  ExperimentOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons-vue';

import type { DatasetItem } from '../../SMP/api/types';

import { fetchDatasetList } from '../../SMP/api/dataset';
import {
  fetchRecommendationTrainingRuns,
  runRecommendationTraining,
  type RecommendationTrainingRun,
} from './api';

interface SelectedOrganization {
  deptUid: null | string;
  level: number;
  teamUid: null | string;
  tenantUid: null | string;
}

interface ParsedMetrics {
  model_sha256?: string;
  row_counts?: Record<string, number>;
  test_metrics?: Record<string, number>;
}

const currentUserInfo = inject<Ref<any>>('currentUserInfo', ref(null));
const selectedOrganization = inject<Ref<SelectedOrganization>>(
  'selectedOrganization',
  ref({ deptUid: null, level: 0, teamUid: null, tenantUid: null }),
);

const loading = ref(false);
const training = ref(false);
const datasets = ref<DatasetItem[]>([]);
const runs = ref<RecommendationTrainingRun[]>([]);
const selectedDatasetId = ref<number>();
const approvalId = ref('');

const columns = [
  { key: 'run', title: '运行标识', width: 250 },
  { dataIndex: 'productVersion', key: 'productVersion', title: '数据产品版本', width: 230 },
  { key: 'status', title: '状态', width: 100 },
  { key: 'metrics', title: '测试指标', width: 260 },
  { key: 'modelDigest', title: '模型摘要', width: 220 },
  { key: 'approval', title: '审批号', width: 180 },
  { key: 'time', title: '完成时间', width: 170 },
];

const eligibleDatasets = computed(() =>
  datasets.value.filter(
    (dataset) => dataset.sourcePlatform === 'XnetDataOps' && dataset.importStatus === 'ready',
  ),
);
const selectedDataset = computed(() =>
  eligibleDatasets.value.find((dataset) => dataset.id === selectedDatasetId.value),
);
const successfulRuns = computed(() => runs.value.filter((run) => run.status === 'succeeded'));
const latestMetrics = computed(() => parseMetrics(successfulRuns.value[0]?.metricsJson));

/** 加载当前租户可训练的数据集与运行记录。 */
async function loadPageData() {
  const tenantUid = selectedOrganization.value.tenantUid;
  loading.value = true;
  try {
    datasets.value = await fetchDatasetList();
    if (tenantUid) {
      runs.value = await fetchRecommendationTrainingRuns(tenantUid);
    } else {
      runs.value = [];
    }
    if (!selectedDatasetId.value && eligibleDatasets.value.length > 0) {
      selectedDatasetId.value = eligibleDatasets.value[0]?.id;
    }
  } catch (error: any) {
    message.error(`加载推荐训练数据失败: ${error?.message || '未知错误'}`);
  } finally {
    loading.value = false;
  }
}

/** 校验组织、数据集和审批号后启动真实 CPU DCN 训练。 */
async function startTraining() {
  const tenantUid = selectedOrganization.value.tenantUid;
  const userId = currentUserInfo.value?.userId;
  if (!tenantUid || !selectedOrganization.value.teamUid || !userId) {
    message.error('请先在顶部组织选择器中选择具体团队');
    return;
  }
  if (!selectedDatasetId.value) {
    message.error('请选择 DataOps 数据产品');
    return;
  }
  if (!approvalId.value.trim()) {
    message.error('请输入审批号');
    return;
  }
  training.value = true;
  try {
    const run = await runRecommendationTraining(
      selectedDatasetId.value,
      tenantUid,
      userId,
      approvalId.value.trim(),
      createIdempotencyKey(),
    );
    message.success(`训练完成，运行标识 ${run.runUid}`);
    approvalId.value = '';
    await loadPageData();
  } catch (error: any) {
    message.error(`训练失败: ${error?.message || '未知错误'}`);
  } finally {
    training.value = false;
  }
}

/** 生成一次性幂等键，防止训练按钮重复触发。 */
function createIdempotencyKey() {
  const entropy = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  return `MTP-REC-${entropy}`;
}

/** 解析后端保存的训练指标 JSON。 */
function parseMetrics(value?: string): ParsedMetrics {
  if (!value) return {};
  try {
    return JSON.parse(value) as ParsedMetrics;
  } catch {
    return {};
  }
}

/** 返回训练状态对应的语义颜色。 */
function statusColor(status: RecommendationTrainingRun['status']) {
  return { failed: 'error', running: 'processing', succeeded: 'success' }[status];
}

/** 返回训练状态的中文文本。 */
function statusLabel(status: RecommendationTrainingRun['status']) {
  return { failed: '失败', running: '训练中', succeeded: '已完成' }[status];
}

/** 将指标格式化为四位小数。 */
function formatMetric(value?: number) {
  return value == null ? '-' : Number(value).toFixed(4);
}

/** 将记录数格式化为本地数字。 */
function formatCount(value?: number) {
  return value == null ? '-' : Number(value).toLocaleString('zh-CN');
}

/** 将长摘要缩短显示并保留复制能力。 */
function shortDigest(value?: string) {
  return value ? `${value.slice(0, 10)}...${value.slice(-6)}` : '-';
}

/** 将后端时间转换为浏览器本地时间。 */
function formatTime(value?: string) {
  return value ? new Date(value).toLocaleString('zh-CN') : '-';
}

watch(() => selectedOrganization.value.tenantUid, loadPageData);
onMounted(loadPageData);
</script>

<template>
  <BusinessPage domain="模型研发" description="连接算法、训练记录与模型证据，让每一次迭代都有据可循。" existing-title>
  <div class="training-page">
    <header class="page-header">
      <div>
        <h1>推荐模型训练</h1>
        <p>使用 XnetDataOps 已发布数据产品训练可审计的 CPU DCN 模型。</p>
      </div>
      <Button :loading="loading" @click="loadPageData">
        <template #icon><ReloadOutlined /></template>
        刷新
      </Button>
    </header>

    <Alert
      class="training-boundary"
      message="训练前置校验"
      description="MTP 会重新检查租户归属、DataOps 发布状态、Schema 摘要和制品摘要；浏览器不能指定文件路径或 SQL。"
      show-icon
      type="info"
    />

    <section class="metric-band" aria-label="推荐训练摘要">
      <Statistic title="可训练数据集" :value="eligibleDatasets.length" />
      <Statistic title="成功运行" :value="successfulRuns.length" />
      <Statistic title="最新测试 AUC" :value="latestMetrics.test_metrics?.auc ?? 0" :formatter="() => formatMetric(latestMetrics.test_metrics?.auc)" />
      <Statistic title="最新测试 F1" :value="latestMetrics.test_metrics?.f1 ?? 0" :formatter="() => formatMetric(latestMetrics.test_metrics?.f1)" />
    </section>

    <section class="run-control">
      <div class="control-heading">
        <div>
          <h2>启动受控训练</h2>
          <p>当前运行默认 3 个 epoch，训练完成后生成模型卡、指标和模型摘要。</p>
        </div>
        <Tag color="warning"><SafetyCertificateOutlined /> D3 审批</Tag>
      </div>
      <div class="control-grid">
        <label>
          <span>DataOps 数据产品</span>
          <Select v-model:value="selectedDatasetId" placeholder="请选择已导入数据集">
            <SelectOption v-for="dataset in eligibleDatasets" :key="dataset.id" :value="dataset.id">
              {{ dataset.sourceProductVersion }} · {{ formatCount(dataset.rowCount) }} 条
            </SelectOption>
          </Select>
        </label>
        <label>
          <span>审批号</span>
          <Input v-model:value="approvalId" placeholder="例如 APR-MTP-20260828-001" />
        </label>
        <Button :disabled="!selectedDatasetId" :loading="training" type="primary" @click="startTraining">
          <template #icon><ExperimentOutlined /></template>
          启动训练
        </Button>
      </div>
      <Descriptions v-if="selectedDataset" bordered class="dataset-contract" size="small" :column="2">
        <DescriptionsItem label="产品版本">{{ selectedDataset.sourceProductVersion }}</DescriptionsItem>
        <DescriptionsItem label="训练记录">{{ formatCount(selectedDataset.rowCount) }}</DescriptionsItem>
        <DescriptionsItem label="Schema 摘要">
          <TypographyText :copyable="{ text: selectedDataset.schemaDigestSha256 || '' }">
            {{ shortDigest(selectedDataset.schemaDigestSha256) }}
          </TypographyText>
        </DescriptionsItem>
        <DescriptionsItem label="制品摘要">
          <TypographyText :copyable="{ text: selectedDataset.artifactDigestSha256 || '' }">
            {{ shortDigest(selectedDataset.artifactDigestSha256) }}
          </TypographyText>
        </DescriptionsItem>
      </Descriptions>
    </section>

    <section class="runs-section">
      <div class="section-heading">
        <h2>训练运行与证据</h2>
        <p>所有结果均来自 MTP 运行审计表。</p>
      </div>
      <Table
        :columns="columns"
        :data-source="runs"
        :loading="loading"
        :pagination="{ pageSize: 10, showSizeChanger: false }"
        :row-key="(record: RecommendationTrainingRun) => record.runUid"
        :scroll="{ x: 1410 }"
        size="middle"
      >
        <template #emptyText><Empty description="暂无推荐训练运行" /></template>
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'run'">
            <div class="run-cell">
              <strong>{{ record.runUid }}</strong>
              <span>{{ record.artifactReference }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'status'">
            <Tooltip :title="record.errorSummary || ''">
              <Tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</Tag>
            </Tooltip>
          </template>
          <template v-else-if="column.key === 'metrics'">
            <Space v-if="record.metricsJson" size="small">
              <Tag>AUC {{ formatMetric(parseMetrics(record.metricsJson).test_metrics?.auc) }}</Tag>
              <Tag>F1 {{ formatMetric(parseMetrics(record.metricsJson).test_metrics?.f1) }}</Tag>
              <Tag>ACC {{ formatMetric(parseMetrics(record.metricsJson).test_metrics?.accuracy) }}</Tag>
            </Space>
            <span v-else>-</span>
          </template>
          <template v-else-if="column.key === 'modelDigest'">
            <TypographyText v-if="record.modelDigestSha256" :copyable="{ text: record.modelDigestSha256 }">
              {{ shortDigest(record.modelDigestSha256) }}
            </TypographyText>
            <span v-else>-</span>
          </template>
          <template v-else-if="column.key === 'approval'">{{ record.approvalId }}</template>
          <template v-else-if="column.key === 'time'">
            {{ formatTime(record.completedAt || record.startedAt) }}
          </template>
        </template>
      </Table>
    </section>
  </div>

  </BusinessPage>
</template>

<style scoped>
.training-page {
  max-width: 1480px;
  margin: 0 auto;
  padding: 24px;
}

.page-header,
.control-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.page-header h1,
.control-heading h2,
.section-heading h2 {
  margin: 0;
  color: var(--ant-color-text);
  letter-spacing: 0;
}

.page-header h1 {
  font-size: 24px;
  line-height: 32px;
}

.control-heading h2,
.section-heading h2 {
  font-size: 16px;
  line-height: 24px;
}

.page-header p,
.control-heading p,
.section-heading p {
  margin: 6px 0 0;
  color: var(--ant-color-text-secondary);
}

.training-boundary {
  margin-top: 20px;
}

.metric-band {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
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

.run-control {
  padding-bottom: 24px;
  border-bottom: 1px solid var(--ant-color-border-secondary);
}

.control-grid {
  display: grid;
  grid-template-columns: minmax(280px, 1.4fr) minmax(250px, 1fr) auto;
  align-items: end;
  gap: 14px;
  margin-top: 16px;
}

.control-grid label {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 7px;
}

.control-grid label > span {
  color: var(--ant-color-text-secondary);
  font-size: 13px;
}

.dataset-contract {
  margin-top: 16px;
}

.runs-section {
  margin-top: 24px;
}

.section-heading {
  margin-bottom: 14px;
}

.run-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.run-cell span {
  color: var(--ant-color-text-secondary);
  font-size: 12px;
}

@media (max-width: 900px) {
  .training-page {
    padding: 16px;
  }

  .page-header,
  .control-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .metric-band {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    row-gap: 18px;
  }

  .metric-band :deep(.ant-statistic:nth-child(2)) {
    border-right: 0;
  }

  .control-grid {
    grid-template-columns: 1fr;
  }
}
</style>
