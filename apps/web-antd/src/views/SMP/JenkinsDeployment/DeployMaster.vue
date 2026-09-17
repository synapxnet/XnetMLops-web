<script setup lang="ts">
import BusinessPage from '#/components/workspace/BusinessPage.vue';
import { Alert as SourceAlert } from 'ant-design-vue';
import { ref, onMounted, nextTick, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
  Card,
  Steps,
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Radio,
  Space,
  message,
  Alert,
  Spin,
  Divider,
  Descriptions,
  Result,
  Collapse,
  Switch,
  Modal,
  Tag,
} from 'ant-design-vue';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  CloudServerOutlined,
  KeyOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  RocketOutlined,
} from '@ant-design/icons-vue';

import {
  createJenkinsMaster,
  updateJenkinsMaster,
  fetchJenkinsMasterById,
  testJenkinsMasterConnection,
  deployJenkinsMaster,
  previewMasterDeployScript,
  fetchJenkinsLtsVersions,
  refreshJenkinsVersions,
  type JenkinsMaster,
  type JenkinsMasterDeployConfig,
  type ConnectionTestResult,
  type JenkinsVersionInfo,
} from '../api/jenkinsMaster';
import { getOnlineWorkstations, type Workstation } from '../api/workstation';

const router = useRouter();
const route = useRoute();

// 当前步骤
const currentStep = ref(0);

// 节点ID（编辑模式）
const masterId = ref<number | null>(null);

// 表单数据
const masterForm = ref<JenkinsMaster>({
  name: '',
  host: '',
  port: 22,
  username: 'root',
  password: '',
  os_type: 'linux',
  region: 'guangzhou',
  jenkins_port: 8080,
  jenkins_home: '/var/jenkins_home',
  java_version: '17',
  java_opts: '-Xmx2g -Xms1g',
  admin_username: 'admin',
  admin_password: '',
  cpu_cores: 4,
  ram_gb: 8,
  description: '',
});

// 部署配置
const deployConfig = ref<JenkinsMasterDeployConfig & { timezone?: string }>({
  jenkinsVersion: '',
  jenkinsPort: 8080,
  jenkinsHome: '/var/jenkins_home',
  javaVersion: '17',
  javaOpts: '-Xmx2g -Xms1g',
  adminUsername: 'admin',
  adminPassword: '',
  adminEmail: 'admin@localhost',
  installSuggestedPlugins: true,
  gitCredentials: [],
  harborCredentials: [],
  sshCredentials: [],
  timezone: 'Asia/Shanghai',
});

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
      masterForm.value.name = masterForm.value.name || ws.name;
      masterForm.value.host = ws.ipAddress;
      masterForm.value.port = ws.sshPort || 22;
      masterForm.value.username = ws.sshUser;
      masterForm.value.password = ws.password || '';
      masterForm.value.os_type = ws.osType as any;
    }
  }
});

// 监听连接模式变化
watch(connectionMode, (newMode) => {
  if (newMode === 'select' && workstationList.value.length === 0) {
    loadWorkstations();
  }
});

// 凭证管理方法
const addGitCredential = () => {
  if (!deployConfig.value.gitCredentials) deployConfig.value.gitCredentials = [];
  deployConfig.value.gitCredentials.push({
    id: `git-cred-${Date.now()}`,
    description: '',
    username: '',
    password: '',
  });
};

const removeGitCredential = (index: number) => {
  deployConfig.value.gitCredentials?.splice(index, 1);
};

const addHarborCredential = () => {
  if (!deployConfig.value.harborCredentials) deployConfig.value.harborCredentials = [];
  deployConfig.value.harborCredentials.push({
    id: `harbor-cred-${Date.now()}`,
    description: '',
    url: '',
    username: '',
    password: '',
  });
};

const removeHarborCredential = (index: number) => {
  deployConfig.value.harborCredentials?.splice(index, 1);
};

const addSshCredential = () => {
  if (!deployConfig.value.sshCredentials) deployConfig.value.sshCredentials = [];
  deployConfig.value.sshCredentials.push({
    id: `ssh-cred-${Date.now()}`,
    description: '',
    username: '',
    privateKey: '',
    passphrase: '',
  });
};

const removeSshCredential = (index: number) => {
  deployConfig.value.sshCredentials?.splice(index, 1);
};

// 连接测试
const testing = ref(false);
const testResult = ref<ConnectionTestResult | null>(null);

// 部署状态
const deploying = ref(false);
const deploySuccess = ref(false);
const deployLog = ref('');

// 脚本预览
const scriptPreview = ref('');
const showScript = ref(false);

// 日志刷新定时器
let logRefreshTimer: ReturnType<typeof setInterval> | null = null;
const logContainerRef = ref<HTMLElement | null>(null);

// 地域选项
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

// Jenkins版本选项（动态获取）
const jenkinsVersionOptions = ref<{ label: string; value: string }[]>([]);
const loadingVersions = ref(false);
const refreshingVersions = ref(false);

// 时区选项
const timezoneOptions = [
  { label: 'Asia/Shanghai (中国标准时间)', value: 'Asia/Shanghai' },
  { label: 'Asia/Hong_Kong (香港时间)', value: 'Asia/Hong_Kong' },
  { label: 'Asia/Tokyo (日本时间)', value: 'Asia/Tokyo' },
  { label: 'Asia/Singapore (新加坡时间)', value: 'Asia/Singapore' },
  { label: 'America/New_York (美国东部)', value: 'America/New_York' },
  { label: 'America/Los_Angeles (美国西部)', value: 'America/Los_Angeles' },
  { label: 'Europe/London (伦敦时间)', value: 'Europe/London' },
  { label: 'Europe/Berlin (柏林时间)', value: 'Europe/Berlin' },
  { label: 'UTC (协调世界时)', value: 'UTC' },
];

// Java版本选项
const javaVersionOptions = [
  { label: 'Java 11', value: '11' },
  { label: 'Java 17 (推荐)', value: '17' },
  { label: 'Java 21', value: '21' },
];

// 步骤配置
const steps = [
  { title: '连接配置', icon: CloudServerOutlined },
  { title: '测试连接', icon: KeyOutlined },
  { title: 'Jenkins配置', icon: SettingOutlined },
  { title: '凭证配置', icon: SafetyCertificateOutlined },
  { title: '执行部署', icon: RocketOutlined },
];

// ==================== 加载Jenkins版本列表 ====================

const loadJenkinsVersions = async () => {
  loadingVersions.value = true;
  try {
    // 后端返回 {code: 0, data: [...]}，smpRequestClient 会自动提取 data 字段
    // 所以 versions 直接就是版本数组
    const versions = await fetchJenkinsLtsVersions();

    if (versions && versions.length > 0) {
      jenkinsVersionOptions.value = versions.map((v: JenkinsVersionInfo) => ({
        label: `${v.version}${v.isLts ? ' (LTS)' : ''}${v.isLatest ? ' - 最新' : ''}`,
        value: v.version,
      }));

      // 如果当前没有选择版本，默认选择最新版本
      if (!deployConfig.value.jenkinsVersion) {
        const latestVersion = versions.find((v: JenkinsVersionInfo) => v.isLatest) || versions[0];
        if (latestVersion) {
          deployConfig.value.jenkinsVersion = latestVersion.version;
        }
      }
    } else {
      throw new Error('版本列表为空');
    }
  } catch (error: any) {
    console.error('加载Jenkins版本失败:', error?.message || error);
    // 使用默认版本
    jenkinsVersionOptions.value = [
      { label: '2.462.3 (LTS)', value: '2.462.3' },
      { label: '2.452.4 (LTS)', value: '2.452.4' },
    ];
    if (!deployConfig.value.jenkinsVersion) {
      deployConfig.value.jenkinsVersion = '2.462.3';
    }
  } finally {
    loadingVersions.value = false;
  }
};

const handleRefreshVersions = async () => {
  refreshingVersions.value = true;
  try {
    // 后端返回 {code: 0, data: {success, count, message, ...}}
    // smpRequestClient 会自动提取 data 字段
    const result = await refreshJenkinsVersions();
    if (result && result.success) {
      message.success(`成功同步 ${result.count || 0} 个版本`);
      await loadJenkinsVersions();
    } else {
      message.error(result?.message || '刷新失败');
    }
  } catch (error: any) {
    console.error('刷新版本列表失败:', error);
    message.error('刷新版本列表失败: ' + (error?.message || '未知错误'));
  } finally {
    refreshingVersions.value = false;
  }
};

// ==================== 加载已有数据 ====================

const sourceError = ref('');
const sourceLoading = ref(false);
/** 读取编辑来源，失败时阻止使用默认空表单部署。Load edit source and prevent deployment from a default empty form on failure. */
const loadMaster = async (id: number) => {
  sourceError.value = '';
  sourceLoading.value = true;
  try {
    const data = await fetchJenkinsMasterById(id);
    masterForm.value = {
      ...masterForm.value,
      ...data,
      password: '', // 密码不回显
      admin_password: '',
    };
    // 同步到部署配置
    deployConfig.value.jenkinsPort = data.jenkins_port || 8080;
    deployConfig.value.jenkinsHome = data.jenkins_home || '/var/jenkins_home';
    deployConfig.value.javaVersion = data.java_version || '17';
    deployConfig.value.javaOpts = data.java_opts || '-Xmx2g -Xms1g';
    deployConfig.value.adminUsername = data.admin_username || 'admin';
  } catch (error) {
    sourceError.value = error instanceof Error ? error.message : 'Jenkins Master暂不可用';
  } finally {
    sourceLoading.value = false;
  }
};

// ==================== 连接测试 ====================

const testConnection = async () => {
  testing.value = true;
  testResult.value = null;

  try {
    const result = await testJenkinsMasterConnection(masterForm.value);
    testResult.value = result;

    if (result.success) {
      message.success('连接成功！');
      // 自动检测并更新OS类型
      if (result.detectedOsType && result.detectedOsType !== masterForm.value.os_type) {
        masterForm.value.os_type = result.detectedOsType as any;
        message.info(`已自动更新操作系统类型为: ${result.detectedOsType}`);
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
    if (masterId.value) {
      await updateJenkinsMaster(masterId.value, masterForm.value);
      return masterId.value;
    } else {
      const created = await createJenkinsMaster(masterForm.value);
      masterId.value = created.id!;
      return created.id!;
    }
  } catch (error: any) {
    message.error(error.message || '保存失败');
    return null;
  }
};

// ==================== 预览脚本 ====================

const previewScript = async () => {
  try {
    const result = await previewMasterDeployScript(masterForm.value.os_type, deployConfig.value);
    scriptPreview.value = result.script;
    showScript.value = true;
  } catch (error) {
    message.error('获取脚本失败');
  }
};

// ==================== 执行部署 ====================

const executeDeploy = async () => {
  // 先保存节点
  if (!masterId.value) {
    deployLog.value = '正在创建Master配置...\n';
    const savedId = await saveNode();
    if (!savedId) {
      deployLog.value += '创建配置失败\n';
      return;
    }
  }

  deploying.value = true;
  deployLog.value += '正在提交部署任务...\n';

  try {
    // 同步配置
    deployConfig.value.jenkinsPort = masterForm.value.jenkins_port || 8080;
    deployConfig.value.jenkinsHome = masterForm.value.jenkins_home || '/var/jenkins_home';
    deployConfig.value.javaVersion = masterForm.value.java_version || '17';
    deployConfig.value.adminUsername = masterForm.value.admin_username || 'admin';
    deployConfig.value.adminPassword = masterForm.value.admin_password || deployConfig.value.adminPassword;

    const result = await deployJenkinsMaster(masterId.value!, deployConfig.value);

    if (result.success) {
      deployLog.value += '部署任务已提交，正在后台执行...\n';
      deployLog.value += '请等待，这可能需要几分钟时间...\n\n';

      setTimeout(() => {
        startLogRefresh();
      }, 2000);
    } else {
      deployLog.value += `部署任务提交失败: ${result.message}\n`;
      deploying.value = false;
    }
  } catch (error: any) {
    deployLog.value += `部署失败: ${error.message}\n`;
    deploying.value = false;
  }
};

// ==================== 日志轮询 ====================

const startLogRefresh = () => {
  if (logRefreshTimer) {
    clearInterval(logRefreshTimer);
  }
  logRefreshTimer = setInterval(refreshDeployLog, 3000);
};

const stopLogRefresh = () => {
  if (logRefreshTimer) {
    clearInterval(logRefreshTimer);
    logRefreshTimer = null;
  }
};

const refreshDeployLog = async () => {
  if (!masterId.value) return;

  try {
    const master = await fetchJenkinsMasterById(masterId.value);
    if (master) {
      deployLog.value = master.deploy_log || '';

      // 自动滚动到底部
      await nextTick();
      if (logContainerRef.value) {
        logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight;
      }

      // 检查部署状态
      if (master.status === 'deployed' || master.status === 'running') {
        stopLogRefresh();
        deploying.value = false;
        deploySuccess.value = true;
        message.success('部署成功！');

        // 自动配置凭证（如果有配置）
        await autoConfigureCredentials();
      } else if (master.status === 'failed') {
        stopLogRefresh();
        deploying.value = false;
        deploySuccess.value = false;
        message.error('部署失败');
      }
    }
  } catch (error) {
    console.error('刷新日志失败:', error);
  }
};

// ==================== 自动配置凭证 ====================

const autoConfigureCredentials = async () => {
  // 检查是否有凭证需要配置（凭证已通过 Groovy 初始化脚本自动创建）
  const hasCredentials =
    (deployConfig.value.gitCredentials && deployConfig.value.gitCredentials.length > 0) ||
    (deployConfig.value.harborCredentials && deployConfig.value.harborCredentials.length > 0) ||
    (deployConfig.value.sshCredentials && deployConfig.value.sshCredentials.length > 0);

  if (hasCredentials) {
    // 凭证已通过部署脚本中的 Groovy 初始化脚本自动创建
    // 在 Jenkins 第二次重启后生效
    message.info('凭证已配置，将在 Jenkins 完全启动后自动创建', 5);
  }
};
// ==================== 步骤控制 ====================

const nextStep = async () => {
  if (sourceError.value || sourceLoading.value) return;
  // 验证当前步骤
  if (currentStep.value === 0) {
    if (!masterForm.value.name) {
      message.warning('请填写 Master 名称');
      return;
    }
    if (connectionMode.value === 'select') {
      // 选择已注册服务器模式
      if (!selectedWorkstationId.value) {
        message.warning('请选择已注册的服务器');
        return;
      }
    } else {
      // 手动输入模式
      if (!masterForm.value.host || !masterForm.value.username || !masterForm.value.password) {
        message.warning('请填写完整的连接配置');
        return;
      }
    }
  } else if (currentStep.value === 1) {
    // 验证连接测试
    if (!testResult.value?.success) {
      message.warning('请先完成连接测试');
      return;
    }
  } else if (currentStep.value === 2) {
    // 验证Jenkins配置
    if (!deployConfig.value.jenkinsVersion || !deployConfig.value.adminPassword) {
      message.warning('请填写完整的Jenkins配置');
      return;
    }
    // 同步配置
    masterForm.value.jenkins_port = deployConfig.value.jenkinsPort;
    masterForm.value.jenkins_home = deployConfig.value.jenkinsHome;
    masterForm.value.java_version = deployConfig.value.javaVersion;
    masterForm.value.java_opts = deployConfig.value.javaOpts;
    masterForm.value.admin_username = deployConfig.value.adminUsername;
    masterForm.value.admin_password = deployConfig.value.adminPassword;
  }

  currentStep.value++;
};

const prevStep = () => {
  currentStep.value--;
};

const goBack = () => {
  router.push('/SMP/JenkinsDeployment/index');
};

// 打开Jenkins页面
const openJenkins = () => {
  const url = `http://${masterForm.value.host}:${deployConfig.value.jenkinsPort}`;
  window.open(url, '_blank');
};

// ==================== 生命周期 ====================

onMounted(async () => {
  // 加载Jenkins版本列表
  await loadJenkinsVersions();

  const id = route.query.id;
  if (id) {
    masterId.value = Number(id);
    loadMaster(masterId.value);
  }
});

onUnmounted(() => {
  stopLogRefresh();
});
</script>

<template>
  <BusinessPage domain="资源配置" description="管理组织内的数据连接、仓库、工作站与计算资源。">
  <SourceAlert v-if="sourceError" type="error" show-icon message="Jenkins Master 未加载" :description="sourceError"><template #action><Button @click="loadMaster(Number(route.query.id))">重试</Button></template></SourceAlert>
  <div v-if="sourceLoading" class="py-8">正在加载 Master…</div>
  <div v-if="!sourceError && !sourceLoading" class="deploy-master-container">
    <Card>
      <!-- 标题栏 -->
      <template #title>
        <Space>
          <Button @click="goBack">
            <template #icon><ArrowLeftOutlined /></template>
          </Button>
          <span>{{ masterId ? '编辑Master配置' : '部署Jenkins Master' }}</span>
        </Space>
      </template>

      <!-- 步骤条 -->
      <Steps :current="currentStep" class="steps-container">
        <Steps.Step v-for="(step, index) in steps" :key="index" :title="step.title">
          <template #icon>
            <component :is="step.icon" />
          </template>
        </Steps.Step>
      </Steps>

      <Divider />

      <!-- 步骤内容 -->
      <div class="step-content">
        <!-- 步骤1: 连接配置 -->
        <div v-show="currentStep === 0" class="step-panel">
          <Card title="SSH连接配置" :bordered="false">
            <Form :label-col="{ span: 4 }" :wrapper-col="{ span: 16 }">
              <Form.Item label="Master名称" required>
                <Input v-model:value="masterForm.name" placeholder="如: jenkins-master-01" />
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
                  <Form.Item label="主机地址">
                    <Input :value="masterForm.host" disabled />
                  </Form.Item>
                  <Form.Item label="SSH端口">
                    <InputNumber :value="masterForm.port" disabled style="width: 120px" />
                  </Form.Item>
                  <Form.Item label="用户名">
                    <Input :value="masterForm.username" disabled />
                  </Form.Item>
                  <Form.Item label="操作系统">
                    <Input :value="masterForm.os_type" disabled />
                  </Form.Item>
                </template>
              </template>

              <!-- 手动输入模式 -->
              <template v-else>
                <Form.Item label="主机地址" required>
                  <Input v-model:value="masterForm.host" placeholder="IP地址或域名" />
                </Form.Item>
                <Form.Item label="SSH端口" required>
                  <InputNumber v-model:value="masterForm.port" :min="1" :max="65535" style="width: 120px" />
                </Form.Item>
                <Form.Item label="用户名" required>
                  <Input v-model:value="masterForm.username" placeholder="SSH用户名" />
                </Form.Item>
                <Form.Item label="密码" required>
                  <Input.Password v-model:value="masterForm.password" placeholder="SSH密码" />
                </Form.Item>
                <Form.Item label="操作系统">
                  <Radio.Group v-model:value="masterForm.os_type">
                    <Radio.Button value="linux">Linux</Radio.Button>
                    <Radio.Button value="macos">macOS</Radio.Button>
                    <Radio.Button value="windows">Windows</Radio.Button>
                  </Radio.Group>
                </Form.Item>
                <Form.Item label="地域">
                  <Select v-model:value="masterForm.region" :options="regionOptions" style="width: 200px" />
                </Form.Item>
              </template>

              <Form.Item label="描述">
                <Input.TextArea v-model:value="masterForm.description" :rows="2" placeholder="可选的描述信息" />
              </Form.Item>
            </Form>
          </Card>
        </div>

        <!-- 步骤2: 测试连接 -->
        <div v-show="currentStep === 1" class="step-panel">
          <Card title="SSH连接测试" :bordered="false">
            <div class="test-section">
              <div class="connection-info">
                <Descriptions :column="2" bordered size="small">
                  <Descriptions.Item label="主机地址">{{ masterForm.host }}</Descriptions.Item>
                  <Descriptions.Item label="端口">{{ masterForm.port }}</Descriptions.Item>
                  <Descriptions.Item label="用户名">{{ masterForm.username }}</Descriptions.Item>
                  <Descriptions.Item label="操作系统">{{ masterForm.os_type }}</Descriptions.Item>
                </Descriptions>
              </div>

              <div class="test-action">
                <Button type="primary" size="large" :loading="testing" @click="testConnection">
                  {{ testing ? '测试中...' : '开始测试连接' }}
                </Button>
              </div>

              <div v-if="testResult" class="test-result">
                <Alert
                  :type="testResult.success ? 'success' : 'error'"
                  :message="testResult.success ? '连接成功' : '连接失败'"
                  :description="testResult.message"
                  show-icon
                />
                <div v-if="testResult.success" class="server-info">
                  <Descriptions :column="1" bordered size="small" style="margin-top: 16px">
                    <Descriptions.Item label="系统信息">{{ testResult.osInfo }}</Descriptions.Item>
                    <Descriptions.Item label="主机名">{{ testResult.hostname }}</Descriptions.Item>
                    <Descriptions.Item label="可用磁盘">{{ testResult.availableDisk }}</Descriptions.Item>
                    <Descriptions.Item label="总内存">{{ testResult.totalMemoryMb }}MB</Descriptions.Item>
                  </Descriptions>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <!-- 步骤3: Jenkins配置 -->
        <div v-show="currentStep === 2" class="step-panel">
          <Card title="Jenkins配置" :bordered="false">
            <Form :label-col="{ span: 4 }" :wrapper-col="{ span: 16 }">
              <Form.Item label="Jenkins版本" required>
                <Space>
                  <Select
                    v-model:value="deployConfig.jenkinsVersion"
                    :options="jenkinsVersionOptions"
                    :loading="loadingVersions"
                    style="width: 250px"
                    placeholder="选择Jenkins版本"
                  />
                  <Button
                    :loading="refreshingVersions"
                    @click="handleRefreshVersions"
                    title="从镜像站刷新版本列表"
                  >
                    刷新版本
                  </Button>
                </Space>
                <div class="text-xs text-gray-400 mt-1">
                  版本列表从 mirrors.jenkins.io 获取，点击刷新可获取最新版本
                </div>
              </Form.Item>
              <Form.Item label="HTTP端口" required>
                <InputNumber v-model:value="deployConfig.jenkinsPort" :min="1" :max="65535" style="width: 120px" />
              </Form.Item>
              <Form.Item label="Jenkins Home">
                <Input v-model:value="deployConfig.jenkinsHome" placeholder="/var/jenkins_home" />
              </Form.Item>
              <Form.Item label="Java版本">
                <Select v-model:value="deployConfig.javaVersion" :options="javaVersionOptions" style="width: 200px" />
              </Form.Item>
              <Form.Item label="JVM参数">
                <Input v-model:value="deployConfig.javaOpts" placeholder="-Xmx2g -Xms1g" />
              </Form.Item>
              <Form.Item label="时区">
                <Select
                  v-model:value="deployConfig.timezone"
                  :options="timezoneOptions"
                  style="width: 300px"
                  placeholder="选择时区"
                />
                <div class="text-xs text-gray-400 mt-1">
                  设置Jenkins服务器时区，影响构建日志和定时任务的时间显示
                </div>
              </Form.Item>
              <Divider>管理员配置</Divider>
              <Form.Item label="管理员用户名" required>
                <Input v-model:value="deployConfig.adminUsername" placeholder="admin" />
              </Form.Item>
              <Form.Item label="管理员密码" required>
                <Input.Password v-model:value="deployConfig.adminPassword" placeholder="设置管理员密码" />
              </Form.Item>
              <Form.Item label="管理员邮箱">
                <Input v-model:value="deployConfig.adminEmail" placeholder="admin@localhost" />
              </Form.Item>
              <Form.Item label="安装推荐插件">
                <Switch v-model:checked="deployConfig.installSuggestedPlugins" />
              </Form.Item>
            </Form>
          </Card>
        </div>

        <!-- 步骤4: 凭证配置 -->
        <div v-show="currentStep === 3" class="step-panel">
          <Card title="凭证配置 (可选)" :bordered="false">
            <Alert
              type="info"
              message="凭证配置提示"
              description="您可以在此配置Git、Harbor、SSH凭证，部署完成后将自动创建到Jenkins中。此步骤为可选步骤，也可以在Jenkins部署完成后手动配置。"
              show-icon
              style="margin-bottom: 16px"
            />

            <Collapse :default-active-key="['git']">
              <!-- Git凭证配置 -->
              <Collapse.Panel key="git" header="Git凭证配置">
                <div v-for="(cred, index) in deployConfig.gitCredentials" :key="index" class="credential-item">
                  <Form :label-col="{ span: 4 }" :wrapper-col="{ span: 18 }">
                    <Form.Item label="凭证ID">
                      <Input v-model:value="cred.id" placeholder="如：gitee-synap-xnet" />
                    </Form.Item>
                    <Form.Item label="描述">
                      <Input v-model:value="cred.description" placeholder="凭证描述" />
                    </Form.Item>
                    <Form.Item label="用户名">
                      <Input v-model:value="cred.username" placeholder="Git用户名" />
                    </Form.Item>
                    <Form.Item label="密码/Token">
                      <Input.Password v-model:value="cred.password" placeholder="Git密码或Token" />
                    </Form.Item>
                    <Form.Item :wrapper-col="{ offset: 4 }">
                      <Button type="link" danger @click="removeGitCredential(index)">删除此凭证</Button>
                    </Form.Item>
                  </Form>
                  <Divider v-if="index < (deployConfig.gitCredentials?.length || 0) - 1" />
                </div>
                <Button type="dashed" block @click="addGitCredential" style="margin-top: 8px">
                  + 添加Git凭证
                </Button>
              </Collapse.Panel>

              <!-- Harbor凭证配置 -->
              <Collapse.Panel key="harbor" header="Harbor凭证配置">
                <div v-for="(cred, index) in deployConfig.harborCredentials" :key="index" class="credential-item">
                  <Form :label-col="{ span: 4 }" :wrapper-col="{ span: 18 }">
                    <Form.Item label="凭证ID">
                      <Input v-model:value="cred.id" placeholder="如：harbor-registry" />
                    </Form.Item>
                    <Form.Item label="描述">
                      <Input v-model:value="cred.description" placeholder="凭证描述" />
                    </Form.Item>
                    <Form.Item label="Harbor URL">
                      <Input v-model:value="cred.url" placeholder="如：https://harbor.example.com" />
                    </Form.Item>
                    <Form.Item label="用户名">
                      <Input v-model:value="cred.username" placeholder="Harbor用户名" />
                    </Form.Item>
                    <Form.Item label="密码">
                      <Input.Password v-model:value="cred.password" placeholder="Harbor密码" />
                    </Form.Item>
                    <Form.Item :wrapper-col="{ offset: 4 }">
                      <Button type="link" danger @click="removeHarborCredential(index)">删除此凭证</Button>
                    </Form.Item>
                  </Form>
                  <Divider v-if="index < (deployConfig.harborCredentials?.length || 0) - 1" />
                </div>
                <Button type="dashed" block @click="addHarborCredential" style="margin-top: 8px">
                  + 添加Harbor凭证
                </Button>
              </Collapse.Panel>

              <!-- SSH凭证配置 -->
              <Collapse.Panel key="ssh" header="SSH凭证配置">
                <div v-for="(cred, index) in deployConfig.sshCredentials" :key="index" class="credential-item">
                  <Form :label-col="{ span: 4 }" :wrapper-col="{ span: 18 }">
                    <Form.Item label="凭证ID">
                      <Input v-model:value="cred.id" placeholder="如：ssh-deploy-key" />
                    </Form.Item>
                    <Form.Item label="描述">
                      <Input v-model:value="cred.description" placeholder="凭证描述" />
                    </Form.Item>
                    <Form.Item label="用户名">
                      <Input v-model:value="cred.username" placeholder="SSH用户名" />
                    </Form.Item>
                    <Form.Item label="私钥">
                      <Input.TextArea v-model:value="cred.privateKey" :rows="4" placeholder="粘贴SSH私钥内容（包含 -----BEGIN 和 -----END）" />
                    </Form.Item>
                    <Form.Item label="私钥密码">
                      <Input.Password v-model:value="cred.passphrase" placeholder="私钥密码（可选）" />
                    </Form.Item>
                    <Form.Item :wrapper-col="{ offset: 4 }">
                      <Button type="link" danger @click="removeSshCredential(index)">删除此凭证</Button>
                    </Form.Item>
                  </Form>
                  <Divider v-if="index < (deployConfig.sshCredentials?.length || 0) - 1" />
                </div>
                <Button type="dashed" block @click="addSshCredential" style="margin-top: 8px">
                  + 添加SSH凭证
                </Button>
              </Collapse.Panel>
            </Collapse>
          </Card>
        </div>

        <!-- 步骤5: 执行部署 -->
        <div v-show="currentStep === 4" class="step-panel">
          <Card title="执行部署" :bordered="false">
            <div v-if="!deploying && !deploySuccess">
              <Alert
                type="warning"
                message="部署确认"
                description="点击下方按钮开始部署Jenkins Master。部署过程可能需要5-15分钟，请耐心等待。"
                show-icon
                style="margin-bottom: 16px"
              />

              <Descriptions :column="2" bordered size="small" style="margin-bottom: 16px">
                <Descriptions.Item label="目标主机">{{ masterForm.host }}</Descriptions.Item>
                <Descriptions.Item label="Jenkins端口">{{ deployConfig.jenkinsPort }}</Descriptions.Item>
                <Descriptions.Item label="Jenkins版本">{{ deployConfig.jenkinsVersion }}</Descriptions.Item>
                <Descriptions.Item label="Java版本">{{ deployConfig.javaVersion }}</Descriptions.Item>
                <Descriptions.Item label="管理员用户">{{ deployConfig.adminUsername }}</Descriptions.Item>
                <Descriptions.Item label="Jenkins Home">{{ deployConfig.jenkinsHome }}</Descriptions.Item>
              </Descriptions>

              <Space>
                <Button type="primary" size="large" @click="executeDeploy">
                  <template #icon><RocketOutlined /></template>
                  开始部署
                </Button>
                <Button @click="previewScript">预览部署脚本</Button>
              </Space>
            </div>

            <div v-else-if="deploying" class="deploying-section">
              <Spin size="large">
                <template #indicator>
                  <LoadingOutlined style="font-size: 48px" spin />
                </template>
              </Spin>
              <p class="deploying-text">正在部署中，请稍候...</p>
            </div>

            <div v-else-if="deploySuccess" class="success-section">
              <Result
                status="success"
                title="部署成功！"
                :sub-title="`Jenkins Master 已成功部署到 ${masterForm.host}:${deployConfig.jenkinsPort}`"
              >
                <template #extra>
                  <Space>
                    <Button type="primary" @click="openJenkins">
                      打开Jenkins
                    </Button>
                    <Button @click="goBack">返回列表</Button>
                  </Space>
                </template>
              </Result>
            </div>

            <!-- 部署日志 -->
            <div v-if="deployLog" class="log-section">
              <Divider>部署日志</Divider>
              <div ref="logContainerRef" class="log-container">
                <pre>{{ deployLog }}</pre>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <!-- 底部按钮 -->
      <Divider />
      <div class="step-actions">
        <Button v-if="currentStep > 0 && currentStep < 4" @click="prevStep">
          <template #icon><ArrowLeftOutlined /></template>
          上一步
        </Button>
        <Button
          v-if="currentStep < 4"
          type="primary"
          @click="nextStep"
          :disabled="currentStep === 1 && !testResult?.success"
        >
          下一步
          <template #icon><ArrowRightOutlined /></template>
        </Button>
      </div>
    </Card>

    <!-- 脚本预览弹窗 -->
    <Modal v-model:open="showScript" title="部署脚本预览" width="800px" :footer="null">
      <pre class="script-preview">{{ scriptPreview }}</pre>
    </Modal>
  </div>

  </BusinessPage>
</template>

<style scoped>
.deploy-master-container {
  padding: 16px;
}

.steps-container {
  padding: 0 40px;
}

.step-content {
  min-height: 400px;
  padding: 24px 0;
}

.step-panel {
  max-width: 900px;
  margin: 0 auto;
}

.step-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.test-section {
  text-align: center;
}

.connection-info {
  max-width: 600px;
  margin: 0 auto 24px;
}

.test-action {
  margin: 24px 0;
}

.test-result {
  max-width: 600px;
  margin: 0 auto;
}

.server-info {
  text-align: left;
}

.deploying-section {
  text-align: center;
  padding: 40px;
}

.deploying-text {
  margin-top: 24px;
  font-size: 16px;
  color: hsl(var(--muted-foreground));
}

.success-section {
  padding: 20px;
}

.log-section {
  margin-top: 24px;
}

.log-container {
  background-color: #1e1e1e;
  color: #d4d4d4;
  padding: 16px;
  border-radius: 4px;
  max-height: 400px;
  overflow-y: auto;
}

.log-container pre {
  margin: 0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.script-preview {
  background-color: #1e1e1e;
  color: #d4d4d4;
  padding: 16px;
  border-radius: 4px;
  max-height: 500px;
  overflow-y: auto;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  white-space: pre-wrap;
}

.hint-text {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
  margin: 8px 0;
}

.credential-item {
  padding: 16px;
  background: hsl(var(--muted));
  border-radius: 8px;
  margin-bottom: 12px;
}

.credential-item:last-child {
  margin-bottom: 0;
}
</style>
