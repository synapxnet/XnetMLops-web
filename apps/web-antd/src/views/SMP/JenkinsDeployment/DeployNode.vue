<script lang="ts" setup>
import type { JenkinsNode, JenkinsNodeDeployConfig } from '../api/jenkinsNode';
import type { JenkinsMaster } from '../api/jenkinsMaster';

import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloudServerOutlined,
  CodeOutlined,
  LoadingOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  LinkOutlined,
} from '@ant-design/icons-vue';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Spin,
  Steps,
  Tag,
} from 'ant-design-vue';

import {
  createJenkinsNode,
  deployJenkinsNode,
  fetchJenkinsNodeById,
  getOsText,
  previewDeployScript,
  testJenkinsNodeConnection,
  updateJenkinsNode,
} from '../api/jenkinsNode';

import {
  fetchDeployedMasters,
  createNodeOnMaster,
} from '../api/jenkinsMaster';

import { getOnlineWorkstations, type Workstation } from '../api/workstation';

const route = useRoute();
const router = useRouter();

// 状态
const currentStep = ref(0);
const loading = ref(false);
const testing = ref(false);
const deploying = ref(false);
const deployFinished = ref(false);
const deploySuccess = ref(false);
const testResult = ref<{
  success: boolean;
  message: string;
  osInfo?: string;
  hostname?: string;
  detectedOsType?: string;
} | null>(null);
const scriptPreview = ref('');
const scriptModalVisible = ref(false);
const deployLog = ref('');
const editMode = ref(false);
const nodeId = ref<number | null>(null);
const logRefreshTimer = ref<ReturnType<typeof setInterval> | null>(null);
const logContainerRef = ref<HTMLElement | null>(null);

// Master相关
const deployedMasters = ref<JenkinsMaster[]>([]);
const selectedMasterId = ref<number | null>(null);
const fetchingSecret = ref(false);

// 连接模式和工作站选择
const connectionMode = ref<'manual' | 'select'>('manual');
const workstationList = ref<Workstation[]>([]);
const selectedWorkstationId = ref<number | undefined>();
const loadingWorkstations = ref(false);

// 加载在线工作站列表
async function loadWorkstations() {
  loadingWorkstations.value = true;
  try {
    workstationList.value = await getOnlineWorkstations();
  } catch (error) {
    console.error('加载工作站列表失败', error);
  } finally {
    loadingWorkstations.value = false;
  }
}

// 监听工作站选择
watch(selectedWorkstationId, (newId) => {
  if (newId) {
    const ws = workstationList.value.find(w => w.id === newId);
    if (ws) {
      nodeForm.value.name = nodeForm.value.name || ws.name;
      nodeForm.value.host = ws.ipAddress;
      nodeForm.value.port = ws.sshPort || 22;
      nodeForm.value.username = ws.sshUser;
      nodeForm.value.password = ws.password || '';
      nodeForm.value.os_type = ws.osType as any;
      nodeForm.value.region = ws.region || 'guangzhou';
      // GPU信息
      if (ws.hasGpu) {
        nodeForm.value.resource_type = ws.gpuCount && ws.gpuCount > 1 ? 'multi_gpu' : 'single_gpu';
        nodeForm.value.gpu_count = ws.gpuCount;
        nodeForm.value.gpu_model = ws.gpuModel;
        nodeForm.value.gpu_memory = ws.gpuMemory;
      }
    }
  }
});

// 监听连接模式变化
watch(connectionMode, (newMode) => {
  if (newMode === 'select' && workstationList.value.length === 0) {
    loadWorkstations();
  }
});

// 节点基本信息
const nodeForm = ref<JenkinsNode>({
  name: '',
  host: '',
  port: 22,
  username: 'root',
  password: '',
  os_type: 'linux',
  region: 'guangzhou',
  container_type: 'docker',
  resource_type: 'cpu',
  resource_spec: '',
  cpu_cores: 2,
  ram_gb: 128,
  gpu_memory: undefined,
  gpu_model: undefined,
  gpu_count: undefined,
  description: '',
});

// 部署配置
const deployConfig = ref<JenkinsNodeDeployConfig>({
  jenkinsUrl: 'http://localhost:8080',
  agentName: '',
  workDir: '/opt/jenkins-agent',
  javaVersion: '17',
  pythonVersion: '3.10',
  agentVersion: '3206.vb_15dcf73f6a_9',
  labels: '',
  jenkinsSecret: '',
  installDocker: true,
  installGit: true,
  installMaven: false,
  mavenVersion: '3.9.6',
  installNode: false,
  nodeVersion: '18',
  useDomesticMirror: true,  // 默认使用国内镜像
});

// 选项配置
const javaVersionOptions = [
  { label: 'Java 8', value: '8' },
  { label: 'Java 11', value: '11' },
  { label: 'Java 17 (推荐)', value: '17' },
  { label: 'Java 21', value: '21' },
];

const pythonVersionOptions = [
  { label: 'Python 3.8', value: '3.8' },
  { label: 'Python 3.9', value: '3.9' },
  { label: 'Python 3.10 (推荐)', value: '3.10' },
  { label: 'Python 3.11', value: '3.11' },
  { label: 'Python 3.12', value: '3.12' },
];

const osOptions = [
  { label: 'Linux', value: 'linux' },
  { label: 'macOS', value: 'macos' },
  { label: 'Windows', value: 'windows' },
];

const regionOptions = [
  { label: '广州', value: 'guangzhou' },
  { label: '北京', value: 'beijing' },
  { label: '上海', value: 'shanghai' },
  { label: '深圳', value: 'shenzhen' },
  { label: '杭州', value: 'hangzhou' },
  { label: '南京', value: 'nanjing' },
  { label: '硅谷', value: 'silicon_valley' },
  { label: '新加坡', value: 'singapore' },
  { label: '东京', value: 'tokyo' },
  { label: '法兰克福', value: 'frankfurt' },
];

const containerTypeOptions = [
  { label: 'CCE', value: 'cce' },
  { label: 'Docker', value: 'docker' },
];

const resourceTypeOptions = [
  { label: 'CPU', value: 'cpu' },
  { label: '单卡GPU', value: 'single_gpu' },
  { label: '多卡GPU', value: 'multi_gpu' },
];

// 步骤配置
const steps = [
  { title: '连接配置', icon: CloudServerOutlined },
  { title: '测试连接', icon: SafetyCertificateOutlined },
  { title: '部署配置', icon: SettingOutlined },
  { title: '执行部署', icon: CodeOutlined },
];

// 计算属性
const canProceedToTest = computed(() => {
  if (!nodeForm.value.name) return false;

  if (connectionMode.value === 'select') {
    return !!selectedWorkstationId.value;
  } else {
    return nodeForm.value.host &&
           nodeForm.value.port &&
           nodeForm.value.username &&
           nodeForm.value.password;
  }
});

const canProceedToDeploy = computed(() => {
  return testResult.value?.success === true;
});

const canExecuteDeploy = computed(() => {
  return deployConfig.value.jenkinsUrl &&
         deployConfig.value.agentName &&
         deployConfig.value.workDir &&
         deployConfig.value.jenkinsSecret;
});

// Master选项列表
const masterOptions = computed(() => {
  return deployedMasters.value.map(m => ({
    label: `${m.name} (${m.host}:${m.jenkins_port})`,
    value: m.id,
  }));
});

// ==================== 加载已部署的Master ====================

const loadDeployedMasters = async () => {
  try {
    deployedMasters.value = await fetchDeployedMasters();
  } catch (error) {
    console.error('加载Master列表失败:', error);
  }
};

// 选择Master后自动填充URL
watch(selectedMasterId, (newId) => {
  if (newId) {
    const master = deployedMasters.value.find(m => m.id === newId);
    if (master) {
      deployConfig.value.jenkinsUrl = `http://${master.host}:${master.jenkins_port}`;
    }
  }
});

// 从Master获取Secret
const fetchSecretFromMaster = async () => {
  if (!selectedMasterId.value || !deployConfig.value.agentName) {
    message.warning('请先选择Master并填写Agent名称');
    return;
  }

  fetchingSecret.value = true;
  try {
    const result = await createNodeOnMaster(
      selectedMasterId.value,
      deployConfig.value.agentName,
      deployConfig.value.workDir,
      deployConfig.value.labels
    );

    if (result.success && result.secret) {
      deployConfig.value.jenkinsSecret = result.secret;
      message.success('已从Master获取Secret');
    } else {
      message.info('Node已创建，请手动从Jenkins获取Secret');
    }
  } catch (error: any) {
    message.error(error.message || '获取Secret失败');
  } finally {
    fetchingSecret.value = false;
  }
};

// ==================== 监听配置变化 ====================

watch(() => nodeForm.value.os_type, (newOs) => {
  if (!editMode.value) {
    switch (newOs) {
      case 'linux':
        deployConfig.value.workDir = '/opt/jenkins-agent';
        break;
      case 'macos':
        deployConfig.value.workDir = '/Users/jenkins/agent';
        break;
      case 'windows':
        deployConfig.value.workDir = 'C:\\Jenkins\\agent';
        break;
    }
  }
});

// 同步节点名称到Agent名称（非编辑模式下自动同步）
watch(() => nodeForm.value.name, (newName) => {
  if (!editMode.value) {
    // 始终同步节点名称到Agent名称
    deployConfig.value.agentName = newName ? newName.replace(/\s+/g, '-').toLowerCase() : '';
  }
}, { immediate: true });

// ==================== 加载已有节点 ====================

const loadNode = async (id: number) => {
  try {
    loading.value = true;
    const node = await fetchJenkinsNodeById(id);
    if (node) {
      nodeForm.value = {
        name: node.name || '',
        host: node.host || '',
        port: node.port || 22,
        username: node.username || 'root',
        password: '',
        os_type: node.os_type || 'linux',
        region: node.region || 'guangzhou',
        container_type: node.container_type || 'docker',
        resource_type: node.resource_type || 'cpu',
        resource_spec: node.resource_spec || '',
        cpu_cores: node.cpu_cores || 2,
        ram_gb: node.ram_gb || 128,
        gpu_memory: node.gpu_memory,
        gpu_model: node.gpu_model,
        gpu_count: node.gpu_count,
        description: node.description || '',
      };

      if (node.jenkins_url) deployConfig.value.jenkinsUrl = node.jenkins_url;
      if (node.agent_name) deployConfig.value.agentName = node.agent_name;
      if (node.work_dir) deployConfig.value.workDir = node.work_dir;
      if (node.java_version) deployConfig.value.javaVersion = node.java_version;
      if (node.python_version) deployConfig.value.pythonVersion = node.python_version;
      if (node.agent_version) deployConfig.value.agentVersion = node.agent_version;
      if (node.labels) deployConfig.value.labels = node.labels;

      if (node.status === 'deploying') {
        deploying.value = true;
        deployLog.value = node.deploy_log || '部署进行中...\n';
        startLogRefresh();
      } else if (node.deploy_log) {
        deployLog.value = node.deploy_log;
      }
    }
  } catch (error) {
    console.error('加载节点失败:', error);
    message.error('加载节点信息失败');
  } finally {
    loading.value = false;
  }
};

// ==================== 日志相关 ====================

const refreshDeployLog = async () => {
  if (!nodeId.value) return;

  try {
    const node = await fetchJenkinsNodeById(nodeId.value);
    if (node) {
      deployLog.value = node.deploy_log || '';

      await nextTick();
      if (logContainerRef.value) {
        logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight;
      }

      if (node.status === 'deployed') {
        stopLogRefresh();
        deploying.value = false;
        deployFinished.value = true;
        deploySuccess.value = true;
        message.success('部署成功！');
      } else if (node.status === 'failed') {
        stopLogRefresh();
        deploying.value = false;
        deployFinished.value = true;
        deploySuccess.value = false;
        message.error('部署失败');
      }
    }
  } catch (error) {
    console.error('刷新日志失败:', error);
  }
};

const startLogRefresh = () => {
  if (logRefreshTimer.value) {
    clearInterval(logRefreshTimer.value);
  }
  logRefreshTimer.value = setInterval(refreshDeployLog, 3000);
};

const stopLogRefresh = () => {
  if (logRefreshTimer.value) {
    clearInterval(logRefreshTimer.value);
    logRefreshTimer.value = null;
  }
};

const manualRefreshLog = async () => {
  await refreshDeployLog();
  message.success('日志已刷新');
};

// ==================== 资源类型变更 ====================

const onResourceTypeChange = () => {
  const resourceType = nodeForm.value.resource_type;

  if (resourceType === 'cpu') {
    nodeForm.value.gpu_memory = undefined;
    nodeForm.value.gpu_model = undefined;
    nodeForm.value.gpu_count = undefined;
  } else if (resourceType === 'single_gpu') {
    nodeForm.value.gpu_memory = nodeForm.value.gpu_memory || 16;
    nodeForm.value.gpu_model = nodeForm.value.gpu_model || 'RTX 4060 Ti';
    nodeForm.value.gpu_count = 1;
  } else if (resourceType === 'multi_gpu') {
    nodeForm.value.gpu_memory = nodeForm.value.gpu_memory || 16;
    nodeForm.value.gpu_model = nodeForm.value.gpu_model || 'RTX 4060 Ti';
    nodeForm.value.gpu_count = nodeForm.value.gpu_count || 2;
  }
};

// ==================== 连接测试 ====================

const testConnection = async () => {
  testing.value = true;
  testResult.value = null;

  try {
    const result = await testJenkinsNodeConnection(nodeForm.value);
    testResult.value = result;

    if (result.success) {
      message.success('连接成功！');
      if (result.detectedOsType && result.detectedOsType !== nodeForm.value.os_type) {
        Modal.confirm({
          title: '检测到不同的操作系统',
          content: `检测到目标系统为 ${getOsText(result.detectedOsType)}，是否更新？`,
          onOk() {
            nodeForm.value.os_type = result.detectedOsType as any;
          },
        });
      }
    } else {
      message.error(result.message || '连接失败');
    }
  } catch (error: any) {
    testResult.value = {
      success: false,
      message: error.message || '连接测试失败',
    };
    message.error('连接测试失败');
  } finally {
    testing.value = false;
  }
};

// ==================== 保存节点 ====================

const saveNode = async (): Promise<number | null> => {
  try {
    if (editMode.value && nodeId.value) {
      await updateJenkinsNode(nodeId.value, nodeForm.value);
      message.success('节点更新成功');
      return nodeId.value;
    } else {
      const created = await createJenkinsNode(nodeForm.value);
      nodeId.value = created.id!;
      editMode.value = true;
      message.success('节点创建成功');
      return created.id!;
    }
  } catch (error) {
    message.error('保存节点失败');
    return null;
  }
};

// ==================== 预览脚本 ====================

const previewScript = async () => {
  try {
    const result = await previewDeployScript(nodeForm.value.os_type, deployConfig.value);
    scriptPreview.value = result.script;
    scriptModalVisible.value = true;
  } catch (error) {
    message.error('获取脚本预览失败');
  }
};

// ==================== 执行部署 ====================

const executeDeploy = async () => {
  if (!nodeId.value) {
    deployLog.value = '正在创建节点...\n';
    const savedId = await saveNode();
    if (!savedId) {
      deployLog.value += '创建节点失败\n';
      return;
    }
    deployLog.value += `节点创建成功，ID: ${savedId}\n`;
  }

  deploying.value = true;
  deployFinished.value = false;
  deploySuccess.value = false;
  deployLog.value += '正在提交部署任务...\n';

  try {
    const result = await deployJenkinsNode(nodeId.value!, deployConfig.value);

    if (result.success) {
      deployLog.value += '部署任务已提交，正在后台执行...\n';
      deployLog.value += '日志将每3秒自动刷新...\n\n';
      message.success('部署任务已提交');
      setTimeout(() => {
        startLogRefresh();
      }, 1000);
    } else {
      deployLog.value += `\n部署失败: ${result.message}\n`;
      message.error(result.message || '部署失败');
      deploying.value = false;
      deployFinished.value = true;
      deploySuccess.value = false;
    }
  } catch (error: any) {
    deployLog.value += `\n部署出错: ${error.message || '未知错误'}\n`;
    message.error('部署失败');
    deploying.value = false;
    deployFinished.value = true;
    deploySuccess.value = false;
  }
};

// ==================== 步骤控制 ====================

const nextStep = async () => {
  if (currentStep.value === 0) {
    currentStep.value = 1;
  } else if (currentStep.value === 1) {
    const savedId = await saveNode();
    if (savedId) {
      currentStep.value = 2;
    }
  } else if (currentStep.value === 2) {
    currentStep.value = 3;
  }
};

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
};

const goBack = () => {
  stopLogRefresh();
  router.push('/SMP/JenkinsDeployment/index');
};

// ==================== 生命周期 ====================

onMounted(async () => {
  // 加载已部署的Master列表
  await loadDeployedMasters();

  const id = route.query.id;
  const isEdit = route.query.edit === 'true';
  const isDeploy = route.query.deploy === 'true';

  if (id) {
    nodeId.value = parseInt(id as string);
    editMode.value = true;
    await loadNode(nodeId.value);

    if (isEdit || isDeploy) {
      currentStep.value = 2;
    }
  }
});

onUnmounted(() => {
  stopLogRefresh();
});
</script>

<template>
  <Page title="Node节点部署" />

  <div class="mt-6">
    <Card>
      <div class="mb-4">
        <Button @click="goBack">
          <ArrowLeftOutlined />
          返回列表
        </Button>
      </div>

      <Steps :current="currentStep" class="mb-8">
        <Steps.Step v-for="(step, index) in steps" :key="index" :title="step.title" />
      </Steps>

      <Spin :spinning="loading">
        <!-- 步骤1: 连接配置 -->
        <div v-show="currentStep === 0">
          <Card title="SSH连接配置" :bordered="false">
            <Form :label-col="{ span: 4 }" :wrapper-col="{ span: 16 }">
              <Form.Item label="节点名称" required>
                <Input v-model:value="nodeForm.name" placeholder="例如: build-node-01" />
              </Form.Item>

              <!-- 连接模式切换 -->
              <Form.Item label="连接方式">
                <Radio.Group v-model:value="connectionMode">
                  <Radio.Button value="manual">手动输入</Radio.Button>
                  <Radio.Button value="select">
                    <CloudServerOutlined />
                    选择已注册服务器
                  </Radio.Button>
                </Radio.Group>
              </Form.Item>

              <!-- 选择已注册服务器模式 -->
              <template v-if="connectionMode === 'select'">
                <Form.Item label="选择服务器" required>
                  <Spin :spinning="loadingWorkstations">
                    <Select
                      v-model:value="selectedWorkstationId"
                      placeholder="请选择已注册的服务器"
                      style="width: 100%"
                      show-search
                      :filter-option="(input: string, option: any) =>
                        option.label.toLowerCase().includes(input.toLowerCase())"
                    >
                      <Select.Option
                        v-for="ws in workstationList"
                        :key="ws.id"
                        :value="ws.id"
                        :label="`${ws.name} (${ws.ipAddress})`"
                      >
                        {{ ws.name }} ({{ ws.ipAddress }})
                        <Tag v-if="ws.hostname" color="blue" size="small" style="margin-left: 8px">
                          {{ ws.hostname }}
                        </Tag>
                        <Tag v-if="ws.hasGpu" color="green" size="small" style="margin-left: 4px">
                          GPU x{{ ws.gpuCount }}
                        </Tag>
                      </Select.Option>
                    </Select>
                  </Spin>
                  <div v-if="workstationList.length === 0 && !loadingWorkstations" style="margin-top: 8px">
                    <Alert
                      type="warning"
                      message="暂无在线服务器，请先在 SMP - 工作节点 中注册服务器"
                      show-icon
                    />
                  </div>
                </Form.Item>

                <!-- 显示选中的服务器信息 -->
                <template v-if="selectedWorkstationId">
                  <Row :gutter="16">
                    <Col :span="12">
                      <Form.Item label="主机地址" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }">
                        <Input :value="nodeForm.host" disabled />
                      </Form.Item>
                    </Col>
                    <Col :span="12">
                      <Form.Item label="SSH端口" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }">
                        <InputNumber :value="nodeForm.port" disabled style="width: 100%" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item label="用户名">
                    <Input :value="nodeForm.username" disabled />
                  </Form.Item>
                  <Form.Item label="操作系统">
                    <Input :value="nodeForm.os_type" disabled />
                  </Form.Item>
                </template>
              </template>

              <!-- 手动输入模式 -->
              <template v-else>
                <Form.Item label="主机地址" required>
                  <Input v-model:value="nodeForm.host" placeholder="IP地址或域名" />
                </Form.Item>

                <Row :gutter="16">
                  <Col :span="12">
                    <Form.Item label="SSH端口" required :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }">
                      <InputNumber v-model:value="nodeForm.port" :min="1" :max="65535" style="width: 100%" />
                    </Form.Item>
                  </Col>
                  <Col :span="12">
                    <Form.Item label="操作系统" required :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }">
                      <Select v-model:value="nodeForm.os_type" :options="osOptions" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item label="用户名" required>
                  <Input v-model:value="nodeForm.username" placeholder="SSH登录用户名" />
                </Form.Item>

                <Form.Item label="密码" required>
                  <Input.Password v-model:value="nodeForm.password" placeholder="SSH登录密码" />
                </Form.Item>
              </template>

              <Form.Item label="描述">
                <Input.TextArea v-model:value="nodeForm.description" placeholder="节点描述信息" :rows="2" />
              </Form.Item>
            </Form>
          </Card>

          <!-- 资源配置卡片 -->
          <Card title="资源配置" :bordered="false" class="mt-4">
            <Form :label-col="{ span: 4 }" :wrapper-col="{ span: 16 }">
              <Form.Item label="地域" required>
                <Select v-model:value="nodeForm.region" :options="regionOptions" placeholder="请选择地域" style="width: 200px" />
              </Form.Item>

              <Form.Item label="容器类型" required>
                <Radio.Group v-model:value="nodeForm.container_type">
                  <Radio.Button v-for="option in containerTypeOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </Radio.Button>
                </Radio.Group>
              </Form.Item>

              <Form.Item label="资源类型" required>
                <Radio.Group v-model:value="nodeForm.resource_type" @change="onResourceTypeChange">
                  <Radio.Button v-for="option in resourceTypeOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </Radio.Button>
                </Radio.Group>
              </Form.Item>

              <Row :gutter="16">
                <Col :span="12">
                  <Form.Item label="CPU核数" required :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }">
                    <InputNumber v-model:value="nodeForm.cpu_cores" :min="1" :max="128" style="width: 100%" addon-after="核" />
                  </Form.Item>
                </Col>
                <Col :span="12">
                  <Form.Item label="内存大小" required :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }">
                    <InputNumber v-model:value="nodeForm.ram_gb" :min="1" :max="2048" style="width: 100%" addon-after="GB" />
                  </Form.Item>
                </Col>
              </Row>

              <template v-if="nodeForm.resource_type === 'single_gpu' || nodeForm.resource_type === 'multi_gpu'">
                <Row :gutter="16">
                  <Col :span="12">
                    <Form.Item label="GPU显存" required :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }">
                      <InputNumber v-model:value="nodeForm.gpu_memory" :min="1" :max="128" style="width: 100%" addon-after="GB" />
                    </Form.Item>
                  </Col>
                  <Col :span="12">
                    <Form.Item label="GPU型号" required :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }">
                      <Input v-model:value="nodeForm.gpu_model" placeholder="如: RTX 4060 Ti" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row v-if="nodeForm.resource_type === 'multi_gpu'" :gutter="16">
                  <Col :span="12">
                    <Form.Item label="GPU数量" required :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }">
                      <InputNumber v-model:value="nodeForm.gpu_count" :min="2" :max="16" style="width: 100%" addon-after="卡" />
                    </Form.Item>
                  </Col>
                </Row>
              </template>
            </Form>
          </Card>

          <div class="mt-4 flex justify-end">
            <Button type="primary" :disabled="!canProceedToTest" @click="nextStep">
              下一步: 测试连接
            </Button>
          </div>
        </div>

        <!-- 步骤2: 测试连接 -->
        <div v-show="currentStep === 1">
          <Card title="SSH连接测试" :bordered="false">
            <div class="text-center py-8">
              <div class="mb-4">
                <CloudServerOutlined class="text-6xl text-blue-500" />
              </div>
              <div class="mb-4">
                <p class="text-lg">目标主机: <strong>{{ nodeForm.host }}:{{ nodeForm.port }}</strong></p>
                <p class="text-gray-500">用户: {{ nodeForm.username }} | 系统: {{ getOsText(nodeForm.os_type) }}</p>
              </div>

              <Button type="primary" size="large" :loading="testing" @click="testConnection">
                <SafetyCertificateOutlined v-if="!testing" />
                {{ testing ? '测试中...' : '开始测试连接' }}
              </Button>

              <div v-if="testResult" class="mt-6">
                <Alert
                  :type="testResult.success ? 'success' : 'error'"
                  :message="testResult.success ? '连接成功' : '连接失败'"
                  :description="testResult.message"
                  show-icon
                />

                <div v-if="testResult.success && testResult.osInfo" class="mt-4 text-left bg-gray-50 p-4 rounded max-w-xl mx-auto">
                  <p><strong>主机名:</strong> {{ testResult.hostname }}</p>
                  <p><strong>系统信息:</strong></p>
                  <pre class="text-xs mt-2 bg-gray-100 p-2 rounded">{{ testResult.osInfo }}</pre>
                </div>
              </div>
            </div>
          </Card>

          <div class="mt-4 flex justify-between">
            <Button @click="prevStep">上一步</Button>
            <Button type="primary" :disabled="!canProceedToDeploy" @click="nextStep">
              下一步: 部署配置
            </Button>
          </div>
        </div>

        <!-- 步骤3: 部署配置 -->
        <div v-show="currentStep === 2">
          <Card title="Jenkins Agent配置" :bordered="false">
            <Form :label-col="{ span: 6 }" :wrapper-col="{ span: 14 }">
              <!-- Master关联配置 -->
              <Alert
                type="info"
                message="关联Jenkins Master"
                description="选择已部署的Jenkins Master，可以自动获取Jenkins URL和Agent Secret。"
                show-icon
                class="mb-4"
              />

              <Form.Item label="关联Master">
                <Space>
                  <Select
                    v-model:value="selectedMasterId"
                    :options="masterOptions"
                    placeholder="选择已部署的Master"
                    style="width: 300px"
                    allowClear
                  />
                  <Button
                    :loading="fetchingSecret"
                    :disabled="!selectedMasterId || !deployConfig.agentName"
                    @click="fetchSecretFromMaster"
                  >
                    <LinkOutlined />
                    获取Secret
                  </Button>
                </Space>
                <div class="text-xs text-gray-400 mt-1">
                  选择Master后会自动填充Jenkins URL，点击"获取Secret"会在Master上创建Node配置
                </div>
              </Form.Item>

              <Divider orientation="left">Jenkins配置</Divider>

              <Form.Item label="Jenkins URL" required>
                <Input v-model:value="deployConfig.jenkinsUrl" placeholder="http://jenkins.example.com:8080" />
              </Form.Item>

              <Form.Item label="Agent名称" required>
                <Input v-model:value="deployConfig.agentName" placeholder="agent-node-01" />
              </Form.Item>

              <Form.Item label="Agent Secret" required>
                <Input.Password v-model:value="deployConfig.jenkinsSecret" placeholder="从Jenkins节点配置页面获取" />
                <div class="text-xs text-gray-400 mt-1">
                  可以点击上方"获取Secret"自动获取，或手动从Jenkins复制
                </div>
              </Form.Item>

              <Form.Item label="工作目录" required>
                <Input v-model:value="deployConfig.workDir" />
              </Form.Item>

              <Form.Item label="节点标签">
                <Input v-model:value="deployConfig.labels" placeholder="linux docker python" />
              </Form.Item>

              <Divider orientation="left">环境配置</Divider>

              <Row :gutter="16">
                <Col :span="12">
                  <Form.Item label="Java版本" required :label-col="{ span: 12 }" :wrapper-col="{ span: 12 }">
                    <Select v-model:value="deployConfig.javaVersion" :options="javaVersionOptions" />
                  </Form.Item>
                </Col>
                <Col :span="12">
                  <Form.Item label="Python版本" :label-col="{ span: 12 }" :wrapper-col="{ span: 12 }">
                    <Select v-model:value="deployConfig.pythonVersion" :options="pythonVersionOptions" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">可选组件</Divider>

              <Form.Item label="安装组件" :wrapper-col="{ span: 18 }">
                <Space direction="vertical">
                  <Checkbox v-model:checked="deployConfig.installGit">Git</Checkbox>
                  <Checkbox v-model:checked="deployConfig.installDocker">Docker</Checkbox>
                  <Space>
                    <Checkbox v-model:checked="deployConfig.installMaven">Maven</Checkbox>
                    <Input v-if="deployConfig.installMaven" v-model:value="deployConfig.mavenVersion" style="width: 100px" size="small" />
                  </Space>
                  <Space>
                    <Checkbox v-model:checked="deployConfig.installNode">Node.js</Checkbox>
                    <Input v-if="deployConfig.installNode" v-model:value="deployConfig.nodeVersion" style="width: 100px" size="small" />
                  </Space>
                </Space>
              </Form.Item>

              <Divider orientation="left">下载源配置</Divider>

              <Form.Item label="下载镜像源">
                <Radio.Group v-model:value="deployConfig.useDomesticMirror">
                  <Radio :value="true">国内镜像（推荐国内服务器使用）</Radio>
                  <Radio :value="false">官方源（推荐海外服务器使用）</Radio>
                </Radio.Group>
                <div class="text-xs text-gray-400 mt-1">
                  国内镜像使用清华、阿里云等镜像源，下载速度更快；海外服务器建议使用官方源
                </div>
              </Form.Item>
            </Form>
          </Card>

          <div class="mt-4 flex justify-between">
            <Button @click="prevStep">上一步</Button>
            <Space>
              <Button @click="previewScript">
                <CodeOutlined />
                预览脚本
              </Button>
              <Button type="primary" :disabled="!canExecuteDeploy" @click="nextStep">
                下一步: 执行部署
              </Button>
            </Space>
          </div>
        </div>

        <!-- 步骤4: 执行部署 -->
        <div v-show="currentStep === 3">
          <Card title="执行部署" :bordered="false">
            <div class="mb-4">
              <Alert v-if="!deploying && !deployFinished" type="info" message="点击开始部署后，系统将通过SSH连接到目标服务器并执行部署脚本。" show-icon />
              <Alert v-else-if="deploying" type="warning" message="正在部署中，日志每3秒自动刷新..." show-icon />
              <Alert v-else-if="deployFinished && deploySuccess" type="success" message="部署成功！" show-icon />
              <Alert v-else-if="deployFinished && !deploySuccess" type="error" message="部署失败，请查看日志" show-icon />
            </div>

            <Card title="配置摘要" size="small" class="mb-4">
              <Row :gutter="16">
                <Col :span="12">
                  <p><strong>目标主机:</strong> {{ nodeForm.host }}:{{ nodeForm.port }}</p>
                  <p><strong>Agent名称:</strong> {{ deployConfig.agentName }}</p>
                </Col>
                <Col :span="12">
                  <p><strong>Jenkins URL:</strong> {{ deployConfig.jenkinsUrl }}</p>
                  <p><strong>Java版本:</strong> {{ deployConfig.javaVersion }}</p>
                </Col>
              </Row>
            </Card>

            <Card title="部署日志" size="small" class="mb-4">
              <template #extra>
                <Space>
                  <span v-if="deploying" class="text-orange-500">
                    <LoadingOutlined spin /> 刷新中...
                  </span>
                  <Button size="small" @click="manualRefreshLog">
                    <ReloadOutlined />
                    刷新
                  </Button>
                </Space>
              </template>
              <div ref="logContainerRef" class="bg-gray-900 p-4 rounded h-80 overflow-auto">
                <pre class="text-green-400 text-xs font-mono whitespace-pre-wrap m-0">{{ deployLog || '暂无日志' }}</pre>
              </div>
            </Card>

            <div class="text-center">
              <Button v-if="!deploying && !deployFinished" type="primary" size="large" @click="executeDeploy">
                <CheckCircleOutlined />
                开始部署
              </Button>
              <Button v-else-if="deploying" type="primary" size="large" loading disabled>
                部署中...
              </Button>
              <Space v-else>
                <Button v-if="!deploySuccess" type="primary" size="large" @click="executeDeploy">
                  <ReloadOutlined />
                  重新部署
                </Button>
                <Button size="large" @click="goBack">返回列表</Button>
              </Space>
            </div>
          </Card>

          <div class="mt-4 flex justify-between">
            <Button :disabled="deploying" @click="prevStep">上一步</Button>
            <Button @click="goBack">返回列表</Button>
          </div>
        </div>
      </Spin>
    </Card>
  </div>

  <Modal v-model:open="scriptModalVisible" title="部署脚本预览" :width="900" :footer="null">
    <div class="max-h-96 overflow-auto bg-gray-900 p-4 rounded">
      <pre class="text-green-400 text-xs font-mono whitespace-pre-wrap">{{ scriptPreview }}</pre>
    </div>
  </Modal>
</template>

<style scoped>
.ant-card {
  border-radius: 8px;
}

.bg-gray-900::-webkit-scrollbar {
  width: 8px;
}

.bg-gray-900::-webkit-scrollbar-track {
  background: #1a1a1a;
}

.bg-gray-900::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 4px;
}
</style>
