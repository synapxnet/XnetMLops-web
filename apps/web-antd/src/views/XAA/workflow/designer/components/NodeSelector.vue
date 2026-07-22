<template>
  <div class="node-selector">
    <div class="node-selector__header">
      <span class="node-selector__title">添加节点</span>
      <Input
        v-model:value="searchKeyword"
        placeholder="搜索节点..."
        size="small"
        allow-clear
      >
        <template #prefix>
          <SearchOutlined />
        </template>
      </Input>
    </div>

    <div class="node-selector__content">
      <Collapse v-model:activeKey="activeKeys" ghost>
        <CollapsePanel
          v-for="category in filteredCategories"
          :key="category.key"
          :header="category.title"
        >
          <div class="node-selector__grid">
            <div
              v-for="nodeType in category.nodes"
              :key="nodeType"
              class="node-selector__item"
              draggable="true"
              @dragstart="onDragStart($event, nodeType)"
              @click="onNodeClick(nodeType)"
            >
              <div
                class="node-selector__icon"
                :style="{ backgroundColor: getNodeMeta(nodeType)?.color }"
              >
                <component :is="getIcon(getNodeMeta(nodeType)?.icon)" />
              </div>
              <div class="node-selector__info">
                <div class="node-selector__name">
                  {{ getNodeMeta(nodeType)?.title }}
                </div>
                <div class="node-selector__desc">
                  {{ getNodeMeta(nodeType)?.description }}
                </div>
              </div>
            </div>
          </div>
        </CollapsePanel>
      </Collapse>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Input, Collapse, CollapsePanel } from 'ant-design-vue';
import { SearchOutlined } from '@ant-design/icons-vue';
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
import { NODE_METADATA, NODE_CLASSIFICATIONS } from '../constants';
import type { NodeType } from '../types';

const emit = defineEmits<{
  (e: 'add-node', nodeType: NodeType): void;
  (e: 'drag-start', event: DragEvent, nodeType: NodeType): void;
}>();

const searchKeyword = ref('');
const activeKeys = ref(['basic', 'data-process', 'model-train', 'model-deploy', 'logic', 'tool']);

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

function getNodeMeta(nodeType: NodeType) {
  return NODE_METADATA[nodeType];
}

const filteredCategories = computed(() => {
  const keyword = searchKeyword.value.toLowerCase();
  if (!keyword) return NODE_CLASSIFICATIONS;

  return NODE_CLASSIFICATIONS.map((category) => ({
    ...category,
    nodes: category.nodes.filter((nodeType) => {
      const meta = NODE_METADATA[nodeType];
      return (
        meta.title.toLowerCase().includes(keyword) ||
        meta.description.toLowerCase().includes(keyword)
      );
    }),
  })).filter((category) => category.nodes.length > 0);
});

function onDragStart(event: DragEvent, nodeType: NodeType) {
  if (event.dataTransfer) {
    event.dataTransfer.setData('application/xaa-node', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }
  emit('drag-start', event, nodeType);
}

function onNodeClick(nodeType: NodeType) {
  emit('add-node', nodeType);
}
</script>

<style lang="scss" scoped>
.node-selector {
  width: 280px;
  height: 100%;
  background: hsl(var(--card));
  border-right: 1px solid hsl(var(--border));
  display: flex;
  flex-direction: column;

  &__header {
    padding: 16px;
    border-bottom: 1px solid hsl(var(--border));
  }

  &__title {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: hsl(var(--foreground));
    margin-bottom: 12px;
  }

  &__content {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }

  &__grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: hsl(var(--accent));
    border: 1px solid hsl(var(--border));
    border-radius: 8px;
    cursor: grab;
    transition: all 0.2s ease;

    &:hover {
      background: hsl(var(--accent));
      border-color: hsl(var(--border));
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    &:active {
      cursor: grabbing;
    }
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    color: #fff;
    font-size: 18px;
    flex-shrink: 0;
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__name {
    font-size: 13px;
    font-weight: 500;
    color: hsl(var(--foreground));
  }

  &__desc {
    font-size: 11px;
    color: hsl(var(--muted-foreground));
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

:deep(.ant-collapse-header) {
  padding: 8px 16px !important;
  font-size: 12px;
  font-weight: 600;
  color: hsl(var(--muted-foreground));
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

:deep(.ant-collapse-content-box) {
  padding: 0 12px 12px !important;
}
</style>
