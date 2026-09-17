<script setup lang="ts">
import BusinessPage from '#/components/workspace/BusinessPage.vue';
import { ref, onMounted, h } from 'vue';
import {
  Table, Button, Space, Modal, Tag, Tooltip, message, Card,
  Popconfirm, Badge, Descriptions, DescriptionsItem
} from 'ant-design-vue';
import {
  PlusOutlined, ReloadOutlined, DeleteOutlined, EditOutlined,
  CheckCircleOutlined, CloseCircleOutlined, SyncOutlined,
  DesktopOutlined, CloudServerOutlined
} from '@ant-design/icons-vue';
import type { Workstation } from '../api/workstation';
import {
  getWorkstations, deleteWorkstation, checkWorkstationStatus
} from '../api/workstation';
import WorkstationForm from './components/WorkstationForm.vue';

// 状态
const loading = ref(false);
const readError = ref('');
const workstations = ref<Workstation[]>([]);
const showForm = ref(false);
const editingWorkstation = ref<Workstation | null>(null);
const showDetail = ref(false);
const detailWorkstation = ref<Workstation | null>(null);
const checkingIds = ref<number[]>([]);

// 加载数据
/** 读取工作站列表并保留可重试错误。 Read workstations and retain a retryable failure state. */
const loadData = async () => {
  loading.value = true;
  try {
    workstations.value = await getWorkstations();
    readError.value = '';
  } catch (error: any) {
    console.error('加载工作站点列表失败:', error);
    readError.value = '工作站列表读取失败，请检查服务与权限后重试。';
    message.error('加载失败: ' + error.message);
  } finally {
    loading.value = false;
  }
};

// 新增
const handleAdd = () => {
  editingWorkstation.value = null;
  showForm.value = true;
};

// 编辑
const handleEdit = (record: Workstation) => {
  editingWorkstation.value = { ...record };
  showForm.value = true;
};

// 删除
const handleDelete = async (id: number) => {
  try {
    await deleteWorkstation(id);
    message.success('删除成功');
    loadData();
  } catch (error: any) {
    console.error('删除工作站点失败:', error);
    message.error('删除失败: ' + error.message);
  }
};

// 检查状态
const handleCheckStatus = async (record: Workstation) => {
  if (!record.id) return;
  checkingIds.value.push(record.id);
  try {
    const result = await checkWorkstationStatus(record.id);
    message.success('检查完成: ' + (result?.success ? '在线' : '离线'));
    loadData();
  } catch (error: any) {
    console.error('检查服务器状态失败:', error);
    message.error('检查失败: ' + error.message);
  } finally {
    checkingIds.value = checkingIds.value.filter(id => id !== record.id);
  }
};

// 查看详情
const handleViewDetail = (record: Workstation) => {
  detailWorkstation.value = record;
  showDetail.value = true;
};

// 表单提交成功
const handleFormSuccess = () => {
  showForm.value = false;
  loadData();
};

// 状态标签颜色
const getStatusColor = (status: string) => {
  switch (status) {
    case 'online': return 'success';
    case 'offline': return 'error';
    case 'error': return 'warning';
    default: return 'default';
  }
};

// 状态标签文本
const getStatusText = (status: string) => {
  switch (status) {
    case 'online': return '在线';
    case 'offline': return '离线';
    case 'error': return '异常';
    case 'pending': return '待验证';
    default: return status;
  }
};

// 厂商标签
const getVendorLabel = (vendor: string) => {
  const map: Record<string, string> = {
    huawei: '华为云',
    tencent: '腾讯云',
    alibaba: '阿里云',
    aws: 'AWS',
    azure: 'Azure',
    google: 'Google Cloud',
    other: '其他'
  };
  return map[vendor] || vendor;
};

// 表格列
const columns = [
  {
    title: '服务器名称',
    dataIndex: 'name',
    key: 'name',
    width: 130,
  },
  {
    title: '主机名',
    dataIndex: 'hostname',
    key: 'hostname',
    width: 130,
    ellipsis: true,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 90,
    customRender: ({ record }: { record: Workstation }) => {
      return h(Badge, {
        status: record.status === 'online' ? 'success' :
                record.status === 'offline' ? 'error' :
                record.status === 'error' ? 'warning' : 'default',
        text: getStatusText(record.status || 'pending')
      });
    }
  },
  {
    title: 'IP地址',
    dataIndex: 'ipAddress',
    key: 'ipAddress',
    width: 130,
  },
  {
    title: '厂商',
    dataIndex: 'vendor',
    key: 'vendor',
    width: 90,
    customRender: ({ record }: { record: Workstation }) => {
      return h(Tag, { color: 'blue' }, () => getVendorLabel(record.vendor));
    }
  },
  {
    title: '资源配置',
    key: 'resources',
    width: 200,
    customRender: ({ record }: { record: Workstation }) => {
      const parts = [
        `${record.cpuCores || '-'}核`,
        `${record.ramGb || '-'}G内存`,
        `${record.diskGb || '-'}G磁盘`
      ];
      if (record.hasGpu && record.gpuCount) {
        parts.push(`${record.gpuCount}x GPU`);
      }
      return h('span', {}, parts.join(' / '));
    }
  },
  {
    title: 'GPU',
    key: 'gpu',
    width: 150,
    customRender: ({ record }: { record: Workstation }) => {
      if (!record.hasGpu) {
        return h(Tag, { color: 'default' }, () => '无');
      }
      const gpuText = record.gpuModel || (record.gpuCount && record.gpuCount > 1 ? '多卡' : '单卡');
      return h(Tag, { color: 'green' }, () => `${record.gpuCount}x ${gpuText}`);
    }
  },
  {
    title: '系统',
    dataIndex: 'osVersion',
    key: 'osVersion',
    width: 130,
    ellipsis: true,
  },
  {
    title: '最后心跳',
    dataIndex: 'lastHeartbeat',
    key: 'lastHeartbeat',
    width: 150,
    customRender: ({ record }: { record: Workstation }) => {
      return record.lastHeartbeat || '-';
    }
  },
  {
    title: '操作',
    key: 'action',
    width: 160,
    fixed: 'right' as const,
  }
];

onMounted(() => {
  loadData();
});
</script>

<template>
  <BusinessPage domain="资源配置" description="管理组织内的数据连接、仓库、工作站与计算资源。" :error="readError" :loading="loading" @retry="loadData">
  <div class="workstation-manage">
    <Card title="工作站点管理" :bordered="false">
      <template #extra>
        <Space>
          <Button type="primary" @click="handleAdd">
            <template #icon><PlusOutlined /></template>
            注册站点
          </Button>
          <Button @click="loadData" :loading="loading">
            <template #icon><ReloadOutlined /></template>
            刷新
          </Button>
        </Space>
      </template>

      <Table
        :columns="columns"
        :dataSource="workstations"
        :loading="loading"
        :rowKey="(record: Workstation) => record.id || record.uid || ''"
        :scroll="{ x: 1200 }"
        :pagination="{ pageSize: 10, showSizeChanger: true, showTotal: (total: number) => `共 ${total} 条` }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'action'">
            <Space>
              <Tooltip title="检查状态">
                <Button
                  type="link"
                  size="small"
                  @click="handleCheckStatus(record)"
                  :loading="checkingIds.includes(record.id)"
                >
                  <template #icon><SyncOutlined /></template>
                </Button>
              </Tooltip>
              <Tooltip title="查看详情">
                <Button type="link" size="small" @click="handleViewDetail(record)">
                  <template #icon><DesktopOutlined /></template>
                </Button>
              </Tooltip>
              <Tooltip title="编辑">
                <Button type="link" size="small" @click="handleEdit(record)">
                  <template #icon><EditOutlined /></template>
                </Button>
              </Tooltip>
              <Popconfirm
                title="确定要删除这个工作站点吗？"
                @confirm="handleDelete(record.id)"
                okText="确定"
                cancelText="取消"
              >
                <Tooltip title="删除">
                  <Button type="link" size="small" danger>
                    <template #icon><DeleteOutlined /></template>
                  </Button>
                </Tooltip>
              </Popconfirm>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <!-- 注册/编辑表单 -->
    <WorkstationForm
      v-model:visible="showForm"
      :workstation="editingWorkstation"
      @success="handleFormSuccess"
    />

    <!-- 详情弹窗 -->
    <Modal
      v-model:open="showDetail"
      title="工作站点详情"
      :footer="null"
      width="700px"
    >
      <Descriptions v-if="detailWorkstation" :column="2" bordered size="small">
        <DescriptionsItem label="服务器名称">{{ detailWorkstation.name }}</DescriptionsItem>
        <DescriptionsItem label="主机名 (Hostname)">
          {{ detailWorkstation.hostname || '-' }}
          <Tag v-if="detailWorkstation.hostnameMode" size="small" style="margin-left: 8px">
            {{ detailWorkstation.hostnameMode === 'auto' ? '自动获取' : '自定义' }}
          </Tag>
        </DescriptionsItem>
        <DescriptionsItem label="状态">
          <Tag :color="getStatusColor(detailWorkstation.status || '')">
            {{ getStatusText(detailWorkstation.status || 'pending') }}
          </Tag>
        </DescriptionsItem>
        <DescriptionsItem label="IP地址">{{ detailWorkstation.ipAddress }}</DescriptionsItem>
        <DescriptionsItem label="厂商">{{ getVendorLabel(detailWorkstation.vendor) }}</DescriptionsItem>
        <DescriptionsItem label="服务器类型">{{ detailWorkstation.serverType }}</DescriptionsItem>
        <DescriptionsItem label="地域">{{ detailWorkstation.region }}</DescriptionsItem>
        <DescriptionsItem label="域名">{{ detailWorkstation.domain || '-' }}</DescriptionsItem>
        <DescriptionsItem label="系统类型">{{ detailWorkstation.osType }}</DescriptionsItem>
        <DescriptionsItem label="系统版本">{{ detailWorkstation.osVersion }}</DescriptionsItem>
        <DescriptionsItem label="CPU">{{ detailWorkstation.cpuCores }} 核</DescriptionsItem>
        <DescriptionsItem label="内存">{{ detailWorkstation.ramGb }} GB (可用: {{ detailWorkstation.availableRamGb || 0 }} GB)</DescriptionsItem>
        <DescriptionsItem label="磁盘">{{ detailWorkstation.diskGb }} GB (可用: {{ detailWorkstation.availableDiskGb || 0 }} GB)</DescriptionsItem>
        <DescriptionsItem label="GPU" :span="2">
          <template v-if="detailWorkstation.hasGpu">
            <Tag color="green">{{ detailWorkstation.gpuCount }}x {{ detailWorkstation.gpuModel || '未知型号' }}</Tag>
            <span style="margin-left: 8px">显存: {{ detailWorkstation.gpuMemory || '-' }} GB</span>
            <span style="margin-left: 8px">类型: {{ detailWorkstation.gpuType === 'multi_gpu' ? '多卡' : '单卡' }}</span>
          </template>
          <Tag v-else color="default">无 GPU</Tag>
        </DescriptionsItem>
        <DescriptionsItem label="SSH端口">{{ detailWorkstation.sshPort }}</DescriptionsItem>
        <DescriptionsItem label="SSH用户">{{ detailWorkstation.sshUser }}</DescriptionsItem>
        <DescriptionsItem label="认证方式">{{ detailWorkstation.authType === 'password' ? '密码' : '私钥' }}</DescriptionsItem>
        <DescriptionsItem label="最后心跳">{{ detailWorkstation.lastHeartbeat || '-' }}</DescriptionsItem>
        <DescriptionsItem label="描述" :span="2">{{ detailWorkstation.description || '-' }}</DescriptionsItem>
        <DescriptionsItem label="创建时间">{{ detailWorkstation.createdAt }}</DescriptionsItem>
        <DescriptionsItem label="创建者">{{ detailWorkstation.createdBy || '-' }}</DescriptionsItem>
      </Descriptions>
    </Modal>
  </div>

  </BusinessPage>
</template>

<style scoped>
.workstation-manage {
  padding: 16px;
}
</style>
