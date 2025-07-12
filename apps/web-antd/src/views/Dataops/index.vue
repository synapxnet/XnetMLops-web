<script lang="ts" setup>
import type {} from '@vben/common-ui';

import { useRouter } from 'vue-router';

import { DataopsHeader, DataopsProject } from '@vben/common-ui';
import { preferences } from '@vben/preferences';
import { useUserStore } from '@vben/stores';
import { openWindow } from '@vben/utils';

const userStore = useUserStore();

// 这是一个示例数据，实际项目中需要根据实际情况进行调整
// url 也可以是内部路由，在 navTo 方法中识别处理，进行内部跳转
// 例如：url: /dashboard/workspace
const Datalakes: DataopsProjectItem[] = [
  {
    color: '#e18525',
    content: '创建数据湖',
    date: '2021-04-01',
    group: '开源组',
    icon: 'carbon:add-filled',
    title: '创建数据湖',
    url: '/Dataops/Datalakes/datalakes-create',
  },
  {
    color: '#FF0000',
    content: '创建数据域',
    date: '2021-04-01',
    group: '算法组',
    icon: 'carbon:subtract-filled',
    title: '删除数据湖',
    url: '/Dataops/Datalakes/datalakes-delete',
  },
  {
    color: '#3fb27f',
    content: '创建子数据域',
    date: '2021-04-01',
    group: '上班摸鱼',
    icon: 'carbon:ibm-elo-method-composer',
    title: '重命名数据湖',
    url: '/Dataops/Datalakes/datalakes-rename',
  },
];
// 同样，这里的 url 也可以使用以 http 开头的外部链接
const Datadomain: DataopsProjectItem[] = [
  {
    color: '#e18525',
    content: '创建数据域',
    date: '2021-04-01',
    group: '开源组',
    icon: 'carbon:add-filled',
    title: '创建数据域',
    url: '/Dataops/Datadomain/datadomain-create',
  },
  {
    color: '#FF0000',
    content: '删除数据域',
    date: '2021-04-01',
    group: '算法组',
    icon: 'carbon:subtract-filled',
    title: '删除数据域',
    url: '/Dataops/Datadomain/datadomain-delete',
  },
  {
    color: '#3fb27f',
    content: '重命名数据域',
    date: '2021-04-01',
    group: '上班摸鱼',
    icon: 'carbon:ibm-elo-method-composer',
    title: '重命名数据域',
    url: '/Dataops/Datadomain/datadomain-rename',
  },
];
// 子数据域创建
const Subdatadomain: DataopsProjectItem[] = [
  {
    color: '#e18525',
    content: '创建子数据域',
    date: '2021-04-01',
    group: '开源组',
    icon: 'carbon:add-filled',
    title: '创建子数据域',
    url: '/Dataops/Subdatadomain/subdatadomain-create',
  },
  {
    color: '#FF0000',
    content: '删除子数据域',
    date: '2021-04-01',
    group: '算法组',
    icon: 'carbon:subtract-filled',
    title: '删除子数据域',
    url: '/Dataops/Subdatadomain/subdatadomain-delete',
  },
  {
    color: '#3fb27f',
    content: '重命名子数据域',
    date: '2021-04-01',

    group: '上班摸鱼',
    icon: 'carbon:ibm-elo-method-composer',
    title: '重命名子数据域',
    url: '/Dataops/Subdatadomain/subdatadomain-rename',
  },
];

const router = useRouter();

// 这是一个示例方法，实际项目中需要根据实际情况进行调整
// This is a sample method, adjust according to the actual project requirements
function navTo(nav: DataopsProjectItem | DataopsProjectItem) {
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
    <DataopsHeader
      :avatar="userStore.userInfo?.avatar || preferences.app.defaultAvatar"
    >
      <template #title>
        早安, {{ userStore.userInfo?.realName }}, 开始您一天的工作吧！
      </template>
      <template #description> 今日晴，20℃ - 32℃！ </template>
    </DataopsHeader>

    <div class="mt-5 flex flex-col lg:flex-row">
      <div class="mr-4 w-full lg:w-1/3">
        <DataopsProject :items="Datalakes" title="数据湖管理" @click="navTo" />
      </div>
      <div class="mr-4 w-full lg:w-1/3">
        <DataopsProject
          :items="Datadomain"
          class="mt-5 lg:mt-0"
          title="数据域管理"
          @click="navTo"
        />
      </div>
      <div class="mr-4 w-full lg:w-1/3">
        <DataopsProject
          :items="Subdatadomain"
          class="mt-5 lg:mt-0"
          title="子数据域管理"
          @click="navTo"
        />
      </div>
    </div>
  </div>
</template>
