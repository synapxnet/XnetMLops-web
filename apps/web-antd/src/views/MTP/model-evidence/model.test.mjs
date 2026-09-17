/*
 * Copyright (C) 2026 Synapxnet. All rights reserved.
 * This file is Synapxnet Proprietary and Confidential. It is strictly
 * forbidden to copy, distribute, or use without explicit authorization.
 * 模型比较的负向边界测试。 / Negative boundary tests for model comparisons.
 * Author: maoyo | Department: 研发部 | Date: 2026-09-13
 * Version: 1.0.0 | Security Level: INTERNAL | Maintainer: maoyo
 * Email: synapxnet@gmail.com
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { comparisonIssue, metricDifference, validMetric } from './model.ts';

/** 建立独立的比较输入，不包含线上数据。 / Build isolated comparison inputs without live data. */
function run(runUid, overrides = {}) {
  return {
    runUid,
    productVersion: 'data-v1',
    status: 'succeeded',
    schemaDigestSha256: 'a'.repeat(64),
    legacyArtifactDigestSha256: 'b'.repeat(64),
    metrics: { auc: 0.9 },
    sampleCounts: { test: 20 },
    ...overrides,
  };
}

/** 数据版本不一致时不可计算差值。 / Refuse deltas across different data versions. */
test('different product, schema or record digests cannot be compared', () => {
  for (const overrides of [
    { productVersion: 'data-v2' },
    { schemaDigestSha256: null },
    { legacyArtifactDigestSha256: 'c'.repeat(64) },
  ]) {
    assert.notEqual(comparisonIssue(run('a'), run('b', overrides)), '');
    assert.equal(metricDifference('auc', run('a'), run('b', overrides)), null);
  }
});

/** 相同运行、未完成或缺样本量不能用作有效基线。 / Reject self comparisons, incomplete runs and missing sample counts. */
test('rejects identical, unfinished and unmeasured runs', () => {
  assert.notEqual(comparisonIssue(run('a'), run('a')), '');
  assert.notEqual(
    comparisonIssue(run('a'), run('b', { status: 'running' })),
    '',
  );
  assert.notEqual(
    comparisonIssue(run('a'), run('b', { sampleCounts: {} })),
    '',
  );
  assert.notEqual(
    comparisonIssue(run('a'), run('b', { sampleCounts: { test: 19 } })),
    '',
  );
});

/** 仅展示已知指标差值，缺失值不变成零。 / Display known metric deltas without converting missing values to zero. */
test('produces descriptive deltas while preserving missing metrics', () => {
  const candidate = run('a');
  const baseline = run('b', { metrics: { auc: 0.8 } });
  assert.equal(comparisonIssue(candidate, baseline), '');
  assert.ok(
    Math.abs(metricDifference('auc', candidate, baseline) - 0.1) < 1e-12,
  );
  assert.equal(metricDifference('f1', candidate, baseline), null);
});

/** 非有限、越界和非数值指标均不可显示。 / Reject non-finite, out-of-range and nonnumeric metrics. */
test('rejects invalid metric values', () => {
  for (const value of [undefined, NaN, Infinity, -0.2, 1.01, '0.8'])
    assert.equal(validMetric(value), null);
  assert.equal(validMetric(0), 0);
  assert.equal(validMetric(1), 1);
});
