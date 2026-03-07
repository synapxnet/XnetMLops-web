import { smpRequestClient } from '#/api/request';

/**
 * 资源规格配置
 */
export interface ResourceSpec {
  id: string;
  name: string;
  resourceType: 'cpu' | 'single_gpu' | 'multi_gpu';
  cpu: number;
  ram: number;
  gpu?: number;
  gpuModel?: string;
  gpuCount?: number;
  description?: string;
}

/**
 * Jenkins节点配置
 */
export interface JenkinsNode {
  id?: number;
  uid?: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  os_type: 'linux' | 'macos' | 'windows';
  region?: string;
  container_type?: 'cce' | 'docker';
  resource_type?: 'cpu' | 'single_gpu' | 'multi_gpu';
  resource_spec?: string;
  cpu_cores?: number;
  ram_gb?: number;
  gpu_memory?: number;
  gpu_model?: string;
  gpu_count?: number;
  status?: 'pending' | 'deploying' | 'deployed' | 'failed' | 'offline';
  jenkins_url?: string;
  agent_name?: string;
  work_dir?: string;
  java_version?: string;
  python_version?: string;
  agent_version?: string;
  labels?: string;
  description?: string;
  deploy_log?: string;
  last_heartbeat?: string;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * 预定义的资源规格列表
 */
export const resourceSpecOptions: ResourceSpec[] = [
  // CPU 类型
  {
    id: 'cpu-2c-128g',
    name: 'CPU 基础型',
    resourceType: 'cpu',
    cpu: 2,
    ram: 128,
    description: '适用于轻量级任务',
  },
  {
    id: 'cpu-4c-256g',
    name: 'CPU 标准型',
    resourceType: 'cpu',
    cpu: 4,
    ram: 256,
    description: '适用于中等计算任务',
  },
  {
    id: 'cpu-8c-512g',
    name: 'CPU 高配型',
    resourceType: 'cpu',
    cpu: 8,
    ram: 512,
    description: '适用于大规模数据处理',
  },
  // 单卡 GPU 类型
  {
    id: 'gpu-single-rtx4060ti',
    name: 'RTX 4060 Ti 单卡',
    resourceType: 'single_gpu',
    cpu: 2,
    ram: 128,
    gpu: 16,
    gpuModel: 'RTX 4060 Ti',
    gpuCount: 1,
    description: '适用于模型训练和推理',
  },
  {
    id: 'gpu-single-rtx4090',
    name: 'RTX 4090 单卡',
    resourceType: 'single_gpu',
    cpu: 4,
    ram: 256,
    gpu: 24,
    gpuModel: 'RTX 4090',
    gpuCount: 1,
    description: '高性能单卡训练',
  },
  {
    id: 'gpu-single-a100',
    name: 'A100 单卡',
    resourceType: 'single_gpu',
    cpu: 8,
    ram: 512,
    gpu: 80,
    gpuModel: 'NVIDIA A100',
    gpuCount: 1,
    description: '专业级AI训练',
  },
  // 多卡 GPU 类型
  {
    id: 'gpu-multi-2x-rtx4060ti',
    name: 'RTX 4060 Ti 双卡',
    resourceType: 'multi_gpu',
    cpu: 2,
    ram: 128,
    gpu: 32,
    gpuModel: 'RTX 4060 Ti',
    gpuCount: 2,
    description: '2 x RTX 4060 Ti 分布式训练',
  },
  {
    id: 'gpu-multi-4x-rtx4090',
    name: 'RTX 4090 四卡',
    resourceType: 'multi_gpu',
    cpu: 8,
    ram: 512,
    gpu: 96,
    gpuModel: 'RTX 4090',
    gpuCount: 4,
    description: '4 x RTX 4090 大规模并行训练',
  },
  {
    id: 'gpu-multi-8x-a100',
    name: 'A100 八卡',
    resourceType: 'multi_gpu',
    cpu: 16,
    ram: 1024,
    gpu: 640,
    gpuModel: 'NVIDIA A100',
    gpuCount: 8,
    description: '8 x A100 企业级训练集群',
  },
];

/**
 * 获取资源类型的显示文本
 */
export const getResourceTypeText = (type?: string): string => {
  switch (type) {
    case 'cpu':
      return 'CPU';
    case 'single_gpu':
      return '单卡GPU';
    case 'multi_gpu':
      return '多卡GPU';
    default:
      return '未知';
  }
};

/**
 * 获取容器类型的显示文本
 */
export const getContainerTypeText = (type?: string): string => {
  switch (type) {
    case 'cce':
      return 'CCE';
    case 'docker':
      return 'Docker';
    default:
      return '未知';
  }
};

/**
 * 获取地域的显示文本
 */
export const getRegionText = (region?: string): string => {
  switch (region) {
    case 'guangzhou':
      return '广州';
    case 'beijing':
      return '北京';
    case 'shanghai':
      return '上海';
    case 'shenzhen':
      return '深圳';
    case 'hangzhou':
      return '杭州';
    case 'nanjing':
      return '南京';
    case 'silicon_valley':
      return '硅谷';
    case 'singapore':
      return '新加坡';
    case 'tokyo':
      return '东京';
    case 'frankfurt':
      return '法兰克福';
    default:
      return region || '未知';
  }
};

/**
 * 部署配置
 */
export interface JenkinsNodeDeployConfig {
  jenkinsUrl: string;
  agentName: string;
  workDir: string;
  javaVersion: string;
  pythonVersion: string;
  agentVersion: string;
  labels?: string;
  jenkinsSecret?: string;
  installDocker?: boolean;
  installGit?: boolean;
  installMaven?: boolean;
  mavenVersion?: string;
  installNode?: boolean;
  nodeVersion?: string;
  useDomesticMirror?: boolean; // 是否使用国内镜像源
}

/**
 * 获取所有节点
 */
export const fetchJenkinsNodes = async (): Promise<JenkinsNode[]> => {
  const response = await smpRequestClient.get('/smp/jenkins-nodes');
  // 后端返回格式: { code, message, data, error }
  if (response.data && Array.isArray(response.data)) {
    return response.data;
  }
  if (response && Array.isArray(response)) {
    return response;
  }
  return [];
};

/**
 * 根据ID获取节点
 */
export const fetchJenkinsNodeById = async (
  id: number,
): Promise<JenkinsNode> => {
  const response = await smpRequestClient.get(`/smp/jenkins-nodes/${id}`);
  // 后端返回格式: { code, message, data, error }
  return response.data || response;
};

/**
 * 根据UID获取节点
 */
export const fetchJenkinsNodeByUid = async (
  uid: string,
): Promise<JenkinsNode> => {
  const response = await smpRequestClient.get(`/smp/jenkins-nodes/uid/${uid}`);
  return response.data || response;
};

/**
 * 根据状态获取节点
 */
export const fetchJenkinsNodesByStatus = async (
  status: string,
): Promise<JenkinsNode[]> => {
  const response = await smpRequestClient.get(
    `/smp/jenkins-nodes/status/${status}`,
  );
  return response.data || response;
};

/**
 * 创建节点
 */
export const createJenkinsNode = async (
  node: JenkinsNode,
): Promise<JenkinsNode> => {
  const response = await smpRequestClient.post('/smp/jenkins-nodes', node);
  return response.data || response;
};

/**
 * 更新节点
 */
export const updateJenkinsNode = async (
  id: number,
  node: JenkinsNode,
): Promise<JenkinsNode> => {
  const response = await smpRequestClient.put(`/smp/jenkins-nodes/${id}`, node);
  return response.data || response;
};

/**
 * 删除节点
 */
export const deleteJenkinsNode = async (id: number): Promise<void> => {
  await smpRequestClient.delete(`/smp/jenkins-nodes/${id}`);
};

/**
 * 测试SSH连接
 */
export const testJenkinsNodeConnection = async (
  node: JenkinsNode,
): Promise<{
  success: boolean;
  message: string;
  osInfo?: string;
  hostname?: string;
  detectedOsType?: string;
}> => {
  const response = await smpRequestClient.post(
    '/smp/jenkins-nodes/test-connection',
    node,
  );
  return response.data || response;
};

/**
 * 部署节点
 */
export const deployJenkinsNode = async (
  id: number,
  config: JenkinsNodeDeployConfig,
): Promise<{
  success: boolean;
  message: string;
  nodeId: number;
}> => {
  const response = await smpRequestClient.post(
    `/smp/jenkins-nodes/${id}/deploy`,
    config,
  );
  // 后端返回格式: { code, message, data: { success, message, nodeId }, error }
  const data = response.data || response;
  return {
    success: data.success !== false,
    message: data.message || '',
    nodeId: data.nodeId || id,
  };
};

/**
 * 预览部署脚本
 */
export const previewDeployScript = async (
  osType: string,
  config: JenkinsNodeDeployConfig,
): Promise<{
  script: string;
}> => {
  const response = await smpRequestClient.post(
    `/smp/jenkins-nodes/preview-script?osType=${osType}`,
    config,
  );
  return response.data || response;
};

/**
 * 检查节点状态
 */
export const checkJenkinsNodeStatus = async (
  id: number,
): Promise<{
  success: boolean;
  isRunning: boolean;
  status: string;
  processInfo?: string;
}> => {
  const response = await smpRequestClient.get(
    `/smp/jenkins-nodes/${id}/status`,
  );
  return response.data || response;
};

/**
 * 停止Agent
 */
export const stopJenkinsAgent = async (
  id: number,
): Promise<{
  success: boolean;
  message: string;
}> => {
  const response = await smpRequestClient.post(`/smp/jenkins-nodes/${id}/stop`);
  return response.data || response;
};

/**
 * 启动Agent
 */
export const startJenkinsAgent = async (
  id: number,
): Promise<{
  success: boolean;
  message: string;
}> => {
  const response = await smpRequestClient.post(
    `/smp/jenkins-nodes/${id}/start`,
  );
  return response.data || response;
};

/**
 * 卸载Agent
 */
export const uninstallJenkinsAgent = async (
  id: number,
): Promise<{
  success: boolean;
  message: string;
}> => {
  const response = await smpRequestClient.post(
    `/smp/jenkins-nodes/${id}/uninstall`,
  );
  return response.data || response;
};

/**
 * 状态颜色映射
 */
export const getStatusColor = (status?: string): string => {
  switch (status) {
    case 'deployed':
      return 'green';
    case 'deploying':
      return 'blue';
    case 'pending':
      return 'orange';
    case 'failed':
      return 'red';
    case 'offline':
      return 'gray';
    default:
      return 'default';
  }
};

/**
 * 状态文本映射
 */
export const getStatusText = (status?: string): string => {
  switch (status) {
    case 'deployed':
      return '已部署';
    case 'deploying':
      return '部署中';
    case 'pending':
      return '待部署';
    case 'failed':
      return '部署失败';
    case 'offline':
      return '离线';
    default:
      return '未知';
  }
};

/**
 * 操作系统图标映射
 */
export const getOsIcon = (osType?: string): string => {
  switch (osType) {
    case 'linux':
      return 'mdi:linux';
    case 'macos':
      return 'mdi:apple';
    case 'windows':
      return 'mdi:microsoft-windows';
    default:
      return 'mdi:desktop-classic';
  }
};

/**
 * 操作系统文本映射
 */
export const getOsText = (osType?: string): string => {
  switch (osType) {
    case 'linux':
      return 'Linux';
    case 'macos':
      return 'macOS';
    case 'windows':
      return 'Windows';
    default:
      return '未知';
  }
};
