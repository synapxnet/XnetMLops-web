<!--
Copyright (C) 2026 Synapxnet. All rights reserved.
This file is Synapxnet Proprietary and Confidential. It is strictly
forbidden to copy, distribute, or use without explicit authorization.
模型记录与证据工作台。 / Workspace for model records and evidence.
Author: maoyo | Department: 研发部 | Date: 2026-09-13
Version: 1.0.0 | Security Level: INTERNAL | Maintainer: maoyo
Email: synapxnet@gmail.com
-->
<script setup lang="ts">
import FeatureDriftEntry from '#/components/feature-drift/FeatureDriftEntry.vue';
import BusinessPage from '#/components/workspace/BusinessPage.vue';
import type { Ref } from 'vue';
import type { ModelEvidenceRun, ModelEvidenceWorkspace } from './model';

import { computed, inject, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Alert, Button, Empty, Input, Select, Tag } from 'ant-design-vue';
import {
  ExperimentOutlined,
  FileSearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';

import { fetchModelEvidence } from './api';
import {
  comparisonIssue,
  metricDefinitions,
  metricDifference,
  validMetric,
} from './model';

const organization = inject<Ref<{ tenantUid: null | string }>>(
  'selectedOrganization',
  ref({ tenantUid: null }),
);
const route = useRoute();
const workspace = ref<ModelEvidenceWorkspace | null>(null);
const loading = ref(false);
const error = ref('');
const search = ref('');
const selectedId = ref('');
const baselineId = ref<string>();
const activeView = ref<'comparison' | 'evidence'>('evidence');
let generation = 0;

/** 按版本或运行编号筛选当前组织记录。 / Filter current organization records by version or run ID. */
function filterRuns() {
  const query = search.value.trim().toLocaleLowerCase();
  // 用已显示的版本和编号筛选。 / Filter by the displayed version and identifier.
  return (workspace.value?.runs ?? []).filter((run) =>
    `${run.productVersion} ${run.runUid}`.toLocaleLowerCase().includes(query),
  );
}
const visibleRuns = computed(filterRuns);

/** 返回当前选择的真实记录。 / Resolve the selected recorded run. */
function selectedRun() {
  return workspace.value?.runs.find((run) => run.runUid === selectedId.value);
}
const selected = computed(selectedRun);

/** 返回当前组织内的比较基线。 / Resolve the comparison baseline within the current organization. */
function baselineRun() {
  return workspace.value?.runs.find((run) => run.runUid === baselineId.value);
}
const baseline = computed(baselineRun);

/** 生成排除当前记录的基线选项。 / Build baseline options excluding the current run. */
function comparisonOptions() {
  // 排除自身并映射为选择项。 / Exclude the current run and map records to selector options.
  return (workspace.value?.runs ?? [])
    .filter((run) => run.runUid !== selectedId.value)
    .map((run) => ({
      label: `${run.productVersion || '未记录版本'} · ${run.runUid}`,
      value: run.runUid,
    }));
}
const baselineOptions = computed(comparisonOptions);

/** 获取当前比较条件中的具体缺口。 / Explain missing conditions for the selected comparison. */
function currentComparisonIssue() {
  return comparisonIssue(selected.value, baseline.value);
}
const comparisonWarning = computed(currentComparisonIssue);

/** 清除旧组织数据并拒绝过期请求覆盖当前页面。 / Clear old organization data and reject stale responses. */
async function loadEvidence() {
  const requestGeneration = ++generation;
  const tenantUid = organization.value.tenantUid;
  workspace.value = null;
  error.value = '';
  baselineId.value = undefined;
  if (!tenantUid) {
    loading.value = false;
    selectedId.value = '';
    return;
  }
  loading.value = true;
  try {
    const result = await fetchModelEvidence(tenantUid);
    if (
      requestGeneration !== generation ||
      tenantUid !== organization.value.tenantUid
    )
      return;
    if (
      result.scope?.tenantUid !== tenantUid ||
      result.scope.kind !== 'tenant' ||
      !Array.isArray(result.runs)
    ) {
      throw new Error('INVALID_SCOPE');
    }
    workspace.value = result;
    const requestedUid = route.query.runUid;
    if (
      typeof requestedUid === 'string' &&
      result.runs.some((run) => run.runUid === requestedUid)
    ) {
      selectedId.value = requestedUid;
    }
    // 保留同组织内仍存在的选择。 / Preserve selections that still exist in the same organization.
    if (!result.runs.some((run) => run.runUid === selectedId.value))
      selectedId.value = result.runs[0]?.runUid ?? '';
  } catch {
    if (requestGeneration === generation)
      error.value =
        '暂时无法读取当前组织的模型记录。请检查访问权限或稍后重试。';
  } finally {
    if (requestGeneration === generation) loading.value = false;
  }
}

/** 切换记录并避免把自身保留为基线。 / Select a run without retaining it as its own baseline. */
function selectRun(run: ModelEvidenceRun) {
  selectedId.value = run.runUid;
  if (baselineId.value === run.runUid) baselineId.value = undefined;
}

/** 格式化真实时间，缺失或非法时间不伪造。 / Format actual timestamps without inventing missing dates. */
function formatTime(value?: null | string) {
  if (!value) return '尚未记录';
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString('zh-CN')
    : '时间不可用';
}

/** 将指标显示为四位小数，缺失保持空值语义。 / Format metrics to four decimals while preserving missing values. */
function formatMetric(value?: null | number) {
  const metric = validMetric(value ?? undefined);
  return metric === null ? '—' : metric.toFixed(4);
}

/** 描述性差值不等同质量通过或失败。 / Display descriptive deltas without asserting a gate outcome. */
function formatDifference(value: null | number) {
  return value === null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(4)}`;
}

/** 状态同时使用文字与语义色。 / Represent statuses with text as well as semantic color. */
function statusText(status: ModelEvidenceRun['status']) {
  return (
    {
      failed: '训练失败',
      running: '训练中',
      succeeded: '训练已完成',
      unknown: '状态未知',
    }[status] ?? '状态未知'
  );
}

/** 返回状态配色，不将训练完成表示为发布批准。 / Color run status without implying release approval. */
function statusColor(status: ModelEvidenceRun['status']) {
  return (
    {
      failed: 'error',
      running: 'processing',
      succeeded: 'blue',
      unknown: 'default',
    }[status] ?? 'default'
  );
}

/** 组织切换时读取新的已授权记录。 / Read newly authorized records when the organization changes. */
function tenantKey() {
  return organization.value.tenantUid;
}
watch(tenantKey, loadEvidence, { immediate: true });
/** 跟随页面内的运行深链且仅选择当前授权记录。 Follow a run deep link only within authorized records. */
function requestedRun() {
  return route.query.runUid;
}
/** 路由变化时定位已加载的运行，不额外查询其他组织。 Select an already loaded run without querying another organization. */
function locateRequestedRun(uid: unknown) {
  const run = workspace.value?.runs.find((item) => item.runUid === uid);
  if (run) selectRun(run);
}
watch(requestedRun, locateRequestedRun);

/** 页面离开时使未完成请求失效。 / Invalidate unfinished requests when leaving the page. */
function invalidateRequests() {
  generation += 1;
}
onBeforeUnmount(invalidateRequests);
</script>

<template>
  <BusinessPage
    domain="模型研发"
    description="连接算法、训练记录与模型证据，让每一次迭代都有据可循。"
    existing-title
  >
    <FeatureDriftEntry label="跨域恢复 · 同一事件模型证据" />
    <div class="model-workspace" data-model-evidence>
      <header class="workspace-header">
        <div class="workspace-heading">
          <span class="workspace-symbol"><ExperimentOutlined /></span>
          <div>
            <span class="eyebrow">XnetMLOps · 模型生命周期</span>
            <h1>模型证据</h1>
            <p>训练记录、测试指标与数据版本</p>
          </div>
        </div>
        <Button :loading="loading" @click="loadEvidence"
          ><ReloadOutlined /> 刷新记录</Button
        >
      </header>

      <div class="workspace-context">
        <span class="context-dot"></span> 当前组织记录
        <span class="context-separator">/</span> 已有训练证据
        <span class="context-separator">/</span> 执行模式未记录
        <span class="record-count"
          ><template v-if="workspace"
            >{{ workspace.runs.length }} 条 · 最近
            {{ workspace.recordLimit }} 条内</template
          ><template v-else>{{
            loading ? '正在读取' : error ? '读取失败' : '尚未读取'
          }}</template></span
        >
      </div>
      <Alert
        v-if="error"
        :message="error"
        type="error"
        show-icon
        class="workspace-error"
      />
      <div v-if="!organization.tenantUid" class="workspace-empty">
        <Empty description="请先在顶部选择一个组织，查看该组织的模型记录。" />
      </div>
      <div v-else-if="loading" class="workspace-empty" role="status">
        正在读取模型证据…
      </div>
      <div
        v-else-if="!error && workspace && workspace.runs.length === 0"
        class="workspace-empty"
      >
        <FileSearchOutlined class="empty-symbol" />
        <h2>从第一条真实训练记录开始</h2>
        <p>
          当前组织还没有推荐训练记录。完成训练后，模型摘要和测试指标会出现在这里。
        </p>
        <RouterLink to="/MTP/recommendation-training"
          >打开现有推荐模型训练 →</RouterLink
        >
      </div>

      <div v-else-if="workspace" class="workspace-layout">
        <aside class="run-library" aria-label="训练运行列表">
          <div class="library-toolbar">
            <h2>运行记录</h2>
            <Input
              v-model:value="search"
              allow-clear
              placeholder="搜索数据版本或运行编号"
              aria-label="搜索运行"
            />
          </div>
          <div class="run-list">
            <button
              v-for="run in visibleRuns"
              :key="run.runUid"
              type="button"
              class="run-item"
              :class="{ selected: selectedId === run.runUid }"
              :aria-pressed="selectedId === run.runUid"
              :data-model-run="run.runUid"
              @click="selectRun(run)"
            >
              <span class="run-title">{{
                run.productVersion || '未记录数据版本'
              }}</span
              ><Tag :color="statusColor(run.status)">{{
                statusText(run.status)
              }}</Tag
              ><span class="run-id">{{ run.runUid }}</span
              ><span class="run-time">{{ formatTime(run.startedAt) }}</span>
            </button>
            <p v-if="visibleRuns.length === 0" class="muted-text">
              没有符合搜索条件的记录。
            </p>
          </div>
          <div class="library-footer">
            <RouterLink to="/MTP/train/index">全部训练任务 ↗</RouterLink
            ><RouterLink to="/MTP/algorithm/index">算法资产 ↗</RouterLink>
          </div>
        </aside>

        <main
          v-if="selected"
          class="run-detail"
          :data-model-detail="selected.runUid"
        >
          <div class="detail-heading">
            <div>
              <span class="eyebrow">记录详情</span>
              <h2>{{ selected.productVersion || '未记录数据版本' }}</h2>
              <p class="run-id">{{ selected.runUid }}</p>
            </div>
            <Tag :color="statusColor(selected.status)">{{
              statusText(selected.status)
            }}</Tag>
          </div>
          <div class="detail-tabs" aria-label="模型记录视图">
            <button
              type="button"
              :class="{ active: activeView === 'evidence' }"
              :aria-pressed="activeView === 'evidence'"
              @click="activeView = 'evidence'"
            >
              模型证据</button
            ><button
              type="button"
              :class="{ active: activeView === 'comparison' }"
              :aria-pressed="activeView === 'comparison'"
              @click="activeView = 'comparison'"
            >
              运行比较
            </button>
          </div>

          <div v-if="activeView === 'evidence'" class="evidence-content">
            <div class="evidence-path">
              <span>DataOps 数据版本</span><span aria-hidden="true">→</span
              ><span>训练运行</span><span aria-hidden="true">→</span
              ><strong>已记录模型证据</strong>
            </div>
            <section class="metric-section">
              <div class="section-heading">
                <h3>测试集表现</h3>
                <span>训练产出的实际指标</span>
              </div>
              <div class="metric-grid">
                <div
                  v-for="metric in metricDefinitions"
                  :key="metric.key"
                  class="metric-cell"
                >
                  <span>{{ metric.label }}</span
                  ><strong>{{
                    formatMetric(selected.metrics[metric.key])
                  }}</strong>
                </div>
              </div>
              <p
                v-if="selected.metricsCoverage !== 'available'"
                class="muted-text"
              >
                部分指标缺失或格式不可用；未记录的值不会被填为 0。
              </p>
            </section>
            <section class="lineage-section">
              <div class="section-heading">
                <h3>版本与来源</h3>
                <span>记录可追溯，制品尚待独立核验</span>
              </div>
              <dl class="lineage-grid">
                <dt>数据产品版本</dt>
                <dd>{{ selected.productVersion || '未记录' }}</dd>
                <dt>训练 / 验证 / 测试样本</dt>
                <dd>
                  {{ selected.sampleCounts.train ?? '—' }} /
                  {{ selected.sampleCounts.validation ?? '—' }} /
                  {{ selected.sampleCounts.test ?? '—' }}
                </dd>
                <dt>开始时间</dt>
                <dd>{{ formatTime(selected.startedAt) }}</dd>
                <dt>完成时间</dt>
                <dd>{{ formatTime(selected.completedAt) }}</dd>
                <dt>模型摘要</dt>
                <dd class="digest">
                  {{ selected.modelDigestSha256 || '未记录有效摘要' }}
                </dd>
                <dt>数据结构摘要</dt>
                <dd class="digest">
                  {{ selected.schemaDigestSha256 || '未记录有效摘要' }}
                </dd>
              </dl>
            </section>
            <details class="record-boundary">
              <summary>证据范围与后续连接</summary>
              <p>
                当前页面读取训练运行记录，尚未重新读取模型文件或确认实际部署。训练完成不代表模型已通过正式发布评测。
              </p>
              <p>
                历史数据摘要仅覆盖事件键、标签和集合划分，尚不覆盖全部特征值。完整模型登记、发布运行证据与物理策略评测仍待接入。
              </p>
              <dl class="lineage-grid">
                <dt>历史记录摘要</dt>
                <dd class="digest">
                  {{ selected.legacyArtifactDigestSha256 || '未记录有效摘要' }}
                </dd>
              </dl>
            </details>
          </div>

          <section v-else class="comparison-content">
            <div class="section-heading">
              <div>
                <h3>与另一条运行比较</h3>
                <p>先核对已知条件，再查看描述性差值。</p>
              </div>
            </div>
            <label class="baseline-picker"
              ><span>比较基线</span
              ><Select
                v-model:value="baselineId"
                :options="baselineOptions"
                allow-clear
                placeholder="选择另一条运行记录"
                aria-label="比较基线"
            /></label>
            <p v-if="comparisonWarning" class="comparison-notice" role="status">
              {{ comparisonWarning }}
            </p>
            <p v-else class="comparison-notice">
              已知数据版本、结构摘要和样本量一致。完整评测套件、特征全内容与运行环境仍待核验，以下仅为描述性差值，不能据此批准发布。
            </p>
            <div class="comparison-table-wrap">
              <table class="comparison-table">
                <thead>
                  <tr>
                    <th>测试指标</th>
                    <th>当前运行</th>
                    <th>基线</th>
                    <th>差值</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="metric in metricDefinitions" :key="metric.key">
                    <th>{{ metric.label }}</th>
                    <td>{{ formatMetric(selected.metrics[metric.key]) }}</td>
                    <td>{{ formatMetric(baseline?.metrics[metric.key]) }}</td>
                    <td>
                      {{
                        formatDifference(
                          metricDifference(metric.key, selected, baseline),
                        )
                      }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
      <footer v-if="workspace" class="workspace-footer">
        读取时间 {{ formatTime(workspace.capturedAt) }}
        <span>原有训练、算法与部署功能仍在原入口。</span>
      </footer>
    </div>
  </BusinessPage>
</template>

<style scoped>
.model-workspace {
  --model-accent: var(--primary, 210 90% 55%);
  padding: 28px;
  min-width: 0;
  color: hsl(var(--foreground));
}
.workspace-header,
.workspace-heading,
.detail-heading,
.section-heading,
.workspace-context {
  display: flex;
  align-items: center;
  gap: 14px;
}
.workspace-header,
.detail-heading,
.section-heading {
  justify-content: space-between;
}
.workspace-heading {
  min-width: 0;
}
.workspace-symbol {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 15px;
  background: linear-gradient(
    135deg,
    hsl(var(--model-accent) / 0.16),
    hsl(190 85% 50%/0.08)
  );
  color: hsl(var(--model-accent));
  font-size: 23px;
}
.eyebrow {
  font-size: 11px;
  letter-spacing: 0.06em;
  color: hsl(var(--muted-foreground));
}
.model-workspace h1 {
  font-size: 27px;
  line-height: 1.3;
  font-weight: 650;
  margin: 2px 0 4px;
}
.model-workspace h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}
.model-workspace h3 {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
}
.model-workspace p {
  margin: 5px 0 0;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
  line-height: 1.7;
}
.workspace-context {
  margin: 24px 0 14px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  gap: 9px;
  flex-wrap: wrap;
}
.context-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: hsl(var(--model-accent));
}
.context-separator {
  opacity: 0.4;
}
.record-count {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}
.workspace-error {
  margin: 16px 0;
}
.workspace-layout {
  display: grid;
  grid-template-columns: 290px minmax(0, 1fr);
  border: 1px solid hsl(var(--border));
  border-radius: 16px;
  overflow: hidden;
  background: hsl(var(--card));
  min-height: 580px;
}
.run-library {
  border-right: 1px solid hsl(var(--border));
  background: hsl(var(--muted) / 0.25);
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.library-toolbar {
  padding: 18px;
  display: grid;
  gap: 13px;
}
.library-toolbar h2 {
  font-size: 13px;
}
.run-list {
  padding: 0 9px 12px;
  max-height: 630px;
  overflow: auto;
  flex: 1;
}
.run-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 7px;
  padding: 14px;
  width: 100%;
  text-align: left;
  border: 1px solid transparent;
  border-radius: 11px;
  margin-bottom: 5px;
  cursor: pointer;
  background: transparent;
  color: inherit;
}
.run-item:hover {
  background: hsl(var(--muted) / 0.6);
}
.run-item.selected {
  background: hsl(var(--model-accent) / 0.08);
  border-color: hsl(var(--model-accent) / 0.28);
}
.run-title {
  font-weight: 600;
  font-size: 13px;
  overflow-wrap: anywhere;
}
.run-id {
  font-family: ui-monospace, monospace;
  font-size: 11px;
  overflow-wrap: anywhere;
  color: hsl(var(--muted-foreground));
}
.run-time {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}
.run-item :deep(.ant-tag) {
  font-size: 11px;
  margin: 0;
  line-height: 20px;
}
.library-footer {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  border-top: 1px solid hsl(var(--border));
  padding: 16px;
  font-size: 12px;
}
.model-workspace a {
  color: hsl(var(--model-accent));
}
.run-detail {
  min-width: 0;
  padding: 24px 28px;
}
.detail-heading {
  align-items: flex-start;
  gap: 20px;
}
.detail-heading h2 {
  font-size: 22px;
  margin: 5px 0;
  overflow-wrap: anywhere;
}
.detail-heading :deep(.ant-tag) {
  flex-shrink: 0;
  margin: 5px 0;
}
.detail-tabs {
  display: flex;
  gap: 25px;
  border-bottom: 1px solid hsl(var(--border));
  margin-top: 21px;
}
.detail-tabs button {
  padding: 13px 0;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
  cursor: pointer;
}
.detail-tabs button.active {
  color: hsl(var(--model-accent));
  border-bottom-color: hsl(var(--model-accent));
  font-weight: 600;
}
.evidence-path {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 22px 0;
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}
.evidence-path strong {
  color: hsl(var(--foreground));
  font-weight: 500;
}
.section-heading {
  gap: 12px;
  margin-bottom: 15px;
}
.section-heading > span {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}
.metric-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  padding: 20px 0 24px;
}
.metric-cell {
  display: grid;
  gap: 8px;
}
.metric-cell > span {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}
.metric-cell strong {
  font-size: 22px;
  font-weight: 550;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}
.lineage-section {
  padding: 23px 0;
  border-top: 1px solid hsl(var(--border));
}
.lineage-grid {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  column-gap: 20px;
  row-gap: 14px;
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
}
.lineage-grid dt {
  color: hsl(var(--muted-foreground));
}
.lineage-grid dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.digest {
  font-family: ui-monospace, monospace;
  font-size: 11px;
}
.record-boundary {
  padding: 15px 0;
  border-top: 1px solid hsl(var(--border));
  font-size: 12px;
}
.record-boundary summary {
  cursor: pointer;
  color: hsl(var(--muted-foreground));
}
.record-boundary .lineage-grid {
  margin-top: 14px;
}
.model-workspace .muted-text {
  padding: 8px;
  font-size: 12px;
}
.comparison-content {
  padding-top: 24px;
}
.baseline-picker {
  display: grid;
  grid-template-columns: 85px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  font-size: 12px;
}
.baseline-picker :deep(.ant-select) {
  width: 100%;
}
.comparison-notice {
  padding: 14px 16px !important;
  margin: 20px 0 !important;
  background: hsl(var(--model-accent) / 0.06);
  border-left: 2px solid hsl(var(--model-accent) / 0.45);
  border-radius: 0 9px 9px 0;
}
.comparison-table-wrap {
  overflow: auto;
}
.comparison-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.comparison-table th,
.comparison-table td {
  padding: 15px 12px;
  border-bottom: 1px solid hsl(var(--border));
}
.comparison-table th:first-child {
  text-align: left;
}
.comparison-table thead th {
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
}
.comparison-table tbody th {
  font-weight: 500;
}
.workspace-empty {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  justify-content: center;
  min-height: 420px;
  border: 1px dashed hsl(var(--border));
  border-radius: 16px;
  text-align: center;
  padding: 30px;
  background: hsl(var(--card));
}
.empty-symbol {
  font-size: 36px;
  color: hsl(var(--model-accent));
}
.workspace-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 13px 2px;
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}
.model-workspace button:focus-visible,
.model-workspace summary:focus-visible {
  outline: 2px solid hsl(var(--model-accent));
  outline-offset: 3px;
}
@media (max-width: 1100px) {
  .model-workspace {
    padding: 20px;
  }
  .workspace-layout {
    grid-template-columns: 245px minmax(0, 1fr);
  }
  .run-detail {
    padding: 22px;
  }
  .metric-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .lineage-grid {
    grid-template-columns: 120px minmax(0, 1fr);
  }
  .section-heading {
    align-items: flex-start;
    flex-wrap: wrap;
  }
}
@media (max-width: 768px) {
  .model-workspace {
    padding: 14px;
  }
  .workspace-header {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .workspace-symbol {
    display: none;
  }
  .model-workspace h1 {
    font-size: 24px;
  }
  .workspace-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .run-library {
    border-right: 0;
    border-bottom: 1px solid hsl(var(--border));
  }
  .run-list {
    max-height: 245px;
  }
  .run-detail {
    padding: 20px 17px;
  }
  .metric-cell strong {
    font-size: 20px;
  }
  .lineage-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
  }
  .lineage-grid dd {
    margin-bottom: 10px;
  }
  .detail-heading h2 {
    font-size: 19px;
  }
  .baseline-picker {
    grid-template-columns: minmax(0, 1fr);
  }
  .record-count {
    margin-left: 0;
  }
}
</style>
