<script lang="ts" setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  CheckCircleOutlined,
  CloudServerOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Row,
  Select,
  Textarea,
} from 'ant-design-vue';

import { createNode, testNodeConnection } from '../api/node';

const router = useRouter();

// 表单数据
const formState = reactive({
  name: '',
  ip_address: '',
  port: 22,
  cpu_cores: 4,
  memory_gb: 8,
  gpu_info: '',
  labels: [] as string[],
  description: '',
});

// 状态
const submitLoading = ref(false);
const testLoading = ref(false);
const testResult = ref<{ success: boolean; message: string; docker_version?: string } | null>(null);

// 表单验证规则
const rules = {
  name: [{ required: true, message: '请输入节点名称', trigger: 'blur' }],
  ip_address: [{ required: true, message: '请输入IP地址', trigger: 'blur' }],
  cpu_cores: [{ required: true, message: '请输入CPU核心数', trigger: 'change' }],
  memory_gb: [{ required: true, message: '请输入内存大小', trigger: 'change' }],
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
    message.error('连接测试失败');
  } finally {
    testLoading.value = false;
  }
};

// 提交表单
const handleSubmit = async () => {
  try {
    submitLoading.value = true;
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
    router.push('/MEP/nodes/index');
  } catch (error) {
    console.error('创建节点失败:', error);
  } finally {
    submitLoading.value = false;
  }
};

// 取消
const handleCancel = () => {
  router.back();
};
</script>

<template>
  <Card title="新增部署节点" class="m-4 shadow">
    <template #extra>
      <CloudServerOutlined class="text-2xl text-blue-500" />
    </template>

    <Form
      :model="formState"
      :rules="rules"
      layout="vertical"
      @finish="handleSubmit"
    >
      <Divider orientation="left">基本信息</Divider>

      <Row :gutter="24">
        <Col :span="12">
          <FormItem label="节点名称" name="name" required>
            <Input
              v-model:value="formState.name"
              placeholder="请输入节点名称"
              :maxlength="50"
              show-count
            />
          </FormItem>
        </Col>
        <Col :span="12">
          <FormItem label="SSH端口">
            <InputNumber
              v-model:value="formState.port"
              :min="1"
              :max="65535"
              style="width: 100%"
            />
          </FormItem>
        </Col>
      </Row>

      <Row :gutter="24">
        <Col :span="16">
          <FormItem label="IP地址" name="ip_address" required>
            <Input
              v-model:value="formState.ip_address"
              placeholder="请输入节点IP地址"
            >
              <template #addonAfter>
                <Button
                  type="link"
                  size="small"
                  :loading="testLoading"
                  @click="handleTestConnection"
                >
                  测试连接
                </Button>
              </template>
            </Input>
            <div v-if="testResult" class="mt-2">
              <span v-if="testResult.success" class="text-green-500">
                <CheckCircleOutlined /> 连接成功
                <span v-if="testResult.docker_version" class="ml-2 text-gray-500">
                  Docker版本: {{ testResult.docker_version }}
                </span>
              </span>
              <span v-else class="text-red-500">{{ testResult.message }}</span>
            </div>
          </FormItem>
        </Col>
      </Row>

      <Divider orientation="left">硬件配置</Divider>

      <Row :gutter="24">
        <Col :span="8">
          <FormItem label="CPU核心数" name="cpu_cores" required>
            <InputNumber
              v-model:value="formState.cpu_cores"
              :min="1"
              :max="256"
              style="width: 100%"
              addon-after="核"
            />
          </FormItem>
        </Col>
        <Col :span="8">
          <FormItem label="内存大小" name="memory_gb" required>
            <InputNumber
              v-model:value="formState.memory_gb"
              :min="1"
              :max="2048"
              style="width: 100%"
              addon-after="GB"
            />
          </FormItem>
        </Col>
        <Col :span="8">
          <FormItem label="GPU信息">
            <Input
              v-model:value="formState.gpu_info"
              placeholder="例如: NVIDIA RTX 4090 x2"
            />
          </FormItem>
        </Col>
      </Row>

      <Divider orientation="left">其他配置</Divider>

      <FormItem label="节点标签">
        <Select
          v-model:value="formState.labels"
          mode="tags"
          placeholder="输入标签后按回车添加，例如: gpu, production, ml-training"
          style="width: 100%"
        />
        <div class="mt-1 text-xs text-gray-400">
          标签用于对节点进行分类，便于在部署时筛选合适的节点
        </div>
      </FormItem>

      <FormItem label="描述">
        <Textarea
          v-model:value="formState.description"
          placeholder="请输入节点描述信息"
          :rows="4"
          :maxlength="500"
          show-count
        />
      </FormItem>

      <Divider />

      <FormItem>
        <div class="flex justify-end gap-4">
          <Button @click="handleCancel">取消</Button>
          <Button type="primary" html-type="submit" :loading="submitLoading">
            创建节点
          </Button>
        </div>
      </FormItem>
    </Form>
  </Card>
</template>

<style scoped>
:deep(.ant-form-item-label > label) {
  font-weight: 500;
}

:deep(.ant-card-head-title) {
  font-size: 18px;
  font-weight: 600;
}

:deep(.ant-divider-inner-text) {
  font-weight: 600;
  color: #1890ff;
}
</style>
