<template>
  <div
    class="node-preview"
    :style="{ borderColor: metadata?.color }"
  >
    <div class="node-preview__content">
      <div class="node-preview__icon" :style="{ backgroundColor: metadata?.color }">
        <component :is="getIcon(metadata?.icon)" />
      </div>
      <div class="node-preview__title">
        {{ metadata?.title }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
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
} from '@ant-design/icons-vue';
import { NODE_METADATA } from '../constants';
import type { NodeType, NodeMetadata } from '../types';

interface Props {
  nodeType: NodeType;
}

const props = defineProps<Props>();

const metadata = computed<NodeMetadata | undefined>(() => NODE_METADATA[props.nodeType]);

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
.node-preview {
  min-width: 160px;
  background: hsl(var(--card));
  border: 2px solid hsl(var(--border));
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  pointer-events: none;

  &__content {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
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

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: hsl(var(--foreground));
  }
}
</style>
