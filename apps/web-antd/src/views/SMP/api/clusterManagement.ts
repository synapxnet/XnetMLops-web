import { smpRequestClient } from '#/api/request';

/**
 * 统一集群管理 API
 * 支持 Hadoop、Jenkins，预留 Redis/MySQL/Spark 扩展
 */

// ==================== 类型定义 ====================

/** 集群类型 */
export type ClusterType = 'hadoop' | 'jenkins' | 'mysql' | 'redis' | 'spark';

/** 节点角色 */
export type NodeRole = 'master' | 'worker';

/** 节点状态 */
export type NodeStatus = 'created' | 'deploying' | 'deployed' | 'running' | 'stopped' | 'failed';

/** 统一节点接口 */
export interface ClusterNode {
  id: number;
  uid: string;
  name: string;
  host: string;
  port: number;
  status: NodeStatus;
  role: NodeRole;
  clusterType: ClusterType;
  masterId?: number;
  masterHost?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  extra?: Record<string, any>;
}

/** 集群统计信息 */
export interface ClusterStats {
  totalNodes: number;
  runningNodes: number;
  stoppedNodes: number;
  failedNodes: number;
}

/** 集群拓扑数据 */
export interface ClusterTopology {
  clusterType: ClusterType;
  masters: ClusterNode[];
  workers: ClusterNode[];
  stats: ClusterStats;
  message?: string;
}

/** Hosts 同步请求 */
export interface HostsSyncRequest {
  clusterType: ClusterType;
  masterId: number;
  hostsEntries?: string[];
}

/** Hosts 同步结果 */
export interface HostsSyncResult {
  success: boolean;
  message: string;
  syncedNodes: number;
  totalNodes?: number;
  failedNodes: string[];
}

/** 集群健康状态 */
export interface ClusterHealth {
  clusterType: ClusterType;
  masterId: number;
  status: 'healthy' | 'unhealthy' | 'unknown' | 'error';
  masterStatus?: string;
  masterHost?: string;
  totalNodes?: number;
  runningNodes?: number;
  message?: string;
  [key: string]: any;
}

/** 集群类型配置 */
export interface ClusterTypeConfig {
  type: ClusterType;
  name: string;
  icon: string;
  color: string;
  enabled: boolean;
}

// ==================== API 函数 ====================

/**
 * 获取集群拓扑数据
 */
export async function getClusterTopology(clusterType: ClusterType): Promise<ClusterTopology> {
  const response = await smpRequestClient.get<any>(`/cluster/${clusterType}/topology`);
  return response.data || response;
}

/**
 * 获取所有集群类型的概览统计
 */
export async function getAllClustersOverview(): Promise<Record<ClusterType, ClusterTopology>> {
  const response = await smpRequestClient.get<any>('/cluster/overview');
  return response.data || response;
}

/**
 * 同步 Hosts 配置到集群所有节点
 */
export async function syncHostsToCluster(request: HostsSyncRequest): Promise<HostsSyncResult> {
  const response = await smpRequestClient.post<any>('/cluster/sync-hosts', request);
  return response.data || response;
}

/**
 * 获取集群健康状态
 */
export async function getClusterHealth(clusterType: ClusterType, masterId: number): Promise<ClusterHealth> {
  const response = await smpRequestClient.get<any>(`/cluster/${clusterType}/${masterId}/health`);
  return response.data || response;
}

/**
 * 获取支持的集群类型列表
 */
export async function getSupportedClusterTypes(): Promise<ClusterTypeConfig[]> {
  const response = await smpRequestClient.get<any>('/cluster/types');
  return response.data || response;
}

// ==================== 集群类型配置（前端静态） ====================

/** 已注册的集群类型配置 */
export const registeredClusterTypes: ClusterTypeConfig[] = [
  {
    type: 'hadoop',
    name: 'Hadoop',
    icon: 'logos:hadoop',
    color: '#FFB347',
    enabled: true,
  },
  {
    type: 'jenkins',
    name: 'Jenkins',
    icon: 'logos:jenkins',
    color: '#D33833',
    enabled: true,
  },
  {
    type: 'redis',
    name: 'Redis',
    icon: 'logos:redis',
    color: '#DC382D',
    enabled: false,
  },
  {
    type: 'mysql',
    name: 'MySQL',
    icon: 'logos:mysql',
    color: '#00758F',
    enabled: false,
  },
  {
    type: 'spark',
    name: 'Spark',
    icon: 'logos:apache-spark',
    color: '#E25A1C',
    enabled: false,
  },
];

/**
 * 获取集群类型配置
 */
export function getClusterTypeConfig(type: ClusterType): ClusterTypeConfig | undefined {
  return registeredClusterTypes.find(c => c.type === type);
}

/**
 * 获取节点状态显示文本
 */
export function getStatusText(status?: NodeStatus): string {
  const statusMap: Record<NodeStatus, string> = {
    created: '已创建',
    deploying: '部署中',
    deployed: '已部署',
    running: '运行中',
    stopped: '已停止',
    failed: '失败',
  };
  return status ? statusMap[status] || status : '未知';
}

/**
 * 获取节点状态颜色
 */
export function getStatusColor(status?: NodeStatus): string {
  const colorMap: Record<NodeStatus, string> = {
    created: '#d9d9d9',
    deploying: '#722ed1',
    deployed: '#1890ff',
    running: '#52c41a',
    stopped: '#faad14',
    failed: '#ff4d4f',
  };
  return status ? colorMap[status] || '#d9d9d9' : '#d9d9d9';
}
