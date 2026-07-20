import type { ApiResponse } from './types';

import { smpRequestClient } from '#/api/request';

/**
 * 算法实体
 */
export interface Algorithm {
  id?: number;
  uid?: string;
  url: string;
  encrypted_token?: string;
  algorithm: string;
  algorithm_version: string;
  description?: string;
  tenant_uid?: string;
  dept_uid?: string;
  team_uid: string;
  authorized_tenants: string;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;

  // 关联信息（非数据库字段）
  tenant_name?: string;
  dept_name?: string;
  team_name?: string;
}

/**
 * 算法查询参数
 */
export interface AlgorithmQueryParams {
  tenantUid?: string;
  deptUid?: string;
  teamUid?: string;
  algorithm?: string;
  version?: string;
}

/**
 * 获取所有算法配置
 * @returns 包含算法列表的API响应
 */
export function getAlgorithmConfig(): Promise<ApiResponse<Algorithm[]>> {
  return smpRequestClient.get('/smp/algorithms');
}

/**
 * 创建算法配置
 * @param algorithmData 算法数据
 * @returns 包含新创建算法的API响应
 */
export function createAlgorithmConfig(
  algorithmData: Algorithm,
): Promise<ApiResponse<Algorithm>> {
  return smpRequestClient.post('/smp/algorithms', algorithmData);
}

/**
 * 更新算法配置
 * @param id 算法ID
 * @param algorithmData 算法数据
 * @returns 包含更新后的算法的API响应
 */
export function updateAlgorithmConfig(
  id: number,
  algorithmData: Algorithm,
): Promise<ApiResponse<Algorithm>> {
  return smpRequestClient.put(`/smp/algorithms/${id}`, algorithmData);
}

/**
 * 删除算法配置
 * @param id 算法ID
 * @returns 空响应
 */
export function deleteAlgorithmConfig(id: number): Promise<ApiResponse<void>> {
  return smpRequestClient.delete(`/smp/algorithms/${id}`);
}

/**
 * 根据UID删除算法配置
 * @param uid 算法UID
 * @returns 空响应
 */
export function deleteAlgorithmByUid(uid: string): Promise<ApiResponse<void>> {
  return smpRequestClient.delete(`/smp/algorithms/uid/${uid}`);
}

/**
 * 获取单个算法详情
 * @param id 算法ID
 * @returns 包含算法详情的API响应
 */
export function getSingleAlgorithmConfig(
  id: number,
): Promise<ApiResponse<Algorithm>> {
  return smpRequestClient.get(`/smp/algorithms/${id}`);
}

/**
 * 根据UID获取算法详情
 * @param uid 算法UID
 * @returns 包含算法详情的API响应
 */
export function getAlgorithmByUid(
  uid: string,
): Promise<ApiResponse<Algorithm>> {
  return smpRequestClient.get(`/smp/algorithms/uid/${uid}`);
}
