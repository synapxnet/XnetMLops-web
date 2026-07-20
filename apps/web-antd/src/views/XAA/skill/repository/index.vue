<template>
  <div class="skill-repository">
    <!-- 页面头部 -->
    <Card class="skill-repository__header">
      <div class="skill-repository__title-row">
        <div>
          <h2 class="skill-repository__title">
            <AppstoreOutlined />
            元技能仓库
          </h2>
          <p class="skill-repository__subtitle">
            浏览和安装各类AI技能，扩展您的智能体能力
          </p>
        </div>
        <div class="skill-repository__actions">
          <Button type="primary" @click="handleCreateSkill">
            <template #icon><PlusOutlined /></template>
            创建技能
          </Button>
        </div>
      </div>

      <!-- 搜索栏 -->
      <div class="skill-repository__search">
        <Input
          v-model:value="searchKeyword"
          placeholder="搜索技能名称、描述或标签..."
          size="large"
          allow-clear
          @pressEnter="handleSearch"
          @change="handleSearchChange"
        >
          <template #prefix>
            <SearchOutlined />
          </template>
          <template #suffix>
            <Button type="primary" @click="handleSearch">搜索</Button>
          </template>
        </Input>
      </div>

      <!-- 分类筛选 -->
      <CategoryFilter
        :categories="categories"
        v-model:selected-category="selectedCategory"
        :category-counts="categoryCounts"
      />
    </Card>

    <!-- 技能列表 -->
    <div class="skill-repository__content">
      <Spin :spinning="loading">
        <div v-if="filteredSkills.length > 0" class="skill-repository__grid">
          <Row :gutter="[16, 16]">
            <Col
              v-for="skill in filteredSkills"
              :key="skill.id"
              :xs="24"
              :sm="12"
              :md="8"
              :lg="6"
              :xl="6"
            >
              <SkillCard
                :skill="skill"
                :installed="isInstalled(skill.id)"
                :installing="installingId === skill.id"
                :uninstalling="uninstallingId === skill.id"
                @click="handleSkillClick"
                @install="handleInstall"
                @uninstall="handleUninstall"
              />
            </Col>
          </Row>
        </div>
        <Empty v-else description="暂无技能" class="skill-repository__empty" />
      </Spin>
    </div>

    <!-- 技能详情抽屉 -->
    <SkillDetail
      v-model:visible="detailVisible"
      :skill="selectedSkill"
      :installed="selectedSkill ? isInstalled(selectedSkill.id) : false"
      :installing="selectedSkill ? installingId === selectedSkill.id : false"
      :uninstalling="selectedSkill ? uninstallingId === selectedSkill.id : false"
      @install="handleInstall"
      @uninstall="handleUninstall"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  Card,
  Input,
  Button,
  Row,
  Col,
  Spin,
  Empty,
  message,
} from 'ant-design-vue';
import {
  AppstoreOutlined,
  SearchOutlined,
  PlusOutlined,
} from '@ant-design/icons-vue';

import SkillCard from './components/SkillCard.vue';
import CategoryFilter from './components/CategoryFilter.vue';
import SkillDetail from './components/SkillDetail.vue';

import type { Skill, SkillCategory, SkillCategoryKey } from '../types';
import {
  fetchRepositorySkills,
  fetchSkillCategories,
  searchSkills,
  installSkill,
  uninstallSkill,
  fetchInstalledSkills,
} from '../../api/skill';

const router = useRouter();

// 状态
const loading = ref(false);
const skills = ref<Skill[]>([]);
const categories = ref<SkillCategory[]>([]);
const installedSkillIds = ref<Set<number>>(new Set());
const searchKeyword = ref('');
const selectedCategory = ref<SkillCategoryKey | null>(null);
const detailVisible = ref(false);
const selectedSkill = ref<Skill | null>(null);
const installingId = ref<number | null>(null);
const uninstallingId = ref<number | null>(null);

// 计算属性
const filteredSkills = computed(() => {
  return skills.value;
});

const categoryCounts = computed(() => {
  const counts: Record<string, number> = {};
  skills.value.forEach(skill => {
    counts[skill.category] = (counts[skill.category] || 0) + 1;
  });
  return counts;
});

// 方法
function isInstalled(skillId: number): boolean {
  return installedSkillIds.value.has(skillId);
}

async function loadCategories() {
  try {
    const data = await fetchSkillCategories();
    categories.value = data;
  } catch (error) {
    console.error('Failed to load categories:', error);
  }
}

async function loadSkills() {
  loading.value = true;
  try {
    if (searchKeyword.value) {
      skills.value = await searchSkills(searchKeyword.value, selectedCategory.value || undefined);
    } else {
      skills.value = await fetchRepositorySkills(selectedCategory.value || undefined);
    }
  } catch (error) {
    message.error('加载技能列表失败');
    console.error('Failed to load skills:', error);
  } finally {
    loading.value = false;
  }
}

async function loadInstalledSkills() {
  try {
    const data = await fetchInstalledSkills();
    installedSkillIds.value = new Set(data.map(s => s.id));
  } catch (error) {
    console.error('Failed to load installed skills:', error);
  }
}

function handleSearch() {
  loadSkills();
}

function handleSearchChange() {
  // 如果清空了搜索词，重新加载
  if (!searchKeyword.value) {
    loadSkills();
  }
}

function handleSkillClick(skill: Skill) {
  selectedSkill.value = skill;
  detailVisible.value = true;
}

async function handleInstall(skill: Skill) {
  installingId.value = skill.id;
  try {
    await installSkill(skill.id);
    installedSkillIds.value.add(skill.id);
    message.success(`技能 "${skill.name}" 安装成功`);
    // 刷新技能列表以更新安装次数
    loadSkills();
  } catch (error: any) {
    message.error(error.message || '安装失败');
  } finally {
    installingId.value = null;
  }
}

async function handleUninstall(skill: Skill) {
  uninstallingId.value = skill.id;
  try {
    await uninstallSkill(skill.id);
    installedSkillIds.value.delete(skill.id);
    message.success(`技能 "${skill.name}" 已卸载`);
    loadSkills();
  } catch (error: any) {
    message.error(error.message || '卸载失败');
  } finally {
    uninstallingId.value = null;
  }
}

function handleCreateSkill() {
  router.push('/XAA/skill/create');
}

// 监听分类变化
watch(selectedCategory, () => {
  loadSkills();
});

// 初始化
onMounted(async () => {
  await Promise.all([
    loadCategories(),
    loadSkills(),
    loadInstalledSkills(),
  ]);
});
</script>

<style lang="scss" scoped>
.skill-repository {
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
    margin-bottom: 20px;
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

  &__search {
    margin-bottom: 16px;

    :deep(.ant-input-affix-wrapper) {
      padding-right: 4px;
    }

    :deep(.ant-input-suffix) {
      margin-left: 8px;
    }
  }

  &__content {
    min-height: 400px;
  }

  &__grid {
    padding: 8px 0;
  }

  &__empty {
    padding: 80px 0;
  }
}
</style>
