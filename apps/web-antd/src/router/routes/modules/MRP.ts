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
      title: $t('page.MRP.title'),
      // 权限控制
      authority: ['super', 'admin', 'user'],
    },

    name: 'MRP:manager',
    path: '/MRP',
    children: [
      {
        // 二级级主页设置
        meta: {
          icon: '',
          menuVisibleWithForbidden: true,
          title: $t('数据处理平台'),
        },
        name: 'MRP:index',
        path: '/MRP/index',
        // @ts-ignore 忽略报错
        component: () => import('#/views/MRP/index.vue'),
      },
    ],
  },
];

export default routes;
