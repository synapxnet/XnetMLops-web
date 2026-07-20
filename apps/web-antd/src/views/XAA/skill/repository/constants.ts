/**
 * 元技能仓库常量定义
 */

import type { SkillCategoryKey, SkillType, SkillStatus } from '../types';

// 技能分类配置（前端备用，主要从API获取）
export interface CategoryConfig {
  key: SkillCategoryKey;
  name: string;
  nameEn: string;
  icon: string;
  color: string;
}

export const SKILL_CATEGORIES: CategoryConfig[] = [
  { key: 'document', name: '文档处理', nameEn: 'Document', icon: 'file-text', color: '#1890ff' },
  { key: 'creative', name: '创意设计', nameEn: 'Creative', icon: 'highlight', color: '#722ed1' },
  { key: 'development', name: '开发工具', nameEn: 'Development', icon: 'code', color: '#52c41a' },
  { key: 'data', name: '数据处理', nameEn: 'Data', icon: 'database', color: '#fa8c16' },
  { key: 'enterprise', name: '企业应用', nameEn: 'Enterprise', icon: 'apartment', color: '#eb2f96' },
  { key: 'ai-ml', name: 'AI/机器学习', nameEn: 'AI & ML', icon: 'robot', color: '#13c2c2' },
  { key: 'utilities', name: '实用工具', nameEn: 'Utilities', icon: 'tool', color: '#faad14' },
  { key: 'custom', name: '自定义', nameEn: 'Custom', icon: 'star', color: '#8c8c8c' },
];

// 技能类型选项
export const SKILL_TYPE_OPTIONS: { value: SkillType; label: string }[] = [
  { value: 'tool', label: '工具技能' },
  { value: 'prompt', label: '提示词技能' },
  { value: 'chain', label: '链式技能' },
  { value: 'workflow', label: '工作流技能' },
];

// 技能状态选项
export const SKILL_STATUS_OPTIONS: { value: SkillStatus; label: string; color: string }[] = [
  { value: 'draft', label: '草稿', color: 'default' },
  { value: 'published', label: '已发布', color: 'success' },
  { value: 'archived', label: '已归档', color: 'warning' },
];

// 获取分类配置
export function getCategoryConfig(key: SkillCategoryKey): CategoryConfig | undefined {
  return SKILL_CATEGORIES.find(c => c.key === key);
}

// 获取类型标签
export function getTypeLabel(type: SkillType): string {
  return SKILL_TYPE_OPTIONS.find(t => t.value === type)?.label || type;
}

// 获取状态配置
export function getStatusConfig(status: SkillStatus) {
  return SKILL_STATUS_OPTIONS.find(s => s.value === status);
}

// 图标映射（Ant Design Icons）
export const ICON_MAP: Record<string, string> = {
  'file-text': 'FileTextOutlined',
  'file-pdf': 'FilePdfOutlined',
  'file-word': 'FileWordOutlined',
  'file-excel': 'FileExcelOutlined',
  'file-ppt': 'FilePptOutlined',
  'highlight': 'HighlightOutlined',
  'code': 'CodeOutlined',
  'database': 'DatabaseOutlined',
  'apartment': 'ApartmentOutlined',
  'robot': 'RobotOutlined',
  'tool': 'ToolOutlined',
  'star': 'StarOutlined',
  'layout': 'LayoutOutlined',
  'api': 'ApiOutlined',
  'bug': 'BugOutlined',
  'bar-chart': 'BarChartOutlined',
};
