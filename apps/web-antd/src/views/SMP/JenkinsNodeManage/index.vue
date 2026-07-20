<script lang="ts" setup>
import type { JenkinsNode, ResourceSpec } from '../api/jenkinsNode';

import { h, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  CheckCircleOutlined,
  CloudServerOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  LoadingOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  PoweroffOutlined,
  ReloadOutlined,
  SearchOutlined,
  SyncOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import {
  checkJenkinsNodeStatus,
  deleteJenkinsNode,
  fetchJenkinsNodes,
  getContainerTypeText,
  getOsText,
  getRegionText,
  getResourceTypeText,
  getStatusColor,
  getStatusText,
  startJenkinsAgent,
  stopJenkinsAgent,
  uninstallJenkinsAgent,
} from '../api/jenkinsNode';

const router = useRouter();

// 状态
const allNodes = ref<JenkinsNode[]>([]);
const displayNodes = ref<JenkinsNode[]>([]);
const loading = ref(false);
const searchKey = ref('');
const statusFilter = ref<string>('');
const osFilter = ref<string>('');
const logModalVisible = ref(false);
const currentLog = ref('');
const currentLogNode = ref<JenkinsNode | null>(null);
const operatingNodeIds = ref<Set<number>>(new Set());

// 定时刷新
let refreshTimer: ReturnType<typeof setInterval> | null = null;

// 表格列配置
const columns = [
  {
    title: '节点名称',
    dataIndex: 'name',
    key: 'name',
    width: '12%',
    customRender: ({ record }: { record: JenkinsNode }) => {
      return h('div', { class: 'flex items-center gap-2' }, [
        h(CloudServerOutlined, { class: 'text-blue-500 text-lg' }),
        h('div', [
          h('div', { class: 'font-medium' }, record.name),
          h('div', { class: 'text-xs text-gray-400' }, record.agent_name || '-'),
        ]),
      ]);
    },
  },
  {
    title: '主机信息',
    dataIndex: 'host',
    key: 'host',
    width: '18%',
    customRender: ({ record }: { record: JenkinsNode }) => {
      return h('div', { class: 'font-mono text-sm' }, [
        h('div', `${record.host}:${record.port}`),
        h('div', { class: 'text-xs text-gray-400' }, `用户: ${record.username}`),
      ]);
    },
  },
  {
    title: '操作系统',
    dataIndex: 'os_type',
    key: 'os_type',
    width: '8%',
    customRender: ({ record }: { record: JenkinsNode }) => {
      const osColors: Record<string, string> = {
        linux: 'orange',
        macos: 'geekblue',
        windows: 'blue',
      };
      return h(Tag, { color: osColors[record.os_type] || 'default' }, () => getOsText(record.os_type));
    },
  },
  {
    title: '资源配置',
    dataIndex: 'resource',
    key: 'resource',
    width: '18%',
    customRender: ({ record }: { record: JenkinsNode }) => {
      const items = [];

      // 地域
      if (record.region) {
        items.push(h(Tag, { color: 'geekblue', class: 'mb-1' }, () => getRegionText(record.region)));
      }

      // 容器类型
      if (record.container_type) {
        const containerColors: Record<string, string> = {
          cce: 'purple',
          docker: 'cyan',
        };
        items.push(h(Tag, { color: containerColors[record.container_type] || 'default', class: 'mb-1' }, () => getContainerTypeText(record.container_type)));
      }

      // 资源类型
      if (record.resource_type) {
        const resourceColors: Record<string, string> = {
          cpu: 'blue',
          single_gpu: 'green',
          multi_gpu: 'orange',
        };
        items.push(h(Tag, { color: resourceColors[record.resource_type] || 'default', class: 'mb-1' }, () => getResourceTypeText(record.resource_type)));
      }

      // 资源详情
      const specs = [];
      if (record.cpu_cores) {
        specs.push(`${record.cpu_cores}核`);
      }
      if (record.ram_gb) {
        specs.push(`${record.ram_gb}GB`);
      }
      if (record.gpu_memory && record.gpu_count) {
        specs.push(`${record.gpu_count}xGPU`);
      } else if (record.gpu_memory) {
        specs.push(`GPU ${record.gpu_memory}GB`);
      }

      if (specs.length > 0) {
        items.push(h('div', { class: 'text-xs text-gray-400 mt-1' }, specs.join(' / ')));
      }

      return h('div', { class: 'flex flex-wrap gap-1' }, items.length ? items : [h('span', { class: 'text-gray-400' }, '-')]);
    },
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: '10%',
    customRender: ({ record }: { record: JenkinsNode }) => {
      const icons: Record<string, any> = {
        deployed: CheckCircleOutlined,
        deploying: LoadingOutlined,
        pending: ExclamationCircleOutlined,
        failed: ExclamationCircleOutlined,
        offline: PoweroffOutlined,
      };
      const IconComponent = icons[record.status || 'pending'] || ExclamationCircleOutlined;
      return h(
        Tag,
        { color: getStatusColor(record.status) },
        () => h('span', { class: 'flex items-center gap-1' }, [
          h(IconComponent, { spin: record.status === 'deploying' }),
          getStatusText(record.status),
        ])
      );
    },
  },
  {
    title: '环境配置',
    dataIndex: 'config',
    key: 'config',
    width: '15%',
    customRender: ({ record }: { record: JenkinsNode }) => {
      const configs = [];
      if (record.java_version) {
        configs.push(h(Tag, { color: 'red', class: 'mb-1' }, () => `Java ${record.java_version}`));
      }
      if (record.python_version) {
        configs.push(h(Tag, { color: 'green', class: 'mb-1' }, () => `Python ${record.python_version}`));
      }
      return h('div', { class: 'flex flex-wrap gap-1' }, configs.length ? configs : [h('span', { class: 'text-gray-400' }, '-')]);
    },
  },
  {
    title: '工作目录',
    dataIndex: 'work_dir',
    key: 'work_dir',
    width: '15%',
    ellipsis: true,
    customRender: ({ record }: { record: JenkinsNode }) => {
      return h(
        Tooltip,
        { title: record.work_dir },
        () => h('span', { class: 'font-mono text-xs' }, record.work_dir || '-')
      );
    },
  },
  {
    title: '操作',
    key: 'action',
    width: '20%',
    fixed: 'right',
    customRender: ({ record }: { record: JenkinsNode }) => {
      const isOperating = operatingNodeIds.value.has(record.id!);
      const isDeployed = record.status === 'deployed';
      const isDeploying = record.status === 'deploying';
      const isPending = record.status === 'pending';

      return h(Space, { size: 'small' }, () => [
        // 部署按钮
        h(
          Tooltip,
          { title: isDeployed ? '重新部署' : '部署节点' },
          () => h(
            Button,
            {
              type: 'link',
              size: 'small',
              disabled: isDeploying || isOperating,
              onClick: () => goToDeploy(record),
            },
            () => [h(PlayCircleOutlined), isPending ? ' 部署' : ' 重部署']
          )
        ),
        // 状态刷新按钮
        h(
          Tooltip,
          { title: '刷新状态' },
          () => h(
            Button,
            {
              type: 'link',
              size: 'small',
              disabled: isOperating,
              onClick: () => refreshNodeStatus(record),
            },
            () => h(SyncOutlined, { spin: isOperating })
          )
        ),
        // 查看日志按钮
        h(
          Tooltip,
          { title: '查看日志' },
          () => h(
            Button,
            {
              type: 'link',
              size: 'small',
              onClick: () => showLog(record),
            },
            () => h(EyeOutlined)
          )
        ),
        // 启动/停止按钮
        isDeployed && h(
          Tooltip,
          { title: '停止Agent' },
          () => h(
            Button,
            {
              type: 'link',
              size: 'small',
              danger: true,
              disabled: isOperating,
              onClick: () => handleStopAgent(record),
            },
            () => h(PauseCircleOutlined)
          )
        ),
        record.status === 'offline' && h(
          Tooltip,
          { title: '启动Agent' },
          () => h(
            Button,
            {
              type: 'link',
              size: 'small',
              disabled: isOperating,
              onClick: () => handleStartAgent(record),
            },
            () => h(PlayCircleOutlined)
          )
        ),
        // 编辑按钮
        h(
          Tooltip,
          { title: '编辑' },
          () => h(
            Button,
            {
              type: 'link',
              size: 'small',
              disabled: isDeploying,
              onClick: () => editNode(record),
            },
            () => h(EditOutlined)
          )
        ),
        // 删除按钮
        h(
          Popconfirm,
          {
            title: '确定删除此节点吗？',
            description: '删除后将无法恢复，如已部署请先卸载Agent',
            onConfirm: () => handleDelete(record),
            okText: '删除',
            cancelText: '取消',
          },
          () => h(
            Button,
            {
              type: 'link',
              size: 'small',
              danger: true,
              disabled: isDeploying,
            },
            () => h(DeleteOutlined)
          )
        ),
      ]);
    },
  },
];

// 加载节点数据
const loadNodes = async () => {
  try {
    loading.value = true;
    const response = await fetchJenkinsNodes();
    allNodes.value = response || [];
    applyFilters();
  } catch (error) {
    console.error('加载节点失败:', error);
    message.error('加载节点列表失败');
  } finally {
    loading.value = false;
  }
};

// 应用过滤
const applyFilters = () => {
  let filtered = [...allNodes.value];

  if (searchKey.value) {
    const key = searchKey.value.toLowerCase();
    filtered = filtered.filter(
      (n) =>
        n.name?.toLowerCase().includes(key) ||
        n.host?.toLowerCase().includes(key) ||
        n.agent_name?.toLowerCase().includes(key) ||
        n.username?.toLowerCase().includes(key)
    );
  }

  if (statusFilter.value) {
    filtered = filtered.filter((n) => n.status === statusFilter.value);
  }

  if (osFilter.value) {
    filtered = filtered.filter((n) => n.os_type === osFilter.value);
  }

  displayNodes.value = filtered;
};

// 跳转到部署页面
const goToDeploy = (node: JenkinsNode) => {
  const timestamp = Date.now();
  router.push({
    path: '/SMP/JenkinsNodeManage/DeployNode',
    query: { id: node.id?.toString(), deploy: 'true', t: timestamp.toString() },
  });
};

// 编辑节点
const editNode = (node: JenkinsNode) => {
  const timestamp = Date.now();
  router.push({
    path: '/SMP/JenkinsNodeManage/DeployNode',
    query: { id: node.id?.toString(), edit: 'true', t: timestamp.toString() },
  });
};

// 添加新节点
const addNode = () => {
  const timestamp = Date.now();
  router.push({
    path: '/SMP/JenkinsNodeManage/DeployNode',
    query: { t: timestamp.toString() },
  });
};

// 刷新节点状态
const refreshNodeStatus = async (node: JenkinsNode) => {
  if (!node.id) return;

  operatingNodeIds.value.add(node.id);
  try {
    const result = await checkJenkinsNodeStatus(node.id);
    if (result.success) {
      // 更新本地状态
      const idx = allNodes.value.findIndex((n) => n.id === node.id);
      if (idx !== -1) {
        allNodes.value[idx].status = result.status as any;
      }
      applyFilters();
      message.success(`节点状态: ${result.status}`);
    } else {
      message.warning('无法获取节点状态');
    }
  } catch (error) {
    console.error('刷新状态失败:', error);
    message.error('刷新状态失败');
  } finally {
    operatingNodeIds.value.delete(node.id);
  }
};

// 停止Agent
const handleStopAgent = async (node: JenkinsNode) => {
  if (!node.id) return;

  operatingNodeIds.value.add(node.id);
  try {
    const result = await stopJenkinsAgent(node.id);
    if (result.success) {
      message.success('Agent已停止');
      await loadNodes();
    } else {
      message.error(result.message || '停止Agent失败');
    }
  } catch (error) {
    console.error('停止Agent失败:', error);
    message.error('停止Agent失败');
  } finally {
    operatingNodeIds.value.delete(node.id);
  }
};

// 启动Agent
const handleStartAgent = async (node: JenkinsNode) => {
  if (!node.id) return;

  operatingNodeIds.value.add(node.id);
  try {
    const result = await startJenkinsAgent(node.id);
    if (result.success) {
      message.success('Agent已启动');
      await loadNodes();
    } else {
      message.error(result.message || '启动Agent失败');
    }
  } catch (error) {
    console.error('启动Agent失败:', error);
    message.error('启动Agent失败');
  } finally {
    operatingNodeIds.value.delete(node.id);
  }
};

// 卸载Agent
const handleUninstall = async (node: JenkinsNode) => {
  if (!node.id) return;

  Modal.confirm({
    title: '确认卸载',
    content: `确定要卸载节点 "${node.name}" 上的Jenkins Agent吗？这将停止Agent服务并删除相关文件。`,
    okText: '卸载',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      operatingNodeIds.value.add(node.id!);
      try {
        const result = await uninstallJenkinsAgent(node.id!);
        if (result.success) {
          message.success('Agent已卸载');
          await loadNodes();
        } else {
          message.error(result.message || '卸载Agent失败');
        }
      } catch (error) {
        console.error('卸载Agent失败:', error);
        message.error('卸载Agent失败');
      } finally {
        operatingNodeIds.value.delete(node.id!);
      }
    },
  });
};

// 删除节点
const handleDelete = async (node: JenkinsNode) => {
  if (!node.id) return;

  try {
    await deleteJenkinsNode(node.id);
    message.success('节点已删除');
    await loadNodes();
  } catch (error) {
    console.error('删除节点失败:', error);
    message.error('删除节点失败');
  }
};

// 显示日志
const showLog = (node: JenkinsNode) => {
  currentLogNode.value = node;
  currentLog.value = node.deploy_log || '暂无部署日志';
  logModalVisible.value = true;
};

// 清除搜索
const clearSearch = () => {
  searchKey.value = '';
  applyFilters();
};

// 全部刷新
const refreshAll = async () => {
  await loadNodes();
  message.success('已刷新');
};

// 状态选项
const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '待部署', value: 'pending' },
  { label: '部署中', value: 'deploying' },
  { label: '已部署', value: 'deployed' },
  { label: '部署失败', value: 'failed' },
  { label: '离线', value: 'offline' },
];

// 操作系统选项
const osOptions = [
  { label: '全部系统', value: '' },
  { label: 'Linux', value: 'linux' },
  { label: 'macOS', value: 'macos' },
  { label: 'Windows', value: 'windows' },
];

onMounted(() => {
  loadNodes();
  // 每30秒刷新一次
  refreshTimer = setInterval(() => {
    loadNodes();
  }, 30000);
});

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
});

// 监听过滤条件变化
watch([searchKey, statusFilter, osFilter], () => {
  applyFilters();
});
</script>

<template>
  <Page title="作业节点配置" />

  <div class="mt-6 rounded-lg bg-white p-4 shadow">
    <Card>
      <!-- 操作区域 -->
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <Input
            v-model:value="searchKey"
            placeholder="搜索节点名称、主机、用户名..."
            allow-clear
            class="w-64"
            @click:clear="clearSearch"
          >
            <template #prefix>
              <SearchOutlined class="text-gray-400" />
            </template>
          </Input>

          <Select
            v-model:value="statusFilter"
            :options="statusOptions"
            class="w-32"
            placeholder="状态筛选"
          />

          <Select
            v-model:value="osFilter"
            :options="osOptions"
            class="w-32"
            placeholder="系统筛选"
          />

          <Button @click="refreshAll">
            <ReloadOutlined />
            刷新
          </Button>
        </div>

        <Button type="primary" @click="addNode">
          <PlusOutlined />
          添加节点
        </Button>
      </div>

      <!-- 统计信息 -->
      <div class="mb-4 flex gap-4 text-sm">
        <span>
          总计: <strong>{{ allNodes.length }}</strong> 个节点
        </span>
        <span class="text-green-600">
          已部署: <strong>{{ allNodes.filter(n => n.status === 'deployed').length }}</strong>
        </span>
        <span class="text-orange-500">
          待部署: <strong>{{ allNodes.filter(n => n.status === 'pending').length }}</strong>
        </span>
        <span class="text-red-500">
          失败: <strong>{{ allNodes.filter(n => n.status === 'failed').length }}</strong>
        </span>
        <span class="text-gray-500">
          离线: <strong>{{ allNodes.filter(n => n.status === 'offline').length }}</strong>
        </span>
      </div>

      <!-- 节点表格 -->
      <Table
        :data-source="displayNodes"
        :columns="columns"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 10 }"
        :scroll="{ x: 1200 }"
      >
        <template #emptyText>
          <div class="py-8 text-center text-gray-500">
            <CloudServerOutlined class="text-4xl mb-2" />
            <div v-if="searchKey || statusFilter || osFilter" class="mb-2">
              未找到匹配的节点
            </div>
            <div v-else>
              <p class="mb-2">暂无作业节点</p>
              <Button type="primary" @click="addNode">
                添加第一个节点
              </Button>
            </div>
          </div>
        </template>
      </Table>
    </Card>
  </div>

  <!-- 日志查看模态框 -->
  <Modal
    v-model:open="logModalVisible"
    :title="`部署日志 - ${currentLogNode?.name || ''}`"
    :width="800"
    :footer="null"
  >
    <div class="max-h-96 overflow-auto bg-gray-900 p-4 rounded">
      <pre class="text-green-400 text-xs font-mono whitespace-pre-wrap">{{ currentLog }}</pre>
    </div>
  </Modal>
</template>

<style scoped>
.ant-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.09);
}

:deep(.ant-table-thead > tr > th) {
  font-weight: 600;
}

:deep(.ant-table) {
  border-radius: 6px;
  overflow: hidden;
}

:deep(.ant-btn-link) {
  padding: 0 4px;
}

:deep(.ant-input-affix-wrapper) {
  border-radius: 6px;
}

:deep(.ant-select-selector) {
  border-radius: 6px !important;
}
</style>
