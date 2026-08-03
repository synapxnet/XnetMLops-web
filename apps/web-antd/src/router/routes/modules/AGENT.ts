import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    children: [
      {
        component: () => import('#/views/AGENT/incident/model-evidence.vue'),
        meta: { hideInMenu: true, title: '模型部署证据' },
        name: 'AgentModelEvidence',
        path: '/agent/incidents/:incidentId/model-evidence',
      },
    ],
    meta: { hideInMenu: true, title: 'Agent Trace' },
    name: 'AgentTrace',
    path: '/agent',
  },
];

export default routes;
