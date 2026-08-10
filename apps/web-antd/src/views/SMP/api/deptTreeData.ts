import { getOrganizationTreeApi } from '#/api/core';

/** 获取当前登录用户可见的组织树，禁止读取全量租户。 */
export function getOrganizationTree() {
  return getOrganizationTreeApi();
}
