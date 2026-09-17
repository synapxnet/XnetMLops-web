/*
Copyright (C) 2026 Synapxnet. All rights reserved.
This file is Synapxnet Proprietary and Confidential. It is strictly
forbidden to copy, distribute, or use without explicit authorization.
用途：训练作业真实状态与时间边界。Purpose: Training job status and timestamp boundaries.
Author: maoyo | Department: 研发部 | Date: 2026-09-14
Version: 1.0.0 | Security Level: INTERNAL
__version__: 1.0.0 | __author__: maoyo | __copyright__: Copyright 2026 Synapxnet
__maintainer__: maoyo | __email__: synapxnet@gmail.com
*/

export interface JobStage {
  description: string;
  duration: null | string;
  endTime: null | string;
  endTimeDerived: boolean;
  logs: string[];
  startTime: null | string;
  status: 'error' | 'finish' | 'process' | 'wait';
  title: string;
}

export interface JobSnapshot {
  color: string;
  consoleOutput: null | string;
  createTime: null | string;
  creator: null | string;
  elapsedTime: null | string;
  id: string;
  stages: JobStage[];
  startTime: null | string;
  statusLabel: string;
  title: string;
}

/** 只接受单值路由标识，不补默认作业或租户。 Accept a single route identity without defaulting the job or tenant. */
export function routeIdentity(value: unknown): string {
  return typeof value === 'string' && value.trim().length <= 160
    ? value.trim()
    : '';
}

/** 读取非空原始文本，缺失值保持空。 Read nonempty source text while preserving absent values. */
function text(value: unknown): null | string {
  return typeof value === 'string' && value.trim() ? value : null;
}

/** 只接受真实日期或毫秒时间戳，拒绝无效日期。 Accept actual date values or millisecond timestamps and reject invalid dates. */
function timestamp(value: unknown): null | number {
  if (
    !(value instanceof Date) &&
    typeof value !== 'number' &&
    !(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}[T ]/.test(value))
  )
    return null;
  const result =
    value instanceof Date
      ? value.getTime()
      : new Date(value as number | string).getTime();
  return Number.isFinite(result) ? result : null;
}

/** 格式化已验证时间，未知时间不显示NaN或当前时间。 Format validated timestamps without NaN or current-time substitutes. */
export function formatJobTime(value: unknown): null | string {
  const result = timestamp(value);
  return result === null
    ? null
    : new Date(result).toLocaleString('zh-CN', { hour12: false });
}

/** 格式化非负原始耗时，未知耗时不补零。 Format nonnegative source durations without replacing missing values with zero. */
function duration(value: unknown): null | string {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    return null;
  const total = Math.floor(value / 1000);
  return [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60]
    .map(padTime)
    .join(':');
}

/** 时间分量保留两位，小时不截断。 Pad time components without truncating hours. */
function padTime(value: number): string {
  return String(value).padStart(2, '0');
}

/** 已知状态明确区分排队、运行、失败和成功，其他状态保持未知。 Distinguish known states and preserve unknown statuses. */
function jobStatus(value: unknown): {
  color: string;
  label: string;
  stage: JobStage['status'];
  terminal: boolean;
} {
  const code = text(value)?.trim().toUpperCase() ?? '';
  switch (code) {
    case 'SUCCESS':
      return {
        color: 'success',
        label: '已完成',
        stage: 'finish',
        terminal: true,
      };
    case 'FAILED':
    case 'FAILURE':
      return { color: 'error', label: '失败', stage: 'error', terminal: true };
    case 'RUNNING':
    case 'IN_PROGRESS':
      return {
        color: 'processing',
        label: '运行中',
        stage: 'process',
        terminal: false,
      };
    case 'PAUSED':
      return {
        color: 'warning',
        label: '已暂停',
        stage: 'wait',
        terminal: false,
      };
    case 'CANCELLED':
    case 'ABORTED':
      return {
        color: 'default',
        label: '已终止',
        stage: 'error',
        terminal: true,
      };
    case 'PENDING':
    case 'QUEUED':
      return {
        color: 'default',
        label: '等待中',
        stage: 'wait',
        terminal: false,
      };
    case 'NOT_EXECUTED':
    case 'SKIPPED':
      return {
        color: 'default',
        label: '未执行',
        stage: 'wait',
        terminal: true,
      };
    default:
      return {
        color: 'default',
        label: code ? `未知状态（${code}）` : '状态未提供',
        stage: 'wait',
        terminal: false,
      };
  }
}

/** 只保留服务端原始日志文本，不生成完成或资源充足日志。 Keep original log text without generating completion or resource messages. */
function stageLogs(value: unknown): string[] {
  if (typeof value === 'string') return value ? value.split(/\r?\n/) : [];
  if (!Array.isArray(value)) return [];
  return value.filter(isLogLine);
}

/** 排除非文本日志项，保留原始文本和时间前缀。 Exclude nontext log entries and retain original prefixes. */
function isLogLine(value: unknown): value is string {
  return typeof value === 'string';
}

/** 映射服务端实际阶段，不补不存在的收尾步骤。 Map actual stages without adding nonexistent cleanup steps. */
function parseStage(value: unknown): JobStage {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('作业阶段数据格式无效，请重试读取');
  const stage = value as Record<string, unknown>;
  const status = jobStatus(stage.status);
  const start = timestamp(stage.startTime);
  const rawDuration = duration(stage.durationMillis);
  const providedEnd = timestamp(stage.endTime);
  const validEnd =
    providedEnd !== null && (start === null || providedEnd >= start)
      ? providedEnd
      : null;
  const derivedEnd =
    status.terminal &&
    start !== null &&
    rawDuration !== null &&
    stage.endTime == null
      ? start + (stage.durationMillis as number)
      : null;
  return {
    title:
      text(stage.stageName) === 'Declarative: Post Actions'
        ? '数据清理'
        : (text(stage.stageName) ?? '未命名阶段'),
    status: status.stage,
    description: status.label,
    startTime: formatJobTime(stage.startTime),
    endTime: formatJobTime(validEnd ?? derivedEnd),
    endTimeDerived: validEnd === null && derivedEnd !== null,
    duration: rawDuration,
    logs: stageLogs(stage.logs),
  };
}

/** 校验响应身份并建立仅含原始证据的详情快照。 Validate response identity and build a snapshot exclusively from source evidence. */
export function parsePipelineStatus(
  value: unknown,
  expectedJob: string,
): JobSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('未取得作业详情，请重试读取');
  const source = value as Record<string, unknown>;
  if (source.jobName !== expectedJob)
    throw new Error('返回的作业标识与当前页面不一致，请重新打开作业');
  if (
    source.stages !== null &&
    source.stages !== undefined &&
    !Array.isArray(source.stages)
  )
    throw new Error('作业阶段数据格式无效，请重试读取');
  const stages = ((source.stages ?? []) as unknown[]).map(parseStage);
  const status = jobStatus(source.overallStatus);
  const start = timestamp(source.startTime);
  const end = timestamp(source.endTime);
  return {
    id: expectedJob,
    title: text(source.jobTitle) ?? '训练作业',
    statusLabel: status.label,
    color: status.color,
    creator: text(source.creator),
    createTime: formatJobTime(source.createdAt),
    startTime:
      formatJobTime(source.startTime) ??
      stages.find(hasStart)?.startTime ??
      null,
    elapsedTime:
      duration(source.durationMillis) ??
      (start !== null && end !== null ? duration(end - start) : null),
    stages,
    consoleOutput: text(source.consoleOutput),
  };
}

/** 从实际阶段寻找第一个有记录的开始时间。 Find the first recorded start time among actual stages. */
function hasStart(stage: JobStage): boolean {
  return stage.startTime !== null;
}
