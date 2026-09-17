<div align="center">

[简体中文](./README.md) | **English** | [日本語](./README.ja-JP.md)

# XnetMLops Web

**Web console for model engineering, serving, resources, RAG, and agents**

[![GOAI release](https://img.shields.io/badge/GOAI_release-1.3.0-1677ff.svg)](https://github.com/synapxnet/XnetMLops-web/releases/tag/v1.3.0) [![Vue](https://img.shields.io/badge/Vue-3-42b883.svg)](https://vuejs.org/) [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)](https://www.typescriptlang.org/) [![License](https://img.shields.io/badge/license-MIT-2ea44f.svg)](./LICENSE)

[Live Demo](https://goai.xnetmlops.synapxnet.online) · [Backend: XnetMLops](https://github.com/synapxnet/XnetMLops/tree/v1.3.0) · [OpenXnet](https://openxnet.synapxnet.com) · [License](./LICENSE)

</div>

## GOAI v1.3.0 — release and downloads

This default `display` branch retains the earlier showcase code. The **GOAI v1.3.0 release** and current finals source are available through the links below; this documentation update does not upgrade this branch's application code.

**[Release notes](https://github.com/synapxnet/XnetMLops-web/releases/tag/v1.3.0) · [Download source ZIP](https://github.com/synapxnet/XnetMLops-web/releases/download/v1.3.0/XnetMLops-web-v1.3.0-0a0ce65a-source.zip) · [Pinned v1.3.0 source](https://github.com/synapxnet/XnetMLops-web/tree/v1.3.0) · [Build and delivery guide](https://github.com/synapxnet/XnetMLops-web/blob/0a0ce65a4b654b372355800057f30e8fc551b883/docs/GOAI-FINALS-V1.3.0-SOURCE-DELIVERY.md)**

[Matching backend v1.3.0](https://github.com/synapxnet/XnetMLops/releases/tag/v1.3.0) · [OpenXnet v1.3.0](https://github.com/synapxnet/OpenXnet/releases/tag/v1.3.0)

The GOAI release includes a resident Agent panel, unified login/navigation, model evidence, workflow input/output contracts, download progress and deployment capability states. Its product entry is `apps/web-antd`.

The [resident Agent runtime](https://github.com/synapxnet/OpenXnet/tree/c841ef841da8477fc312e27cd390aecac8ed2d7e/services/platform-resident-agent) runs as a separate platform service and cooperates with OpenXnet AgentTeams; it requires platform identity, model configuration and delegated permissions. The built-in assistant alone is not proof of a configured resident runtime.

Validation: 11/11 build tasks, 31 targeted tests and 69 page-template checks passed. Full vue-tsc, live integration and page-by-page online acceptance were not performed in this source delivery. Publishing this version does not redeploy online services or certify production readiness. See the delivery guide for configuration and limitations.

> **Historical UI screenshots below:** these showcase images are retained for context. They are not the current v1.3.0 UI acceptance evidence or a record of live governance execution.

![XnetMLops analytics center](./docs/images/xnetmlops-analytics-2026.png)

## Product Tour

| Dataset management | RAG knowledge base |
| --- | --- |
| ![Datasets](./docs/images/xnetmlops-dpp-datasets.png) | ![RAG](./docs/images/xnetmlops-dpp-knowledge-base.png) |
| Training jobs | Model deployments |
| ![Training](./docs/images/xnetmlops-mtp-training.png) | ![Deployment](./docs/images/xnetmlops-mep-deployments.png) |
| Workstations | Agent workflows |
| ![Workstations](./docs/images/xnetmlops-smp-workstations.png) | ![Workflows](./docs/images/xnetmlops-xaa-workflows.png) |
| Meta-skills | AI assistants |
| ![Skills](./docs/images/xnetmlops-xaa-skills.png) | ![Assistants](./docs/images/xnetmlops-xaa-assistants.png) |
| Demo login | About |
| ![Login](./docs/images/xnetmlops-login.png) | ![About](./docs/images/xnetmlops-about.png) |

## Overview

XnetMLops Web is the open-source model engineering console maintained by the **SynapXnet team**. It gives data engineers, ML engineers, platform administrators, and AI application developers one workspace for data processing, training, model services, resources, RAG, and agents.

Together with the [XnetMLops backend](https://github.com/synapxnet/XnetMLops/tree/v1.3.0), it forms an enterprise-grade, multi-tenant, frontend/backend-separated system. The frontend uses Vue 3, TypeScript, Vite, Ant Design Vue, and the [Vue Vben Admin framework](https://github.com/vbenjs/vue-vben-admin).

## Highlights

- Enterprise multi-tenancy across tenants, departments, teams, and permissions.
- Complete workflow from data preparation and scheduled training to serving and agents.
- Independent frontend delivery and modular routes.
- Consistent long-running task status, logs, and resource views.
- Continuous updates from the SynapXnet team.

## Modules

| Module | Capability |
| --- | --- |
| DPP | Datasets, preprocessing, features, pipelines, RAG, and Jenkins jobs |
| MTP | Algorithms, training jobs, schedules, parameters, logs, and artifacts |
| MEP | Model deployments, LLM services, API keys, nodes, and OpenClaw |
| SMP | Tenants, teams, sources, storage, workstations, Hadoop, Jenkins, Harbor |
| XAA | Assistants, conversations, visual workflows, skills, and orchestration |
| Overview/Auth | Platform metrics, workspace, demo login, and access control |

## Development and build (v1.3.0)

Use Node.js **20.10+**, pnpm **9.15.7**, Vue 3, TypeScript, Vite/Turbo and Ant Design Vue/Vben. The actual product entry is `apps/web-antd`; `playground`, `web-ele` and `web-naive` are not the MLOps release entry.

```bash
git clone --branch v1.3.0 --single-branch https://github.com/synapxnet/XnetMLops-web.git
cd XnetMLops-web
corepack enable
corepack prepare pnpm@9.15.7 --activate
pnpm install --frozen-lockfile
pnpm build:antd
```

The static output is `apps/web-antd/dist`. If dependency lifecycle scripts were disabled, run `pnpm -r --if-present run stub` before building. To start development, first update the proxy targets in `apps/web-antd/vite.config.mts` for your own backend, then run `pnpm dev:antd` (configured port: `5666`). The checked-in proxy targets are development examples, not the public demo origin.

Configure the API prefixes in `apps/web-antd/.env.production` and the deployment's same-origin reverse proxy together. Only `VITE_GLOB_API_URL` was observed in the live `_app.config.js`; do not assume editing that one file updates every service. The backend's generic Nginx template uses a different `/api/<service>/` scheme and requires alignment before use. Preserve both frontend path rewrites and backend controller prefixes. Never publish tokens or model keys in frontend configuration.

## Demo access and API routes

- GOAI demo: <https://goai.xnetmlops.synapxnet.online/#/auth/login>.
- Public demo account: **`17870171303`**; verification code: **`000000`** (demo environment only, publication authorized by the project owner). Login uses an **11-digit mobile number and a 6-digit verification code** through `POST /api/auth/login`; it is not a password login or the OpenXnet AgentTeams access-code field.
- On 2026-09-18, the site returned HTTP 200 with title `XnetMLops`. An authenticated read of `/api/resident/v1/status` returned `platform=mlops` and `agentId=agt-mlops-resident-v130`; the same read without login returned 401. This verifies platform identity and access control, not a new full business-flow acceptance.

All web API routes use the same origin as the demo:

| Service | Frontend API base | Backend service port |
| --- | --- | --- |
| Auth | `/api` | `8181` |
| DPP | `/dpp` | `8182` |
| MTP | `/mtp` | `8183` |
| MEP | `/mep` | `8184` |
| SMP | `/smp` | `8185` |
| XAA | `/xaa` | `8186` |


The resident API base is `/api/resident/v1`. Platform login, resident model-provider keys and OpenXnet AgentTeams demo access codes are different credentials. Subsequent feature calls remain subject to tenant/team permissions and execution approval.

## License and Upstream

Released under the [MIT License](./LICENSE). The frontend uses [Vue Vben Admin](https://github.com/vbenjs/vue-vben-admin); its upstream MIT copyright and license notices are retained.

XnetMLops is part of [OpenXnet](https://openxnet.synapxnet.com). Copyright © 2026 SynapXnet.
