/* Copyright (C) 2026 Synapxnet. All rights reserved.
 * This file is Synapxnet Proprietary and Confidential. It is strictly forbidden to copy, distribute, or use without explicit authorization.
 * 模型制品登记 API。 / Model artifact registry API.
 * Author: maoyo | Department: 研发部 | Date: 2026-09-16 | Version: 1.0.0 | Security Level: INTERNAL
 */
import { mtpRequestClient } from '#/api/request';
export interface ModelArtifactPayload { outputName: string; framework: string; domain: string; teamUid: string; teamName?: string; tenantUid: string; deptUid?: string | null; userId: string; description?: string; artifactPath?: string | null; }
export interface ModelArtifact extends ModelArtifactPayload { id: number; uid: string; createdAt: string; updatedAt: string; }
/** 上传模型文件到 HDFS 临时区。 / Upload a model file to the HDFS temporary area. */
export async function uploadModelToTemp(file: File): Promise<string> { const body = new FormData(); body.append('file', file); const result = await mtpRequestClient.post('/mtp/upload', body, { headers: { 'Content-Type': 'multipart/form-data' } }); return result?.filePath || result; }
/** 创建并登记模型制品。 / Create and register a model artifact. */
export async function createModelArtifact(payload: ModelArtifactPayload) { return mtpRequestClient.post('/mtp/model-artifacts', payload, { headers: { 'X-Tenant-Id': payload.tenantUid, 'X-User-Id': payload.userId } }); }
/** 查询当前租户模型制品。 / List model artifacts for the current tenant. */
export async function fetchModelArtifacts(tenantUid: string): Promise<ModelArtifact[]> { return mtpRequestClient.get('/mtp/model-artifacts', { headers: { 'X-Tenant-Id': tenantUid, 'X-User-Id': localStorage.getItem('userId') || '' } }); }
