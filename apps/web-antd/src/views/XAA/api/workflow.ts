import { xaaRequestClient } from '#/api/request';

import type {
  CreateWorkflowRequest,
  ExecuteWorkflowRequest,
  NodeExecution,
  Workflow,
  WorkflowEdge,
  WorkflowExecution,
  WorkflowGraph,
  WorkflowNode,
} from './types';

/**
 * 获取工作流列表
 */
export async function fetchWorkflowList(status?: string): Promise<Workflow[]> {
  const url = status ? `/workflows?status=${status}` : `/workflows`;
  const response = await xaaRequestClient.get(url);
  return response;
}

/**
 * 获取工作流详情
 */
export async function fetchWorkflowById(id: number): Promise<Workflow> {
  const response = await xaaRequestClient.get(`/workflows/${id}`);
  return response;
}

/**
 * 创建工作流
 */
export async function createWorkflow(
  data: CreateWorkflowRequest,
): Promise<Workflow> {
  const response = await xaaRequestClient.post(`/workflows`, data);
  return response;
}

/**
 * 更新工作流
 */
export async function updateWorkflow(
  id: number,
  data: Partial<Workflow>,
): Promise<Workflow> {
  const response = await xaaRequestClient.put(`/workflows/${id}`, data);
  return response;
}

/**
 * 删除工作流
 */
export async function deleteWorkflow(id: number): Promise<void> {
  await xaaRequestClient.delete(`/workflows/${id}`);
}

/**
 * 发布工作流
 */
export async function publishWorkflow(id: number): Promise<Workflow> {
  const response = await xaaRequestClient.post(`/workflows/${id}/publish`);
  return response;
}

/**
 * 归档工作流
 */
export async function archiveWorkflow(id: number): Promise<Workflow> {
  const response = await xaaRequestClient.post(`/workflows/${id}/archive`);
  return response;
}

/**
 * 获取工作流节点
 */
export async function fetchWorkflowNodes(
  workflowId: number,
): Promise<WorkflowNode[]> {
  const response = await xaaRequestClient.get(`/workflows/${workflowId}/nodes`);
  return response;
}

/**
 * 获取工作流边
 */
export async function fetchWorkflowEdges(
  workflowId: number,
): Promise<WorkflowEdge[]> {
  const response = await xaaRequestClient.get(`/workflows/${workflowId}/edges`);
  return response;
}

/**
 * 保存工作流图
 */
export async function saveWorkflowGraph(
  workflowId: number,
  graph: WorkflowGraph,
): Promise<void> {
  await xaaRequestClient.post(`/workflows/${workflowId}/graph`, graph);
}

/**
 * 执行工作流
 */
export async function executeWorkflow(
  workflowId: number,
  request?: ExecuteWorkflowRequest,
): Promise<WorkflowExecution> {
  const response = await xaaRequestClient.post(
    `/workflows/${workflowId}/execute`,
    request || {},
  );
  return response;
}

/**
 * 获取执行记录详情
 */
export async function fetchExecutionById(
  id: number,
): Promise<WorkflowExecution> {
  const response = await xaaRequestClient.get(`/executions/${id}`);
  return response;
}

/**
 * 获取工作流的执行记录列表
 */
export async function fetchWorkflowExecutions(
  workflowId: number,
): Promise<WorkflowExecution[]> {
  const response = await xaaRequestClient.get(
    `/workflows/${workflowId}/executions`,
  );
  return response;
}

/**
 * 获取节点执行记录
 */
export async function fetchNodeExecutions(
  executionId: number,
): Promise<NodeExecution[]> {
  const response = await xaaRequestClient.get(
    `/executions/${executionId}/nodes`,
  );
  return response;
}

/**
 * 停止执行
 */
export async function stopExecution(executionId: number): Promise<void> {
  await xaaRequestClient.post(`/executions/${executionId}/stop`);
}

/**
 * 获取DPP数据集列表
 */
export async function fetchDppDatasets(): Promise<any> {
  const response = await xaaRequestClient.get(`/resources/dpp/datasets`);
  return response;
}

/**
 * 获取DPP特征工程列表
 */
export async function fetchDppFeatures(): Promise<any> {
  const response = await xaaRequestClient.get(`/resources/dpp/features`);
  return response;
}

/**
 * 获取MTP算法列表
 */
export async function fetchMtpAlgorithms(): Promise<any> {
  const response = await xaaRequestClient.get(`/resources/mtp/algorithms`);
  return response;
}

/**
 * 获取MTP训练任务列表
 */
export async function fetchMtpTrainTasks(): Promise<any> {
  const response = await xaaRequestClient.get(`/resources/mtp/train-tasks`);
  return response;
}

/**
 * 获取MEP部署列表
 */
export async function fetchMepDeployments(): Promise<any> {
  const response = await xaaRequestClient.get(`/resources/mep/deployments`);
  return response;
}

/**
 * 获取MEP服务列表
 */
export async function fetchMepServices(): Promise<any> {
  const response = await xaaRequestClient.get(`/resources/mep/services`);
  return response;
}
