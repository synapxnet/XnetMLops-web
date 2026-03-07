<script lang="ts" setup>
import type { DataSource } from '../api/datasource';

import { computed, onMounted, reactive, ref } from 'vue';

import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Select,
  Switch,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  createDataSource,
  deleteDataSource,
  fetchDataSourceList,
  testDataSourceConnection,
  updateDataSource,
} from '../api/datasource';

const loading = ref(false);
const dataSourceList = ref<DataSource[]>([]);
const modalVisible = ref(false);
const modalTitle = ref('新建数据源');
const formRef = ref();
const testLoading = ref(false);

const formState = reactive<DataSource>({
  name: '',
  type: 'mysql',
  host: '',
  port: 3306,
  username: '',
  password: '',
  defaultDatabase: '',
  allowedDatabases: '',
  description: '',
  enabled: true,
});

const editingId = ref<number | null>(null);

// 数据库类型选项
const dbTypeOptions = [
  { label: 'MySQL', value: 'mysql', port: 3306 },
  { label: 'PostgreSQL', value: 'postgresql', port: 5432 },
  { label: 'Oracle', value: 'oracle', port: 1521 },
  { label: 'SQL Server', value: 'sqlserver', port: 1433 },
  { label: 'ClickHouse', value: 'clickhouse', port: 8123 },
  { label: 'Hive', value: 'hive', port: 10000 },
];

// 表格列定义
const columns = [
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '类型', dataIndex: 'type', key: 'type' },
  { title: '主机', dataIndex: 'host', key: 'host' },
  { title: '端口', dataIndex: 'port', key: 'port' },
  { title: '默认数据库', dataIndex: 'defaultDatabase', key: 'defaultDatabase' },
  { title: '允许访问的数据库', dataIndex: 'allowedDatabases', key: 'allowedDatabases', ellipsis: true },
  { title: '状态', dataIndex: 'enabled', key: 'enabled' },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt' },
  { title: '操作', key: 'action', width: 200 },
];

// 加载数据源列表
const loadDataSources = async () => {
  loading.value = true;
  try {
    dataSourceList.value = await fetchDataSourceList();
  } catch (error) {
    console.error('加载数据源列表失败:', error);
    message.error('加载数据源列表失败');
  } finally {
    loading.value = false;
  }
};

// 打开新建弹窗
const handleAdd = () => {
  editingId.value = null;
  modalTitle.value = '新建数据源';
  Object.assign(formState, {
    name: '',
    type: 'mysql',
    host: '',
    port: 3306,
    username: '',
    password: '',
    defaultDatabase: '',
    allowedDatabases: '',
    description: '',
    enabled: true,
  });
  modalVisible.value = true;
};

// 打开编辑弹窗
const handleEdit = (record: DataSource) => {
  editingId.value = record.id!;
  modalTitle.value = '编辑数据源';
  Object.assign(formState, {
    ...record,
    password: '', // 不显示原密码
  });
  modalVisible.value = true;
};

// 删除数据源
const handleDelete = async (id: number) => {
  try {
    await deleteDataSource(id);
    message.success('删除成功');
    await loadDataSources();
  } catch (error) {
    console.error('删除失败:', error);
    message.error('删除失败');
  }
};

// 类型变化时更新默认端口
const handleTypeChange = (type: string) => {
  const option = dbTypeOptions.find((o) => o.value === type);
  if (option) {
    formState.port = option.port;
  }
};

// 测试连接
const handleTestConnection = async () => {
  try {
    await formRef.value.validate();
  } catch {
    message.warning('请先填写完整的连接信息');
    return;
  }

  testLoading.value = true;
  try {
    const result = await testDataSourceConnection(formState);
    if (result.success) {
      message.success('连接成功');
    } else {
      message.error('连接失败');
    }
  } catch (error: any) {
    console.error('测试连接失败:', error);
    message.error(error?.message || '连接失败');
  } finally {
    testLoading.value = false;
  }
};

// 保存数据源
const handleSave = async () => {
  try {
    await formRef.value.validate();
  } catch {
    return;
  }

  try {
    if (editingId.value) {
      await updateDataSource(editingId.value, formState);
      message.success('更新成功');
    } else {
      await createDataSource(formState);
      message.success('创建成功');
    }
    modalVisible.value = false;
    await loadDataSources();
  } catch (error: any) {
    console.error('保存失败:', error);
    message.error(error?.message || '保存失败');
  }
};

// 格式化时间
const formatTime = (time: string) => {
  if (!time) return '-';
  return new Date(time).toLocaleString();
};

onMounted(() => {
  loadDataSources();
});
</script>

<template>
  <Card class="p-4 shadow">
    <div class="mb-4 flex justify-between items-center">
      <div class="flex items-center">
        <DatabaseOutlined class="text-2xl mr-2 text-blue-500" />
        <span class="text-lg font-semibold">数据源配置管理</span>
      </div>
      <div class="flex gap-2">
        <Button @click="loadDataSources" :loading="loading">
          <ReloadOutlined /> 刷新
        </Button>
        <Button type="primary" @click="handleAdd">
          <PlusOutlined /> 新建数据源
        </Button>
      </div>
    </div>

    <Table
      :columns="columns"
      :data-source="dataSourceList"
      :loading="loading"
      row-key="id"
      bordered
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'type'">
          <Tag color="blue">{{ record.type?.toUpperCase() }}</Tag>
        </template>
        <template v-else-if="column.key === 'enabled'">
          <Tag :color="record.enabled ? 'green' : 'red'">
            <CheckCircleOutlined v-if="record.enabled" />
            <CloseCircleOutlined v-else />
            {{ record.enabled ? '启用' : '禁用' }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'createdAt'">
          {{ formatTime(record.createdAt) }}
        </template>
        <template v-else-if="column.key === 'action'">
          <Button type="link" size="small" @click="handleEdit(record)">
            <EditOutlined /> 编辑
          </Button>
          <Popconfirm
            title="确定要删除这个数据源吗？"
            @confirm="handleDelete(record.id)"
          >
            <Button type="link" size="small" danger>
              <DeleteOutlined /> 删除
            </Button>
          </Popconfirm>
        </template>
      </template>
    </Table>

    <!-- 新建/编辑弹窗 -->
    <Modal
      v-model:visible="modalVisible"
      :title="modalTitle"
      width="600px"
      @ok="handleSave"
    >
      <Form
        ref="formRef"
        :model="formState"
        layout="vertical"
        :label-col="{ span: 6 }"
      >
        <Form.Item
          label="数据源名称"
          name="name"
          :rules="[{ required: true, message: '请输入数据源名称' }]"
        >
          <Input v-model:value="formState.name" placeholder="请输入数据源名称" />
        </Form.Item>

        <Form.Item
          label="数据库类型"
          name="type"
          :rules="[{ required: true, message: '请选择数据库类型' }]"
        >
          <Select
            v-model:value="formState.type"
            :options="dbTypeOptions"
            placeholder="请选择数据库类型"
            @change="handleTypeChange"
          />
        </Form.Item>

        <div class="flex gap-4">
          <Form.Item
            label="主机地址"
            name="host"
            :rules="[{ required: true, message: '请输入主机地址' }]"
            class="flex-1"
          >
            <Input v-model:value="formState.host" placeholder="请输入主机地址" />
          </Form.Item>

          <Form.Item
            label="端口"
            name="port"
            :rules="[{ required: true, message: '请输入端口' }]"
            style="width: 120px"
          >
            <InputNumber
              v-model:value="formState.port"
              :min="1"
              :max="65535"
              style="width: 100%"
            />
          </Form.Item>
        </div>

        <div class="flex gap-4">
          <Form.Item
            label="用户名"
            name="username"
            :rules="[{ required: true, message: '请输入用户名' }]"
            class="flex-1"
          >
            <Input v-model:value="formState.username" placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            :rules="[{ required: !editingId, message: '请输入密码' }]"
            class="flex-1"
          >
            <Input.Password
              v-model:value="formState.password"
              :placeholder="editingId ? '不修改请留空' : '请输入密码'"
            />
          </Form.Item>
        </div>

        <Form.Item label="默认数据库" name="defaultDatabase">
          <Input
            v-model:value="formState.defaultDatabase"
            placeholder="请输入默认数据库（用于连接，可选）"
          />
        </Form.Item>

        <Form.Item label="允许访问的数据库" name="allowedDatabases">
          <Input
            v-model:value="formState.allowedDatabases"
            placeholder="请输入允许访问的数据库，多个用逗号分隔（如：db1,db2,db3）"
          />
          <div class="text-gray-400 text-xs mt-1">
            DPP特征工程将只能访问这里配置的数据库，留空则允许访问所有数据库
          </div>
        </Form.Item>

        <Form.Item label="描述" name="description">
          <Input.TextArea
            v-model:value="formState.description"
            placeholder="请输入描述（可选）"
            :rows="2"
          />
        </Form.Item>

        <Form.Item label="启用状态" name="enabled">
          <Switch v-model:checked="formState.enabled" />
        </Form.Item>

        <div class="flex justify-center">
          <Button @click="handleTestConnection" :loading="testLoading">
            <DatabaseOutlined /> 测试连接
          </Button>
        </div>
      </Form>
    </Modal>
  </Card>
</template>

<style scoped>
:deep(.ant-table-thead > tr > th) {
  font-weight: 600;
}
</style>
