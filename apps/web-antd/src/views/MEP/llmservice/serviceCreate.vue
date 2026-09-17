<script lang="ts" setup>
import BusinessPage from '#/components/workspace/BusinessPage.vue';
import type { LLMServiceConfig, LLMServiceType } from '../api/types';

import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  ApiOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
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
  InputPassword,
  message,
  Row,
  Select,
  SelectOption,
  Slider,
  Switch,
  Textarea,
} from 'ant-design-vue';

import { createLLMService, testLLMServiceConnection } from '../api/llmService';

const router = useRouter();

// 服务类型选项
const serviceTypeOptions: { label: string; value: LLMServiceType; description: string }[] = [
  { label: 'Ollama', value: 'ollama', description: '本地部署的Ollama服务' },
  { label: 'OpenAI', value: 'openai', description: 'OpenAI官方API服务' },
  { label: 'DeepSeek', value: 'deepseek', description: 'DeepSeek大模型API服务' },
  { label: '自定义', value: 'custom', description: '自定义大模型API服务' },
];

// 预设模型选项
const modelOptions: Record<LLMServiceType, string[]> = {
  ollama: ['llama2', 'llama2:13b', 'llama2:70b', 'codellama', 'mistral', 'mixtral', 'qwen', 'qwen2'],
  openai: ['gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'],
  deepseek: ['deepseek-chat', 'deepseek-coder', 'deepseek-v2', 'deepseek-v2.5'],
  custom: [],
};

// 预设端点
const defaultEndpoints: Record<LLMServiceType, string> = {
  ollama: 'http://localhost:11434',
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
  custom: '',
};

// 表单数据
const formState = reactive({
  name: '',
  type: 'ollama' as LLMServiceType,
  description: '',
  endpoint: 'http://localhost:11434',
  model_name: '',
  api_key: '',
  config: {
    max_tokens: 2048,
    temperature: 0.7,
    top_p: 0.9,
    timeout: 30000,
    retry_count: 3,
  } as LLMServiceConfig,
});

// 表单验证规则
const rules = {
  name: [{ required: true, message: '请输入服务名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择服务类型', trigger: 'change' }],
  endpoint: [{ required: true, message: '请输入服务端点', trigger: 'blur' }],
  model_name: [{ required: true, message: '请选择或输入模型名称', trigger: 'blur' }],
};

// 提交状态
const submitLoading = ref(false);
const testLoading = ref(false);
const testResult = ref<{ success: boolean; message: string } | null>(null);

// 类型变化时更新默认端点
const handleTypeChange = (value: LLMServiceType) => {
  formState.endpoint = defaultEndpoints[value];
  formState.model_name = '';
  formState.api_key = '';
  testResult.value = null;
};

// 测试连接
const handleTestConnection = async () => {
  if (!formState.endpoint) {
    message.warning('请先输入服务端点');
    return;
  }
  try {
    testLoading.value = true;
    testResult.value = null;
    const result = await testLLMServiceConnection({
      endpoint: formState.endpoint,
      api_key: formState.api_key || undefined,
      type: formState.type,
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
    await createLLMService({
      name: formState.name,
      type: formState.type,
      description: formState.description,
      endpoint: formState.endpoint,
      model_name: formState.model_name,
      api_key: formState.api_key || undefined,
      config: formState.config,
    });
    router.push('/MEP/llmservice/index');
  } catch (error) {
    console.error('创建服务失败:', error);
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
  <BusinessPage domain="服务交付" description="集中管理模型服务、节点与访问密钥，按实际运行结果确认状态。">
  <Card title="新增大模型服务" class="m-4 shadow">
    <Form
      :model="formState"
      :rules="rules"
      layout="vertical"
      @finish="handleSubmit"
    >
      <Row :gutter="24">
        <Col :span="12">
          <FormItem label="服务名称" name="name" required>
            <Input
              v-model:value="formState.name"
              placeholder="请输入服务名称"
              :maxlength="50"
              show-count
            />
          </FormItem>
        </Col>
        <Col :span="12">
          <FormItem label="服务类型" name="type" required>
            <Select
              v-model:value="formState.type"
              placeholder="请选择服务类型"
              @change="handleTypeChange"
            >
              <SelectOption v-for="opt in serviceTypeOptions" :key="opt.value" :value="opt.value">
                <div class="flex items-center justify-between">
                  <span>{{ opt.label }}</span>
                  <span class="text-xs text-gray-400">{{ opt.description }}</span>
                </div>
              </SelectOption>
            </Select>
          </FormItem>
        </Col>
      </Row>

      <Row :gutter="24">
        <Col :span="16">
          <FormItem label="服务端点" name="endpoint" required>
            <Input
              v-model:value="formState.endpoint"
              placeholder="请输入服务端点URL"
            >
              <template #addonAfter>
                <Button
                  type="link"
                  size="small"
                  :loading="testLoading"
                  @click="handleTestConnection"
                >
                  <ApiOutlined />
                  测试连接
                </Button>
              </template>
            </Input>
            <div v-if="testResult" class="mt-2">
              <span v-if="testResult.success" class="text-green-500">
                <CheckCircleOutlined /> 连接成功
              </span>
              <span v-else class="text-red-500">
                {{ testResult.message }}
              </span>
            </div>
          </FormItem>
        </Col>
        <Col :span="8">
          <FormItem label="模型名称" name="model_name" required>
            <Select
              v-if="modelOptions[formState.type]?.length > 0"
              v-model:value="formState.model_name"
              placeholder="请选择模型"
              show-search
              allow-clear
            >
              <SelectOption
                v-for="model in modelOptions[formState.type]"
                :key="model"
                :value="model"
              >
                {{ model }}
              </SelectOption>
            </Select>
            <Input
              v-else
              v-model:value="formState.model_name"
              placeholder="请输入模型名称"
            />
          </FormItem>
        </Col>
      </Row>

      <Row :gutter="24" v-if="formState.type !== 'ollama'">
        <Col :span="12">
          <FormItem label="API Key" name="api_key">
            <InputPassword
              v-model:value="formState.api_key"
              placeholder="请输入API Key"
              :visibility-toggle="true"
            />
            <div class="mt-1 text-xs text-gray-400">
              <template v-if="formState.type === 'openai'">
                OpenAI API Key 以 sk- 开头
              </template>
              <template v-else-if="formState.type === 'deepseek'">
                DeepSeek API Key
              </template>
              <template v-else>
                自定义服务的认证密钥
              </template>
            </div>
          </FormItem>
        </Col>
      </Row>

      <FormItem label="描述" name="description">
        <Textarea
          v-model:value="formState.description"
          placeholder="请输入服务描述"
          :rows="3"
          :maxlength="200"
          show-count
        />
      </FormItem>

      <Divider>高级配置</Divider>

      <Row :gutter="24">
        <Col :span="8">
          <FormItem label="最大Token数">
            <InputNumber
              v-model:value="formState.config.max_tokens"
              :min="1"
              :max="128000"
              style="width: 100%"
            />
          </FormItem>
        </Col>
        <Col :span="8">
          <FormItem label="Temperature">
            <Slider
              v-model:value="formState.config.temperature"
              :min="0"
              :max="2"
              :step="0.1"
            />
            <div class="text-center text-gray-500">{{ formState.config.temperature }}</div>
          </FormItem>
        </Col>
        <Col :span="8">
          <FormItem label="Top P">
            <Slider
              v-model:value="formState.config.top_p"
              :min="0"
              :max="1"
              :step="0.1"
            />
            <div class="text-center text-gray-500">{{ formState.config.top_p }}</div>
          </FormItem>
        </Col>
      </Row>

      <Row :gutter="24">
        <Col :span="8">
          <FormItem label="超时时间(ms)">
            <InputNumber
              v-model:value="formState.config.timeout"
              :min="1000"
              :max="300000"
              :step="1000"
              style="width: 100%"
            />
          </FormItem>
        </Col>
        <Col :span="8">
          <FormItem label="重试次数">
            <InputNumber
              v-model:value="formState.config.retry_count"
              :min="0"
              :max="10"
              style="width: 100%"
            />
          </FormItem>
        </Col>
      </Row>

      <Divider />

      <FormItem>
        <div class="flex justify-end gap-4">
          <Button @click="handleCancel">取消</Button>
          <Button type="primary" html-type="submit" :loading="submitLoading">
            创建服务
          </Button>
        </div>
      </FormItem>
    </Form>
  </Card>

  </BusinessPage>
</template>

<style scoped>
:deep(.ant-form-item-label > label) {
  font-weight: 500;
}

:deep(.ant-card-head-title) {
  font-size: 18px;
  font-weight: 600;
}
</style>
