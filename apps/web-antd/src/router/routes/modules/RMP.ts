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
      title: $t('page.RMP.title'),
      // 权限控制
      authority: ['super', 'admin', 'user'],
    },

    name: 'RMP:manager',
    path: '/RMP',
    children: [
      {
        // 二级级主页设置
        meta: {
          icon: '',
          menuVisibleWithForbidden: true,
          title: $t('元数据'),
        },
        name: 'RMP:index',
        path: '/RMP/index',
        // @ts-ignore 忽略报错
        component: () => import('#/views/RMP/index.vue'),
      },
    ],
  },
];

export default routes;
