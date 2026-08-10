<script setup lang="ts">
import type { Skill } from '../../types';

import { computed } from 'vue';

import {
  ApartmentOutlined,
  ApiOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  BugOutlined,
  CodeOutlined,
  DatabaseOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  FileTextOutlined,
  FileWordOutlined,
  HighlightOutlined,
  LayoutOutlined,
  RobotOutlined,
  StarOutlined,
  ToolOutlined,
} from '@ant-design/icons-vue';
import { Button, Card, Tag } from 'ant-design-vue';

import { getCategoryConfig } from '../constants';

interface Props {
  skill: Skill;
  installed?: boolean;
  installing?: boolean;
  uninstalling?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  installed: false,
  installing: false,
  uninstalling: false,
});

const emit = defineEmits<{
  (e: 'click', skill: Skill): void;
  (e: 'install', skill: Skill): void;
  (e: 'uninstall', skill: Skill): void;
}>();

// 图标映射
const iconMap: Record<string, any> = {
  'file-text': FileTextOutlined,
  'file-pdf': FilePdfOutlined,
  'file-word': FileWordOutlined,
  'file-excel': FileExcelOutlined,
  'file-ppt': FilePptOutlined,
  highlight: HighlightOutlined,
  code: CodeOutlined,
  database: DatabaseOutlined,
  apartment: ApartmentOutlined,
  robot: RobotOutlined,
  tool: ToolOutlined,
  star: StarOutlined,
  layout: LayoutOutlined,
  api: ApiOutlined,
  bug: BugOutlined,
  'bar-chart': BarChartOutlined,
};

const categoryConfig = computed(() => getCategoryConfig(props.skill.category));
const categoryName = computed(() => categoryConfig.value?.name || '未分类');
const categoryColor = computed(() => categoryConfig.value?.color || '#8c8c8c');

const iconComponent = computed(() => {
  const iconName = props.skill.icon || categoryConfig.value?.icon || 'star';
  return iconMap[iconName] || AppstoreOutlined;
});

function handleClick() {
  emit('click', props.skill);
}

function handleInstall() {
  emit('install', props.skill);
}

function handleUninstall() {
  emit('uninstall', props.skill);
}
</script>

<template>
  <Card
    class="skill-card"
    :class="{ 'skill-card--installed': installed }"
    hoverable
    @click="handleClick"
  >
    <div class="skill-card__header">
      <div class="skill-card__icon" :style="{ backgroundColor: categoryColor }">
        <component :is="iconComponent" />
      </div>
      <div class="skill-card__badges">
        <Tag v-if="skill.isOfficial" color="blue" size="small">官方</Tag>
        <Tag v-if="skill.status === 'draft'" color="gold" size="small">
          企业候选
        </Tag>
        <Tag v-if="installed" color="green" size="small">已安装</Tag>
      </div>
    </div>

    <div class="skill-card__body">
      <div class="skill-card__title">{{ skill.name }}</div>
      <div class="skill-card__description">
        {{ skill.description || '暂无描述' }}
      </div>
    </div>

    <div class="skill-card__footer">
      <div class="skill-card__meta">
        <span class="skill-card__category">{{ categoryName }}</span>
        <span class="skill-card__stats">
          <DownloadOutlined />
          {{ skill.installCount || 0 }}
        </span>
      </div>
      <div class="skill-card__actions" @click.stop>
        <Button
          v-if="!installed && skill.status === 'published'"
          type="primary"
          size="small"
          :loading="installing"
          @click="handleInstall"
        >
          安装
        </Button>
        <Button v-else-if="skill.status === 'draft'" size="small" disabled>
          待认证
        </Button>
        <Button
          v-else
          size="small"
          danger
          :loading="uninstalling"
          @click="handleUninstall"
        >
          卸载
        </Button>
      </div>
    </div>
  </Card>
</template>

<style lang="scss" scoped>
.skill-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  border-radius: 12px;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 8px 24px rgb(0 0 0 / 12%);
    transform: translateY(-4px);
  }

  &--installed {
    border: 2px solid #52c41a;
  }

  :deep(.ant-card-body) {
    display: flex;
    flex: 1;
    flex-direction: column;
    padding: 16px;
  }

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    font-size: 24px;
    color: #fff;
    border-radius: 12px;
  }

  &__badges {
    display: flex;
    gap: 4px;
  }

  &__body {
    flex: 1;
    margin-bottom: 12px;
  }

  &__title {
    margin-bottom: 8px;
    font-size: 16px;
    font-weight: 600;
    line-height: 1.4;
    color: hsl(var(--foreground));
  }

  &__description {
    display: -webkit-box;
    overflow: hidden;
    font-size: 13px;
    line-height: 1.5;
    color: hsl(var(--muted-foreground));
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 12px;
    border-top: 1px solid hsl(var(--border));
  }

  &__meta {
    display: flex;
    gap: 12px;
    align-items: center;
    font-size: 12px;
    color: hsl(var(--muted-foreground));
  }

  &__category {
    padding: 2px 8px;
    background: hsl(var(--muted));
    border-radius: 4px;
  }

  &__stats {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  &__actions {
    display: flex;
    gap: 8px;
  }
}
</style>
