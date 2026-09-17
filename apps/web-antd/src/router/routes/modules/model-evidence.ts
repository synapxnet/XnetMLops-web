/*
 * Copyright (C) 2026 Synapxnet. All rights reserved.
 * This file is Synapxnet Proprietary and Confidential. It is strictly
 * forbidden to copy, distribute, or use without explicit authorization.
 * 独立模型证据导航入口。 / Independent navigation for model evidence.
 * Author: maoyo | Department: 研发部 | Date: 2026-09-13
 * Version: 1.0.0 | Security Level: INTERNAL | Maintainer: maoyo
 * Email: synapxnet@gmail.com
 */
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    name: 'MTPModelEvidenceWorkspace',
    path: '/MTP/model-evidence',
    meta: {
      authority: ['super', 'admin', 'user'],
      icon: 'lucide:flask-conical',
      hideInMenu: true,
      order: 2.9,
      title: '模型证据',
    },
    // 作为模型输出和工作台进入的深链页面，不单独占用侧边栏。 / Keep this as a deep-link page from model output and the workbench.
    component: () => import('#/views/MTP/model-evidence/index.vue'),
  },
];

export default routes;
