import { agentMepRequestClient } from '#/api/request';

import type { IncidentContext, ToolResponse } from './types';

export interface DeploymentRevision {
  createdAt: string;
  imageRef: string;
  modelContract?: ModelContractSummary;
  modelVersion: string;
  revisionNumber: number;
  sourceActionId?: string;
  specHash: string;
  uid: string;
}

export interface ModelContractSummary {
  contractHash: string;
  inputDimension: number;
  uid: string;
}

export interface DeploymentEvidence {
  activeRevision: number;
  deploymentUid: string;
  endpoint: string;
  imageRef: string;
  lastVerifiedAt?: string;
  modelContract?: ModelContractSummary;
  modelName: string;
  modelUid: string;
  modelVersion: string;
  name: string;
  readiness: { reachable: boolean; ready: boolean; runtimeStatus: string; runtimeVersion?: string };
  replicas: number;
  resourceVersion: string;
  revisions: DeploymentRevision[];
  status: string;
  warnings: string[];
}

export interface InferenceProbeResult {
  completedAt: string;
  contractStatus: 'MATCHED' | 'MISMATCHED' | 'UNKNOWN';
  deploymentUid: string;
  errorCount: number;
  errorRate: number;
  expectedInputDimension: number;
  failures: Array<{ category: string; count: number; sampleRef?: string }>;
  observedInputDimension: number;
  p50Ms?: number;
  p95Ms?: number;
  probeUid: string;
  revisionNumber: number;
  sampleCount: number;
  successCount: number;
}

export interface VerificationPolicy {
  maxErrorRate: number;
  maxP95Ms: number;
}

export interface RollbackAcceptance {
  actionId?: string;
  actionResourceUri?: string;
  dryRun: boolean;
  executionPlan: string[];
  stage: string;
  status: string;
}

export interface DeploymentAction {
  actionId: string;
  completedAt?: string;
  deploymentUid: string;
  dryRun: boolean;
  errorCode?: string;
  errorMessage?: string;
  fromRevision: number;
  stage: string;
  startedAt?: string;
  status: string;
  targetRevision: number;
}

export interface RollbackGovernance {
  approvalId: string;
  dryRun: boolean;
  expectedResourceVersion: string;
  idempotencyKey: string;
  reason: string;
}

/** 创建完整 Trace Header，写操作沿用调用层提供的幂等键。 */
function headers(context: IncidentContext, toolName: string, idempotencyKey: string = crypto.randomUUID()) {
  return {
    'Idempotency-Key': idempotencyKey,
    'X-OpenXnet-Incident-Id': context.incidentId,
    'X-OpenXnet-Tool-Name': toolName,
    'X-OpenXnet-Trace-Id': context.traceId,
    'X-OpenXnet-Workspace-Id': context.workspaceId,
  };
}

/** 获取部署期望状态、Runtime readiness、修订和模型契约。 */
export async function getDeploymentEvidence(deploymentUid: string, context: IncidentContext) {
  const toolName = 'mlops.deployment.get';
  return agentMepRequestClient.post<ToolResponse<DeploymentEvidence>>(
    '/api/agent/v1/tools/mlops.deployment.get:invoke',
    { arguments: { deploymentUid, includeRevisions: true }, requestId: `req_${crypto.randomUUID()}`, toolName },
    { headers: headers(context, toolName) },
  );
}

/** 执行授权 Fixture 的真实推理探针，调用方负责展示成本和失败类别。 */
export async function runInferenceProbe(deploymentUid: string, context: IncidentContext) {
  const toolName = 'mlops.inference.probe';
  return agentMepRequestClient.post<ToolResponse<InferenceProbeResult>>(
    '/api/agent/v1/tools/mlops.inference.probe:invoke',
    {
      arguments: { deploymentUid, sampleLimit: 12, testDatasetRef: 'fixture://goai/risk-120-v1', timeoutMs: 60_000 },
      requestId: `req_${crypto.randomUUID()}`,
      toolName,
    },
    { headers: headers(context, toolName) },
  );
}

/**
 * 受理高风险回滚；函数不自动生成幂等键，网络重试必须沿用 governance.idempotencyKey。
 */
export async function rollbackDeployment(
  deploymentUid: string,
  targetRevision: number,
  verificationPolicy: VerificationPolicy,
  governance: RollbackGovernance,
  context: IncidentContext,
) {
  const toolName = 'mlops.deployment.rollback';
  return agentMepRequestClient.post<ToolResponse<RollbackAcceptance>>(
    '/api/agent/v1/tools/mlops.deployment.rollback:invoke',
    {
      approvalId: governance.approvalId,
      arguments: { deploymentUid, targetRevision, verificationPolicy },
      dryRun: governance.dryRun,
      expectedResourceVersion: governance.expectedResourceVersion,
      reason: governance.reason,
      requestId: `req_${crypto.randomUUID()}`,
      toolName,
    },
    { headers: headers(context, toolName, governance.idempotencyKey) },
  );
}

/** 查询持久化动作状态，页面刷新后可继续恢复轮询。 */
export async function getDeploymentAction(
  actionId: string,
  idempotencyKey: string,
  context: IncidentContext,
) {
  return agentMepRequestClient.get<DeploymentAction>(`/api/agent/v1/actions/${encodeURIComponent(actionId)}`, {
    headers: headers(context, 'mlops.deployment.rollback', idempotencyKey),
  });
}
