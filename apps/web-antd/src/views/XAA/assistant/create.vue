<script lang="ts" setup>
import BusinessPage from '#/components/workspace/BusinessPage.vue';
import type { FormInstance } from 'ant-design-vue';
import type { Assistant } from '../api/types';

import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons-vue';
import {
  Alert,
  Button,
  Card,
  Checkbox,
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
  Slider,
  Space,
  Spin,
  Textarea,
} from 'ant-design-vue';

import { mepRequestClient } from '#/api/request';

import {
  createAssistant,
  fetchAssistant,
  updateAssistant,
} from '../api/assistant';

const router = useRouter();
const route = useRoute();

const isEdit = computed(
  () => route.path.endsWith('/edit') || route.query.id !== undefined,
);
const loading = ref(false);
const loaded = ref(false);
const loadError = ref('');
const instanceError = ref('');
const submitError = ref('');
let loadGeneration = 0;
const submitting = ref(false);
const formRef = ref<FormInstance>();

// OpenClaw 实例选项
const openclawInstances = ref<
  Array<{
    id: number;
    uid: string;
    name: string;
    gatewayHost: string;
    gatewayPort: number;
    gatewayToken: string;
    status: string;
  }>
>([]);

// 表单数据
const initialFormData: Partial<Assistant> = {
  name: '',
  description: '',
  avatar: '',
  openclawInstanceId: undefined,
  gatewayUrl: '',
  gatewayToken: '',
  defaultModel: 'anthropic/claude-sonnet-4-5',
  systemPrompt: '',
  temperature: 0.7,
  maxTokens: 4096,
  ragEnabled: false,
  ragTopK: 5,
  toolsEnabled: true,
  welcomeMessage: '',
  placeholder: '有什么可以帮助您的?',
  status: 'active',
  isDefault: false,
};
const formData = reactive<Partial<Assistant>>({ ...initialFormData });

// 模型选项
const modelOptions = [
  {
    label: 'Claude Opus 4.6',
    value: 'anthropic/claude-opus-4-6',
    provider: 'Anthropic',
  },
  {
    label: 'Claude Sonnet 4.5',
    value: 'anthropic/claude-sonnet-4-5',
    provider: 'Anthropic',
  },
  { label: 'GPT-5.2', value: 'openai/gpt-5.2', provider: 'OpenAI' },
  { label: 'GPT-5 Mini', value: 'openai/gpt-5-mini', provider: 'OpenAI' },
  {
    label: 'Gemini 3 Pro',
    value: 'google/gemini-3-pro-preview',
    provider: 'Google',
  },
  {
    label: 'Gemini 3 Flash',
    value: 'google/gemini-3-flash-preview',
    provider: 'Google',
  },
  {
    label: 'DeepSeek Chat',
    value: 'deepseek/deepseek-chat',
    provider: 'DeepSeek',
  },
  {
    label: 'DeepSeek Coder',
    value: 'deepseek/deepseek-coder',
    provider: 'DeepSeek',
  },
];

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入助手名称' },
    { min: 2, max: 50, message: '名称长度在2-50个字符之间' },
  ],
  defaultModel: [{ required: true, message: '请选择默认模型' }],
};

/** 加载实例选项，失败提示可重试且保留手动配置。 Load instance options with a retryable error while retaining manual configuration. */
const loadOpenclawInstances = async () => {
  instanceError.value = '';
  try {
    const res = await mepRequestClient.get<any>('/openclaw/instances');
    const list = Array.isArray(res) ? res : (res as any)?.data || [];
    openclawInstances.value = list;
  } catch (error) {
    instanceError.value = '实例列表加载失败，可重试或手动填写 Gateway 配置。';
  }
};

/** 根据选中的现有实例填充网关连接配置。 Populate gateway connection fields from the selected existing instance. */
const handleInstanceChange = (value: unknown) => {
  const instanceId = typeof value === 'number' ? value : undefined;
  if (!instanceId) {
    formData.openclawInstanceId = undefined;
    formData.gatewayUrl = '';
    formData.gatewayToken = '';
    return;
  }
  const inst = openclawInstances.value.find((i) => i.id === instanceId);
  if (inst) {
    const host = inst.gatewayHost || 'localhost';
    const port = inst.gatewayPort || 18789;
    formData.gatewayUrl = `http://${host}:${port}`;
    // token 优先用实例配置的，否则用实例 UID（与后端 buildConfigMap fallback 一致）
    formData.gatewayToken = inst.gatewayToken || inst.uid || '';
  }
};

/** 读取编辑目标并核对id，失败不开放空表单写入。 Load and verify the edit target without enabling blank writes after failure. */
const loadAssistant = async () => {
  const generation = ++loadGeneration;
  loading.value = false;
  loaded.value = false;
  loadError.value = '';
  submitError.value = '';
  for (const key of Object.keys(formData))
    delete formData[key as keyof Assistant];
  Object.assign(formData, initialFormData);
  if (!isEdit.value) {
    loaded.value = true;
    return;
  }
  const raw = route.query.id;
  const id =
    typeof raw === 'string' && /^[1-9]\d*$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isSafeInteger(id)) {
    loadError.value = '缺少有效的助手 ID，请从助手列表选择要编辑的助手。';
    return;
  }
  loading.value = true;

  try {
    const data = await fetchAssistant(id);
    if (generation !== loadGeneration) return;
    if (!data || data.id !== id) throw new Error('助手不存在或返回资料无效');
    Object.assign(formData, data);
    loaded.value = true;
  } catch (error) {
    if (generation === loadGeneration)
      loadError.value = '助手资料加载失败或已不可访问，请重试或返回列表。';
  } finally {
    if (generation === loadGeneration) loading.value = false;
  }
};

/** 只提交已载入目标，失败保留输入并阻止重复提交。 Submit only a loaded target, retain edits on failure and reject duplicate submissions. */
const handleSubmit = async () => {
  if (submitting.value || loading.value || !loaded.value || loadError.value)
    return;
  submitting.value = true;
  submitError.value = '';
  try {
    await formRef.value?.validate();

    if (isEdit.value) {
      await updateAssistant(formData.id!, formData);
      message.success('更新成功');
    } else {
      await createAssistant(formData);
      message.success('创建成功');
    }

    router.push('/XAA/assistant/index');
  } catch (error) {
    console.error('提交失败:', error);
    if ((error as any).errorFields) {
      message.error('请检查表单填写是否正确');
    } else {
      submitError.value = '提交未完成，当前填写内容已保留，请检查服务后重试。';
    }
  } finally {
    submitting.value = false;
  }
};

/** 返回已有助手列表入口。 Return to the existing assistant list. */
const handleBack = () => {
  router.push('/XAA/assistant/index');
};

onMounted(() => {
  loadOpenclawInstances();
});
// 路由目标改变时重新校验，旧目标响应不回填。 Revalidate changed route targets and discard previous responses.
watch(() => [route.path, route.query.id], loadAssistant, { immediate: true });
onBeforeUnmount(() => {
  loadGeneration++;
});
</script>

<template>
  <BusinessPage
    domain="智能协作"
    description="用助手、技能与工作流串联日常任务，查看每一步执行记录。"
    existing-title
  >
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
                {{ isEdit ? '编辑助手' : '新建助手' }}
              </h2>
              <p class="m-0 text-gray-500">配置OpenClaw个人助手的各项参数</p>
            </div>
          </div>
          <Space>
            <Button @click="handleBack">取消</Button>
            <Button
              type="primary"
              :loading="submitting"
              :disabled="loading || !loaded || !!loadError"
              @click="handleSubmit"
            >
              <SaveOutlined />
              {{ isEdit ? '保存修改' : '创建助手' }}
            </Button>
          </Space>
        </div>
      </Card>

      <Alert
        v-if="loadError"
        :message="loadError"
        type="error"
        show-icon
        class="mb-4"
      >
        <template #action
          ><Button size="small" @click="loadAssistant"
            >重试读取</Button
          ></template
        >
      </Alert>
      <Alert
        v-if="submitError"
        :message="submitError"
        type="error"
        show-icon
        class="mb-4"
      />
      <Alert
        v-if="instanceError"
        :message="instanceError"
        type="warning"
        show-icon
        class="mb-4"
      >
        <template #action
          ><Button size="small" @click="loadOpenclawInstances"
            >重试实例列表</Button
          ></template
        >
      </Alert>
      <!-- 表单内容 -->
      <Spin :spinning="loading">
        <Form
          v-if="!loadError"
          :disabled="loading || submitting || !loaded"
          ref="formRef"
          :model="formData"
          :rules="rules"
          layout="vertical"
          class="max-w-4xl"
        >
          <Row :gutter="24">
            <!-- 左侧：基本信息 -->
            <Col :xs="24" :lg="12">
              <Card title="基本信息" class="mb-4 shadow">
                <FormItem label="助手名称" name="name">
                  <Input
                    v-model:value="formData.name"
                    placeholder="请输入助手名称"
                  />
                </FormItem>

                <FormItem label="描述" name="description">
                  <Textarea
                    v-model:value="formData.description"
                    placeholder="请输入助手描述"
                    :rows="3"
                  />
                </FormItem>

                <FormItem label="头像URL" name="avatar">
                  <Input
                    v-model:value="formData.avatar"
                    placeholder="可选，输入头像图片URL"
                  />
                </FormItem>

                <FormItem label="欢迎消息" name="welcomeMessage">
                  <Textarea
                    v-model:value="formData.welcomeMessage"
                    placeholder="用户打开对话时显示的欢迎消息"
                    :rows="2"
                  />
                </FormItem>

                <FormItem label="输入框占位符" name="placeholder">
                  <Input
                    v-model:value="formData.placeholder"
                    placeholder="输入框的占位提示文字"
                  />
                </FormItem>
              </Card>

              <Card title="OpenClaw配置" class="mb-4 shadow">
                <FormItem label="OpenClaw 实例" name="openclawInstanceId">
                  <Select
                    v-model:value="formData.openclawInstanceId"
                    placeholder="选择已部署的 OpenClaw 实例（自动填充URL和Token）"
                    allow-clear
                    show-search
                    option-filter-prop="label"
                    @change="handleInstanceChange"
                  >
                    <SelectOption
                      v-for="inst in openclawInstances"
                      :key="inst.id"
                      :value="inst.id"
                      :label="inst.name"
                    >
                      {{ inst.name }}
                      <span class="text-gray-400"> ({{ inst.status }})</span>
                    </SelectOption>
                  </Select>
                  <div class="mt-1 text-xs text-gray-400">
                    选择实例后自动填充 Gateway URL 和认证令牌
                  </div>
                </FormItem>

                <FormItem label="Gateway URL" name="gatewayUrl">
                  <Input
                    v-model:value="formData.gatewayUrl"
                    placeholder="http://localhost:18789"
                  />
                  <div class="mt-1 text-xs text-gray-400">
                    OpenClaw Gateway 的 HTTP 地址，选择实例后自动填充
                  </div>
                </FormItem>

                <FormItem label="Gateway Token" name="gatewayToken">
                  <Input.Password
                    v-model:value="formData.gatewayToken"
                    placeholder="选择实例后自动填充，也可手动输入"
                  />
                  <div class="mt-1 text-xs text-gray-400">
                    Gateway 认证令牌，用于访问 OpenClaw API
                  </div>
                </FormItem>
              </Card>
            </Col>

            <!-- 右侧：模型和功能配置 -->
            <Col :xs="24" :lg="12">
              <Card title="模型配置" class="mb-4 shadow">
                <FormItem label="默认模型" name="defaultModel">
                  <Select
                    v-model:value="formData.defaultModel"
                    placeholder="请选择默认模型"
                    show-search
                  >
                    <SelectOption
                      v-for="opt in modelOptions"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                      <span class="text-gray-400"> ({{ opt.provider }})</span>
                    </SelectOption>
                  </Select>
                </FormItem>

                <FormItem label="温度参数" name="temperature">
                  <Row :gutter="16">
                    <Col :span="16">
                      <Slider
                        v-model:value="formData.temperature"
                        :min="0"
                        :max="1"
                        :step="0.1"
                      />
                    </Col>
                    <Col :span="8">
                      <InputNumber
                        v-model:value="formData.temperature"
                        :min="0"
                        :max="1"
                        :step="0.1"
                        style="width: 100%"
                      />
                    </Col>
                  </Row>
                  <div class="mt-1 text-xs text-gray-400">
                    较低值使输出更确定，较高值使输出更多样化
                  </div>
                </FormItem>

                <FormItem label="最大Token数" name="maxTokens">
                  <InputNumber
                    v-model:value="formData.maxTokens"
                    :min="256"
                    :max="128000"
                    :step="256"
                    style="width: 100%"
                  />
                </FormItem>

                <FormItem label="系统提示词" name="systemPrompt">
                  <Textarea
                    v-model:value="formData.systemPrompt"
                    placeholder="可选，自定义系统提示词来定制助手行为"
                    :rows="4"
                  />
                </FormItem>
              </Card>

              <Card title="功能开关" class="mb-4 shadow">
                <FormItem name="ragEnabled">
                  <Checkbox v-model:checked="formData.ragEnabled">
                    启用RAG知识库检索
                  </Checkbox>
                  <div class="ml-6 text-xs text-gray-400">
                    从关联的知识库中检索相关内容增强回答
                  </div>
                </FormItem>

                <FormItem
                  v-if="formData.ragEnabled"
                  label="检索结果数"
                  name="ragTopK"
                >
                  <InputNumber
                    v-model:value="formData.ragTopK"
                    :min="1"
                    :max="20"
                    style="width: 120px"
                  />
                </FormItem>

                <Divider />

                <FormItem name="toolsEnabled">
                  <Checkbox v-model:checked="formData.toolsEnabled">
                    启用工具调用
                  </Checkbox>
                  <div class="ml-6 text-xs text-gray-400">
                    允许助手调用已安装的技能工具
                  </div>
                </FormItem>

                <Divider />

                <FormItem name="isDefault">
                  <Checkbox v-model:checked="formData.isDefault">
                    设为默认助手
                  </Checkbox>
                  <div class="ml-6 text-xs text-gray-400">
                    默认助手将在浮窗中优先显示
                  </div>
                </FormItem>
              </Card>
            </Col>
          </Row>
        </Form>
      </Spin>
    </div>
  </BusinessPage>
</template>

<style scoped>
:deep(.ant-card-head-title) {
  font-weight: 600;
}
</style>
