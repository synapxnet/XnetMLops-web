import type { ApiResponse, BucketItem } from './types';

import { smpRequestClient } from '#/api/request';

/**
 * 获取所有存储桶配置
 * @returns 包含存储桶列表的API响应
 */
export function getbucketConfig(): Promise<ApiResponse<BucketItem[]>> {
  return smpRequestClient.get('/smp/bucket');
}

export function createBucketConfig(
  bucketData: BucketItem,
): Promise<ApiResponse<BucketItem>> {
  return smpRequestClient.post('/smp/bucket', bucketData);
}

export function updateBucketConfig(
  id: number,
  bucketData: BucketItem,
): Promise<ApiResponse<BucketItem>> {
  return smpRequestClient.put(`/smp/bucket/${id}`, bucketData);
}

/**
 * 删除存储桶配置
 * @param bucketId - 存储桶ID
 * @returns 包含操作结果的API响应
 */
export function deleteBucketConfig(
  bucketId: number | string,
): Promise<ApiResponse<void>> {
  return smpRequestClient.delete(`/smp/bucket/${bucketId}`);
}

/**
 * 获取单个存储桶详情
 * @param bucketId - 存储桶ID
 * @returns 包含存储桶详情的API响应
 */
export function getSingleBucketConfig(
  bucketId: number | string,
): Promise<ApiResponse<BucketItem>> {
  return smpRequestClient.get(`/smp/bucket/${bucketId}`);
}
