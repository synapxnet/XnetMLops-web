<script setup lang="ts">
import { computed } from 'vue';
import { Tooltip } from 'ant-design-vue';
import { registeredClusterTypes, type ClusterType } from '../../api/clusterManagement';

interface Props {
  value: ClusterType;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  change: [type: ClusterType];
}>();

const enabledTypes = computed(() => registeredClusterTypes.filter(t => t.enabled));
const disabledTypes = computed(() => registeredClusterTypes.filter(t => !t.enabled));

// 获取图标
function getIcon(type: ClusterType): string {
  const icons: Record<ClusterType, string> = {
    hadoop: '🐘',
    jenkins: '🔧',
    redis: '🔴',
    mysql: '🐬',
    spark: '⚡',
  };
  return icons[type] || '📦';
}

function handleSelect(type: ClusterType) {
  if (type !== props.value) {
    emit('change', type);
  }
}
</script>

<template>
  <div class="cluster-type-selector">
    <!-- 已启用的集群类型 -->
    <div
      v-for="item in enabledTypes"
      :key="item.type"
      class="type-item"
      :class="{ active: item.type === value }"
      :style="{ '--theme-color': item.color }"
      @click="handleSelect(item.type)"
    >
      <span class="item-icon">{{ getIcon(item.type) }}</span>
      <span class="item-name">{{ item.name }}</span>
    </div>

    <!-- 分隔线 -->
    <div class="separator" v-if="disabledTypes.length > 0"></div>

    <!-- 未启用的集群类型 -->
    <Tooltip v-for="item in disabledTypes" :key="item.type" title="即将支持">
      <div class="type-item disabled">
        <span class="item-icon">{{ getIcon(item.type) }}</span>
        <span class="item-name">{{ item.name }}</span>
      </div>
    </Tooltip>
  </div>
</template>

<style scoped>
.cluster-type-selector {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 4px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(4px);
}

.type-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  font-weight: 500;
}

.type-item:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.type-item.active {
  background: var(--theme-color);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 0 10px var(--theme-color);
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

.type-item.disabled {
  cursor: not-allowed;
  opacity: 0.3;
}

.item-icon {
  font-size: 16px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}

.item-name {
  font-weight: 500;
  letter-spacing: 0.5px;
}

.separator {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 4px;
}
</style>
