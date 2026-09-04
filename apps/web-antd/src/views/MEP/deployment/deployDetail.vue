<script lang="ts" setup>
import type {
  DeploymentLog,
  ModelDeployment,
  ServiceMetricSummary,
  ServiceMetrics,
} from '../api/types';

import { computed, h, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CloudServerOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  SyncOutlined,
} from '@ant-design/icons-vue';
import {
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  DescriptionsItem,
  Empty,
  message,
  Progress,
  Row,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tabs,
  TabPane,
  Tag,
  Timeline,
  TimelineItem,
} from 'ant-design-vue';

import {
  fetchDeploymentDetail,
  fetchDeploymentLogs,
  fetchDeploymentMetricSummary,
  fetchDeploymentMetrics,
  restartDeployment,
  scaleDeployment,
  startDeployment,
  stopDeployment,
} from '../api/deployment';

const router = useRouter();
const route = useRoute();

// 部署详情
const deployment = ref<ModelDeployment | null>(null);
const logs = ref<DeploymentLog[]>([]);
const metrics = ref<ServiceMetrics[]>([]);
const metricSummary = ref<null | ServiceMetricSummary>(null);

const loading = ref(true);
const logsLoading = ref(false);
const metricsLoading = ref(false);

// 自动刷新
let refreshTimer: ReturnType<typeof setInterval> | null = null;

// 加载部署详情
const loadDetail = async () => {
  const id = Number(route.query.id);
  if (!id) {
    message.error('部署ID无效');
    router.back();
    return;
  }

  try {
    loading.value = true;
    deployment.value = await fetchDeploymentDetail(id);
  } catch (error) {
    console.error('加载部署详情失败:', error);
    message.error('加载部署详情失败');
  } finally {
    loading.value = false;
  }
};

// 加载日志
const loadLogs = async () => {
  if (!deployment.value) return;
  try {
    logsLoading.value = true;
    logs.value = await fetchDeploymentLogs(deployment.value.id, { limit: 100 });
  } catch (error) {
    console.error('加载日志失败:', error);
  } finally {
    logsLoading.value = false;
  }
};

// 加载监控指标
const loadMetrics = async () => {
  if (!deployment.value) return;
  try {
    metricsLoading.value = true;
    const [history, summary] = await Promise.all([
      fetchDeploymentMetrics(deployment.value.id),
      fetchDeploymentMetricSummary(deployment.value.id),
    ]);
    metrics.value = history;
    metricSummary.value = summary;
  } catch (error) {
    console.error('加载监控指标失败:', error);
  } finally {
    metricsLoading.value = false;
  }
};

/** 计算历史采样的成功率；输入服务采样，返回 0-100 百分比。 */
const historySuccessRate = (item: ServiceMetrics) => {
  if (!item.request_count) return 0;
  return Math.max(
    0,
    Math.round(
      ((item.request_count - item.error_count) * 10_000) / item.request_count,
    ) / 100,
  );
};

/** 格式化指标时间；输入 ISO 或数据库时间，返回本地无 12 小时制文本。 */
const formatMetricTime = (value?: string) => {
  if (!value) return '--';
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime())
    ? value
    : timestamp.toLocaleString('zh-CN', { hour12: false });
};

// 操作
const handleStart = async () => {
  if (!deployment.value) return;
  try {
    await startDeployment(deployment.value.id);
    await loadDetail();
  } catch (error) {
    console.error('启动失败:', error);
  }
};

const handleStop = async () => {
  if (!deployment.value) return;
  try {
    await stopDeployment(deployment.value.id);
    await loadDetail();
  } catch (error) {
    console.error('停止失败:', error);
  }
};

const handleRestart = async () => {
  if (!deployment.value) return;
  try {
    await restartDeployment(deployment.value.id);
    await loadDetail();
  } catch (error) {
    console.error('重启失败:', error);
  }
};

const handleScale = async (replicas: number) => {
  if (!deployment.value) return;
  try {
    await scaleDeployment(deployment.value.id, replicas);
    await loadDetail();
  } catch (error) {
    console.error('扩缩容失败:', error);
  }
};

// 返回
const handleBack = () => {
  router.back();
};

// 状态颜色映射
const statusConfig = {
  pending: { color: 'default', icon: SyncOutlined, label: '待部署' },
  deploying: { color: 'processing', icon: SyncOutlined, label: '部署中' },
  running: { color: 'success', icon: CheckCircleOutlined, label: '运行中' },
  failed: { color: 'error', icon: CloseCircleOutlined, label: '失败' },
  stopped: { color: 'default', icon: PauseCircleOutlined, label: '已停止' },
};

// 日志表格列
const logColumns = [
  { title: '时间', dataIndex: 'timestamp', key: 'timestamp', width: 180 },
  {
    title: '级别',
    dataIndex: 'level',
    key: 'level',
    width: 80,
    customRender: ({ record }: { record: DeploymentLog }) => {
      const colorMap: Record<string, string> = {
        info: 'blue',
        warn: 'orange',
        error: 'red',
      };
      return h(Tag, { color: colorMap[record.level] }, () =>
        record.level.toUpperCase(),
      );
    },
  },
  { title: '消息', dataIndex: 'message', key: 'message', ellipsis: true },
];

// 历史指标表格列
const metricColumns = [
  { title: '采样时间', dataIndex: 'timestamp', key: 'timestamp', width: 190 },
  {
    title: '请求数',
    dataIndex: 'request_count',
    key: 'request_count',
    width: 100,
  },
  {
    title: '成功率',
    dataIndex: 'success_rate',
    key: 'success_rate',
    width: 110,
  },
  {
    title: '平均延迟',
    dataIndex: 'avg_response_time',
    key: 'avg_response_time',
    width: 120,
  },
  { title: 'CPU', dataIndex: 'cpu_usage', key: 'cpu_usage', width: 90 },
  { title: '内存', dataIndex: 'memory_usage', key: 'memory_usage', width: 90 },
];

// 规范化历史指标表格数据
const metricRows = computed(() =>
  metrics.value.map((item, index) => ({
    ...item,
    key: `${item.timestamp}-${index}`,
    success_rate: `${historySuccessRate(item).toFixed(2)}%`,
    avg_response_time: `${item.avg_response_time ?? 0} ms`,
    cpu_usage: `${item.cpu_usage ?? 0}%`,
    memory_usage: `${item.memory_usage ?? 0}%`,
  })),
);

// Tab切换
const handleTabChange = (key: string) => {
  if (key === 'logs') {
    loadLogs();
  } else if (key === 'metrics') {
    loadMetrics();
  }
};

onMounted(() => {
  loadDetail();
  // 自动刷新状态
  refreshTimer = setInterval(() => {
    if (deployment.value?.status === 'deploying') {
      loadDetail();
    }
  }, 5000);
});

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
});
</script>

<template>
  <div class="p-4">
    <!-- 头部 -->
    <Card class="mb-4 shadow">
      <Skeleton :loading="loading" active>
        <div v-if="deployment" class="flex items-start justify-between">
          <div>
            <div class="mb-2 flex items-center gap-4">
              <Button type="text" @click="handleBack">
                <ArrowLeftOutlined />
              </Button>
              <h1 class="text-2xl font-bold">
                <CloudServerOutlined class="mr-2" />
                {{ deployment.name }}
              </h1>
              <Tag :color="statusConfig[deployment.status]?.color || 'default'">
                <component
                  :is="statusConfig[deployment.status]?.icon"
                  :spin="deployment.status === 'deploying'"
                />
                {{
                  statusConfig[deployment.status]?.label || deployment.status
                }}
              </Tag>
            </div>
            <p class="text-gray-500">
              模型: {{ deployment.model_name }} v{{
                deployment.model_version
              }}
              | 节点: {{ deployment.node_name }} | 创建时间:
              {{ deployment.created_at }}
            </p>
          </div>
          <Space>
            <Button
              v-if="deployment.status === 'running'"
              type="primary"
              danger
              @click="handleStop"
            >
              <PauseCircleOutlined />
              停止
            </Button>
            <Button
              v-if="deployment.status === 'running'"
              @click="handleRestart"
            >
              <ReloadOutlined />
              重启
            </Button>
            <Button
              v-if="
                deployment.status === 'stopped' ||
                deployment.status === 'failed'
              "
              type="primary"
              @click="handleStart"
            >
              <PlayCircleOutlined />
              启动
            </Button>
          </Space>
        </div>
      </Skeleton>
    </Card>

    <!-- 内容区 -->
    <Row :gutter="16">
      <!-- 左侧: 详情和配置 -->
      <Col :span="16">
        <Card class="mb-4 shadow">
          <Tabs @change="handleTabChange">
            <TabPane key="info" tab="基本信息">
              <Skeleton :loading="loading" active>
                <Descriptions v-if="deployment" bordered :column="2">
                  <DescriptionsItem label="部署名称">{{
                    deployment.name
                  }}</DescriptionsItem>
                  <DescriptionsItem label="模型来源">
                    <Tag
                      :color="
                        deployment.model_source === 'mtp' ? 'blue' : 'green'
                      "
                    >
                      {{
                        deployment.model_source === 'mtp' ? 'MTP训练' : '大模型'
                      }}
                    </Tag>
                  </DescriptionsItem>
                  <DescriptionsItem label="模型名称">{{
                    deployment.model_name
                  }}</DescriptionsItem>
                  <DescriptionsItem label="模型版本">{{
                    deployment.model_version
                  }}</DescriptionsItem>
                  <DescriptionsItem label="容器名称">{{
                    deployment.container_name
                  }}</DescriptionsItem>
                  <DescriptionsItem label="容器ID">
                    <code>{{ deployment.container_id || '未分配' }}</code>
                  </DescriptionsItem>
                  <DescriptionsItem label="镜像名称" :span="2">
                    <code>{{ deployment.image_name }}</code>
                  </DescriptionsItem>
                  <DescriptionsItem label="服务端点" :span="2">
                    <a
                      v-if="
                        deployment.endpoint && deployment.status === 'running'
                      "
                      :href="deployment.endpoint"
                      target="_blank"
                    >
                      {{ deployment.endpoint }}
                    </a>
                    <span v-else class="text-gray-400">{{
                      deployment.endpoint || '未分配'
                    }}</span>
                  </DescriptionsItem>
                  <DescriptionsItem label="端口">{{
                    deployment.port
                  }}</DescriptionsItem>
                  <DescriptionsItem label="副本数">{{
                    deployment.replicas
                  }}</DescriptionsItem>
                  <DescriptionsItem label="创建者">{{
                    deployment.created_by
                  }}</DescriptionsItem>
                  <DescriptionsItem label="创建时间">{{
                    deployment.created_at
                  }}</DescriptionsItem>
                </Descriptions>
              </Skeleton>
            </TabPane>

            <TabPane key="resource" tab="资源配置">
              <Skeleton :loading="loading" active>
                <Descriptions v-if="deployment" bordered :column="2">
                  <DescriptionsItem label="CPU限制">
                    {{ deployment.resource_config?.cpu_limit || '未设置' }}
                  </DescriptionsItem>
                  <DescriptionsItem label="内存限制">
                    {{ deployment.resource_config?.memory_limit || '未设置' }}
                  </DescriptionsItem>
                  <DescriptionsItem label="GPU数量">
                    {{ deployment.resource_config?.gpu_count || 0 }}
                  </DescriptionsItem>
                  <DescriptionsItem label="GPU显存">
                    {{ deployment.resource_config?.gpu_memory || '未设置' }}
                  </DescriptionsItem>
                </Descriptions>
              </Skeleton>
            </TabPane>

            <TabPane key="nginx" tab="Nginx配置">
              <Skeleton :loading="loading" active>
                <Descriptions v-if="deployment" bordered :column="2">
                  <DescriptionsItem label="Upstream名称">
                    {{ deployment.nginx_config?.upstream_name || '未配置' }}
                  </DescriptionsItem>
                  <DescriptionsItem label="Server Name">
                    {{ deployment.nginx_config?.server_name || '未配置' }}
                  </DescriptionsItem>
                  <DescriptionsItem label="监听端口">
                    {{ deployment.nginx_config?.listen_port || '未配置' }}
                  </DescriptionsItem>
                  <DescriptionsItem label="Proxy Pass">
                    {{ deployment.nginx_config?.proxy_pass || '未配置' }}
                  </DescriptionsItem>
                  <DescriptionsItem label="SSL">
                    <Badge
                      :status="
                        deployment.nginx_config?.ssl_enabled
                          ? 'success'
                          : 'default'
                      "
                      :text="
                        deployment.nginx_config?.ssl_enabled
                          ? '已启用'
                          : '未启用'
                      "
                    />
                  </DescriptionsItem>
                </Descriptions>
                <div
                  v-if="deployment?.nginx_config?.custom_config"
                  class="mt-4"
                >
                  <h4 class="mb-2 font-semibold">自定义配置:</h4>
                  <pre class="rounded bg-gray-100 p-4 dark:bg-gray-800">{{
                    deployment.nginx_config.custom_config
                  }}</pre>
                </div>
              </Skeleton>
            </TabPane>

            <TabPane key="health" tab="健康检查">
              <Skeleton :loading="loading" active>
                <Descriptions v-if="deployment" bordered :column="2">
                  <DescriptionsItem label="状态">
                    <Badge
                      :status="
                        deployment.health_check?.enabled ? 'success' : 'default'
                      "
                      :text="
                        deployment.health_check?.enabled ? '已启用' : '未启用'
                      "
                    />
                  </DescriptionsItem>
                  <DescriptionsItem label="检查路径">
                    {{ deployment.health_check?.path || '/health' }}
                  </DescriptionsItem>
                  <DescriptionsItem label="检查间隔">
                    {{ deployment.health_check?.interval || 30 }}秒
                  </DescriptionsItem>
                  <DescriptionsItem label="超时时间">
                    {{ deployment.health_check?.timeout || 10 }}秒
                  </DescriptionsItem>
                  <DescriptionsItem label="重试次数">
                    {{ deployment.health_check?.retries || 3 }}
                  </DescriptionsItem>
                </Descriptions>
              </Skeleton>
            </TabPane>

            <TabPane key="metrics" tab="指标">
              <div class="metrics-toolbar">
                <Space v-if="metricSummary">
                  <Badge
                    :status="
                      metricSummary.status === 'HEALTHY' ? 'success' : 'error'
                    "
                    :text="metricSummary.status === 'HEALTHY' ? '健康' : '异常'"
                  />
                  <Tag>{{
                    metricSummary.source === 'LIVE_RECOMMENDATION_PROBE'
                      ? '实时探针'
                      : '持久化采样'
                  }}</Tag>
                  <span class="metrics-time">{{
                    formatMetricTime(metricSummary.recorded_at)
                  }}</span>
                </Space>
                <span v-else></span>
                <Button :loading="metricsLoading" @click="loadMetrics">
                  <ReloadOutlined />
                  刷新
                </Button>
              </div>
              <Skeleton :loading="metricsLoading && !metricSummary" active>
                <template v-if="metricSummary">
                  <div class="metric-grid">
                    <div class="metric-tile metric-tile--latency">
                      <Statistic
                        title="P99"
                        :value="metricSummary.p99_response_time_ms ?? '--'"
                        suffix="ms"
                      />
                    </div>
                    <div class="metric-tile metric-tile--success">
                      <Statistic
                        title="成功率"
                        :value="metricSummary.success_rate"
                        :precision="2"
                        suffix="%"
                      />
                    </div>
                    <div class="metric-tile metric-tile--average">
                      <Statistic
                        title="平均延迟"
                        :value="metricSummary.average_response_time_ms ?? '--'"
                        suffix="ms"
                      />
                    </div>
                    <div class="metric-tile metric-tile--requests">
                      <Statistic
                        title="监控请求"
                        :value="metricSummary.request_count"
                      />
                    </div>
                  </div>

                  <div class="metric-contract">
                    <div>
                      <span>P95</span>
                      <strong
                        >{{
                          metricSummary.p95_response_time_ms ?? '--'
                        }}
                        ms</strong
                      >
                    </div>
                    <div>
                      <span>错误数</span>
                      <strong>{{ metricSummary.error_count }}</strong>
                    </div>
                    <div>
                      <span>候选数</span>
                      <strong>{{
                        metricSummary.candidate_count ?? '--'
                      }}</strong>
                    </div>
                    <div>
                      <span>算法版本</span>
                      <strong>{{ metricSummary.algorithm_id || '--' }}</strong>
                    </div>
                    <div>
                      <span>产品版本</span>
                      <strong>{{
                        metricSummary.product_version || '--'
                      }}</strong>
                    </div>
                    <div>
                      <span>响应契约</span>
                      <Tag
                        :color="
                          metricSummary.contract_status === 'MATCHED'
                            ? 'green'
                            : 'red'
                        "
                      >
                        {{ metricSummary.contract_status || '--' }}
                      </Tag>
                    </div>
                  </div>

                  <div
                    v-if="metricSummary.model_digest_sha256"
                    class="metric-digest-row"
                  >
                    <span>模型摘要</span>
                    <code :title="metricSummary.model_digest_sha256">{{
                      metricSummary.model_digest_sha256
                    }}</code>
                  </div>

                  <Table
                    v-if="metricRows.length > 0"
                    class="metrics-history"
                    :columns="metricColumns"
                    :data-source="metricRows"
                    :pagination="false"
                    size="small"
                  />
                </template>
                <Empty v-else description="暂无指标数据" />
              </Skeleton>
            </TabPane>

            <TabPane key="logs" tab="部署日志">
              <Table
                :columns="logColumns"
                :data-source="logs"
                :loading="logsLoading"
                :pagination="{ pageSize: 20 }"
                size="small"
                row-key="id"
              />
            </TabPane>
          </Tabs>
        </Card>
      </Col>

      <!-- 右侧: 状态和操作 -->
      <Col :span="8">
        <Card title="运行状态" class="mb-4 shadow">
          <Skeleton :loading="loading" active>
            <div v-if="deployment" class="text-center">
              <div class="mb-4">
                <Progress
                  type="circle"
                  :percent="deployment.status === 'running' ? 100 : 0"
                  :status="
                    deployment.status === 'running'
                      ? 'success'
                      : deployment.status === 'failed'
                        ? 'exception'
                        : 'normal'
                  "
                />
              </div>
              <p class="text-lg font-semibold">
                {{
                  statusConfig[deployment.status]?.label || deployment.status
                }}
              </p>
            </div>
          </Skeleton>
        </Card>

        <Card title="快速操作" class="mb-4 shadow">
          <Space direction="vertical" style="width: 100%">
            <Button
              block
              :disabled="deployment?.status !== 'running'"
              @click="() => handleScale((deployment?.replicas || 1) + 1)"
            >
              扩容 (+1副本)
            </Button>
            <Button
              block
              :disabled="
                deployment?.status !== 'running' ||
                (deployment?.replicas || 1) <= 1
              "
              @click="() => handleScale((deployment?.replicas || 1) - 1)"
            >
              缩容 (-1副本)
            </Button>
            <Button block @click="loadDetail">
              <ReloadOutlined />
              刷新状态
            </Button>
          </Space>
        </Card>

        <Card title="部署节点" class="shadow">
          <Skeleton :loading="loading" active>
            <div v-if="deployment">
              <p class="mb-2">
                <CloudServerOutlined class="mr-2" />
                <strong>{{ deployment.node_name }}</strong>
              </p>
              <p class="text-gray-500">节点UID: {{ deployment.node_uid }}</p>
            </div>
          </Skeleton>
        </Card>
      </Col>
    </Row>
  </div>
</template>

<style scoped>
:deep(.ant-card-head-title) {
  font-weight: 600;
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.metrics-toolbar {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: 18px;
  min-height: 32px;
}

.metrics-time {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

.metric-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.metric-tile {
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  min-height: 104px;
  padding: 18px;
}

.metric-tile--latency {
  border-top: 3px solid #1677ff;
}

.metric-tile--success {
  border-top: 3px solid #22a06b;
}

.metric-tile--average {
  border-top: 3px solid #7c5cff;
}

.metric-tile--requests {
  border-top: 3px solid #d89614;
}

.metric-contract {
  border-bottom: 1px solid hsl(var(--border));
  border-top: 1px solid hsl(var(--border));
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 18px;
  padding: 16px 0;
}

.metric-contract > div {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.metric-contract span,
.metric-digest-row > span {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

.metric-contract strong {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-digest-row {
  align-items: center;
  display: grid;
  gap: 16px;
  grid-template-columns: 72px minmax(0, 1fr);
  padding: 14px 0;
}

.metric-digest-row code {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metrics-history {
  margin-top: 6px;
}

@media (max-width: 1200px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .metric-grid,
  .metric-contract {
    grid-template-columns: 1fr;
  }
}
</style>
