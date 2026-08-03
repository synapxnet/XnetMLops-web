<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { RollbackOutlined } from '@ant-design/icons-vue';
import {
  Alert,
  Button,
  Drawer,
  Form,
  FormItem,
  Input,
  InputNumber,
  Switch,
  Table,
  Tag,
  Timeline,
  TimelineItem,
} from 'ant-design-vue';

import {
  getDeploymentEvidence,
  rollbackDeployment,
  runInferenceProbe,
} from '../api/mlopsTool';
import type {
  DeploymentEvidence,
  InferenceProbeResult,
  RollbackAcceptance,
} from '../api/mlopsTool';
import type { ToolMeta } from '../api/types';
import IncidentContextBar from '../components/IncidentContextBar.vue';
import { useDeploymentAction } from '../composables/useDeploymentAction';
import { useIncidentContext } from '../composables/useIncidentContext';

const route = useRoute();
const { context, isComplete } = useIncidentContext();
const { action, pollingError, start: startPolling, stop: stopPolling } = useDeploymentAction();
const deployment = ref<DeploymentEvidence>();
const probe = ref<InferenceProbeResult>();
const acceptance = ref<RollbackAcceptance>();
const meta = ref<ToolMeta>();
const loading = ref(false);
const probeLoading = ref(false);
const rollbackLoading = ref(false);
const errorMessage = ref('');
const drawerOpen = ref(false);
const targetRevision = ref(17);
const approvalId = ref('');
const reason = ref('v18 输入维度与生产 120 维特征不一致，回滚到已验证的 v17');
const dryRun = ref(true);
const maxErrorRate = ref(0.02);
const maxP95Ms = ref(800);
const idempotencyKey = ref(crypto.randomUUID());

const deploymentUid = computed(() => String(route.query.deploymentUid ?? 'deploy_risk_prod'));
const drift = computed(() => deployment.value
  ? deployment.value.status === 'running' !== deployment.value.readiness.ready
  : false);
const actionStages = ['PRECHECK', 'APPLYING', 'WAITING_READY', 'VERIFYING', 'FINALIZING'];

const revisionColumns = [
  { dataIndex: 'revisionNumber', key: 'revisionNumber', title: 'Revision', width: 100 },
  { dataIndex: 'modelVersion', key: 'modelVersion', title: '模型版本', width: 120 },
  { key: 'dimension', title: '输入维度', width: 110 },
  { dataIndex: 'imageRef', key: 'imageRef', title: '镜像' },
  { key: 'contract', title: '契约 Hash' },
  { dataIndex: 'createdAt', key: 'createdAt', title: '创建时间', width: 180 },
];

/** 刷新部署证据和最新资源版本。 */
async function loadDeployment() {
  if (!isComplete.value) return;
  loading.value = true;
  errorMessage.value = '';
  try {
    const response = await getDeploymentEvidence(deploymentUid.value, context.value);
    if (response.success && response.data) {
      deployment.value = response.data;
      meta.value = response.meta;
    } else {
      errorMessage.value = response.error?.message ?? '部署证据加载失败';
    }
  } catch {
    errorMessage.value = '部署证据暂时无法访问。';
  } finally {
    loading.value = false;
  }
}

/** 执行脱敏 Fixture 探针并展示真实契约与性能结果。 */
async function runProbe() {
  probeLoading.value = true;
  try {
    const response = await runInferenceProbe(deploymentUid.value, context.value);
    if (response.success && response.data) probe.value = response.data;
    else errorMessage.value = response.error?.message ?? '推理探针失败';
  } finally {
    probeLoading.value = false;
  }
}

/** 打开回滚抽屉前强制刷新 resourceVersion。 */
async function openRollback() {
  await loadDeployment();
  drawerOpen.value = true;
}

/** 提交预检或回滚，同一次逻辑动作的网络重试沿用幂等键。 */
async function submitRollback() {
  if (!deployment.value || !approvalId.value || reason.value.trim().length < 4) return;
  rollbackLoading.value = true;
  try {
    const response = await rollbackDeployment(
      deploymentUid.value,
      targetRevision.value,
      { maxErrorRate: maxErrorRate.value, maxP95Ms: maxP95Ms.value },
      {
        approvalId: approvalId.value,
        dryRun: dryRun.value,
        expectedResourceVersion: deployment.value.resourceVersion,
        idempotencyKey: idempotencyKey.value,
        reason: reason.value,
      },
      context.value,
    );
    if (response.success && response.data) {
      acceptance.value = response.data;
      drawerOpen.value = false;
      if (response.data.actionId) {
        startPolling(response.data.actionId, idempotencyKey.value, context.value);
      } else {
        stopPolling();
      }
    } else {
      errorMessage.value = response.error?.message ?? '回滚受理失败';
    }
  } finally {
    rollbackLoading.value = false;
  }
}

/** 判断动作阶段是否已到达。 */
function stageColor(stage: string) {
  const current = action.value?.stage ?? acceptance.value?.stage;
  const currentIndex = actionStages.indexOf(current ?? '');
  const stageIndex = actionStages.indexOf(stage);
  if (action.value?.status === 'FAILED' && stage === current) return 'red';
  return stageIndex <= currentIndex ? 'green' : 'gray';
}

/** 回滚参数变化后生成新幂等键，避免不同参数复用旧动作。 */
watch([targetRevision, reason, dryRun, maxErrorRate, maxP95Ms], () => {
  idempotencyKey.value = crypto.randomUUID();
});

/** 动作成功后刷新部署并运行独立后置探针。 */
watch(() => action.value?.status, async (status) => {
  if (status === 'SUCCEEDED' && !action.value?.dryRun) {
    await loadDeployment();
    await runProbe();
  }
});

onMounted(loadDeployment);
</script>

<template>
  <div class="agent-page">
    <IncidentContextBar :context="context" :loading="loading" severity="P1" status="待处置" @refresh="loadDeployment" />
    <Alert v-if="!isComplete" banner message="深链缺少 workspaceId 或 traceId。" type="warning" />
    <Alert v-else-if="errorMessage" banner :message="errorMessage" show-icon type="error" />
    <Alert v-if="drift" banner message="数据库期望状态与 Runtime 实际状态存在漂移，回滚入口已停用，请先刷新证据。" show-icon type="warning" />
    <Alert v-if="pollingError" banner :message="pollingError" show-icon type="warning" />

    <main v-if="deployment" class="model-layout">
      <section class="runtime-band">
        <div class="title-group"><span>MEP 部署证据</span><h1>{{ deployment.name }}</h1><code>{{ deployment.deploymentUid }}</code></div>
        <div class="runtime-state"><Tag :color="deployment.readiness.ready ? 'success' : 'error'">{{ deployment.readiness.ready ? 'Runtime 已就绪' : deployment.readiness.runtimeStatus }}</Tag><Button danger :disabled="drift" @click="openRollback"><template #icon><RollbackOutlined /></template>回滚</Button></div>
      </section>

      <dl class="fact-grid">
        <div><dt>模型版本</dt><dd>{{ deployment.modelVersion }}</dd></div>
        <div><dt>输入维度</dt><dd>{{ deployment.modelContract?.inputDimension ?? '-' }}</dd></div>
        <div><dt>活动修订</dt><dd>r{{ deployment.activeRevision }}</dd></div>
        <div><dt>resourceVersion</dt><dd>{{ deployment.resourceVersion }}</dd></div>
        <div><dt>副本</dt><dd>{{ deployment.replicas }}</dd></div>
        <div><dt>镜像</dt><dd>{{ deployment.imageRef }}</dd></div>
      </dl>

      <section class="section-block">
        <header><div><span>修订与契约</span><h2>部署历史</h2></div><Tag>当前 r{{ deployment.activeRevision }}</Tag></header>
        <Table :columns="revisionColumns" :data-source="deployment.revisions" :pagination="false" row-key="uid" size="small">
          <template #bodyCell="{ column, record }">
            <strong v-if="column.key === 'revisionNumber'">r{{ record.revisionNumber }} <Tag v-if="record.revisionNumber === deployment.activeRevision" color="success">当前</Tag></strong>
            <span v-else-if="column.key === 'dimension'">{{ record.modelContract?.inputDimension ?? '-' }}</span>
            <code v-else-if="column.key === 'contract'" class="hash">{{ record.modelContract?.contractHash ?? '-' }}</code>
          </template>
        </Table>
      </section>

      <section class="section-block probe-section">
        <header><div><span>探针与动作</span><h2>独立验证</h2></div><Button :loading="probeLoading" @click="runProbe">运行探针</Button></header>
        <div v-if="probe" class="probe-comparison">
          <div><span>契约</span><strong>{{ probe.contractStatus }}</strong><small>{{ probe.observedInputDimension }} → {{ probe.expectedInputDimension }}</small></div>
          <div><span>错误率</span><strong>{{ (probe.errorRate * 100).toFixed(2) }}%</strong><small>{{ probe.errorCount }}/{{ probe.sampleCount }} 失败</small></div>
          <div><span>P50 / P95</span><strong>{{ probe.p50Ms ?? '-' }} / {{ probe.p95Ms ?? '-' }}</strong><small>毫秒</small></div>
        </div>
        <Timeline v-if="acceptance || action" class="action-timeline">
          <TimelineItem v-for="stage in actionStages" :key="stage" :color="stageColor(stage)">{{ stage }}</TimelineItem>
        </Timeline>
        <Alert v-if="action?.status === 'FAILED'" :message="`${action.errorCode}: ${action.errorMessage}`" show-icon type="error" />
        <Alert v-else-if="acceptance?.dryRun && !acceptance.actionId" message="预检完成，未创建动作、审计回执，也未修改 Runtime 或部署资源。" show-icon type="success" />
      </section>

      <footer class="technical-meta">{{ meta?.source }} · {{ meta?.evidenceId }} · {{ meta?.observedAt }}</footer>
    </main>

    <Drawer v-model:open="drawerOpen" title="受控部署回滚" :width="480">
      <Form layout="vertical">
        <div class="rollback-summary"><span>当前 r{{ deployment?.activeRevision }}</span><strong>→</strong><span>目标 r{{ targetRevision }}</span></div>
        <FormItem label="目标修订" required><InputNumber v-model:value="targetRevision" :min="1" :precision="0" style="width: 100%" /></FormItem>
        <FormItem label="资源版本"><Input :value="deployment?.resourceVersion" disabled /></FormItem>
        <FormItem label="审批编号" required><Input v-model:value="approvalId" placeholder="从 OpenXnet 审批详情获取" /></FormItem>
        <FormItem label="回滚原因" required><Input.TextArea v-model:value="reason" :maxlength="1000" :rows="4" show-count /></FormItem>
        <div class="threshold-grid"><FormItem label="最大错误率"><InputNumber v-model:value="maxErrorRate" :max="1" :min="0" :step="0.01" /></FormItem><FormItem label="最大 P95(ms)"><InputNumber v-model:value="maxP95Ms" :min="1" /></FormItem></div>
        <FormItem label="仅预检"><Switch v-model:checked="dryRun" /></FormItem>
        <Alert message="审批会再次由后端验证范围、摘要、资源版本和职责分离。" show-icon type="info" />
      </Form>
      <template #footer><div class="drawer-footer"><Button @click="drawerOpen = false">取消</Button><Button type="primary" danger :disabled="!approvalId || reason.trim().length < 4" :loading="rollbackLoading" @click="submitRollback">{{ dryRun ? '执行预检' : '受理回滚' }}</Button></div></template>
    </Drawer>
  </div>
</template>

<style scoped>
.agent-page { background: hsl(var(--background)); color: hsl(var(--foreground)); min-height: 100%; }
.model-layout { padding: 22px 26px; }
.runtime-band { align-items: flex-start; border-bottom: 1px solid hsl(var(--border)); display: flex; gap: 24px; justify-content: space-between; padding-bottom: 18px; }.title-group span,.section-block header span { color: hsl(var(--muted-foreground)); font-size: 11px; }.title-group h1 { font-size: 20px; margin: 5px 0; }.title-group code { color: hsl(var(--muted-foreground)); }.runtime-state { align-items: center; display: flex; gap: 10px; }
.fact-grid { display: grid; gap: 1px; grid-template-columns: repeat(6, minmax(0, 1fr)); margin: 18px 0; }.fact-grid div { background: hsl(var(--muted)); min-width: 0; padding: 12px; }.fact-grid dt { color: hsl(var(--muted-foreground)); font-size: 11px; }.fact-grid dd { font-size: 13px; margin: 6px 0 0; overflow-wrap: anywhere; }
.section-block { border-top: 1px solid hsl(var(--border)); padding: 18px 0; }.section-block header { align-items: center; display: flex; justify-content: space-between; margin-bottom: 14px; }.section-block h2 { font-size: 16px; margin: 4px 0 0; }.hash { display: block; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.probe-comparison { display: grid; gap: 1px; grid-template-columns: repeat(3, 1fr); }.probe-comparison div { background: hsl(var(--muted)); display: grid; gap: 6px; padding: 14px; }.probe-comparison span,.probe-comparison small { color: hsl(var(--muted-foreground)); }.probe-comparison strong { font-size: 18px; }
.action-timeline { margin-top: 22px; }.technical-meta { border-top: 1px solid hsl(var(--border)); color: hsl(var(--muted-foreground)); font-size: 11px; padding-top: 12px; overflow-wrap: anywhere; }
.rollback-summary { align-items: center; background: hsl(var(--muted)); display: flex; font-size: 16px; gap: 16px; justify-content: center; margin-bottom: 18px; padding: 14px; }.threshold-grid { display: grid; gap: 12px; grid-template-columns: 1fr 1fr; }.drawer-footer { display: flex; gap: 8px; justify-content: flex-end; }
@media (max-width: 1050px) { .fact-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 680px) { .model-layout { padding: 16px; }.runtime-band { flex-direction: column; }.fact-grid { grid-template-columns: repeat(2, 1fr); }.probe-comparison { grid-template-columns: 1fr; } }
</style>
