import { smpRequestClient } from '#/api/request';

// ==================== 类型定义 ====================

/**
 * Jenkins Master 实体
 */
export interface JenkinsMaster {
  id?: number;
  uid?: string;
  name: string;
  // SSH连接配置
  host: string;
  port: number;
  username: string;
  password?: string;
  os_type: 'linux' | 'macos' | 'windows';
  // Jenkins配置
  jenkins_port?: number;
  jenkins_home?: string;
  jenkins_version?: string;
  java_version?: string;
  java_opts?: string;
  // 管理员配置
  admin_username?: string;
  admin_password?: string;
  // 凭证配置
  credentials_config?: string;
  // 状态信息
  status?:
    | 'pending'
    | 'deploying'
    | 'deployed'
    | 'failed'
    | 'running'
    | 'stopped';
  initial_password?: string;
  deploy_log?: string;
  last_heartbeat?: string;
  // 资源配置
  region?: string;
  cpu_cores?: number;
  ram_gb?: number;
  disk_gb?: number;
  // 审计字段
  description?: string;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Git凭证
 */
export interface GitCredential {
  id: string;
  description: string;
  username: string;
  password: string;
}

/**
 * Harbor凭证
 */
export interface HarborCredential {
  id: string;
  description: string;
  url: string;
  username: string;
  password: string;
}

/**
 * SSH凭证
 */
export interface SSHCredential {
  id: string;
  description: string;
  username: string;
  privateKey: string;
  passphrase?: string;
}

/**
 * Jenkins Master 部署配置
 */
export interface JenkinsMasterDeployConfig {
  jenkinsVersion: string;
  jenkinsPort: number;
  jenkinsHome: string;
  javaVersion: string;
  javaOpts?: string;
  adminUsername: string;
  adminPassword: string;
  adminEmail?: string;
  installSuggestedPlugins?: boolean;
  additionalPlugins?: string[];
  gitCredentials?: GitCredential[];
  harborCredentials?: HarborCredential[];
  sshCredentials?: SSHCredential[];
  enableCsrf?: boolean;
  enableAgentToMasterSecurity?: boolean;
}

/**
 * 连接测试结果
 */
export interface ConnectionTestResult {
  success: boolean;
  message: string;
  osInfo?: string;
  hostname?: string;
  availableDisk?: string;
  totalMemoryMb?: string;
  detectedOsType?: string;
}

/**
 * 状态检查结果
 */
export interface StatusCheckResult {
  success: boolean;
  isRunning?: boolean;
  isResponding?: boolean;
  status?: string;
  message?: string;
}

// ==================== API 函数 ====================
// 注意: smpRequestClient 配置了 responseReturn: 'data'
// 响应拦截器会自动提取 response.data，因此这里直接返回结果

/**
 * 获取所有Master节点
 */
export const fetchJenkinsMasters = async (): Promise<JenkinsMaster[]> => {
  const data = await smpRequestClient.get<JenkinsMaster[]>(
    '/smp/jenkins-masters',
  );
  return data || [];
};

/**
 * 根据ID获取Master
 */
export const fetchJenkinsMasterById = async (
  id: number,
): Promise<JenkinsMaster> => {
  const data = await smpRequestClient.get<JenkinsMaster>(
    `/smp/jenkins-masters/${id}`,
  );
  return data;
};

/**
 * 根据UID获取Master
 */
export const fetchJenkinsMasterByUid = async (
  uid: string,
): Promise<JenkinsMaster> => {
  const data = await smpRequestClient.get<JenkinsMaster>(
    `/smp/jenkins-masters/uid/${uid}`,
  );
  return data;
};

/**
 * 根据状态获取Master列表
 */
export const fetchJenkinsMastersByStatus = async (
  status: string,
): Promise<JenkinsMaster[]> => {
  const data = await smpRequestClient.get<JenkinsMaster[]>(
    `/smp/jenkins-masters/status/${status}`,
  );
  return data || [];
};

/**
 * 获取已部署的Master列表
 */
export const fetchDeployedMasters = async (): Promise<JenkinsMaster[]> => {
  const data = await smpRequestClient.get<JenkinsMaster[]>(
    '/smp/jenkins-masters/deployed',
  );
  return data || [];
};

/**
 * 创建Master配置
 */
export const createJenkinsMaster = async (
  master: JenkinsMaster,
): Promise<JenkinsMaster> => {
  const data = await smpRequestClient.post<JenkinsMaster>(
    '/smp/jenkins-masters',
    master,
  );
  return data;
};

/**
 * 更新Master配置
 */
export const updateJenkinsMaster = async (
  id: number,
  master: JenkinsMaster,
): Promise<JenkinsMaster> => {
  const data = await smpRequestClient.put<JenkinsMaster>(
    `/smp/jenkins-masters/${id}`,
    master,
  );
  return data;
};

/**
 * 删除Master
 */
export const deleteJenkinsMaster = async (id: number): Promise<void> => {
  await smpRequestClient.delete(`/smp/jenkins-masters/${id}`);
};

/**
 * 测试SSH连接
 */
export const testJenkinsMasterConnection = async (
  master: JenkinsMaster,
): Promise<ConnectionTestResult> => {
  const data = await smpRequestClient.post<ConnectionTestResult>(
    '/smp/jenkins-masters/test-connection',
    master,
  );
  return data;
};

/**
 * 部署Jenkins Master
 */
export const deployJenkinsMaster = async (
  id: number,
  config: JenkinsMasterDeployConfig,
): Promise<{ success: boolean; message: string; masterId: number }> => {
  const data = await smpRequestClient.post<{
    success: boolean;
    message: string;
    masterId: number;
  }>(`/smp/jenkins-masters/${id}/deploy`, config);
  return data;
};

/**
 * 预览部署脚本
 */
export const previewMasterDeployScript = async (
  osType: string,
  config: JenkinsMasterDeployConfig,
): Promise<{ script: string; osType: string }> => {
  const data = await smpRequestClient.post<{ script: string; osType: string }>(
    `/smp/jenkins-masters/preview-script?osType=${osType}`,
    config,
  );
  return data;
};

/**
 * 检查Master状态
 */
export const checkMasterStatus = async (
  id: number,
): Promise<StatusCheckResult> => {
  const data = await smpRequestClient.get<StatusCheckResult>(
    `/smp/jenkins-masters/${id}/status`,
  );
  return data;
};

/**
 * 启动Jenkins
 */
export const startJenkins = async (
  id: number,
): Promise<{ success: boolean; message: string }> => {
  const data = await smpRequestClient.post<{
    success: boolean;
    message: string;
  }>(`/smp/jenkins-masters/${id}/start`);
  return data;
};

/**
 * 停止Jenkins
 */
export const stopJenkins = async (
  id: number,
): Promise<{ success: boolean; message: string }> => {
  const data = await smpRequestClient.post<{
    success: boolean;
    message: string;
  }>(`/smp/jenkins-masters/${id}/stop`);
  return data;
};

/**
 * 重启Jenkins
 */
export const restartJenkins = async (
  id: number,
): Promise<{ success: boolean; message: string }> => {
  const data = await smpRequestClient.post<{
    success: boolean;
    message: string;
  }>(`/smp/jenkins-masters/${id}/restart`);
  return data;
};

/**
 * 获取初始密码
 */
export const getInitialPassword = async (id: number): Promise<string> => {
  const data = await smpRequestClient.get<{ password: string }>(
    `/smp/jenkins-masters/${id}/initial-password`,
  );
  return data?.password;
};

/**
 * 配置凭证
 */
export const configureCredentials = async (
  id: number,
  config: JenkinsMasterDeployConfig,
): Promise<{ success: boolean; message: string }> => {
  const data = await smpRequestClient.post<{
    success: boolean;
    message: string;
  }>(`/smp/jenkins-masters/${id}/credentials`, config);
  return data;
};

/**
 * 在Master上创建Node配置
 */
export const createNodeOnMaster = async (
  masterId: number,
  nodeName: string,
  workDir: string,
  labels?: string,
): Promise<{ success: boolean; nodeName: string; secret?: string }> => {
  const params = new URLSearchParams({ nodeName, workDir });
  if (labels) params.append('labels', labels);

  const data = await smpRequestClient.post<{
    success: boolean;
    nodeName: string;
    secret?: string;
  }>(`/smp/jenkins-masters/${masterId}/create-node?${params.toString()}`);
  return data;
};

/**
 * 获取Node的Secret
 */
export const getNodeSecret = async (
  masterId: number,
  nodeName: string,
): Promise<string> => {
  const data = await smpRequestClient.get<{ secret: string }>(
    `/smp/jenkins-masters/${masterId}/node-secret/${nodeName}`,
  );
  return data?.secret;
};

/**
 * 卸载Jenkins
 */
export const uninstallJenkins = async (
  id: number,
): Promise<{ success: boolean; message: string }> => {
  const data = await smpRequestClient.post<{
    success: boolean;
    message: string;
  }>(`/smp/jenkins-masters/${id}/uninstall`);
  return data;
};

// ==================== 辅助函数 ====================

/**
 * 获取状态文本
 */
export const getStatusText = (status?: string): string => {
  switch (status) {
    case 'pending':
      return '待部署';
    case 'deploying':
      return '部署中';
    case 'deployed':
      return '已部署';
    case 'failed':
      return '部署失败';
    case 'running':
      return '运行中';
    case 'stopped':
      return '已停止';
    default:
      return status || '未知';
  }
};

/**
 * 获取状态颜色
 */
export const getStatusColor = (status?: string): string => {
  switch (status) {
    case 'pending':
      return 'default';
    case 'deploying':
      return 'processing';
    case 'deployed':
      return 'success';
    case 'running':
      return 'success';
    case 'failed':
      return 'error';
    case 'stopped':
      return 'warning';
    default:
      return 'default';
  }
};

/**
 * 获取地域文本
 */
export const getRegionText = (region?: string): string => {
  const regionMap: Record<string, string> = {
    guangzhou: '广州',
    beijing: '北京',
    shanghai: '上海',
    shenzhen: '深圳',
    hangzhou: '杭州',
    nanjing: '南京',
    silicon_valley: '硅谷',
    singapore: '新加坡',
    tokyo: '东京',
    frankfurt: '法兰克福',
  };
  return regionMap[region || ''] || region || '未知';
};

// ==================== Jenkins 版本管理 ====================

/**
 * Jenkins 版本信息
 */
export interface JenkinsVersionInfo {
  id?: number;
  version: string;
  versionType: string;
  releaseDate?: string;
  downloadUrl?: string;
  sha256?: string;
  isLts?: boolean;
  isLatest?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 获取稳定版本列表
 * 注意: smpRequestClient 配置了 responseReturn: 'data'，
 * 当后端返回 {code: 0, data: [...]} 时，拦截器会自动提取 data 字段
 */
export const fetchJenkinsStableVersions = async (): Promise<
  JenkinsVersionInfo[]
> => {
  const data = await smpRequestClient.get<JenkinsVersionInfo[]>(
    '/smp/jenkins-versions/stable',
  );
  return data || [];
};

/**
 * 获取LTS版本列表
 */
export const fetchJenkinsLtsVersions = async (): Promise<
  JenkinsVersionInfo[]
> => {
  const data = await smpRequestClient.get<JenkinsVersionInfo[]>(
    '/smp/jenkins-versions/lts',
  );
  return data || [];
};

/**
 * 刷新版本列表（从镜像站重新获取）
 * 返回同步统计信息
 */
export const refreshJenkinsVersions = async (): Promise<{
  success: boolean;
  count?: number;
  message?: string;
  durationMs?: number;
}> => {
  // 刷新接口返回的data字段包含统计信息
  const data = await smpRequestClient.post<{
    success: boolean;
    count?: number;
    message?: string;
    durationMs?: number;
  }>('/smp/jenkins-versions/refresh');
  return data;
};

/**
 * 获取版本统计信息
 */
export const fetchJenkinsVersionStats = async (): Promise<{
  stableCount: number;
  ltsCount: number;
  latestVersion?: string;
}> => {
  const data = await smpRequestClient.get<{
    stableCount: number;
    ltsCount: number;
    latestVersion?: string;
  }>('/smp/jenkins-versions/stats');
  return data || { stableCount: 0, ltsCount: 0 };
};
