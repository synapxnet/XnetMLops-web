<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Select,
  Space,
  Switch,
  message,
  Spin,
  Checkbox,
  Radio,
  Alert,
  Tag,
} from 'ant-design-vue';
import {
  SaveOutlined,
  CloseOutlined,
  ApiOutlined,
  CloudServerOutlined,
} from '@ant-design/icons-vue';
import {
  getStableVersions,
  getMasters,
  getClusterById,
  createCluster,
  updateCluster,
  testConnection,
  deployCluster,
  type HadoopCluster,
  type HadoopVersion,
  type HadoopDeployConfig,
} from '../api/hadoopCluster';
import { getOnlineWorkstations, getWorkstationCredentials, type Workstation } from '../api/workstation';

const router = useRouter();
const route = useRoute();

const loading = ref(false);
const testing = ref(false);
const deploying = ref(false);
const isEdit = ref(false);
const editId = ref<number | null>(null);

// 版本列表
const versionList = ref<HadoopVersion[]>([]);
const versionLoading = ref(false);

// Master 列表
const masterList = ref<HadoopCluster[]>([]);
const masterLoading = ref(false);

// 表单数据
const formData = ref<HadoopCluster>({
  name: '',
  host: '',
  port: 22,
  sshUser: 'root',
  sshPassword: '',
  sshPrivateKey: '',
  hadoopVersion: '',
  osType: 'linux',
  nodeType: 'node',
  deployMode: 'standard',
  components: '["hdfs", "yarn"]',
  hdfsDataDirs: '["/data/hadoop/hdfs"]',
  yarnMemory: 8192,
  yarnCpu: 4,
  masterId: undefined,
});

// 部署配置
const deployConfig = ref<HadoopDeployConfig>({
  hadoopVersion: '',
  osType: 'linux',
  deployMode: 'standard',
  components: ['hdfs', 'yarn'],
  hdfsDataDirs: ['/data/hadoop/hdfs'],
  hdfsReplication: 3,
  hdfsBlockSizeMb: 128,
  yarnMemory: 8192,
  yarnCpu: 4,
  masterId: undefined,
  timezone: 'Asia/Shanghai',
  // 跨云部署配置
  crossCloudMode: false,
  clusterHosts: [],
  nodeHostname: '',
});

// 使用密钥认证
const usePrivateKey = ref(false);

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

// 监听工作站选择 - 获取解密后的凭证
watch(selectedWorkstationId, async (newId) => {
  if (newId) {
    const ws = workstationList.value.find(w => w.id === newId);
    if (ws) {
      formData.value.name = formData.value.name || ws.name;
      formData.value.host = ws.ipAddress;
      formData.value.port = ws.sshPort || 22;
      formData.value.sshUser = ws.sshUser;
      formData.value.osType = ws.osType as any;
      usePrivateKey.value = ws.authType === 'privateKey';

      // 设置跨云模式的hostname
      if (ws.hostname) {
        deployConfig.value.nodeHostname = ws.hostname;
      }

      // 获取解密后的凭证
      try {
        const credentials = await getWorkstationCredentials(newId);
        if (credentials.password) {
          formData.value.sshPassword = credentials.password;
        }
        if (credentials.privateKey) {
          formData.value.sshPrivateKey = credentials.privateKey;
        }
      } catch (error) {
        console.error('获取凭证失败:', error);
        message.warning('获取SSH凭证失败，请手动输入密码');
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

// 操作系统选项
const osOptions = [
  { label: 'Linux', value: 'linux' },
  { label: 'macOS', value: 'macos' },
  { label: 'Windows', value: 'windows' },
];

// 组件选项
const componentOptions = [
  { label: 'DataNode (HDFS 数据节点)', value: 'hdfs' },
  { label: 'NodeManager (YARN 计算节点)', value: 'yarn' },
];

// 加载版本列表
async function loadVersions() {
  versionLoading.value = true;
  try {
    const versions = await getStableVersions();
    versionList.value = versions || [];
    if (versionList.value.length > 0 && !formData.value.hadoopVersion) {
      formData.value.hadoopVersion = versionList.value[0].version;
      deployConfig.value.hadoopVersion = versionList.value[0].version;
    }
  } catch (error) {
    console.error('加载版本失败', error);
  } finally {
    versionLoading.value = false;
  }
}

// 加载 Master 列表
async function loadMasters() {
  masterLoading.value = true;
  try {
    const masters = await getMasters();
    masterList.value = masters || [];
  } catch (error) {
    console.error('加载 Master 列表失败', error);
  } finally {
    masterLoading.value = false;
  }
}

// 加载编辑数据
async function loadEditData(id: number) {
  loading.value = true;
  try {
    const data = await getClusterById(id);
    if (data) {
      formData.value = data;
      if (data.components) {
        deployConfig.value.components = JSON.parse(data.components as string);
      }
      if (data.hdfsDataDirs) {
        deployConfig.value.hdfsDataDirs = JSON.parse(data.hdfsDataDirs as string);
      }
      deployConfig.value.hadoopVersion = data.hadoopVersion || '';
      deployConfig.value.osType = data.osType || 'centos7';
      deployConfig.value.yarnMemory = data.yarnMemory || 8192;
      deployConfig.value.yarnCpu = data.yarnCpu || 4;
      deployConfig.value.masterId = data.masterId;
    }
  } catch (error) {
    message.error('加载数据失败');
  } finally {
    loading.value = false;
  }
}

// 测试连接
async function handleTestConnection() {
  testing.value = true;
  try {
    const result = await testConnection({
      host: formData.value.host,
      port: formData.value.port,
      sshUser: formData.value.sshUser,
      sshPassword: usePrivateKey.value ? '' : formData.value.sshPassword,
      sshPrivateKey: usePrivateKey.value ? formData.value.sshPrivateKey : '',
    });
    // smpRequestClient 直接返回 data 内容
    if (result.success) {
      message.success('连接成功');
    } else {
      message.error(result.message || '连接失败');
    }
  } catch (error) {
    message.error('测试连接失败');
  } finally {
    testing.value = false;
  }
}

// 保存配置
async function handleSave() {
  if (!formData.value.masterId) {
    message.error('请选择关联的 Master 节点');
    return;
  }

  loading.value = true;
  try {
    const saveData: HadoopCluster = {
      ...formData.value,
      hadoopVersion: deployConfig.value.hadoopVersion,
      osType: deployConfig.value.osType,
      components: JSON.stringify(deployConfig.value.components),
      hdfsDataDirs: JSON.stringify(deployConfig.value.hdfsDataDirs),
      yarnMemory: deployConfig.value.yarnMemory,
      yarnCpu: deployConfig.value.yarnCpu,
      masterId: formData.value.masterId,
    };

    if (isEdit.value && editId.value) {
      await updateCluster(editId.value, saveData);
      message.success('更新成功');
    } else {
      const created = await createCluster(saveData);
      message.success('创建成功');
      editId.value = created.id || null;
      isEdit.value = true;
    }
  } catch (error) {
    message.error('保存失败');
  } finally {
    loading.value = false;
  }
}

// 保存并部署
async function handleSaveAndDeploy() {
  await handleSave();
  if (editId.value) {
    deploying.value = true;
    try {
      const result = await deployCluster(editId.value, deployConfig.value);
      if (result.success) {
        message.success('部署已启动');
        router.push('/SMP/HadoopDeployment/index');
      } else {
        message.error(result.message || '部署失败');
      }
    } catch (error) {
      message.error('部署失败');
    } finally {
      deploying.value = false;
    }
  }
}

// 返回列表
function handleCancel() {
  router.push('/SMP/HadoopDeployment/index');
}

// 选择 Master 时自动填充版本和生成hosts配置
function handleMasterChange(masterId: number) {
  formData.value.masterId = masterId;
  const master = masterList.value.find((m) => m.id === masterId);
  if (master) {
    formData.value.hadoopVersion = master.hadoopVersion || '';
    deployConfig.value.hadoopVersion = master.hadoopVersion || '';

    // 自动生成hosts配置（如果启用跨云模式）
    if (deployConfig.value.crossCloudMode) {
      generateHostsConfig(master);
    }
  }
}

// 已存在的hosts配置（来自Master）
const existingHosts = ref<string[]>([]);
// 新增的hosts配置（当前节点）
const newHostEntry = ref('');

// 生成hosts配置
function generateHostsConfig(master: HadoopCluster) {
  // 添加Master的hosts配置
  const masterHostEntry = `${master.host} hadoop-master`;
  existingHosts.value = [masterHostEntry];

  // 如果有当前节点信息，生成新增的host条目
  updateNewHostEntry();

  // 合并配置
  mergeHostsConfig();
}

// 更新新增的host条目
function updateNewHostEntry() {
  if (formData.value.host && deployConfig.value.nodeHostname) {
    newHostEntry.value = `${formData.value.host} ${deployConfig.value.nodeHostname}`;
  } else if (formData.value.host) {
    newHostEntry.value = `${formData.value.host} hadoop-node-${Date.now()}`;
  } else {
    newHostEntry.value = '';
  }
}

// 合并hosts配置
function mergeHostsConfig() {
  const allHosts = [...existingHosts.value];
  if (newHostEntry.value && !allHosts.includes(newHostEntry.value)) {
    allHosts.push(newHostEntry.value);
  }
  deployConfig.value.clusterHosts = allHosts;
}

// 监听跨云模式变化
watch(() => deployConfig.value.crossCloudMode, (enabled) => {
  if (enabled && formData.value.masterId) {
    const master = masterList.value.find((m) => m.id === formData.value.masterId);
    if (master) {
      generateHostsConfig(master);
    }
  }
});

// 监听nodeHostname变化，更新新增的host条目
watch(() => deployConfig.value.nodeHostname, () => {
  if (deployConfig.value.crossCloudMode) {
    updateNewHostEntry();
    mergeHostsConfig();
  }
});

// 监听host变化
watch(() => formData.value.host, () => {
  if (deployConfig.value.crossCloudMode) {
    updateNewHostEntry();
    mergeHostsConfig();
  }
});

// 初始化
onMounted(() => {
  loadVersions();
  loadMasters();
  const id = route.query.id as string;
  if (id) {
    isEdit.value = true;
    editId.value = parseInt(id);
    loadEditData(editId.value);
  }
});
</script>

<template>
  <div class="deploy-node-container">
    <Spin :spinning="loading">
      <Card title="部署 Hadoop Node" class="main-card">
        <Form layout="vertical">
          <!-- 基本信息 -->
          <div class="section-title">基本信息</div>
          <div class="form-row">
            <Form.Item label="名称" required class="form-item-half">
              <Input v-model:value="formData.name" placeholder="请输入名称" />
            </Form.Item>
            <Form.Item label="关联 Master 节点" required class="form-item-half">
              <Select
                v-model:value="formData.masterId"
                :loading="masterLoading"
                placeholder="选择 Master 节点"
                @change="handleMasterChange"
              >
                <Select.Option v-for="m in masterList" :key="m.id" :value="m.id">
                  {{ m.name }} ({{ m.host }})
                </Select.Option>
              </Select>
            </Form.Item>
          </div>
          <Form.Item label="描述">
            <Input.TextArea v-model:value="formData.description" placeholder="请输入描述" :rows="2" />
          </Form.Item>

          <!-- SSH 连接配置 -->
          <div class="section-title">SSH 连接配置</div>
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
                    <span v-if="ws.hostname" style="color: #1890ff; margin-left: 8px">
                      [{{ ws.hostname }}]
                    </span>
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
            <template v-if="selectedWorkstationId">
              <div class="form-row">
                <Form.Item label="主机地址" class="form-item-half">
                  <Input :value="formData.host" disabled />
                </Form.Item>
                <Form.Item label="端口" class="form-item-quarter">
                  <InputNumber :value="formData.port" disabled style="width: 100%" />
                </Form.Item>
                <Form.Item label="用户名" class="form-item-quarter">
                  <Input :value="formData.sshUser" disabled />
                </Form.Item>
              </div>
            </template>
          </template>

          <!-- 手动输入模式 -->
          <template v-else>
            <div class="form-row">
              <Form.Item label="主机地址" required class="form-item-half">
                <Input v-model:value="formData.host" placeholder="IP 或域名" />
              </Form.Item>
              <Form.Item label="端口" required class="form-item-quarter">
                <InputNumber v-model:value="formData.port" :min="1" :max="65535" style="width: 100%" />
              </Form.Item>
              <Form.Item label="用户名" required class="form-item-quarter">
                <Input v-model:value="formData.sshUser" placeholder="SSH 用户名" />
              </Form.Item>
            </div>
            <div class="form-row">
              <Form.Item label="认证方式" class="form-item-quarter">
                <Switch v-model:checked="usePrivateKey" checked-children="密钥" un-checked-children="密码" />
              </Form.Item>
              <Form.Item v-if="!usePrivateKey" label="密码" class="form-item-rest">
                <Input.Password v-model:value="formData.sshPassword" placeholder="SSH 密码" />
              </Form.Item>
              <Form.Item v-else label="私钥" class="form-item-rest">
                <Input.TextArea v-model:value="formData.sshPrivateKey" placeholder="SSH 私钥内容" :rows="3" />
              </Form.Item>
            </div>
          </template>

          <Form.Item>
            <Button @click="handleTestConnection" :loading="testing">
              <template #icon><ApiOutlined /></template>
              测试连接
            </Button>
          </Form.Item>

          <!-- Hadoop 配置 -->
          <div class="section-title">Hadoop 配置</div>
          <div class="form-row">
            <Form.Item label="Hadoop 版本" class="form-item-third">
              <Select
                v-model:value="deployConfig.hadoopVersion"
                :loading="versionLoading"
                placeholder="选择版本"
              >
                <Select.Option v-for="v in versionList" :key="v.version" :value="v.version">
                  {{ v.version }}
                </Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="操作系统" required class="form-item-third">
              <Select v-model:value="deployConfig.osType" placeholder="选择操作系统">
                <Select.Option v-for="os in osOptions" :key="os.value" :value="os.value">
                  {{ os.label }}
                </Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="组件" class="form-item-third">
              <Checkbox.Group v-model:value="deployConfig.components" :options="componentOptions" />
            </Form.Item>
          </div>

          <!-- 资源配置 -->
          <div class="section-title">资源配置</div>
          <div class="form-row">
            <Form.Item label="NodeManager 内存 (MB)" class="form-item-half">
              <InputNumber v-model:value="deployConfig.yarnMemory" :min="1024" :step="1024" style="width: 100%" />
            </Form.Item>
            <Form.Item label="CPU 核数" class="form-item-half">
              <InputNumber v-model:value="deployConfig.yarnCpu" :min="1" :max="64" style="width: 100%" />
            </Form.Item>
          </div>

          <!-- 跨云部署配置 -->
          <div class="section-title">
            跨云/跨地域部署配置
            <Switch v-model:checked="deployConfig.crossCloudMode" style="margin-left: 12px" />
            <span style="margin-left: 8px; font-weight: normal; font-size: 13px; color: #666">
              {{ deployConfig.crossCloudMode ? '已启用' : '未启用' }}
            </span>
          </div>
          <template v-if="deployConfig.crossCloudMode">
            <Alert
              type="info"
              style="margin-bottom: 16px"
            >
              <template #message>
                当 Hadoop 集群节点分布在不同云厂商或不同地域时，需要启用跨云模式，确保 DataNode 能正确与 NameNode 通信。
              </template>
            </Alert>
            <div class="form-row">
              <Form.Item label="当前节点主机名" required class="form-item-half">
                <Input
                  v-model:value="deployConfig.nodeHostname"
                  placeholder="如: hadoop-node1"
                />
                <div class="hint-text">用于 Hadoop 配置的主机名，需与 Master 配置中的 hosts 一致</div>
              </Form.Item>
              <Form.Item label="集群 Hosts 配置" required class="form-item-half">
                <div class="hosts-preview">
                  <div v-if="existingHosts.length > 0" class="hosts-line">
                    <Tag color="blue" size="small">Master</Tag>
                    <span v-for="(host, index) in existingHosts" :key="'existing-' + index">{{ host }}</span>
                  </div>
                  <div v-if="newHostEntry" class="hosts-line hosts-line-new">
                    <Tag color="green" size="small">新增</Tag>
                    <span>{{ newHostEntry }}</span>
                  </div>
                </div>
              </Form.Item>
            </div>
            <Form.Item label="完整 Hosts 配置（可编辑）">
              <Input.TextArea
                :value="deployConfig.clusterHosts?.join('\n')"
                @update:value="(v: string) => deployConfig.clusterHosts = v.split('\n').filter((d: string) => d.trim())"
                :rows="4"
                placeholder="每行一条记录，格式: IP 主机名"
              />
            </Form.Item>
          </template>
        </Form>

        <!-- 底部操作按钮 -->
        <div class="form-actions">
          <Button @click="handleCancel">
            <template #icon><CloseOutlined /></template>
            取消
          </Button>
          <Button type="primary" @click="handleSave" :loading="loading">
            <template #icon><SaveOutlined /></template>
            保存配置
          </Button>
          <Button type="primary" @click="handleSaveAndDeploy" :loading="deploying">
            <template #icon><CloudServerOutlined /></template>
            保存并部署
          </Button>
        </div>
      </Card>
    </Spin>
  </div>
</template>

<style scoped>
.deploy-node-container {
  padding: 16px;
}

.main-card {
  max-width: 1000px;
  margin: 0 auto;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  padding: 12px 0;
  margin-top: 8px;
  border-bottom: 1px solid #f0f0f0;
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
  flex: 0 0 150px;
}

.form-item-rest {
  flex: 1;
  min-width: 200px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 24px;
  margin-top: 24px;
  border-top: 1px solid #f0f0f0;
}

.hint-text {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

/* Hosts 预览样式 */
.hosts-preview {
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  padding: 8px 12px;
}

.hosts-line {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
}

.hosts-line-new {
  color: #52c41a;
  font-weight: 500;
}

@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
  }

  .form-item-half,
  .form-item-third,
  .form-item-quarter,
  .form-item-rest {
    flex: 1 1 100%;
  }
}
</style>
