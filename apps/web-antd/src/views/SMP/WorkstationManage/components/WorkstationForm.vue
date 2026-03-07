<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted } from 'vue';
import {
  Modal, Form, FormItem, Input, InputNumber, Select, SelectOption,
  Button, Space, Row, Col, Divider, Alert, Spin, message, Textarea,
  Radio, RadioGroup, Switch, Tooltip, Card, Tag
} from 'ant-design-vue';
import {
  CheckCircleOutlined, LoadingOutlined, CloudServerOutlined,
  QuestionCircleOutlined, DesktopOutlined, HddOutlined,
  GlobalOutlined, KeyOutlined, ThunderboltOutlined
} from '@ant-design/icons-vue';
import type { Workstation, TestConnectionResult, OptionItem } from '../../api/workstation';
import {
  testConnection, createWorkstation, updateWorkstation,
  getVendorOptions, getServerTypeOptions, getRegionOptions,
  getOsTypeOptions, getOsVersionOptions, checkNameExists, checkHostnameExists
} from '../../api/workstation';

// Props
const props = defineProps<{
  visible: boolean;
  workstation: Workstation | null;
}>();

// Emits
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'success'): void;
}>();

// 状态
const loading = ref(false);
const testLoading = ref(false);
const connectionTested = ref(false);
const testResult = ref<TestConnectionResult | null>(null);

// 表单数据
const formState = reactive<Workstation>({
  name: '',
  hostname: '',
  hostnameMode: 'auto',
  vendor: 'tencent',
  serverType: 'cvm',
  region: 'guangzhou',
  osType: 'linux',
  osVersion: 'OpenCloudOS 9',
  cpuCores: 2,
  ramGb: 4,
  diskGb: 50,
  hasGpu: false,
  gpuCount: 0,
  gpuType: undefined,
  gpuModel: '',
  gpuMemory: undefined,
  domain: '',
  ipAddress: '',
  sshPort: 22,
  sshUser: 'root',
  authType: 'password',
  password: '',
  privateKey: '',
  description: '',
});

// 选项数据
const vendorOptions = ref<OptionItem[]>([]);
const serverTypeOptions = ref<OptionItem[]>([]);
const regionOptions = ref<OptionItem[]>([]);
const osTypeOptions = ref<OptionItem[]>([]);
const osVersionOptions = ref<OptionItem[]>([]);

// GPU 型号选项
const gpuModelOptions = [
  { value: 'NVIDIA A100', label: 'NVIDIA A100' },
  { value: 'NVIDIA A800', label: 'NVIDIA A800' },
  { value: 'NVIDIA H100', label: 'NVIDIA H100' },
  { value: 'NVIDIA V100', label: 'NVIDIA V100' },
  { value: 'NVIDIA T4', label: 'NVIDIA T4' },
  { value: 'NVIDIA RTX 4090', label: 'NVIDIA RTX 4090' },
  { value: 'NVIDIA RTX 3090', label: 'NVIDIA RTX 3090' },
  { value: 'NVIDIA RTX 3080', label: 'NVIDIA RTX 3080' },
  { value: 'AMD MI300X', label: 'AMD MI300X' },
  { value: 'AMD MI250X', label: 'AMD MI250X' },
  { value: 'other', label: '其他' },
];

// 计算属性
const isEdit = computed(() => !!props.workstation?.id);
const modalTitle = computed(() => isEdit.value ? '编辑工作站点' : '注册工作站点');
const canSubmit = computed(() => connectionTested.value && testResult.value?.success);

// 加载选项
const loadOptions = async () => {
  try {
    const [vendors, serverTypes, regions, osTypes, osVersions] = await Promise.all([
      getVendorOptions(),
      getServerTypeOptions(),
      getRegionOptions(),
      getOsTypeOptions(),
      getOsVersionOptions(formState.osType)
    ]);
    vendorOptions.value = vendors;
    serverTypeOptions.value = serverTypes;
    regionOptions.value = regions;
    osTypeOptions.value = osTypes;
    osVersionOptions.value = osVersions;
  } catch (error) {
    console.error('加载选项失败', error);
  }
};

// 系统类型变化时更新版本选项
const handleOsTypeChange = async (osType: string) => {
  try {
    const versions = await getOsVersionOptions(osType);
    osVersionOptions.value = versions;
    if (osVersionOptions.value.length > 0) {
      formState.osVersion = osVersionOptions.value[0].value;
    }
  } catch (error) {
    console.error('加载系统版本失败', error);
  }
};

// 测试连接
const handleTestConnection = async () => {
  if (!formState.ipAddress || !formState.sshUser) {
    message.warning('请先填写IP地址和SSH用户名');
    return;
  }

  if (formState.authType === 'password' && !formState.password) {
    message.warning('请填写SSH密码');
    return;
  }

  if (formState.authType === 'privateKey' && !formState.privateKey) {
    message.warning('请填写SSH私钥');
    return;
  }

  testLoading.value = true;
  connectionTested.value = false;
  testResult.value = null;

  try {
    const result = await testConnection(formState);
    testResult.value = result;
    connectionTested.value = true;

    if (result?.success) {
      message.success('连接成功!');
      // 自动填充检测到的资源信息
      if (result.cpuCores) formState.cpuCores = result.cpuCores;
      if (result.ramGb) formState.ramGb = result.ramGb;
      if (result.diskGb) formState.diskGb = result.diskGb;

      // 自动填充主机名（如果是自动模式）
      if (formState.hostnameMode === 'auto' && result.hostname) {
        formState.hostname = result.hostname;
      }

      // 自动填充 GPU 信息
      if (result.hasGpu !== undefined) {
        formState.hasGpu = result.hasGpu;
        if (result.hasGpu) {
          formState.gpuCount = result.gpuCount || 1;
          formState.gpuType = result.gpuType as any;
          formState.gpuModel = result.gpuModel || '';
          formState.gpuMemory = result.gpuMemory;
        }
      }
    } else {
      message.error('连接失败: ' + (result?.message || '未知错误'));
    }
  } catch (error: any) {
    message.error('测试失败: ' + error.message);
    testResult.value = { success: false, message: error.message };
    connectionTested.value = true;
  } finally {
    testLoading.value = false;
  }
};

// 提交表单
const handleSubmit = async () => {
  if (!connectionTested.value || !testResult.value?.success) {
    message.warning('请先通过测试连接');
    return;
  }

  // 验证名称
  if (!formState.name.trim()) {
    message.warning('请填写服务器名称');
    return;
  }

  // 验证主机名
  if (!formState.hostname?.trim()) {
    message.warning('请填写或自动获取主机名');
    return;
  }

  // 检查名称是否重复（新增时）
  if (!isEdit.value) {
    try {
      const nameCheck = await checkNameExists(formState.name);
      if (nameCheck.exists) {
        message.error('服务器名称已存在');
        return;
      }

      // 检查主机名是否重复
      const hostnameCheck = await checkHostnameExists(formState.hostname);
      if (hostnameCheck.exists) {
        message.error('主机名已存在，请修改主机名或使用自定义模式');
        return;
      }
    } catch (error) {
      console.error('检查名称/主机名失败', error);
    }
  }

  loading.value = true;
  try {
    if (isEdit.value && props.workstation?.id) {
      await updateWorkstation(props.workstation.id, formState);
      message.success('更新成功');
    } else {
      await createWorkstation(formState);
      message.success('注册成功');
    }
    emit('success');
    handleClose();
  } catch (error: any) {
    message.error('操作失败: ' + error.message);
  } finally {
    loading.value = false;
  }
};

// 关闭弹窗
const handleClose = () => {
  emit('update:visible', false);
  resetForm();
};

// 重置表单
const resetForm = () => {
  Object.assign(formState, {
    name: '',
    hostname: '',
    hostnameMode: 'auto',
    vendor: 'tencent',
    serverType: 'cvm',
    region: 'guangzhou',
    osType: 'linux',
    osVersion: 'OpenCloudOS 9',
    cpuCores: 2,
    ramGb: 4,
    diskGb: 50,
    hasGpu: false,
    gpuCount: 0,
    gpuType: undefined,
    gpuModel: '',
    gpuMemory: undefined,
    domain: '',
    ipAddress: '',
    sshPort: 22,
    sshUser: 'root',
    authType: 'password',
    password: '',
    privateKey: '',
    description: '',
  });
  connectionTested.value = false;
  testResult.value = null;
};

// 监听 visible 变化
watch(() => props.visible, (val) => {
  if (val) {
    loadOptions();
    if (props.workstation) {
      // 编辑模式：复制数据
      Object.assign(formState, props.workstation);
      // 编辑模式默认认为已测试通过
      connectionTested.value = true;
      testResult.value = { success: true, message: '已验证' };
    } else {
      resetForm();
    }
  }
});

// 监听主机名模式变化
watch(() => formState.hostnameMode, (mode) => {
  if (mode === 'auto' && testResult.value?.hostname) {
    formState.hostname = testResult.value.hostname;
  }
});

// 监听 hasGpu 变化
watch(() => formState.hasGpu, (hasGpu) => {
  if (!hasGpu) {
    formState.gpuCount = 0;
    formState.gpuType = undefined;
    formState.gpuModel = '';
    formState.gpuMemory = undefined;
  } else if (formState.gpuCount === 0) {
    formState.gpuCount = 1;
    formState.gpuType = 'single_gpu';
  }
});

// 监听 gpuCount 变化
watch(() => formState.gpuCount, (count) => {
  if (count && count > 1) {
    formState.gpuType = 'multi_gpu';
  } else if (count === 1) {
    formState.gpuType = 'single_gpu';
  }
});

onMounted(() => {
  loadOptions();
});
</script>

<template>
  <Modal
    :open="visible"
    :title="modalTitle"
    :width="800"
    :confirmLoading="loading"
    @cancel="handleClose"
    :footer="null"
    :bodyStyle="{ padding: '16px 24px', maxHeight: '70vh', overflowY: 'auto' }"
  >
    <Form layout="vertical" :model="formState" class="workstation-form">
      <!-- 连接信息卡片 -->
      <Card size="small" class="form-card">
        <template #title>
          <Space>
            <KeyOutlined />
            <span>SSH 连接配置</span>
          </Space>
        </template>

        <Row :gutter="16">
          <Col :span="10">
            <FormItem label="IP 地址" required>
              <Input v-model:value="formState.ipAddress" placeholder="192.168.1.100" />
            </FormItem>
          </Col>
          <Col :span="6">
            <FormItem label="SSH 端口">
              <InputNumber v-model:value="formState.sshPort" :min="1" :max="65535" style="width: 100%" />
            </FormItem>
          </Col>
          <Col :span="8">
            <FormItem label="用户名" required>
              <Input v-model:value="formState.sshUser" placeholder="root" />
            </FormItem>
          </Col>
        </Row>

        <Row :gutter="16">
          <Col :span="6">
            <FormItem label="认证方式" required>
              <Select v-model:value="formState.authType" style="width: 100%">
                <SelectOption value="password">密码认证</SelectOption>
                <SelectOption value="privateKey">密钥认证</SelectOption>
              </Select>
            </FormItem>
          </Col>
          <Col :span="18">
            <FormItem v-if="formState.authType === 'password'" label="SSH 密码" required>
              <Input.Password v-model:value="formState.password" placeholder="请输入SSH密码" />
            </FormItem>
            <FormItem v-else label="SSH 私钥" required>
              <Textarea
                v-model:value="formState.privateKey"
                placeholder="粘贴私钥内容 (-----BEGIN ... -----)"
                :rows="3"
              />
            </FormItem>
          </Col>
        </Row>

        <!-- 测试连接按钮 -->
        <div class="test-connection-section">
          <Button
            type="primary"
            @click="handleTestConnection"
            :loading="testLoading"
            :icon="h(testLoading ? LoadingOutlined : CloudServerOutlined)"
            size="large"
          >
            {{ testLoading ? '正在测试...' : '测试连接' }}
          </Button>

          <Alert
            v-if="connectionTested && testResult"
            :type="testResult.success ? 'success' : 'error'"
            :message="testResult.success ? '连接成功' : '连接失败'"
            showIcon
            class="test-result-alert"
          >
            <template #description v-if="testResult.success">
              <Space :size="16" wrap>
                <span><strong>主机名:</strong> {{ testResult.hostname || '-' }}</span>
                <span><strong>CPU:</strong> {{ testResult.cpuCores || '-' }} 核</span>
                <span><strong>内存:</strong> {{ testResult.ramGb || '-' }} GB</span>
                <span><strong>磁盘:</strong> {{ testResult.diskGb || '-' }} GB</span>
                <span v-if="testResult.hasGpu">
                  <Tag color="green">GPU: {{ testResult.gpuCount }}x {{ testResult.gpuModel || '未知' }}</Tag>
                </span>
              </Space>
            </template>
            <template #description v-else>
              {{ testResult.message }}
            </template>
          </Alert>
        </div>
      </Card>

      <!-- 基本信息卡片 -->
      <Card size="small" class="form-card">
        <template #title>
          <Space>
            <DesktopOutlined />
            <span>基本信息</span>
          </Space>
        </template>

        <Row :gutter="16">
          <Col :span="12">
            <FormItem label="服务器名称" required>
              <Input v-model:value="formState.name" placeholder="输入唯一的服务器名称" />
            </FormItem>
          </Col>
          <Col :span="12">
            <FormItem required>
              <template #label>
                <Space>
                  <span>主机名</span>
                  <Tooltip title="用于 Hadoop 等分布式系统的节点识别">
                    <QuestionCircleOutlined style="color: #999" />
                  </Tooltip>
                </Space>
              </template>
              <Input.Group compact>
                <Select v-model:value="formState.hostnameMode" style="width: 100px">
                  <SelectOption value="auto">自动</SelectOption>
                  <SelectOption value="custom">自定义</SelectOption>
                </Select>
                <Input
                  v-model:value="formState.hostname"
                  :placeholder="formState.hostnameMode === 'auto' ? '测试连接后自动获取' : '输入主机名'"
                  :disabled="formState.hostnameMode === 'auto'"
                  style="width: calc(100% - 100px)"
                />
              </Input.Group>
            </FormItem>
          </Col>
        </Row>

        <Row :gutter="16">
          <Col :span="8">
            <FormItem label="服务器厂商">
              <Select v-model:value="formState.vendor" style="width: 100%">
                <SelectOption v-for="item in vendorOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </SelectOption>
              </Select>
            </FormItem>
          </Col>
          <Col :span="8">
            <FormItem label="服务器类型">
              <Select v-model:value="formState.serverType" style="width: 100%">
                <SelectOption v-for="item in serverTypeOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </SelectOption>
              </Select>
            </FormItem>
          </Col>
          <Col :span="8">
            <FormItem label="地域">
              <Select v-model:value="formState.region" style="width: 100%">
                <SelectOption v-for="item in regionOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </SelectOption>
              </Select>
            </FormItem>
          </Col>
        </Row>

        <Row :gutter="16">
          <Col :span="8">
            <FormItem label="系统类型">
              <Select v-model:value="formState.osType" @change="handleOsTypeChange" style="width: 100%">
                <SelectOption v-for="item in osTypeOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </SelectOption>
              </Select>
            </FormItem>
          </Col>
          <Col :span="8">
            <FormItem label="系统版本">
              <Select v-model:value="formState.osVersion" style="width: 100%">
                <SelectOption v-for="item in osVersionOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </SelectOption>
              </Select>
            </FormItem>
          </Col>
          <Col :span="8">
            <FormItem label="域名（可选）">
              <Input v-model:value="formState.domain" placeholder="server.example.com" />
            </FormItem>
          </Col>
        </Row>
      </Card>

      <!-- 资源配置卡片 -->
      <Card size="small" class="form-card">
        <template #title>
          <Space>
            <HddOutlined />
            <span>资源配置</span>
            <Tag color="blue" size="small">测试连接后自动检测</Tag>
          </Space>
        </template>

        <Row :gutter="16">
          <Col :span="6">
            <FormItem label="CPU 核数">
              <InputNumber v-model:value="formState.cpuCores" :min="1" :max="256" style="width: 100%" addon-after="核" />
            </FormItem>
          </Col>
          <Col :span="6">
            <FormItem label="内存">
              <InputNumber v-model:value="formState.ramGb" :min="1" :max="2048" style="width: 100%" addon-after="GB" />
            </FormItem>
          </Col>
          <Col :span="6">
            <FormItem label="磁盘">
              <InputNumber v-model:value="formState.diskGb" :min="10" :max="100000" style="width: 100%" addon-after="GB" />
            </FormItem>
          </Col>
          <Col :span="6">
            <FormItem label="GPU">
              <Switch
                v-model:checked="formState.hasGpu"
                checked-children="有GPU"
                un-checked-children="无GPU"
                style="width: 80px"
              />
            </FormItem>
          </Col>
        </Row>

        <!-- GPU 配置 -->
        <Row :gutter="16" v-if="formState.hasGpu" class="gpu-config">
          <Col :span="6">
            <FormItem label="GPU 数量">
              <InputNumber v-model:value="formState.gpuCount" :min="1" :max="16" style="width: 100%" addon-after="卡" />
            </FormItem>
          </Col>
          <Col :span="6">
            <FormItem label="GPU 类型">
              <Select v-model:value="formState.gpuType" disabled style="width: 100%">
                <SelectOption value="single_gpu">单机单卡</SelectOption>
                <SelectOption value="multi_gpu">单机多卡</SelectOption>
              </Select>
            </FormItem>
          </Col>
          <Col :span="6">
            <FormItem label="GPU 型号">
              <Select v-model:value="formState.gpuModel" allow-clear show-search style="width: 100%">
                <SelectOption v-for="item in gpuModelOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </SelectOption>
              </Select>
            </FormItem>
          </Col>
          <Col :span="6">
            <FormItem label="GPU 显存">
              <InputNumber v-model:value="formState.gpuMemory" :min="1" :max="256" style="width: 100%" addon-after="GB" />
            </FormItem>
          </Col>
        </Row>
      </Card>

      <!-- 描述 -->
      <FormItem label="备注说明" class="description-field">
        <Textarea v-model:value="formState.description" placeholder="可选的备注信息" :rows="2" />
      </FormItem>

      <!-- 提交按钮 -->
      <div class="form-footer">
        <Button @click="handleClose" size="large">取消</Button>
        <Button
          type="primary"
          @click="handleSubmit"
          :loading="loading"
          :disabled="!canSubmit && !isEdit"
          size="large"
        >
          <template #icon><CheckCircleOutlined /></template>
          {{ isEdit ? '保存修改' : '注册站点' }}
        </Button>
      </div>
    </Form>
  </Modal>
</template>

<script lang="ts">
import { h } from 'vue';
export default {
  name: 'WorkstationForm',
};
</script>

<style scoped>
.workstation-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-card {
  border-radius: 8px;
}

.form-card :deep(.ant-card-head) {
  min-height: 40px;
  padding: 0 16px;
  background: #fafafa;
  border-radius: 8px 8px 0 0;
}

.form-card :deep(.ant-card-head-title) {
  padding: 8px 0;
  font-size: 14px;
  font-weight: 500;
}

.form-card :deep(.ant-card-body) {
  padding: 16px;
}

.form-card :deep(.ant-form-item) {
  margin-bottom: 12px;
}

.form-card :deep(.ant-form-item-label) {
  padding-bottom: 4px;
}

.form-card :deep(.ant-form-item-label > label) {
  font-size: 13px;
  color: #666;
}

.test-connection-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px dashed #e8e8e8;
  margin-top: 8px;
}

.test-result-alert {
  width: 100%;
}

.gpu-config {
  padding: 12px;
  background: linear-gradient(135deg, #f6ffed 0%, #e6f7ff 100%);
  border-radius: 6px;
  margin-top: 8px;
}

.description-field {
  margin-bottom: 0;
}

.form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}
</style>
