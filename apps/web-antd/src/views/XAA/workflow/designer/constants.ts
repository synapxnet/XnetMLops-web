/**
 * XAA 工作流设计器常量配置
 */

import { NodeClassification, NodeType } from './types';
import type { NodeMetadata } from './types';

// 节点元数据配置
export const NODE_METADATA: Record<NodeType, NodeMetadata> = {
  // 基础节点
  [NodeType.Start]: {
    type: NodeType.Start,
    classification: NodeClassification.Basic,
    title: '开始',
    description: '工作流的起始节点',
    icon: 'play-circle',
    color: '#52c41a',
    minInputs: 0,
    maxInputs: 0,
    minOutputs: 1,
    maxOutputs: 1,
  },
  [NodeType.End]: {
    type: NodeType.End,
    classification: NodeClassification.Basic,
    title: '结束',
    description: '工作流的结束节点',
    icon: 'stop-circle',
    color: '#ff4d4f',
    minInputs: 1,
    maxInputs: -1,
    minOutputs: 0,
    maxOutputs: 0,
  },

  // DPP 数据处理节点
  [NodeType.DppDataset]: {
    type: NodeType.DppDataset,
    classification: NodeClassification.DataProcess,
    title: '数据集',
    description: '选择 DPP 平台中的数据集',
    icon: 'database',
    color: '#1890ff',
    minInputs: 0,
    maxInputs: 1,
    minOutputs: 1,
    maxOutputs: 1,
  },
  [NodeType.DppFeature]: {
    type: NodeType.DppFeature,
    classification: NodeClassification.DataProcess,
    title: '特征工程',
    description: '执行 DPP 特征工程任务',
    icon: 'experiment',
    color: '#1890ff',
    minInputs: 1,
    maxInputs: 1,
    minOutputs: 1,
    maxOutputs: 1,
  },
  [NodeType.DppTask]: {
    type: NodeType.DppTask,
    classification: NodeClassification.DataProcess,
    title: '数据处理任务',
    description: '执行 DPP 数据处理任务',
    icon: 'thunderbolt',
    color: '#1890ff',
    minInputs: 1,
    maxInputs: -1,
    minOutputs: 1,
    maxOutputs: 1,
  },

  // MTP 模型训练节点
  [NodeType.MtpAlgorithm]: {
    type: NodeType.MtpAlgorithm,
    classification: NodeClassification.ModelTrain,
    title: '算法选择',
    description: '选择 MTP 平台中的训练算法',
    icon: 'robot',
    color: '#722ed1',
    minInputs: 0,
    maxInputs: 1,
    minOutputs: 1,
    maxOutputs: 1,
  },
  [NodeType.MtpTrain]: {
    type: NodeType.MtpTrain,
    classification: NodeClassification.ModelTrain,
    title: '模型训练',
    description: '执行 MTP 模型训练任务',
    icon: 'rocket',
    color: '#722ed1',
    minInputs: 1,
    maxInputs: 2,
    minOutputs: 1,
    maxOutputs: 1,
  },
  [NodeType.MtpModel]: {
    type: NodeType.MtpModel,
    classification: NodeClassification.ModelTrain,
    title: '模型输出',
    description: '输出训练好的模型',
    icon: 'crown',
    color: '#722ed1',
    minInputs: 1,
    maxInputs: 1,
    minOutputs: 1,
    maxOutputs: 1,
  },

  // MEP 模型部署节点
  [NodeType.MepDeploy]: {
    type: NodeType.MepDeploy,
    classification: NodeClassification.ModelDeploy,
    title: '模型部署',
    description: '将模型部署到 MEP 平台',
    icon: 'cloud-upload',
    color: '#fa8c16',
    minInputs: 1,
    maxInputs: 1,
    minOutputs: 1,
    maxOutputs: 1,
  },
  [NodeType.MepService]: {
    type: NodeType.MepService,
    classification: NodeClassification.ModelDeploy,
    title: '推理服务',
    description: '配置 MEP 推理服务',
    icon: 'api',
    color: '#fa8c16',
    minInputs: 1,
    maxInputs: 1,
    minOutputs: 1,
    maxOutputs: 1,
  },

  // 控制流节点
  [NodeType.IfElse]: {
    type: NodeType.IfElse,
    classification: NodeClassification.Logic,
    title: '条件分支',
    description: '根据条件进行分支判断',
    icon: 'branches',
    color: '#13c2c2',
    minInputs: 1,
    maxInputs: 1,
    minOutputs: 2,
    maxOutputs: -1,
  },
  [NodeType.Loop]: {
    type: NodeType.Loop,
    classification: NodeClassification.Logic,
    title: '循环',
    description: '循环执行节点',
    icon: 'sync',
    color: '#13c2c2',
    minInputs: 1,
    maxInputs: 1,
    minOutputs: 1,
    maxOutputs: 2,
  },
  [NodeType.Parallel]: {
    type: NodeType.Parallel,
    classification: NodeClassification.Logic,
    title: '并行执行',
    description: '并行执行多个分支',
    icon: 'apartment',
    color: '#13c2c2',
    minInputs: 1,
    maxInputs: 1,
    minOutputs: 2,
    maxOutputs: -1,
  },

  // 工具节点
  [NodeType.HttpRequest]: {
    type: NodeType.HttpRequest,
    classification: NodeClassification.Tool,
    title: 'HTTP 请求',
    description: '发送 HTTP 请求',
    icon: 'global',
    color: '#eb2f96',
    minInputs: 1,
    maxInputs: 1,
    minOutputs: 1,
    maxOutputs: 2,
  },
  [NodeType.Code]: {
    type: NodeType.Code,
    classification: NodeClassification.Tool,
    title: '代码执行',
    description: '执行自定义代码',
    icon: 'code',
    color: '#eb2f96',
    minInputs: 1,
    maxInputs: 1,
    minOutputs: 1,
    maxOutputs: 1,
  },
  [NodeType.VariableAssigner]: {
    type: NodeType.VariableAssigner,
    classification: NodeClassification.Tool,
    title: '变量赋值',
    description: '设置或修改变量值',
    icon: 'edit',
    color: '#eb2f96',
    minInputs: 1,
    maxInputs: 1,
    minOutputs: 1,
    maxOutputs: 1,
  },
  [NodeType.TemplateTransform]: {
    type: NodeType.TemplateTransform,
    classification: NodeClassification.Tool,
    title: '模板转换',
    description: '使用模板转换数据',
    icon: 'file-text',
    color: '#eb2f96',
    minInputs: 1,
    maxInputs: 1,
    minOutputs: 1,
    maxOutputs: 1,
  },
  [NodeType.Wait]: {
    type: NodeType.Wait,
    classification: NodeClassification.Tool,
    title: '等待',
    description: '等待指定时间',
    icon: 'hourglass',
    color: '#eb2f96',
    minInputs: 1,
    maxInputs: 1,
    minOutputs: 1,
    maxOutputs: 1,
  },
};

// 节点分类配置
export const NODE_CLASSIFICATIONS = [
  {
    key: NodeClassification.Basic,
    title: '基础节点',
    nodes: [NodeType.Start, NodeType.End],
  },
  {
    key: NodeClassification.DataProcess,
    title: '数据处理 (DPP)',
    nodes: [NodeType.DppDataset, NodeType.DppFeature, NodeType.DppTask],
  },
  {
    key: NodeClassification.ModelTrain,
    title: '模型训练 (MTP)',
    nodes: [NodeType.MtpAlgorithm, NodeType.MtpTrain, NodeType.MtpModel],
  },
  {
    key: NodeClassification.ModelDeploy,
    title: '模型部署 (MEP)',
    nodes: [NodeType.MepDeploy, NodeType.MepService],
  },
  {
    key: NodeClassification.Logic,
    title: '逻辑控制',
    nodes: [NodeType.IfElse, NodeType.Loop, NodeType.Parallel],
  },
  {
    key: NodeClassification.Tool,
    title: '工具节点',
    nodes: [
      NodeType.HttpRequest,
      NodeType.Code,
      NodeType.VariableAssigner,
      NodeType.TemplateTransform,
      NodeType.Wait,
    ],
  },
];

// 默认节点配置
export const DEFAULT_NODE_CONFIGS: Record<NodeType, Record<string, any>> = {
  [NodeType.Start]: {},
  [NodeType.End]: {},
  [NodeType.DppDataset]: {
    datasetId: null,
    datasetName: '',
  },
  [NodeType.DppFeature]: {
    featureId: null,
    featureName: '',
    inputDataset: '',
  },
  [NodeType.DppTask]: {
    taskType: 'transform',
  },
  [NodeType.MtpAlgorithm]: {
    algorithmId: null,
    algorithmName: '',
  },
  [NodeType.MtpTrain]: {
    algorithmId: null,
    inputDataset: '',
    hyperParameters: {},
  },
  [NodeType.MtpModel]: {
    modelName: '',
  },
  [NodeType.MepDeploy]: {
    modelId: null,
    deploymentName: '',
    replicas: 1,
  },
  [NodeType.MepService]: {
    serviceName: '',
    endpoint: '',
  },
  [NodeType.IfElse]: {
    cases: [
      {
        caseId: 'if',
        name: 'IF',
        logicalOperator: 'and',
        conditions: [],
      },
    ],
  },
  [NodeType.Loop]: {
    loopType: 'count',
    count: 10,
    condition: '',
  },
  [NodeType.Parallel]: {
    branches: 2,
  },
  [NodeType.HttpRequest]: {
    method: 'GET',
    url: '',
    headers: {},
    body: '',
    timeout: 30000,
  },
  [NodeType.Code]: {
    language: 'python',
    code: '# 在这里编写代码\n',
    dependencies: [],
  },
  [NodeType.VariableAssigner]: {
    assignments: [],
  },
  [NodeType.TemplateTransform]: {
    template: '',
  },
  [NodeType.Wait]: {
    duration: 1,
    unit: 'seconds',
  },
};

// 画布配置
export const CANVAS_CONFIG = {
  minZoom: 0.25,
  maxZoom: 2,
  defaultZoom: 1,
  snapGrid: [15, 15] as [number, number],
  connectionLineStyle: {
    stroke: '#b1b1b7',
    strokeWidth: 2,
  },
  defaultEdgeOptions: {
    type: 'smoothstep',
    animated: false,
    style: {
      stroke: '#b1b1b7',
      strokeWidth: 2,
    },
  },
};

// 节点尺寸
export const NODE_DIMENSIONS = {
  default: { width: 240, height: 80 },
  start: { width: 100, height: 50 },
  end: { width: 100, height: 50 },
  ifElse: { width: 240, height: 120 },
  loop: { width: 300, height: 200 },
};

// 快捷键配置
export const SHORTCUTS = {
  delete: ['Delete', 'Backspace'],
  copy: ['ctrl+c', 'meta+c'],
  paste: ['ctrl+v', 'meta+v'],
  undo: ['ctrl+z', 'meta+z'],
  redo: ['ctrl+y', 'meta+shift+z'],
  selectAll: ['ctrl+a', 'meta+a'],
  zoomIn: ['ctrl+=', 'meta+='],
  zoomOut: ['ctrl+-', 'meta+-'],
  zoomReset: ['ctrl+0', 'meta+0'],
  fitView: ['ctrl+1', 'meta+1'],
  modeHand: ['h'],
  modePointer: ['v'],
};
