<script lang="ts" setup>
import type {
  WorkbenchProjectItem,
  WorkbenchQuickNavItem,
} from '@vben/common-ui';

import { useRouter } from 'vue-router';

import { WorkbenchProject } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';
import { openWindow } from '@vben/utils';

import { Card } from 'ant-design-vue';

const userStore = useUserStore();

// 这是一个示例数据，实际项目中需要根据实际情况进行调整
// url 也可以是内部路由，在 navTo 方法中识别处理，进行内部跳转
// 例如：url: /dashboard/workspace
const projectItems: WorkbenchProjectItem[] = [
  {
    color: '',
    icon: 'carbon:logo-github',
    title: 'Git仓库',
    content: '代码仓库凭证',
    group: 'DPP/MTP',
    date: '2021-04-01',
    url: '/SMP/MTPManage/GitManage',
  },
  {
    color: '',
    icon: 'carbon:logo-github',
    title: '镜像仓库',
    content: '容器pod',
    group: 'MTP',
    date: '2021-04-01',
    url: '/SMP/MTPManage/ImageManage',
  },
  {
    color: '',
    icon: 'carbon:logo-github',
    title: '镜像创建',
    content: '容器pod',
    group: 'MTP',
    date: '2021-04-01',
    url: '/SMP/MTPManage/ImageCreate',
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
  <div class="p-5">
    <Card>
      <div class="mr-4 w-full">
        <WorkbenchProject :items="projectItems" title="项目" @click="navTo" />
      </div>
    </Card>
  </div>
</template>
