<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  FileTextOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SyncOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Col,
  Descriptions,
  DescriptionsItem,
  message,
  Modal,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  Timeline,
  TimelineItem,
} from 'ant-design-vue';

import { mepRequestClient } from '#/api/request';

const router = useRouter();
const route = useRoute();

const loading = ref(false);
const instance = ref<any>(null);
const logs = ref('');
const logsLoading = ref(false);
const operating = ref(false);

// 自动刷新
let refreshTimer: number | null = null;

// 加载实例数据
const loadInstance = async () => {
  const id = route.query.id as string;
  if (!id) {
    message.error('缺少实例ID');
    router.push('/MEP/openclaw/index');
    return;
  }

  loading.value = true;
  try {
    const res = await mepRequestClient.get<any>(`/openclaw/instances/${id}`);
    instance.value = res?.data ?? res;
  } catch (error) {
    console.error('加载实例数据失败:', error);
    message.error('加载实例数据失败');
  } finally {
    loading.value = false;
  }
};

// 加载日志
const loadLogs = async () => {
  if (!instance.value) return;

  logsLoading.value = true;
  try {
    const res = await mepRequestClient.get<any>(
      `/openclaw/instances/${instance.value.id}/logs`,
      { params: { lines: 100 } }
    );
    const logData = res?.data ?? res;
    logs.value = logData || '暂无日志';
  } catch (error) {
    console.error('加载日志失败:', error);
    logs.value = '加载日志失败';
  } finally {
    logsLoading.value = false;
  }
};

// 启动实例
const handleStart = () => {
  Modal.confirm({
    title: '确认启动',
    content: '确定要启动该OpenClaw实例吗？源码模式首次启动可能需要几分钟。',
    okText: '启动',
    cancelText: '取消',
    onOk: async () => {
      operating.value = true;
      try {
        await mepRequestClient.post(`/openclaw/instances/${instance.value.id}/start`);
        message.success('启动命令已发送，正在部署中...');
        await loadInstance();
      } catch (error) {
        console.error('启动失败:', error);
        message.error('启动失败');
      } finally {
        operating.value = false;
      }
    },
  });
};

// 停止实例
const handleStop = () => {
  Modal.confirm({
    title: '确认停止',
    content: '确定要停止该OpenClaw实例吗？',
    okText: '停止',
    cancelText: '取消',
    onOk: async () => {
      operating.value = true;
      try {
        await mepRequestClient.post(`/openclaw/instances/${instance.value.id}/stop`);
        message.success('停止成功');
        await loadInstance();
      } catch (error) {
        console.error('停止失败:', error);
        message.error('停止失败');
      } finally {
        operating.value = false;
      }
    },
  });
};

// 重启实例
const handleRestart = () => {
  Modal.confirm({
    title: '确认重启',
    content: '确定要重启该OpenClaw实例吗？将重新配置并启动Gateway（不会重新安装环境）。',
    okText: '重启',
    cancelText: '取消',
    onOk: async () => {
      operating.value = true;
      try {
        await mepRequestClient.post(`/openclaw/instances/${instance.value.id}/restart`);
        message.success('重启命令已发送...');
        await loadInstance();
      } catch (error) {
        console.error('重启失败:', error);
        message.error('重启失败');
      } finally {
        operating.value = false;
      }
    },
  });
};

// 编辑
const handleEdit = () => {
  router.push({
    path: '/MEP/openclaw/create',
    query: { id: instance.value.id },
  });
};

// 返回列表
const handleBack = () => {
  router.push('/MEP/openclaw/index');
};

// 获取状态配置
const getStatusConfig = (status: string) => {
  const statusMap: Record<string, { color: string; icon: any; label: string }> = {
    running: { color: 'success', icon: CheckCircleOutlined, label: '运行中' },
    stopped: { color: 'default', icon: PauseCircleOutlined, label: '已停止' },
    starting: { color: 'processing', icon: SyncOutlined, label: '启动中' },
    error: { color: 'error', icon: CloseCircleOutlined, label: '异常' },
  };
  return statusMap[status] || { color: 'default', icon: PauseCircleOutlined, label: status };
};

// 开始自动刷新（starting状态3秒，running状态10秒）
// 同时刷新实例数据和日志
const startAutoRefresh = () => {
  const tick = () => {
    if (!instance.value) return;
    const isTransitional = instance.value.status === 'starting' || operating.value;
    if (isTransitional || instance.value.status === 'running') {
      loadInstance();
      loadLogs();
    }
    // 过渡状态用更短间隔
    const interval = isTransitional ? 3000 : 10000;
    refreshTimer = window.setTimeout(tick, interval);
  };
  refreshTimer = window.setTimeout(tick, 3000);
};

onMounted(async () => {
  await loadInstance();
  loadLogs();
  startAutoRefresh();
});

onUnmounted(() => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }
});
</script>

<template>
  <div class="p-4">
    <!-- 页面标题 -->
    <Card class="mb-4 shadow">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <Button type="text" @click="handleBack">
            <ArrowLeftOutlined />
          </Button>
          <div>
            <h2 class="m-0 text-xl font-semibold">
              {{ instance?.name || '加载中...' }}
            </h2>
            <p class="m-0 text-gray-500">{{ instance?.uid }}</p>
          </div>
        </div>
        <Space>
          <Button @click="loadInstance">
            <ReloadOutlined />
            刷新
          </Button>
          <Button v-if="instance?.status === 'running'" :loading="operating" @click="handleStop">
            <PauseCircleOutlined />
            停止
          </Button>
          <Button
            v-else
            type="primary"
            :disabled="instance?.status === 'starting'"
            :loading="operating || instance?.status === 'starting'"
            @click="handleStart"
          >
            <PlayCircleOutlined />
            启动
          </Button>
          <Button @click="handleEdit">
            <EditOutlined />
            编辑
          </Button>
        </Space>
      </div>
    </Card>

    <Spin :spinning="loading">
      <Row :gutter="16">
        <!-- 左侧：基本信息 -->
        <Col :span="16">
          <Card title="实例信息" class="mb-4 shadow">
            <Descriptions :column="2" bordered>
              <DescriptionsItem label="实例名称">{{ instance?.name }}</DescriptionsItem>
              <DescriptionsItem label="实例UID">{{ instance?.uid }}</DescriptionsItem>
              <DescriptionsItem label="部署模式">
                <Tag color="blue">{{ instance?.deployMode }}</Tag>
              </DescriptionsItem>
              <DescriptionsItem label="状态">
                <Tag v-if="instance" :color="getStatusConfig(instance.status).color">
                  <component :is="getStatusConfig(instance.status).icon" />
                  {{ getStatusConfig(instance.status).label }}
                </Tag>
              </DescriptionsItem>
              <DescriptionsItem label="Gateway地址">
                {{ instance?.gatewayHost }}:{{ instance?.gatewayPort }}
              </DescriptionsItem>
              <DescriptionsItem label="默认模型">
                {{ instance?.defaultModel }}
              </DescriptionsItem>
              <DescriptionsItem label="容器/进程ID">
                {{ instance?.containerName || instance?.processId || '-' }}
              </DescriptionsItem>
              <DescriptionsItem label="创建时间">{{ instance?.createdAt }}</DescriptionsItem>
              <DescriptionsItem label="描述" :span="2">
                {{ instance?.description || '暂无描述' }}
              </DescriptionsItem>
            </Descriptions>
          </Card>

          <!-- 日志 -->
          <Card class="shadow">
            <template #title>
              <div class="flex items-center justify-between">
                <span><FileTextOutlined /> 运行日志</span>
                <Button size="small" :loading="logsLoading" @click="loadLogs">
                  <ReloadOutlined /> 刷新日志
                </Button>
              </div>
            </template>
            <div class="logs-container">
              <pre class="logs-content">{{ logs || '加载中...' }}</pre>
            </div>
          </Card>
        </Col>

        <!-- 右侧：统计和操作 -->
        <Col :span="8">
          <!-- 统计 -->
          <Card title="统计信息" class="mb-4 shadow">
            <Row :gutter="16">
              <Col :span="12">
                <Statistic
                  title="总对话数"
                  :value="instance?.totalConversations || 0"
                />
              </Col>
              <Col :span="12">
                <Statistic
                  title="总消息数"
                  :value="instance?.totalMessages || 0"
                />
              </Col>
            </Row>
            <div v-if="instance?.lastActiveAt" class="mt-4 text-gray-500">
              最后活跃: {{ instance.lastActiveAt }}
            </div>
          </Card>

          <!-- 快速操作 -->
          <Card title="快速操作" class="mb-4 shadow">
            <Space direction="vertical" class="w-full">
              <Button
                v-if="instance?.status !== 'running'"
                type="primary"
                block
                :disabled="instance?.status === 'starting'"
                :loading="operating || instance?.status === 'starting'"
                @click="handleStart"
              >
                <PlayCircleOutlined /> 启动实例
              </Button>
              <Button
                v-if="instance?.status === 'running'"
                block
                :loading="operating"
                @click="handleStop"
              >
                <PauseCircleOutlined /> 停止实例
              </Button>
              <Button
                v-if="instance?.status === 'running'"
                block
                :loading="operating"
                @click="handleRestart"
              >
                <ReloadOutlined /> 重启实例
              </Button>
              <Button block @click="handleEdit">
                <EditOutlined /> 编辑配置
              </Button>
            </Space>
          </Card>

          <!-- 状态时间线 -->
          <Card title="状态变更" class="shadow">
            <Timeline>
              <TimelineItem color="green">
                实例创建
                <div class="text-xs text-gray-400">{{ instance?.createdAt }}</div>
              </TimelineItem>
              <TimelineItem v-if="instance?.status === 'running'" color="blue">
                实例运行中
              </TimelineItem>
              <TimelineItem v-else-if="instance?.status === 'error'" color="red">
                发生错误
                <div class="text-xs text-gray-400">{{ instance?.lastError }}</div>
              </TimelineItem>
              <TimelineItem v-else color="gray">
                实例已停止
              </TimelineItem>
            </Timeline>
          </Card>
        </Col>
      </Row>
    </Spin>
  </div>
</template>

<style scoped>
.logs-container {
  max-height: 400px;
  overflow: auto;
  background: #1e1e1e;
  border-radius: 4px;
}

.logs-content {
  margin: 0;
  padding: 16px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #d4d4d4;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
