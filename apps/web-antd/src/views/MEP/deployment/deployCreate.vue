<script lang="ts" setup>
import type { DeployNode, DeploymentResourceConfig, HealthCheckConfig, MTPOutputModel, NginxConfig } from '../api/types';

import { onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import {
  CloudServerOutlined,
  SettingOutlined,
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
  Radio,
  RadioGroup,
  Row,
  Select,
  SelectOption,
  Steps,
  Switch,
  Textarea,
} from 'ant-design-vue';

import { createDeployment, fetchMTPOutputModels } from '../api/deployment';
import { fetchNodeList } from '../api/node';

const router = useRouter();

// 步骤控制
const currentStep = ref(0);

// 节点列表
const nodeList = ref<DeployNode[]>([]);
const mtpModels = ref<MTPOutputModel[]>([]);
const loadingNodes = ref(false);
const loadingModels = ref(false);

// 表单数据
const formState = reactive({
  // 基本信息
  name: '',
  model_source: 'mtp' as 'mtp' | 'llm',
  model_uid: '',
  model_name: '',
  model_version: '',
  node_uid: '',
  node_name: '',

  // 容器配置
  container_name: '',
  image_name: '',
  port: 8080,
  replicas: 1,

  // 资源配置
  resource_config: {
    cpu_limit: '2',
    memory_limit: '4Gi',
    gpu_count: 0,
    gpu_memory: '',
  } as DeploymentResourceConfig,

  // Nginx配置
  nginx_config: {
    upstream_name: '',
    server_name: '',
    listen_port: 80,
    proxy_pass: '',
    ssl_enabled: false,
    custom_config: '',
  } as NginxConfig,

  // 健康检查
  health_check: {
    enabled: true,
    path: '/health',
    interval: 30,
    timeout: 10,
    retries: 3,
  } as HealthCheckConfig,
});

// 加载节点列表
const loadNodes = async () => {
  try {
    loadingNodes.value = true;
    const data = await fetchNodeList();
    nodeList.value = data.filter((n) => n.status === 'online');
  } catch (error) {
    console.error('加载节点失败:', error);
  } finally {
    loadingNodes.value = false;
  }
};

// 加载MTP模型
const loadMTPModels = async () => {
  try {
    loadingModels.value = true;
    const data = await fetchMTPOutputModels();
    mtpModels.value = data;
  } catch (error) {
    console.error('加载MTP模型失败:', error);
  } finally {
    loadingModels.value = false;
  }
};

// 节点选择变化
const handleNodeChange = (nodeUid: string) => {
  const node = nodeList.value.find((n) => n.uid === nodeUid);
  if (node) {
    formState.node_name = node.name;
  }
};

// MTP模型选择变化
const handleMTPModelChange = (modelUid: string) => {
  const model = mtpModels.value.find((m) => m.uid === modelUid);
  if (model) {
    formState.model_name = model.model_name;
    formState.model_version = model.version;
    // 自动生成容器名称
    formState.container_name = `${model.model_name}-${model.version}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  }
};

// 自动生成Nginx配置
watch(() => formState.name, (name) => {
  if (name) {
    formState.nginx_config.upstream_name = `upstream_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    formState.nginx_config.server_name = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.local`;
  }
});

// 验证当前步骤
const validateStep = async (step: number): Promise<boolean> => {
  switch (step) {
    case 0:
      if (!formState.name) {
        message.warning('请输入部署名称');
        return false;
      }
      if (!formState.model_uid) {
        message.warning('请选择模型');
        return false;
      }
      if (!formState.node_uid) {
        message.warning('请选择部署节点');
        return false;
      }
      return true;
    case 1:
      if (!formState.container_name) {
        message.warning('请输入容器名称');
        return false;
      }
      if (!formState.image_name) {
        message.warning('请输入镜像名称');
        return false;
      }
      return true;
    case 2:
      return true;
    default:
      return true;
  }
};

// 下一步
const handleNext = async () => {
  const valid = await validateStep(currentStep.value);
  if (valid) {
    currentStep.value++;
  }
};

// 上一步
const handlePrev = () => {
  currentStep.value--;
};

// 提交
const submitLoading = ref(false);
const handleSubmit = async () => {
  try {
    submitLoading.value = true;
    await createDeployment({
      name: formState.name,
      model_source: formState.model_source,
      model_uid: formState.model_uid,
      model_name: formState.model_name,
      model_version: formState.model_version,
      node_uid: formState.node_uid,
      node_name: formState.node_name,
      container_name: formState.container_name,
      image_name: formState.image_name,
      port: formState.port,
      replicas: formState.replicas,
      resource_config: formState.resource_config,
      nginx_config: formState.nginx_config,
      health_check: formState.health_check,
    });
    router.push('/MEP/deployment/index');
  } catch (error) {
    console.error('创建部署失败:', error);
  } finally {
    submitLoading.value = false;
  }
};

// 取消
const handleCancel = () => {
  router.back();
};

onMounted(() => {
  loadNodes();
  loadMTPModels();
});
</script>

<template>
  <Card title="新建模型部署" class="m-4 shadow">
    <Steps :current="currentStep" class="mb-8">
      <Steps.Step title="基本配置" description="选择模型和节点" />
      <Steps.Step title="容器配置" description="设置镜像和资源" />
      <Steps.Step title="网络配置" description="配置Nginx代理" />
      <Steps.Step title="确认部署" description="检查并提交" />
    </Steps>

    <Form :model="formState" layout="vertical">
      <!-- 步骤1: 基本配置 -->
      <div v-show="currentStep === 0">
        <Row :gutter="24">
          <Col :span="12">
            <FormItem label="部署名称" required>
              <Input
                v-model:value="formState.name"
                placeholder="请输入部署名称"
                :maxlength="50"
                show-count
              />
            </FormItem>
          </Col>
          <Col :span="12">
            <FormItem label="模型来源" required>
              <RadioGroup v-model:value="formState.model_source">
                <Radio value="mtp">MTP训练模型</Radio>
                <Radio value="llm">大模型服务</Radio>
              </RadioGroup>
            </FormItem>
          </Col>
        </Row>

        <Row :gutter="24">
          <Col :span="12">
            <FormItem v-if="formState.model_source === 'mtp'" label="选择MTP模型" required>
              <Select
                v-model:value="formState.model_uid"
                placeholder="请选择MTP训练输出的模型"
                :loading="loadingModels"
                show-search
                option-filter-prop="label"
                @change="handleMTPModelChange"
              >
                <SelectOption
                  v-for="model in mtpModels"
                  :key="model.uid"
                  :value="model.uid"
                  :label="model.model_name"
                >
                  <div class="flex items-center justify-between">
                    <span>{{ model.model_name }}</span>
                    <span class="text-xs text-gray-400">v{{ model.version }}</span>
                  </div>
                  <div class="text-xs text-gray-400">
                    任务: {{ model.task_name }} | 框架: {{ model.framework }}
                  </div>
                </SelectOption>
              </Select>
            </FormItem>
            <FormItem v-else label="模型名称" required>
              <Input
                v-model:value="formState.model_name"
                placeholder="请输入模型名称"
              />
            </FormItem>
          </Col>
          <Col :span="12">
            <FormItem label="模型版本">
              <Input
                v-model:value="formState.model_version"
                placeholder="请输入模型版本"
                :disabled="formState.model_source === 'mtp'"
              />
            </FormItem>
          </Col>
        </Row>

        <Row :gutter="24">
          <Col :span="12">
            <FormItem label="部署节点" required>
              <Select
                v-model:value="formState.node_uid"
                placeholder="请选择部署节点"
                :loading="loadingNodes"
                @change="handleNodeChange"
              >
                <SelectOption
                  v-for="node in nodeList"
                  :key="node.uid"
                  :value="node.uid"
                >
                  <div class="flex items-center justify-between">
                    <span>
                      <CloudServerOutlined class="mr-1" />
                      {{ node.name }}
                    </span>
                    <span class="text-xs text-gray-400">{{ node.ip_address }}</span>
                  </div>
                  <div class="text-xs text-gray-400">
                    CPU: {{ node.cpu_cores }}核 | 内存: {{ node.memory_gb }}GB
                    {{ node.gpu_info ? `| GPU: ${node.gpu_info}` : '' }}
                  </div>
                </SelectOption>
              </Select>
            </FormItem>
          </Col>
          <Col :span="12">
            <FormItem label="副本数">
              <InputNumber
                v-model:value="formState.replicas"
                :min="1"
                :max="10"
                style="width: 100%"
              />
            </FormItem>
          </Col>
        </Row>
      </div>

      <!-- 步骤2: 容器配置 -->
      <div v-show="currentStep === 1">
        <Row :gutter="24">
          <Col :span="12">
            <FormItem label="容器名称" required>
              <Input
                v-model:value="formState.container_name"
                placeholder="请输入容器名称"
              />
            </FormItem>
          </Col>
          <Col :span="12">
            <FormItem label="镜像名称" required>
              <Input
                v-model:value="formState.image_name"
                placeholder="例如: harbor.example.com/models/my-model:v1.0"
              />
            </FormItem>
          </Col>
        </Row>

        <Row :gutter="24">
          <Col :span="12">
            <FormItem label="服务端口">
              <InputNumber
                v-model:value="formState.port"
                :min="1"
                :max="65535"
                style="width: 100%"
              />
            </FormItem>
          </Col>
        </Row>

        <Divider>资源限制</Divider>

        <Row :gutter="24">
          <Col :span="6">
            <FormItem label="CPU限制">
              <Input
                v-model:value="formState.resource_config.cpu_limit"
                placeholder="例如: 2, 0.5"
                addon-after="核"
              />
            </FormItem>
          </Col>
          <Col :span="6">
            <FormItem label="内存限制">
              <Input
                v-model:value="formState.resource_config.memory_limit"
                placeholder="例如: 4Gi, 512Mi"
              />
            </FormItem>
          </Col>
          <Col :span="6">
            <FormItem label="GPU数量">
              <InputNumber
                v-model:value="formState.resource_config.gpu_count"
                :min="0"
                :max="8"
                style="width: 100%"
              />
            </FormItem>
          </Col>
          <Col :span="6">
            <FormItem label="GPU显存">
              <Input
                v-model:value="formState.resource_config.gpu_memory"
                placeholder="例如: 8Gi"
                :disabled="formState.resource_config.gpu_count === 0"
              />
            </FormItem>
          </Col>
        </Row>

        <Divider>健康检查</Divider>

        <Row :gutter="24">
          <Col :span="6">
            <FormItem label="启用健康检查">
              <Switch v-model:checked="formState.health_check.enabled" />
            </FormItem>
          </Col>
          <Col :span="6">
            <FormItem label="检查路径">
              <Input
                v-model:value="formState.health_check.path"
                placeholder="/health"
                :disabled="!formState.health_check.enabled"
              />
            </FormItem>
          </Col>
          <Col :span="4">
            <FormItem label="检查间隔(秒)">
              <InputNumber
                v-model:value="formState.health_check.interval"
                :min="5"
                :max="300"
                :disabled="!formState.health_check.enabled"
                style="width: 100%"
              />
            </FormItem>
          </Col>
          <Col :span="4">
            <FormItem label="超时时间(秒)">
              <InputNumber
                v-model:value="formState.health_check.timeout"
                :min="1"
                :max="60"
                :disabled="!formState.health_check.enabled"
                style="width: 100%"
              />
            </FormItem>
          </Col>
          <Col :span="4">
            <FormItem label="重试次数">
              <InputNumber
                v-model:value="formState.health_check.retries"
                :min="1"
                :max="10"
                :disabled="!formState.health_check.enabled"
                style="width: 100%"
              />
            </FormItem>
          </Col>
        </Row>
      </div>

      <!-- 步骤3: 网络配置 -->
      <div v-show="currentStep === 2">
        <Divider>
          <SettingOutlined />
          Nginx 代理配置
        </Divider>

        <Row :gutter="24">
          <Col :span="12">
            <FormItem label="Upstream名称">
              <Input
                v-model:value="formState.nginx_config.upstream_name"
                placeholder="自动生成或手动输入"
              />
            </FormItem>
          </Col>
          <Col :span="12">
            <FormItem label="Server Name">
              <Input
                v-model:value="formState.nginx_config.server_name"
                placeholder="例如: api.example.com"
              />
            </FormItem>
          </Col>
        </Row>

        <Row :gutter="24">
          <Col :span="8">
            <FormItem label="监听端口">
              <InputNumber
                v-model:value="formState.nginx_config.listen_port"
                :min="1"
                :max="65535"
                style="width: 100%"
              />
            </FormItem>
          </Col>
          <Col :span="8">
            <FormItem label="Proxy Pass">
              <Input
                v-model:value="formState.nginx_config.proxy_pass"
                placeholder="自动生成或手动输入"
              />
            </FormItem>
          </Col>
          <Col :span="8">
            <FormItem label="启用SSL">
              <Switch v-model:checked="formState.nginx_config.ssl_enabled" />
            </FormItem>
          </Col>
        </Row>

        <FormItem label="自定义Nginx配置">
          <Textarea
            v-model:value="formState.nginx_config.custom_config"
            placeholder="可选: 输入额外的Nginx配置指令"
            :rows="4"
          />
        </FormItem>
      </div>

      <!-- 步骤4: 确认部署 -->
      <div v-show="currentStep === 3">
        <Card title="部署配置确认" class="mb-4">
          <Row :gutter="24">
            <Col :span="12">
              <div class="config-section">
                <h4 class="section-title">基本信息</h4>
                <p><strong>部署名称:</strong> {{ formState.name }}</p>
                <p><strong>模型来源:</strong> {{ formState.model_source === 'mtp' ? 'MTP训练' : '大模型' }}</p>
                <p><strong>模型名称:</strong> {{ formState.model_name }}</p>
                <p><strong>模型版本:</strong> {{ formState.model_version }}</p>
                <p><strong>部署节点:</strong> {{ formState.node_name }}</p>
                <p><strong>副本数:</strong> {{ formState.replicas }}</p>
              </div>
            </Col>
            <Col :span="12">
              <div class="config-section">
                <h4 class="section-title">容器配置</h4>
                <p><strong>容器名称:</strong> {{ formState.container_name }}</p>
                <p><strong>镜像名称:</strong> {{ formState.image_name }}</p>
                <p><strong>服务端口:</strong> {{ formState.port }}</p>
                <p><strong>CPU限制:</strong> {{ formState.resource_config.cpu_limit }}</p>
                <p><strong>内存限制:</strong> {{ formState.resource_config.memory_limit }}</p>
                <p><strong>GPU:</strong> {{ formState.resource_config.gpu_count }}块</p>
              </div>
            </Col>
          </Row>
          <Row :gutter="24" class="mt-4">
            <Col :span="12">
              <div class="config-section">
                <h4 class="section-title">Nginx配置</h4>
                <p><strong>Server Name:</strong> {{ formState.nginx_config.server_name || '未配置' }}</p>
                <p><strong>监听端口:</strong> {{ formState.nginx_config.listen_port }}</p>
                <p><strong>SSL:</strong> {{ formState.nginx_config.ssl_enabled ? '已启用' : '未启用' }}</p>
              </div>
            </Col>
            <Col :span="12">
              <div class="config-section">
                <h4 class="section-title">健康检查</h4>
                <p><strong>状态:</strong> {{ formState.health_check.enabled ? '已启用' : '未启用' }}</p>
                <p v-if="formState.health_check.enabled">
                  <strong>检查路径:</strong> {{ formState.health_check.path }}
                </p>
                <p v-if="formState.health_check.enabled">
                  <strong>检查间隔:</strong> {{ formState.health_check.interval }}秒
                </p>
              </div>
            </Col>
          </Row>
        </Card>
      </div>

      <Divider />

      <!-- 操作按钮 -->
      <div class="flex justify-end gap-4">
        <Button @click="handleCancel">取消</Button>
        <Button v-if="currentStep > 0" @click="handlePrev">上一步</Button>
        <Button v-if="currentStep < 3" type="primary" @click="handleNext">下一步</Button>
        <Button
          v-if="currentStep === 3"
          type="primary"
          :loading="submitLoading"
          @click="handleSubmit"
        >
          确认部署
        </Button>
      </div>
    </Form>
  </Card>
</template>

<style scoped>
:deep(.ant-card-head-title) {
  font-size: 18px;
  font-weight: 600;
}

.config-section {
  padding: 16px;
  background: hsl(var(--muted));
  border-radius: 8px;
}

.config-section .section-title {
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid hsl(var(--border));
  font-weight: 600;
  color: #1890ff;
}

.config-section p {
  margin-bottom: 8px;
  font-size: 14px;
}
</style>
