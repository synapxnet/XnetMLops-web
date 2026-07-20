import type { ApiResponse } from './types';

import { smpRequestClient } from '#/api/request';

/**
 * 特征算子实体
 */
export interface FeatureOperator {
  id?: number;
  uid?: string;
  url: string;
  encrypted_token?: string;
  operator_name: string;
  operator_code: string;
  operator_version: string;
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
 * 特征算子查询参数
 */
export interface FeatureOperatorQueryParams {
  tenantUid?: string;
  deptUid?: string;
  teamUid?: string;
  operatorName?: string;
  operatorCode?: string;
  version?: string;
}

/**
 * 获取所有特征算子配置
 * @returns 包含特征算子列表的API响应
 */
export function getFeatureOperatorConfig(): Promise<
  ApiResponse<FeatureOperator[]>
> {
  return smpRequestClient.get('/smp/feature-operators');
}

/**
 * 获取启用的特征算子（用于下拉选择）
 * @returns 包含特征算子列表的API响应
 */
export function getEnabledFeatureOperators(): Promise<
  ApiResponse<FeatureOperator[]>
> {
  return smpRequestClient.get('/smp/feature-operators/enabled');
}

/**
 * 创建特征算子配置
 * @param data 特征算子数据
 * @returns 包含新创建特征算子的API响应
 */
export function createFeatureOperatorConfig(
  data: FeatureOperator,
): Promise<ApiResponse<FeatureOperator>> {
  return smpRequestClient.post('/smp/feature-operators', data);
}

/**
 * 更新特征算子配置
 * @param id 特征算子ID
 * @param data 特征算子数据
 * @returns 包含更新后的特征算子的API响应
 */
export function updateFeatureOperatorConfig(
  id: number,
  data: FeatureOperator,
): Promise<ApiResponse<FeatureOperator>> {
  return smpRequestClient.put(`/smp/feature-operators/${id}`, data);
}

/**
 * 删除特征算子配置
 * @param id 特征算子ID
 * @returns 空响应
 */
export function deleteFeatureOperatorConfig(
  id: number,
): Promise<ApiResponse<void>> {
  return smpRequestClient.delete(`/smp/feature-operators/${id}`);
}

/**
 * 根据UID删除特征算子配置
 * @param uid 特征算子UID
 * @returns 空响应
 */
export function deleteFeatureOperatorByUid(
  uid: string,
): Promise<ApiResponse<void>> {
  return smpRequestClient.delete(`/smp/feature-operators/uid/${uid}`);
}

/**
 * 获取单个特征算子详情
 * @param id 特征算子ID
 * @returns 包含特征算子详情的API响应
 */
export function getSingleFeatureOperatorConfig(
  id: number,
): Promise<ApiResponse<FeatureOperator>> {
  return smpRequestClient.get(`/smp/feature-operators/${id}`);
}

/**
 * 根据UID获取特征算子详情
 * @param uid 特征算子UID
 * @returns 包含特征算子详情的API响应
 */
export function getFeatureOperatorByUid(
  uid: string,
): Promise<ApiResponse<FeatureOperator>> {
  return smpRequestClient.get(`/smp/feature-operators/uid/${uid}`);
}

/**
 * 根据算子代码获取特征算子
 * @param code 算子代码
 * @returns 包含特征算子列表的API响应
 */
export function getFeatureOperatorsByCode(
  code: string,
): Promise<ApiResponse<FeatureOperator[]>> {
  return smpRequestClient.get(`/smp/feature-operators/code/${code}`);
}
