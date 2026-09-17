<script lang="ts" setup>
import BusinessPage from '#/components/workspace/BusinessPage.vue';
import { computed, h, onMounted, onUnmounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  RobotOutlined,
  SearchOutlined,
  SyncOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Drawer,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  SelectOption,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import { mepRequestClient } from '#/api/request';

// 类型定义
interface OpenClawInstance {
  id: number;
  uid: string;
  name: string;
  description?: string;
  deployMode: string;
  gatewayHost?: string;
  gatewayPort: number;
  defaultModel?: string;
  status: string;
  containerName?: string;
  processId?: string;
  totalConversations?: number;
  totalMessages?: number;
  createdAt: string;
  updatedAt: string;
}

const router = useRouter();

// 实例列表
const instanceList = ref<OpenClawInstance[]>([]);
const loading = ref(false);
const readError = ref('');

// 操作中的实例ID集合（用于按钮loading状态）
const operatingIds = ref<Set<number>>(new Set());

// 状态轮询定时器
let pollingTimer: number | null = null;
const POLL_INTERVAL = 3000; // 3秒轮询

// 搜索条件
const searchParams = reactive({
  name: '',
  status: undefined as string | undefined,
  deployMode: undefined as string | undefined,
});

// 部署模式选项
const deployModeOptions = [
  { label: 'Docker容器', value: 'docker' },
  { label: 'NPM安装', value: 'npm' },
  { label: '源码构建', value: 'source' },
];

// 表格列
const columns = [
  {
    title: '实例名称',
    dataIndex: 'name',
    key: 'name',
    width: 180,
  },
  {
    title: '部署模式',
    dataIndex: 'deployMode',
    key: 'deployMode',
    width: 120,
    customRender: ({ record }: { record: OpenClawInstance }) => {
      const modeMap: Record<string, { color: string; label: string }> = {
        docker: { color: 'blue', label: 'Docker' },
        npm: { color: 'green', label: 'NPM' },
        source: { color: 'orange', label: '源码' },
      };
      const config = modeMap[record.deployMode] || { color: 'default', label: record.deployMode };
      return h(Tag, { color: config.color }, () => config.label);
    },
  },
  {
    title: 'Gateway地址',
    key: 'gateway',
    width: 200,
    customRender: ({ record }: { record: OpenClawInstance }) => {
      const host = record.gatewayHost || 'localhost';
      return `${host}:${record.gatewayPort}`;
    },
  },
  {
    title: '默认模型',
    dataIndex: 'defaultModel',
    key: 'defaultModel',
    width: 200,
    ellipsis: true,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 120,
    customRender: ({ record }: { record: OpenClawInstance }) => {
      const statusMap: Record<string, { color: string; icon: any; label: string }> = {
        running: { color: 'success', icon: CheckCircleOutlined, label: '运行中' },
        stopped: { color: 'default', icon: PauseCircleOutlined, label: '已停止' },
        starting: { color: 'processing', icon: SyncOutlined, label: '启动中' },
        error: { color: 'error', icon: CloseCircleOutlined, label: '异常' },
      };
      const config = statusMap[record.status] || { color: 'default', icon: ExclamationCircleOutlined, label: record.status };
      return h(Tag, { color: config.color }, () => [
        h(config.icon, { spin: record.status === 'starting' }),
        ` ${config.label}`,
      ]);
    },
  },
  {
    title: '统计',
    key: 'stats',
    width: 120,
    customRender: ({ record }: { record: OpenClawInstance }) => {
      return `${record.totalConversations || 0} 对话 / ${record.totalMessages || 0} 消息`;
    },
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 180,
  },
  {
    title: '操作',
    key: 'action',
    width: 260,
    fixed: 'right',
  },
];

/** 读取实例列表，轮询失败也保留明确错误。 Read instances and retain errors from background polling. */
const fetchData = async (silent = false) => {
  try {
    if (!silent) loading.value = true;
    const res = await mepRequestClient.get<OpenClawInstance[]>('/openclaw/instances');
    instanceList.value = Array.isArray(res) ? res : (res as any).data || [];
    readError.value = '';
  } catch (error) {
    readError.value = 'OpenClaw 实例读取失败，请检查服务与权限后重试。';
    console.error('获取实例列表失败:', error);
    if (!silent) message.error('获取实例列表失败');
  } finally {
    if (!silent) loading.value = false;
  }
};

// 检查是否有实例处于过渡状态（starting等）
const hasTransitionalInstances = () => {
  return instanceList.value.some(
    (item) => item.status === 'starting' || operatingIds.value.size > 0,
  );
};

// 开始状态轮询
const startPolling = () => {
  stopPolling();
  pollingTimer = window.setInterval(async () => {
    await fetchData(true);
    // 如果没有过渡状态的实例了，停止轮询
    if (!hasTransitionalInstances()) {
      stopPolling();
    }
  }, POLL_INTERVAL);
};

// 停止轮询
const stopPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
};

// 过滤后的列表
const filteredList = computed(() => {
  return instanceList.value.filter((item) => {
    if (searchParams.name && !item.name.toLowerCase().includes(searchParams.name.toLowerCase())) {
      return false;
    }
    if (searchParams.status && item.status !== searchParams.status) {
      return false;
    }
    if (searchParams.deployMode && item.deployMode !== searchParams.deployMode) {
      return false;
    }
    return true;
  });
});

// 新增实例
const handleCreate = () => {
  router.push('/MEP/openclaw/create');
};

// 查看详情
const handleView = (record: OpenClawInstance) => {
  router.push({
    path: '/MEP/openclaw/detail',
    query: { id: record.id },
  });
};

// 编辑
const handleEdit = (record: OpenClawInstance) => {
  router.push({
    path: '/MEP/openclaw/create',
    query: { id: record.id },
  });
};

// 删除
const handleDelete = async (id: number) => {
  try {
    await mepRequestClient.delete(`/openclaw/instances/${id}`);
    message.success('删除成功');
    await fetchData();
  } catch (error) {
    console.error('删除失败:', error);
    message.error('删除失败');
  }
};

// 启动（带确认框）
const handleStart = (id: number) => {
  Modal.confirm({
    title: '确认启动',
    content: '确定要启动该OpenClaw实例吗？源码模式首次启动可能需要几分钟。',
    okText: '启动',
    cancelText: '取消',
    onOk: async () => {
      operatingIds.value.add(id);
      try {
        await mepRequestClient.post(`/openclaw/instances/${id}/start`);
        message.success('启动命令已发送，正在部署中...');
        await fetchData(true);
        startPolling();
      } catch (error) {
        console.error('启动失败:', error);
        message.error('启动失败');
      } finally {
        operatingIds.value.delete(id);
      }
    },
  });
};

// 停止（带确认框）
const handleStop = (id: number) => {
  Modal.confirm({
    title: '确认停止',
    content: '确定要停止该OpenClaw实例吗？',
    okText: '停止',
    cancelText: '取消',
    onOk: async () => {
      operatingIds.value.add(id);
      try {
        await mepRequestClient.post(`/openclaw/instances/${id}/stop`);
        message.success('停止成功');
        await fetchData(true);
      } catch (error) {
        console.error('停止失败:', error);
        message.error('停止失败');
      } finally {
        operatingIds.value.delete(id);
      }
    },
  });
};

// 重启（带确认框，仅running状态可用）
const handleRestart = (id: number) => {
  Modal.confirm({
    title: '确认重启',
    content: '将重新配置并启动Gateway（不会重新安装环境）。',
    okText: '重启',
    cancelText: '取消',
    onOk: async () => {
      operatingIds.value.add(id);
      try {
        await mepRequestClient.post(`/openclaw/instances/${id}/restart`);
        message.success('重启命令已发送...');
        await fetchData(true);
        startPolling();
      } catch (error) {
        console.error('重启失败:', error);
        message.error('重启失败');
      } finally {
        operatingIds.value.delete(id);
      }
    },
  });
};

// === 日志抽屉 ===
const logDrawerVisible = ref(false);
const logDrawerTitle = ref('运行日志');
const logContent = ref('');
const logLoading = ref(false);
let logInstanceId: number | null = null;
let logRefreshTimer: number | null = null;

const handleViewLogs = async (record: OpenClawInstance) => {
  logInstanceId = record.id;
  logDrawerTitle.value = `运行日志 - ${record.name}`;
  logDrawerVisible.value = true;
  logContent.value = '';
  await loadLogs();
  startLogPolling();
};

const loadLogs = async () => {
  if (!logInstanceId) return;
  logLoading.value = true;
  try {
    const res = await mepRequestClient.get<any>(
      `/openclaw/instances/${logInstanceId}/logs`,
      { params: { lines: 100 } },
    );
    const data = res?.data ?? res;
    logContent.value = data || '暂无日志';
  } catch {
    logContent.value = '加载日志失败';
  } finally {
    logLoading.value = false;
  }
};

const startLogPolling = () => {
  stopLogPolling();
  logRefreshTimer = window.setInterval(() => {
    if (logDrawerVisible.value) {
      loadLogs();
    } else {
      stopLogPolling();
    }
  }, 5000);
};

const stopLogPolling = () => {
  if (logRefreshTimer) {
    clearInterval(logRefreshTimer);
    logRefreshTimer = null;
  }
};

const onLogDrawerClose = () => {
  stopLogPolling();
  logInstanceId = null;
};

// 重置搜索
const handleReset = () => {
  searchParams.name = '';
  searchParams.status = undefined;
  searchParams.deployMode = undefined;
};

onMounted(() => {
  fetchData();
});

onUnmounted(() => {
  stopPolling();
  stopLogPolling();
});
</script>

<template>
  <BusinessPage domain="服务交付" description="集中管理模型服务、节点与访问密钥，按实际运行结果确认状态。" existing-title :error="readError" :loading="loading" @retry="fetchData()">
  <div class="p-4">
    <!-- 页面标题 -->
    <Card class="mb-4 shadow">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <RobotOutlined class="text-3xl text-blue-500" />
          <div>
            <h2 class="m-0 text-xl font-semibold">OpenClaw部署管理</h2>
            <p class="m-0 text-gray-500">管理OpenClaw个人助手实例的部署和运行</p>
          </div>
        </div>
        <Space>
          <Tooltip title="刷新">
            <Button @click="fetchData">
              <ReloadOutlined />
            </Button>
          </Tooltip>
          <Button type="primary" @click="handleCreate">
            <PlusOutlined />
            新建实例
          </Button>
        </Space>
      </div>
    </Card>

    <!-- 搜索和表格 -->
    <Card class="shadow">
      <!-- 搜索区域 -->
      <div class="mb-4 flex flex-wrap items-center gap-4">
        <Input
          v-model:value="searchParams.name"
          placeholder="搜索实例名称"
          style="width: 200px"
          allow-clear
        >
          <template #prefix>
            <SearchOutlined />
          </template>
        </Input>
        <Select
          v-model:value="searchParams.deployMode"
          placeholder="部署模式"
          style="width: 140px"
          allow-clear
        >
          <SelectOption v-for="opt in deployModeOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </SelectOption>
        </Select>
        <Select
          v-model:value="searchParams.status"
          placeholder="运行状态"
          style="width: 140px"
          allow-clear
        >
          <SelectOption value="running">运行中</SelectOption>
          <SelectOption value="stopped">已停止</SelectOption>
          <SelectOption value="starting">启动中</SelectOption>
          <SelectOption value="error">异常</SelectOption>
        </Select>
        <Button @click="handleReset">重置</Button>
      </div>

      <!-- 表格 -->
      <Table
        :columns="columns"
        :data-source="filteredList"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 10, showSizeChanger: true }"
        :scroll="{ x: 1400 }"
        bordered
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <a class="text-blue-500 hover:text-blue-600" @click="handleView(record)">
              {{ record.name }}
            </a>
          </template>
          <template v-if="column.key === 'action'">
            <Space>
              <Tooltip :title="record.status === 'running' ? '停止' : '启动'">
                <Button
                  v-if="record.status === 'running'"
                  type="text"
                  size="small"
                  :loading="operatingIds.has(record.id)"
                  @click="handleStop(record.id)"
                >
                  <template v-if="!operatingIds.has(record.id)" #icon>
                    <PauseCircleOutlined class="text-orange-500" />
                  </template>
                </Button>
                <Button
                  v-else
                  type="text"
                  size="small"
                  :disabled="record.status === 'starting'"
                  :loading="operatingIds.has(record.id) || record.status === 'starting'"
                  @click="handleStart(record.id)"
                >
                  <template v-if="!operatingIds.has(record.id) && record.status !== 'starting'" #icon>
                    <PlayCircleOutlined class="text-green-500" />
                  </template>
                </Button>
              </Tooltip>
              <Tooltip title="重启">
                <Button
                  type="text"
                  size="small"
                  :disabled="record.status !== 'running' || operatingIds.has(record.id)"
                  :loading="operatingIds.has(record.id) && record.status === 'running'"
                  @click="handleRestart(record.id)"
                >
                  <template v-if="!operatingIds.has(record.id)" #icon>
                    <ReloadOutlined class="text-blue-500" />
                  </template>
                </Button>
              </Tooltip>
              <Tooltip title="日志">
                <Button type="text" size="small" @click="handleViewLogs(record)">
                  <FileTextOutlined class="text-gray-500" />
                </Button>
              </Tooltip>
              <Tooltip title="查看">
                <Button type="text" size="small" @click="handleView(record)">
                  <EyeOutlined class="text-blue-500" />
                </Button>
              </Tooltip>
              <Tooltip title="编辑">
                <Button type="text" size="small" @click="handleEdit(record)">
                  <EditOutlined class="text-blue-500" />
                </Button>
              </Tooltip>
              <Popconfirm
                title="确定要删除该实例吗？"
                ok-text="确定"
                cancel-text="取消"
                @confirm="handleDelete(record.id)"
              >
                <Tooltip title="删除">
                  <Button type="text" size="small" danger>
                    <DeleteOutlined />
                  </Button>
                </Tooltip>
              </Popconfirm>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <!-- 日志抽屉 -->
    <Drawer
      :open="logDrawerVisible"
      :title="logDrawerTitle"
      placement="right"
      :width="680"
      @close="logDrawerVisible = false"
      @afterOpenChange="(open: boolean) => { if (!open) onLogDrawerClose(); }"
    >
      <div class="mb-2 flex items-center justify-between">
        <span class="text-xs text-gray-400">每5秒自动刷新</span>
        <Button size="small" :loading="logLoading" @click="loadLogs">
          <ReloadOutlined /> 刷新
        </Button>
      </div>
      <Spin :spinning="logLoading && !logContent">
        <div class="log-drawer-container">
          <pre class="log-drawer-content">{{ logContent || '暂无日志' }}</pre>
        </div>
      </Spin>
    </Drawer>
  </div>

  </BusinessPage>
</template>

<style scoped>
.log-drawer-container {
  max-height: calc(100vh - 140px);
  overflow: auto;
  background: #1e1e1e;
  border-radius: 4px;
}

.log-drawer-content {
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
