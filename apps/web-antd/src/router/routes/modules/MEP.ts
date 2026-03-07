import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'ic:baseline-cloud-upload',
      keepAlive: false,
      order: 4,
      title: $t('page.MEP.title'),
      authority: ['super', 'admin', 'user'],
    },
    name: 'MEP:manager',
    path: '/MEP',
    children: [
      {
        meta: {
          icon: '',
          menuVisibleWithForbidden: true,
          title: $t('page.MEP.llmService'),
        },
        name: 'MEP:llmservice',
        path: '/MEP/llmservice/index',
        component: () => import('#/views/MEP/llmservice/index.vue'),
      },
      {
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('page.MEP.llmServiceCreate'),
        },
        name: 'MEP:llmservice:create',
        path: '/MEP/llmservice/create',
        component: () => import('#/views/MEP/llmservice/serviceCreate.vue'),
      },
      {
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('page.MEP.llmServiceModify'),
        },
        name: 'MEP:llmservice:modify',
        path: '/MEP/llmservice/modify',
        component: () => import('#/views/MEP/llmservice/serviceModify.vue'),
      },
      {
        meta: {
          icon: '',
          menuVisibleWithForbidden: true,
          title: $t('page.MEP.apiKey'),
        },
        name: 'MEP:apikey',
        path: '/MEP/apikey/index',
        component: () => import('#/views/MEP/apikey/index.vue'),
      },
      {
        meta: {
          icon: '',
          menuVisibleWithForbidden: true,
          title: $t('page.MEP.deployment'),
        },
        name: 'MEP:deployment',
        path: '/MEP/deployment/index',
        component: () => import('#/views/MEP/deployment/index.vue'),
      },
      {
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('page.MEP.deploymentCreate'),
        },
        name: 'MEP:deployment:create',
        path: '/MEP/deployment/create',
        component: () => import('#/views/MEP/deployment/deployCreate.vue'),
      },
      {
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('page.MEP.deploymentDetail'),
        },
        name: 'MEP:deployment:detail',
        path: '/MEP/deployment/detail',
        component: () => import('#/views/MEP/deployment/deployDetail.vue'),
      },
      {
        meta: {
          icon: '',
          menuVisibleWithForbidden: true,
          title: $t('page.MEP.nodes'),
        },
        name: 'MEP:nodes',
        path: '/MEP/nodes/index',
        component: () => import('#/views/MEP/nodes/index.vue'),
      },
      {
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('page.MEP.nodeCreate'),
        },
        name: 'MEP:nodes:create',
        path: '/MEP/nodes/create',
        component: () => import('#/views/MEP/nodes/nodeCreate.vue'),
      },
      // ==================== OpenClaw管理 ====================
      {
        meta: {
          icon: 'carbon:chat-bot',
          menuVisibleWithForbidden: true,
          title: $t('OpenClaw部署'),
        },
        name: 'MEP:openclaw',
        path: '/MEP/openclaw/index',
        component: () => import('#/views/MEP/openclaw/index.vue'),
      },
      {
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('创建OpenClaw实例'),
        },
        name: 'MEP:openclaw:create',
        path: '/MEP/openclaw/create',
        component: () => import('#/views/MEP/openclaw/create.vue'),
      },
      {
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('OpenClaw实例详情'),
        },
        name: 'MEP:openclaw:detail',
        path: '/MEP/openclaw/detail',
        component: () => import('#/views/MEP/openclaw/detail.vue'),
      },
    ],
  },
];

export default routes;
