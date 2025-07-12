import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    // 一级主页设置
    meta: {
      icon: 'ic:baseline-view-in-ar',
      keepAlive: true,
      order: 2,
      // 一级标题的名字
      title: $t('page.DPP.title'),
      // 权限控制
      authority: ['super', 'admin', 'user'],
    },

    name: 'DPP:manager',
    path: '/DPP',
    children: [
      {
        // 二级级主页设置
        meta: {
          icon: '',
          menuVisibleWithForbidden: true,
          title: $t('数据任务'),
        },
        name: 'DPP:Datatask:index',
        path: '/DPP/Datatask/index',
        // @ts-ignore 忽略报错
        component: () => import('#/views/DPP/Datatask/index.vue'),
      },
      {
        // 二级级主页设置
        meta: {
          icon: '',
          menuVisibleWithForbidden: true,
          title: $t('数据集'),
        },
        name: 'DPP:dataset:index',
        path: '/DPP/dataset/index',
        // @ts-ignore 忽略报错
        component: () => import('#/views/DPP/dataset/index.vue'),
      },

      {
        // 二级级主页设置
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('新增数据集'),
        },
        name: 'DPP:dataset:datafileCreate',
        path: '/DPP/dataset/datafileCreate',
        // @ts-ignore 忽略报错
        component: () => import('#/views/DPP/dataset/datafileCreate.vue'),
      },
      {
        // 二级级主页设置
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('新增数据任务'),
        },
        name: 'DPP:Datatask:task',
        path: '/DPP/Datatask/task',
        // @ts-ignore 忽略报错
        component: () => import('#/views/DPP/Datatask/datataskCreate.vue'),
      },
      {
        // 二级级主页设置
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('修改数据集'),
        },
        name: 'DPP:dataset:datafileModify',
        path: '/DPP/dataset/datafileModify',
        // @ts-ignore 忽略报错
        component: () => import('#/views/DPP/dataset/datafileModify.vue'),
      },
      {
        // 二级级主页设置
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('修改数据集'),
        },
        name: 'DPP:dataset:datafileManager',
        path: '/DPP/dataset/datafileManager',
        // @ts-ignore 忽略报错
        component: () => import('#/views/DPP/dataset/datafileManager.vue'),
      },
    ],
  },
];

export default routes;
