<script lang="ts" setup>
import FeatureDriftEntry from '#/components/feature-drift/FeatureDriftEntry.vue';
import BusinessPage from '#/components/workspace/BusinessPage.vue';
import DeploymentCapability from './DeploymentCapability.vue';
import type { DeploymentStatus, ModelDeployment } from '../api/types';

import { computed, h, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CloudServerOutlined,
  DeleteOutlined,
  EyeOutlined,
  LoadingOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SyncOutlined,
} from '@ant-design/icons-vue';
import {
  Badge,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Input,
  message,
  Popconfirm,
  Select,
  SelectOption,
  Space,
  Table,
  Tabs,
  TabPane,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import {
  deleteDeployment,
  fetchDeploymentList,
  restartDeployment,
  startDeployment,
  stopDeployment,
} from '../api/deployment';

const router = useRouter();

// 部署列表
const deploymentList = ref<ModelDeployment[]>([]);
const loading = ref(false);
const readError = ref('');
const expandedRowKeys = ref<number[]>([]);

// 搜索条件
const searchParams = reactive({
  name: '',
  status: undefined as DeploymentStatus | undefined,
  model_source: undefined as 'mtp' | 'llm' | undefined,
});

// 表格列定义
const columns = [
  {
    title: '部署名称',
    dataIndex: 'name',
    key: 'name',
    width: 180,
  },
  {
    title: '模型来源',
    dataIndex: 'model_source',
    key: 'model_source',
    width: 100,
    customRender: ({ record }: { record: ModelDeployment }) => {
      const sourceMap = {
        mtp: { color: 'blue', label: 'MTP训练' },
        llm: { color: 'green', label: '大模型' },
      };
      const config = sourceMap[record.model_source];
      return h(Tag, { color: config.color }, () => config.label);
    },
  },
  {
    title: '模型名称',
    dataIndex: 'model_name',
    key: 'model_name',
    width: 150,
  },
  {
    title: '部署节点',
    dataIndex: 'node_name',
    key: 'node_name',
    width: 120,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 120,
    customRender: ({ record }: { record: ModelDeployment }) => {
      const statusMap: Record<
        DeploymentStatus,
        { color: string; icon: any; label: string }
      > = {
        pending: { color: 'default', icon: LoadingOutlined, label: '待部署' },
        deploying: { color: 'processing', icon: SyncOutlined, label: '部署中' },
        running: {
          color: 'success',
          icon: CheckCircleOutlined,
          label: '运行中',
        },
        failed: { color: 'error', icon: CloseCircleOutlined, label: '失败' },
        stopped: {
          color: 'default',
          icon: PauseCircleOutlined,
          label: '已停止',
        },
      };
      const config = statusMap[record.status];
      return h(Tag, { color: config.color }, () => [
        h(config.icon, { spin: record.status === 'deploying' }),
        ` ${config.label}`,
      ]);
    },
  },
  {
    title: '服务端点',
    dataIndex: 'endpoint',
    key: 'endpoint',
    ellipsis: true,
  },
  {
    title: '副本数',
    dataIndex: 'replicas',
    key: 'replicas',
    width: 80,
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 180,
  },
  {
    title: '操作',
    key: 'action',
    width: 220,
    fixed: 'right',
  },
];

/** 读取部署列表，失败时保留可重试错误。 Read deployments and retain a retryable failure state. */
const fetchData = async () => {
  try {
    loading.value = true;
    const data = await fetchDeploymentList();
    deploymentList.value = data.map((item) => ({ ...item, key: item.id }));
    readError.value = '';
  } catch (error) {
    readError.value = '模型部署列表读取失败，请检查服务与权限后重试。';
    console.error('获取部署列表失败:', error);
  } finally {
    loading.value = false;
  }
};

// 过滤后的列表
const filteredList = computed(() => {
  return deploymentList.value.filter((item) => {
    if (
      searchParams.name &&
      !item.name.toLowerCase().includes(searchParams.name.toLowerCase())
    ) {
      return false;
    }
    if (searchParams.status && item.status !== searchParams.status) {
      return false;
    }
    if (
      searchParams.model_source &&
      item.model_source !== searchParams.model_source
    ) {
      return false;
    }
    return true;
  });
});

// 重置搜索
const handleReset = () => {
  searchParams.name = '';
  searchParams.status = undefined;
  searchParams.model_source = undefined;
};

// 新增部署
const handleAdd = () => {
  router.push('/MEP/deployment/create');
};

// 查看详情
const handleDetail = (record: ModelDeployment) => {
  router.push({
    path: '/MEP/deployment/detail',
    query: { id: record.id },
  });
};

// 删除
const handleDelete = async (id: number) => {
  try {
    await deleteDeployment(id);
    await fetchData();
  } catch (error) {
    console.error('删除失败:', error);
  }
};

// 启动
const handleStart = async (id: number) => {
  try {
    await startDeployment(id);
    await fetchData();
  } catch (error) {
    console.error('启动失败:', error);
  }
};

// 停止
const handleStop = async (id: number) => {
  try {
    await stopDeployment(id);
    await fetchData();
  } catch (error) {
    console.error('停止失败:', error);
  }
};

// 重启
const handleRestart = async (id: number) => {
  try {
    await restartDeployment(id);
    await fetchData();
  } catch (error) {
    console.error('重启失败:', error);
  }
};

// 展开行
const handleExpand = (expanded: boolean, record: ModelDeployment) => {
  expandedRowKeys.value = expanded
    ? [...expandedRowKeys.value, record.id]
    : expandedRowKeys.value.filter((id) => id !== record.id);
};

// 批量操作
const state = reactive({
  selectedRowKeys: [] as number[],
  batchLoading: false,
});

const hasSelected = computed(() => state.selectedRowKeys.length > 0);

const onSelectChange = (selectedRowKeys: number[]) => {
  state.selectedRowKeys = selectedRowKeys;
};

const handleBatchDelete = async () => {
  if (state.selectedRowKeys.length === 0) return;
  try {
    state.batchLoading = true;
    await Promise.all(state.selectedRowKeys.map((id) => deleteDeployment(id)));
    await fetchData();
    state.selectedRowKeys = [];
    message.success('批量删除成功');
  } catch (error) {
    console.error('批量删除失败:', error);
    message.error('批量删除失败');
  } finally {
    state.batchLoading = false;
  }
};

onMounted(() => {
  fetchData();
});
</script>

<template>
  <BusinessPage
    domain="服务交付"
    description="集中管理模型服务、节点与访问密钥，按实际运行结果确认状态。"
    :error="readError"
    :loading="loading"
    @retry="fetchData"
  >
    <DeploymentCapability />
    <FeatureDriftEntry label="跨域恢复 · 实际灰度与活动模型" />
    <Card class="p-4 shadow">
      <!-- 搜索区域 -->
      <div class="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div class="flex flex-wrap items-center gap-2">
          <Input
            v-model:value="searchParams.name"
            placeholder="部署名称"
            style="width: 180px"
            allow-clear
          >
            <template #prefix>
              <SearchOutlined />
            </template>
          </Input>
          <Select
            v-model:value="searchParams.model_source"
            placeholder="模型来源"
            style="width: 140px"
            allow-clear
          >
            <SelectOption value="mtp">MTP训练</SelectOption>
            <SelectOption value="llm">大模型</SelectOption>
          </Select>
          <Select
            v-model:value="searchParams.status"
            placeholder="部署状态"
            style="width: 140px"
            allow-clear
          >
            <SelectOption value="pending">待部署</SelectOption>
            <SelectOption value="deploying">部署中</SelectOption>
            <SelectOption value="running">运行中</SelectOption>
            <SelectOption value="failed">失败</SelectOption>
            <SelectOption value="stopped">已停止</SelectOption>
          </Select>
          <Button @click="handleReset">重置</Button>
        </div>

        <div class="flex items-center gap-2">
          <Button type="primary" @click="handleAdd">
            <PlusOutlined />
            新建部署
          </Button>
          <Button
            type="primary"
            danger
            :disabled="!hasSelected"
            :loading="state.batchLoading"
            @click="handleBatchDelete"
          >
            <DeleteOutlined />
            批量删除
          </Button>
          <Tooltip title="刷新">
            <Button @click="fetchData">
              <ReloadOutlined />
            </Button>
          </Tooltip>
          <span v-if="hasSelected" class="text-gray-500">
            已选择 {{ state.selectedRowKeys.length }} 项
          </span>
        </div>
      </div>

      <!-- 表格 -->
      <Table
        :columns="columns"
        :data-source="filteredList"
        :loading="loading"
        :expanded-row-keys="expandedRowKeys"
        :row-selection="{
          selectedRowKeys: state.selectedRowKeys,
          onChange: onSelectChange,
        }"
        row-key="id"
        :pagination="{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
        }"
        :scroll="{ x: 1400 }"
        bordered
        @expand="handleExpand"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <a
              @click="handleDetail(record)"
              class="text-blue-500 hover:text-blue-600"
            >
              <CloudServerOutlined class="mr-1" />
              {{ record.name }}
            </a>
          </template>

          <template v-if="column.key === 'endpoint'">
            <a
              v-if="record.endpoint && record.status === 'running'"
              :href="record.endpoint"
              target="_blank"
              class="text-blue-500"
            >
              {{ record.endpoint }}
            </a>
            <span v-else class="text-gray-400">{{
              record.endpoint || '未分配'
            }}</span>
          </template>

          <template v-if="column.key === 'action'">
            <Space>
              <Tooltip title="详情">
                <Button type="text" size="small" @click="handleDetail(record)">
                  <EyeOutlined class="text-blue-500" />
                </Button>
              </Tooltip>
              <template v-if="record.status === 'running'">
                <Tooltip title="停止">
                  <Button
                    type="text"
                    size="small"
                    @click="handleStop(record.id)"
                  >
                    <PauseCircleOutlined class="text-orange-500" />
                  </Button>
                </Tooltip>
                <Tooltip title="重启">
                  <Button
                    type="text"
                    size="small"
                    @click="handleRestart(record.id)"
                  >
                    <ReloadOutlined class="text-purple-500" />
                  </Button>
                </Tooltip>
              </template>
              <template
                v-else-if="
                  record.status === 'stopped' || record.status === 'failed'
                "
              >
                <Tooltip title="启动">
                  <Button
                    type="text"
                    size="small"
                    @click="handleStart(record.id)"
                  >
                    <PlayCircleOutlined class="text-green-500" />
                  </Button>
                </Tooltip>
              </template>
              <template v-else>
                <Button type="text" size="small" disabled>
                  <SyncOutlined spin />
                </Button>
              </template>
              <Popconfirm
                title="确定要删除此部署吗？"
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
                <DescriptionsItem label="部署名称">{{
                  record.name
                }}</DescriptionsItem>
                <DescriptionsItem label="模型名称">{{
                  record.model_name
                }}</DescriptionsItem>
                <DescriptionsItem label="模型版本">{{
                  record.model_version
                }}</DescriptionsItem>
                <DescriptionsItem label="容器名称">{{
                  record.container_name
                }}</DescriptionsItem>
                <DescriptionsItem label="镜像名称">{{
                  record.image_name
                }}</DescriptionsItem>
                <DescriptionsItem label="端口">{{
                  record.port
                }}</DescriptionsItem>
                <DescriptionsItem label="副本数">{{
                  record.replicas
                }}</DescriptionsItem>
                <DescriptionsItem label="部署节点">{{
                  record.node_name
                }}</DescriptionsItem>
                <DescriptionsItem label="创建者">{{
                  record.created_by
                }}</DescriptionsItem>
              </Descriptions>
            </TabPane>
            <TabPane key="resource" tab="资源配置">
              <Descriptions bordered :column="2" size="small">
                <DescriptionsItem label="CPU限制">
                  {{ record.resource_config?.cpu_limit || '未设置' }}
                </DescriptionsItem>
                <DescriptionsItem label="内存限制">
                  {{ record.resource_config?.memory_limit || '未设置' }}
                </DescriptionsItem>
                <DescriptionsItem label="GPU数量">
                  {{ record.resource_config?.gpu_count || 0 }}
                </DescriptionsItem>
                <DescriptionsItem label="GPU显存">
                  {{ record.resource_config?.gpu_memory || '未设置' }}
                </DescriptionsItem>
              </Descriptions>
            </TabPane>
            <TabPane key="nginx" tab="Nginx配置">
              <Descriptions bordered :column="2" size="small">
                <DescriptionsItem label="Upstream名称">
                  {{ record.nginx_config?.upstream_name || '未配置' }}
                </DescriptionsItem>
                <DescriptionsItem label="Server Name">
                  {{ record.nginx_config?.server_name || '未配置' }}
                </DescriptionsItem>
                <DescriptionsItem label="监听端口">
                  {{ record.nginx_config?.listen_port || '未配置' }}
                </DescriptionsItem>
                <DescriptionsItem label="SSL">
                  <Badge
                    :status="
                      record.nginx_config?.ssl_enabled ? 'success' : 'default'
                    "
                    :text="
                      record.nginx_config?.ssl_enabled ? '已启用' : '未启用'
                    "
                  />
                </DescriptionsItem>
              </Descriptions>
            </TabPane>
          </Tabs>
        </template>
      </Table>
    </Card>
  </BusinessPage>
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
