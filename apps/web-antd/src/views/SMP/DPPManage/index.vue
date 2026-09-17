<script lang="ts" setup>
import BusinessPage from '#/components/workspace/BusinessPage.vue';
import type {
  WorkbenchProjectItem,
  WorkbenchQuickNavItem,
} from '@vben/common-ui';

import { useRouter } from 'vue-router';

import { WorkbenchProject } from '@vben/common-ui';
import { openWindow } from '@vben/utils';

import { Card } from 'ant-design-vue';

// 这是一个示例数据，实际项目中需要根据实际情况进行调整
// url 也可以是内部路由，在 navTo 方法中识别处理，进行内部跳转
// 例如：url: /dashboard/workspace
const projectItems: WorkbenchProjectItem[] = [
  {
    color: '#1890ff',
    icon: 'carbon:data-table',
    title: '数据集配置项',
    content: '数据类型及数据区域配置',
    group: 'DPP配置',
    date: '2021-04-01',
    url: '/SMP/DPPManage/DatasetConfigManage',
  },
  {
    color: '#3fb27f',
    icon: 'carbon:cloud-storage',
    title: '存储桶配置',
    content: '子数据域配置',
    date: '2021-04-01',
    group: 'DPP配置',
    url: '/SMP/DPPManage/BucketConfigManage',
  },
  {
    color: '#722ed1',
    icon: 'carbon:data-base',
    title: '数据源配置',
    content: '数据库连接配置（MySQL、PostgreSQL等）',
    group: 'DPP配置',
    date: '2025-01-01',
    url: '/SMP/DPPManage/DataSourceManage',
  },
  {
    color: '#fa8c16',
    icon: 'carbon:logo-github',
    title: '特征算子仓库',
    content: '特征工程算子Git仓库配置',
    group: 'DPP配置',
    date: '2025-01-01',
    url: '/SMP/DPPManage/FeatureOperatorGitManage',
  },
];

const router = useRouter();

// 这是一个示例方法，实际项目中需要根据实际情况进行调整
// This is a sample method, adjust according to the actual project requirements
function navTo(nav: WorkbenchProjectItem | WorkbenchQuickNavItem) {
  if (nav.url?.startsWith('http')) {
    openWindow(nav.url);
    return;
  }
  if (nav.url?.startsWith('/')) {
    router.push(nav.url).catch((error) => {
      console.error('Navigation failed:', error);
    });
  } else {
    console.warn(`Unknown URL for navigation item: ${nav.title} -> ${nav.url}`);
  }
}
</script>

<template>
  <BusinessPage domain="资源配置" description="管理组织内的数据连接、仓库、工作站与计算资源。">
  <div class="p-5">
    <Card>
      <div class="mr-4 w-full">
        <WorkbenchProject :items="projectItems" title="项目" @click="navTo" />
      </div>
    </Card>
  </div>

  </BusinessPage>
</template>
