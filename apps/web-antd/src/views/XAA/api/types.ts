/**
 * XAA API 类型定义
 */

// 工作流实体
export interface Workflow {
  id: number;
  uid: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  graphJson?: string;
  configJson?: string;
  version: number;
  creatorId?: string;
  creatorName?: string;
  tenantUid?: string;
  deptUid?: string;
  teamUid?: string;
  createdAt: string;
  updatedAt: string;
}

// 工作流节点
export interface WorkflowNode {
  id: number;
  uid: string;
  workflowId: number;
  nodeType: string;
  title: string;
  description?: string;
  configJson?: string;
  positionX: number;
  positionY: number;
  width?: number;
  height?: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// 工作流边
export interface WorkflowEdge {
  id: number;
  uid: string;
  workflowId: number;
  sourceNodeId: number;
  sourceHandle?: string;
  targetNodeId: number;
  targetHandle?: string;
  edgeType: string;
  conditionJson?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// 工作流执行记录
export interface WorkflowExecution {
  id: number;
  uid: string;
  workflowId: number;
  status: string;
  inputsJson?: string;
  outputsJson?: string;
  errorMessage?: string;
  startedAt?: string;
  finishedAt?: string;
  elapsedTime?: number;
  triggeredBy?: string;
  triggerType?: string;
  createdAt: string;
  updatedAt: string;
}

// 节点执行记录
export interface NodeExecution {
  id: number;
  uid: string;
  executionId: number;
  workflowId: number;
  nodeId: number;
  nodeType: string;
  nodeTitle: string;
  status: string;
  inputsJson?: string;
  outputsJson?: string;
  metadataJson?: string;
  errorMessage?: string;
  startedAt?: string;
  finishedAt?: string;
  elapsedTime?: number;
  retryCount?: number;
  createdAt: string;
  updatedAt: string;
}

// 技能实体
export interface Skill {
  id: number;
  uid: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  configJson?: string;
  icon?: string;
  version: number;
  creatorId?: string;
  tenantUid?: string;
  createdAt: string;
  updatedAt: string;
}

// 节点类型定义
export type NodeType =
  | 'start'
  | 'end'
  | 'dpp-dataset'
  | 'dpp-feature'
  | 'dpp-task'
  | 'mtp-algorithm'
  | 'mtp-train'
  | 'mtp-output'
  | 'mep-deploy'
  | 'mep-service'
  | 'if-else'
  | 'loop'
  | 'parallel'
  | 'http-request'
  | 'code'
  | 'variable-assigner'
  | 'template-transform'
  | 'wait'
  | 'human-input';

// 执行状态
export type ExecutionStatus =
  | 'scheduled'
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'stopped'
  | 'paused'
  | 'skipped';

// 工作流状态
export type WorkflowStatus = 'draft' | 'published' | 'archived';

// API响应类型
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  error: string;
}

// 工作流图数据
export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

// 创建工作流请求
export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  type?: string;
}

// 执行工作流请求
export interface ExecuteWorkflowRequest {
  inputs?: Record<string, any>;
  triggeredBy?: string;
  triggerType?: string;
}

// ==================== 智能助手类型 ====================

// 智能助手实体
export interface Assistant {
  id: number;
  uid: string;
  name: string;
  description?: string;
  avatar?: string;

  // OpenClaw配置
  openclawInstanceId?: number;
  gatewayUrl?: string;
  gatewayToken?: string;

  // 模型配置
  llmServiceId?: number;
  defaultModel?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;

  // 知识库配置
  knowledgeBaseIds?: string;
  ragEnabled?: boolean;
  ragTopK?: number;

  // 技能配置
  skillIds?: string;
  toolsEnabled?: boolean;

  // UI配置
  uiConfig?: string;
  welcomeMessage?: string;
  placeholder?: string;

  // 状态
  status: 'active' | 'disabled';
  isDefault?: boolean;

  // 统计信息
  totalConversations?: number;
  totalMessages?: number;
  lastUsedAt?: string;

  // 元数据
  tenantUid?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// 助手UI配置
export interface AssistantUIConfig {
  position: {
    right: number;
    bottom: number;
  };
  size: {
    width: number;
    height: number;
  };
  theme: 'light' | 'dark';
  primaryColor: string;
  borderRadius: number;
  showAvatar: boolean;
}

// 智能助手会话
export interface AssistantConversation {
  id: number;
  uid: string;
  assistantId: number;
  title?: string;
  summary?: string;
  userId?: string;
  userName?: string;
  status: 'active' | 'archived' | 'deleted';
  messageCount: number;
  tokenCount: number;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 智能助手消息
export interface AssistantMessage {
  id: number;
  uid: string;
  conversationId: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokenCount?: number;
  modelUsed?: string;
  ragSources?: string;
  toolCalls?: string;
  metadata?: string;
  createdAt: string;
}

// 助手配置(用于浮窗)
export interface AssistantConfig {
  id: number;
  uid: string;
  name: string;
  description?: string;
  avatar?: string;
  gatewayUrl?: string;
  gatewayToken?: string;
  defaultModel?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  ragEnabled?: boolean;
  toolsEnabled?: boolean;
  welcomeMessage?: string;
  placeholder?: string;
  uiConfig?: AssistantUIConfig;
  skillIds?: number[];
  knowledgeBaseIds?: number[];
}
