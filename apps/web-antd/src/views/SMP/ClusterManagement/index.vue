<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { Button, Space, Spin, message, Tooltip } from 'ant-design-vue';
import {
  ReloadOutlined,
  PlusOutlined,
  SyncOutlined,
  CloudServerOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons-vue';
import { useRouter } from 'vue-router';

import ClusterTopology from './components/ClusterTopology.vue';
import ClusterTypeSelector from './components/ClusterTypeSelector.vue';
import NodeDetailDrawer from './components/NodeDetailDrawer.vue';

import {
  getClusterTopology,
  syncHostsToCluster,
  type ClusterType,
  type ClusterTopology as IClusterTopology,
  type ClusterNode,
} from '../api/clusterManagement';

const router = useRouter();

// 当前选中的集群类型
const activeClusterType = ref<ClusterType>('hadoop');

// 加载状态
const loading = ref(false);
const syncing = ref(false);

// 拓扑数据
const topologyData = ref<IClusterTopology | null>(null);

// 节点详情抽屉
const detailDrawerVisible = ref(false);
const selectedNode = ref<ClusterNode | null>(null);

// 加载集群拓扑
async function loadTopology() {
  loading.value = true;
  try {
    topologyData.value = await getClusterTopology(activeClusterType.value);
  } catch (error) {
    console.error('加载拓扑失败:', error);
    message.error('加载集群拓扑失败');
  } finally {
    loading.value = false;
  }
}

// 切换集群类型
function handleClusterTypeChange(type: ClusterType) {
  activeClusterType.value = type;
}

// 节点点击事件
function handleNodeClick(node: ClusterNode) {
  selectedNode.value = node;
  detailDrawerVisible.value = true;
}

// 刷新数据
function handleRefresh() {
  loadTopology();
}

// 手动触发 Hosts 同步
async function handleSyncHosts() {
  if (!topologyData.value?.masters?.length) {
    message.warning('没有 Master 节点');
    return;
  }

  syncing.value = true;
  try {
    const masterId = topologyData.value.masters[0]!.id;
    const result = await syncHostsToCluster({
      clusterType: activeClusterType.value,
      masterId,
    });

    if (result.success) {
      message.success(`Hosts 同步完成，成功同步 ${result.syncedNodes} 个节点`);
    } else {
      message.warning(result.message || '同步失败');
    }
  } catch (error) {
    message.error('Hosts 同步失败');
  } finally {
    syncing.value = false;
  }
}

// 跳转到部署页面
function goToDeploy(nodeType: 'master' | 'node') {
  const routeMap: Record<ClusterType, Record<string, string>> = {
    hadoop: {
      master: '/SMP/HadoopDeployment/DeployMaster',
      node: '/SMP/HadoopDeployment/DeployNode',
    },
    jenkins: {
      master: '/SMP/JenkinsDeployment/DeployMaster',
      node: '/SMP/JenkinsDeployment/DeployNode',
    },
    redis: { master: '', node: '' },
    mysql: { master: '', node: '' },
    spark: { master: '', node: '' },
  };

  const path = routeMap[activeClusterType.value]?.[nodeType];
  if (path) {
    router.push(path);
  } else {
    message.info('该集群类型的部署功能即将推出');
  }
}

// 统计数据
const stats = computed(() => {
  if (!topologyData.value?.stats) {
    return { totalNodes: 0, runningNodes: 0, stoppedNodes: 0, failedNodes: 0 };
  }
  return topologyData.value.stats;
});

const masterCount = computed(() => topologyData.value?.masters?.length || 0);
const workerCount = computed(() => topologyData.value?.workers?.length || 0);

// 集群类型显示名称
const clusterTypeName = computed(() => {
  const names: Record<ClusterType, string> = {
    hadoop: 'Hadoop',
    jenkins: 'Jenkins',
    redis: 'Redis',
    mysql: 'MySQL',
    spark: 'Spark',
  };
  return names[activeClusterType.value] || activeClusterType.value;
});

// 监听集群类型变化
watch(activeClusterType, () => {
  loadTopology();
});

onMounted(() => {
  loadTopology();
});
</script>

<template>
  <div class="cluster-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <div class="page-title">
          <span class="title-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </span>
          <div class="title-text">
            <h1>集群管理中心</h1>
            <p>Cluster Management Center</p>
          </div>
        </div>
      </div>
      <div class="header-right">
        <ClusterTypeSelector
          :value="activeClusterType"
          @change="handleClusterTypeChange"
        />
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card total">
        <div class="stat-icon">
          <CloudServerOutlined />
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.totalNodes }}</span>
          <span class="stat-label">总节点数</span>
        </div>
        <div class="stat-detail">
          <span class="detail-item master">
            <span class="dot"></span>
            Master: {{ masterCount }}
          </span>
          <span class="detail-item worker">
            <span class="dot"></span>
            Worker: {{ workerCount }}
          </span>
        </div>
      </div>

      <div class="stat-card running">
        <div class="stat-icon">
          <PlayCircleOutlined />
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.runningNodes }}</span>
          <span class="stat-label">运行中</span>
        </div>
        <div class="stat-progress">
          <div class="progress-bar" :style="{ width: `${(stats.runningNodes / (stats.totalNodes || 1)) * 100}%` }"></div>
        </div>
      </div>

      <div class="stat-card stopped">
        <div class="stat-icon">
          <PauseCircleOutlined />
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.stoppedNodes }}</span>
          <span class="stat-label">已停止</span>
        </div>
        <div class="stat-progress">
          <div class="progress-bar" :style="{ width: `${(stats.stoppedNodes / (stats.totalNodes || 1)) * 100}%` }"></div>
        </div>
      </div>

      <div class="stat-card failed">
        <div class="stat-icon">
          <CloseCircleOutlined />
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.failedNodes }}</span>
          <span class="stat-label">异常</span>
        </div>
        <div class="stat-progress">
          <div class="progress-bar" :style="{ width: `${(stats.failedNodes / (stats.totalNodes || 1)) * 100}%` }"></div>
        </div>
      </div>
    </div>

    <!-- 操作栏 -->
    <div class="action-bar">
      <div class="action-left">
        <h2 class="section-title">
          <span class="cluster-badge" :class="activeClusterType">{{ clusterTypeName }}</span>
          集群拓扑
        </h2>
      </div>
      <div class="action-right">
        <Space>
          <Button @click="handleRefresh" :loading="loading">
            <template #icon><ReloadOutlined /></template>
            刷新
          </Button>
          <Button
            v-if="activeClusterType === 'hadoop'"
            @click="handleSyncHosts"
            :loading="syncing"
          >
            <template #icon><SyncOutlined /></template>
            同步 Hosts
          </Button>
          <Button type="primary" @click="goToDeploy('master')">
            <template #icon><PlusOutlined /></template>
            添加 Master
          </Button>
          <Button type="primary" ghost @click="goToDeploy('node')">
            <template #icon><CloudServerOutlined /></template>
            添加 Worker
          </Button>
        </Space>
      </div>
    </div>

    <!-- 拓扑图区域 -->
    <div class="topology-container">
      <Spin :spinning="loading" tip="正在加载集群拓扑...">
        <ClusterTopology
          v-if="topologyData"
          :cluster-type="activeClusterType"
          :master-nodes="topologyData.masters"
          :worker-nodes="topologyData.workers"
          @node-click="handleNodeClick"
        />
        <div v-else class="empty-topology">
          <div class="empty-icon">
            <CloudServerOutlined />
          </div>
          <p class="empty-text">暂无集群数据</p>
          <p class="empty-hint">请先添加 Master 节点以创建集群</p>
          <Button type="primary" @click="goToDeploy('master')">
            <template #icon><PlusOutlined /></template>
            添加 Master 节点
          </Button>
        </div>
      </Spin>
    </div>

    <!-- 节点详情抽屉 -->
    <NodeDetailDrawer
      v-model:visible="detailDrawerVisible"
      :node="selectedNode"
      :cluster-type="activeClusterType"
      @refresh="loadTopology"
    />
  </div>
</template>

<style scoped>
.cluster-page {
  padding: 24px;
  background: linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--muted)) 100%);
  min-height: calc(100vh - 64px);
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-icon {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.35);
}

.title-text h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #1a1a2e;
}

.title-text p {
  margin: 4px 0 0;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
  letter-spacing: 1px;
}

/* 统计卡片 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: hsl(var(--card));
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
}

.stat-card .stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-card.total .stat-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.stat-card.running .stat-icon {
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
  color: #fff;
}

.stat-card.stopped .stat-icon {
  background: linear-gradient(135deg, #faad14 0%, #d48806 100%);
  color: #fff;
}

.stat-card.failed .stat-icon {
  background: linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%);
  color: #fff;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 32px;
  font-weight: 600;
  color: #1a1a2e;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: hsl(var(--muted-foreground));
  margin-top: 4px;
}

.stat-detail {
  width: 100%;
  display: flex;
  gap: 16px;
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px dashed hsl(var(--border));
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.detail-item .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.detail-item.master .dot {
  background: #722ed1;
}

.detail-item.worker .dot {
  background: #1890ff;
}

.stat-progress {
  width: 100%;
  height: 4px;
  background: hsl(var(--muted));
  border-radius: 2px;
  margin-top: 12px;
  overflow: hidden;
}

.stat-progress .progress-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 0.5s ease;
}

.stat-card.running .progress-bar {
  background: linear-gradient(90deg, #52c41a 0%, #73d13d 100%);
}

.stat-card.stopped .progress-bar {
  background: linear-gradient(90deg, #faad14 0%, #ffc53d 100%);
}

.stat-card.failed .progress-bar {
  background: linear-gradient(90deg, #ff4d4f 0%, #ff7875 100%);
}

/* 操作栏 */
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1a1a2e;
  display: flex;
  align-items: center;
  gap: 12px;
}

.cluster-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}

.cluster-badge.hadoop {
  background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
}

.cluster-badge.jenkins {
  background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
}

.cluster-badge.redis {
  background: linear-gradient(135deg, #e91e63 0%, #c2185b 100%);
}

.cluster-badge.mysql {
  background: linear-gradient(135deg, #00bcd4 0%, #0097a7 100%);
}

.cluster-badge.spark {
  background: linear-gradient(135deg, #ff5722 0%, #e64a19 100%);
}

/* 拓扑图容器 */
.topology-container {
  background: hsl(var(--card));
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.empty-topology {
  min-height: 500px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--muted)) 100%);
}

.empty-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, hsl(var(--muted)) 0%, hsl(var(--accent)) 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  color: hsl(var(--muted-foreground));
  margin-bottom: 20px;
}

.empty-text {
  font-size: 18px;
  color: hsl(var(--foreground));
  margin: 0 0 8px;
}

.empty-hint {
  font-size: 14px;
  color: hsl(var(--muted-foreground));
  margin: 0 0 24px;
}

/* 响应式 */
@media (max-width: 1200px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: 1fr;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .action-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
}
</style>
