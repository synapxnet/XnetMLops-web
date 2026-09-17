/*
 * Copyright (C) 2026 Synapxnet. All rights reserved.
 * This file is Synapxnet Proprietary and Confidential. It is strictly
 * forbidden to copy, distribute, or use without explicit authorization.
 * 模型证据比较规则。 / Rules for descriptive model-evidence comparison.
 * Author: maoyo | Department: 研发部 | Date: 2026-09-13
 * Version: 1.0.0 | Security Level: INTERNAL | Maintainer: maoyo
 * Email: synapxnet@gmail.com
 */

export type MetricKey = 'accuracy' | 'auc' | 'f1' | 'precision' | 'recall';

export interface ModelEvidenceRun {
  comparisonLevel: 'descriptive_only';
  completedAt: null | string;
  legacyArtifactDigestSha256: null | string;
  metrics: Partial<Record<MetricKey, number>>;
  metricsCoverage: 'available' | 'partial' | 'unavailable';
  modelDigestSha256: null | string;
  productVersion: string;
  runUid: string;
  sampleCounts: Partial<Record<'test' | 'train' | 'validation', number>>;
  schemaDigestSha256: null | string;
  startedAt: null | string;
  status: 'failed' | 'running' | 'succeeded' | 'unknown';
}

export interface ModelEvidenceWorkspace {
  availability: 'available' | 'empty' | 'error' | 'unavailable';
  capabilities: Array<{ available: boolean; id: string; reason: string }>;
  capturedAt: string;
  comparisonLevel: 'descriptive_only';
  executionMode: 'fixture' | 'live' | 'replay' | 'simulation' | null;
  freshness: { maxAgeSeconds: null | number; status: 'unknown' };
  limitations: string[];
  recordLimit: number;
  requestId: string;
  runs: ModelEvidenceRun[];
  schemaVersion: '1.0.0';
  scope: { kind: 'tenant'; tenantUid: string };
  source: 'recommendation-training-records';
  sourceOrigin: 'native';
  sourcePlatform: 'mlops';
}

export const metricDefinitions: Array<{ key: MetricKey; label: string }> = [
  { key: 'auc', label: 'AUC' },
  { key: 'accuracy', label: '准确率' },
  { key: 'precision', label: '精确率' },
  { key: 'recall', label: '召回率' },
  { key: 'f1', label: 'F1' },
];

/** 检查已知比较条件，缺少版本或未完成时拒绝差值。 / Reject deltas when known versions or completed runs are missing. */
export function comparisonIssue(
  candidate?: ModelEvidenceRun,
  baseline?: ModelEvidenceRun,
): string {
  if (!candidate || !baseline) return '请选择另一条运行记录作为基线。';
  if (candidate.runUid === baseline.runUid)
    return '请选择与当前运行不同的基线。';
  if (candidate.status !== 'succeeded' || baseline.status !== 'succeeded')
    return '两条运行均完成后才可比较。';
  if (
    !candidate.productVersion ||
    candidate.productVersion !== baseline.productVersion
  )
    return '数据产品版本不同，不能直接比较指标差值。';
  if (
    !candidate.schemaDigestSha256 ||
    candidate.schemaDigestSha256 !== baseline.schemaDigestSha256
  )
    return '数据结构版本缺失或不同，不能直接比较。';
  if (
    !candidate.legacyArtifactDigestSha256 ||
    candidate.legacyArtifactDigestSha256 !== baseline.legacyArtifactDigestSha256
  )
    return '记录摘要缺失或不同，不能直接比较。';
  if (
    !Number.isSafeInteger(candidate.sampleCounts.test) ||
    !Number.isSafeInteger(baseline.sampleCounts.test) ||
    candidate.sampleCounts.test! <= 0 ||
    candidate.sampleCounts.test !== baseline.sampleCounts.test
  )
    return '测试样本量缺失或不同，不能直接比较。';
  return '';
}

/** 只返回有界的已知指标，未知值保留为空。 / Preserve unknown values and accept only bounded metrics. */
export function validMetric(value?: number): null | number {
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
    ? value
    : null;
}

/** 计算条件允许的描述性差值，不生成质量门结论。 / Compute descriptive deltas without producing a release-gate decision. */
export function metricDifference(
  key: MetricKey,
  candidate?: ModelEvidenceRun,
  baseline?: ModelEvidenceRun,
): null | number {
  if (comparisonIssue(candidate, baseline)) return null;
  const current = validMetric(candidate?.metrics[key]);
  const previous = validMetric(baseline?.metrics[key]);
  return current === null || previous === null ? null : current - previous;
}
