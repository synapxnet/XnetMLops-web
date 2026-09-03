import { mtpRequestClient } from '#/api/request';

export interface RecommendationTrainingRun {
  approvalId: string;
  artifactDigestSha256: string;
  artifactReference: string;
  completedAt?: string;
  datasetId: number;
  errorSummary?: string;
  id: number;
  idempotencyKey: string;
  metricsJson?: string;
  modelDigestSha256?: string;
  productVersion: string;
  runUid: string;
  schemaDigestSha256: string;
  startedAt: string;
  status: 'failed' | 'running' | 'succeeded';
  tenantUid: string;
  userId: string;
}

/** 按租户读取最近的推荐 DCN 训练运行。 */
export function fetchRecommendationTrainingRuns(tenantUid: string) {
  return mtpRequestClient.get<RecommendationTrainingRun[]>('/mtp/recommendation-training/runs', {
    headers: { 'X-Tenant-Uid': tenantUid },
  });
}

/** 使用审批号和幂等键启动一次受控推荐 DCN 训练。 */
export function runRecommendationTraining(
  datasetId: number,
  tenantUid: string,
  userId: string,
  approvalId: string,
  idempotencyKey: string,
) {
  return mtpRequestClient.post<RecommendationTrainingRun>(
    '/mtp/recommendation-training/run',
    { datasetId },
    {
      headers: {
        'Idempotency-Key': idempotencyKey,
        'X-Approval-Id': approvalId,
        'X-Tenant-Uid': tenantUid,
        'X-User-Id': userId,
      },
    },
  );
}
