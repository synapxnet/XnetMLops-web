<!-- Copyright (C) 2026 Synapxnet. All rights reserved.
Synapxnet Proprietary and Confidential. Unauthorized copying, distribution or use is forbidden.
基于授权训练记录的研发工作总览。Development overview based on authorized training records.
Author: maoyo | Department: 研发部 | Date: 2026-09-13 | Version: 1.0.0 | Security Level: INTERNAL
__version__: 1.0.0 | __author__: maoyo | __copyright__: Copyright 2026 Synapxnet
__maintainer__: maoyo | __email__: synapxnet@gmail.com -->
<script setup lang="ts">
import type { Ref } from 'vue';
import type { ModelEvidenceRun } from '#/views/MTP/model-evidence/model';
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Alert, Button, Empty, Select, Table, Tag } from 'ant-design-vue';
import { fetchModelEvidence } from '#/views/MTP/model-evidence/api';
import {
  metricDefinitions,
  validMetric,
} from '#/views/MTP/model-evidence/model';
import BusinessPage from './BusinessPage.vue';

const router = useRouter();
const organization = inject<Ref<{ tenantUid: null | string }>>(
  'selectedOrganization',
  ref({ tenantUid: null }),
);
const runs = ref<ModelEvidenceRun[]>([]);
const error = ref('');
const loading = ref(false);
const period = ref(30);
const capturedAt = ref('');
const selectedUid = ref('');
let generation = 0;
const links = [
  {
    name: '数据集',
    text: '版本、来源与导入',
    path: '/DPP/dataset/index',
    number: '01',
  },
  {
    name: '算法与训练',
    text: '从实验到运行记录',
    path: '/MTP/train/index',
    number: '02',
  },
  {
    name: '模型证据',
    text: '指标、样本与比较',
    path: '/MTP/model-evidence',
    number: '03',
  },
  {
    name: '服务交付',
    text: '部署配置与访问',
    path: '/MEP/deployment/index',
    number: '04',
  },
  {
    name: '资源与工作站',
    text: '连接计算环境',
    path: '/SMP/WorkstationManage/index',
    number: '05',
  },
  {
    name: '智能助手',
    text: '技能与任务协作',
    path: '/XAA/assistant/index',
    number: '06',
  },
];
const columns = [
  { title: '运行 / 数据版本', dataIndex: 'runUid', key: 'run', width: 240 },
  { title: '状态', key: 'status', width: 100 },
  { title: 'AUC', key: 'auc', width: 100 },
  { title: '完成时间', key: 'completed', width: 160 },
];
const statusLabels: Record<string, string> = {
  succeeded: '已完成',
  running: '训练中',
  failed: '失败',
  unknown: '未知',
};

/** 按真实记录时间筛选；缺失时间不强行纳入窗口。Filter by actual timestamps without inventing missing dates. */
function filteredRuns() {
  const boundary = Date.now() - period.value * 86_400_000;
  return runs.value.filter((run) => {
    const time = Date.parse(run.startedAt || run.completedAt || '');
    return Number.isFinite(time) && time >= boundary;
  });
}
const visibleRuns = computed(filteredRuns);
/** 在当前读取范围内选择记录，筛选变化不保留失效对象。Select a record within the current range without retaining an out-of-range object. */
function currentRun() {
  return (
    visibleRuns.value.find((run) => run.runUid === selectedUid.value) ??
    visibleRuns.value[0]
  );
}
const selectedRun = computed(currentRun);
/** 查看已有记录的指标与版本，不触发额外业务请求。Inspect recorded metrics and versions without another business request. */
function selectRun(uid: string) {
  selectedUid.value = uid;
}
/** 仅格式化有效指标，缺失值保持未知。Format valid metrics while preserving unavailable values. */
function metricValue(value?: number) {
  const metric = validMetric(value);
  return metric === null ? '—' : metric.toFixed(3);
}
/** 以可读时间显示来源字段，不生成缺失时间。Display source timestamps without inventing missing dates. */
function recordTime(value?: null | string) {
  if (!value) return '未提供';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '时间未知'
    : date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
}
/** 仅从当前窗口的已加载记录聚合，服务失败时保持未知。Aggregate loaded records and retain unknown state on failure. */
function summaryMetrics() {
  const valid =
    !loading.value && !error.value && Boolean(organization.value.tenantUid);
  return [
    {
      label: '训练记录',
      value: valid ? visibleRuns.value.length : '—',
      note: '当前时间范围',
    },
    {
      label: '已完成',
      value: valid
        ? visibleRuns.value.filter((run) => run.status === 'succeeded').length
        : '—',
      note: '训练完成 ≠ 评测通过',
    },
    {
      label: '需要关注',
      value: valid
        ? visibleRuns.value.filter((run) => run.status === 'failed').length
        : '—',
      note: '失败训练记录',
    },
    {
      label: '数据版本',
      value: valid
        ? new Set(
            visibleRuns.value.map((run) => run.productVersion).filter(Boolean),
          ).size
        : '—',
      note: '已记录版本引用',
    },
  ];
}
const metrics = computed(summaryMetrics);
/** 读取当前组织的训练记录并拒绝迟到结果。Read current organization records and reject stale responses. */
async function loadOverview() {
  const request = ++generation;
  const tenantUid = organization.value.tenantUid;
  runs.value = [];
  error.value = '';
  capturedAt.value = '';
  if (!tenantUid) {
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const data = await fetchModelEvidence(tenantUid);
    if (request !== generation) return;
    if (data.scope?.tenantUid !== tenantUid || !Array.isArray(data.runs))
      throw new Error('scope');
    runs.value = data.runs;
    capturedAt.value = data.capturedAt;
  } catch {
    if (request === generation)
      error.value =
        '暂时无法读取训练记录。连接服务后可重试；当前指标保持未知。';
  } finally {
    if (request === generation) loading.value = false;
  }
}
/** 前往真实注册的业务页面。Navigate to a registered business page. */
function navigate(path: string) {
  void router.push(path);
}
/** 在证据页继续查看当前选择的记录。 Continue inspecting the selected record in the evidence page. */
function inspectSelected() {
  void router.push({
    path: '/MTP/model-evidence',
    query: { runUid: selectedRun.value?.runUid },
  });
}
/** 销毁后不再更新页面。Reject updates after the page is destroyed. */
function invalidate() {
  generation += 1;
}
watch(organization, loadOverview, { deep: true, immediate: true });
onBeforeUnmount(invalidate);
</script>
<template>
  <BusinessPage
    domain="模型研发"
    description="查看当前组织的训练记录、数据版本与模型指标。"
    title="MLOps 分析"
    variant="overview"
  >
    <template #actions>
      <Select
        v-model:value="period"
        aria-label="统计时间范围"
        :options="[
          { label: '近7天', value: 7 },
          { label: '近30天', value: 30 },
          { label: '近90天', value: 90 },
        ]"
      />
      <Button :loading="loading" @click="loadOverview">刷新</Button>
      <Button type="primary" @click="navigate('/MTP/train/task')"
        >新建训练任务</Button
      >
    </template>
    <Alert
      v-if="error"
      class="overview-error"
      :message="error"
      type="error"
      show-icon
    />
    <Alert
      v-if="!organization.tenantUid"
      message="请先选择组织"
      type="info"
      show-icon
      class="overview-error"
    />
    <div class="overview-metrics" aria-label="当前范围记录汇总">
      <div v-for="metric in metrics" :key="metric.label">
        <span>{{ metric.label }}</span
        ><strong>{{ metric.value }}</strong
        ><small>{{ metric.note }}</small>
      </div>
    </div>
    <div class="model-workspace">
      <section class="run-workbench" aria-label="训练记录工作区">
        <div class="workbench-toolbar">
          <div>
            <h2>训练记录</h2>
            <span>{{
              loading
                ? '正在读取'
                : error
                  ? '读取失败'
                  : `${visibleRuns.length} 条记录`
            }}</span>
          </div>
          <Button type="link" @click="navigate('/MTP/train/index')"
            >管理任务 →</Button
          >
        </div>
        <Table
          :columns="columns"
          :data-source="visibleRuns"
          :loading="loading"
          row-key="runUid"
          :scroll="{ x: 600 }"
          :pagination="{ pageSize: 8, showSizeChanger: false }"
        >
          <template #emptyText
            ><Empty
              :image="Empty.PRESENTED_IMAGE_SIMPLE"
              :description="
                error
                  ? '训练记录暂不可用，请重试读取'
                  : loading
                    ? '正在读取训练记录'
                    : '所选时间范围没有训练记录'
              "
          /></template>
          <template #bodyCell="{ column, record }">
            <div v-if="column.key === 'run'" class="run-identity">
              <button
                class="run-title"
                :class="{
                  'is-selected': selectedRun?.runUid === record.runUid,
                }"
                :aria-pressed="selectedRun?.runUid === record.runUid"
                @click="selectRun(record.runUid)"
              >
                {{ record.runUid }}</button
              ><span>{{ record.productVersion || '数据版本未提供' }}</span>
            </div>
            <Tag
              v-else-if="column.key === 'status'"
              :color="
                record.status === 'failed'
                  ? 'error'
                  : record.status === 'running'
                    ? 'processing'
                    : record.status === 'succeeded'
                      ? 'blue'
                      : 'default'
              "
              >{{ statusLabels[record.status] || '未知' }}</Tag
            >
            <span v-else-if="column.key === 'auc'" class="metric-number">{{
              metricValue(record.metrics?.auc)
            }}</span>
            <span v-else-if="column.key === 'completed'" class="record-time">{{
              recordTime(record.completedAt)
            }}</span>
          </template>
        </Table>
        <div class="workbench-footnote">
          <span>最近100条已授权记录的范围汇总</span
          ><span>{{
            capturedAt ? `读取于 ${recordTime(capturedAt)}` : '等待授权数据源'
          }}</span>
        </div>
      </section>
      <aside class="model-sidebar">
        <section class="record-inspector" aria-label="所选运行详情">
          <div class="inspector-heading">
            <h2>记录详情</h2>
            <span>当前选择</span>
          </div>
          <template v-if="selectedRun">
            <strong class="selected-run-id">{{ selectedRun.runUid }}</strong>
            <Tag
              :color="
                selectedRun.status === 'failed'
                  ? 'error'
                  : selectedRun.status === 'succeeded'
                    ? 'blue'
                    : 'default'
              "
              >{{ statusLabels[selectedRun.status] || '未知' }}</Tag
            >
            <dl class="inspector-fields">
              <div>
                <dt>数据版本</dt>
                <dd>{{ selectedRun.productVersion || '未提供' }}</dd>
              </div>
              <div>
                <dt>测试样本</dt>
                <dd>{{ selectedRun.sampleCounts?.test ?? '未提供' }}</dd>
              </div>
              <div>
                <dt>开始时间</dt>
                <dd>{{ recordTime(selectedRun.startedAt) }}</dd>
              </div>
            </dl>
            <div class="metric-heading">已记录指标</div>
            <dl class="record-metrics">
              <div v-for="metric in metricDefinitions" :key="metric.key">
                <dt>{{ metric.label }}</dt>
                <dd>{{ metricValue(selectedRun.metrics?.[metric.key]) }}</dd>
              </div>
            </dl>
            <p class="inspector-note">训练完成与评测通过分别确认。</p>
            <Button block @click="inspectSelected">打开模型证据</Button>
          </template>
          <p v-else class="inspector-empty">
            {{
              error
                ? '恢复读取后查看记录详情。'
                : '选择一条训练记录，查看指标、版本和样本信息。'
            }}
          </p>
        </section>
        <nav class="workspace-shortcuts" aria-label="业务快捷入口">
          <h2>常用入口</h2>
          <button
            v-for="link in links"
            :key="link.path"
            @click="navigate(link.path)"
          >
            <span>{{ link.name }}</span
            ><span aria-hidden="true">→</span>
          </button>
        </nav>
      </aside>
    </div>
  </BusinessPage>
</template>
<style scoped>
.overview-error {
  margin-bottom: 14px;
}
.overview-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border: 1px solid var(--xnet-line);
  border-radius: var(--xnet-radius);
  background: var(--xnet-surface);
  margin-bottom: 18px;
}
.overview-metrics > div {
  position: relative;
  padding: 15px 20px;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 4px 12px;
}
.overview-metrics > div + div {
  border-left: 1px solid var(--xnet-line);
}
.overview-metrics span {
  color: var(--xnet-muted);
  font-size: 13px;
}
.overview-metrics strong {
  grid-row: span 2;
  font-size: 25px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  line-height: 1.25;
}
.overview-metrics small {
  color: var(--xnet-muted);
  font-size: 12px;
}
.model-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 266px;
  align-items: start;
  gap: 18px;
}
.run-workbench {
  min-width: 0;
  border: 1px solid var(--xnet-line);
  border-radius: var(--xnet-radius);
  background: var(--xnet-surface);
  overflow: hidden;
}
.workbench-toolbar {
  min-height: 58px;
  padding: 10px 17px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--xnet-line);
}
.workbench-toolbar > div {
  display: flex;
  align-items: center;
  gap: 10px;
}
.workbench-toolbar h2,
.model-sidebar h2 {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
}
.workbench-toolbar > div > span,
.inspector-heading > span {
  color: var(--xnet-muted);
  font-size: 12px;
}
.run-identity {
  display: grid;
  gap: 4px;
  min-width: 0;
}
.run-title {
  width: fit-content;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--xnet-ink);
  font-weight: 600;
  text-align: left;
}
.run-title:hover,
.run-title.is-selected {
  color: hsl(var(--primary));
}
.run-title:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 3px;
}
.run-identity > span {
  color: var(--xnet-muted);
  font-size: 12px;
}
.metric-number,
.record-time {
  font-variant-numeric: tabular-nums;
  font-size: 13px;
}
.workbench-footnote {
  padding: 12px 17px;
  border-top: 1px solid var(--xnet-line);
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 6px;
  font-size: 12px;
  color: var(--xnet-muted);
}
.model-sidebar {
  min-width: 0;
  border: 1px solid var(--xnet-line);
  border-radius: var(--xnet-radius);
  background: var(--xnet-surface);
}
.record-inspector {
  padding: 17px;
}
.inspector-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}
.selected-run-id {
  display: block;
  font-size: 14px;
  margin-bottom: 9px;
  overflow-wrap: anywhere;
}
.inspector-fields {
  display: grid;
  gap: 12px;
  margin: 18px 0;
}
.inspector-fields > div {
  display: grid;
  gap: 3px;
}
.inspector-fields dt {
  font-size: 12px;
  color: var(--xnet-muted);
}
.inspector-fields dd {
  font-size: 13px;
  margin: 0;
  overflow-wrap: anywhere;
}
.metric-heading {
  padding-top: 14px;
  border-top: 1px solid var(--xnet-line);
  font-size: 12px;
  color: var(--xnet-muted);
}
.record-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 12px 0;
}
.record-metrics > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.record-metrics dt {
  font-size: 12px;
  color: var(--xnet-muted);
}
.record-metrics dd {
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.inspector-note,
.inspector-empty {
  color: var(--xnet-muted);
  font-size: 12px;
  line-height: 1.7;
  margin: 12px 0;
}
.workspace-shortcuts {
  border-top: 1px solid var(--xnet-line);
  padding: 16px 17px 10px;
}
.workspace-shortcuts h2 {
  margin-bottom: 10px;
}
.workspace-shortcuts button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 9px 0;
  font-size: 13px;
  text-align: left;
}
.workspace-shortcuts button > span:last-child {
  color: var(--xnet-muted);
}
.workspace-shortcuts button:hover {
  color: hsl(var(--primary));
}
.overview-resources {
  margin-top: 16px;
  font-size: 12px;
  color: var(--xnet-muted);
}
.overview-resources summary {
  cursor: pointer;
  width: fit-content;
}
.overview-resources > div {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  margin-top: 12px;
}
.overview-resources a {
  color: var(--xnet-muted);
}
.run-workbench :deep(.ant-pagination) {
  margin-right: 16px;
}
@media (max-width: 1100px) {
  .model-workspace {
    grid-template-columns: minmax(0, 1fr);
  }
  .model-sidebar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 240px;
  }
  .workspace-shortcuts {
    border-top: 0;
    border-left: 1px solid var(--xnet-line);
  }
  .record-metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 768px) {
  .overview-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .overview-metrics > div {
    padding: 13px 14px;
  }
  .overview-metrics > div:nth-child(3) {
    border-left: 0;
  }
  .overview-metrics > div:nth-child(n + 3) {
    border-top: 1px solid var(--xnet-line);
  }
  .overview-metrics small {
    font-size: 11px;
  }
  .model-sidebar {
    grid-template-columns: minmax(0, 1fr);
  }
  .workspace-shortcuts {
    border-top: 1px solid var(--xnet-line);
    border-left: 0;
  }
  .record-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .workbench-toolbar {
    padding: 9px 12px;
  }
}
</style>
