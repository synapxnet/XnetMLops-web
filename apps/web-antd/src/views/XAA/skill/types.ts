/**
 * XAA 技能管理类型定义
 */

// 技能类型
export type SkillType = 'tool' | 'prompt' | 'chain' | 'workflow';

// 技能状态
export type SkillStatus = 'draft' | 'published' | 'archived';

// 技能分类
export type SkillCategoryKey =
  | 'document'
  | 'creative'
  | 'development'
  | 'data'
  | 'enterprise'
  | 'ai-ml'
  | 'utilities'
  | 'custom';

// 技能实体
export interface Skill {
  id: number;
  uid: string;
  name: string;
  description?: string;
  type: SkillType;
  status: SkillStatus;
  category: SkillCategoryKey;
  tags?: string;
  contentMd?: string;
  configJson?: string;
  icon?: string;
  hasScripts?: boolean;
  hasReferences?: boolean;
  hasAssets?: boolean;
  installCount?: number;
  sourceUrl?: string;
  isOfficial?: boolean;
  version: number;
  creatorId?: string;
  tenantUid?: string;
  createdAt: string;
  updatedAt: string;
}

// 技能分类信息
export interface SkillCategory {
  id: number;
  key: SkillCategoryKey;
  name: string;
  nameEn: string;
  description?: string;
  icon: string;
  color: string;
  sortOrder: number;
}

// 技能安装记录
export interface SkillInstallation {
  id: number;
  skillId: number;
  tenantUid: string;
  installedBy?: string;
  installedAt: string;
  configOverride?: string;
  status: 'active' | 'disabled';
}

// 创建技能请求
export interface CreateSkillRequest {
  name: string;
  description?: string;
  type: SkillType;
  category?: SkillCategoryKey;
  tags?: string;
  contentMd?: string;
  configJson?: string;
  icon?: string;
  hasScripts?: boolean;
  hasReferences?: boolean;
  hasAssets?: boolean;
  sourceUrl?: string;
}

// 更新技能请求
export interface UpdateSkillRequest extends Partial<CreateSkillRequest> {
  status?: SkillStatus;
}

// 技能搜索参数
export interface SkillSearchParams {
  keyword?: string;
  category?: SkillCategoryKey;
  type?: SkillType;
  status?: SkillStatus;
}

// 带安装状态的技能
export interface SkillWithInstallStatus extends Skill {
  installed?: boolean;
  installationId?: number;
}
