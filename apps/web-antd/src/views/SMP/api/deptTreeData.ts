import type { ApiResponse, DeptTreeDataItem } from './types';

import { smpRequestClient } from '#/api/request'; // 根据实际路径调整

// 获取组织树
export function getOrganizationTree(): Promise<
  ApiResponse<DeptTreeDataItem[]>
> {
  return smpRequestClient.get('/smp/dept-tree-data');
}
