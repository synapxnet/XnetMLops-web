<!-- Copyright (C) 2026 Synapxnet. All rights reserved.
Synapxnet Proprietary and Confidential. Unauthorized copying, distribution or use is forbidden.
统一任务页面容器。Unified task page container.
Author: maoyo | Department: 研发部 | Date: 2026-09-13 | Version: 1.0.0 | Security Level: INTERNAL
__version__: 1.0.0 | __author__: maoyo | __copyright__: Copyright 2026 Synapxnet
__maintainer__: maoyo | __email__: synapxnet@gmail.com -->
<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { Alert, Button } from 'ant-design-vue';
import { $t } from '#/locales';

const props = defineProps<{
  description: string;
  domain: string;
  existingTitle?: boolean;
  error?: string;
  loading?: boolean;
  title?: string;
  variant?: 'canvas' | 'form' | 'list' | 'overview';
}>();
defineEmits<{ retry: [] }>();
const route = useRoute();
/** 从现有路由取可翻译标题，保持入口命名。Resolve translated titles from existing routes. */
function pageTitle() {
  if (props.title) return props.title;
  const title = String(route.meta.title ?? '工作区');
  return title.startsWith('page.') ? $t(title) : title;
}
/** 按既有页面任务分配内容布局，不改变路由或操作。Choose a content layout for the existing task without changing routes or actions. */
function pageLayout() {
  if (props.variant) return props.variant;
  if (/\/workflow\/designer|\/assistant\/chat/i.test(route.path))
    return 'canvas';
  if (/create|modify|edit|\/task$/i.test(route.path)) return 'form';
  return 'list';
}
const title = computed(pageTitle);
const layout = computed(pageLayout);
</script>
<template>
  <section
    class="xnet-business-page"
    :class="`xnet-layout-${layout}`"
    :aria-label="title"
    :aria-description="description"
  >
    <header v-if="!existingTitle || error" class="xnet-context-header">
      <div class="xnet-page-identity">
        <h1>{{ title }}</h1>
        <span class="xnet-domain">{{ domain }}</span>
      </div>
      <div v-if="$slots.actions" class="xnet-page-actions">
        <slot name="actions" />
      </div>
    </header>
    <div class="xnet-page-content">
      <Alert
        v-if="error"
        type="error"
        show-icon
        :message="error"
        class="xnet-read-error"
      >
        <template #action
          ><Button :loading="loading" @click="$emit('retry')"
            >重试读取</Button
          ></template
        >
      </Alert>
      <slot v-else />
    </div>
  </section>
</template>
