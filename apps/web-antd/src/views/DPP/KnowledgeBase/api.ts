/**
 * RAG 知识库 API
 */

import { dppRequestClient } from '#/api/request';
import type {
  KnowledgeBase,
  KBDocument,
  KBChunk,
  EmbeddingModel,
  RetrievalLog,
  CreateKBRequest,
  RetrievalRequest,
  RetrievalResponse,
} from './types';

// 使用与其他 DPP API 相同的路径格式
// dppRequestClient 会将请求代理到 DPP 后端服务
const BASE_URL = '/dpp';

// ==================== 知识库管理 ====================

/**
 * 获取知识库列表
 */
export async function fetchKnowledgeBases(
  status?: string,
): Promise<KnowledgeBase[]> {
  const url = status
    ? `${BASE_URL}/knowledge-bases?status=${status}`
    : `${BASE_URL}/knowledge-bases`;
  return await dppRequestClient.get(url);
}

/**
 * 获取知识库详情
 */
export async function fetchKnowledgeBase(id: number): Promise<KnowledgeBase> {
  return await dppRequestClient.get(`${BASE_URL}/knowledge-bases/${id}`);
}

/**
 * 创建知识库
 */
export async function createKnowledgeBase(
  data: CreateKBRequest,
): Promise<KnowledgeBase> {
  return await dppRequestClient.post(`${BASE_URL}/knowledge-bases`, data);
}

/**
 * 更新知识库
 */
export async function updateKnowledgeBase(
  id: number,
  data: Partial<CreateKBRequest>,
): Promise<KnowledgeBase> {
  return await dppRequestClient.put(`${BASE_URL}/knowledge-bases/${id}`, data);
}

/**
 * 删除知识库
 */
export async function deleteKnowledgeBase(id: number): Promise<void> {
  await dppRequestClient.delete(`${BASE_URL}/knowledge-bases/${id}`);
}

/**
 * 重建知识库索引
 */
export async function rebuildKnowledgeBase(id: number): Promise<void> {
  await dppRequestClient.post(`${BASE_URL}/knowledge-bases/${id}/rebuild`);
}

// ==================== 文档管理 ====================

/**
 * 获取文档列表
 */
export async function fetchDocuments(
  kbId: number,
  status?: string,
): Promise<KBDocument[]> {
  const url = status
    ? `${BASE_URL}/knowledge-bases/${kbId}/documents?status=${status}`
    : `${BASE_URL}/knowledge-bases/${kbId}/documents`;
  return await dppRequestClient.get(url);
}

/**
 * 获取文档详情
 */
export async function fetchDocument(
  kbId: number,
  docId: number,
): Promise<KBDocument> {
  return await dppRequestClient.get(
    `${BASE_URL}/knowledge-bases/${kbId}/documents/${docId}`,
  );
}

/**
 * 上传文档
 */
export async function uploadDocument(
  kbId: number,
  file: File,
  options?: { customChunkSize?: number; customChunkOverlap?: number },
): Promise<KBDocument> {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.customChunkSize) {
    formData.append('customChunkSize', String(options.customChunkSize));
  }
  if (options?.customChunkOverlap) {
    formData.append('customChunkOverlap', String(options.customChunkOverlap));
  }
  return await dppRequestClient.post(
    `${BASE_URL}/knowledge-bases/${kbId}/documents`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
}

/**
 * 删除文档
 */
export async function deleteDocument(
  kbId: number,
  docId: number,
): Promise<void> {
  await dppRequestClient.delete(
    `${BASE_URL}/knowledge-bases/${kbId}/documents/${docId}`,
  );
}

/**
 * 重新索引文档
 */
export async function reindexDocument(
  kbId: number,
  docId: number,
): Promise<void> {
  await dppRequestClient.post(
    `${BASE_URL}/knowledge-bases/${kbId}/documents/${docId}/reindex`,
  );
}

/**
 * 获取文档分块
 */
export async function fetchChunks(
  kbId: number,
  docId: number,
): Promise<KBChunk[]> {
  return await dppRequestClient.get(
    `${BASE_URL}/knowledge-bases/${kbId}/documents/${docId}/chunks`,
  );
}

// ==================== 检索 ====================

/**
 * 检索知识库
 */
export async function retrieve(
  kbId: number,
  request: RetrievalRequest,
): Promise<RetrievalResponse> {
  return await dppRequestClient.post(
    `${BASE_URL}/knowledge-bases/${kbId}/retrieve`,
    request,
  );
}

/**
 * 检索测试
 */
export async function retrieveTest(
  kbId: number,
  request: RetrievalRequest,
): Promise<RetrievalResponse> {
  return await dppRequestClient.post(
    `${BASE_URL}/knowledge-bases/${kbId}/retrieve/test`,
    request,
  );
}

/**
 * 获取检索日志
 */
export async function fetchRetrievalLogs(
  kbId: number,
  limit?: number,
): Promise<RetrievalLog[]> {
  const url = limit
    ? `${BASE_URL}/knowledge-bases/${kbId}/retrieval-logs?limit=${limit}`
    : `${BASE_URL}/knowledge-bases/${kbId}/retrieval-logs`;
  return await dppRequestClient.get(url);
}

// ==================== 嵌入模型 ====================

/**
 * 获取嵌入模型列表
 */
export async function fetchEmbeddingModels(): Promise<EmbeddingModel[]> {
  return await dppRequestClient.get(`${BASE_URL}/embedding-models`);
}

/**
 * 获取嵌入模型详情
 */
export async function fetchEmbeddingModel(id: number): Promise<EmbeddingModel> {
  return await dppRequestClient.get(`${BASE_URL}/embedding-models/${id}`);
}

/**
 * 创建嵌入模型
 */
export async function createEmbeddingModel(
  data: Partial<EmbeddingModel>,
): Promise<EmbeddingModel> {
  return await dppRequestClient.post(`${BASE_URL}/embedding-models`, data);
}

/**
 * 更新嵌入模型
 */
export async function updateEmbeddingModel(
  id: number,
  data: Partial<EmbeddingModel>,
): Promise<EmbeddingModel> {
  return await dppRequestClient.put(`${BASE_URL}/embedding-models/${id}`, data);
}

/**
 * 删除嵌入模型
 */
export async function deleteEmbeddingModel(id: number): Promise<void> {
  await dppRequestClient.delete(`${BASE_URL}/embedding-models/${id}`);
}

/**
 * 测试嵌入模型
 */
export async function testEmbeddingModel(
  id: number,
  text: string,
): Promise<{ embedding: number[]; latencyMs: number }> {
  return await dppRequestClient.post(
    `${BASE_URL}/embedding-models/${id}/test`,
    {
      text,
    },
  );
}
