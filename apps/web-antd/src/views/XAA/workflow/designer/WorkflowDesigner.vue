<template>
  <div class="workflow-designer">
    <!-- 工具栏 -->
    <Toolbar
      :workflow-name="workflowName"
      v-model:control-mode="controlMode"
      :zoom="viewport.zoom"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :is-dirty="isDirty"
      v-model:show-minimap="showMinimap"
      :saving="saving"
      :running="running"
      @undo="undo"
      @redo="redo"
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
      @zoom-to="zoomTo"
      @fit-view="fitView"
      @save="saveWorkflow"
      @run="runWorkflow"
    />

    <div class="workflow-designer__main">
      <!-- 左侧节点选择器 -->
      <NodeSelector
        @add-node="handleAddNodeToCenter"
        @drag-start="handleDragStart"
      />

      <!-- 中间画布区域 -->
      <div
        class="workflow-designer__canvas"
        ref="canvasRef"
        @drop="handleDrop"
        @dragover="handleDragOver"
      >
        <VueFlow
          ref="vueFlowRef"
          v-model:nodes="nodes"
          v-model:edges="edges"
          :node-types="nodeTypes"
          :default-edge-options="defaultEdgeOptions"
          :connection-line-style="connectionLineStyle"
          :snap-to-grid="true"
          :snap-grid="snapGrid"
          :min-zoom="0.25"
          :max-zoom="2"
          :pan-on-drag="controlMode === 'hand'"
          :pan-on-scroll="controlMode === 'pointer'"
          :zoom-on-scroll="true"
          :zoom-on-pinch="true"
          :zoom-on-double-click="false"
          :selection-key-code="null"
          :multi-selection-key-code="['Shift']"
          :delete-key-code="null"
          fit-view-on-init
          @node-click="handleNodeClick"
          @node-drag-stop="handleNodeDragStop"
          @connect="handleConnect"
          @edge-click="handleEdgeClick"
          @pane-click="handlePaneClick"
          @viewport-change="handleViewportChange"
        >
          <!-- 背景 -->
          <Background :gap="14" :size="2" pattern-color="#e5e7eb" />

          <!-- 小地图 -->
          <MiniMap
            v-if="showMinimap"
            :pannable="true"
            :zoomable="true"
            :width="150"
            :height="100"
            class="workflow-minimap"
          />

          <!-- 控制按钮 -->
          <Controls :show-zoom="false" :show-fit-view="false" :show-interactive="false" />
        </VueFlow>

        <!-- 拖拽预览节点 -->
        <div
          v-if="draggedNodeType"
          class="workflow-designer__drag-preview"
          :style="dragPreviewStyle"
        >
          <NodePreview :node-type="draggedNodeType" />
        </div>
      </div>

      <!-- 右侧配置面板 -->
      <NodeConfigPanel
        :node="selectedNode"
        :datasets="datasets"
        :features="features"
        :algorithms="algorithms"
        @close="handleClosePanel"
        @update="handleUpdateNode"
        @delete="handleDeleteNode"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, provide } from 'vue';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { MiniMap } from '@vue-flow/minimap';
import { v4 as uuidv4 } from 'uuid';
import { message } from 'ant-design-vue';

import Toolbar from './components/Toolbar.vue';
import NodeSelector from './components/NodeSelector.vue';
import NodeConfigPanel from './components/NodeConfigPanel.vue';
import BaseNode from './nodes/BaseNode.vue';
import NodePreview from './nodes/NodePreview.vue';
import { nodeTypes } from './nodes';
import {
  NODE_METADATA,
  DEFAULT_NODE_CONFIGS,
  CANVAS_CONFIG,
} from './constants';
import type {
  WorkflowNode,
  WorkflowEdge,
  NodeData,
  NodeType,
  ControlMode,
} from './types';

// Props
interface Props {
  workflowId?: number;
  workflowName?: string;
  initialNodes?: WorkflowNode[];
  initialEdges?: WorkflowEdge[];
}

const props = withDefaults(defineProps<Props>(), {
  workflowName: '未命名工作流',
  initialNodes: () => [],
  initialEdges: () => [],
});

// Emits
const emit = defineEmits<{
  (e: 'save', data: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }): void;
  (e: 'run', workflowId: number): void;
}>();

// Vue Flow
const vueFlowRef = ref();
const { project, fitView: vueFlowFitView, zoomIn: vueFlowZoomIn, zoomOut: vueFlowZoomOut, setViewport } = useVueFlow();

// 状态
const nodes = ref<WorkflowNode[]>([]);
const edges = ref<WorkflowEdge[]>([]);
const selectedNodeId = ref<string | null>(null);
const controlMode = ref<ControlMode>('pointer');
const showMinimap = ref(true);
const isDirty = ref(false);
const saving = ref(false);
const running = ref(false);
const viewport = ref({ x: 0, y: 0, zoom: 1 });

// 历史记录
const history = ref<{ nodes: WorkflowNode[]; edges: WorkflowEdge[] }[]>([]);
const historyIndex = ref(-1);
const maxHistoryLength = 50;

// 拖拽状态
const canvasRef = ref<HTMLElement | null>(null);
const draggedNodeType = ref<NodeType | null>(null);
const dragPosition = ref({ x: 0, y: 0 });

// 外部数据 (从 API 获取)
const datasets = ref<any[]>([]);
const features = ref<any[]>([]);
const algorithms = ref<any[]>([]);

// 计算属性
const selectedNode = computed(() => {
  if (!selectedNodeId.value) return null;
  return nodes.value.find((n) => n.id === selectedNodeId.value) || null;
});

const canUndo = computed(() => historyIndex.value > 0);
const canRedo = computed(() => historyIndex.value < history.value.length - 1);

const defaultEdgeOptions = CANVAS_CONFIG.defaultEdgeOptions;
const connectionLineStyle = CANVAS_CONFIG.connectionLineStyle;
const snapGrid = CANVAS_CONFIG.snapGrid;

const dragPreviewStyle = computed(() => ({
  left: `${dragPosition.value.x}px`,
  top: `${dragPosition.value.y}px`,
  transform: 'translate(-50%, -50%)',
}));

// 初始化
onMounted(() => {
  // 初始化节点和边
  if (props.initialNodes.length > 0) {
    nodes.value = JSON.parse(JSON.stringify(props.initialNodes));
    edges.value = JSON.parse(JSON.stringify(props.initialEdges));
  } else {
    // 添加默认的开始节点
    addDefaultStartNode();
  }

  // 保存初始状态到历史
  saveToHistory();

  // 加载外部数据
  loadExternalData();

  // 绑定快捷键
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
});

// 监听节点和边的变化
watch(
  [nodes, edges],
  () => {
    isDirty.value = true;
  },
  { deep: true }
);

// 方法
function addDefaultStartNode() {
  const startNode: WorkflowNode = {
    id: uuidv4(),
    type: 'custom',
    position: { x: 100, y: 200 },
    data: {
      type: 'start' as NodeType,
      title: '开始',
      config: {},
    },
  };
  nodes.value = [startNode];
}

function saveToHistory() {
  // 截断历史记录
  if (historyIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, historyIndex.value + 1);
  }

  // 添加新状态
  history.value.push({
    nodes: JSON.parse(JSON.stringify(nodes.value)),
    edges: JSON.parse(JSON.stringify(edges.value)),
  });

  // 限制历史长度
  if (history.value.length > maxHistoryLength) {
    history.value.shift();
  } else {
    historyIndex.value++;
  }
}

function undo() {
  if (!canUndo.value) return;
  historyIndex.value--;
  const state = history.value[historyIndex.value];
  nodes.value = JSON.parse(JSON.stringify(state.nodes));
  edges.value = JSON.parse(JSON.stringify(state.edges));
}

function redo() {
  if (!canRedo.value) return;
  historyIndex.value++;
  const state = history.value[historyIndex.value];
  nodes.value = JSON.parse(JSON.stringify(state.nodes));
  edges.value = JSON.parse(JSON.stringify(state.edges));
}

function zoomIn() {
  vueFlowZoomIn();
}

function zoomOut() {
  vueFlowZoomOut();
}

function zoomTo(zoom: number) {
  setViewport({ ...viewport.value, zoom });
}

function fitView() {
  vueFlowFitView({ padding: 0.2 });
}

function handleViewportChange(vp: { x: number; y: number; zoom: number }) {
  viewport.value = vp;
}

// 节点操作
function handleNodeClick({ node }: { node: WorkflowNode }) {
  selectedNodeId.value = node.id;
  // 更新节点选中状态
  nodes.value = nodes.value.map((n) => ({
    ...n,
    data: { ...n.data, selected: n.id === node.id },
  }));
}

function handlePaneClick() {
  selectedNodeId.value = null;
  nodes.value = nodes.value.map((n) => ({
    ...n,
    data: { ...n.data, selected: false },
  }));
}

function handleNodeDragStop() {
  saveToHistory();
}

function handleConnect(params: { source: string; target: string; sourceHandle?: string; targetHandle?: string }) {
  const newEdge: WorkflowEdge = {
    id: `e-${params.source}-${params.target}-${uuidv4()}`,
    source: params.source,
    target: params.target,
    sourceHandle: params.sourceHandle,
    targetHandle: params.targetHandle,
    type: 'smoothstep',
    animated: false,
  };
  edges.value = [...edges.value, newEdge];
  saveToHistory();
}

function handleEdgeClick({ edge }: { edge: WorkflowEdge }) {
  // 可以在这里处理边的选中
}

function handleClosePanel() {
  selectedNodeId.value = null;
  nodes.value = nodes.value.map((n) => ({
    ...n,
    data: { ...n.data, selected: false },
  }));
}

function handleUpdateNode(nodeId: string, data: Partial<NodeData>) {
  nodes.value = nodes.value.map((n) => {
    if (n.id === nodeId) {
      return { ...n, data: { ...n.data, ...data } };
    }
    return n;
  });
  saveToHistory();
}

function handleDeleteNode(nodeId: string) {
  nodes.value = nodes.value.filter((n) => n.id !== nodeId);
  edges.value = edges.value.filter((e) => e.source !== nodeId && e.target !== nodeId);
  selectedNodeId.value = null;
  saveToHistory();
}

// 拖拽操作
function handleDragStart(event: DragEvent, nodeType: NodeType) {
  draggedNodeType.value = nodeType;
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
  if (canvasRef.value) {
    const rect = canvasRef.value.getBoundingClientRect();
    dragPosition.value = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  const nodeType = event.dataTransfer?.getData('application/xaa-node') as NodeType;
  if (!nodeType || !canvasRef.value) {
    draggedNodeType.value = null;
    return;
  }

  const rect = canvasRef.value.getBoundingClientRect();
  const position = project({
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  });

  addNode(nodeType, position);
  draggedNodeType.value = null;
}

function handleAddNodeToCenter(nodeType: NodeType) {
  // 添加到画布中心
  const centerPosition = project({
    x: canvasRef.value ? canvasRef.value.clientWidth / 2 : 400,
    y: canvasRef.value ? canvasRef.value.clientHeight / 2 : 300,
  });
  addNode(nodeType, centerPosition);
}

function addNode(nodeType: NodeType, position: { x: number; y: number }) {
  const meta = NODE_METADATA[nodeType];
  const newNode: WorkflowNode = {
    id: uuidv4(),
    type: 'custom',
    position,
    data: {
      type: nodeType,
      title: meta?.title || nodeType,
      description: '',
      config: { ...DEFAULT_NODE_CONFIGS[nodeType] },
    },
  };

  nodes.value = [...nodes.value, newNode];
  selectedNodeId.value = newNode.id;
  saveToHistory();
}

// 快捷键处理
function handleKeyDown(event: KeyboardEvent) {
  const isCtrl = event.ctrlKey || event.metaKey;

  // 删除选中节点
  if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNodeId.value) {
    event.preventDefault();
    handleDeleteNode(selectedNodeId.value);
    return;
  }

  // 撤销
  if (isCtrl && event.key === 'z' && !event.shiftKey) {
    event.preventDefault();
    undo();
    return;
  }

  // 重做
  if ((isCtrl && event.key === 'y') || (isCtrl && event.shiftKey && event.key === 'z')) {
    event.preventDefault();
    redo();
    return;
  }

  // 切换模式
  if (event.key === 'h' && !isCtrl) {
    controlMode.value = 'hand';
    return;
  }
  if (event.key === 'v' && !isCtrl) {
    controlMode.value = 'pointer';
    return;
  }

  // 适应画布
  if (isCtrl && event.key === '1') {
    event.preventDefault();
    fitView();
    return;
  }
}

// 保存和运行
async function saveWorkflow() {
  saving.value = true;
  try {
    emit('save', {
      nodes: nodes.value,
      edges: edges.value,
    });
    isDirty.value = false;
    message.success('工作流保存成功');
  } catch (error) {
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
}

async function runWorkflow() {
  if (!props.workflowId) {
    message.warning('请先保存工作流');
    return;
  }
  running.value = true;
  try {
    emit('run', props.workflowId);
  } finally {
    running.value = false;
  }
}

// 加载外部数据
async function loadExternalData() {
  // TODO: 从 API 加载数据集、特征工程、算法等数据
  // datasets.value = await fetchDppDatasets();
  // features.value = await fetchDppFeatures();
  // algorithms.value = await fetchMtpAlgorithms();
}

// 暴露方法供外部调用
defineExpose({
  getNodes: () => nodes.value,
  getEdges: () => edges.value,
  setNodes: (newNodes: WorkflowNode[]) => { nodes.value = newNodes; },
  setEdges: (newEdges: WorkflowEdge[]) => { edges.value = newEdges; },
  fitView,
  undo,
  redo,
});
</script>

<style lang="scss">
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/controls/dist/style.css';
@import '@vue-flow/minimap/dist/style.css';

.workflow-designer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f9fafb;

  &__main {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  &__canvas {
    flex: 1;
    position: relative;
    overflow: hidden;

    .vue-flow {
      background: #fafafa;
    }

    .vue-flow__background {
      background-color: #fafafa;
    }
  }

  &__drag-preview {
    position: absolute;
    pointer-events: none;
    z-index: 1000;
    opacity: 0.8;
  }
}

.workflow-minimap {
  position: absolute;
  right: 16px;
  bottom: 16px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

// Vue Flow 覆盖样式
.vue-flow__node {
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.vue-flow__handle {
  width: 12px;
  height: 12px;
  background: #fff;
  border: 2px solid #b1b1b7;
  border-radius: 50%;

  &:hover {
    border-color: #1890ff;
    background: #1890ff;
  }
}

.vue-flow__edge-path {
  stroke: #b1b1b7;
  stroke-width: 2;
}

.vue-flow__edge.selected .vue-flow__edge-path {
  stroke: #1890ff;
  stroke-width: 3;
}

.vue-flow__controls {
  display: none;
}
</style>
