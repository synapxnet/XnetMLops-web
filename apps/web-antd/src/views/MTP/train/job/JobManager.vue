<!--
Copyright (C) 2026 Synapxnet. All rights reserved.
This file is Synapxnet Proprietary and Confidential. It is strictly
forbidden to copy, distribute, or use without explicit authorization.
用途：训练作业的真实详情与控制台。Purpose: Actual training job details and console output.
Author: maoyo | Department: 研发部 | Date: 2026-09-14
Version: 1.0.0 | Security Level: INTERNAL
__version__: 1.0.0 | __author__: maoyo | __copyright__: Copyright 2026 Synapxnet
__maintainer__: maoyo | __email__: synapxnet@gmail.com
-->
<script lang="ts" setup>
import type { JobSnapshot } from './job-status';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Alert, Button, Card, Modal, Steps, Tag } from 'ant-design-vue';
import BusinessPage from '#/components/workspace/BusinessPage.vue';
import { fetchPipelineStatus } from '../../../SMP/api/traintask';
import { parsePipelineStatus, routeIdentity } from './job-status';
const route = useRoute();
const router = useRouter();
const taskInfo = ref<JobSnapshot | null>(null);
const currentStep = ref(0);
const loading = ref(false);
const error = ref('');
const logsOpen = ref(false);
const logsLoading = ref(false);
const logsError = ref('');
const fullLogs = ref<null | string>(null);
let generation = 0;
let logsGeneration = 0;
/** 每次路由变化读取新作业，不补默认ID。 Read the current route identity without a default job. */
const jobUid = computed(() => routeIdentity(route.query.id));
/** 租户参数缺失时明确停止读取。 Stop reads when the route tenant is missing. */
const tenantUid = computed(() => routeIdentity(route.query.tenantUid));
/** 只展示已取得的实际阶段。 Display only stages returned by the service. */
const stages = computed(() => taskInfo.value?.stages ?? []);
/** 当前阶段由用户选择和实际数组决定。 Resolve the selected stage from the actual array. */
const activeStage = computed(() => stages.value[currentStep.value]);
/** 将路由身份绑定每次异步读取。 Bind asynchronous reads to the route identity. */
function currentScope(): string {
  return `${jobUid.value}|${tenantUid.value}`;
}
/** 保留服务端错误说明，未知错误使用明确失败提示。 Retain service errors and use an explicit failure message otherwise. */
function errorMessage(cause: unknown): string {
  return cause instanceof Error && cause.message
    ? cause.message
    : '作业详情暂时无法读取，请稍后重试';
}
/** 清空旧详情后读取真实状态，拒绝迟到或错作业响应。 Clear stale details and reject late or mismatched job responses. */
async function loadTaskData(): Promise<void> {
  const ticket = ++generation;
  ++logsGeneration;
  const scope = currentScope();
  taskInfo.value = null;
  currentStep.value = 0;
  error.value = '';
  logsOpen.value = false;
  logsLoading.value = false;
  fullLogs.value = null;
  logsError.value = '';
  if (!jobUid.value || !tenantUid.value) {
    loading.value = false;
    error.value = '缺少有效的作业或租户标识，请从训练任务列表重新打开';
    return;
  }
  loading.value = true;
  const job = jobUid.value;
  try {
    const response = await fetchPipelineStatus(job, tenantUid.value);
    if (ticket !== generation || scope !== currentScope()) return;
    taskInfo.value = parsePipelineStatus(response, job);
    const active = taskInfo.value.stages.findIndex(isActiveStage);
    currentStep.value = Math.max(0, active);
  } catch (cause) {
    if (ticket === generation && scope === currentScope())
      error.value = errorMessage(cause);
  } finally {
    if (ticket === generation && scope === currentScope())
      loading.value = false;
  }
}
/** 优先定位正在执行或失败的真实阶段。 Prefer an actually running or failed stage. */
function isActiveStage(stage: JobSnapshot['stages'][number]): boolean {
  return stage.status === 'process' || stage.status === 'error';
}
/** 选择有效阶段，不把前序阶段推断为已完成。 Select a valid stage without marking preceding stages complete. */
function handleStepChange(step: number): void {
  if (Number.isInteger(step) && step >= 0 && step < stages.value.length)
    currentStep.value = step;
}
/** 刷新完成以真实响应为准，不提前报告成功。 Refresh against the actual response without premature success messages. */
function refreshStatus(): void {
  void loadTaskData();
}
/** 通过已有控制台读取契约展示原文，错误不回退合成日志。 Read original console output through the existing contract without synthetic fallback logs. */
async function viewFullLogs(): Promise<void> {
  if (!taskInfo.value || loading.value || logsLoading.value) return;
  const ticket = ++logsGeneration;
  const scope = currentScope();
  const job = jobUid.value;
  logsOpen.value = true;
  logsLoading.value = true;
  logsError.value = '';
  fullLogs.value = null;
  try {
    const response = await fetchPipelineStatus(job, tenantUid.value, true);
    if (ticket !== logsGeneration || scope !== currentScope()) return;
    fullLogs.value = parsePipelineStatus(response, job).consoleOutput;
  } catch (cause) {
    if (ticket === logsGeneration && scope === currentScope())
      logsError.value = errorMessage(cause);
  } finally {
    if (ticket === logsGeneration && scope === currentScope())
      logsLoading.value = false;
  }
}
/** 关闭日志使待返回读取失效。 Invalidate pending log reads when the dialog closes. */
function closeLogs(): void {
  ++logsGeneration;
  logsOpen.value = false;
  logsLoading.value = false;
}
/** 返回已有训练任务入口。 Return to the existing training task list. */
function backToTasks(): void {
  void router.push('/MTP/train/index');
}
/** 离页使所有读取失效，不保留旧作业回调。 Invalidate all reads when leaving the job page. */
function dispose(): void {
  ++generation;
  ++logsGeneration;
}
watch(currentScope, refreshStatus, { immediate: true });
onBeforeUnmount(dispose);
</script>
<template>
  <BusinessPage
    domain="模型研发"
    description="沿着实际阶段和原始日志，了解训练作业进展。"
    existing-title
  >
    <div class="task-detail-container">
      <Card class="header-card">
        <div class="header-content">
          <div class="task-header">
            <div class="task-title-row">
              <h1 class="task-title">
                {{ taskInfo?.title ?? '训练作业详情' }}
              </h1>
              <Tag :color="taskInfo?.color ?? 'default'">{{
                loading ? '正在读取' : (taskInfo?.statusLabel ?? '状态未知')
              }}</Tag>
            </div>
            <p class="task-id">作业标识：{{ jobUid || '未提供' }}</p>
            <div class="task-info">
              <span>创建者：{{ taskInfo?.creator ?? '未提供' }}</span
              ><span>创建时间：{{ taskInfo?.createTime ?? '未提供' }}</span>
            </div>
          </div>
          <Button @click="backToTasks">返回训练任务</Button>
        </div>
        <dl v-if="taskInfo" class="stat-grid">
          <div>
            <dt>开始时间</dt>
            <dd>{{ taskInfo.startTime ?? '未提供' }}</dd>
          </div>
          <div>
            <dt>已记录运行时长</dt>
            <dd>{{ taskInfo.elapsedTime ?? '未提供' }}</dd>
          </div>
          <div>
            <dt>预估剩余时间</dt>
            <dd>未提供</dd>
          </div>
        </dl>
      </Card>
      <Alert
        v-if="error"
        type="error"
        show-icon
        message="作业详情未能读取"
        :description="error"
        class="read-message"
        ><template #action
          ><Button :loading="loading" @click="refreshStatus"
            >重试</Button
          ></template
        ></Alert
      >
      <p v-if="loading" class="empty-state" role="status">
        正在读取当前作业的状态与阶段…
      </p>
      <Card v-else-if="taskInfo && !stages.length" class="steps-card"
        ><div class="empty-state">
          当前作业尚未提供阶段记录。可以刷新状态或查看已采集的完整日志。
        </div></Card
      >
      <Card v-else-if="stages.length" class="steps-card"
        ><Steps :current="currentStep" size="small" @change="handleStepChange"
          ><Steps.Step
            v-for="(stage, index) in stages"
            :key="index"
            :title="stage.title"
            :status="stage.status"
            :description="stage.description" /></Steps
      ></Card>
      <Card v-if="activeStage" class="step-card">
        <div class="step-header">
          <h2>{{ activeStage.title }}</h2>
          <span>{{ activeStage.description }}</span>
        </div>
        <dl class="stat-grid">
          <div>
            <dt>开始时间</dt>
            <dd>{{ activeStage.startTime ?? '未提供' }}</dd>
          </div>
          <div>
            <dt>
              结束时间{{
                activeStage.endTimeDerived ? '（按已结束阶段耗时计算）' : ''
              }}
            </dt>
            <dd>{{ activeStage.endTime ?? '未提供' }}</dd>
          </div>
          <div>
            <dt>已记录耗时</dt>
            <dd>{{ activeStage.duration ?? '未提供' }}</dd>
          </div>
        </dl>
        <div class="log-header">
          <h3>阶段日志</h3>
          <span>{{
            activeStage.logs.length
              ? `${activeStage.logs.length} 行原始文本`
              : '当前状态接口未提供阶段日志'
          }}</span>
        </div>
        <pre v-if="activeStage.logs.length" class="logs-container">{{
          activeStage.logs.join('\n')
        }}</pre>
        <p v-else class="empty-state">
          没有可显示的阶段日志。完整控制台与阶段状态分别读取。
        </p>
      </Card>
      <div class="footer-actions">
        <Button type="primary" :loading="loading" @click="refreshStatus"
          >刷新状态</Button
        ><Button
          :disabled="!taskInfo || loading"
          :loading="logsLoading"
          @click="viewFullLogs"
          >查看完整日志</Button
        ><Button disabled>暂停任务</Button
        ><Button danger disabled>终止任务</Button>
      </div>
      <p class="control-note">
        此作业的暂停和终止控制尚未接入。状态与日志读取不会操作训练进程。
      </p>
    </div>
    <Modal
      :open="logsOpen"
      title="训练作业 · 完整日志"
      :footer="null"
      width="min(960px, 94vw)"
      @cancel="closeLogs"
      ><p v-if="logsLoading" role="status">正在读取原始控制台输出…</p>
      <Alert v-else-if="logsError" type="error" show-icon :message="logsError"
        ><template #action
          ><Button @click="viewFullLogs">重试日志</Button></template
        ></Alert
      >
      <pre v-else-if="fullLogs !== null" class="logs-container full-logs">{{
        fullLogs
      }}</pre>
      <p v-else class="empty-state">服务端尚未提供控制台日志。</p></Modal
    >
  </BusinessPage>
</template>
<style scoped>
.task-detail-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}
.header-card,
.steps-card,
.step-card {
  margin-bottom: 20px;
  border-radius: var(--workspace-radius, 12px);
}
.header-card {
  background: linear-gradient(
    125deg,
    hsl(var(--primary) / 10%),
    hsl(var(--card))
  );
}
.header-content,
.task-title-row,
.step-header,
.log-header,
.footer-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.header-content,
.step-header,
.log-header {
  justify-content: space-between;
  flex-wrap: wrap;
}
.task-header {
  min-width: 0;
}
.task-title {
  margin: 0;
  font-size: 1.5rem;
  color: hsl(var(--foreground));
}
.task-id {
  margin: 10px 0;
  overflow-wrap: anywhere;
  color: hsl(var(--muted-foreground));
}
.task-info {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  color: hsl(var(--muted-foreground));
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin: 24px 0 0;
}
.stat-grid dt {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}
.stat-grid dd {
  margin: 6px 0 0;
  overflow-wrap: anywhere;
}
.step-header h2 {
  margin: 0;
  font-size: 18px;
}
.step-header span,
.log-header span {
  color: hsl(var(--muted-foreground));
}
.log-header {
  margin-top: 24px;
}
.log-header h3 {
  margin: 0;
  font-size: 15px;
}
.logs-container {
  margin: 12px 0 0;
  padding: 16px;
  max-height: 420px;
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: hsl(var(--muted));
  color: hsl(var(--foreground));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  font:
    13px/1.6 ui-monospace,
    monospace;
}
.full-logs {
  max-height: 65vh;
}
.empty-state {
  padding: 24px 12px;
  color: hsl(var(--muted-foreground));
  text-align: center;
}
.read-message {
  margin-bottom: 20px;
}
.footer-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
  margin-top: 20px;
}
.control-note {
  text-align: right;
  margin-top: 12px;
  color: hsl(var(--muted-foreground));
}
@media (max-width: 768px) {
  .stat-grid {
    grid-template-columns: 1fr;
  }
  .task-title-row {
    flex-wrap: wrap;
  }
  .footer-actions {
    justify-content: flex-start;
  }
  .control-note {
    text-align: left;
  }
}
</style>
