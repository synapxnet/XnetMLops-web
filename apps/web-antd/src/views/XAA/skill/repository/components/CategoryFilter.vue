<template>
  <div class="category-filter">
    <div
      class="category-filter__item"
      :class="{ 'category-filter__item--active': !selectedCategory }"
      @click="handleSelect(null)"
    >
      <AppstoreOutlined />
      <span>全部</span>
    </div>
    <div
      v-for="category in categories"
      :key="category.key"
      class="category-filter__item"
      :class="{ 'category-filter__item--active': selectedCategory === category.key }"
      :style="getItemStyle(category)"
      @click="handleSelect(category.key)"
    >
      <component :is="getIcon(category.icon)" />
      <span>{{ category.name }}</span>
      <span v-if="getCategoryCount(category.key) > 0" class="category-filter__count">
        {{ getCategoryCount(category.key) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  AppstoreOutlined,
  FileTextOutlined,
  HighlightOutlined,
  CodeOutlined,
  DatabaseOutlined,
  ApartmentOutlined,
  RobotOutlined,
  ToolOutlined,
  StarOutlined,
} from '@ant-design/icons-vue';
import type { SkillCategory, SkillCategoryKey } from '../../types';

interface Props {
  categories: SkillCategory[];
  selectedCategory: SkillCategoryKey | null;
  categoryCounts?: Record<string, number>;
}

const props = withDefaults(defineProps<Props>(), {
  categoryCounts: () => ({}),
});

const emit = defineEmits<{
  (e: 'update:selectedCategory', category: SkillCategoryKey | null): void;
}>();

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

function getIcon(iconName: string) {
  return iconMap[iconName] || AppstoreOutlined;
}

function getItemStyle(category: SkillCategory) {
  if (props.selectedCategory === category.key) {
    return {
      '--item-color': category.color,
      borderColor: category.color,
      backgroundColor: `${category.color}10`,
    };
  }
  return {};
}

function getCategoryCount(key: string): number {
  return props.categoryCounts[key] || 0;
}

function handleSelect(category: SkillCategoryKey | null) {
  emit('update:selectedCategory', category);
}
</script>

<style lang="scss" scoped>
.category-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px 0;

  &__item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border: 1px solid hsl(var(--border));
    border-radius: 20px;
    font-size: 14px;
    color: hsl(var(--muted-foreground));
    cursor: pointer;
    transition: all 0.2s ease;
    background: hsl(var(--card));

    &:hover {
      border-color: hsl(var(--border));
      background: hsl(var(--accent));
    }

    &--active {
      color: var(--item-color, #1890ff);
      border-color: var(--item-color, #1890ff);
      background: rgba(24, 144, 255, 0.06);

      .anticon {
        color: var(--item-color, #1890ff);
      }
    }
  }

  &__count {
    font-size: 12px;
    padding: 0 6px;
    background: hsl(var(--muted));
    border-radius: 10px;
    color: hsl(var(--muted-foreground));
  }
}
</style>
