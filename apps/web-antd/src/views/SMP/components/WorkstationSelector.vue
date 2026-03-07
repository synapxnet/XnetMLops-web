<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import {
  Form,
  Select,
  Radio,
  Input,
  InputNumber,
  Tag,
  Space,
  Spin,
  Alert,
} from 'ant-design-vue';
import { CloudServerOutlined } from '@ant-design/icons-vue';
import { getOnlineWorkstations, type Workstation } from '../api/workstation';

interface Props {
  // 连接模式: manual (手动输入) / select (选择已注册服务器)
  mode?: 'manual' | 'select';
  // 当前选中的工作站ID
  selectedId?: number;
  // 是否显示模式切换
  showModeSwitch?: boolean;
  // 标签样式
  labelCol?: { span: number };
  wrapperCol?: { span: number };
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'manual',
  showModeSwitch: true,
  labelCol: () => ({ span: 4 }),
  wrapperCol: () => ({ span: 16 }),
});

const emit = defineEmits<{
  (e: 'update:mode', mode: 'manual' | 'select'): void;
  (e: 'update:selectedId', id: number | undefined): void;
  (e: 'select', workstation: Workstation): void;
  (e: 'change', data: {
    host: string;
    port: number;
    username: string;
    password: string;
    privateKey: string;
    osType: string;
    hostname: string;
  }): void;
}>();

// 状态
const loading = ref(false);
const workstations = ref<Workstation[]>([]);
const selectedWorkstationId = ref<number | undefined>(props.selectedId);
const connectionMode = ref<'manual' | 'select'>(props.mode);

// 手动输入时的表单数据
const manualForm = ref({
  host: '',
  port: 22,
  username: 'root',
  password: '',
  privateKey: '',
  osType: 'linux',
  usePrivateKey: false,
});

// 计算属性: 选中的工作站
const selectedWorkstation = computed(() => {
  if (!selectedWorkstationId.value) return null;
  return workstations.value.find(w => w.id === selectedWorkstationId.value) || null;
});

// 工作站选项
const workstationOptions = computed(() => {
  return workstations.value.map(w => ({
    value: w.id,
    label: `${w.name} (${w.ipAddress})`,
    workstation: w,
  }));
});

// 加载在线工作站
const loadWorkstations = async () => {
  loading.value = true;
  try {
    workstations.value = await getOnlineWorkstations();
  } catch (error) {
    console.error('加载工作站列表失败:', error);
    workstations.value = [];
  } finally {
    loading.value = false;
  }
};

// 监听模式变化
watch(connectionMode, (newMode) => {
  emit('update:mode', newMode);
  if (newMode === 'select' && workstations.value.length === 0) {
    loadWorkstations();
  }
});

// 监听工作站选择
watch(selectedWorkstationId, (newId) => {
  emit('update:selectedId', newId);
  if (newId && selectedWorkstation.value) {
    const w = selectedWorkstation.value;
    emit('select', w);
    emit('change', {
      host: w.ipAddress,
      port: w.sshPort || 22,
      username: w.sshUser,
      password: w.password || '',
      privateKey: w.privateKey || '',
      osType: w.osType,
      hostname: w.hostname || '',
    });
  }
});

// 监听手动输入变化
watch(manualForm, (newVal) => {
  if (connectionMode.value === 'manual') {
    emit('change', {
      host: newVal.host,
      port: newVal.port,
      username: newVal.username,
      password: newVal.usePrivateKey ? '' : newVal.password,
      privateKey: newVal.usePrivateKey ? newVal.privateKey : '',
      osType: newVal.osType,
      hostname: '',
    });
  }
}, { deep: true });

// 初始化
onMounted(() => {
  if (connectionMode.value === 'select') {
    loadWorkstations();
  }
});

// 暴露给父组件的方法
defineExpose({
  refresh: loadWorkstations,
  getSelectedWorkstation: () => selectedWorkstation.value,
  getManualForm: () => manualForm.value,
});
</script>

<template>
  <div class="workstation-selector">
    <!-- 模式切换 -->
    <Form.Item v-if="showModeSwitch" label="连接方式" :label-col="labelCol" :wrapper-col="wrapperCol">
      <Radio.Group v-model:value="connectionMode">
        <Radio.Button value="manual">
          手动输入
        </Radio.Button>
        <Radio.Button value="select">
          <CloudServerOutlined />
          选择已注册服务器
        </Radio.Button>
      </Radio.Group>
    </Form.Item>

    <!-- 选择已注册服务器模式 -->
    <template v-if="connectionMode === 'select'">
      <Form.Item label="选择服务器" required :label-col="labelCol" :wrapper-col="wrapperCol">
        <Spin :spinning="loading">
          <Select
            v-model:value="selectedWorkstationId"
            :options="workstationOptions"
            placeholder="请选择已注册的服务器"
            style="width: 100%"
            show-search
            :filter-option="(input: string, option: { label: string }) =>
              option.label.toLowerCase().includes(input.toLowerCase())"
          >
            <template #option="{ value, label, workstation }">
              <div class="workstation-option">
                <span>{{ label }}</span>
                <Space size="small" style="margin-left: 8px">
                  <Tag v-if="workstation.hostname" color="blue" size="small">
                    {{ workstation.hostname }}
                  </Tag>
                  <Tag v-if="workstation.hasGpu" color="green" size="small">
                    GPU x{{ workstation.gpuCount }}
                  </Tag>
                </Space>
              </div>
            </template>
          </Select>
        </Spin>
        <div v-if="workstations.length === 0 && !loading" class="mt-2">
          <Alert
            type="warning"
            message="暂无在线服务器"
            description="请先在 SMP - 工作节点 中注册服务器"
            show-icon
          />
        </div>
      </Form.Item>

      <!-- 选中服务器信息展示 -->
      <template v-if="selectedWorkstation">
        <Form.Item label="主机地址" :label-col="labelCol" :wrapper-col="wrapperCol">
          <Input :value="selectedWorkstation.ipAddress" disabled />
        </Form.Item>
        <Form.Item label="SSH端口" :label-col="labelCol" :wrapper-col="wrapperCol">
          <InputNumber :value="selectedWorkstation.sshPort || 22" disabled style="width: 120px" />
        </Form.Item>
        <Form.Item label="用户名" :label-col="labelCol" :wrapper-col="wrapperCol">
          <Input :value="selectedWorkstation.sshUser" disabled />
        </Form.Item>
        <Form.Item v-if="selectedWorkstation.hostname" label="主机名" :label-col="labelCol" :wrapper-col="wrapperCol">
          <Input :value="selectedWorkstation.hostname" disabled />
        </Form.Item>
        <Form.Item label="操作系统" :label-col="labelCol" :wrapper-col="wrapperCol">
          <Input :value="selectedWorkstation.osType" disabled />
        </Form.Item>
      </template>
    </template>

    <!-- 手动输入模式 -->
    <template v-else>
      <Form.Item label="主机地址" required :label-col="labelCol" :wrapper-col="wrapperCol">
        <Input v-model:value="manualForm.host" placeholder="IP地址或域名" />
      </Form.Item>
      <Form.Item label="SSH端口" required :label-col="labelCol" :wrapper-col="wrapperCol">
        <InputNumber v-model:value="manualForm.port" :min="1" :max="65535" style="width: 120px" />
      </Form.Item>
      <Form.Item label="用户名" required :label-col="labelCol" :wrapper-col="wrapperCol">
        <Input v-model:value="manualForm.username" placeholder="SSH用户名" />
      </Form.Item>
      <Form.Item label="认证方式" :label-col="labelCol" :wrapper-col="wrapperCol">
        <Radio.Group v-model:value="manualForm.usePrivateKey">
          <Radio :value="false">密码认证</Radio>
          <Radio :value="true">私钥认证</Radio>
        </Radio.Group>
      </Form.Item>
      <Form.Item v-if="!manualForm.usePrivateKey" label="密码" required :label-col="labelCol" :wrapper-col="wrapperCol">
        <Input.Password v-model:value="manualForm.password" placeholder="SSH密码" />
      </Form.Item>
      <Form.Item v-else label="私钥" required :label-col="labelCol" :wrapper-col="wrapperCol">
        <Input.TextArea v-model:value="manualForm.privateKey" :rows="4" placeholder="SSH私钥内容" />
      </Form.Item>
      <Form.Item label="操作系统" :label-col="labelCol" :wrapper-col="wrapperCol">
        <Radio.Group v-model:value="manualForm.osType">
          <Radio.Button value="linux">Linux</Radio.Button>
          <Radio.Button value="macos">macOS</Radio.Button>
          <Radio.Button value="windows">Windows</Radio.Button>
        </Radio.Group>
      </Form.Item>
    </template>
  </div>
</template>

<style scoped>
.workstation-selector {
  width: 100%;
}

.workstation-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mt-2 {
  margin-top: 8px;
}
</style>
