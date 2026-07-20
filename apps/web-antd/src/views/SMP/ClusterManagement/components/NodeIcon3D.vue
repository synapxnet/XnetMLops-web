<script setup lang="ts">
import { computed } from 'vue';
import type { ClusterNode, ClusterType, NodeRole } from '../../api/clusterManagement';
import { getStatusColor } from '../../api/clusterManagement';

interface Props {
  node: ClusterNode;
  x: number;
  y: number;
  nodeType: NodeRole;
  clusterType: ClusterType;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  click: [node: ClusterNode];
}>();

// 主题色配置
const themeColors = computed(() => {
  const colorMap: Record<ClusterType, { primary: string; gradient: string; light: string }> = {
    hadoop: { primary: '#ff9800', gradient: 'url(#grad-hadoop)', light: '#fff3e0' },
    jenkins: { primary: '#ef5350', gradient: 'url(#grad-jenkins)', light: '#ffebee' },
    redis: { primary: '#e91e63', gradient: 'url(#grad-redis)', light: '#fce4ec' },
    mysql: { primary: '#00bcd4', gradient: 'url(#grad-mysql)', light: '#e0f7fa' },
    spark: { primary: '#ff5722', gradient: 'url(#grad-spark)', light: '#fbe9e7' },
  };
  return colorMap[props.clusterType] || colorMap.hadoop;
});

// 角色配置
const roleConfig = computed(() => {
  return props.nodeType === 'master'
    ? { color: '#722ed1', bgGradient: 'url(#grad-master)', label: 'MASTER', icon: 'M' }
    : { color: '#1890ff', bgGradient: 'url(#grad-worker)', label: 'WORKER', icon: 'W' };
});

const statusColor = computed(() => getStatusColor(props.node.status));
const isRunning = computed(() => props.node.status === 'running');
const isStopped = computed(() => props.node.status === 'stopped');
const isFailed = computed(() => props.node.status === 'failed');

// 状态文本
const statusText = computed(() => {
  const map: Record<string, string> = {
    running: '运行中',
    deployed: '已部署',
    deploying: '部署中',
    stopped: '已停止',
    failed: '异常',
  };
  return map[props.node.status] || props.node.status;
});

function handleClick() {
  emit('click', props.node);
}
</script>

<template>
  <g
    class="node-card"
    :transform="`translate(${x - 80}, ${y - 60})`"
    @click="handleClick"
  >
    <defs>
      <!-- 渐变定义 -->
      <linearGradient id="grad-master" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#9254de" />
        <stop offset="100%" stop-color="#722ed1" />
      </linearGradient>
      <linearGradient id="grad-worker" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#40a9ff" />
        <stop offset="100%" stop-color="#1890ff" />
      </linearGradient>
      <linearGradient id="grad-hadoop" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#ffb74d" />
        <stop offset="100%" stop-color="#ff9800" />
      </linearGradient>
      <linearGradient id="grad-jenkins" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#ef5350" />
        <stop offset="100%" stop-color="#d32f2f" />
      </linearGradient>

      <!-- 卡片阴影 -->
      <filter :id="`shadow-${node.id}`" x="-30%" y="-30%" width="160%" height="180%">
        <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#1a365d" flood-opacity="0.15"/>
      </filter>

      <!-- 悬停阴影 -->
      <filter :id="`shadow-hover-${node.id}`" x="-30%" y="-30%" width="160%" height="180%">
        <feDropShadow dx="0" dy="10" stdDeviation="15" flood-color="#667eea" flood-opacity="0.25"/>
      </filter>

      <!-- 内发光 -->
      <filter :id="`inner-glow-${node.id}`">
        <feFlood :flood-color="themeColors.primary" flood-opacity="0.1"/>
        <feComposite in2="SourceGraphic" operator="in"/>
        <feGaussianBlur stdDeviation="3"/>
        <feComposite in2="SourceGraphic" operator="atop"/>
      </filter>
    </defs>

    <!-- 悬停光晕效果 -->
    <rect
      x="-4" y="-4" width="168" height="128" rx="18"
      fill="none"
      :stroke="roleConfig.color"
      stroke-width="2"
      class="hover-glow"
      opacity="0"
    />

    <!-- 底部装饰阴影 -->
    <ellipse cx="80" cy="125" rx="50" ry="6" fill="rgba(0,0,0,0.08)" class="card-shadow"/>

    <!-- 主卡片 -->
    <rect
      x="0" y="0" width="160" height="120" rx="16"
      fill="#fff"
      :filter="`url(#shadow-${node.id})`"
      class="card-bg"
    />

    <!-- 顶部渐变装饰条 -->
    <rect x="0" y="0" width="160" height="6" rx="16" :fill="themeColors.gradient" />
    <rect x="0" y="0" width="160" height="3" fill="rgba(255,255,255,0.4)" rx="16" />

    <!-- 左侧角色徽章 -->
    <g transform="translate(12, 18)">
      <!-- 徽章背景 -->
      <rect x="0" y="0" width="48" height="48" rx="12" :fill="roleConfig.bgGradient" />
      <!-- 图标 -->
      <text x="24" y="32" text-anchor="middle" class="role-icon">
        {{ roleConfig.icon }}
      </text>
      <!-- 角色标签 -->
      <rect x="0" y="52" width="48" height="16" rx="8" :fill="roleConfig.color" opacity="0.15"/>
      <text x="24" y="64" text-anchor="middle" class="role-label-small">
        {{ roleConfig.label }}
      </text>
    </g>

    <!-- 右侧信息区 -->
    <g transform="translate(70, 20)">
      <!-- 节点名称 -->
      <text x="0" y="12" class="node-name">
        {{ node.name.length > 10 ? node.name.substring(0, 10) + '..' : node.name }}
      </text>

      <!-- IP 地址 -->
      <text x="0" y="30" class="node-ip">
        {{ node.host }}
      </text>

      <!-- 状态标签 -->
      <g transform="translate(0, 40)">
        <rect
          x="0" y="0" width="70" height="22" rx="11"
          :fill="statusColor"
          opacity="0.15"
        />
        <circle cx="12" cy="11" r="4" :fill="statusColor">
          <animate
            v-if="isRunning"
            attributeName="opacity"
            values="1;0.4;1"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
        <text x="22" y="15" class="status-text" :fill="statusColor">
          {{ statusText }}
        </text>
      </g>
    </g>

    <!-- 底部装饰线 -->
    <line x1="12" y1="100" x2="148" y2="100" stroke="#f0f0f0" stroke-width="1"/>

    <!-- 底部操作提示 -->
    <g transform="translate(80, 110)">
      <text x="0" y="0" text-anchor="middle" class="click-hint">点击查看详情</text>
    </g>

    <!-- 运行状态脉冲效果 -->
    <g v-if="isRunning" transform="translate(148, 12)">
      <circle r="4" :fill="statusColor">
        <animate
          attributeName="opacity"
          values="1;0.3;1"
          dur="1.5s"
          repeatCount="indefinite"
        />
      </circle>
      <circle r="4" fill="none" :stroke="statusColor" stroke-width="1">
        <animate attributeName="r" values="4;10;4" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.6;0;0.6" dur="1.5s" repeatCount="indefinite"/>
      </circle>
    </g>

    <!-- 异常状态警告图标 -->
    <g v-if="isFailed" transform="translate(148, 12)">
      <circle r="8" fill="#ff4d4f" opacity="0.2"/>
      <text x="0" y="4" text-anchor="middle" class="warning-icon">!</text>
    </g>

    <!-- 停止状态图标 -->
    <g v-if="isStopped" transform="translate(148, 12)">
      <circle r="6" fill="#faad14" opacity="0.3"/>
      <rect x="-3" y="-3" width="6" height="6" rx="1" fill="#faad14"/>
    </g>
  </g>
</template>

<style scoped>
.node-card {
  cursor: pointer;
}

.node-card .hover-glow {
  transition: opacity 0.25s ease;
}

.node-card .card-shadow {
  transition: all 0.25s ease;
}

.node-card:hover .hover-glow {
  opacity: 1;
}

.node-card:hover .card-shadow {
  rx: 55;
  ry: 8;
}

.node-card:hover .click-hint {
  opacity: 1;
}

.role-icon {
  font-size: 22px;
  fill: #fff;
  font-weight: 700;
  font-family: 'SF Pro Display', -apple-system, sans-serif;
}

.role-label-small {
  font-size: 8px;
  fill: currentColor;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.node-name {
  font-size: 14px;
  fill: #1a202c;
  font-weight: 600;
}

.node-ip {
  font-size: 11px;
  fill: #718096;
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
}

.status-text {
  font-size: 11px;
  font-weight: 500;
}

.click-hint {
  font-size: 10px;
  fill: #a0aec0;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.warning-icon {
  font-size: 12px;
  fill: #ff4d4f;
  font-weight: 700;
}
</style>
