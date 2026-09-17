<!--
Copyright (C) 2026 Synapxnet. All rights reserved.
This file is Synapxnet Proprietary and Confidential. It is strictly forbidden to copy, distribute, or use without explicit authorization.
MLOps 工作台行动入口。 MLOps operational workbench entry.
Author: maoyo | Department: 研发部 | Date: 2026-09-15 | Version: 1.3.0
Security Level: INTERNAL | Maintainer: maoyo | Email: synapxnet@gmail.com
-->
<script setup lang="ts">
import type { Ref } from 'vue';
import type { ModelEvidenceRun } from '#/views/MTP/model-evidence/model';
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Alert, Button, Empty, Tag } from 'ant-design-vue';
import {
  ArrowRightOutlined,
  BoxPlotOutlined,
  CodeOutlined,
  ExperimentOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';
import { fetchModelEvidence } from '#/views/MTP/model-evidence/api';
import { fetchAllTrainTasks } from '#/views/SMP/api/traintask';
import BusinessPage from './BusinessPage.vue';

type TrainingTask = Awaited<ReturnType<typeof fetchAllTrainTasks>>[number];
const router = useRouter();
const organization = inject<Ref<{ tenantUid: null | string }>>(
  'selectedOrganization',
  ref({ tenantUid: null }),
);
const tasks = ref<TrainingTask[]>([]);
const runs = ref<ModelEvidenceRun[]>([]);
const loading = ref(false);
const taskError = ref('');
const evidenceError = ref('');
let generation = 0;
const statuses = {
  failed: { text: '训练失败', color: 'error' },
  running: { text: '训练中', color: 'processing' },
  succeeded: { text: '训练已完成', color: 'blue' },
  unknown: { text: '状态未知', color: 'default' },
};

/** 将有效时间用于排序，缺失时间排到末尾。 Sort valid timestamps with missing dates last. */
function timestamp(value?: null | string) {
  const time = Date.parse(value || '');
  return Number.isFinite(time) ? time : 0;
}
/** 按最近修改时间显示可继续的原生训练任务。 List native training tasks by their latest recorded update. */
function recentTasks() {
  return [...tasks.value]
    .sort(
      (a, b) =>
        timestamp(b.updated_at || b.created_at) -
        timestamp(a.updated_at || a.created_at),
    )
    .slice(0, 6);
}
/** 最近活动仅覆盖推荐训练记录，不能代表全部平台任务。 Recent activity covers recommendation records only. */
function recentRuns() {
  return [...runs.value]
    .sort(
      (a, b) =>
        timestamp(b.startedAt || b.completedAt) -
        timestamp(a.startedAt || a.completedAt),
    )
    .slice(0, 5);
}
const latestTasks = computed(recentTasks);
const latestRuns = computed(recentRuns);

/** 格式化来源时间，不为缺失时间生成当前值。 Format source timestamps without inventing dates. */
function recordTime(value?: null | string) {
  if (!timestamp(value)) return '时间未记录';
  return new Date(value!).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
/** 读取两类原生数据并保留各自错误，组织切换时拒绝迟到响应。 Load both sources with independent errors and reject stale scope responses. */
async function loadWorkbench() {
  const request = ++generation;
  const tenantUid = organization.value.tenantUid;
  tasks.value = [];
  runs.value = [];
  taskError.value = '';
  evidenceError.value = '';
  if (!tenantUid) {
    loading.value = false;
    return;
  }
  loading.value = true;
  const [taskResult, evidenceResult] = await Promise.allSettled([
    fetchAllTrainTasks(tenantUid),
    fetchModelEvidence(tenantUid),
  ]);
  if (request !== generation || tenantUid !== organization.value.tenantUid)
    return;
  if (taskResult.status === 'fulfilled' && Array.isArray(taskResult.value)) {
    tasks.value = taskResult.value;
  } else {
    taskError.value = '训练任务读取失败，请检查服务与组织权限后重试。';
  }
  if (
    evidenceResult.status === 'fulfilled' &&
    evidenceResult.value?.scope?.tenantUid === tenantUid &&
    evidenceResult.value.scope.kind === 'tenant' &&
    Array.isArray(evidenceResult.value.runs)
  ) {
    runs.value = evidenceResult.value.runs;
  } else {
    evidenceError.value = '推荐训练活动读取失败，请稍后重试。';
  }
  loading.value = false;
}
/** 前往已注册的业务页面。 Open a registered business page. */
function open(path: string) {
  void router.push(path);
}
/** 打开指定训练任务，编辑仍由原生页面控制。 Open a task in the existing native editor. */
function openTask(uid: string) {
  void router.push({ path: '/MTP/train/task', query: { id: uid } });
}
/** 在模型证据页定位当前运行。 Locate the current run in the model evidence page. */
function openEvidence(uid: string) {
  void router.push({ path: '/MTP/model-evidence', query: { runUid: uid } });
}
/** 提供明确的已知或未知训练状态。 Display known and unknown training states explicitly. */
function status(run: ModelEvidenceRun) {
  return statuses[run.status] ?? statuses.unknown;
}
/** 页面离开后拒绝未完成响应。 Reject pending responses after leaving the page. */
function invalidate() {
  generation += 1;
}
/** 按当前租户切换工作范围。 Follow the current tenant work scope. */
function tenantKey() {
  return organization.value.tenantUid;
}
watch(tenantKey, loadWorkbench, { immediate: true });
onBeforeUnmount(invalidate);
</script>

<template>
  <BusinessPage
    domain="模型研发"
    title="工作台"
    description="训练任务、模型输出与最近活动。"
    variant="overview"
  >
    <template #actions>
      <Button
        :loading="loading"
        :disabled="!organization.tenantUid"
        aria-label="刷新工作台"
        title="刷新工作台"
        @click="loadWorkbench"
        ><ReloadOutlined
      /></Button>
      <Button
        type="primary"
        :disabled="!organization.tenantUid"
        @click="open('/MTP/train/task')"
        ><PlusOutlined />新建训练任务</Button
      >
    </template>
    <Empty
      v-if="!organization.tenantUid"
      class="workbench-empty"
      description="请先选择组织"
    />
    <template v-else>
      <nav class="workbench-actions" aria-label="研发动作">
        <button type="button" @click="open('/MTP/algorithm/index')">
          <CodeOutlined /><span>算法</span><ArrowRightOutlined />
        </button>
        <button type="button" @click="open('/MTP/modeloutput/index')">
          <ExperimentOutlined /><span>模型输出</span><ArrowRightOutlined />
        </button>
        <button type="button" @click="open('/MEP/deployment/index')">
          <BoxPlotOutlined /><span>模型部署</span><ArrowRightOutlined />
        </button>
      </nav>
      <div class="workbench-columns">
        <section class="workbench-tasks" aria-label="最近训练任务">
          <header class="section-toolbar">
            <h2>
              最近训练任务
              <span>{{ loading || taskError ? '待确认' : tasks.length }}</span>
            </h2>
            <Button type="link" @click="open('/MTP/train/index')"
              >全部任务<ArrowRightOutlined
            /></Button>
          </header>
          <Alert v-if="taskError" :message="taskError" show-icon type="error"
            ><template #action
              ><Button size="small" @click="loadWorkbench"
                >重试</Button
              ></template
            ></Alert
          >
          <p v-else-if="loading" class="workbench-loading" role="status">
            正在读取训练任务...
          </p>
          <Empty
            v-else-if="!latestTasks.length"
            class="workbench-empty"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
            description="暂无训练任务"
            ><Button @click="open('/MTP/train/task')"
              ><PlusOutlined />新建任务</Button
            ></Empty
          >
          <div v-else class="task-list">
            <button
              v-for="task in latestTasks"
              :key="task.uid"
              type="button"
              class="task-row"
              @click="openTask(task.uid)"
            >
              <span class="task-icon"><ExperimentOutlined /></span>
              <span class="task-identity"
                ><strong>{{ task.task_name || task.uid }}</strong
                ><small
                  >{{ task.algorithm_name || '算法未记录'
                  }}<template v-if="task.algorithm_version">
                    · {{ task.algorithm_version }}</template
                  ></small
                ></span
              >
              <time>{{ recordTime(task.updated_at || task.created_at) }}</time
              ><ArrowRightOutlined />
            </button>
          </div>
        </section>
        <section class="workbench-activity" aria-label="最近推荐训练活动">
          <header class="section-toolbar">
            <h2>推荐训练活动</h2>
            <Button type="link" @click="open('/analytics')"
              >分析<ArrowRightOutlined
            /></Button>
          </header>
          <Alert
            v-if="evidenceError"
            :message="evidenceError"
            show-icon
            type="error"
            ><template #action
              ><Button size="small" @click="loadWorkbench"
                >重试</Button
              ></template
            ></Alert
          >
          <p v-else-if="loading" class="workbench-loading" role="status">
            正在读取训练活动...
          </p>
          <Empty
            v-else-if="!latestRuns.length"
            class="workbench-empty"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
            description="暂无推荐训练活动"
          />
          <div v-else class="activity-list">
            <button
              v-for="run in latestRuns"
              :key="run.runUid"
              type="button"
              class="activity-row"
              @click="openEvidence(run.runUid)"
            >
              <span class="activity-heading"
                ><Tag :color="status(run).color">{{ status(run).text }}</Tag
                ><time>{{ recordTime(run.startedAt) }}</time></span
              >
              <strong>{{ run.productVersion || '数据版本未记录' }}</strong
              ><small>{{ run.runUid }}</small>
            </button>
          </div>
        </section>
      </div>
    </template>
  </BusinessPage>
</template>

<style scoped>
.workbench-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-block: 1px solid var(--xnet-line);
  margin: 2px 0 24px;
}
.workbench-actions button {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 18px 20px;
  color: var(--xnet-ink);
  text-align: left;
  transition:
    background 160ms,
    color 160ms;
}
.workbench-actions button + button {
  border-left: 1px solid var(--xnet-line);
}
.workbench-actions button > span:first-child {
  color: hsl(var(--primary));
  font-size: 18px;
}
.workbench-actions button > span:last-child {
  margin-left: auto;
  color: var(--xnet-muted);
}
.workbench-actions button:hover,
.task-row:hover,
.activity-row:hover {
  background: hsl(var(--primary) / 0.055);
}
.workbench-columns {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(270px, 1fr);
  gap: 28px;
  align-items: start;
}
.workbench-tasks,
.workbench-activity {
  min-width: 0;
}
.workbench-activity {
  border-left: 1px solid var(--xnet-line);
  padding-left: 28px;
}
.section-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 48px;
  border-bottom: 1px solid var(--xnet-line);
  margin-bottom: 8px;
}
.section-toolbar h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}
.section-toolbar h2 > span {
  font-size: 12px;
  font-weight: 400;
  color: var(--xnet-muted);
  margin-left: 8px;
}
.task-row {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
  padding: 17px 8px;
  border-bottom: 1px solid var(--xnet-line);
  color: var(--xnet-ink);
  text-align: left;
  transition: background 160ms;
}
.task-icon {
  color: hsl(var(--primary));
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: hsl(var(--primary) / 0.07);
  border-radius: 6px;
}
.task-identity {
  min-width: 0;
  flex: 1;
}
.task-identity strong,
.activity-row strong {
  display: block;
  font-size: 13px;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.task-identity small,
.activity-row small {
  display: block;
  margin-top: 5px;
  font-size: 12px;
  color: var(--xnet-muted);
  overflow-wrap: anywhere;
}
.task-row time,
.activity-row time {
  color: var(--xnet-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.task-row > span:last-child {
  color: var(--xnet-muted);
}
.activity-row {
  display: block;
  width: 100%;
  text-align: left;
  padding: 15px 8px;
  border-bottom: 1px solid var(--xnet-line);
  color: var(--xnet-ink);
  transition: background 160ms;
}
.activity-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.activity-heading :deep(.ant-tag) {
  margin: 0;
  font-size: 11px;
}
.workbench-loading {
  padding: 28px 8px;
  color: var(--xnet-muted);
}
.workbench-empty {
  margin: 36px 0;
}
button:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: -2px;
}
@media (max-width: 1000px) {
  .workbench-columns {
    grid-template-columns: minmax(0, 1fr);
  }
  .workbench-activity {
    padding-left: 0;
    border-left: 0;
  }
}
@media (max-width: 600px) {
  .workbench-actions button {
    gap: 8px;
    padding: 14px 10px;
  }
  .workbench-actions button > span:last-child {
    display: none;
  }
  .task-row time {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .workbench-actions button,
  .task-row,
  .activity-row {
    transition: none;
  }
}
</style>
