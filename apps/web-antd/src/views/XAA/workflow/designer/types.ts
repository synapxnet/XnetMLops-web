/**
 * XAA 工作流设计器类型定义
 * 参考 Dify 工作流设计器
 */

// 节点类型枚举
export enum NodeType {
  // 基础节点
  Start = 'start',
  End = 'end',

  // DPP 数据处理节点
  DppDataset = 'dpp-dataset',
  DppFeature = 'dpp-feature',
  DppTask = 'dpp-task',

  // MTP 模型训练节点
  MtpAlgorithm = 'mtp-algorithm',
  MtpTrain = 'mtp-train',
  MtpModel = 'mtp-model',

  // MEP 模型部署节点
  MepDeploy = 'mep-deploy',
  MepService = 'mep-service',

  // 控制流节点
  IfElse = 'if-else',
  Loop = 'loop',
  Parallel = 'parallel',

  // 工具节点
  HttpRequest = 'http-request',
  Code = 'code',
  VariableAssigner = 'variable-assigner',
  TemplateTransform = 'template-transform',
  Wait = 'wait',
}

// 节点分类
export enum NodeClassification {
  Basic = 'basic',
  DataProcess = 'data-process',
  ModelTrain = 'model-train',
  ModelDeploy = 'model-deploy',
  Logic = 'logic',
  Tool = 'tool',
}

// 执行状态
export enum ExecutionStatus {
  Pending = 'pending',
  Running = 'running',
  Succeeded = 'succeeded',
  Failed = 'failed',
  Skipped = 'skipped',
  Stopped = 'stopped',
}

// 节点元数据
export interface NodeMetadata {
  type: NodeType;
  classification: NodeClassification;
  title: string;
  description: string;
  icon: string;
  color: string;
  minInputs?: number;
  maxInputs?: number;
  minOutputs?: number;
  maxOutputs?: number;
}

// 节点数据
export interface NodeData {
  type: NodeType;
  title: string;
  description?: string;
  config: Record<string, any>;
  inputs?: VariableDefinition[];
  outputs?: VariableDefinition[];
  selected?: boolean;
  running?: boolean;
  status?: ExecutionStatus;
  _isBatchRunPaused?: boolean;
}

// 变量定义
export interface VariableDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  label?: string;
  required?: boolean;
  default?: any;
}

// 条件表达式
export interface Condition {
  id: string;
  variable: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: any;
}

// 条件分支
export interface ConditionCase {
  caseId: string;
  name: string;
  logicalOperator: 'and' | 'or';
  conditions: Condition[];
}

// IfElse 节点配置
export interface IfElseConfig {
  cases: ConditionCase[];
}

// DPP 数据集节点配置
export interface DppDatasetConfig {
  datasetId?: number;
  datasetName?: string;
  outputVariables?: string[];
}

// DPP 特征工程节点配置
export interface DppFeatureConfig {
  featureId?: number;
  featureName?: string;
  inputDataset?: string;
  operations?: string[];
}

// MTP 训练节点配置
export interface MtpTrainConfig {
  algorithmId?: number;
  algorithmName?: string;
  inputDataset?: string;
  hyperParameters?: Record<string, any>;
  outputModelName?: string;
}

// MEP 部署节点配置
export interface MepDeployConfig {
  modelId?: number;
  modelName?: string;
  deploymentName?: string;
  replicas?: number;
  resourceConfig?: {
    cpu?: string;
    memory?: string;
    gpu?: number;
  };
}

// HTTP 请求节点配置
export interface HttpRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

// 代码节点配置
export interface CodeConfig {
  language: 'python' | 'javascript';
  code: string;
  dependencies?: string[];
}

// 等待节点配置
export interface WaitConfig {
  duration: number;
  unit: 'seconds' | 'minutes' | 'hours';
}

// 工作流图定义
export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

// 工作流节点
export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: NodeData;
  width?: number;
  height?: number;
}

// 工作流边
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  animated?: boolean;
  style?: Record<string, any>;
  edgeType?: string;
  conditionJson?: string;
  sortOrder?: number;
}

// 控制模式
export enum ControlMode {
  Pointer = 'pointer',
  Hand = 'hand',
}

// 工作流设计器状态
export interface WorkflowDesignerState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
  controlMode: ControlMode;
  zoom: number;
  isDragging: boolean;
  isConnecting: boolean;
  clipboard: WorkflowNode[];
  history: WorkflowGraph[];
  historyIndex: number;
}

// 节点面板配置
export interface NodePanelConfig {
  nodeId: string;
  nodeType: NodeType;
  data: NodeData;
}
