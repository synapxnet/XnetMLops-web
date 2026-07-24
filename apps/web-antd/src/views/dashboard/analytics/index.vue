<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';
import type { Component } from 'vue';

import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';
import { useRouter } from 'vue-router';

import { usePreferences } from '@vben/preferences';
import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import {
  AlertOutlined,
  ApiOutlined,
  BarChartOutlined,
  CheckCircleFilled,
  CloudServerOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  FireOutlined,
  LineChartOutlined,
  ReloadOutlined,
  RightOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons-vue';

type PeriodKey = '30d' | '7d' | '90d';
type StatusTone = 'danger' | 'info' | 'success' | 'warning';

interface MetricItem {
  change: string;
  icon: Component;
  label: string;
  note: string;
  tone: StatusTone;
  unit: string;
  value: string;
}

interface TrainingJob {
  algorithm: string;
  duration: string;
  id: string;
  name: string;
  owner: string;
  progress?: number;
  resource: string;
  status: string;
  tone: StatusTone;
  updatedAt: string;
}

const router = useRouter();
const { isDark } = usePreferences();
const selectedPeriod = ref<PeriodKey>('7d');
const refreshing = ref(false);
const lastUpdated = ref(formatTime());

const trendRef = ref<EchartsUIType>();
const resourceRef = ref<EchartsUIType>();
const lifecycleRef = ref<EchartsUIType>();
const latencyRef = ref<EchartsUIType>();

const trendChart = useEcharts(trendRef);
const resourceChart = useEcharts(resourceRef);
const lifecycleChart = useEcharts(lifecycleRef);
const latencyChart = useEcharts(latencyRef);

let refreshTimer: null | ReturnType<typeof setTimeout> = null;
let themeTimer: null | ReturnType<typeof setTimeout> = null;

const periods: Array<{ label: string; value: PeriodKey }> = [
  { label: '近 7 天', value: '7d' },
  { label: '近 30 天', value: '30d' },
  { label: '近 90 天', value: '90d' },
];

const analyticsByPeriod = {
  '7d': {
    failed: [1, 2, 1, 3, 1, 2, 1],
    labels: ['周五', '周六', '周日', '周一', '周二', '周三', '周四'],
    latency: [126, 118, 131, 109, 101, 96, 92],
    metrics: {
      gpuHours: '684',
      gpuNote: '较上周期 +8.3%',
      gpuUtilization: '72.8',
      modelOutputs: '26',
      onlineServices: '9',
      successRate: '91.4',
      trainingRuns: '128',
    },
    success: [14, 12, 16, 18, 21, 23, 22],
  },
  '30d': {
    failed: [7, 5, 8, 6, 4, 7],
    labels: ['第 1 周', '第 2 周', '第 3 周', '第 4 周', '第 5 周', '本周'],
    latency: [138, 129, 121, 116, 104, 92],
    metrics: {
      gpuHours: '2,746',
      gpuNote: '较上周期 +11.2%',
      gpuUtilization: '70.6',
      modelOutputs: '93',
      onlineServices: '12',
      successRate: '89.8',
      trainingRuns: '486',
    },
    success: [68, 72, 79, 83, 91, 86],
  },
  '90d': {
    failed: [18, 15, 21],
    labels: ['5 月', '6 月', '7 月'],
    latency: [151, 118, 92],
    metrics: {
      gpuHours: '8,392',
      gpuNote: '较上周期 +14.7%',
      gpuUtilization: '68.9',
      modelOutputs: '241',
      onlineServices: '17',
      successRate: '88.7',
      trainingRuns: '1,342',
    },
    success: [389, 421, 468],
  },
} as const;

const resourcePools = [
  { allocated: 92, name: 'H800 训练池', utilization: 81 },
  { allocated: 88, name: 'A100 训练池', utilization: 76 },
  { allocated: 74, name: 'L40S 推理池', utilization: 69 },
  { allocated: 62, name: 'CPU 通用池', utilization: 57 },
];

const lifecycleData = [
  { name: '已验证', value: 14 },
  { name: '评估中', value: 6 },
  { name: '已部署', value: 4 },
  { name: '已归档', value: 2 },
];

const pipelineStages = [
  { label: '数据准备', note: '48 个数据版本可用', value: 96 },
  { label: '环境调度', note: '平均排队 2.8 分钟', value: 93 },
  { label: '模型训练', note: '7 个任务正在运行', value: 91 },
  { label: '评估发布', note: '4 个模型等待审批', value: 88 },
];

const serviceSeries = [
  {
    color: '#2589d8',
    data: [108, 103, 106, 97, 94, 91, 82],
    name: '推荐服务',
  },
  {
    color: '#20a979',
    data: [142, 139, 131, 128, 122, 117, 114],
    name: '风控服务',
  },
  {
    color: '#d99325',
    data: [218, 204, 196, 188, 182, 179, 176],
    name: '文档识别',
  },
];

const trainingJobs: TrainingJob[] = [
  {
    algorithm: 'PyTorch 2.4 / ResNet50',
    duration: '42 分钟',
    id: 'train-20260724-0812',
    name: 'vision-resnet50-nightly',
    owner: '视觉算法组',
    resource: 'A100 x 2',
    status: '成功',
    tone: 'success',
    updatedAt: '07-24 08:54',
  },
  {
    algorithm: 'Transformers / LoRA',
    duration: '68%',
    id: 'train-20260724-0766',
    name: 'llm-lora-customer-service',
    owner: '语言模型组',
    progress: 68,
    resource: 'H800 x 4',
    status: '运行中',
    tone: 'info',
    updatedAt: '07-24 09:12',
  },
  {
    algorithm: 'XGBoost 2.1',
    duration: '18 分钟',
    id: 'train-20260724-0721',
    name: 'churn-xgboost-weekly',
    owner: '增长算法组',
    resource: 'CPU x 16',
    status: '成功',
    tone: 'success',
    updatedAt: '07-24 07:46',
  },
  {
    algorithm: 'PyTorch 2.4 / Transformer',
    duration: '1 小时 26 分',
    id: 'train-20260724-0698',
    name: 'anomaly-transformer-v12',
    owner: '时序算法组',
    resource: 'A100 x 1',
    status: '失败',
    tone: 'danger',
    updatedAt: '07-24 06:39',
  },
  {
    algorithm: 'LightGBM 4.6',
    duration: '排队 3 分钟',
    id: 'train-20260724-0652',
    name: 'credit-score-validation',
    owner: '风险模型组',
    resource: 'CPU x 8',
    status: '排队中',
    tone: 'warning',
    updatedAt: '07-24 09:18',
  },
];

const operationalEvents = [
  {
    detail: 'anomaly-transformer-v12 在验证阶段检测到损失值异常',
    level: '严重',
    target: '训练异常',
    time: '09:16',
    tone: 'danger',
  },
  {
    detail: 'H800 训练池可分配显存低于 18%',
    level: '警告',
    target: '资源容量',
    time: '09:08',
    tone: 'warning',
  },
  {
    detail: 'document-ocr-api 的 P95 延迟连续 5 分钟高于 170 ms',
    level: '警告',
    target: '服务延迟',
    time: '08:57',
    tone: 'warning',
  },
  {
    detail: 'recommendation-v18 已通过离线评估并进入发布审批',
    level: '正常',
    target: '模型评估',
    time: '08:41',
    tone: 'success',
  },
] as const;

const currentAnalytics = computed(
  () => analyticsByPeriod[selectedPeriod.value],
);

const metricItems = computed<MetricItem[]>(() => {
  const metrics = currentAnalytics.value.metrics;
  return [
    {
      change: '+18.5%',
      icon: ExperimentOutlined,
      label: '训练任务',
      note: '周期内提交',
      tone: 'info',
      unit: '次',
      value: metrics.trainingRuns,
    },
    {
      change: '+3.2%',
      icon: SafetyCertificateOutlined,
      label: '训练成功率',
      note: '稳定高于目标线',
      tone: 'success',
      unit: '%',
      value: metrics.successRate,
    },
    {
      change: '+5.6%',
      icon: ThunderboltOutlined,
      label: 'GPU 平均利用率',
      note: '核心训练池',
      tone: 'info',
      unit: '%',
      value: metrics.gpuUtilization,
    },
    {
      change: metrics.gpuNote,
      icon: FireOutlined,
      label: 'GPU 计算时长',
      note: '按有效占用统计',
      tone: 'warning',
      unit: 'h',
      value: metrics.gpuHours,
    },
    {
      change: '4 个待审批',
      icon: DatabaseOutlined,
      label: '模型产出',
      note: '新增模型版本',
      tone: 'success',
      unit: '个',
      value: metrics.modelOutputs,
    },
    {
      change: '99.92% 可用',
      icon: CloudServerOutlined,
      label: '在线服务',
      note: '生产环境实例',
      tone: 'info',
      unit: '项',
      value: metrics.onlineServices,
    },
  ];
});

function formatTime() {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date());
}

function renderTrendChart() {
  const analytics = currentAnalytics.value;
  trendChart.renderEcharts({
    animationDuration: 420,
    color: ['#2589d8', '#e45b67'],
    grid: { bottom: 12, containLabel: true, left: 12, right: 18, top: 48 },
    legend: {
      data: ['成功任务', '失败任务'],
      icon: 'roundRect',
      itemHeight: 3,
      itemWidth: 16,
      right: 0,
      top: 0,
    },
    series: [
      {
        areaStyle: { color: 'rgba(37, 137, 216, 0.14)' },
        data: analytics.success,
        name: '成功任务',
        showSymbol: false,
        smooth: 0.35,
        type: 'line',
      },
      {
        data: analytics.failed,
        lineStyle: { type: 'dashed', width: 2 },
        name: '失败任务',
        showSymbol: true,
        smooth: 0.3,
        symbolSize: 5,
        type: 'line',
      },
    ],
    tooltip: { trigger: 'axis' },
    xAxis: {
      axisTick: { show: false },
      boundaryGap: false,
      data: analytics.labels,
      type: 'category',
    },
    yAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      minInterval: 1,
      splitLine: { lineStyle: { color: 'rgba(120, 144, 164, 0.16)' } },
      type: 'value',
    },
  });
}

function renderResourceChart() {
  resourceChart.renderEcharts({
    animationDuration: 420,
    color: ['#2589d8', '#a9bbc9'],
    grid: { bottom: 8, containLabel: true, left: 8, right: 24, top: 32 },
    legend: {
      data: ['有效利用', '已分配'],
      icon: 'roundRect',
      itemHeight: 3,
      itemWidth: 14,
      right: 0,
      top: 0,
    },
    series: [
      {
        barGap: '-100%',
        barWidth: 12,
        data: resourcePools.map((item) => item.allocated),
        itemStyle: { borderRadius: [0, 3, 3, 0], opacity: 0.28 },
        name: '已分配',
        silent: true,
        type: 'bar',
      },
      {
        barWidth: 12,
        data: resourcePools.map((item) => item.utilization),
        itemStyle: { borderRadius: [0, 3, 3, 0] },
        name: '有效利用',
        type: 'bar',
      },
    ],
    tooltip: { trigger: 'axis' },
    xAxis: {
      axisLabel: { formatter: '{value}%' },
      max: 100,
      splitLine: { lineStyle: { color: 'rgba(120, 144, 164, 0.14)' } },
      type: 'value',
    },
    yAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      data: resourcePools.map((item) => item.name),
      type: 'category',
    },
  });
}

function renderLifecycleChart() {
  lifecycleChart.renderEcharts({
    animationDuration: 420,
    color: ['#20a979', '#2589d8', '#d99325', '#8296a6'],
    legend: {
      bottom: 0,
      icon: 'circle',
      itemHeight: 7,
      itemWidth: 7,
      left: 'center',
    },
    series: [
      {
        center: ['50%', '43%'],
        data: lifecycleData,
        emphasis: { scaleSize: 5 },
        label: { formatter: '{b}\n{c}', fontSize: 10 },
        name: '模型生命周期',
        radius: ['48%', '68%'],
        type: 'pie',
      },
    ],
    tooltip: { trigger: 'item' },
  });
}

function renderLatencyChart() {
  latencyChart.renderEcharts({
    animationDuration: 420,
    color: serviceSeries.map((item) => item.color),
    grid: { bottom: 8, containLabel: true, left: 8, right: 14, top: 40 },
    legend: {
      data: serviceSeries.map((item) => item.name),
      icon: 'roundRect',
      itemHeight: 3,
      itemWidth: 12,
      right: 0,
      top: 0,
    },
    series: serviceSeries.map((item) => ({
      data: item.data,
      lineStyle: { width: 2 },
      name: item.name,
      showSymbol: false,
      smooth: 0.35,
      type: 'line' as const,
    })),
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value) => `${value} ms`,
    },
    xAxis: {
      axisTick: { show: false },
      boundaryGap: false,
      data: ['03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00'],
      type: 'category',
    },
    yAxis: {
      axisLabel: { formatter: '{value} ms' },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: 'rgba(120, 144, 164, 0.14)' } },
      type: 'value',
    },
  });
}

function renderCharts() {
  renderTrendChart();
  renderResourceChart();
  renderLifecycleChart();
  renderLatencyChart();
}

function selectPeriod(period: PeriodKey) {
  selectedPeriod.value = period;
}

function refreshDashboard() {
  if (refreshing.value) return;
  refreshing.value = true;
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    lastUpdated.value = formatTime();
    renderCharts();
    refreshing.value = false;
  }, 520);
}

function openTrainingTasks() {
  router.push('/MTP/train/index');
}

function openTrainingJob(job: TrainingJob) {
  router.push({ path: '/MTP/train/job', query: { id: job.id } });
}

watch(selectedPeriod, () => nextTick(renderCharts));
watch(isDark, () => {
  if (themeTimer) clearTimeout(themeTimer);
  themeTimer = setTimeout(renderCharts, 100);
});

onMounted(() => nextTick(renderCharts));
onBeforeUnmount(() => {
  if (refreshTimer) clearTimeout(refreshTimer);
  if (themeTimer) clearTimeout(themeTimer);
});
</script>

<template>
  <main
    class="analytics-dashboard"
    :class="{ 'analytics-dashboard--dark': isDark }"
  >
    <header class="analytics-header">
      <div>
        <h1>MLOps 分析中心</h1>
        <p>训练、模型与在线服务的统一运行视图</p>
      </div>
      <div class="analytics-toolbar">
        <span class="demo-label">演示数据</span>
        <div class="period-switch" aria-label="分析周期">
          <button
            v-for="period in periods"
            :key="period.value"
            type="button"
            :aria-pressed="selectedPeriod === period.value"
            :class="{ active: selectedPeriod === period.value }"
            @click="selectPeriod(period.value)"
          >
            {{ period.label }}
          </button>
        </div>
        <button
          class="icon-button"
          :disabled="refreshing"
          type="button"
          title="刷新分析数据"
          @click="refreshDashboard"
        >
          <ReloadOutlined :class="{ spinning: refreshing }" />
        </button>
      </div>
    </header>

    <section class="metrics-grid" aria-label="MLOps 核心指标">
      <article
        v-for="metric in metricItems"
        :key="metric.label"
        class="metric-card"
      >
        <span class="metric-icon" :class="`tone-${metric.tone}`">
          <component :is="metric.icon" />
        </span>
        <div class="metric-content">
          <span class="metric-label">{{ metric.label }}</span>
          <strong class="metric-value">
            {{ metric.value }}<small>{{ metric.unit }}</small>
          </strong>
          <span class="metric-note">{{ metric.note }}</span>
        </div>
        <span class="metric-change" :class="`tone-${metric.tone}`">
          {{ metric.change }}
        </span>
      </article>
    </section>

    <section class="primary-grid">
      <article class="analytics-panel trend-panel">
        <header class="panel-header">
          <div>
            <span class="panel-title"><LineChartOutlined />训练运行趋势</span>
            <small>按任务最终状态统计</small>
          </div>
          <span class="updated-at">更新于 {{ lastUpdated }}</span>
        </header>
        <EchartsUI ref="trendRef" height="292px" />
      </article>

      <aside class="analytics-panel pipeline-panel">
        <header class="panel-header">
          <div>
            <span class="panel-title"><RocketOutlined />流水线健康度</span>
            <small>从数据准备到发布审批</small>
          </div>
          <strong class="health-score">92.1%</strong>
        </header>
        <div class="pipeline-list">
          <div
            v-for="stage in pipelineStages"
            :key="stage.label"
            class="pipeline-stage"
          >
            <div class="pipeline-stage__heading">
              <strong>{{ stage.label }}</strong>
              <span>{{ stage.value }}%</span>
            </div>
            <div
              class="pipeline-progress"
              role="progressbar"
              :aria-label="`${stage.label}健康度`"
              :aria-valuenow="stage.value"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <span :style="{ width: `${stage.value}%` }" />
            </div>
            <small>{{ stage.note }}</small>
          </div>
        </div>
        <button class="panel-command" type="button" @click="openTrainingTasks">
          查看训练任务<RightOutlined />
        </button>
      </aside>
    </section>

    <section class="insights-grid">
      <article class="analytics-panel">
        <header class="panel-header">
          <div>
            <span class="panel-title"><BarChartOutlined />资源效率</span>
            <small>已分配资源与有效利用率</small>
          </div>
        </header>
        <EchartsUI ref="resourceRef" height="232px" />
      </article>

      <article class="analytics-panel">
        <header class="panel-header">
          <div>
            <span class="panel-title"><DatabaseOutlined />模型生命周期</span>
            <small>当前周期新增模型版本</small>
          </div>
        </header>
        <EchartsUI ref="lifecycleRef" height="232px" />
      </article>

      <article class="analytics-panel">
        <header class="panel-header">
          <div>
            <span class="panel-title"><ApiOutlined />在线服务延迟</span>
            <small>核心服务 P95 响应时间</small>
          </div>
          <span class="status-summary"><CheckCircleFilled />全部可用</span>
        </header>
        <EchartsUI ref="latencyRef" height="232px" />
      </article>
    </section>

    <section class="details-grid">
      <article class="analytics-panel jobs-panel">
        <header class="panel-header">
          <div>
            <span class="panel-title"><ExperimentOutlined />重点训练任务</span>
            <small>按更新时间与异常状态排序</small>
          </div>
          <button class="text-command" type="button" @click="openTrainingTasks">
            全部任务<RightOutlined />
          </button>
        </header>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>任务</th>
                <th>算法与框架</th>
                <th>资源</th>
                <th>状态</th>
                <th>耗时或进度</th>
                <th>团队与更新时间</th>
                <th><span class="sr-only">操作</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="job in trainingJobs" :key="job.id">
                <td>
                  <button
                    class="job-link"
                    type="button"
                    @click="openTrainingJob(job)"
                  >
                    {{ job.name }}
                  </button>
                  <small>{{ job.id }}</small>
                </td>
                <td>{{ job.algorithm }}</td>
                <td class="numeric">{{ job.resource }}</td>
                <td>
                  <span class="status-tag" :class="`tone-${job.tone}`">
                    {{ job.status }}
                  </span>
                </td>
                <td>
                  <div v-if="job.progress" class="job-progress-cell">
                    <span>{{ job.progress }}%</span>
                    <div class="job-progress">
                      <i :style="{ width: `${job.progress}%` }" />
                    </div>
                  </div>
                  <span v-else>{{ job.duration }}</span>
                </td>
                <td>
                  <span>{{ job.owner }}</span>
                  <small>{{ job.updatedAt }}</small>
                </td>
                <td>
                  <button
                    class="row-action"
                    type="button"
                    :title="`查看 ${job.name}`"
                    @click="openTrainingJob(job)"
                  >
                    <RightOutlined />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <aside class="analytics-panel events-panel">
        <header class="panel-header">
          <div>
            <span class="panel-title"><AlertOutlined />运行事件</span>
            <small>需要关注的训练与服务变化</small>
          </div>
          <span class="event-count">3 条待处理</span>
        </header>
        <div class="event-list">
          <article
            v-for="event in operationalEvents"
            :key="`${event.time}-${event.target}`"
            class="event-row"
          >
            <span class="event-icon" :class="`tone-${event.tone}`">
              <AlertOutlined v-if="event.tone !== 'success'" />
              <CheckCircleFilled v-else />
            </span>
            <div>
              <div class="event-heading">
                <strong>{{ event.target }}</strong>
                <span class="status-tag" :class="`tone-${event.tone}`">
                  {{ event.level }}
                </span>
                <time>{{ event.time }}</time>
              </div>
              <p>{{ event.detail }}</p>
            </div>
          </article>
        </div>
      </aside>
    </section>
  </main>
</template>

<style scoped>
.analytics-dashboard {
  --analytics-bg: #edf3f7;
  --analytics-panel: rgb(255 255 255 / 96%);
  --analytics-panel-muted: #f2f6f8;
  --analytics-border: #d9e3ea;
  --analytics-text: #203447;
  --analytics-muted: #6c8090;
  --analytics-primary: #2589d8;
  --analytics-primary-soft: rgb(37 137 216 / 11%);
  --analytics-success: #168e66;
  --analytics-success-soft: rgb(22 142 102 / 11%);
  --analytics-warning: #c77918;
  --analytics-warning-soft: rgb(199 121 24 / 12%);
  --analytics-danger: #d94d5d;
  --analytics-danger-soft: rgb(217 77 93 / 11%);
  min-height: calc(100dvh - 112px);
  padding: 14px;
  color: var(--analytics-text);
  background: var(--analytics-bg);
  font-variant-numeric: tabular-nums;
}

.analytics-dashboard--dark {
  --analytics-bg: #07131e;
  --analytics-panel: rgb(10 29 43 / 96%);
  --analytics-panel-muted: #0d2536;
  --analytics-border: #1d3a4d;
  --analytics-text: #dcebf5;
  --analytics-muted: #8299aa;
  --analytics-primary: #42a5ed;
  --analytics-primary-soft: rgb(66 165 237 / 13%);
  --analytics-success: #31c48d;
  --analytics-success-soft: rgb(49 196 141 / 12%);
  --analytics-warning: #f0a33d;
  --analytics-warning-soft: rgb(240 163 61 / 12%);
  --analytics-danger: #ff6b7c;
  --analytics-danger-soft: rgb(255 107 124 / 12%);
}

.analytics-header {
  display: flex;
  min-height: 54px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 10px;
}

.analytics-header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 650;
  letter-spacing: 0;
  line-height: 1.35;
}

.analytics-header p {
  margin: 2px 0 0;
  color: var(--analytics-muted);
  font-size: 12px;
}

.analytics-toolbar,
.period-switch {
  display: flex;
  align-items: center;
}

.analytics-toolbar {
  gap: 8px;
}

.demo-label,
.event-count,
.updated-at {
  color: var(--analytics-muted);
  font-size: 11px;
}

.demo-label {
  padding: 4px 7px;
  border: 1px solid var(--analytics-border);
  border-radius: 4px;
  background: var(--analytics-panel);
}

.period-switch {
  height: 32px;
  padding: 2px;
  border: 1px solid var(--analytics-border);
  border-radius: 5px;
  background: var(--analytics-panel);
}

.period-switch button {
  height: 26px;
  padding: 0 10px;
  border: 0;
  border-radius: 3px;
  color: var(--analytics-muted);
  background: transparent;
  cursor: pointer;
  font-size: 11px;
}

.period-switch button.active {
  color: #fff;
  background: var(--analytics-primary);
}

.icon-button,
.row-action {
  display: inline-grid;
  place-items: center;
  border: 1px solid var(--analytics-border);
  border-radius: 5px;
  color: var(--analytics-muted);
  background: var(--analytics-panel);
  cursor: pointer;
}

.icon-button {
  width: 32px;
  height: 32px;
}

.icon-button:hover,
.row-action:hover {
  color: var(--analytics-primary);
  border-color: var(--analytics-primary);
}

.icon-button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 10px;
}

.metric-card,
.analytics-panel {
  border: 1px solid var(--analytics-border);
  border-radius: 6px;
  background: var(--analytics-panel);
  box-shadow: 0 6px 18px rgb(37 73 101 / 5%);
}

.analytics-dashboard--dark .metric-card,
.analytics-dashboard--dark .analytics-panel {
  box-shadow: 0 8px 22px rgb(0 0 0 / 17%);
}

.metric-card {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 88px;
  align-items: center;
  gap: 10px;
  padding: 12px;
}

.metric-icon {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  place-items: center;
  border-radius: 5px;
  font-size: 17px;
}

.metric-content {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.metric-label,
.metric-note {
  overflow: hidden;
  color: var(--analytics-muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-value {
  color: var(--analytics-text);
  font-size: 21px;
  font-weight: 680;
  line-height: 1.1;
}

.metric-value small {
  margin-left: 4px;
  color: var(--analytics-muted);
  font-size: 10px;
  font-weight: 500;
}

.metric-change {
  position: absolute;
  top: 10px;
  right: 10px;
  max-width: 82px;
  overflow: hidden;
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tone-info {
  color: var(--analytics-primary);
  background: var(--analytics-primary-soft);
}

.tone-success {
  color: var(--analytics-success);
  background: var(--analytics-success-soft);
}

.tone-warning {
  color: var(--analytics-warning);
  background: var(--analytics-warning-soft);
}

.tone-danger {
  color: var(--analytics-danger);
  background: var(--analytics-danger-soft);
}

.primary-grid,
.insights-grid,
.details-grid {
  display: grid;
  gap: 10px;
  margin-bottom: 10px;
}

.primary-grid {
  grid-template-columns: minmax(0, 2.25fr) minmax(300px, 0.75fr);
}

.insights-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.details-grid {
  grid-template-columns: minmax(0, 2.15fr) minmax(310px, 0.85fr);
  margin-bottom: 0;
}

.analytics-panel {
  min-width: 0;
  overflow: hidden;
}

.panel-header {
  display: flex;
  min-height: 46px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 12px;
  border-bottom: 1px solid var(--analytics-border);
}

.panel-header > div:first-child {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.panel-title {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 650;
}

.panel-title :deep(.anticon) {
  color: var(--analytics-primary);
}

.panel-header small {
  color: var(--analytics-muted);
  font-size: 10px;
}

.health-score {
  color: var(--analytics-success);
  font-size: 18px;
}

.pipeline-list {
  display: grid;
  padding: 10px 12px 6px;
  gap: 9px;
}

.pipeline-stage {
  display: grid;
  gap: 4px;
}

.pipeline-stage__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
}

.pipeline-stage__heading strong {
  font-weight: 600;
}

.pipeline-stage__heading span,
.pipeline-stage small {
  color: var(--analytics-muted);
}

.pipeline-stage small {
  font-size: 9px;
}

.pipeline-progress,
.job-progress {
  overflow: hidden;
  background: var(--analytics-panel-muted);
}

.pipeline-progress {
  height: 5px;
  border-radius: 3px;
}

.pipeline-progress span,
.job-progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--analytics-primary);
}

.panel-command,
.text-command {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  color: var(--analytics-primary);
  background: transparent;
  cursor: pointer;
  font-size: 11px;
}

.panel-command {
  width: calc(100% - 24px);
  height: 32px;
  justify-content: center;
  margin: 4px 12px 10px;
  border: 1px solid var(--analytics-border);
  border-radius: 5px;
  background: var(--analytics-primary-soft);
}

.panel-command:hover {
  border-color: var(--analytics-primary);
}

.status-summary {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--analytics-success);
  font-size: 10px;
}

.table-scroll {
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 880px;
  border-collapse: collapse;
  font-size: 11px;
}

th,
td {
  padding: 9px 10px;
  border-bottom: 1px solid var(--analytics-border);
  text-align: left;
  white-space: nowrap;
}

th {
  color: var(--analytics-muted);
  background: var(--analytics-panel-muted);
  font-size: 10px;
  font-weight: 550;
}

tbody tr:last-child td {
  border-bottom: 0;
}

tbody tr:hover {
  background: var(--analytics-primary-soft);
}

td small {
  display: block;
  margin-top: 2px;
  color: var(--analytics-muted);
  font-size: 9px;
}

.job-link {
  max-width: 210px;
  overflow: hidden;
  padding: 0;
  border: 0;
  color: var(--analytics-text);
  background: transparent;
  cursor: pointer;
  font-weight: 600;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.job-link:hover {
  color: var(--analytics-primary);
}

.numeric {
  font-variant-numeric: tabular-nums;
}

.status-tag {
  display: inline-flex;
  align-items: center;
  min-width: 44px;
  justify-content: center;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 9px;
}

.job-progress-cell {
  display: grid;
  grid-template-columns: 28px 54px;
  align-items: center;
  gap: 5px;
}

.job-progress {
  height: 4px;
  border-radius: 2px;
}

.row-action {
  width: 26px;
  height: 26px;
}

.event-list {
  display: grid;
}

.event-row {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr);
  gap: 8px;
  padding: 11px 12px;
  border-bottom: 1px solid var(--analytics-border);
}

.event-row:last-child {
  border-bottom: 0;
}

.event-icon {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 4px;
  font-size: 11px;
}

.event-heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 6px;
}

.event-heading strong {
  overflow: hidden;
  font-size: 11px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-heading time {
  color: var(--analytics-muted);
  font-size: 9px;
}

.event-row p {
  margin: 4px 0 0;
  color: var(--analytics-muted);
  font-size: 10px;
  line-height: 1.5;
}

.spinning {
  animation: rotate 800ms linear infinite;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@keyframes rotate {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1280px) {
  .metrics-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .primary-grid,
  .details-grid {
    grid-template-columns: minmax(0, 1.65fr) minmax(290px, 0.85fr);
  }
  .insights-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .insights-grid > :last-child {
    grid-column: 1 / -1;
  }
}

@media (max-width: 900px) {
  .primary-grid,
  .details-grid,
  .insights-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .insights-grid > :last-child {
    grid-column: auto;
  }
}

@media (max-width: 640px) {
  .analytics-dashboard {
    padding: 8px;
  }
  .analytics-header {
    align-items: flex-start;
    flex-direction: column;
  }
  .analytics-toolbar {
    width: 100%;
    flex-wrap: wrap;
  }
  .demo-label {
    display: none;
  }
  .period-switch {
    flex: 1;
  }
  .period-switch button {
    flex: 1;
    padding: 0 7px;
  }
  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .metric-card {
    min-height: 82px;
    padding: 10px;
  }
  .metric-change {
    display: none;
  }
}

@media (max-width: 390px) {
  .metrics-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .spinning {
    animation: none;
  }
}
</style>
