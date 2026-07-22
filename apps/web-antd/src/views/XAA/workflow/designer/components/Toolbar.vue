<template>
  <div class="workflow-toolbar">
    <!-- 左侧工具 -->
    <div class="workflow-toolbar__left">
      <Tooltip title="指针模式 (V)">
        <Button
          :type="controlMode === 'pointer' ? 'primary' : 'text'"
          size="small"
          @click="setControlMode('pointer')"
        >
          <template #icon><SelectOutlined /></template>
        </Button>
      </Tooltip>
      <Tooltip title="拖拽模式 (H)">
        <Button
          :type="controlMode === 'hand' ? 'primary' : 'text'"
          size="small"
          @click="setControlMode('hand')"
        >
          <template #icon><DragOutlined /></template>
        </Button>
      </Tooltip>

      <Divider type="vertical" />

      <Tooltip title="撤销 (Ctrl+Z)">
        <Button type="text" size="small" :disabled="!canUndo" @click="undo">
          <template #icon><UndoOutlined /></template>
        </Button>
      </Tooltip>
      <Tooltip title="重做 (Ctrl+Y)">
        <Button type="text" size="small" :disabled="!canRedo" @click="redo">
          <template #icon><RedoOutlined /></template>
        </Button>
      </Tooltip>
    </div>

    <!-- 中间标题 -->
    <div class="workflow-toolbar__center">
      <span class="workflow-toolbar__name">{{ workflowName }}</span>
      <Tag v-if="isDirty" color="orange">未保存</Tag>
    </div>

    <!-- 右侧工具 -->
    <div class="workflow-toolbar__right">
      <!-- 缩放控制 -->
      <div class="workflow-toolbar__zoom">
        <Tooltip title="缩小">
          <Button type="text" size="small" @click="zoomOut">
            <template #icon><MinusOutlined /></template>
          </Button>
        </Tooltip>
        <Dropdown>
          <span class="workflow-toolbar__zoom-value">{{ zoomPercentage }}%</span>
          <template #overlay>
            <Menu @click="handleZoomSelect">
              <MenuItem key="25">25%</MenuItem>
              <MenuItem key="50">50%</MenuItem>
              <MenuItem key="75">75%</MenuItem>
              <MenuItem key="100">100%</MenuItem>
              <MenuItem key="125">125%</MenuItem>
              <MenuItem key="150">150%</MenuItem>
              <MenuItem key="200">200%</MenuItem>
              <MenuDivider />
              <MenuItem key="fit">适应画布</MenuItem>
            </Menu>
          </template>
        </Dropdown>
        <Tooltip title="放大">
          <Button type="text" size="small" @click="zoomIn">
            <template #icon><PlusOutlined /></template>
          </Button>
        </Tooltip>
      </div>

      <Divider type="vertical" />

      <Tooltip title="适应画布 (Ctrl+1)">
        <Button type="text" size="small" @click="fitView">
          <template #icon><ExpandOutlined /></template>
        </Button>
      </Tooltip>

      <Tooltip title="小地图">
        <Button
          :type="showMinimap ? 'primary' : 'text'"
          size="small"
          @click="toggleMinimap"
        >
          <template #icon><PicCenterOutlined /></template>
        </Button>
      </Tooltip>

      <Divider type="vertical" />

      <Button type="primary" @click="saveWorkflow" :loading="saving">
        <template #icon><SaveOutlined /></template>
        保存
      </Button>

      <Button @click="runWorkflow" :loading="running">
        <template #icon><PlayCircleOutlined /></template>
        运行
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  Button,
  Tooltip,
  Divider,
  Tag,
  Dropdown,
  Menu,
  MenuItem,
  MenuDivider,
} from 'ant-design-vue';
import {
  SelectOutlined,
  DragOutlined,
  UndoOutlined,
  RedoOutlined,
  MinusOutlined,
  PlusOutlined,
  ExpandOutlined,
  PicCenterOutlined,
  SaveOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons-vue';
import type { ControlMode } from '../types';

interface Props {
  workflowName?: string;
  controlMode: ControlMode;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
  showMinimap: boolean;
  saving?: boolean;
  running?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  workflowName: '未命名工作流',
  saving: false,
  running: false,
});

const emit = defineEmits<{
  (e: 'update:controlMode', mode: ControlMode): void;
  (e: 'update:showMinimap', show: boolean): void;
  (e: 'undo'): void;
  (e: 'redo'): void;
  (e: 'zoom-in'): void;
  (e: 'zoom-out'): void;
  (e: 'zoom-to', zoom: number): void;
  (e: 'fit-view'): void;
  (e: 'save'): void;
  (e: 'run'): void;
}>();

const zoomPercentage = computed(() => Math.round(props.zoom * 100));

function setControlMode(mode: ControlMode) {
  emit('update:controlMode', mode);
}

function undo() {
  emit('undo');
}

function redo() {
  emit('redo');
}

function zoomIn() {
  emit('zoom-in');
}

function zoomOut() {
  emit('zoom-out');
}

function fitView() {
  emit('fit-view');
}

function toggleMinimap() {
  emit('update:showMinimap', !props.showMinimap);
}

function saveWorkflow() {
  emit('save');
}

function runWorkflow() {
  emit('run');
}

function handleZoomSelect({ key }: { key: string }) {
  if (key === 'fit') {
    fitView();
  } else {
    emit('zoom-to', parseInt(key) / 100);
  }
}
</script>

<style lang="scss" scoped>
.workflow-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  background: hsl(var(--card));
  border-bottom: 1px solid hsl(var(--border));

  &__left,
  &__right {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  &__center {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__name {
    font-size: 14px;
    font-weight: 600;
    color: hsl(var(--foreground));
  }

  &__zoom {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  &__zoom-value {
    display: inline-block;
    min-width: 48px;
    text-align: center;
    font-size: 12px;
    color: hsl(var(--muted-foreground));
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;

    &:hover {
      background: hsl(var(--accent));
    }
  }
}
</style>
