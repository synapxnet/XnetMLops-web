<script lang="ts" setup>
import type { DeployNode } from '../api/types';

import { computed, h, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  CheckCircleOutlined,
  CloudServerOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
  SyncOutlined,
  ToolOutlined,
} from '@ant-design/icons-vue';
import {
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  DescriptionsItem,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  SelectOption,
  Space,
  Statistic,
  Table,
  Tabs,
  TabPane,
  Tag,
  Textarea,
  Tooltip,
} from 'ant-design-vue';

import {
  createNode,
  deleteNode,
  fetchNodeList,
  fetchNodeResources,
  refreshNodeStatus,
  setNodeMaintenance,
  testNodeConnection,
  updateNode,
} from '../api/node';

const router = useRouter();

// 节点列表
const nodeList = ref<DeployNode[]>([]);
const loading = ref(false);
const expandedRowKeys = ref<number[]>([]);

// 搜索条件
const searchParams = reactive({
  name: '',
  status: undefined as 'online' | 'offline' | 'maintenance' | undefined,
});

// 模态框状态
const modalVisible = ref(false);
const modalLoading = ref(false);
const isEditing = ref(false);
const testLoading = ref(false);
const testResult = ref<{ success: boolean; message: string; docker_version?: string } | null>(null);

// 表单数据
const formState = reactive({
  id: 0,
  name: '',
  ip_address: '',
  port: 22,
  cpu_cores: 4,
  memory_gb: 8,
  gpu_info: '',
  labels: [] as string[],
  description: '',
});

// 节点资源数据
const nodeResources = ref<Record<number, {
  cpu_usage: number;
  memory_usage: number;
  memory_total: number;
  disk_usage: number;
  disk_total: number;
  containers_running: number;
}>>({});

// 表格列定义
const columns = [
  {
    title: '节点名称',
    dataIndex: 'name',
    key: 'name',
    width: 180,
  },
  {
    title: 'IP地址',
    dataIndex: 'ipAddress',
    key: 'ipAddress',
    width: 150,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 120,
    customRender: ({ record }: { record: DeployNode }) => {
      const statusMap = {
        online: { color: 'success', icon: CheckCircleOutlined, label: '在线' },
        offline: { color: 'error', icon: ExclamationCircleOutlined, label: '离线' },
        maintenance: { color: 'warning', icon: ToolOutlined, label: '维护中' },
      };
      const config = statusMap[record.status];
      return h(Tag, { color: config.color }, () => [
        h(config.icon),
        ` ${config.label}`,
      ]);
    },
  },
  {
    title: '配置',
    key: 'config',
    width: 200,
    customRender: ({ record }: { record: DeployNode }) => {
      return h('div', [
        h('span', `CPU: ${record.cpuCores}核`),
        h('span', { class: 'mx-2 text-gray-300' }, '|'),
        h('span', `内存: ${record.memoryGb}GB`),
      ]);
    },
  },
  {
    title: 'Docker',
    key: 'docker',
    width: 120,
    customRender: ({ record }: { record: DeployNode }) => {
      return h('span', record.dockerVersion || '-');
    },
  },
  {
    title: 'Nginx',
    key: 'nginx',
    width: 100,
    customRender: ({ record }: { record: DeployNode }) => {
      return h(Badge, {
        status: record.nginxStatus === 'running' ? 'success' : 'default',
        text: record.nginxStatus === 'running' ? '运行中' : '已停止',
      });
    },
  },
  {
    title: '标签',
    key: 'labels',
    width: 150,
    customRender: ({ record }: { record: DeployNode }) => {
      const labels = typeof record.labels === 'string' ? JSON.parse(record.labels || '[]') : (record.labels || []);
      if (!labels || labels.length === 0) {
        return h('span', { class: 'text-gray-400' }, '无');
      }
      return h(
        'div',
        { class: 'flex flex-wrap gap-1' },
        labels.slice(0, 3).map((label: string) =>
          h(Tag, { key: label, size: 'small' }, () => label)
        )
      );
    },
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 150,
  },
  {
    title: '操作',
    key: 'action',
    width: 200,
    fixed: 'right',
  },
];

// 获取数据
const fetchData = async () => {
  try {
    loading.value = true;
    const data = await fetchNodeList();
    nodeList.value = data.map((item) => ({ ...item, key: item.id }));
  } catch (error) {
    console.error('获取节点列表失败:', error);
  } finally {
    loading.value = false;
  }
};

// 过滤后的列表
const filteredList = computed(() => {
  return nodeList.value.filter((item) => {
    if (searchParams.name && !item.name.toLowerCase().includes(searchParams.name.toLowerCase())) {
      return false;
    }
    if (searchParams.status && item.status !== searchParams.status) {
      return false;
    }
    return true;
  });
});

// 重置搜索
const handleReset = () => {
  searchParams.name = '';
  searchParams.status = undefined;
};

// 打开新增模态框
const handleAdd = () => {
  isEditing.value = false;
  testResult.value = null;
  Object.assign(formState, {
    id: 0,
    name: '',
    ip_address: '',
    port: 22,
    cpu_cores: 4,
    memory_gb: 8,
    gpu_info: '',
    labels: [],
    description: '',
  });
  modalVisible.value = true;
};

// 打开编辑模态框
const handleEdit = (record: DeployNode) => {
  isEditing.value = true;
  testResult.value = null;
  const labels = typeof record.labels === 'string' ? JSON.parse(record.labels) : (record.labels || []);
  Object.assign(formState, {
    id: record.id,
    name: record.name,
    ip_address: record.ipAddress,
    port: record.port,
    cpu_cores: record.cpuCores,
    memory_gb: record.memoryGb,
    gpu_info: record.gpuInfo || '',
    labels: labels,
    description: record.description || '',
  });
  modalVisible.value = true;
};

// 测试连接
const handleTestConnection = async () => {
  if (!formState.ip_address) {
    message.warning('请先输入IP地址');
    return;
  }
  try {
    testLoading.value = true;
    testResult.value = null;
    const result = await testNodeConnection({
      ip_address: formState.ip_address,
      port: formState.port,
    });
    testResult.value = result;
    if (result.success) {
      message.success('连接测试成功');
    } else {
      message.error(result.message || '连接测试失败');
    }
  } catch (error: any) {
    testResult.value = { success: false, message: error?.message || '连接测试失败' };
  } finally {
    testLoading.value = false;
  }
};

// 提交表单
const handleSubmit = async () => {
  if (!formState.name) {
    message.warning('请输入节点名称');
    return;
  }
  if (!formState.ip_address) {
    message.warning('请输入IP地址');
    return;
  }

  try {
    modalLoading.value = true;
    if (isEditing.value) {
      await updateNode(formState.id, {
        name: formState.name,
        ip_address: formState.ip_address,
        port: formState.port,
        cpu_cores: formState.cpu_cores,
        memory_gb: formState.memory_gb,
        gpu_info: formState.gpu_info || null,
        labels: formState.labels,
        description: formState.description,
      });
    } else {
      await createNode({
        name: formState.name,
        ip_address: formState.ip_address,
        port: formState.port,
        cpu_cores: formState.cpu_cores,
        memory_gb: formState.memory_gb,
        gpu_info: formState.gpu_info || null,
        labels: formState.labels,
        description: formState.description,
      });
    }
    modalVisible.value = false;
    await fetchData();
  } catch (error) {
    console.error('操作失败:', error);
  } finally {
    modalLoading.value = false;
  }
};

// 删除节点
const handleDelete = async (id: number) => {
  try {
    await deleteNode(id);
    await fetchData();
  } catch (error) {
    console.error('删除失败:', error);
  }
};

// 刷新节点状态
const handleRefreshStatus = async (id: number) => {
  try {
    await refreshNodeStatus(id);
    await fetchData();
    message.success('节点状态已刷新');
  } catch (error) {
    console.error('刷新状态失败:', error);
  }
};

// 设置维护模式
const handleSetMaintenance = async (id: number, maintenance: boolean) => {
  try {
    await setNodeMaintenance(id, maintenance);
    await fetchData();
  } catch (error) {
    console.error('设置维护模式失败:', error);
  }
};

// 加载节点资源
const loadNodeResources = async (id: number) => {
  try {
    const data = await fetchNodeResources(id);
    nodeResources.value[id] = data;
  } catch (error) {
    console.error('加载节点资源失败:', error);
  }
};

// 展开行
const handleExpand = (expanded: boolean, record: DeployNode) => {
  if (expanded) {
    expandedRowKeys.value = [...expandedRowKeys.value, record.id];
    loadNodeResources(record.id);
  } else {
    expandedRowKeys.value = expandedRowKeys.value.filter((id) => id !== record.id);
  }
};

onMounted(() => {
  fetchData();
});
</script>

<template>
  <div>
    <Card class="p-4 shadow">
    <!-- 搜索区域 -->
    <div class="mb-4 flex flex-wrap items-center justify-between gap-4">
      <div class="flex flex-wrap items-center gap-2">
        <Input
          v-model:value="searchParams.name"
          placeholder="节点名称"
          style="width: 180px"
          allow-clear
        >
          <template #prefix>
            <SearchOutlined />
          </template>
        </Input>
        <Select
          v-model:value="searchParams.status"
          placeholder="节点状态"
          style="width: 140px"
          allow-clear
        >
          <SelectOption value="online">在线</SelectOption>
          <SelectOption value="offline">离线</SelectOption>
          <SelectOption value="maintenance">维护中</SelectOption>
        </Select>
        <Button @click="handleReset">重置</Button>
      </div>

      <div class="flex items-center gap-2">
        <Button type="primary" @click="handleAdd">
          <PlusOutlined />
          新增节点
        </Button>
        <Tooltip title="刷新">
          <Button @click="fetchData">
            <ReloadOutlined />
          </Button>
        </Tooltip>
      </div>
    </div>

    <!-- 表格 -->
    <Table
      :columns="columns"
      :data-source="filteredList"
      :loading="loading"
      :expanded-row-keys="expandedRowKeys"
      row-key="id"
      :pagination="{ pageSize: 10, showSizeChanger: true }"
      :scroll="{ x: 1400 }"
      bordered
      @expand="handleExpand"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <div class="flex items-center">
            <CloudServerOutlined class="mr-2 text-blue-500" />
            <span class="font-medium">{{ record.name }}</span>
          </div>
        </template>

        <template v-if="column.key === 'action'">
          <Space>
            <Tooltip title="编辑">
              <Button type="text" size="small" @click="handleEdit(record)">
                <EditOutlined class="text-blue-500" />
              </Button>
            </Tooltip>
            <Tooltip title="刷新状态">
              <Button type="text" size="small" @click="handleRefreshStatus(record.id)">
                <SyncOutlined class="text-green-500" />
              </Button>
            </Tooltip>
            <Tooltip :title="record.status === 'maintenance' ? '退出维护' : '进入维护'">
              <Button
                type="text"
                size="small"
                @click="handleSetMaintenance(record.id, record.status !== 'maintenance')"
              >
                <ToolOutlined :class="record.status === 'maintenance' ? 'text-orange-500' : 'text-gray-500'" />
              </Button>
            </Tooltip>
            <Popconfirm
              title="确定要删除此节点吗？"
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

      <!-- 展开行详情 -->
      <template #expandedRowRender="{ record }">
        <Tabs>
          <TabPane key="info" tab="基本信息">
            <Descriptions bordered :column="3" size="small">
              <DescriptionsItem label="节点名称">{{ record.name }}</DescriptionsItem>
              <DescriptionsItem label="IP地址">{{ record.ipAddress }}</DescriptionsItem>
              <DescriptionsItem label="端口">{{ record.port }}</DescriptionsItem>
              <DescriptionsItem label="CPU核心数">{{ record.cpuCores }}</DescriptionsItem>
              <DescriptionsItem label="内存(GB)">{{ record.memoryGb }}</DescriptionsItem>
              <DescriptionsItem label="GPU信息">{{ record.gpuInfo || '无' }}</DescriptionsItem>
              <DescriptionsItem label="Docker版本">{{ record.dockerVersion || '未检测' }}</DescriptionsItem>
              <DescriptionsItem label="Nginx状态">
                <Badge
                  :status="record.nginxStatus === 'running' ? 'success' : 'default'"
                  :text="record.nginxStatus === 'running' ? '运行中' : '已停止'"
                />
              </DescriptionsItem>
              <DescriptionsItem label="创建者">{{ record.createdBy }}</DescriptionsItem>
              <DescriptionsItem label="描述" :span="3">{{ record.description || '暂无描述' }}</DescriptionsItem>
            </Descriptions>
          </TabPane>

          <TabPane key="resources" tab="资源使用">
            <Row :gutter="24" v-if="nodeResources[record.id]">
              <Col :span="6">
                <Card size="small">
                  <Statistic title="CPU使用率" :value="nodeResources[record.id].cpu_usage" suffix="%" />
                  <Progress
                    :percent="nodeResources[record.id].cpu_usage"
                    :status="nodeResources[record.id].cpu_usage > 80 ? 'exception' : 'active'"
                    size="small"
                  />
                </Card>
              </Col>
              <Col :span="6">
                <Card size="small">
                  <Statistic
                    title="内存使用"
                    :value="nodeResources[record.id].memory_usage"
                    :suffix="`/ ${nodeResources[record.id].memory_total} GB`"
                  />
                  <Progress
                    :percent="Math.round((nodeResources[record.id].memory_usage / nodeResources[record.id].memory_total) * 100)"
                    size="small"
                  />
                </Card>
              </Col>
              <Col :span="6">
                <Card size="small">
                  <Statistic
                    title="磁盘使用"
                    :value="nodeResources[record.id].disk_usage"
                    :suffix="`/ ${nodeResources[record.id].disk_total} GB`"
                  />
                  <Progress
                    :percent="Math.round((nodeResources[record.id].disk_usage / nodeResources[record.id].disk_total) * 100)"
                    size="small"
                  />
                </Card>
              </Col>
              <Col :span="6">
                <Card size="small">
                  <Statistic title="运行容器" :value="nodeResources[record.id].containers_running" suffix="个" />
                </Card>
              </Col>
            </Row>
            <div v-else class="py-8 text-center text-gray-400">
              <SyncOutlined spin class="mr-2" />
              加载中...
            </div>
          </TabPane>

          <TabPane key="labels" tab="标签">
            <div v-if="record.labels" class="flex flex-wrap gap-2">
              <Tag v-for="label in (typeof record.labels === 'string' ? JSON.parse(record.labels || '[]') : record.labels)" :key="label" color="blue">{{ label }}</Tag>
            </div>
            <div v-else class="text-gray-400">暂无标签</div>
          </TabPane>
        </Tabs>
      </template>
    </Table>
  </Card>

  <!-- 新增/编辑模态框 -->
  <Modal
    v-model:open="modalVisible"
    :title="isEditing ? '编辑节点' : '新增节点'"
    :confirm-loading="modalLoading"
    :width="700"
    @ok="handleSubmit"
  >
    <Form :model="formState" layout="vertical" class="mt-4">
      <Row :gutter="16">
        <Col :span="12">
          <FormItem label="节点名称" required>
            <Input v-model:value="formState.name" placeholder="请输入节点名称" :maxlength="50" />
          </FormItem>
        </Col>
        <Col :span="12">
          <FormItem label="端口">
            <InputNumber v-model:value="formState.port" :min="1" :max="65535" style="width: 100%" />
          </FormItem>
        </Col>
      </Row>

      <FormItem label="IP地址" required>
        <Input
          v-model:value="formState.ip_address"
          placeholder="请输入IP地址"
        >
          <template #addonAfter>
            <Button type="link" size="small" :loading="testLoading" @click="handleTestConnection">
              测试连接
            </Button>
          </template>
        </Input>
        <div v-if="testResult" class="mt-2">
          <span v-if="testResult.success" class="text-green-500">
            <CheckCircleOutlined /> 连接成功
            <span v-if="testResult.docker_version" class="ml-2 text-gray-500">
              Docker: {{ testResult.docker_version }}
            </span>
          </span>
          <span v-else class="text-red-500">{{ testResult.message }}</span>
        </div>
      </FormItem>

      <Row :gutter="16">
        <Col :span="8">
          <FormItem label="CPU核心数">
            <InputNumber v-model:value="formState.cpu_cores" :min="1" :max="128" style="width: 100%" />
          </FormItem>
        </Col>
        <Col :span="8">
          <FormItem label="内存(GB)">
            <InputNumber v-model:value="formState.memory_gb" :min="1" :max="1024" style="width: 100%" />
          </FormItem>
        </Col>
        <Col :span="8">
          <FormItem label="GPU信息">
            <Input v-model:value="formState.gpu_info" placeholder="例如: NVIDIA RTX 4090" />
          </FormItem>
        </Col>
      </Row>

      <FormItem label="标签">
        <Select
          v-model:value="formState.labels"
          mode="tags"
          placeholder="输入标签后按回车添加"
          style="width: 100%"
        />
      </FormItem>

      <FormItem label="描述">
        <Textarea
          v-model:value="formState.description"
          placeholder="请输入节点描述"
          :rows="3"
          :maxlength="200"
        />
      </FormItem>
    </Form>
  </Modal>
  </div>
</template>

<style scoped>
:deep(.ant-table-thead > tr > th) {
  font-weight: 600;
}

:deep(.ant-table) {
  border-radius: 6px;
  overflow: hidden;
}
</style>
