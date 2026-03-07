import { smpRequestClient } from '#/api/request';

/**
 * 工作站点 API
 */
export interface Workstation {
  id?: number;
  uid?: string;
  name: string;
  hostname?: string;
  hostnameMode?: 'auto' | 'custom';
  vendor: string;
  serverType: string;
  region: string;
  osType: string;
  osVersion: string;
  cpuCores?: number;
  ramGb?: number;
  diskGb?: number;
  hasGpu?: boolean;
  gpuCount?: number;
  gpuType?: 'single_gpu' | 'multi_gpu';
  gpuModel?: string;
  gpuMemory?: number;
  availableDiskGb?: number;
  availableRamGb?: number;
  domain?: string;
  ipAddress: string;
  sshPort?: number;
  sshUser: string;
  authType: 'password' | 'privateKey';
  password?: string;
  privateKey?: string;
  status?: string;
  lastHeartbeat?: string;
  lastCheckResult?: string;
  description?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  cpuCores?: number;
  ramGb?: number;
  diskGb?: number;
  availableDiskGb?: number;
  availableRamGb?: number;
  hostname?: string;
  osInfo?: string;
  hasGpu?: boolean;
  gpuCount?: number;
  gpuType?: string;
  gpuModel?: string;
  gpuMemory?: number;
}

export interface OptionItem {
  value: string;
  label: string;
}

/**
 * 获取所有工作站点
 */
export const getWorkstations = async (): Promise<Workstation[]> => {
  const response = await smpRequestClient.get('/smp/workstations');
  return response.data || response;
};

/**
 * 根据ID获取工作站点
 */
export const getWorkstationById = async (id: number): Promise<Workstation> => {
  const response = await smpRequestClient.get(`/smp/workstations/${id}`);
  return response.data || response;
};

/**
 * 根据UID获取工作站点
 */
export const getWorkstationByUid = async (
  uid: string,
): Promise<Workstation> => {
  const response = await smpRequestClient.get(`/smp/workstations/uid/${uid}`);
  return response.data || response;
};

/**
 * 测试SSH连接
 */
export const testConnection = async (
  workstation: Workstation,
): Promise<TestConnectionResult> => {
  const response = await smpRequestClient.post(
    '/smp/workstations/test',
    workstation,
  );
  return response.data || response;
};

/**
 * 创建工作站点
 */
export const createWorkstation = async (
  workstation: Workstation,
): Promise<Workstation> => {
  const response = await smpRequestClient.post(
    '/smp/workstations',
    workstation,
  );
  return response.data || response;
};

/**
 * 更新工作站点
 */
export const updateWorkstation = async (
  id: number,
  workstation: Workstation,
): Promise<Workstation> => {
  const response = await smpRequestClient.put(
    `/smp/workstations/${id}`,
    workstation,
  );
  return response.data || response;
};

/**
 * 删除工作站点
 */
export const deleteWorkstation = async (id: number): Promise<void> => {
  await smpRequestClient.delete(`/smp/workstations/${id}`);
};

/**
 * 检查服务器状态
 */
export const checkWorkstationStatus = async (
  id: number,
): Promise<TestConnectionResult> => {
  const response = await smpRequestClient.post(`/smp/workstations/${id}/check`);
  return response.data || response;
};

/**
 * 检查名称是否存在
 */
export const checkNameExists = async (
  name: string,
): Promise<{ exists: boolean }> => {
  const response = await smpRequestClient.get('/smp/workstations/check-name', {
    params: { name },
  });
  return response.data || response;
};

/**
 * 检查主机名是否存在
 */
export const checkHostnameExists = async (
  hostname: string,
): Promise<{ exists: boolean }> => {
  const response = await smpRequestClient.get(
    '/smp/workstations/check-hostname',
    {
      params: { hostname },
    },
  );
  return response.data || response;
};

/**
 * 获取在线的工作站点（用于选择器）
 */
export const getOnlineWorkstations = async (): Promise<Workstation[]> => {
  const response = await smpRequestClient.get('/smp/workstations/online');
  return response.data || response;
};

/**
 * SSH凭证信息
 */
export interface WorkstationCredentials {
  id: number;
  ipAddress: string;
  sshPort: number;
  sshUser: string;
  authType: 'password' | 'privateKey';
  password?: string;
  privateKey?: string;
  hostname?: string;
  osType?: string;
}

/**
 * 获取工作站点的SSH凭证（解密后的密码）
 * 用于部署模块进行SSH连接
 */
export const getWorkstationCredentials = async (
  id: number,
): Promise<WorkstationCredentials> => {
  const response = await smpRequestClient.get(
    `/smp/workstations/${id}/credentials`,
  );
  return response.data || response;
};

/**
 * 获取厂商选项
 */
export const getVendorOptions = async (): Promise<OptionItem[]> => {
  const response = await smpRequestClient.get(
    '/smp/workstations/options/vendors',
  );
  return response.data || response;
};

/**
 * 获取服务器类型选项
 */
export const getServerTypeOptions = async (): Promise<OptionItem[]> => {
  const response = await smpRequestClient.get(
    '/smp/workstations/options/server-types',
  );
  return response.data || response;
};

/**
 * 获取地域选项
 */
export const getRegionOptions = async (): Promise<OptionItem[]> => {
  const response = await smpRequestClient.get(
    '/smp/workstations/options/regions',
  );
  return response.data || response;
};

/**
 * 获取操作系统类型选项
 */
export const getOsTypeOptions = async (): Promise<OptionItem[]> => {
  const response = await smpRequestClient.get(
    '/smp/workstations/options/os-types',
  );
  return response.data || response;
};

/**
 * 获取操作系统版本选项
 */
export const getOsVersionOptions = async (
  osType?: string,
): Promise<OptionItem[]> => {
  const response = await smpRequestClient.get(
    '/smp/workstations/options/os-versions',
    {
      params: { osType },
    },
  );
  return response.data || response;
};
