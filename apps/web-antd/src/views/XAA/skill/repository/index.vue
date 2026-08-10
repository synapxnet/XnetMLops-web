<script setup lang="ts">
import type { Skill, SkillCategory, SkillCategoryKey } from '../types';

import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import {
  AppstoreOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Col,
  Empty,
  Input,
  message,
  Row,
  Spin,
} from 'ant-design-vue';

import {
  fetchInstalledSkills,
  fetchOpenXnetCandidates,
  fetchRepositorySkills,
  fetchSkillCategories,
  installSkill,
  uninstallSkill,
} from '../../api/skill';
import CategoryFilter from './components/CategoryFilter.vue';
import SkillCard from './components/SkillCard.vue';
import SkillDetail from './components/SkillDetail.vue';

const router = useRouter();

// 状态
const loading = ref(false);
const skills = ref<Skill[]>([]);
const categories = ref<SkillCategory[]>([]);
const installedSkillIds = ref<Set<number>>(new Set());
const searchKeyword = ref('');
const selectedCategory = ref<null | SkillCategoryKey>(null);
const detailVisible = ref(false);
const selectedSkill = ref<null | Skill>(null);
const installingId = ref<null | number>(null);
const uninstallingId = ref<null | number>(null);

// 计算属性
const filteredSkills = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();
  if (!keyword) return skills.value;
  return skills.value.filter((skill) =>
    [skill.name, skill.description, skill.tags, skill.uid]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword)),
  );
});

const categoryCounts = computed(() => {
  const counts: Record<string, number> = {};
  skills.value.forEach((skill) => {
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

/** 加载已发布技能与 OpenXnet 企业候选；无输入，合并去重后更新仓库列表。 */
async function loadSkills() {
  loading.value = true;
  try {
    const category = selectedCategory.value || undefined;
    const [publishedSkills, draftSkills] = await Promise.all([
      fetchRepositorySkills(category),
      fetchOpenXnetCandidates(category),
    ]);
    const openXnetCandidates = draftSkills.filter((skill) =>
      isOpenXnetCandidate(skill),
    );
    const merged = new Map<number, Skill>();
    [...openXnetCandidates, ...publishedSkills].forEach((skill) =>
      merged.set(skill.id, skill),
    );
    skills.value = [...merged.values()];
  } catch (error) {
    message.error('加载技能列表失败');
    console.error('Failed to load skills:', error);
  } finally {
    loading.value = false;
  }
}

/** 判断草稿是否来自 OpenXnet 企业 Skill 导入契约；输入技能，返回来源匹配结果。 */
function isOpenXnetCandidate(skill: Skill): boolean {
  if (skill.status !== 'draft' || !skill.configJson) return false;
  try {
    const config = JSON.parse(skill.configJson) as Record<string, unknown>;
    return (
      config.source === 'openxnet' &&
      config.schema === 'openxnet.mlops.skill-import.v1'
    );
  } catch {
    return false;
  }
}

async function loadInstalledSkills() {
  try {
    const data = await fetchInstalledSkills();
    installedSkillIds.value = new Set(data.map((s) => s.id));
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
  if (skill.status !== 'published') {
    message.warning('企业候选需完成认证和发布后才能安装');
    return;
  }
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
  await Promise.all([loadCategories(), loadSkills(), loadInstalledSkills()]);
});
</script>

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
          @press-enter="handleSearch"
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
      :uninstalling="
        selectedSkill ? uninstallingId === selectedSkill.id : false
      "
      @install="handleInstall"
      @uninstall="handleUninstall"
    />
  </div>
</template>

<style lang="scss" scoped>
.skill-repository {
  min-height: 100%;
  padding: 16px;
  background: hsl(var(--background-deep));

  &__header {
    margin-bottom: 16px;
    border-radius: 12px;
  }

  &__title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  &__title {
    display: flex;
    gap: 12px;
    align-items: center;
    margin: 0 0 8px;
    font-size: 24px;
    font-weight: 600;
    color: hsl(var(--foreground));
  }

  &__subtitle {
    margin: 0;
    font-size: 14px;
    color: hsl(var(--muted-foreground));
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
