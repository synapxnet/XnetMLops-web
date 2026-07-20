/**
 * RAG 知识库类型定义
 */

// 知识库状态
export type KBStatus = 'active' | 'indexing' | 'error' | 'archived';

// 文档状态
export type DocStatus = 'pending' | 'processing' | 'completed' | 'failed';

// 分块策略
export type ChunkStrategy = 'fixed' | 'recursive' | 'semantic' | 'parent-child';

// 检索方法
export type RetrievalMethod = 'semantic' | 'keyword' | 'hybrid';

// 嵌入模型提供商
export type EmbeddingProvider = 'openai' | 'azure' | 'huggingface' | 'local';

// 向量数据库类型
export type VectorDBType = 'milvus' | 'chroma' | 'pgvector' | 'qdrant' | 'weaviate';

// 可见性
export type Visibility = 'private' | 'team' | 'public';

// 知识库实体
export interface KnowledgeBase {
  id: number;
  uid: string;
  name: string;
  description?: string;
  icon?: string;

  // 嵌入模型配置
  embeddingModelId?: number;
  embeddingProvider: EmbeddingProvider;
  embeddingModel: string;
  embeddingDimension: number;

  // 向量数据库配置
  vectorDbType: VectorDBType;
  vectorCollection?: string;
  vectorIndexType?: string;

  // 分块配置
  chunkStrategy: ChunkStrategy;
  chunkSize: number;
  chunkOverlap: number;
  chunkSeparator?: string;

  // 检索配置
  retrievalMethod: RetrievalMethod;
  topK: number;
  scoreThreshold: number;
  rerankEnabled: boolean;
  rerankModel?: string;
  rerankTopK?: number;

  // 统计信息
  status: KBStatus;
  docCount: number;
  chunkCount: number;
  totalTokens: number;
  totalSizeBytes: number;

  // 租户与权限
  tenantUid?: string;
  creatorId?: string;
  visibility: Visibility;

  createdAt: string;
  updatedAt: string;
}

// 知识库文档
export interface KBDocument {
  id: number;
  uid: string;
  kbId: number;

  // 文档信息
  name: string;
  originalName?: string;
  type: string;
  mimeType?: string;
  filePath?: string;
  fileSize: number;
  fileHash?: string;

  // 处理状态
  status: DocStatus;
  processProgress: number;
  errorMessage?: string;

  // 统计信息
  wordCount: number;
  charCount: number;
  chunkCount: number;
  tokenCount: number;
  pageCount?: number;

  // 元数据
  metadata?: Record<string, any>;
  sourceUrl?: string;
  sourceType: 'upload' | 'url' | 'sync';

  // 自定义配置
  customChunkSize?: number;
  customChunkOverlap?: number;

  uploadedBy?: string;
  createdAt: string;
  updatedAt: string;
  indexedAt?: string;
}

// 文档分块
export interface KBChunk {
  id: number;
  uid: string;
  docId: number;
  kbId: number;

  content: string;
  contentHash?: string;

  position: number;
  startIndex?: number;
  endIndex?: number;
  pageNumber?: number;

  embeddingId?: string;
  tokenCount: number;
  charCount: number;

  parentChunkId?: number;
  chunkLevel: number;

  metadata?: Record<string, any>;
  keywords?: string;
  summary?: string;

  createdAt: string;
}

// 嵌入模型
export interface EmbeddingModel {
  id: number;
  name: string;
  provider: EmbeddingProvider;
  modelName: string;

  dimension: number;
  maxTokens: number;
  batchSize?: number;

  apiEndpoint?: string;
  extraConfig?: Record<string, any>;

  isDefault: boolean;
  status: 'active' | 'inactive';
  tenantUid?: string;

  createdAt: string;
  updatedAt: string;
}

// 检索日志
export interface RetrievalLog {
  id: number;
  kbId: number;

  query: string;
  queryTokens?: number;

  retrievalMethod?: string;
  topK?: number;
  scoreThreshold?: number;
  rerankEnabled?: boolean;

  resultCount: number;
  results?: RetrievalResult[];

  embeddingLatencyMs?: number;
  retrievalLatencyMs?: number;
  rerankLatencyMs?: number;
  totalLatencyMs?: number;

  source: 'api' | 'workflow' | 'test';
  sessionId?: string;
  userId?: string;

  feedbackScore?: number;
  feedbackComment?: string;

  createdAt: string;
}

// 检索结果
export interface RetrievalResult {
  chunkId: number;
  docId: number;
  docName: string;
  content: string;
  score: number;
  metadata?: Record<string, any>;
}

// 创建知识库请求
export interface CreateKBRequest {
  name: string;
  description?: string;
  icon?: string;

  embeddingModelId?: number;
  embeddingProvider?: EmbeddingProvider;
  embeddingModel?: string;

  vectorDbType?: VectorDBType;

  chunkStrategy?: ChunkStrategy;
  chunkSize?: number;
  chunkOverlap?: number;

  retrievalMethod?: RetrievalMethod;
  topK?: number;
  scoreThreshold?: number;
  rerankEnabled?: boolean;
  rerankModel?: string;

  visibility?: Visibility;
}

// 检索请求
export interface RetrievalRequest {
  query: string;
  topK?: number;
  scoreThreshold?: number;
  retrievalMethod?: RetrievalMethod;
  rerankEnabled?: boolean;
  filters?: Record<string, any>;
}

// 检索响应
export interface RetrievalResponse {
  results: RetrievalResult[];
  totalLatencyMs: number;
  embeddingLatencyMs: number;
  retrievalLatencyMs: number;
  rerankLatencyMs?: number;
}

// 上传文档请求
export interface UploadDocRequest {
  file: File;
  customChunkSize?: number;
  customChunkOverlap?: number;
  metadata?: Record<string, any>;
}
