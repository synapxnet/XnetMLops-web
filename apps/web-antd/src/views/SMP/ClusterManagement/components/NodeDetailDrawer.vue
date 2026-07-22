<script setup lang="ts">
import { computed } from 'vue';
import { Drawer, Descriptions, Tag, Button, Space, Divider } from 'ant-design-vue';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  DeleteOutlined,
} from '@ant-design/icons-vue';
import type { ClusterNode, ClusterType } from '../../api/clusterManagement';
import { getStatusText, getStatusColor, getClusterTypeConfig } from '../../api/clusterManagement';

interface Props {
  visible: boolean;
  node: ClusterNode | null;
  clusterType: ClusterType;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:visible': [visible: boolean];
  refresh: [];
}>();

const drawerVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
});

const clusterConfig = computed(() => getClusterTypeConfig(props.clusterType));

const statusTagColor = computed(() => {
  if (!props.node) return 'default';
  const status = props.node.status;
  const colorMap: Record<string, string> = {
    running: 'success',
    deployed: 'processing',
    deploying: 'purple',
    stopped: 'warning',
    failed: 'error',
    created: 'default',
  };
  return colorMap[status] || 'default';
});

function handleClose() {
  drawerVisible.value = false;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN');
}
</script>

<template>
  <Drawer
    v-model:open="drawerVisible"
    :title="`节点详情 - ${node?.name || ''}`"
    :width="480"
    @close="handleClose"
  >
    <template v-if="node">
      <!-- 状态和基本信息 -->
      <div class="status-header">
        <div class="status-info">
          <Tag :color="statusTagColor" class="status-tag">
            {{ getStatusText(node.status) }}
          </Tag>
          <Tag :color="node.role === 'master' ? 'purple' : 'blue'">
            {{ node.role === 'master' ? 'Master' : 'Worker' }}
          </Tag>
          <Tag>{{ clusterConfig?.name || node.clusterType }}</Tag>
        </div>
      </div>

      <Divider />

      <!-- 连接信息 -->
      <Descriptions title="连接信息" :column="1" size="small" bordered>
        <Descriptions.Item label="主机地址">
          <code>{{ node.host }}</code>
        </Descriptions.Item>
        <Descriptions.Item label="SSH端口">
          {{ node.port }}
        </Descriptions.Item>
        <Descriptions.Item label="节点UID">
          <code class="uid-text">{{ node.uid }}</code>
        </Descriptions.Item>
      </Descriptions>

      <Divider />

      <!-- 集群关联 -->
      <Descriptions title="集群关联" :column="1" size="small" bordered>
        <Descriptions.Item label="集群类型">
          {{ clusterConfig?.name || node.clusterType }}
        </Descriptions.Item>
        <Descriptions.Item v-if="node.masterId" label="关联Master ID">
          {{ node.masterId }}
        </Descriptions.Item>
        <Descriptions.Item v-if="node.masterHost" label="Master地址">
          <code>{{ node.masterHost }}</code>
        </Descriptions.Item>
      </Descriptions>

      <Divider />

      <!-- 扩展属性 -->
      <Descriptions
        v-if="node.extra && Object.keys(node.extra).length > 0"
        title="扩展属性"
        :column="1"
        size="small"
        bordered
      >
        <Descriptions.Item
          v-for="(value, key) in node.extra"
          :key="key"
          :label="key"
        >
          {{ value || '-' }}
        </Descriptions.Item>
      </Descriptions>

      <Divider v-if="node.extra && Object.keys(node.extra).length > 0" />

      <!-- 时间信息 -->
      <Descriptions title="时间信息" :column="1" size="small" bordered>
        <Descriptions.Item label="创建时间">
          {{ formatDate(node.createdAt) }}
        </Descriptions.Item>
        <Descriptions.Item v-if="node.updatedAt" label="更新时间">
          {{ formatDate(node.updatedAt) }}
        </Descriptions.Item>
      </Descriptions>

      <Divider />

      <!-- 描述 -->
      <div v-if="node.description" class="description-section">
        <div class="section-title">描述</div>
        <p class="description-text">{{ node.description }}</p>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <Space wrap>
          <Button type="primary" :disabled="node.status === 'running'">
            <template #icon><PlayCircleOutlined /></template>
            启动
          </Button>
          <Button :disabled="node.status !== 'running'">
            <template #icon><PauseCircleOutlined /></template>
            停止
          </Button>
          <Button @click="emit('refresh')">
            <template #icon><ReloadOutlined /></template>
            刷新状态
          </Button>
          <Button>
            <template #icon><SettingOutlined /></template>
            配置
          </Button>
          <Button danger>
            <template #icon><DeleteOutlined /></template>
            删除
          </Button>
        </Space>
      </div>
    </template>

    <div v-else class="empty-state">
      请选择一个节点查看详情
    </div>
  </Drawer>
</template>

<style scoped>
.status-header {
  margin-bottom: 16px;
}

.status-info {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.status-tag {
  font-size: 14px;
  padding: 4px 12px;
}

.uid-text {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  word-break: break-all;
}

.section-title {
  font-weight: 600;
  margin-bottom: 8px;
  color: hsl(var(--foreground));
}

.description-text {
  color: hsl(var(--muted-foreground));
  line-height: 1.6;
}

.action-buttons {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid hsl(var(--border));
}

.empty-state {
  text-align: center;
  padding: 48px;
  color: hsl(var(--muted-foreground));
}

code {
  background: hsl(var(--muted));
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', monospace;
}
</style>
