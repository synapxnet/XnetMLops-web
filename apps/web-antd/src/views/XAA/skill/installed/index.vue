<template>
  <div class="installed-skills">
    <Card class="installed-skills__header">
      <div class="installed-skills__title-row">
        <div>
          <h2 class="installed-skills__title">
            <CheckCircleOutlined />
            已安装技能
          </h2>
          <p class="installed-skills__subtitle">
            管理已安装到当前租户的技能
          </p>
        </div>
        <div class="installed-skills__stats">
          <Statistic title="已安装" :value="skills.length" suffix="个技能" />
        </div>
      </div>
    </Card>

    <Card class="installed-skills__content">
      <Spin :spinning="loading">
        <Table
          v-if="skills.length > 0"
          :columns="columns"
          :data-source="skills"
          :pagination="{ pageSize: 10 }"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <div class="installed-skills__name-cell">
                <div
                  class="installed-skills__icon"
                  :style="{ backgroundColor: getCategoryColor(record.category) }"
                >
                  <component :is="getSkillIcon(record)" />
                </div>
                <div>
                  <div class="installed-skills__name">
                    {{ record.name }}
                    <Tag v-if="record.isOfficial" color="blue" size="small">官方</Tag>
                  </div>
                  <div class="installed-skills__desc">{{ record.description }}</div>
                </div>
              </div>
            </template>
            <template v-else-if="column.key === 'category'">
              <Tag :color="getCategoryColor(record.category)">
                {{ getCategoryName(record.category) }}
              </Tag>
            </template>
            <template v-else-if="column.key === 'type'">
              {{ getTypeLabel(record.type) }}
            </template>
            <template v-else-if="column.key === 'version'">
              v{{ record.version }}
            </template>
            <template v-else-if="column.key === 'action'">
              <Space>
                <Button type="link" size="small" @click="handleViewDetail(record)">
                  详情
                </Button>
                <Popconfirm
                  title="确定要卸载此技能吗？"
                  @confirm="handleUninstall(record)"
                >
                  <Button type="link" size="small" danger :loading="uninstallingId === record.id">
                    卸载
                  </Button>
                </Popconfirm>
              </Space>
            </template>
          </template>
        </Table>
        <Empty v-else description="暂未安装任何技能">
          <Button type="primary" @click="goToRepository">
            去技能仓库
          </Button>
        </Empty>
      </Spin>
    </Card>

    <!-- 技能详情抽屉 -->
    <SkillDetail
      v-model:visible="detailVisible"
      :skill="selectedSkill"
      :installed="true"
      :uninstalling="selectedSkill ? uninstallingId === selectedSkill.id : false"
      @uninstall="handleUninstall"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Popconfirm,
  Spin,
  Empty,
  Statistic,
  message,
} from 'ant-design-vue';
import {
  CheckCircleOutlined,
  FileTextOutlined,
  HighlightOutlined,
  CodeOutlined,
  DatabaseOutlined,
  ApartmentOutlined,
  RobotOutlined,
  ToolOutlined,
  StarOutlined,
  AppstoreOutlined,
} from '@ant-design/icons-vue';

import SkillDetail from '../repository/components/SkillDetail.vue';
import type { Skill, SkillCategoryKey, SkillType } from '../types';
import { fetchInstalledSkills, uninstallSkill } from '../../api/skill';
import { getCategoryConfig, getTypeLabel as getTypeLabelFn } from '../repository/constants';

const router = useRouter();

// 状态
const loading = ref(false);
const skills = ref<Skill[]>([]);
const detailVisible = ref(false);
const selectedSkill = ref<Skill | null>(null);
const uninstallingId = ref<number | null>(null);

// 表格列配置
const columns = [
  {
    title: '技能名称',
    key: 'name',
    width: 300,
  },
  {
    title: '分类',
    key: 'category',
    width: 120,
  },
  {
    title: '类型',
    key: 'type',
    width: 100,
  },
  {
    title: '版本',
    key: 'version',
    width: 80,
  },
  {
    title: '操作',
    key: 'action',
    width: 150,
  },
];

// 图标映射
const iconMap: Record<string, any> = {
  'file-text': FileTextOutlined,
  'highlight': HighlightOutlined,
  'code': CodeOutlined,
  'database': DatabaseOutlined,
  'apartment': ApartmentOutlined,
  'robot': RobotOutlined,
  'tool': ToolOutlined,
  'star': StarOutlined,
};

function getSkillIcon(skill: Skill) {
  const iconName = skill.icon || getCategoryConfig(skill.category)?.icon || 'star';
  return iconMap[iconName] || AppstoreOutlined;
}

function getCategoryColor(category: SkillCategoryKey): string {
  return getCategoryConfig(category)?.color || '#8c8c8c';
}

function getCategoryName(category: SkillCategoryKey): string {
  return getCategoryConfig(category)?.name || '未分类';
}

function getTypeLabel(type: SkillType): string {
  return getTypeLabelFn(type);
}

async function loadSkills() {
  loading.value = true;
  try {
    skills.value = await fetchInstalledSkills();
  } catch (error) {
    message.error('加载已安装技能失败');
    console.error('Failed to load installed skills:', error);
  } finally {
    loading.value = false;
  }
}

function handleViewDetail(skill: Skill) {
  selectedSkill.value = skill;
  detailVisible.value = true;
}

async function handleUninstall(skill: Skill) {
  uninstallingId.value = skill.id;
  try {
    await uninstallSkill(skill.id);
    skills.value = skills.value.filter(s => s.id !== skill.id);
    message.success(`技能 "${skill.name}" 已卸载`);
    detailVisible.value = false;
  } catch (error: any) {
    message.error(error.message || '卸载失败');
  } finally {
    uninstallingId.value = null;
  }
}

function goToRepository() {
  router.push('/XAA/skill/repository');
}

onMounted(() => {
  loadSkills();
});
</script>

<style lang="scss" scoped>
.installed-skills {
  padding: 16px;
  min-height: 100%;
  background: #f5f5f5;

  &__header {
    margin-bottom: 16px;
    border-radius: 12px;
  }

  &__title-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  &__title {
    font-size: 24px;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 8px 0;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__subtitle {
    font-size: 14px;
    color: #6b7280;
    margin: 0;
  }

  &__content {
    border-radius: 12px;
  }

  &__name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    color: #fff;
    font-size: 20px;
    flex-shrink: 0;
  }

  &__name {
    font-weight: 500;
    color: #1f2937;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__desc {
    font-size: 12px;
    color: #6b7280;
    margin-top: 2px;
  }
}
</style>
