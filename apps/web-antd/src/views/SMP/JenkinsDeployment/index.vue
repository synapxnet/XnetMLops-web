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
  Popconfirm,
  Tooltip,
} from 'ant-design-vue';
import {
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  EyeOutlined,
  CloudServerOutlined,
  ClusterOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue';

import {
  fetchJenkinsMasters,
  deleteJenkinsMaster,
  checkMasterStatus,
  startJenkins,
  stopJenkins,
  getStatusText,
  getStatusColor,
  getRegionText,
  type JenkinsMaster,
} from '../api/jenkinsMaster';

import {
  fetchJenkinsNodes,
  deleteJenkinsNode,
  checkJenkinsNodeStatus,
  startJenkinsAgent,
  stopJenkinsAgent,
  getStatusText as getNodeStatusText,
  getStatusColor as getNodeStatusColor,
  getRegionText as getNodeRegionText,
  type JenkinsNode,
} from '../api/jenkinsNode';

const router = useRouter();

// Tab切换
const activeTab = ref('master');

// Master数据
const masterList = ref<JenkinsMaster[]>([]);
const masterLoading = ref(false);
const masterSearchText = ref('');
const masterStatusFilter = ref<string | undefined>(undefined);

// Node数据
const nodeList = ref<JenkinsNode[]>([]);
const nodeLoading = ref(false);
const nodeSearchText = ref('');
const nodeStatusFilter = ref<string | undefined>(undefined);

// 日志弹窗
const logModalVisible = ref(false);
const currentLog = ref('');
const currentLogTitle = ref('');

// 自动刷新
let refreshTimer: ReturnType<typeof setInterval> | null = null;

// ==================== Master相关 ====================

// 加载Master列表
const loadMasters = async () => {
  masterLoading.value = true;
  try {
    masterList.value = await fetchJenkinsMasters();
  } catch (error) {
    console.error('加载Master列表失败:', error);
    message.error('加载Master列表失败');
  } finally {
    masterLoading.value = false;
  }
};

// 过滤后的Master列表
const filteredMasterList = computed(() => {
  return masterList.value.filter((item) => {
    const matchSearch =
      !masterSearchText.value ||
      item.name.toLowerCase().includes(masterSearchText.value.toLowerCase()) ||
      item.host.toLowerCase().includes(masterSearchText.value.toLowerCase());
    const matchStatus = !masterStatusFilter.value || item.status === masterStatusFilter.value;
    return matchSearch && matchStatus;
  });
});

// Master表格列
const masterColumns = [
  { title: '名称', dataIndex: 'name', key: 'name', width: 150 },
  { title: '主机地址', dataIndex: 'host', key: 'host', width: 150 },
  { title: 'Jenkins端口', dataIndex: 'jenkins_port', key: 'jenkins_port', width: 100 },
  { title: '地域', dataIndex: 'region', key: 'region', width: 100 },
  { title: '版本', dataIndex: 'jenkins_version', key: 'jenkins_version', width: 100 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '操作', key: 'action', width: 200, fixed: 'right' },
];

// 删除Master
const handleDeleteMaster = async (id: number) => {
  try {
    await deleteJenkinsMaster(id);
    message.success('删除成功');
    loadMasters();
  } catch (error) {
    message.error('删除失败');
  }
};

// 刷新Master状态
const handleRefreshMasterStatus = async (id: number) => {
  try {
    await checkMasterStatus(id);
    message.success('状态已刷新');
    loadMasters();
  } catch (error) {
    message.error('刷新状态失败');
  }
};

// 启动/停止Jenkins
const handleToggleMaster = async (master: JenkinsMaster) => {
  try {
    if (master.status === 'running') {
      await stopJenkins(master.id!);
      message.success('停止命令已发送');
    } else {
      await startJenkins(master.id!);
      message.success('启动命令已发送');
    }
    setTimeout(loadMasters, 2000);
  } catch (error) {
    message.error('操作失败');
  }
};

// 查看日志
const handleViewMasterLog = (master: JenkinsMaster) => {
  currentLogTitle.value = `部署日志 - ${master.name}`;
  currentLog.value = master.deploy_log || '暂无日志';
  logModalVisible.value = true;
};

// ==================== Node相关 ====================

// 加载Node列表
const loadNodes = async () => {
  nodeLoading.value = true;
  try {
    nodeList.value = await fetchJenkinsNodes();
  } catch (error) {
    console.error('加载Node列表失败:', error);
    message.error('加载Node列表失败');
  } finally {
    nodeLoading.value = false;
  }
};

// 过滤后的Node列表
const filteredNodeList = computed(() => {
  return nodeList.value.filter((item) => {
    const matchSearch =
      !nodeSearchText.value ||
      item.name.toLowerCase().includes(nodeSearchText.value.toLowerCase()) ||
      item.host.toLowerCase().includes(nodeSearchText.value.toLowerCase());
    const matchStatus = !nodeStatusFilter.value || item.status === nodeStatusFilter.value;
    return matchSearch && matchStatus;
  });
});

// Node表格列
const nodeColumns = [
  { title: '名称', dataIndex: 'name', key: 'name', width: 150 },
  { title: '主机地址', dataIndex: 'host', key: 'host', width: 150 },
  { title: 'SSH端口', dataIndex: 'port', key: 'port', width: 80 },
  { title: '地域', dataIndex: 'region', key: 'region', width: 100 },
  { title: '资源类型', dataIndex: 'resource_type', key: 'resource_type', width: 100 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '操作', key: 'action', width: 200, fixed: 'right' },
];

// 删除Node
const handleDeleteNode = async (id: number) => {
  try {
    await deleteJenkinsNode(id);
    message.success('删除成功');
    loadNodes();
  } catch (error) {
    message.error('删除失败');
  }
};

// 刷新Node状态
const handleRefreshNodeStatus = async (id: number) => {
  try {
    await checkJenkinsNodeStatus(id);
    message.success('状态已刷新');
    loadNodes();
  } catch (error) {
    message.error('刷新状态失败');
  }
};

// 启动/停止Agent
const handleToggleNode = async (node: JenkinsNode) => {
  try {
    if (node.status === 'deployed') {
      await stopJenkinsAgent(node.id!);
      message.success('停止命令已发送');
    } else {
      await startJenkinsAgent(node.id!);
      message.success('启动命令已发送');
    }
    setTimeout(loadNodes, 2000);
  } catch (error) {
    message.error('操作失败');
  }
};

// 查看日志
const handleViewNodeLog = (node: JenkinsNode) => {
  currentLogTitle.value = `部署日志 - ${node.name}`;
  currentLog.value = node.deploy_log || '暂无日志';
  logModalVisible.value = true;
};

// ==================== 统计数据 ====================

const masterStats = computed(() => ({
  total: masterList.value.length,
  running: masterList.value.filter((m) => m.status === 'running' || m.status === 'deployed').length,
  stopped: masterList.value.filter((m) => m.status === 'stopped' || m.status === 'failed').length,
}));

const nodeStats = computed(() => ({
  total: nodeList.value.length,
  deployed: nodeList.value.filter((n) => n.status === 'deployed').length,
  offline: nodeList.value.filter((n) => n.status === 'offline' || n.status === 'failed').length,
}));

// ==================== 导航 ====================

const goToDeployMaster = () => {
  router.push('/SMP/JenkinsDeployment/DeployMaster');
};

const goToDeployNode = () => {
  router.push('/SMP/JenkinsDeployment/DeployNode');
};

const goToEditMaster = (id: number) => {
  router.push(`/SMP/JenkinsDeployment/DeployMaster?id=${id}`);
};

const goToEditNode = (id: number) => {
  router.push(`/SMP/JenkinsDeployment/DeployNode?id=${id}`);
};

// ==================== 获取资源类型文本 ====================

const getResourceTypeText = (type?: string) => {
  switch (type) {
    case 'cpu': return 'CPU';
    case 'single_gpu': return '单卡GPU';
    case 'multi_gpu': return '多卡GPU';
    default: return type || '-';
  }
};

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

// Tab切换时加载数据
const handleTabChange = (key: string) => {
  activeTab.value = key;
  if (key === 'master') {
    loadMasters();
  } else {
    loadNodes();
  }
};
</script>

<template>
  <div class="jenkins-deployment-container">
    <!-- 统计卡片 -->
    <Row :gutter="16" class="stats-row">
      <Col :span="6">
        <Card>
          <Statistic
            title="Master节点总数"
            :value="masterStats.total"
            :value-style="{ color: '#1890ff' }"
          >
            <template #prefix>
              <CloudServerOutlined />
            </template>
          </Statistic>
        </Card>
      </Col>
      <Col :span="6">
        <Card>
          <Statistic
            title="Master运行中"
            :value="masterStats.running"
            :value-style="{ color: '#52c41a' }"
          />
        </Card>
      </Col>
      <Col :span="6">
        <Card>
          <Statistic
            title="Node节点总数"
            :value="nodeStats.total"
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
            title="Node已部署"
            :value="nodeStats.deployed"
            :value-style="{ color: '#52c41a' }"
          />
        </Card>
      </Col>
    </Row>

    <!-- 主内容区域 -->
    <Card class="main-card">
      <Tabs v-model:activeKey="activeTab" @change="handleTabChange">
        <!-- Master节点Tab -->
        <Tabs.TabPane key="master" tab="Jenkins Master">
          <div class="table-toolbar">
            <Space>
              <Input
                v-model:value="masterSearchText"
                placeholder="搜索名称或地址"
                style="width: 200px"
                allowClear
              >
                <template #prefix>
                  <SearchOutlined />
                </template>
              </Input>
              <Select
                v-model:value="masterStatusFilter"
                placeholder="状态筛选"
                style="width: 120px"
                allowClear
              >
                <Select.Option value="pending">待部署</Select.Option>
                <Select.Option value="deploying">部署中</Select.Option>
                <Select.Option value="deployed">已部署</Select.Option>
                <Select.Option value="running">运行中</Select.Option>
                <Select.Option value="stopped">已停止</Select.Option>
                <Select.Option value="failed">失败</Select.Option>
              </Select>
            </Space>
            <Space>
              <Button @click="loadMasters">
                <template #icon><ReloadOutlined /></template>
                刷新
              </Button>
              <Button type="primary" @click="goToDeployMaster">
                <template #icon><PlusOutlined /></template>
                部署Master
              </Button>
            </Space>
          </div>

          <Table
            :columns="masterColumns"
            :dataSource="filteredMasterList"
            :loading="masterLoading"
            :rowKey="(record) => record.id"
            :scroll="{ x: 1000 }"
            :pagination="{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'region'">
                {{ getRegionText(record.region) }}
              </template>
              <template v-else-if="column.key === 'status'">
                <Tag :color="getStatusColor(record.status)">
                  {{ getStatusText(record.status) }}
                </Tag>
              </template>
              <template v-else-if="column.key === 'action'">
                <Space>
                  <Tooltip title="查看日志">
                    <Button size="small" @click="handleViewMasterLog(record)">
                      <template #icon><EyeOutlined /></template>
                    </Button>
                  </Tooltip>
                  <Tooltip title="刷新状态">
                    <Button size="small" @click="handleRefreshMasterStatus(record.id)">
                      <template #icon><ReloadOutlined /></template>
                    </Button>
                  </Tooltip>
                  <Tooltip :title="record.status === 'running' ? '停止' : '启动'">
                    <Button
                      size="small"
                      :type="record.status === 'running' ? 'default' : 'primary'"
                      :disabled="record.status === 'deploying' || record.status === 'pending'"
                      @click="handleToggleMaster(record)"
                    >
                      <template #icon>
                        <PauseCircleOutlined v-if="record.status === 'running'" />
                        <PlayCircleOutlined v-else />
                      </template>
                    </Button>
                  </Tooltip>
                  <Popconfirm
                    title="确定要删除这个Master吗？"
                    @confirm="handleDeleteMaster(record.id)"
                  >
                    <Button size="small" danger>
                      <template #icon><DeleteOutlined /></template>
                    </Button>
                  </Popconfirm>
                </Space>
              </template>
            </template>
          </Table>
        </Tabs.TabPane>

        <!-- Node节点Tab -->
        <Tabs.TabPane key="node" tab="Jenkins Node">
          <div class="table-toolbar">
            <Space>
              <Input
                v-model:value="nodeSearchText"
                placeholder="搜索名称或地址"
                style="width: 200px"
                allowClear
              >
                <template #prefix>
                  <SearchOutlined />
                </template>
              </Input>
              <Select
                v-model:value="nodeStatusFilter"
                placeholder="状态筛选"
                style="width: 120px"
                allowClear
              >
                <Select.Option value="pending">待部署</Select.Option>
                <Select.Option value="deploying">部署中</Select.Option>
                <Select.Option value="deployed">已部署</Select.Option>
                <Select.Option value="failed">失败</Select.Option>
                <Select.Option value="offline">离线</Select.Option>
              </Select>
            </Space>
            <Space>
              <Button @click="loadNodes">
                <template #icon><ReloadOutlined /></template>
                刷新
              </Button>
              <Button type="primary" @click="goToDeployNode">
                <template #icon><PlusOutlined /></template>
                部署Node
              </Button>
            </Space>
          </div>

          <Table
            :columns="nodeColumns"
            :dataSource="filteredNodeList"
            :loading="nodeLoading"
            :rowKey="(record) => record.id"
            :scroll="{ x: 1000 }"
            :pagination="{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'region'">
                {{ getNodeRegionText(record.region) }}
              </template>
              <template v-else-if="column.key === 'resource_type'">
                <Tag>{{ getResourceTypeText(record.resource_type) }}</Tag>
              </template>
              <template v-else-if="column.key === 'status'">
                <Tag :color="getNodeStatusColor(record.status)">
                  {{ getNodeStatusText(record.status) }}
                </Tag>
              </template>
              <template v-else-if="column.key === 'action'">
                <Space>
                  <Tooltip title="查看日志">
                    <Button size="small" @click="handleViewNodeLog(record)">
                      <template #icon><EyeOutlined /></template>
                    </Button>
                  </Tooltip>
                  <Tooltip title="刷新状态">
                    <Button size="small" @click="handleRefreshNodeStatus(record.id)">
                      <template #icon><ReloadOutlined /></template>
                    </Button>
                  </Tooltip>
                  <Tooltip :title="record.status === 'deployed' ? '停止' : '启动'">
                    <Button
                      size="small"
                      :type="record.status === 'deployed' ? 'default' : 'primary'"
                      :disabled="record.status === 'deploying' || record.status === 'pending'"
                      @click="handleToggleNode(record)"
                    >
                      <template #icon>
                        <PauseCircleOutlined v-if="record.status === 'deployed'" />
                        <PlayCircleOutlined v-else />
                      </template>
                    </Button>
                  </Tooltip>
                  <Popconfirm
                    title="确定要删除这个Node吗？"
                    @confirm="handleDeleteNode(record.id)"
                  >
                    <Button size="small" danger>
                      <template #icon><DeleteOutlined /></template>
                    </Button>
                  </Popconfirm>
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
.jenkins-deployment-container {
  padding: 16px;
}

.stats-row {
  margin-bottom: 16px;
}

.main-card {
  min-height: 500px;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.log-content {
  background-color: #1e1e1e;
  color: #d4d4d4;
  padding: 16px;
  border-radius: 4px;
  max-height: 500px;
  overflow-y: auto;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
