import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    // 一级主页设置
    meta: {
      icon: 'ic:baseline-view-in-ar',
      keepAlive: true,
      order: 3,
      // 一级标题的名字
      title: $t('page.MTP.title'),
      // 权限控制
      authority: ['super', 'admin', 'user'],
    },

    name: 'MTP:manager',
    path: '/MTP',
    children: [
      {
        // 二级级主页设置
        meta: {
          icon: '',
          menuVisibleWithForbidden: true,
          title: $t('page.MTP.modelalgorithm'),
        },
        name: 'MTP:algorithm',
        path: '/MTP/algorithm/index',
        // @ts-ignore 忽略报错
        component: () => import('#/views/MTP/algorithm/index.vue'),
      },
      {
        // 二级级主页设置
        meta: {
          icon: '',
          menuVisibleWithForbidden: true,
          title: $t('page.MTP.modeltrain'),
        },
        name: 'MTP:modeltrain',
        path: '/MTP/train/index',
        // @ts-ignore 忽略报错
        component: () => import('#/views/MTP/train/index.vue'),
      },
      {
        // 二级级主页设置
        meta: {
          icon: '',
          menuVisibleWithForbidden: true,
          title: $t('page.MTP.modeloutput'),
        },
        name: 'MTP:modeloutput:index',
        path: '/MTP/modeloutput/index',
        // @ts-ignore 忽略报错
        component: () => import('#/views/MTP/output/index.vue'),
      },
      {
        // 二级级主页设置
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('新增输出模型'),
        },
        name: 'MTP:modeloutput:outputcreate',
        path: '/MTP/modeloutput/outputcreate',
        // @ts-ignore 忽略报错
        component: () => import('#/views/MTP/output/outputCreate.vue'),
      },
      {
        // 二级级主页设置
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('page.MTP.modeltrain'),
        },
        name: 'MTP:train:task',
        path: '/MTP/train/task',
        // @ts-ignore 忽略报错
        component: () => import('#/views/MTP/train/task/TaskCreate.vue'),
      },
      {
        // 二级级主页设置
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('page.MTP.modeltrain'),
        },
        name: 'MTP:algorithm:algorithmCreate',
        path: '/MTP/algorithm/algorithmCreate',
        // @ts-ignore 忽略报错
        component: () => import('#/views/MTP/algorithm/algorithmCreate.vue'),
      },
      {
        // 二级级主页设置
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('page.MTP.modeltrain'),
        },
        name: 'MTP:algorithm:algorithmModify',
        path: '/MTP/algorithm/algorithmModify',
        // @ts-ignore 忽略报错
        component: () => import('#/views/MTP/algorithm/algorithmModify.vue'),
      },
      {
        // 算法文件管理器页面（不在菜单显示）
        meta: {
          icon: '',
          hideInMenu: true,
          title: '算法文件管理',
        },
        name: 'MTP:algorithm:algorithmFileManager',
        path: '/MTP/algorithm/algorithmFileManager',
        // @ts-ignore 忽略报错
        component: () =>
          import('#/views/MTP/algorithm/algorithmFileManager.vue'),
      },
      {
        // 任务详情页面（不在菜单显示）
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('page.MTP.modeltrain'),
        },
        name: 'MTP:train:job',
        path: '/MTP/train/job',
        // @ts-ignore 忽略报错
        component: () => import('#/views/MTP/train/job/JobManager.vue'),
      },
    ],
  },
];

export default routes;
