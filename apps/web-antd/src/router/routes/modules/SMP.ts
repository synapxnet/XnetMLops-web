import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    // 一级主页设置
    meta: {
      icon: 'ic:baseline-view-in-ar',
      keepAlive: true,
      order: 4,
      // 一级标题的名字
      title: $t('page.SMP.title'),
      // 权限控制
      authority: ['super', 'admin', 'user'],
    },

    name: 'SMP:manager',
    path: '/SMP',
    children: [
      {
        // 二级级主页设置
        meta: {
          icon: '',
          menuVisibleWithForbidden: true,
          title: $t('DPP-数据集配置项'),
        },
        name: 'SMP:DPPManage:index',
        path: '/SMP/DPPManage/index',
        // @ts-ignore 忽略报错
        component: () => import('#/views/SMP/DPPManage/index.vue'),
      },
      {
        // 二级级主页设置
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('DPP-数据集配置项'),
        },
        name: 'SMP:DPPManage:DatasetConfigManage',
        path: '/SMP/DPPManage/DatasetConfigManage',
        // @ts-ignore 忽略报错
        component: () =>
          import('#/views/SMP/DPPManage/DatasetConfigManage.vue'),
      },
      {
        // 二级级主页设置
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('DPP-数据集配置项'),
        },
        name: 'SMP:DPPManage:BucketConfigManage',
        path: '/SMP/DPPManage/BucketConfigManage',
        // @ts-ignore 忽略报错
        component: () => import('#/views/SMP/DPPManage/BucketConfigManage.vue'),
      },
      {
        // 二级级主页设置
        meta: {
          icon: '',
          menuVisibleWithForbidden: true,
          title: $t('MTP-训练配置项'),
        },
        name: 'SMP:MTPManage:index',
        path: '/SMP/MTPManage/index',
        // @ts-ignore 忽略报错
        component: () => import('#/views/SMP/MTPManage/index.vue'),
      },
      {
        // 二级级主页设置
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('MTP-训练配置项'),
        },
        name: 'SMP:MTPManage:GitManage',

        path: '/SMP/MTPManage/GitManage',
        // @ts-ignore 忽略报错
        component: () => import('#/views/SMP/MTPManage/GitManage.vue'),
      },
      {
        // 二级级主页设置
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('MTP-镜像配置项'),
        },
        name: 'SMP:MTPManage:ImageManage',

        path: '/SMP/MTPManage/ImageManage',
        // @ts-ignore 忽略报错
        component: () => import('#/views/SMP/MTPManage/ImageManage.vue'),
      },
      {
        // 二级级主页设置
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('MTP-镜像配置项'),
        },
        name: 'SMP:MTPManage:ImageCreate',

        path: '/SMP/MTPManage/ImageCreate',
        // @ts-ignore 忽略报错
        component: () => import('#/views/SMP/MTPManage/ImageCreate.vue'),
      },
    ],
  },
];

export default routes;
