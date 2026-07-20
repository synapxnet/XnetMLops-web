import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    // 一级主页设置
    meta: {
      icon: 'ic:baseline-view-in-ar',
      keepAlive: true,
      order: 1000,
      // 一级标题的名字
      title: $t('Dataops'),
      // 权限控制
      authority: ['super', 'admin'],
    },

    name: 'Dataops:manager',
    path: '/Dataops',
    children: [
      {
        // 二级级主页设置
        meta: {
          icon: 'streamline:align-front-1-solid',
          menuVisibleWithForbidden: true,
          title: $t('数据域管理'),
        },
        name: 'Dataops:index',
        path: '/Dataops/index',
        // @ts-ignore 忽略报错
        component: () => import('#/views/Dataops/index.vue'),
      },
      // 数据湖
      {
        meta: {
          hideInMenu: true,
          title: $t('数据湖创建'),
        },
        name: 'Dataops:datalakes-create',
        path: '/Dataops/Datalakes/datalakes-create',
        // @ts-ignore 忽略报错
        component: () =>
          import('#/views/Dataops/Datalakes/datalakes-create.vue'),
      },
      {
        meta: {
          hideInMenu: true,
          title: $t('数据湖删除'),
        },
        name: 'Dataops:datalakes-delete',
        path: '/Dataops/Datalakes/datalakes-delete',
        // @ts-ignore 忽略报错
        component: () =>
          import('#/views/Dataops/Datalakes/datalakes-delete.vue'),
      },
      {
        meta: {
          hideInMenu: true,
          title: $t('数据湖重命名'),
        },
        name: 'Dataops:datalakes-rename',
        path: '/Dataops/Datalakes/datalakes-rename',
        // @ts-ignore 忽略报错
        component: () =>
          import('#/views/Dataops/Datalakes/datalakes-rename.vue'),
      },
      // 数据域
      {
        meta: {
          hideInMenu: true,
          title: $t('数据域创建'),
        },
        name: 'Dataops:datadomain-create',
        path: '/Dataops/Datadomain/datadomain-create',
        // @ts-ignore 忽略报错
        component: () =>
          import('#/views/Dataops/Datadomain/datadomain-create.vue'),
      },
      {
        meta: {
          hideInMenu: true,
          title: $t('数据域删除'),
        },
        name: 'Dataops:datadomain-delete',
        path: '/Dataops/Datadomain/datadomain-delete',
        // @ts-ignore 忽略报错
        component: () =>
          import('#/views/Dataops/Datadomain/datadomain-delete.vue'),
      },
      {
        meta: {
          hideInMenu: true,
          title: $t('数据域重命名'),
        },
        name: 'Dataops:datadomain-rename',
        path: '/Dataops/Datadomain/datadomain-rename',
        // @ts-ignore 忽略报错
        component: () =>
          import('#/views/Dataops/Datadomain/datadomain-rename.vue'),
      },

      // 子数据域
      {
        meta: {
          hideInMenu: true,
          title: $t('子数据域创建'),
        },
        name: 'Dataops:subdatadomain-create',
        path: '/Dataops/Subdatadomain/subdatadomain-create',
        // @ts-ignore 忽略报错
        component: () =>
          import('#/views/Dataops/Subdatadomain/subdatadomain-create.vue'),
      },
      {
        meta: {
          hideInMenu: true,
          title: $t('子数据域删除'),
        },
        name: 'Dataops:subdatadomain-delete',
        path: '/Dataops/Subdatadomain/subdatadomain-delete',
        // @ts-ignore 忽略报错
        component: () =>
          import('#/views/Dataops/Subdatadomain/subdatadomain-delete.vue'),
      },
      {
        meta: {
          hideInMenu: true,
          title: $t('子数据域重命名'),
        },
        name: 'Dataops:subdatadomain-rename',
        path: '/Dataops/Subdatadomain/subdatadomain-rename',
        // @ts-ignore 忽略报错
        component: () =>
          import('#/views/Dataops/Subdatadomain/subdatadomain-rename.vue'),
      },
    ],
  },
];

export default routes;
