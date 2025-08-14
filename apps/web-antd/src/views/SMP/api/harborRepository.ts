import type { ApiResponse, HarborRepository } from './types';

import { smpRequestClient } from '#/api/request';

/**
 * 获取所有Harbor仓库
 */
export function getHarborRepositories(): Promise<
  ApiResponse<HarborRepository[]>
> {
  return smpRequestClient.get('/smp/harbor');
}

/**
 * 创建Harbor仓库
 * @param data Harbor仓库数据
 */
export function createHarborRepository(
  data: HarborRepository,
): Promise<ApiResponse<HarborRepository>> {
  return smpRequestClient.post('/smp/harbor/create', data);
}

/**
 * 更新Harbor仓库
 * @param id Harbor仓库ID
 * @param data Harbor仓库数据
 */
export function updateHarborRepository(
  id: number,
  data: HarborRepository,
): Promise<ApiResponse<HarborRepository>> {
  return smpRequestClient.put(`/smp/harbor/update/${id}`, data);
}

/**
 * 删除Harbor仓库
 * @param id Harbor仓库ID
 */
export function deleteHarborRepository(id: number): Promise<ApiResponse<void>> {
  return smpRequestClient.delete(`/smp/harbor/delete/${id}`);
}
