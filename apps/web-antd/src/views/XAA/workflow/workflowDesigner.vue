<script lang="ts" setup>
import BusinessPage from '#/components/workspace/BusinessPage.vue';
import { onMounted, ref } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { Alert, Button, Modal, message, Spin } from 'ant-design-vue';
import { decodeGraph, encodeGraph } from './graph-contract';

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
const loadError = ref('');

// 初始节点和边
const initialNodes = ref<WorkflowNode[]>([]);
const initialEdges = ref<WorkflowEdge[]>([]);

// 设计器引用
const designerRef = ref<InstanceType<typeof WorkflowDesigner> | null>(null);

// 读取真实工作流，失败时不开放伪造的空画布。Load the real workflow and keep the editor closed on failure.
const loadWorkflow = async () => {
  const id = route.query.id;
  if (!id) {
    message.error('缺少工作流ID');
    router.push({ path: '/XAA/workflow/index' });
    return;
  }

  workflowId.value = Number(id);
  loading.value = true;
  loadError.value = '';

  try {
    // 获取工作流基本信息
    workflow.value = await fetchWorkflowById(workflowId.value);

    // 获取节点和边
    const [nodesData, edgesData] = await Promise.all([
      fetchWorkflowNodes(workflowId.value),
      fetchWorkflowEdges(workflowId.value),
    ]);

    const graph = decodeGraph(nodesData, edgesData);
    initialNodes.value = graph.nodes;
    initialEdges.value = graph.edges;

  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '工作流暂时无法加载';
    console.error('加载工作流失败:', error);
    message.error('加载工作流失败');
  } finally {
    loading.value = false;
  }
};

// 保存工作流后才确认编辑器已持久化。Confirm persistence only after the workflow API succeeds.
const handleSave = async (data: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) => {
  try {
    await saveWorkflowGraph(workflowId.value, encodeGraph(workflowId.value, data));

    designerRef.value?.finishSave(true);
    message.success('工作流保存成功');
  } catch (error) {
    console.error('保存工作流失败:', error);
    message.error('保存工作流失败');
    designerRef.value?.finishSave(false);
  }
};

// 运行请求完成后解除编辑器忙碌状态。Release editor busy state after the execution request finishes.
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
  } finally {
    designerRef.value?.finishRun();
  }
};

onMounted(() => {
  loadWorkflow();
});

/** 离开前保留未保存草稿的决定权。Keep unsaved draft decisions with the user before leaving. */
onBeforeRouteLeave(() => {
  if (!designerRef.value?.hasUnsavedChanges()) return true;
  return new Promise<boolean>((resolve) => {
    Modal.confirm({ title: '离开工作流设计器', content: '还有未保存的修改，离开会保留当前缓存页，但关闭页签或刷新后无法恢复。', okText: '离开', cancelText: '继续编辑', onOk: () => resolve(true), onCancel: () => resolve(false) });
  });
});
</script>

<template>
  <BusinessPage domain="智能协作" description="用助手、技能与工作流串联日常任务，查看每一步执行记录。">
  <div class="workflow-designer-page">
    <Spin :spinning="loading" tip="加载中...">
      <Alert v-if="loadError" type="error" show-icon message="工作流未加载" :description="loadError"><template #action><Button @click="loadWorkflow">重试</Button></template></Alert>
      <WorkflowDesigner
        v-if="!loading && !loadError"
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

  </BusinessPage>
</template>

<style scoped>
.workflow-designer-page {
  height: calc(100vh - 48px);
  background: hsl(var(--muted));
}

:deep(.ant-spin-nested-loading) {
  height: 100%;
}

:deep(.ant-spin-container) {
  height: 100%;
}
</style>
