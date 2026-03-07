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
        // 数据源配置管理（DPP）
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('DPP-数据源配置'),
        },
        name: 'SMP:DPPManage:DataSourceManage',
        path: '/SMP/DPPManage/DataSourceManage',
        // @ts-ignore 忽略报错
        component: () => import('#/views/SMP/DPPManage/DataSourceManage.vue'),
      },
      {
        // 特征算子Git仓库管理
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('DPP-特征算子仓库'),
        },
        name: 'SMP:DPPManage:FeatureOperatorGitManage',
        path: '/SMP/DPPManage/FeatureOperatorGitManage',
        // @ts-ignore 忽略报错
        component: () =>
          import('#/views/SMP/DPPManage/FeatureOperatorGitManage.vue'),
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
      // ==================== 工作站点管理 ====================
      {
        // 工作站点管理
        meta: {
          icon: '',
          menuVisibleWithForbidden: true,
          title: $t('工作站点注册'),
        },
        name: 'SMP:WorkstationManage:index',
        path: '/SMP/WorkstationManage/index',
        // @ts-ignore 忽略报错
        component: () => import('#/views/SMP/WorkstationManage/index.vue'),
      },
      // ==================== 资源配置 ====================
      {
        // Jenkins部署 - 主页面
        meta: {
          icon: '',
          menuVisibleWithForbidden: true,
          title: $t('资源配置'),
        },
        name: 'SMP:JenkinsDeployment:index',
        path: '/SMP/JenkinsDeployment/index',
        // @ts-ignore 忽略报错
        component: () => import('#/views/SMP/JenkinsDeployment/index.vue'),
      },
      {
        // Master节点部署
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('Master节点部署'),
        },
        name: 'SMP:JenkinsDeployment:DeployMaster',
        path: '/SMP/JenkinsDeployment/DeployMaster',
        // @ts-ignore 忽略报错
        component: () =>
          import('#/views/SMP/JenkinsDeployment/DeployMaster.vue'),
      },
      {
        // Node节点部署
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('Node节点部署'),
        },
        name: 'SMP:JenkinsDeployment:DeployNode',
        path: '/SMP/JenkinsDeployment/DeployNode',
        // @ts-ignore 忽略报错
        component: () => import('#/views/SMP/JenkinsDeployment/DeployNode.vue'),
      },
      // ==================== Hadoop 集群部署 ====================
      {
        // Hadoop部署 - 主页面
        meta: {
          icon: '',
          menuVisibleWithForbidden: true,
          title: $t('Hadoop集群部署'),
        },
        name: 'SMP:HadoopDeployment:index',
        path: '/SMP/HadoopDeployment/index',
        // @ts-ignore 忽略报错
        component: () => import('#/views/SMP/HadoopDeployment/index.vue'),
      },
      {
        // Hadoop Master节点部署
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('Hadoop Master部署'),
        },
        name: 'SMP:HadoopDeployment:DeployMaster',
        path: '/SMP/HadoopDeployment/DeployMaster',
        // @ts-ignore 忽略报错
        component: () =>
          import('#/views/SMP/HadoopDeployment/DeployMaster.vue'),
      },
      {
        // Hadoop Node节点部署
        meta: {
          icon: '',
          hideInMenu: true,
          title: $t('Hadoop Node部署'),
        },
        name: 'SMP:HadoopDeployment:DeployNode',
        path: '/SMP/HadoopDeployment/DeployNode',
        // @ts-ignore 忽略报错
        component: () => import('#/views/SMP/HadoopDeployment/DeployNode.vue'),
      },
      // ==================== 集群管理 ====================
      {
        // 集群管理 - 主页面（3D拓扑视图）
        meta: {
          icon: 'carbon:network-3',
          menuVisibleWithForbidden: true,
          title: $t('集群管理'),
        },
        name: 'SMP:ClusterManagement:index',
        path: '/SMP/ClusterManagement/index',
        // @ts-ignore 忽略报错
        component: () => import('#/views/SMP/ClusterManagement/index.vue'),
      },
    ],
  },
];

export default routes;
