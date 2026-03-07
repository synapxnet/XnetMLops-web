<template>
  <div
    :class="[
      'workflow-node',
      `workflow-node--${nodeType}`,
      { 'workflow-node--selected': selected },
      { 'workflow-node--running': running },
      { 'workflow-node--success': status === 'succeeded' },
      { 'workflow-node--failed': status === 'failed' },
    ]"
    :style="nodeStyle"
  >
    <!-- 输入连接点 -->
    <Handle
      v-if="showTargetHandle"
      type="target"
      :position="Position.Left"
      :style="handleStyle"
    />

    <!-- 节点内容 -->
    <div class="workflow-node__content">
      <!-- 节点头部 -->
      <div class="workflow-node__header">
        <div class="workflow-node__icon" :style="{ backgroundColor: metadata?.color }">
          <component :is="getIcon(metadata?.icon)" />
        </div>
        <div class="workflow-node__title-wrapper">
          <div class="workflow-node__title">{{ data.title || metadata?.title }}</div>
          <div v-if="data.description" class="workflow-node__description">
            {{ data.description }}
          </div>
        </div>
        <div v-if="running" class="workflow-node__status">
          <LoadingOutlined spin />
        </div>
        <div v-else-if="status === 'succeeded'" class="workflow-node__status workflow-node__status--success">
          <CheckCircleOutlined />
        </div>
        <div v-else-if="status === 'failed'" class="workflow-node__status workflow-node__status--failed">
          <CloseCircleOutlined />
        </div>
      </div>

      <!-- 节点主体 - 插槽 -->
      <div v-if="$slots.default" class="workflow-node__body">
        <slot />
      </div>
    </div>

    <!-- 输出连接点 -->
    <Handle
      v-if="showSourceHandle"
      type="source"
      :position="Position.Right"
      :style="handleStyle"
    />

    <!-- 多输出连接点 (用于条件分支等) -->
    <template v-if="sourceHandles && sourceHandles.length > 0">
      <Handle
        v-for="(handle, index) in sourceHandles"
        :key="handle.id"
        type="source"
        :id="handle.id"
        :position="Position.Right"
        :style="{
          ...handleStyle,
          top: `${(index + 1) * (100 / (sourceHandles.length + 1))}%`,
        }"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Handle, Position } from '@vue-flow/core';
import {
  PlayCircleOutlined,
  StopOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  ThunderboltOutlined,
  RobotOutlined,
  RocketOutlined,
  CrownOutlined,
  CloudUploadOutlined,
  ApiOutlined,
  BranchesOutlined,
  SyncOutlined,
  ApartmentOutlined,
  GlobalOutlined,
  CodeOutlined,
  EditOutlined,
  FileTextOutlined,
  HourglassOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons-vue';
import { NODE_METADATA } from '../constants';
import type { NodeData, NodeMetadata, ExecutionStatus } from '../types';
import { NodeType } from '../types';

interface Props {
  id: string;
  data: NodeData;
  selected?: boolean;
}

const props = defineProps<Props>();

const nodeType = computed(() => props.data.type);
const metadata = computed<NodeMetadata | undefined>(() => NODE_METADATA[props.data.type]);
const running = computed(() => props.data.running);
const status = computed<ExecutionStatus | undefined>(() => props.data.status);

const showTargetHandle = computed(() => {
  const meta = metadata.value;
  if (!meta) return true;
  return meta.minInputs !== 0;
});

const showSourceHandle = computed(() => {
  const meta = metadata.value;
  if (!meta) return true;
  if (props.data.type === NodeType.IfElse) return false; // IfElse 使用多输出
  return meta.minOutputs !== 0;
});

const sourceHandles = computed(() => {
  if (props.data.type === NodeType.IfElse) {
    const config = props.data.config as any;
    const handles = [
      ...(config?.cases || []).map((c: any) => ({ id: c.caseId, label: c.name })),
      { id: 'else', label: 'ELSE' },
    ];
    return handles;
  }
  return null;
});

const nodeStyle = computed(() => ({
  borderColor: props.selected ? metadata.value?.color : undefined,
  boxShadow: props.selected ? `0 0 0 2px ${metadata.value?.color}40` : undefined,
}));

const handleStyle = {
  width: '12px',
  height: '12px',
  background: '#fff',
  border: '2px solid #b1b1b7',
};

const iconMap: Record<string, any> = {
  'play-circle': PlayCircleOutlined,
  'stop-circle': StopOutlined,
  database: DatabaseOutlined,
  experiment: ExperimentOutlined,
  thunderbolt: ThunderboltOutlined,
  robot: RobotOutlined,
  rocket: RocketOutlined,
  crown: CrownOutlined,
  'cloud-upload': CloudUploadOutlined,
  api: ApiOutlined,
  branches: BranchesOutlined,
  sync: SyncOutlined,
  apartment: ApartmentOutlined,
  global: GlobalOutlined,
  code: CodeOutlined,
  edit: EditOutlined,
  'file-text': FileTextOutlined,
  hourglass: HourglassOutlined,
};

function getIcon(iconName?: string) {
  if (!iconName) return null;
  return iconMap[iconName] || null;
}
</script>

<style lang="scss" scoped>
.workflow-node {
  min-width: 200px;
  background: #fff;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  &:hover {
    border-color: #d1d5db;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }

  &--selected {
    border-width: 2px;
  }

  &--running {
    border-color: #1890ff;
    animation: pulse 1.5s ease-in-out infinite;
  }

  &--success {
    border-color: #52c41a;
  }

  &--failed {
    border-color: #ff4d4f;
  }

  &__content {
    padding: 12px;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    color: #fff;
    font-size: 16px;
    flex-shrink: 0;
  }

  &__title-wrapper {
    flex: 1;
    min-width: 0;
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: #1f2937;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__description {
    font-size: 12px;
    color: #6b7280;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 2px;
  }

  &__status {
    font-size: 16px;
    color: #1890ff;

    &--success {
      color: #52c41a;
    }

    &--failed {
      color: #ff4d4f;
    }
  }

  &__body {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #f0f0f0;
  }
}

@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(24, 144, 255, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(24, 144, 255, 0);
  }
}

// 特殊节点样式
.workflow-node--start,
.workflow-node--end {
  min-width: 100px;

  .workflow-node__content {
    padding: 8px 12px;
  }

  .workflow-node__title-wrapper {
    text-align: center;
  }

  .workflow-node__icon {
    display: none;
  }
}

.workflow-node--start {
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
  border-color: #52c41a;

  .workflow-node__title {
    color: #fff;
  }
}

.workflow-node--end {
  background: linear-gradient(135deg, #ff7875 0%, #ff4d4f 100%);
  border-color: #ff4d4f;

  .workflow-node__title {
    color: #fff;
  }
}
</style>
