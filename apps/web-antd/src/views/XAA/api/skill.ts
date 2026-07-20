import { xaaRequestClient } from '#/api/request';

import type {
  Skill,
  SkillCategory,
  SkillInstallation,
  CreateSkillRequest,
  UpdateSkillRequest,
  SkillCategoryKey,
} from '../skill/types';

// ==================== 技能管理 API ====================

/**
 * 获取技能列表
 */
export async function fetchSkillList(
  status?: string,
  type?: string,
  category?: string,
): Promise<Skill[]> {
  let url = `/skills`;
  const params: string[] = [];
  if (status) params.push(`status=${status}`);
  if (type) params.push(`type=${type}`);
  if (category) params.push(`category=${category}`);
  if (params.length > 0) {
    url += `?${params.join('&')}`;
  }
  const response = await xaaRequestClient.get(url);
  return response;
}

/**
 * 获取仓库技能列表（已发布的技能）
 */
export async function fetchRepositorySkills(
  category?: SkillCategoryKey,
): Promise<Skill[]> {
  let url = `/skills/repository`;
  if (category) {
    url += `?category=${category}`;
  }
  const response = await xaaRequestClient.get(url);
  return response;
}

/**
 * 搜索技能
 */
export async function searchSkills(
  keyword?: string,
  category?: string,
): Promise<Skill[]> {
  const params: string[] = [];
  if (keyword) params.push(`keyword=${encodeURIComponent(keyword)}`);
  if (category) params.push(`category=${category}`);
  const url = `/skills/search${params.length > 0 ? `?${params.join('&')}` : ''}`;
  const response = await xaaRequestClient.get(url);
  return response;
}

/**
 * 获取技能详情
 */
export async function fetchSkillById(id: number): Promise<Skill> {
  const response = await xaaRequestClient.get(`/skills/${id}`);
  return response;
}

/**
 * 创建技能
 */
export async function createSkill(data: CreateSkillRequest): Promise<Skill> {
  const response = await xaaRequestClient.post(`/skills`, data);
  return response;
}

/**
 * 更新技能
 */
export async function updateSkill(
  id: number,
  data: UpdateSkillRequest,
): Promise<Skill> {
  const response = await xaaRequestClient.put(`/skills/${id}`, data);
  return response;
}

/**
 * 发布技能
 */
export async function publishSkill(id: number): Promise<Skill> {
  const response = await xaaRequestClient.post(`/skills/${id}/publish`);
  return response;
}

/**
 * 归档技能
 */
export async function archiveSkill(id: number): Promise<Skill> {
  const response = await xaaRequestClient.post(`/skills/${id}/archive`);
  return response;
}

/**
 * 删除技能
 */
export async function deleteSkill(id: number): Promise<void> {
  await xaaRequestClient.delete(`/skills/${id}`);
}

// ==================== 分类 API ====================

/**
 * 获取所有技能分类
 */
export async function fetchSkillCategories(): Promise<SkillCategory[]> {
  const response = await xaaRequestClient.get(`/skill-categories`);
  return response;
}

/**
 * 根据Key获取分类
 */
export async function fetchSkillCategoryByKey(
  key: string,
): Promise<SkillCategory> {
  const response = await xaaRequestClient.get(`/skill-categories/${key}`);
  return response;
}

// ==================== 安装管理 API ====================

/**
 * 安装技能
 */
export async function installSkill(id: number): Promise<void> {
  await xaaRequestClient.post(`/skills/${id}/install`);
}

/**
 * 卸载技能
 */
export async function uninstallSkill(id: number): Promise<void> {
  await xaaRequestClient.post(`/skills/${id}/uninstall`);
}

/**
 * 检查技能是否已安装
 */
export async function checkSkillInstalled(
  id: number,
): Promise<{ installed: boolean }> {
  const response = await xaaRequestClient.get(`/skills/${id}/installed`);
  return response;
}

/**
 * 获取已安装的技能列表
 */
export async function fetchInstalledSkills(): Promise<Skill[]> {
  const response = await xaaRequestClient.get(`/skills/installed`);
  return response;
}

/**
 * 获取安装记录
 */
export async function fetchSkillInstallations(): Promise<SkillInstallation[]> {
  const response = await xaaRequestClient.get(`/skill-installations`);
  return response;
}
