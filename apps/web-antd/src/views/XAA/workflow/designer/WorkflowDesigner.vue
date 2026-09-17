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
          <Background :gap="14" :size="2" pattern-color="hsl(var(--border))" />

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
import { ref, computed, watch, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { MiniMap } from '@vue-flow/minimap';
import { v4 as uuidv4 } from 'uuid';
import { message } from 'ant-design-vue';
import { fetchDppDatasets, fetchDppFeatures, fetchMtpAlgorithms } from '../../api/workflow';

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
let initialized = false;
const saving = ref(false);
let pendingGraph = '';
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
  initialized = true;
  isDirty.value = props.initialNodes.length === 0;

  // 加载外部数据
  loadExternalData();

  // 绑定快捷键
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
});

/** 缓存页离开后停止监听键盘，避免影响其他表单。Stop keyboard listeners while a cached editor is inactive. */
onDeactivated(() => document.removeEventListener('keydown', handleKeyDown));
/** 返回缓存页时恢复画布快捷键。Restore canvas shortcuts when the cached editor becomes active. */
onActivated(() => document.addEventListener('keydown', handleKeyDown));

// 只把用户图内容变化记为草稿，忽略选中态与尺寸测量。Track graph content changes while ignoring selection and layout measurements.
watch(
  () => JSON.stringify({ nodes: nodes.value.map((node) => ({ id: node.id, position: node.position, data: node.data })), edges: edges.value.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, sourceHandle: edge.sourceHandle, targetHandle: edge.targetHandle, edgeType: edge.edgeType, conditionJson: edge.conditionJson })) }),
  () => {
    if (initialized) isDirty.value = true;
  },
  { flush: 'sync' }
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
  // 输入控件中的编辑快捷键不能删除画布节点。Editing shortcuts inside fields must not delete canvas nodes.
  if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]')) return;
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

// 提交保存请求，由父级真实API结果确认。Request saving and await the parent's actual API outcome.
async function saveWorkflow() {
  if (saving.value) return;
  saving.value = true;
  pendingGraph = JSON.stringify({ nodes: nodes.value, edges: edges.value });
  emit('save', { nodes: nodes.value, edges: edges.value });
}

/** 只在对应图保存成功后清除草稿标记。Clear dirty state only when the submitted graph was saved successfully. */
function finishSave(success: boolean) {
  if (success && pendingGraph === JSON.stringify({ nodes: nodes.value, edges: edges.value })) isDirty.value = false;
  saving.value = false;
}

/** 发起运行并由父级回传执行请求结果。Request execution and receive its outcome from the parent. */
async function runWorkflow() {
  if (running.value) return;
  if (!props.workflowId) {
    message.warning('请先保存工作流');
    return;
  }
  running.value = true;
  emit('run', props.workflowId);
}

/** 完成真实运行请求后解除加载状态。Release loading after the actual execution request finishes. */
function finishRun() { running.value = false; }

// 加载已存在的资源接口，不使用空壳数据。Load existing resource APIs instead of placeholder lists.
async function loadExternalData() {
  const results = await Promise.allSettled([fetchDppDatasets(), fetchDppFeatures(), fetchMtpAlgorithms()]);
  const targets = [datasets, features, algorithms];
  results.forEach((result, index) => {
    const target = targets[index];
    if (target) target.value = result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : [];
  });
  if (results.some((result) => result.status === 'rejected')) message.warning('部分资源暂不可用；已加载的资源仍可使用。');
}

// 暴露方法供外部调用
defineExpose({
  /** 离开页面前检查草稿与待完成保存。Check drafts and pending saves before leaving. */
  hasUnsavedChanges: () => isDirty.value || saving.value,
  finishSave,
  finishRun,
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
  background: hsl(var(--background-deep));

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
      background: hsl(var(--muted));
    }

    .vue-flow__background {
      background-color: hsl(var(--muted));
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
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
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
  background: hsl(var(--card));
  border: 2px solid hsl(var(--border));
  border-radius: 50%;

  &:hover {
    border-color: #1890ff;
    background: #1890ff;
  }
}

.vue-flow__edge-path {
  stroke: hsl(var(--border));
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
