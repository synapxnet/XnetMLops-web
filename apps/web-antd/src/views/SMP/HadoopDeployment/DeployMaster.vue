<script setup lang="ts">
import { ref, onMounted, nextTick, onUnmounted } from 'vue';
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
  Modal,
  Switch,
} from 'ant-design-vue';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  LoadingOutlined,
  CloudServerOutlined,
  KeyOutlined,
  SettingOutlined,
  DatabaseOutlined,
  RocketOutlined,
} from '@ant-design/icons-vue';

import {
  getHadoopVersions,
  testConnection,
  createCluster,
  updateCluster,
  getClusterById,
  deployCluster,
  type HadoopCluster,
  type HadoopDeployConfig,
  type HadoopVersion,
} from '../api/hadoopCluster';

import WorkstationSelector from '../components/WorkstationSelector.vue';
import type { Workstation } from '../api/workstation';

const router = useRouter();
const route = useRoute();

// 当前步骤
const currentStep = ref(0);

// 节点ID（编辑模式）
const masterId = ref<number | null>(null);

// 表单数据
const masterForm = ref<HadoopCluster>({
  name: '',
  host: '',
  port: 22,
  sshUser: 'root',
  sshPassword: '',
  sshPrivateKey: '',
  hadoopVersion: '',
  osType: 'linux',
  nodeType: 'master',
  deployMode: 'standard',
  components: '["hdfs", "yarn", "mapreduce"]',
  hdfsDataDirs: '["/data/hadoop/hdfs"]',
  hdfsReplication: 3,
  hdfsBlockSize: 134217728,
  yarnMemory: 8192,
  yarnCpu: 4,
  haMasterHost: '',
  zkCluster: '',
});

// 部署配置
const deployConfig = ref<HadoopDeployConfig>({
  hadoopVersion: '',
  osType: 'linux',
  deployMode: 'standard',
  javaVersion: '8',
  components: ['hdfs', 'yarn', 'mapreduce'],
  hdfsDataDirs: ['/data/hadoop/hdfs'],
  hdfsReplication: 3,
  hdfsBlockSizeMb: 128,
  yarnMemory: 8192,
  yarnCpu: 4,
  haMasterHost: '',
  zkCluster: '',
  timezone: 'Asia/Shanghai',
  // 端口配置
  nameNodePort: 9000,
  nameNodeHttpPort: 9870,
  dataNodePort: 9866,
  secondaryNameNodeHttpPort: 9868,
  resourceManagerPort: 8032,
  resourceManagerWebPort: 8088,
  nodeManagerPort: 8042,
  jobHistoryPort: 10020,
  jobHistoryWebPort: 19888,
  // 跨云部署配置
  crossCloudMode: false,
  clusterHosts: [],
  nodeHostname: '',
});

// 地区
const region = ref('guangzhou');

// 使用密钥认证
const usePrivateKey = ref(false);

// 连接模式: manual (手动输入) / select (选择已注册服务器)
const connectionMode = ref<'manual' | 'select'>('manual');
const selectedWorkstationId = ref<number | undefined>();

// 工作站选择器引用
const workstationSelectorRef = ref<InstanceType<typeof WorkstationSelector> | null>(null);

// 处理工作站选择
const handleWorkstationSelect = (workstation: Workstation) => {
  masterForm.value.name = masterForm.value.name || workstation.name;
  masterForm.value.host = workstation.ipAddress;
  masterForm.value.port = workstation.sshPort || 22;
  masterForm.value.sshUser = workstation.sshUser;
  masterForm.value.sshPassword = workstation.password || '';
  masterForm.value.sshPrivateKey = workstation.privateKey || '';
  masterForm.value.osType = workstation.osType as any;
  usePrivateKey.value = workstation.authType === 'privateKey';
};

// 处理连接信息变化
const handleConnectionChange = (data: {
  host: string;
  port: number;
  username: string;
  password: string;
  privateKey: string;
  osType: string;
  hostname: string;
}) => {
  if (connectionMode.value === 'manual') {
    masterForm.value.host = data.host;
    masterForm.value.port = data.port;
    masterForm.value.sshUser = data.username;
    masterForm.value.sshPassword = data.password;
    masterForm.value.sshPrivateKey = data.privateKey;
    masterForm.value.osType = data.osType as any;
    usePrivateKey.value = !!data.privateKey;
  }
};

// 连接测试结果类型
interface ConnectionTestResult {
  success: boolean;
  message: string;
  osInfo?: string;
  hostname?: string;
  availableDisk?: string;
  totalMemoryMb?: number;
  detectedOsType?: string;
}

// 连接测试
const testing = ref(false);
const testResult = ref<ConnectionTestResult | null>(null);

// 部署状态
const deploying = ref(false);
const deploySuccess = ref(false);
const deployFailed = ref(false);
const deployLog = ref('');

// 日志刷新定时器
let logRefreshTimer: ReturnType<typeof setInterval> | null = null;
const logContainerRef = ref<HTMLElement | null>(null);

// 版本列表
const versionList = ref<HadoopVersion[]>([]);
const versionLoading = ref(false);

// 步骤配置
const steps = [
  { title: '连接配置', icon: CloudServerOutlined },
  { title: '测试连接', icon: KeyOutlined },
  { title: 'Hadoop配置', icon: SettingOutlined },
  { title: '存储配置', icon: DatabaseOutlined },
  { title: '执行部署', icon: RocketOutlined },
];

// 地区选项
const regionOptions = [
  { label: '广州', value: 'guangzhou' },
  { label: '北京', value: 'beijing' },
  { label: '上海', value: 'shanghai' },
  { label: '深圳', value: 'shenzhen' },
  { label: '杭州', value: 'hangzhou' },
  { label: '南京', value: 'nanjing' },
  { label: '硅谷', value: 'silicon_valley' },
  { label: '新加坡', value: 'singapore' },
];

// 操作系统选项
const osOptions = [
  { label: 'Linux', value: 'linux' },
  { label: 'macOS', value: 'macos' },
  { label: 'Windows', value: 'windows' },
];

// Java版本选项
const javaVersionOptions = [
  { label: 'Java 8', value: '8' },
  { label: 'Java 11', value: '11' },
  { label: 'Java 17', value: '17' },
  { label: 'Java 21', value: '21' },
];

// 部署模式选项
const deployModeOptions = [
  { label: '标准模式', value: 'standard' },
  { label: 'HA 高可用模式', value: 'ha' },
];

// 时区选项
const timezoneOptions = [
  { label: 'Asia/Shanghai (中国标准时间)', value: 'Asia/Shanghai' },
  { label: 'Asia/Hong_Kong (香港时间)', value: 'Asia/Hong_Kong' },
  { label: 'Asia/Tokyo (日本时间)', value: 'Asia/Tokyo' },
  { label: 'UTC (协调世界时)', value: 'UTC' },
];

// 组件选项
const componentOptions = [
  { label: 'HDFS (分布式文件系统)', value: 'hdfs' },
  { label: 'YARN (资源调度)', value: 'yarn' },
  { label: 'MapReduce (计算框架)', value: 'mapreduce' },
];

// ==================== 加载Hadoop版本列表 ====================

const loadHadoopVersions = async () => {
  versionLoading.value = true;
  try {
    const versions = await getHadoopVersions();
    if (versions && versions.length > 0) {
      versionList.value = versions;
      if (!deployConfig.value.hadoopVersion) {
        deployConfig.value.hadoopVersion = versions[0]?.version || '3.3.6';
      }
    }
  } catch (error: any) {
    console.error('加载Hadoop版本失败:', error);
    versionList.value = [
      { version: '3.3.6', releaseDate: '2023-06-23', isLatest: true },
      { version: '3.3.5', releaseDate: '2023-03-15', isLatest: false },
    ];
    if (!deployConfig.value.hadoopVersion) {
      deployConfig.value.hadoopVersion = '3.3.6';
    }
  } finally {
    versionLoading.value = false;
  }
};

// ==================== 连接测试 ====================

const handleTestConnection = async () => {
  testing.value = true;
  testResult.value = null;

  try {
    const testData: HadoopCluster = {
      ...masterForm.value,
      nodeType: 'master',
    };

    const result = await testConnection(testData);

    // 直接使用后端返回的结构化字段
    testResult.value = {
      success: result.success,
      message: result.message,
      osInfo: result.osInfo || '检测中...',
      hostname: result.hostname || masterForm.value.host,
      availableDisk: result.availableDisk || '检测中...',
      totalMemoryMb: parseInt(result.totalMemoryMb) || 0,
      detectedOsType: result.detectedOsType,
    };

    if (result.success) {
      message.success('连接成功');
      // 自动检测并更新OS类型
      if (result.detectedOsType && result.detectedOsType !== masterForm.value.osType) {
        masterForm.value.osType = result.detectedOsType as any;
        message.info(`已自动更新操作系统类型为: ${result.detectedOsType}`);
      }
      // 自动填充跨云模式的hostname
      if (result.hostname && !deployConfig.value.nodeHostname) {
        deployConfig.value.nodeHostname = result.hostname;
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

// ==================== 保存配置 ====================

const saveConfig = async (): Promise<number | null> => {
  try {
    // 同步部署配置到表单
    masterForm.value.hadoopVersion = deployConfig.value.hadoopVersion;
    masterForm.value.osType = deployConfig.value.osType;
    masterForm.value.deployMode = deployConfig.value.deployMode;
    masterForm.value.components = JSON.stringify(deployConfig.value.components);
    masterForm.value.hdfsDataDirs = JSON.stringify(deployConfig.value.hdfsDataDirs);
    masterForm.value.hdfsReplication = deployConfig.value.hdfsReplication;
    masterForm.value.hdfsBlockSize = (deployConfig.value.hdfsBlockSizeMb || 128) * 1024 * 1024;
    masterForm.value.yarnMemory = deployConfig.value.yarnMemory;
    masterForm.value.yarnCpu = deployConfig.value.yarnCpu;
    masterForm.value.haMasterHost = deployConfig.value.haMasterHost;
    masterForm.value.zkCluster = deployConfig.value.zkCluster;

    if (masterId.value) {
      const result = await updateCluster(masterId.value, masterForm.value);
      if (result) {
        message.success('更新成功');
        return masterId.value;
      }
    } else {
      const result = await createCluster(masterForm.value);
      if (result && result.id) {
        masterId.value = result.id;
        message.success('创建成功');
        return result.id;
      }
    }
    return null;
  } catch (error: any) {
    message.error(error.message || '保存失败');
    return null;
  }
};

// ==================== 执行部署 ====================

const executeDeploy = async () => {
  // 先保存节点
  if (!masterId.value) {
    deployLog.value = '正在创建Master配置...\n';
    const savedId = await saveConfig();
    if (!savedId) {
      deployLog.value += '创建配置失败\n';
      return;
    }
  }

  deploying.value = true;
  deploySuccess.value = false;
  deployLog.value += '正在提交部署任务...\n';

  try {
    const result = await deployCluster(masterId.value!, deployConfig.value);

    if (result.success) {
      deployLog.value += '部署任务已提交，正在后台执行...\n';
      deployLog.value += '请等待，这可能需要几分钟时间（下载和安装 Hadoop）...\n\n';

      // 后端使用异步部署，立即开始轮询日志
      startLogRefresh();
    } else {
      deployLog.value += `部署任务提交失败: ${result.message}\n`;
      deploying.value = false;
      deployFailed.value = true;
    }
  } catch (error: any) {
    deployLog.value += `部署失败: ${error.message}\n`;
    deploying.value = false;
    deployFailed.value = true;
  }

  // 自动滚动日志
  await nextTick();
  if (logContainerRef.value) {
    logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight;
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
    const cluster = await getClusterById(masterId.value);
    if (cluster && cluster.deployLog) {
      deployLog.value = cluster.deployLog;

      // 自动滚动到底部
      await nextTick();
      if (logContainerRef.value) {
        logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight;
      }

      // 检查部署状态
      if (cluster.status === 'deployed' || cluster.status === 'running') {
        stopLogRefresh();
        deploying.value = false;
        deploySuccess.value = true;
        message.success('部署成功！');
      } else if (cluster.status === 'failed') {
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

// ==================== 步骤控制 ====================

const nextStep = async () => {
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
      if (!masterForm.value.host || !masterForm.value.sshUser) {
        message.warning('请填写完整的连接配置');
        return;
      }
      if (!usePrivateKey.value && !masterForm.value.sshPassword) {
        message.warning('请填写 SSH 密码');
        return;
      }
      if (usePrivateKey.value && !masterForm.value.sshPrivateKey) {
        message.warning('请填写 SSH 私钥');
        return;
      }
    }
  } else if (currentStep.value === 1) {
    if (!testResult.value?.success) {
      message.warning('请先完成连接测试');
      return;
    }
  } else if (currentStep.value === 2) {
    if (!deployConfig.value.hadoopVersion) {
      message.warning('请选择 Hadoop 版本');
      return;
    }
  } else if (currentStep.value === 3) {
    // 保存配置
    const saved = await saveConfig();
    if (!saved) return;
  }

  currentStep.value++;
};

const prevStep = () => {
  currentStep.value--;
};

const goBack = () => {
  router.push('/SMP/HadoopDeployment/index');
};

const openHdfsWebUI = () => {
  window.open(`http://${masterForm.value.host}:${deployConfig.value.nameNodeHttpPort}`);
};

const openYarnWebUI = () => {
  window.open(`http://${masterForm.value.host}:${deployConfig.value.resourceManagerWebPort}`);
};

const retryDeploy = () => {
  deployFailed.value = false;
  deploySuccess.value = false;
  deployLog.value = '';
  executeDeploy();
};


// ==================== 生命周期 ====================

onMounted(async () => {
  await loadHadoopVersions();

  const id = route.query.id;
  if (id) {
    masterId.value = Number(id);
    try {
      const cluster = await getClusterById(masterId.value);
      if (cluster) {
        masterForm.value = cluster;
        deployConfig.value.hadoopVersion = cluster.hadoopVersion || '';
        deployConfig.value.osType = cluster.osType || 'linux';
        deployConfig.value.deployMode = cluster.deployMode || 'standard';
        deployConfig.value.components = cluster.components ? JSON.parse(cluster.components) : ['hdfs', 'yarn', 'mapreduce'];
        deployConfig.value.hdfsDataDirs = cluster.hdfsDataDirs ? JSON.parse(cluster.hdfsDataDirs) : ['/data/hadoop/hdfs'];
        deployConfig.value.hdfsReplication = cluster.hdfsReplication || 3;
        deployConfig.value.hdfsBlockSizeMb = (cluster.hdfsBlockSize || 134217728) / 1024 / 1024;
        deployConfig.value.yarnMemory = cluster.yarnMemory || 8192;
        deployConfig.value.yarnCpu = cluster.yarnCpu || 4;
      }
    } catch (error) {
      console.error('加载集群信息失败:', error);
    }
  }
});

onUnmounted(() => {
  stopLogRefresh();
});
</script>

<template>
  <div class="deploy-master-container">
    <!-- 顶部导航 -->
    <div class="page-header">
      <Button type="text" @click="goBack">
        <template #icon><ArrowLeftOutlined /></template>
        返回
      </Button>
      <span class="page-title">部署 Hadoop Master 节点</span>
    </div>

    <Card class="main-card">
      <!-- 步骤条 -->
      <div class="steps-container">
        <Steps :current="currentStep" :items="steps.map(s => ({ title: s.title }))" />
      </div>

      <!-- 步骤内容 -->
      <div class="step-content">
        <!-- 步骤1: 连接配置 -->
        <div v-show="currentStep === 0" class="step-panel">
          <Card title="SSH连接配置" :bordered="false">
            <Form :label-col="{ span: 4 }" :wrapper-col="{ span: 16 }">
              <Form.Item label="Master名称" required>
                <Input v-model:value="masterForm.name" placeholder="如: hadoop-master-01" />
              </Form.Item>

              <!-- 使用工作站选择器 -->
              <WorkstationSelector
                ref="workstationSelectorRef"
                v-model:mode="connectionMode"
                v-model:selectedId="selectedWorkstationId"
                :show-mode-switch="true"
                :label-col="{ span: 4 }"
                :wrapper-col="{ span: 16 }"
                @select="handleWorkstationSelect"
                @change="handleConnectionChange"
              />

              <!-- 手动输入模式下显示额外选项 -->
              <template v-if="connectionMode === 'manual'">
                <Form.Item label="地区">
                  <Select v-model:value="region" :options="regionOptions" style="width: 200px" />
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
                  <Descriptions.Item label="用户名">{{ masterForm.sshUser }}</Descriptions.Item>
                  <Descriptions.Item label="操作系统">{{ masterForm.osType }}</Descriptions.Item>
                </Descriptions>
              </div>

              <div class="test-action">
                <Button type="primary" size="large" :loading="testing" @click="handleTestConnection">
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
                    <Descriptions.Item label="系统信息">{{ testResult.osInfo || '检测中...' }}</Descriptions.Item>
                    <Descriptions.Item label="主机名">{{ testResult.hostname || masterForm.host }}</Descriptions.Item>
                    <Descriptions.Item label="可用磁盘">{{ testResult.availableDisk || '需要进一步检测' }}</Descriptions.Item>
                    <Descriptions.Item label="总内存">{{ testResult.totalMemoryMb ? testResult.totalMemoryMb + 'MB' : '需要进一步检测' }}</Descriptions.Item>
                  </Descriptions>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <!-- 步骤3: Hadoop配置 -->
        <div v-show="currentStep === 2" class="step-panel">
          <Form layout="vertical" class="unified-form">
            <!-- 基础配置 -->
            <div class="section-title">基础配置</div>
            <div class="form-row">
              <Form.Item label="Hadoop版本" required class="form-item-quarter">
                <Select
                  v-model:value="deployConfig.hadoopVersion"
                  :loading="versionLoading"
                  placeholder="选择Hadoop版本"
                >
                  <Select.Option v-for="v in versionList" :key="v.version" :value="v.version">
                    {{ v.version }}{{ v.isLatest ? ' (最新)' : '' }}
                  </Select.Option>
                </Select>
              </Form.Item>
              <Form.Item label="Java版本" required class="form-item-quarter">
                <Select v-model:value="deployConfig.javaVersion" :options="javaVersionOptions" />
              </Form.Item>
              <Form.Item label="部署模式" class="form-item-quarter">
                <Select v-model:value="deployConfig.deployMode" :options="deployModeOptions" />
              </Form.Item>
              <Form.Item label="时区" class="form-item-quarter">
                <Select v-model:value="deployConfig.timezone" :options="timezoneOptions" />
              </Form.Item>
            </div>

            <!-- HDFS 端口配置 -->
            <div class="section-title">HDFS 端口配置</div>
            <div class="form-row">
              <Form.Item label="NameNode RPC 端口" class="form-item-quarter">
                <InputNumber v-model:value="deployConfig.nameNodePort" :min="1" :max="65535" style="width: 100%" />
              </Form.Item>
              <Form.Item label="NameNode HTTP 端口" class="form-item-quarter">
                <InputNumber v-model:value="deployConfig.nameNodeHttpPort" :min="1" :max="65535" style="width: 100%" />
              </Form.Item>
              <Form.Item label="DataNode 端口" class="form-item-quarter">
                <InputNumber v-model:value="deployConfig.dataNodePort" :min="1" :max="65535" style="width: 100%" />
              </Form.Item>
              <Form.Item label="Secondary NameNode HTTP" class="form-item-quarter">
                <InputNumber v-model:value="deployConfig.secondaryNameNodeHttpPort" :min="1" :max="65535" style="width: 100%" />
              </Form.Item>
            </div>

            <!-- YARN 端口配置 -->
            <div class="section-title">YARN 端口配置</div>
            <div class="form-row">
              <Form.Item label="ResourceManager 端口" class="form-item-third">
                <InputNumber v-model:value="deployConfig.resourceManagerPort" :min="1" :max="65535" style="width: 100%" />
              </Form.Item>
              <Form.Item label="ResourceManager Web UI" class="form-item-third">
                <InputNumber v-model:value="deployConfig.resourceManagerWebPort" :min="1" :max="65535" style="width: 100%" />
              </Form.Item>
              <Form.Item label="NodeManager 端口" class="form-item-third">
                <InputNumber v-model:value="deployConfig.nodeManagerPort" :min="1" :max="65535" style="width: 100%" />
              </Form.Item>
            </div>

            <!-- MapReduce 端口配置 -->
            <div class="section-title">MapReduce JobHistory 端口</div>
            <div class="form-row">
              <Form.Item label="JobHistory Server 端口" class="form-item-half">
                <InputNumber v-model:value="deployConfig.jobHistoryPort" :min="1" :max="65535" style="width: 100%" />
              </Form.Item>
              <Form.Item label="JobHistory Web UI" class="form-item-half">
                <InputNumber v-model:value="deployConfig.jobHistoryWebPort" :min="1" :max="65535" style="width: 100%" />
              </Form.Item>
            </div>
          </Form>
        </div>

        <!-- 步骤4: 存储配置 -->
        <div v-show="currentStep === 3" class="step-panel">
          <Form layout="vertical" class="unified-form">
            <!-- 安装组件 -->
            <div class="section-title">安装组件</div>
            <Form.Item>
              <Select
                v-model:value="deployConfig.components"
                mode="multiple"
                style="width: 100%"
                placeholder="选择要安装的组件"
              >
                <Select.Option v-for="opt in componentOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </Select.Option>
              </Select>
            </Form.Item>

            <!-- HDFS 配置 -->
            <div class="section-title">HDFS 配置</div>
            <div class="form-row">
              <Form.Item label="数据目录" class="form-item-half">
                <Input.TextArea
                  :value="deployConfig.hdfsDataDirs?.join('\n')"
                  @update:value="(v: string) => deployConfig.hdfsDataDirs = v.split('\n').filter((d: string) => d.trim())"
                  :rows="3"
                  placeholder="每行一个目录，如：/data1/hadoop/hdfs"
                />
              </Form.Item>
              <div class="form-item-half">
                <div class="form-row">
                  <Form.Item label="副本数" class="form-item-half">
                    <InputNumber v-model:value="deployConfig.hdfsReplication" :min="1" :max="10" style="width: 100%" />
                  </Form.Item>
                  <Form.Item label="块大小 (MB)" class="form-item-half">
                    <InputNumber v-model:value="deployConfig.hdfsBlockSizeMb" :min="64" :max="512" :step="64" style="width: 100%" />
                  </Form.Item>
                </div>
              </div>
            </div>

            <!-- YARN 资源配置 -->
            <div class="section-title">YARN 资源配置</div>
            <div class="form-row">
              <Form.Item label="NodeManager 内存 (MB)" class="form-item-half">
                <InputNumber v-model:value="deployConfig.yarnMemory" :min="1024" :step="1024" style="width: 100%" />
              </Form.Item>
              <Form.Item label="NodeManager CPU 核数" class="form-item-half">
                <InputNumber v-model:value="deployConfig.yarnCpu" :min="1" :max="128" style="width: 100%" />
              </Form.Item>
            </div>

            <!-- HA 高可用配置 -->
            <template v-if="deployConfig.deployMode === 'ha'">
              <div class="section-title">HA 高可用配置</div>
              <div class="form-row">
                <Form.Item label="备用 Master 主机" class="form-item-half">
                  <Input v-model:value="deployConfig.haMasterHost" placeholder="备用 Master 节点 IP" />
                </Form.Item>
                <Form.Item label="ZooKeeper 集群" class="form-item-half">
                  <Input v-model:value="deployConfig.zkCluster" placeholder="host1:2181,host2:2181,host3:2181" />
                </Form.Item>
              </div>
            </template>

            <!-- 跨云部署配置 -->
            <div class="section-title">
              跨云/跨地域部署配置
              <Switch v-model:checked="deployConfig.crossCloudMode" style="margin-left: 12px" />
              <span class="text-muted-foreground ml-2 text-[13px] font-normal">
                {{ deployConfig.crossCloudMode ? '已启用' : '未启用' }}
              </span>
            </div>
            <template v-if="deployConfig.crossCloudMode">
              <Alert
                type="info"
                style="margin-bottom: 16px"
              >
                <template #message>
                  当 Hadoop 集群节点分布在不同云厂商或不同地域时，需要启用跨云模式，自动配置 /etc/hosts 确保节点间通过 hostname 相互解析。
                </template>
              </Alert>
              <div class="form-row">
                <Form.Item label="当前节点主机名" required class="form-item-half">
                  <Input
                    v-model:value="deployConfig.nodeHostname"
                    placeholder="如: hadoop-master"
                    :default-value="testResult?.hostname"
                  />
                  <div class="hint-text">用于 Hadoop 配置的主机名</div>
                </Form.Item>
                <Form.Item label="集群 Hosts 配置" required class="form-item-half">
                  <Input.TextArea
                    :value="deployConfig.clusterHosts?.join('\n')"
                    @update:value="(v: string) => deployConfig.clusterHosts = v.split('\n').filter((d: string) => d.trim())"
                    :rows="4"
                    placeholder="每行一条记录，格式: IP 主机名"
                  />
                  <div class="hint-text">配置集群所有节点的 IP 和主机名映射</div>
                </Form.Item>
              </div>
            </template>
          </Form>
        </div>

        <!-- 步骤5: 执行部署 -->
        <div v-show="currentStep === 4" class="step-panel">
          <Card title="执行部署" :bordered="false">
            <!-- 部署前确认 -->
            <div v-if="!deploying && !deploySuccess && !deployLog" class="deploy-confirm">
              <Alert
                type="info"
                message="部署确认"
                description="点击下方按钮开始部署Hadoop Master。部署过程可能需要5-15分钟，请耐心等待。"
                show-icon
                style="margin-bottom: 16px"
              />

              <Descriptions :column="2" bordered size="small" style="margin-bottom: 16px">
                <Descriptions.Item label="目标主机">{{ masterForm.host }}</Descriptions.Item>
                <Descriptions.Item label="Hadoop版本">{{ deployConfig.hadoopVersion }}</Descriptions.Item>
                <Descriptions.Item label="Java版本">Java {{ deployConfig.javaVersion }}</Descriptions.Item>
                <Descriptions.Item label="部署模式">{{ deployConfig.deployMode === 'ha' ? 'HA 高可用' : '标准' }}</Descriptions.Item>
                <Descriptions.Item label="NameNode 端口">{{ deployConfig.nameNodePort }}</Descriptions.Item>
                <Descriptions.Item label="HDFS Web UI">http://{{ masterForm.host }}:{{ deployConfig.nameNodeHttpPort }}</Descriptions.Item>
                <Descriptions.Item label="YARN Web UI">http://{{ masterForm.host }}:{{ deployConfig.resourceManagerWebPort }}</Descriptions.Item>
                <Descriptions.Item label="YARN 内存">{{ deployConfig.yarnMemory }}MB</Descriptions.Item>
              </Descriptions>

              <div class="deploy-action">
                <Button type="primary" size="large" @click="executeDeploy">
                  <template #icon><RocketOutlined /></template>
                  开始部署
                </Button>
              </div>
            </div>

            <!-- 部署中 -->
            <div v-if="deploying" class="deploying-section">
              <Spin size="large">
                <template #indicator>
                  <LoadingOutlined style="font-size: 48px" spin />
                </template>
              </Spin>
              <p class="deploying-text">正在部署中，请稍候...</p>
            </div>

            <!-- 部署成功 -->
            <div v-if="deploySuccess" class="success-section">
              <Result
                status="success"
                title="部署成功！"
                :sub-title="`Hadoop Master 已成功部署到 ${masterForm.host}`"
              >
                <template #extra>
                  <Space>
                    <Button type="primary" @click="openHdfsWebUI">
                      打开 HDFS Web UI
                    </Button>
                    <Button @click="openYarnWebUI">
                      打开 YARN Web UI
                    </Button>
                    <Button @click="goBack">返回列表</Button>
                  </Space>
                </template>
              </Result>
            </div>

            <!-- 部署失败 -->
            <div v-if="deployFailed && !deploying" class="failed-section">
              <Result
                status="error"
                title="部署失败"
                sub-title="请查看部署日志了解详细错误信息"
              >
                <template #extra>
                  <Space>
                    <Button type="primary" @click="retryDeploy">
                      重新部署
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
        <span v-else></span>
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
  </div>
</template>

<style scoped>
.deploy-master-container {
  padding: 16px;
}

.page-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  margin-left: 16px;
}

.main-card {
  max-width: 1200px;
  margin: 0 auto;
}

.steps-container {
  padding: 0 40px;
  margin-bottom: 24px;
}

.step-content {
  min-height: 400px;
  padding: 0 24px;
}

.step-panel {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.test-section {
  text-align: center;
  padding: 24px;
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

.deploy-confirm {
  max-width: 800px;
  margin: 0 auto;
}

.deploy-action {
  text-align: center;
  margin-top: 24px;
}

.deploying-section {
  text-align: center;
  padding: 48px;
}

.deploying-text {
  margin-top: 16px;
  color: hsl(var(--muted-foreground));
}

.success-section {
  padding: 24px;
}

.log-section {
  margin-top: 24px;
}

.log-container {
  background: #1e1e1e;
  border-radius: 6px;
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
}

.log-container pre {
  color: #d4d4d4;
  margin: 0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

.step-actions {
  display: flex;
  justify-content: space-between;
  padding: 0 24px;
}

.hint-text {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  margin-top: 4px;
}

/* 统一表单样式 */
.unified-form {
  padding: 0 8px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: hsl(var(--foreground));
  padding: 12px 0;
  margin-top: 8px;
  border-bottom: 1px solid hsl(var(--border));
  margin-bottom: 16px;
  display: flex;
  align-items: center;
}

.form-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.form-item-half {
  flex: 1 1 calc(50% - 8px);
  min-width: 200px;
}

.form-item-third {
  flex: 1 1 calc(33.33% - 11px);
  min-width: 180px;
}

.form-item-quarter {
  flex: 1 1 calc(25% - 12px);
  min-width: 160px;
}

@media (max-width: 992px) {
  .form-row {
    flex-direction: column;
  }

  .form-item-half,
  .form-item-third,
  .form-item-quarter {
    flex: 1 1 100%;
  }
}
</style>
