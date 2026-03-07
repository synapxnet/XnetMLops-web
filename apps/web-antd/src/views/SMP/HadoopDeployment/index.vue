<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  message,
  Tabs,
  Statistic,
  Row,
  Col,
  Input,
  Select,
} from 'ant-design-vue';
import {
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  SyncOutlined,
  FileTextOutlined,
  ClusterOutlined,
} from '@ant-design/icons-vue';
import {
  getMasters,
  getNodes,
  deleteCluster,
  checkStatus,
  startServices,
  stopServices,
  refreshVersions,
  type HadoopCluster,
} from '../api/hadoopCluster';

const router = useRouter();
const activeTab = ref('master');

// Master 数据
const masterList = ref<HadoopCluster[]>([]);
const masterLoading = ref(false);
const masterSearchText = ref('');
const masterStatusFilter = ref<string | undefined>(undefined);

// Node 数据
const nodeList = ref<HadoopCluster[]>([]);
const nodeLoading = ref(false);
const nodeSearchText = ref('');
const nodeStatusFilter = ref<string | undefined>(undefined);

// 日志弹窗
const logModalVisible = ref(false);
const currentLog = ref('');
const currentLogTitle = ref('');

// 版本刷新状态
const versionRefreshing = ref(false);

// 自动刷新
let refreshTimer: ReturnType<typeof setInterval> | null = null;

// ==================== Master 相关 ====================

async function loadMasters() {
  masterLoading.value = true;
  try {
    const res = await getMasters();
    // 兼容两种响应格式：数组或 {code, data} 对象
    if (Array.isArray(res)) {
      masterList.value = res;
    } else if (res && res.code === 0) {
      masterList.value = res.data || [];
    } else if (res && res.data) {
      masterList.value = res.data || [];
    } else {
      masterList.value = [];
    }
  } catch (error) {
    console.error('加载 Master 列表失败', error);
  } finally {
    masterLoading.value = false;
  }
}

// 过滤后的 Master 列表
const filteredMasterList = computed(() => {
  return masterList.value.filter((item) => {
    const matchSearch =
      !masterSearchText.value ||
      item.name.toLowerCase().includes(masterSearchText.value.toLowerCase()) ||
      item.host.toLowerCase().includes(masterSearchText.value.toLowerCase());
    const matchStatus =
      !masterStatusFilter.value || item.status === masterStatusFilter.value;
    return matchSearch && matchStatus;
  });
});

const masterColumns = [
  { title: '名称', dataIndex: 'name', key: 'name', width: 150 },
  { title: '主机', dataIndex: 'host', key: 'host', width: 150 },
  { title: 'Hadoop版本', dataIndex: 'hadoopVersion', key: 'hadoopVersion', width: 100 },
  { title: '部署模式', dataIndex: 'deployMode', key: 'deployMode', width: 100 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '操作', key: 'action', width: 250, fixed: 'right' },
];

async function handleDeleteMaster(id: number) {
  Modal.confirm({
    title: '确认删除',
    content: '删除 Master 节点将无法恢复，确定要删除吗？',
    okType: 'danger',
    async onOk() {
      try {
        await deleteCluster(id);
        message.success('删除成功');
        loadMasters();
      } catch (error: any) {
        message.error(error.message || '删除失败');
      }
    },
  });
}

async function handleRefreshMasterStatus(id: number) {
  try {
    await checkStatus(id);
    message.success('状态已刷新');
    loadMasters();
  } catch (error) {
    message.error('刷新状态失败');
  }
}

async function handleToggleMaster(master: HadoopCluster) {
  try {
    if (master.status === 'running') {
      const res = await stopServices(master.id!);
      if (res.code === 0) {
        message.success('服务已停止');
      }
    } else {
      const res = await startServices(master.id!);
      if (res.code === 0) {
        message.success('服务已启动');
      }
    }
    loadMasters();
  } catch (error) {
    message.error('操作失败');
  }
}

function handleViewMasterLog(master: HadoopCluster) {
  currentLogTitle.value = `${master.name} - 部署日志`;
  currentLog.value = master.deployLog || '暂无日志';
  logModalVisible.value = true;
}

// ==================== Node 相关 ====================

async function loadNodes() {
  nodeLoading.value = true;
  try {
    const res = await getNodes();
    // 兼容两种响应格式：数组或 {code, data} 对象
    if (Array.isArray(res)) {
      nodeList.value = res;
    } else if (res && res.code === 0) {
      nodeList.value = res.data || [];
    } else if (res && res.data) {
      nodeList.value = res.data || [];
    } else {
      nodeList.value = [];
    }
  } catch (error) {
    console.error('加载 Node 列表失败', error);
  } finally {
    nodeLoading.value = false;
  }
}

const filteredNodeList = computed(() => {
  return nodeList.value.filter((item) => {
    const matchSearch =
      !nodeSearchText.value ||
      item.name.toLowerCase().includes(nodeSearchText.value.toLowerCase()) ||
      item.host.toLowerCase().includes(nodeSearchText.value.toLowerCase());
    const matchStatus =
      !nodeStatusFilter.value || item.status === nodeStatusFilter.value;
    return matchSearch && matchStatus;
  });
});

const nodeColumns = [
  { title: '名称', dataIndex: 'name', key: 'name', width: 150 },
  { title: '主机', dataIndex: 'host', key: 'host', width: 150 },
  { title: 'Hadoop版本', dataIndex: 'hadoopVersion', key: 'hadoopVersion', width: 100 },
  { title: '关联Master', dataIndex: 'masterId', key: 'masterId', width: 100 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '操作', key: 'action', width: 250, fixed: 'right' },
];

async function handleDeleteNode(id: number) {
  Modal.confirm({
    title: '确认删除',
    content: '删除 Node 节点将无法恢复，确定要删除吗？',
    okType: 'danger',
    async onOk() {
      try {
        await deleteCluster(id);
        message.success('删除成功');
        loadNodes();
      } catch (error: any) {
        message.error(error.message || '删除失败');
      }
    },
  });
}

async function handleRefreshNodeStatus(id: number) {
  try {
    await checkStatus(id);
    message.success('状态已刷新');
    loadNodes();
  } catch (error) {
    message.error('刷新状态失败');
  }
}

async function handleToggleNode(node: HadoopCluster) {
  try {
    if (node.status === 'running') {
      const res = await stopServices(node.id!);
      if (res.code === 0) {
        message.success('服务已停止');
      }
    } else {
      const res = await startServices(node.id!);
      if (res.code === 0) {
        message.success('服务已启动');
      }
    }
    loadNodes();
  } catch (error) {
    message.error('操作失败');
  }
}

function handleViewNodeLog(node: HadoopCluster) {
  currentLogTitle.value = `${node.name} - 部署日志`;
  currentLog.value = node.deployLog || '暂无日志';
  logModalVisible.value = true;
}

// ==================== 统计数据 ====================

const masterStats = computed(() => ({
  total: masterList.value.length,
  running: masterList.value.filter((m) => m.status === 'running' || m.status === 'deployed').length,
  offline: masterList.value.filter((m) => m.status === 'stopped' || m.status === 'failed').length,
}));

const nodeStats = computed(() => ({
  total: nodeList.value.length,
  running: nodeList.value.filter((n) => n.status === 'running' || n.status === 'deployed').length,
  offline: nodeList.value.filter((n) => n.status === 'stopped' || n.status === 'failed').length,
}));

// ==================== 导航 ====================

function goToDeployMaster() {
  router.push('/SMP/HadoopDeployment/DeployMaster');
}

function goToDeployNode() {
  router.push('/SMP/HadoopDeployment/DeployNode');
}

function goToEditMaster(id: number) {
  router.push(`/SMP/HadoopDeployment/DeployMaster?id=${id}`);
}

function goToEditNode(id: number) {
  router.push(`/SMP/HadoopDeployment/DeployNode?id=${id}`);
}

// ==================== 版本刷新 ====================

async function handleRefreshVersions() {
  versionRefreshing.value = true;
  try {
    const res = await refreshVersions();
    // 兼容不同响应格式
    if (res && typeof res === 'object') {
      if (res.code === 0 || res.count !== undefined) {
        const count = res.data?.count || res.count || 0;
        message.success(`版本列表已刷新，共 ${count} 个版本`);
      } else if (res.message) {
        message.error(res.message);
      } else {
        message.success('版本列表已刷新');
      }
    } else {
      message.success('版本列表已刷新');
    }
  } catch (error) {
    message.error('刷新版本失败');
  } finally {
    versionRefreshing.value = false;
  }
}

// ==================== 状态标签 ====================

function getStatusTag(status?: string) {
  const statusMap: Record<string, { color: string; text: string }> = {
    created: { color: 'default', text: '已创建' },
    deploying: { color: 'processing', text: '部署中' },
    deployed: { color: 'success', text: '已部署' },
    running: { color: 'success', text: '运行中' },
    stopped: { color: 'warning', text: '已停止' },
    failed: { color: 'error', text: '失败' },
  };
  const info = statusMap[status || 'created'] || { color: 'default', text: status };
  return info;
}

function getDeployModeText(mode?: string) {
  return mode === 'ha' ? 'HA 模式' : '标准模式';
}

// ==================== 生命周期 ====================

onMounted(() => {
  loadMasters();
  loadNodes();
  // 30秒自动刷新
  refreshTimer = setInterval(() => {
    if (activeTab.value === 'master') {
      loadMasters();
    } else {
      loadNodes();
    }
  }, 30000);
});

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
});

function handleTabChange(key: string) {
  activeTab.value = key;
  if (key === 'master') {
    loadMasters();
  } else {
    loadNodes();
  }
}
</script>

<template>
  <div class="hadoop-deployment-container">
    <!-- 统计卡片 -->
    <Row :gutter="16" class="stats-row">
      <Col :span="6">
        <Card>
          <Statistic
            title="Master 节点总数"
            :value="masterStats.total"
            :value-style="{ color: '#1890ff' }"
          >
            <template #prefix>
              <ClusterOutlined />
            </template>
          </Statistic>
        </Card>
      </Col>
      <Col :span="6">
        <Card>
          <Statistic
            title="Master 运行中"
            :value="masterStats.running"
            :value-style="{ color: '#52c41a' }"
          />
        </Card>
      </Col>
      <Col :span="6">
        <Card>
          <Statistic
            title="Node 节点总数"
            :value="nodeStats.total"
            :value-style="{ color: '#1890ff' }"
          />
        </Card>
      </Col>
      <Col :span="6">
        <Card>
          <Statistic
            title="Node 运行中"
            :value="nodeStats.running"
            :value-style="{ color: '#52c41a' }"
          />
        </Card>
      </Col>
    </Row>

    <!-- 主内容区域 -->
    <Card class="main-card">
      <Tabs v-model:activeKey="activeTab" @change="handleTabChange">
        <!-- Master Tab -->
        <Tabs.TabPane key="master" tab="Master 节点">
          <div class="table-toolbar">
            <Space>
              <Input.Search
                v-model:value="masterSearchText"
                placeholder="搜索名称或主机"
                style="width: 200px"
                allow-clear
              />
              <Select
                v-model:value="masterStatusFilter"
                placeholder="状态筛选"
                style="width: 120px"
                allow-clear
              >
                <Select.Option value="running">运行中</Select.Option>
                <Select.Option value="deployed">已部署</Select.Option>
                <Select.Option value="stopped">已停止</Select.Option>
                <Select.Option value="failed">失败</Select.Option>
              </Select>
            </Space>
            <Space>
              <Button
                :loading="versionRefreshing"
                @click="handleRefreshVersions"
              >
                <template #icon><SyncOutlined /></template>
                刷新版本
              </Button>
              <Button type="primary" @click="goToDeployMaster">
                <template #icon><PlusOutlined /></template>
                部署 Master
              </Button>
            </Space>
          </div>

          <Table
            :columns="masterColumns"
            :data-source="filteredMasterList"
            :loading="masterLoading"
            :scroll="{ x: 1000 }"
            row-key="id"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'status'">
                <Tag :color="getStatusTag(record.status).color">
                  {{ getStatusTag(record.status).text }}
                </Tag>
              </template>
              <template v-else-if="column.key === 'deployMode'">
                {{ getDeployModeText(record.deployMode) }}
              </template>
              <template v-else-if="column.key === 'action'">
                <Space>
                  <Button
                    type="link"
                    size="small"
                    @click="handleRefreshMasterStatus(record.id)"
                  >
                    <template #icon><ReloadOutlined /></template>
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    @click="handleToggleMaster(record)"
                  >
                    <template #icon>
                      <PauseCircleOutlined v-if="record.status === 'running'" />
                      <PlayCircleOutlined v-else />
                    </template>
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    @click="handleViewMasterLog(record)"
                  >
                    <template #icon><FileTextOutlined /></template>
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    danger
                    @click="handleDeleteMaster(record.id)"
                  >
                    <template #icon><DeleteOutlined /></template>
                  </Button>
                </Space>
              </template>
            </template>
          </Table>
        </Tabs.TabPane>

        <!-- Node Tab -->
        <Tabs.TabPane key="node" tab="Node 节点">
          <div class="table-toolbar">
            <Space>
              <Input.Search
                v-model:value="nodeSearchText"
                placeholder="搜索名称或主机"
                style="width: 200px"
                allow-clear
              />
              <Select
                v-model:value="nodeStatusFilter"
                placeholder="状态筛选"
                style="width: 120px"
                allow-clear
              >
                <Select.Option value="running">运行中</Select.Option>
                <Select.Option value="deployed">已部署</Select.Option>
                <Select.Option value="stopped">已停止</Select.Option>
                <Select.Option value="failed">失败</Select.Option>
              </Select>
            </Space>
            <Space>
              <Button type="primary" @click="goToDeployNode">
                <template #icon><PlusOutlined /></template>
                部署 Node
              </Button>
            </Space>
          </div>

          <Table
            :columns="nodeColumns"
            :data-source="filteredNodeList"
            :loading="nodeLoading"
            :scroll="{ x: 1000 }"
            row-key="id"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'status'">
                <Tag :color="getStatusTag(record.status).color">
                  {{ getStatusTag(record.status).text }}
                </Tag>
              </template>
              <template v-else-if="column.key === 'action'">
                <Space>
                  <Button
                    type="link"
                    size="small"
                    @click="handleRefreshNodeStatus(record.id)"
                  >
                    <template #icon><ReloadOutlined /></template>
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    @click="handleToggleNode(record)"
                  >
                    <template #icon>
                      <PauseCircleOutlined v-if="record.status === 'running'" />
                      <PlayCircleOutlined v-else />
                    </template>
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    @click="handleViewNodeLog(record)"
                  >
                    <template #icon><FileTextOutlined /></template>
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    danger
                    @click="handleDeleteNode(record.id)"
                  >
                    <template #icon><DeleteOutlined /></template>
                  </Button>
                </Space>
              </template>
            </template>
          </Table>
        </Tabs.TabPane>
      </Tabs>
    </Card>

    <!-- 日志弹窗 -->
    <Modal
      v-model:open="logModalVisible"
      :title="currentLogTitle"
      width="800px"
      :footer="null"
    >
      <pre class="log-content">{{ currentLog }}</pre>
    </Modal>
  </div>
</template>

<style scoped>
.hadoop-deployment-container {
  padding: 16px;
}

.stats-row {
  margin-bottom: 16px;
}

.main-card {
  margin-top: 16px;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.log-content {
  max-height: 500px;
  overflow: auto;
  background: #f5f5f5;
  padding: 16px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
