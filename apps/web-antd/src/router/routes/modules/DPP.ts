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
        // 通用数据任务复用已接入的真实数据集登记与上传链路。
        component: () => import('#/views/DPP/dataset/datafileCreate.vue'),
      },
      {
        // 二级级主页设置
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('数据集详情'),
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
          title: $t('数据集文件管理'),
        },
        name: 'DPP:dataset:datafileManager',
        path: '/DPP/dataset/datafileManager',
        // @ts-ignore 忽略报错
        component: () => import('#/views/DPP/dataset/datafileManager.vue'),
      },
      {
        // 特征工程列表
        meta: {
          icon: '',
          menuVisibleWithForbidden: true,
          title: $t('特征工程'),
        },
        name: 'DPP:FeatureEngineering:index',
        path: '/DPP/feature-engineering/index',
        // @ts-ignore 忽略报错
        component: () => import('#/views/DPP/FeatureEngineering/index.vue'),
      },
      {
        // 新建特征工程
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('新建特征工程'),
        },
        name: 'DPP:FeatureEngineering:create',
        path: '/DPP/feature-engineering/create',
        // @ts-ignore 忽略报错
        component: () =>
          import('#/views/DPP/FeatureEngineering/FeatureCreate.vue'),
      },
      {
        // 编辑特征工程
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('编辑特征工程'),
        },
        name: 'DPP:FeatureEngineering:edit',
        path: '/DPP/feature-engineering/edit/:id',
        // @ts-ignore 忽略报错
        component: () =>
          import('#/views/DPP/FeatureEngineering/FeatureCreate.vue'),
      },
      // RAG 知识库管理
      {
        meta: {
          icon: '',
          menuVisibleWithForbidden: true,
          title: $t('知识库'),
        },
        name: 'DPP:KnowledgeBase:index',
        path: '/DPP/KnowledgeBase',
        // @ts-ignore 忽略报错
        component: () => import('#/views/DPP/KnowledgeBase/index.vue'),
      },
      {
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('知识库文档管理'),
        },
        name: 'DPP:KnowledgeBase:documents',
        path: '/DPP/KnowledgeBase/documents',
        // @ts-ignore 忽略报错
        component: () => import('#/views/DPP/KnowledgeBase/documents.vue'),
      },
      {
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('知识库检索测试'),
        },
        name: 'DPP:KnowledgeBase:retrieval-test',
        path: '/DPP/KnowledgeBase/retrieval-test',
        // @ts-ignore 忽略报错
        component: () => import('#/views/DPP/KnowledgeBase/retrieval-test.vue'),
      },
    ],
  },
];

export default routes;
