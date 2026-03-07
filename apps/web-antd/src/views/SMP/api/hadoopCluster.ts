import { smpRequestClient } from '#/api/request';

/**
 * Hadoop 集群 API
 */

// 类型定义
export interface HadoopVersion {
  id: number;
  version: string;
  versionType: string;
  releaseDate: string;
  downloadUrl: string;
  isLatest: boolean;
}

export interface HadoopCluster {
  id?: number;
  uid?: string;
  name: string;
  description?: string;
  host: string;
  port: number;
  sshUser: string;
  sshPassword?: string;
  sshPrivateKey?: string;
  hadoopVersion?: string;
  osType?: string;
  nodeType: 'master' | 'node';
  deployMode?: 'standard' | 'ha';
  components?: string | string[];
  hdfsDataDirs?: string | string[];
  hdfsReplication?: number;
  hdfsBlockSize?: number;
  yarnMemory?: number;
  yarnCpu?: number;
  haMasterHost?: string;
  zkCluster?: string;
  status?: string;
  deployLog?: string;
  masterId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface HadoopDeployConfig {
  hadoopVersion: string;
  osType: string;
  deployMode: 'standard' | 'ha';
  javaVersion?: string;
  components: string[];
  hdfsDataDirs: string[];
  hdfsReplication: number;
  hdfsBlockSizeMb: number;
  yarnMemory: number;
  yarnCpu: number;
  // 端口配置
  nameNodePort?: number;
  nameNodeHttpPort?: number;
  dataNodePort?: number;
  secondaryNameNodeHttpPort?: number;
  resourceManagerPort?: number;
  resourceManagerWebPort?: number;
  nodeManagerPort?: number;
  jobHistoryPort?: number;
  jobHistoryWebPort?: number;
  // HA 配置
  haMasterHost?: string;
  haMasterPort?: number;
  haMasterUser?: string;
  haMasterPassword?: string;
  zkCluster?: string;
  jvmOpts?: string;
  masterId?: number;
  timezone?: string;
  // 跨云部署配置
  crossCloudMode?: boolean;
  clusterHosts?: string[];
  nodeHostname?: string;
}

// 连接测试结果
export interface ConnectionTestResult {
  success: boolean;
  message: string;
  output?: string;
  detectedOsType?: string;
}

// 部署结果
export interface DeployResult {
  success: boolean;
  message: string;
  clusterId?: number;
}

// ==================== 版本管理 API ====================

/**
 * 获取所有 Hadoop 版本
 */
export async function getHadoopVersions(): Promise<HadoopVersion[]> {
  return smpRequestClient.get<HadoopVersion[]>('/hadoop/versions');
}

/**
 * 获取稳定版本
 */
export async function getStableVersions(): Promise<HadoopVersion[]> {
  return smpRequestClient.get<HadoopVersion[]>('/hadoop/versions/stable');
}

/**
 * 刷新版本列表（从官网获取）
 */
export async function refreshVersions(): Promise<any> {
  return smpRequestClient.post<any>('/hadoop/versions/refresh');
}

/**
 * 获取版本统计
 */
export async function getVersionStats(): Promise<any> {
  return smpRequestClient.get<any>('/hadoop/versions/stats');
}

// ==================== 集群管理 API ====================

/**
 * 获取所有节点
 */
export async function getAllClusters(): Promise<HadoopCluster[]> {
  return smpRequestClient.get<HadoopCluster[]>('/hadoop');
}

/**
 * 获取所有 Master 节点
 */
export async function getMasters(): Promise<{
  code: number;
  data: HadoopCluster[];
  message: string;
}> {
  return smpRequestClient.get<{
    code: number;
    data: HadoopCluster[];
    message: string;
  }>('/hadoop/masters');
}

/**
 * 获取所有 Node 节点
 */
export async function getNodes(): Promise<{
  code: number;
  data: HadoopCluster[];
  message: string;
}> {
  return smpRequestClient.get<{
    code: number;
    data: HadoopCluster[];
    message: string;
  }>('/hadoop/nodes');
}

/**
 * 根据 ID 获取节点
 */
export async function getClusterById(id: number): Promise<HadoopCluster> {
  return smpRequestClient.get<HadoopCluster>(`/hadoop/${id}`);
}

/**
 * 根据 UID 获取节点
 */
export async function getClusterByUid(uid: string): Promise<HadoopCluster> {
  return smpRequestClient.get<HadoopCluster>(`/hadoop/uid/${uid}`);
}

/**
 * 创建节点
 */
export async function createCluster(
  cluster: HadoopCluster,
): Promise<HadoopCluster> {
  return smpRequestClient.post<HadoopCluster>('/hadoop', cluster);
}

/**
 * 更新节点
 */
export async function updateCluster(
  id: number,
  cluster: HadoopCluster,
): Promise<HadoopCluster> {
  return smpRequestClient.put<HadoopCluster>(`/hadoop/${id}`, cluster);
}

/**
 * 删除节点
 */
export async function deleteCluster(
  id: number,
): Promise<{ code: number; message: string }> {
  return smpRequestClient.delete<{ code: number; message: string }>(
    `/hadoop/${id}`,
  );
}

// ==================== 部署操作 API ====================

/**
 * 测试 SSH 连接
 */
export async function testConnection(
  cluster: Partial<HadoopCluster>,
): Promise<ConnectionTestResult> {
  return smpRequestClient.post<ConnectionTestResult>(
    '/hadoop/test-connection',
    cluster,
  );
}

/**
 * 部署节点
 */
export async function deployCluster(
  id: number,
  config: HadoopDeployConfig,
): Promise<DeployResult> {
  return smpRequestClient.post<DeployResult>(`/hadoop/${id}/deploy`, config);
}

/**
 * 预览部署脚本
 */
export async function previewScript(
  osType: string,
  nodeType: string,
  config: HadoopDeployConfig,
): Promise<{ script: string; osType: string }> {
  return smpRequestClient.post<{ script: string; osType: string }>(
    `/hadoop/preview-script?osType=${osType}&nodeType=${nodeType}`,
    config,
  );
}

// ==================== 状态操作 API ====================

/**
 * 检查节点状态
 */
export async function checkStatus(id: number): Promise<any> {
  return smpRequestClient.get<any>(`/hadoop/${id}/status`);
}

/**
 * 启动 Hadoop 服务
 */
export async function startServices(id: number): Promise<any> {
  return smpRequestClient.post<any>(`/hadoop/${id}/start`);
}

/**
 * 停止 Hadoop 服务
 */
export async function stopServices(id: number): Promise<any> {
  return smpRequestClient.post<any>(`/hadoop/${id}/stop`);
}

/**
 * 重启 Hadoop 服务
 */
export async function restartServices(id: number): Promise<any> {
  return smpRequestClient.post<any>(`/hadoop/${id}/restart`);
}

// ==================== 集群健康 API ====================

/**
 * 获取集群健康状态
 */
export async function getClusterHealth(masterId: number): Promise<any> {
  return smpRequestClient.get<any>(`/hadoop/${masterId}/health`);
}

/**
 * 获取 HDFS 状态
 */
export async function getHdfsStatus(masterId: number): Promise<any> {
  return smpRequestClient.get<any>(`/hadoop/${masterId}/hdfs-status`);
}

/**
 * 获取 YARN 状态
 */
export async function getYarnStatus(masterId: number): Promise<any> {
  return smpRequestClient.get<any>(`/hadoop/${masterId}/yarn-status`);
}
