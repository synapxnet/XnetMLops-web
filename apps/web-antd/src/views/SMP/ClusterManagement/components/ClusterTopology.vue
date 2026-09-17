<script setup lang="ts">
import { computed } from 'vue';
import NodeIcon3D from './NodeIcon3D.vue';
import ConnectionLine from './ConnectionLine.vue';
import type { ClusterNode, ClusterType } from '../../api/clusterManagement';

interface Props {
  clusterType: ClusterType;
  masterNodes: ClusterNode[];
  workerNodes: ClusterNode[];
}

const props = withDefaults(defineProps<Props>(), { masterNodes: () => [], workerNodes: () => [] });
const emit = defineEmits<{
  'node-click': [node: ClusterNode];
}>();

// SVG 画布尺寸
const canvasWidth = 1200;
const canvasHeight = 560;
const centerX = canvasWidth / 2;
const centerY = canvasHeight / 2;

// 计算拓扑布局
const topologyLayout = computed(() => {
  const masterCount = props.masterNodes.length;
  const workerCount = props.workerNodes.length;

  // Master 节点布局（上方居中）
  const masters = props.masterNodes.map((node, index) => {
    let x = centerX;
    if (masterCount > 1) {
      const spacing = 280;
      x = centerX + (index - (masterCount - 1) / 2) * spacing;
    }
    return {
      ...node,
      x,
      y: centerY - 120,
    };
  });

  // Worker 节点布局（弧形分布在下方）
  const baseRadius = 220;
  const radius = Math.max(baseRadius, baseRadius + Math.max(0, workerCount - 4) * 30);

  const workers = props.workerNodes.map((node, index) => {
    const totalAngle = Math.PI * 0.75;
    const startAngle = Math.PI * 0.125;
    const angleStep = workerCount > 1 ? totalAngle / (workerCount - 1) : 0;
    const angle = startAngle + angleStep * index;

    return {
      ...node,
      x: centerX + radius * Math.cos(angle) * 1.3,
      y: centerY + 60 + radius * Math.sin(angle) * 0.55,
    };
  });

  return { masters, workers };
});

function handleNodeClick(node: ClusterNode) {
  emit('node-click', node);
}

function getMasterPosition(masterId?: number) {
  if (!masterId && topologyLayout.value.masters.length === 1) {
    return topologyLayout.value.masters[0];
  }
  const master = topologyLayout.value.masters.find(m => m.id === masterId);
  return master;
}

/** 只绘制已解析的真实关联，孤立Worker保留节点而不伪造连线。Draw resolved relationships while keeping orphan workers visible without invented edges. */
const connections = computed(() => topologyLayout.value.workers.flatMap((worker) => {
  const from = getMasterPosition(worker.masterId);
  return from ? [{ worker, from }] : [];
}));
</script>

<template>
  <div class="cluster-topology">
    <!-- 装饰背景 -->
    <div class="bg-decoration">
      <div class="circle circle-1"></div>
      <div class="circle circle-2"></div>
      <div class="circle circle-3"></div>
    </div>

    <svg
      class="topology-canvas"
      :viewBox="`0 0 ${canvasWidth} ${canvasHeight}`"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <!-- 网格图案 -->
        <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(102, 126, 234, 0.06)" stroke-width="1"/>
        </pattern>

        <!-- 点阵图案 -->
        <pattern id="dots" width="30" height="30" patternUnits="userSpaceOnUse">
          <circle cx="15" cy="15" r="1" fill="rgba(102, 126, 234, 0.1)"/>
        </pattern>

        <!-- 中心渐变 -->
        <radialGradient id="centerGlow" cx="50%" cy="45%" r="45%">
          <stop offset="0%" stop-color="rgba(102, 126, 234, 0.08)" />
          <stop offset="50%" stop-color="rgba(102, 126, 234, 0.03)" />
          <stop offset="100%" stop-color="rgba(102, 126, 234, 0)" />
        </radialGradient>

        <!-- 连接线发光 -->
        <filter id="line-glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <!-- 背景层 -->
      <rect width="100%" height="100%" fill="url(#grid)" />
      <rect width="100%" height="100%" fill="url(#dots)" />
      <ellipse cx="50%" cy="45%" rx="500" ry="300" fill="url(#centerGlow)" />

      <!-- 装饰圆环 -->
      <circle cx="50%" cy="45%" r="200" fill="none" stroke="rgba(102, 126, 234, 0.05)" stroke-width="1" stroke-dasharray="8 4"/>
      <circle cx="50%" cy="45%" r="320" fill="none" stroke="rgba(102, 126, 234, 0.03)" stroke-width="1" stroke-dasharray="4 8"/>

      <!-- 连接线 -->
      <g class="connections" filter="url(#line-glow)">
        <ConnectionLine
          v-for="connection in connections"
          :key="`line-${connection.worker.id}`"
          :from="connection.from"
          :to="connection.worker"
          :status="connection.worker.status"
        />
      </g>

      <!-- Master 节点 -->
      <g class="master-nodes">
        <NodeIcon3D
          v-for="master in topologyLayout.masters"
          :key="`master-${master.id}`"
          :node="master"
          :x="master.x"
          :y="master.y"
          node-type="master"
          :cluster-type="clusterType"
          @click="handleNodeClick"
        />
      </g>

      <!-- Worker 节点 -->
      <g class="worker-nodes">
        <NodeIcon3D
          v-for="worker in topologyLayout.workers"
          :key="`worker-${worker.id}`"
          :node="worker"
          :x="worker.x"
          :y="worker.y"
          node-type="worker"
          :cluster-type="clusterType"
          @click="handleNodeClick"
        />
      </g>

      <!-- 空状态 -->
      <g v-if="masterNodes.length === 0 && workerNodes.length === 0" class="empty-state">
        <!-- 空状态图标 -->
        <g :transform="`translate(${centerX}, ${centerY - 40})`">
          <circle r="50" fill="rgba(102, 126, 234, 0.08)" />
          <circle r="35" fill="rgba(102, 126, 234, 0.05)" />
          <path
            d="M -15 -5 L 0 -20 L 15 -5 M 0 -20 L 0 15 M -20 15 L 20 15"
            fill="none"
            stroke="rgba(102, 126, 234, 0.4)"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </g>
        <text :x="centerX" :y="centerY + 30" text-anchor="middle" class="empty-title">
          暂无集群节点
        </text>
        <text :x="centerX" :y="centerY + 55" text-anchor="middle" class="empty-hint">
          点击上方「添加 Master」按钮创建集群
        </text>
      </g>
    </svg>

    <!-- 图例 -->
    <div class="topology-legend">
      <div class="legend-item">
        <span class="legend-dot running"></span>
        <span class="legend-text">运行中</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot deployed"></span>
        <span class="legend-text">已部署</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot stopped"></span>
        <span class="legend-text">已停止</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot failed"></span>
        <span class="legend-text">异常</span>
      </div>
    </div>

    <!-- 集群类型标识 -->
    <div class="cluster-type-badge" :class="clusterType">
      <span class="badge-icon">
        <svg v-if="clusterType === 'hadoop'" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <circle cx="12" cy="12" r="10"/>
        </svg>
      </span>
      <span class="badge-text">{{ clusterType.toUpperCase() }}</span>
    </div>
  </div>
</template>

<style scoped>
.cluster-topology {
  position: relative;
  width: 100%;
  min-height: 560px;
  background: linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--background)) 50%, hsl(var(--primary) / 6%) 100%);
  border-radius: 0 0 16px 16px;
  overflow: hidden;
}

/* 装饰背景 */
.bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
}

.circle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(102, 126, 234, 0.06) 0%, transparent 70%);
}

.circle-1 {
  width: 400px;
  height: 400px;
  top: -100px;
  right: -100px;
}

.circle-2 {
  width: 300px;
  height: 300px;
  bottom: -50px;
  left: -50px;
}

.circle-3 {
  width: 200px;
  height: 200px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.topology-canvas {
  width: 100%;
  height: 560px;
  position: relative;
  z-index: 1;
}

.empty-title {
  font-size: 18px;
  fill: hsl(var(--foreground));
  font-weight: 500;
}

.empty-hint {
  font-size: 14px;
  fill: hsl(var(--muted-foreground));
}

/* 图例 */
.topology-legend {
  position: absolute;
  bottom: 24px;
  right: 24px;
  display: flex;
  gap: 20px;
  padding: 14px 24px;
  background: hsl(var(--card) / 95%);
  border-radius: 14px;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.1);
  border: 1px solid hsl(var(--border));
  backdrop-filter: blur(10px);
  z-index: 10;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  position: relative;
}

.legend-dot.running {
  background: #52c41a;
  box-shadow: 0 0 8px rgba(82, 196, 26, 0.5);
}

.legend-dot.running::after {
  content: '';
  position: absolute;
  top: -3px;
  left: -3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid #52c41a;
  animation: pulse 2s infinite;
}

.legend-dot.deployed {
  background: #1890ff;
}

.legend-dot.stopped {
  background: #faad14;
}

.legend-dot.failed {
  background: #ff4d4f;
}

.legend-text {
  font-size: 13px;
  color: hsl(var(--foreground));
  font-weight: 500;
}

/* 集群类型标识 */
.cluster-type-badge {
  position: absolute;
  top: 24px;
  left: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: hsl(var(--card) / 95%);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  border: 1px solid hsl(var(--border));
  z-index: 10;
}

.cluster-type-badge.hadoop {
  border-left: 3px solid #ff9800;
}

.cluster-type-badge.jenkins {
  border-left: 3px solid #ef5350;
}

.cluster-type-badge.redis {
  border-left: 3px solid #e91e63;
}

.cluster-type-badge.mysql {
  border-left: 3px solid #00bcd4;
}

.cluster-type-badge.spark {
  border-left: 3px solid #ff5722;
}

.badge-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #667eea;
}

.badge-text {
  font-size: 13px;
  font-weight: 700;
  color: hsl(var(--foreground));
  letter-spacing: 1px;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.3);
    opacity: 0;
  }
}
</style>
