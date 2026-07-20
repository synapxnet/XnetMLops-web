import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    // 一级主页设置 - Xnet-AI-Agent (XAA)
    meta: {
      icon: 'carbon:machine-learning-model',
      keepAlive: true,
      order: 5,
      title: $t('page.XAA.title'),
      authority: ['super', 'admin', 'user'],
    },
    name: 'XAA:manager',
    path: '/XAA',
    children: [
      // ==================== XAW 工作流管理 ====================
      {
        meta: {
          icon: 'carbon:flow',
          menuVisibleWithForbidden: true,
          title: $t('工作流管理'),
        },
        name: 'XAA:workflow:index',
        path: '/XAA/workflow/index',
        component: () => import('#/views/XAA/workflow/index.vue'),
      },
      {
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('创建工作流'),
        },
        name: 'XAA:workflow:create',
        path: '/XAA/workflow/create',
        component: () => import('#/views/XAA/workflow/workflowCreate.vue'),
      },
      {
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('编辑工作流'),
        },
        name: 'XAA:workflow:edit',
        path: '/XAA/workflow/edit',
        component: () => import('#/views/XAA/workflow/workflowEdit.vue'),
      },
      {
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('工作流设计器'),
        },
        name: 'XAA:workflow:designer',
        path: '/XAA/workflow/designer',
        component: () => import('#/views/XAA/workflow/workflowDesigner.vue'),
      },
      {
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('执行记录'),
        },
        name: 'XAA:workflow:executions',
        path: '/XAA/workflow/executions',
        component: () => import('#/views/XAA/workflow/executionList.vue'),
      },
      {
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('执行详情'),
        },
        name: 'XAA:workflow:execution-detail',
        path: '/XAA/workflow/execution-detail',
        component: () => import('#/views/XAA/workflow/executionDetail.vue'),
      },
      // ==================== XAS 技能管理 ====================
      {
        meta: {
          icon: 'carbon:catalog',
          menuVisibleWithForbidden: true,
          title: $t('元技能仓库'),
        },
        name: 'XAA:skill:repository',
        path: '/XAA/skill/repository',
        component: () => import('#/views/XAA/skill/repository/index.vue'),
      },
      {
        meta: {
          icon: 'carbon:package',
          menuVisibleWithForbidden: true,
          title: $t('已安装技能'),
        },
        name: 'XAA:skill:installed',
        path: '/XAA/skill/installed',
        component: () => import('#/views/XAA/skill/installed/index.vue'),
      },
      {
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('创建技能'),
        },
        name: 'XAA:skill:create',
        path: '/XAA/skill/create',
        component: () => import('#/views/XAA/skill/create/index.vue'),
      },
      {
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('技能管理'),
        },
        name: 'XAA:skill:index',
        path: '/XAA/skill/index',
        component: () => import('#/views/XAA/skill/index.vue'),
      },
      // ==================== XAI 智能助手 ====================
      {
        meta: {
          icon: 'carbon:chat-bot',
          menuVisibleWithForbidden: true,
          title: $t('智能助手'),
        },
        name: 'XAA:assistant:index',
        path: '/XAA/assistant/index',
        component: () => import('#/views/XAA/assistant/index.vue'),
      },
      {
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('创建助手'),
        },
        name: 'XAA:assistant:create',
        path: '/XAA/assistant/create',
        component: () => import('#/views/XAA/assistant/create.vue'),
      },
      {
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('编辑助手'),
        },
        name: 'XAA:assistant:edit',
        path: '/XAA/assistant/edit',
        component: () => import('#/views/XAA/assistant/edit.vue'),
      },
      {
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('对话'),
        },
        name: 'XAA:assistant:chat',
        path: '/XAA/assistant/chat',
        component: () => import('#/views/XAA/assistant/chat.vue'),
      },
    ],
  },
];

export default routes;
