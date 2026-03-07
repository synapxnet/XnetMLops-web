<script lang="ts" setup>
import type { FormInstance } from 'ant-design-vue';

import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { ArrowLeftOutlined, KeyOutlined, SaveOutlined } from '@ant-design/icons-vue';
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
  SelectOption,
  Space,
  Spin,
  Textarea,
} from 'ant-design-vue';

import { mepRequestClient } from '#/api/request';
import { getOnlineWorkstations, type Workstation } from '../../SMP/api/workstation';

const router = useRouter();
const route = useRoute();

const isEdit = ref(false);
const loading = ref(false);
const submitting = ref(false);
const formRef = ref<FormInstance>();

// 选项数据
const apiKeyOptions = ref<Array<{ id: number; uid: string; name: string; provider: string; keyMasked: string }>>([]);
const llmServiceOptions = ref<Array<{ id: number; name: string; type: string }>>([]);
const workstationList = ref<Workstation[]>([]);
const workstationLoading = ref(false);

// 表单数据
const formData = reactive({
  id: undefined as number | undefined,
  name: '',
  description: '',
  deployMode: 'docker',
  workstationId: undefined as number | undefined,
  gatewayHost: '',
  gatewayPort: 18789,
  gatewayToken: '',
  defaultModel: 'anthropic/claude-sonnet-4-5',
  fallbackModels: [] as string[],       // 回退模型列表（主模型失败时按顺序尝试）
  subagentModel: undefined as string | undefined, // 子代理模型（用于子任务的轻量模型）
  llmServiceId: undefined as number | undefined,
  apiKeyRefId: undefined as number | undefined, // 引用MEP API密钥管理模块中的密钥
  apiKey: '',  // 直接输入API密钥（会在后端加密存储）
  enabledSkills: '[]',
  channelsConfig: '{}',
});

// 模型选项（从后端加载）
const modelOptions = ref<Array<{ label: string; value: string; provider: string }>>([]);

// 部署模式选项
const deployModeOptions = [
  { label: 'Docker容器', value: 'docker', description: '使用Docker容器部署，推荐生产环境' },
  { label: 'NPM全局安装', value: 'npm', description: '使用npm/pnpm全局安装，适合开发环境' },
  { label: '源码构建', value: 'source', description: '从源码构建运行，适合高级用户' },
];

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入实例名称' },
    { min: 2, max: 50, message: '名称长度在2-50个字符之间' },
  ],
  deployMode: [{ required: true, message: '请选择部署模式' }],
  workstationId: [{ required: true, message: '请选择目标工作站' }],
  gatewayPort: [{ required: true, message: '请输入Gateway端口' }],
  defaultModel: [{ required: true, message: '请选择默认模型' }],
};

// 加载选项数据
const loadOptions = async () => {
  try {
    // 加载API密钥列表
    const apiKeyRes = await mepRequestClient.get<any[]>('/api-keys');
    apiKeyOptions.value = Array.isArray(apiKeyRes) ? apiKeyRes : (apiKeyRes as any).data || [];

    // 加载LLM服务列表
    const llmRes = await mepRequestClient.get<any[]>('/llm-services');
    llmServiceOptions.value = Array.isArray(llmRes) ? llmRes : (llmRes as any).data || [];

    // 加载模型选项列表
    const modelsRes = await mepRequestClient.get<any[]>('/openclaw/models');
    const modelsData = Array.isArray(modelsRes) ? modelsRes : (modelsRes as any).data || [];
    modelOptions.value = modelsData.map((m: any) => ({
      label: m.label,
      value: m.value,
      provider: m.provider,
    }));
  } catch (error) {
    console.error('加载选项数据失败:', error);
  }
};

// 加载在线工作站列表
const loadWorkstations = async () => {
  workstationLoading.value = true;
  try {
    workstationList.value = await getOnlineWorkstations();
  } catch (error) {
    console.error('加载工作站列表失败:', error);
    workstationList.value = [];
  } finally {
    workstationLoading.value = false;
  }
};

// 选择工作站时自动填充 gatewayHost
const handleWorkstationChange = (workstationId: number) => {
  const selected = workstationList.value.find(w => w.id === workstationId);
  if (selected) {
    formData.gatewayHost = selected.ipAddress;
  }
};

// 生成Gateway令牌并保存到API密钥管理
const generatingToken = ref(false);
const handleGenerateToken = async () => {
  generatingToken.value = true;
  try {
    const res = await mepRequestClient.post<any>('/openclaw/generate-token', {
      instanceName: formData.name || 'OpenClaw',
    });
    const data = res?.data ?? res;
    if (data?.token) {
      formData.gatewayToken = data.token;
      message.success('令牌已生成并保存到API密钥管理');
    }
  } catch (error) {
    console.error('生成令牌失败:', error);
    message.error('生成令牌失败');
  } finally {
    generatingToken.value = false;
  }
};

// 选择API密钥时清空手动输入
const handleApiKeyChange = (apiKeyId: number | undefined) => {
  if (apiKeyId) {
    formData.apiKey = '';
  }
};

// 加载实例数据（编辑模式）
const loadInstance = async () => {
  const id = route.query.id as string;
  if (!id) return;

  isEdit.value = true;
  loading.value = true;

  try {
    const res = await mepRequestClient.get<any>(`/openclaw/instances/${id}`);
    const instance = res?.data ?? res;
    if (instance && typeof instance === 'object' && !Array.isArray(instance)) {
      // fallbackModels 从后端返回的是JSON字符串，需要解析为数组
      if (typeof instance.fallbackModels === 'string' && instance.fallbackModels) {
        try {
          instance.fallbackModels = JSON.parse(instance.fallbackModels);
        } catch {
          instance.fallbackModels = [];
        }
      } else if (!instance.fallbackModels) {
        instance.fallbackModels = [];
      }
      Object.assign(formData, instance);
    }
  } catch (error) {
    console.error('加载实例数据失败:', error);
    message.error('加载实例数据失败');
  } finally {
    loading.value = false;
  }
};

// 提交表单
const handleSubmit = async () => {
  try {
    await formRef.value?.validate();
    submitting.value = true;

    if (isEdit.value) {
      await mepRequestClient.put(`/openclaw/instances/${formData.id}`, formData);
      message.success('更新成功');
    } else {
      await mepRequestClient.post('/openclaw/instances', formData);
      message.success('创建成功');
    }

    router.push('/MEP/openclaw/index');
  } catch (error) {
    console.error('提交失败:', error);
    if ((error as any).errorFields) {
      message.error('请检查表单填写是否正确');
    } else {
      message.error('提交失败');
    }
  } finally {
    submitting.value = false;
  }
};

// 测试连接
const handleTestConnection = async () => {
  try {
    const res = await mepRequestClient.post<{ data: { success: boolean; message: string } }>(
      '/openclaw/test-connection',
      {
        host: formData.gatewayHost,
        port: formData.gatewayPort,
        token: formData.gatewayToken,
      }
    );
    if (res.data.success) {
      message.success('连接成功');
    } else {
      message.error(res.data.message || '连接失败');
    }
  } catch (error) {
    message.error('连接测试失败');
  }
};

// 返回列表
const handleBack = () => {
  router.push('/MEP/openclaw/index');
};

onMounted(() => {
  loadOptions();
  loadWorkstations();
  loadInstance();
});
</script>

<template>
  <div class="p-4">
    <!-- 页面标题 -->
    <Card class="mb-4 shadow">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <Button type="text" @click="handleBack">
            <ArrowLeftOutlined />
          </Button>
          <div>
            <h2 class="m-0 text-xl font-semibold">
              {{ isEdit ? '编辑OpenClaw实例' : '新建OpenClaw实例' }}
            </h2>
            <p class="m-0 text-gray-500">配置OpenClaw个人助手的部署参数</p>
          </div>
        </div>
        <Space>
          <Button @click="handleBack">取消</Button>
          <Button type="primary" :loading="submitting" @click="handleSubmit">
            <SaveOutlined />
            {{ isEdit ? '保存修改' : '创建实例' }}
          </Button>
        </Space>
      </div>
    </Card>

    <!-- 表单内容 -->
    <Spin :spinning="loading">
      <Form
        ref="formRef"
        :model="formData"
        :rules="rules"
        layout="vertical"
        class="max-w-4xl"
      >
        <Row :gutter="24">
          <!-- 左侧：基本配置 -->
          <Col :span="12">
            <Card title="基本信息" class="mb-4 shadow">
              <FormItem label="实例名称" name="name">
                <Input v-model:value="formData.name" placeholder="请输入实例名称" />
              </FormItem>

              <FormItem label="描述" name="description">
                <Textarea
                  v-model:value="formData.description"
                  placeholder="请输入实例描述"
                  :rows="3"
                />
              </FormItem>

              <FormItem label="部署模式" name="deployMode">
                <Select v-model:value="formData.deployMode" placeholder="请选择部署模式">
                  <SelectOption v-for="opt in deployModeOptions" :key="opt.value" :value="opt.value">
                    <div>
                      <div>{{ opt.label }}</div>
                      <div class="text-xs text-gray-400">{{ opt.description }}</div>
                    </div>
                  </SelectOption>
                </Select>
              </FormItem>
            </Card>

            <Card title="Gateway配置" class="mb-4 shadow">
              <FormItem label="目标工作站" name="workstationId">
                <Select
                  v-model:value="formData.workstationId"
                  placeholder="请选择已注册的云服务器"
                  :loading="workstationLoading"
                  show-search
                  :filter-option="(input: string, option: any) =>
                    option.label?.toLowerCase().includes(input.toLowerCase())"
                  @change="handleWorkstationChange"
                >
                  <SelectOption
                    v-for="ws in workstationList"
                    :key="ws.id"
                    :value="ws.id"
                    :label="`${ws.name} (${ws.ipAddress})`"
                  >
                    <div class="flex items-center justify-between">
                      <span>{{ ws.name }} ({{ ws.ipAddress }})</span>
                      <span class="text-xs text-gray-400">{{ ws.region }}</span>
                    </div>
                  </SelectOption>
                </Select>
                <div class="mt-1 text-xs text-gray-400">
                  从SMP已注册的在线工作站中选择部署目标
                </div>
              </FormItem>

              <FormItem label="主机地址" name="gatewayHost">
                <Input v-model:value="formData.gatewayHost" disabled placeholder="选择工作站后自动填充" />
              </FormItem>

              <FormItem label="端口" name="gatewayPort">
                <InputNumber
                  v-model:value="formData.gatewayPort"
                  :min="1"
                  :max="65535"
                  style="width: 100%"
                />
              </FormItem>

              <FormItem label="访问令牌" name="gatewayToken">
                <div class="flex gap-2">
                  <Input.Password
                    v-model:value="formData.gatewayToken"
                    placeholder="可选，用于Gateway认证"
                    class="flex-1"
                  />
                  <Button :loading="generatingToken" @click="handleGenerateToken">
                    <KeyOutlined />
                    生成
                  </Button>
                </div>
                <div class="mt-1 text-xs text-gray-400">
                  点击生成将自动创建令牌并保存到MEP-API密钥管理
                </div>
              </FormItem>

              <Button v-if="isEdit" @click="handleTestConnection">测试连接</Button>
            </Card>
          </Col>

          <!-- 右侧：模型和服务配置 -->
          <Col :span="12">
            <Card title="模型配置" class="mb-4 shadow">
              <FormItem label="主模型" name="defaultModel">
                <Select
                  v-model:value="formData.defaultModel"
                  placeholder="请选择主模型"
                  show-search
                  :filter-option="(input: string, option: any) =>
                    option.label?.toLowerCase().includes(input.toLowerCase())"
                >
                  <SelectOption
                    v-for="opt in modelOptions"
                    :key="opt.value"
                    :value="opt.value"
                    :label="`${opt.label} (${opt.provider})`"
                  >
                    {{ opt.label }}
                    <span class="text-gray-400"> ({{ opt.provider }})</span>
                  </SelectOption>
                </Select>
                <div class="mt-1 text-xs text-gray-400">
                  主要使用的模型，必选
                </div>
              </FormItem>

              <FormItem label="回退模型" name="fallbackModels">
                <Select
                  v-model:value="formData.fallbackModels"
                  mode="multiple"
                  placeholder="可选，主模型失败时按顺序尝试"
                  show-search
                  :filter-option="(input: string, option: any) =>
                    option.label?.toLowerCase().includes(input.toLowerCase())"
                >
                  <SelectOption
                    v-for="opt in modelOptions.filter((m: any) => m.value !== formData.defaultModel)"
                    :key="opt.value"
                    :value="opt.value"
                    :label="`${opt.label} (${opt.provider})`"
                  >
                    {{ opt.label }}
                    <span class="text-gray-400"> ({{ opt.provider }})</span>
                  </SelectOption>
                </Select>
                <div class="mt-1 text-xs text-gray-400">
                  当主模型不可用时，按选择顺序依次尝试回退模型
                </div>
              </FormItem>

              <FormItem label="子代理模型" name="subagentModel">
                <Select
                  v-model:value="formData.subagentModel"
                  placeholder="可选，用于子任务的轻量模型"
                  allow-clear
                  show-search
                  :filter-option="(input: string, option: any) =>
                    option.label?.toLowerCase().includes(input.toLowerCase())"
                >
                  <SelectOption
                    v-for="opt in modelOptions"
                    :key="opt.value"
                    :value="opt.value"
                    :label="`${opt.label} (${opt.provider})`"
                  >
                    {{ opt.label }}
                    <span class="text-gray-400"> ({{ opt.provider }})</span>
                  </SelectOption>
                </Select>
                <div class="mt-1 text-xs text-gray-400">
                  子代理执行简单子任务时使用的模型，通常选择更经济的模型
                </div>
              </FormItem>

              <Divider />

              <FormItem label="关联LLM服务" name="llmServiceId">
                <Select
                  v-model:value="formData.llmServiceId"
                  placeholder="可选，选择MEP中的LLM服务"
                  allow-clear
                >
                  <SelectOption
                    v-for="opt in llmServiceOptions"
                    :key="opt.id"
                    :value="opt.id"
                  >
                    {{ opt.name }} ({{ opt.type }})
                  </SelectOption>
                </Select>
              </FormItem>

              <FormItem label="API密钥" name="apiKeyRefId">
                <Select
                  v-model:value="formData.apiKeyRefId"
                  placeholder="从API密钥管理中选择"
                  allow-clear
                  show-search
                  :filter-option="(input: string, option: any) =>
                    option.label?.toLowerCase().includes(input.toLowerCase())"
                  @change="handleApiKeyChange"
                >
                  <SelectOption
                    v-for="opt in apiKeyOptions"
                    :key="opt.id"
                    :value="opt.id"
                    :label="`${opt.name} (${opt.provider})`"
                  >
                    <div class="flex items-center justify-between">
                      <span>{{ opt.name }}</span>
                      <span class="text-xs text-gray-400">{{ opt.provider }} | {{ opt.keyMasked }}</span>
                    </div>
                  </SelectOption>
                </Select>
                <div class="mt-1 text-xs text-gray-400">
                  从MEP-API密钥管理模块中选取已添加的密钥
                </div>
              </FormItem>

              <FormItem label="或直接输入密钥" name="apiKey">
                <Input.Password
                  v-model:value="formData.apiKey"
                  placeholder="直接输入API密钥（优先使用上方选择的托管密钥）"
                  :disabled="!!formData.apiKeyRefId"
                />
                <div class="mt-1 text-xs text-gray-400">
                  未选择托管密钥时可直接输入，密钥将加密存储
                </div>
              </FormItem>
            </Card>

            <Card title="高级配置" class="mb-4 shadow">
              <FormItem label="启用的技能" name="enabledSkills">
                <Textarea
                  v-model:value="formData.enabledSkills"
                  placeholder='["github", "weather", "coding-agent"]'
                  :rows="3"
                />
                <div class="mt-1 text-xs text-gray-400">
                  JSON数组格式，指定要启用的内置技能
                </div>
              </FormItem>

              <Divider />

              <FormItem label="渠道配置" name="channelsConfig">
                <Textarea
                  v-model:value="formData.channelsConfig"
                  placeholder='{"telegram": {"botToken": "..."}}'
                  :rows="4"
                />
                <div class="mt-1 text-xs text-gray-400">
                  JSON对象格式，配置消息渠道（Telegram、Discord等）
                </div>
              </FormItem>
            </Card>
          </Col>
        </Row>
      </Form>
    </Spin>
  </div>
</template>
