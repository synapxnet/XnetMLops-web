<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message, Spin } from 'ant-design-vue';

import { WorkflowDesigner } from './designer';
import type { WorkflowNode, WorkflowEdge } from './designer/types';
import {
  executeWorkflow,
  fetchWorkflowById,
  fetchWorkflowEdges,
  fetchWorkflowNodes,
  saveWorkflowGraph,
} from '../api/workflow';
import type { Workflow } from '../api/types';

const router = useRouter();
const route = useRoute();

// 工作流数据
const workflow = ref<Workflow | null>(null);
const workflowId = ref<number>(0);
const loading = ref(true);

// 初始节点和边
const initialNodes = ref<WorkflowNode[]>([]);
const initialEdges = ref<WorkflowEdge[]>([]);

// 设计器引用
const designerRef = ref<InstanceType<typeof WorkflowDesigner> | null>(null);

// 加载工作流数据
const loadWorkflow = async () => {
  const id = route.query.id;
  if (!id) {
    message.error('缺少工作流ID');
    router.push({ path: '/XAA/workflow/index' });
    return;
  }

  workflowId.value = Number(id);
  loading.value = true;

  try {
    // 获取工作流基本信息
    workflow.value = await fetchWorkflowById(workflowId.value);

    // 获取节点和边
    const [nodesData, edgesData] = await Promise.all([
      fetchWorkflowNodes(workflowId.value),
      fetchWorkflowEdges(workflowId.value),
    ]);

    // 转换后端数据为设计器格式
    initialNodes.value = nodesData.map((node: any) => ({
      id: node.uid || `node-${node.id}`,
      type: 'custom',
      position: {
        x: node.positionX || 100,
        y: node.positionY || 100,
      },
      data: {
        type: node.nodeType,
        title: node.title,
        description: node.description || '',
        config: node.configJson ? JSON.parse(node.configJson) : {},
      },
    }));

    initialEdges.value = edgesData.map((edge: any) => ({
      id: edge.uid || `edge-${edge.id}`,
      source: edge.sourceNodeId?.toString() || edge.sourceNodeUid,
      target: edge.targetNodeId?.toString() || edge.targetNodeUid,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: 'smoothstep',
    }));

  } catch (error) {
    console.error('加载工作流失败:', error);
    message.error('加载工作流失败');
  } finally {
    loading.value = false;
  }
};

// 保存工作流
const handleSave = async (data: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) => {
  try {
    // 转换设计器数据为后端格式
    const workflowNodes = data.nodes.map((node, index) => ({
      uid: node.id,
      workflowId: workflowId.value,
      nodeType: node.data.type,
      title: node.data.title,
      description: node.data.description || '',
      configJson: JSON.stringify(node.data.config || {}),
      positionX: node.position.x,
      positionY: node.position.y,
      width: node.width || 200,
      height: node.height || 80,
      sortOrder: index,
    }));

    const workflowEdges = data.edges.map((edge) => ({
      uid: edge.id,
      workflowId: workflowId.value,
      sourceNodeUid: edge.source,
      targetNodeUid: edge.target,
      sourceHandle: edge.sourceHandle || '',
      targetHandle: edge.targetHandle || '',
      edgeType: 'default',
    }));

    await saveWorkflowGraph(workflowId.value, {
      nodes: workflowNodes,
      edges: workflowEdges,
    });

    message.success('工作流保存成功');
  } catch (error) {
    console.error('保存工作流失败:', error);
    message.error('保存工作流失败');
  }
};

// 运行工作流
const handleRun = async (id: number) => {
  try {
    const execution = await executeWorkflow(id, {
      inputs: {},
      triggerType: 'manual',
    });
    message.success('工作流已开始执行');
    router.push({
      path: '/XAA/workflow/execution-detail',
      query: { id: execution.id },
    });
  } catch (error) {
    console.error('执行工作流失败:', error);
    message.error('执行工作流失败');
  }
};

onMounted(() => {
  loadWorkflow();
});
</script>

<template>
  <div class="workflow-designer-page">
    <Spin :spinning="loading" tip="加载中...">
      <WorkflowDesigner
        v-if="!loading"
        ref="designerRef"
        :workflow-id="workflowId"
        :workflow-name="workflow?.name || '未命名工作流'"
        :initial-nodes="initialNodes"
        :initial-edges="initialEdges"
        @save="handleSave"
        @run="handleRun"
      />
    </Spin>
  </div>
</template>

<style scoped>
.workflow-designer-page {
  height: calc(100vh - 48px);
  background: #f0f2f5;
}

:deep(.ant-spin-nested-loading) {
  height: 100%;
}

:deep(.ant-spin-container) {
  height: 100%;
}
</style>
