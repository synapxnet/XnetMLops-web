<template>
  <Drawer
    :open="visible"
    :title="skill?.name || '技能详情'"
    :width="560"
    placement="right"
    @close="handleClose"
  >
    <template v-if="skill">
      <!-- 头部信息 -->
      <div class="skill-detail__header">
        <div class="skill-detail__icon" :style="{ backgroundColor: categoryColor }">
          <component :is="iconComponent" />
        </div>
        <div class="skill-detail__info">
          <div class="skill-detail__title">
            {{ skill.name }}
            <Tag v-if="skill.isOfficial" color="blue">官方</Tag>
          </div>
          <div class="skill-detail__meta">
            <span>
              <TagOutlined />
              {{ categoryName }}
            </span>
            <span>
              <DownloadOutlined />
              {{ skill.installCount || 0 }} 次安装
            </span>
            <span>
              <ClockCircleOutlined />
              v{{ skill.version }}
            </span>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="skill-detail__actions">
        <Button
          v-if="!installed"
          type="primary"
          size="large"
          block
          :loading="installing"
          @click="handleInstall"
        >
          <template #icon><DownloadOutlined /></template>
          安装技能
        </Button>
        <Button
          v-else
          size="large"
          block
          danger
          :loading="uninstalling"
          @click="handleUninstall"
        >
          <template #icon><DeleteOutlined /></template>
          卸载技能
        </Button>
      </div>

      <Divider />

      <!-- 描述 -->
      <div class="skill-detail__section">
        <div class="skill-detail__section-title">描述</div>
        <div class="skill-detail__description">
          {{ skill.description || '暂无描述' }}
        </div>
      </div>

      <!-- 标签 -->
      <div v-if="skillTags.length > 0" class="skill-detail__section">
        <div class="skill-detail__section-title">标签</div>
        <div class="skill-detail__tags">
          <Tag v-for="tag in skillTags" :key="tag">{{ tag }}</Tag>
        </div>
      </div>

      <!-- 资源信息 -->
      <div class="skill-detail__section">
        <div class="skill-detail__section-title">包含资源</div>
        <div class="skill-detail__resources">
          <div class="skill-detail__resource" :class="{ 'skill-detail__resource--active': skill.hasScripts }">
            <CodeOutlined />
            <span>脚本</span>
            <CheckOutlined v-if="skill.hasScripts" class="skill-detail__resource-check" />
          </div>
          <div class="skill-detail__resource" :class="{ 'skill-detail__resource--active': skill.hasReferences }">
            <FileTextOutlined />
            <span>参考文档</span>
            <CheckOutlined v-if="skill.hasReferences" class="skill-detail__resource-check" />
          </div>
          <div class="skill-detail__resource" :class="{ 'skill-detail__resource--active': skill.hasAssets }">
            <FolderOutlined />
            <span>资源文件</span>
            <CheckOutlined v-if="skill.hasAssets" class="skill-detail__resource-check" />
          </div>
        </div>
      </div>

      <!-- SKILL.md 内容 -->
      <div v-if="skill.contentMd" class="skill-detail__section">
        <div class="skill-detail__section-title">
          技能说明
          <Button type="link" size="small" @click="toggleContent">
            {{ showFullContent ? '收起' : '展开' }}
          </Button>
        </div>
        <div
          class="skill-detail__content"
          :class="{ 'skill-detail__content--expanded': showFullContent }"
        >
          <pre>{{ skill.contentMd }}</pre>
        </div>
      </div>

      <!-- 其他信息 -->
      <div class="skill-detail__section">
        <div class="skill-detail__section-title">其他信息</div>
        <Descriptions :column="1" size="small" bordered>
          <DescriptionsItem label="技能类型">{{ typeLabel }}</DescriptionsItem>
          <DescriptionsItem label="状态">
            <Tag :color="statusColor">{{ statusLabel }}</Tag>
          </DescriptionsItem>
          <DescriptionsItem label="创建时间">{{ formatDate(skill.createdAt) }}</DescriptionsItem>
          <DescriptionsItem label="更新时间">{{ formatDate(skill.updatedAt) }}</DescriptionsItem>
          <DescriptionsItem v-if="skill.sourceUrl" label="来源">
            <a :href="skill.sourceUrl" target="_blank">{{ skill.sourceUrl }}</a>
          </DescriptionsItem>
        </Descriptions>
      </div>
    </template>

    <Empty v-else description="请选择一个技能查看详情" />
  </Drawer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  Drawer,
  Button,
  Tag,
  Divider,
  Descriptions,
  DescriptionsItem,
  Empty,
} from 'ant-design-vue';
import {
  DownloadOutlined,
  DeleteOutlined,
  TagOutlined,
  ClockCircleOutlined,
  CodeOutlined,
  FileTextOutlined,
  FolderOutlined,
  CheckOutlined,
  AppstoreOutlined,
  HighlightOutlined,
  DatabaseOutlined,
  ApartmentOutlined,
  RobotOutlined,
  ToolOutlined,
  StarOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  LayoutOutlined,
  ApiOutlined,
  BugOutlined,
  BarChartOutlined,
} from '@ant-design/icons-vue';
import type { Skill } from '../../types';
import { getCategoryConfig, getTypeLabel, getStatusConfig } from '../constants';

interface Props {
  visible: boolean;
  skill: Skill | null;
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
  (e: 'update:visible', visible: boolean): void;
  (e: 'install', skill: Skill): void;
  (e: 'uninstall', skill: Skill): void;
}>();

const showFullContent = ref(false);

const iconMap: Record<string, any> = {
  'file-text': FileTextOutlined,
  'file-pdf': FilePdfOutlined,
  'file-word': FileWordOutlined,
  'file-excel': FileExcelOutlined,
  'file-ppt': FilePptOutlined,
  'highlight': HighlightOutlined,
  'code': CodeOutlined,
  'database': DatabaseOutlined,
  'apartment': ApartmentOutlined,
  'robot': RobotOutlined,
  'tool': ToolOutlined,
  'star': StarOutlined,
  'layout': LayoutOutlined,
  'api': ApiOutlined,
  'bug': BugOutlined,
  'bar-chart': BarChartOutlined,
};

const categoryConfig = computed(() => {
  if (!props.skill) return null;
  return getCategoryConfig(props.skill.category);
});

const categoryName = computed(() => categoryConfig.value?.name || '未分类');
const categoryColor = computed(() => categoryConfig.value?.color || '#8c8c8c');

const iconComponent = computed(() => {
  if (!props.skill) return AppstoreOutlined;
  const iconName = props.skill.icon || categoryConfig.value?.icon || 'star';
  return iconMap[iconName] || AppstoreOutlined;
});

const skillTags = computed(() => {
  if (!props.skill?.tags) return [];
  return props.skill.tags.split(',').map(t => t.trim()).filter(Boolean);
});

const typeLabel = computed(() => {
  if (!props.skill) return '';
  return getTypeLabel(props.skill.type);
});

const statusConfig = computed(() => {
  if (!props.skill) return null;
  return getStatusConfig(props.skill.status);
});

const statusLabel = computed(() => statusConfig.value?.label || '');
const statusColor = computed(() => statusConfig.value?.color || 'default');

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN');
}

function toggleContent() {
  showFullContent.value = !showFullContent.value;
}

function handleClose() {
  emit('update:visible', false);
}

function handleInstall() {
  if (props.skill) {
    emit('install', props.skill);
  }
}

function handleUninstall() {
  if (props.skill) {
    emit('uninstall', props.skill);
  }
}
</script>

<style lang="scss" scoped>
.skill-detail {
  &__header {
    display: flex;
    gap: 16px;
    margin-bottom: 20px;
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    border-radius: 16px;
    color: #fff;
    font-size: 32px;
    flex-shrink: 0;
  }

  &__info {
    flex: 1;
  }

  &__title {
    font-size: 20px;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 13px;
    color: #6b7280;

    span {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }

  &__actions {
    margin-bottom: 20px;
  }

  &__section {
    margin-bottom: 24px;
  }

  &__section-title {
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__description {
    font-size: 14px;
    color: #4b5563;
    line-height: 1.6;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__resources {
    display: flex;
    gap: 12px;
  }

  &__resource {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: #f3f4f6;
    border-radius: 8px;
    font-size: 13px;
    color: #9ca3af;

    &--active {
      background: #ecfdf5;
      color: #059669;
    }
  }

  &__resource-check {
    color: #10b981;
  }

  &__content {
    background: #f9fafb;
    border-radius: 8px;
    padding: 12px;
    max-height: 200px;
    overflow: hidden;
    transition: max-height 0.3s ease;

    &--expanded {
      max-height: none;
    }

    pre {
      margin: 0;
      font-size: 13px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
    }
  }
}
</style>
