// MEP (Model Endpoint Platform) 类型定义

// 大模型服务类型
export type LLMServiceType = 'ollama' | 'openai' | 'deepseek' | 'custom';

// 服务状态
export type ServiceStatus = 'running' | 'stopped' | 'error' | 'deploying';

// 部署状态
export type DeploymentStatus =
  | 'pending'
  | 'deploying'
  | 'running'
  | 'failed'
  | 'stopped';

// 大模型服务配置
export interface LLMService {
  id: number;
  uid: string;
  name: string;
  type: LLMServiceType;
  description: string;
  endpoint: string;
  model_name: string;
  api_key?: string;
  status: ServiceStatus;
  config: LLMServiceConfig;
  created_by: string;
  updated_by: null | string;
  created_at: string;
  updated_at: null | string;
}

// 大模型服务配置详情
export interface LLMServiceConfig {
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  timeout?: number;
  retry_count?: number;
  custom_params?: Record<string, any>;
}

// API Key 管理
export interface ApiKeyItem {
  id: number;
  uid: string;
  name: string;
  key: string;
  key_masked: string;
  provider: LLMServiceType;
  description: string;
  status: 'active' | 'disabled' | 'expired';
  usage_limit: number | null;
  usage_count: number;
  expires_at: null | string;
  created_by: string;
  created_at: string;
  updated_at: null | string;
}

// 部署节点
export interface DeployNode {
  id: number;
  uid: string;
  name: string;
  ipAddress: string;
  port: number;
  status: 'online' | 'offline' | 'maintenance';
  cpuCores: number;
  memoryGb: number;
  gpuInfo: string | null;
  dockerVersion: string;
  nginxStatus: 'running' | 'stopped';
  labels: string | string[];
  description: string;
  createdBy: string;
  createdAt: string;
  updatedAt: null | string;
}

// 模型部署配置
export interface ModelDeployment {
  id: number;
  uid: string;
  name: string;
  model_source: 'mtp' | 'llm';
  model_uid: string;
  model_name: string;
  model_version: string;
  node_uid: string;
  node_name: string;
  status: DeploymentStatus;
  container_id: string | null;
  container_name: string;
  image_name: string;
  port: number;
  endpoint: string;
  replicas: number;
  resource_config: DeploymentResourceConfig;
  nginx_config: NginxConfig;
  health_check: HealthCheckConfig;
  created_by: string;
  created_at: string;
  updated_at: null | string;
}

// 部署资源配置
export interface DeploymentResourceConfig {
  cpu_limit: string;
  memory_limit: string;
  gpu_count: number;
  gpu_memory: string;
}

// Nginx 配置
export interface NginxConfig {
  upstream_name: string;
  server_name: string;
  listen_port: number;
  proxy_pass: string;
  ssl_enabled: boolean;
  ssl_cert_path?: string;
  ssl_key_path?: string;
  custom_config?: string;
}

// 健康检查配置
export interface HealthCheckConfig {
  enabled: boolean;
  path: string;
  interval: number;
  timeout: number;
  retries: number;
}

// MTP 训练输出模型 (用于选择部署)
export interface MTPOutputModel {
  id: number;
  uid: string;
  task_uid: string;
  task_name: string;
  model_name: string;
  version: string;
  output_path: string;
  model_type: string;
  framework: string;
  metrics: Record<string, number>;
  created_at: string;
}

// API 响应结构
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  error: null | string;
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
}

// 部署日志
export interface DeploymentLog {
  id: number;
  deployment_uid: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

// 服务监控数据
export interface ServiceMetrics {
  cpu_usage: number;
  memory_usage: number;
  request_count: number;
  error_count: number;
  avg_response_time: number;
  timestamp: string;
}
