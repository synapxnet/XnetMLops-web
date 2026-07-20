<script setup lang="ts">
import { computed } from 'vue';
import type { NodeStatus } from '../../api/clusterManagement';
import { getStatusColor } from '../../api/clusterManagement';

interface NodePosition {
  x: number;
  y: number;
}

interface Props {
  from: NodePosition;
  to: NodePosition;
  status?: NodeStatus;
}

const props = defineProps<Props>();

const lineColor = computed(() => getStatusColor(props.status));
const isRunning = computed(() => props.status === 'running');
const isDeploying = computed(() => props.status === 'deploying');

// 贝塞尔曲线路径
const pathD = computed(() => {
  const { from, to } = props;

  // 计算控制点，创建平滑的 S 型曲线
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  const cp1x = from.x;
  const cp1y = from.y + dy * 0.4;
  const cp2x = to.x;
  const cp2y = to.y - dy * 0.2;

  return `M ${from.x} ${from.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.x} ${to.y}`;
});

const lineId = computed(() => `conn-${props.from.x.toFixed(0)}-${props.to.x.toFixed(0)}`);
</script>

<template>
  <g class="connection-line">
    <defs>
      <!-- 渐变 -->
      <linearGradient :id="`grad-${lineId}`" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="rgba(102, 126, 234, 0.5)" />
        <stop offset="50%" :stop-color="lineColor" stop-opacity="0.6" />
        <stop offset="100%" :stop-color="lineColor" stop-opacity="0.4" />
      </linearGradient>

      <!-- 流动渐变（用于动画） -->
      <linearGradient :id="`flow-grad-${lineId}`" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="transparent">
          <animate attributeName="offset" values="-0.3;1" dur="2s" repeatCount="indefinite"/>
        </stop>
        <stop offset="10%" :stop-color="lineColor">
          <animate attributeName="offset" values="-0.2;1.1" dur="2s" repeatCount="indefinite"/>
        </stop>
        <stop offset="20%" stop-color="transparent">
          <animate attributeName="offset" values="-0.1;1.2" dur="2s" repeatCount="indefinite"/>
        </stop>
      </linearGradient>
    </defs>

    <!-- 外层光晕 -->
    <path
      :d="pathD"
      fill="none"
      stroke="rgba(102, 126, 234, 0.08)"
      stroke-width="12"
      stroke-linecap="round"
    />

    <!-- 中层光晕 -->
    <path
      :d="pathD"
      fill="none"
      stroke="rgba(102, 126, 234, 0.12)"
      stroke-width="6"
      stroke-linecap="round"
    />

    <!-- 主线条 -->
    <path
      :d="pathD"
      fill="none"
      :stroke="`url(#grad-${lineId})`"
      stroke-width="2.5"
      stroke-linecap="round"
      :stroke-dasharray="isDeploying ? '10,6' : 'none'"
      :class="{ deploying: isDeploying }"
    />

    <!-- 流动效果线（运行状态） -->
    <path
      v-if="isRunning"
      :d="pathD"
      fill="none"
      :stroke="`url(#flow-grad-${lineId})`"
      stroke-width="3"
      stroke-linecap="round"
    />

    <!-- 起点装饰 -->
    <circle :cx="from.x" :cy="from.y" r="4" fill="rgba(102, 126, 234, 0.3)"/>
    <circle :cx="from.x" :cy="from.y" r="2" fill="#667eea"/>

    <!-- 终点装饰 -->
    <circle :cx="to.x" :cy="to.y" r="4" :fill="lineColor" opacity="0.3"/>
    <circle :cx="to.x" :cy="to.y" r="2" :fill="lineColor"/>

    <!-- 数据流动点（运行状态） -->
    <g v-if="isRunning" class="flow-dots">
      <circle r="5" fill="rgba(255,255,255,0.9)" filter="url(#glow)">
        <animateMotion :path="pathD" dur="2.5s" repeatCount="indefinite"/>
      </circle>
      <circle r="3" :fill="lineColor">
        <animateMotion :path="pathD" dur="2.5s" repeatCount="indefinite"/>
      </circle>
    </g>
  </g>
</template>

<style scoped>
.connection-line {
  pointer-events: none;
}

.deploying {
  animation: dash 1.5s linear infinite;
}

@keyframes dash {
  to {
    stroke-dashoffset: -32;
  }
}

.flow-dots circle {
  filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.8));
}
</style>
