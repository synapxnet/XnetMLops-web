<div align="center">

[简体中文](./README.md) | **English** | [日本語](./README.ja-JP.md)

# XnetMLops Web

**Web console for model engineering, serving, resources, RAG, and agents**

[![GOAI release](https://img.shields.io/badge/GOAI_release-1.3.0-1677ff.svg)](https://github.com/synapxnet/XnetMLops-web/releases/tag/v1.3.0) [![Vue](https://img.shields.io/badge/Vue-3-42b883.svg)](https://vuejs.org/) [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)](https://www.typescriptlang.org/) [![License](https://img.shields.io/badge/license-MIT-2ea44f.svg)](./LICENSE)

[Live Demo](https://www.xnetmlops.synapxnet.cn) · [Backend: XnetMLops](https://github.com/synapxnet/XnetMLops) · [OpenXnet](https://openxnet.synapxnet.com) · [License](./LICENSE)

</div>

## GOAI v1.3.0 — release and downloads

This default `display` branch retains the earlier showcase code. The **GOAI v1.3.0 release** and current finals source are available through the links below; this documentation update does not upgrade this branch's application code.

**[Release notes](https://github.com/synapxnet/XnetMLops-web/releases/tag/v1.3.0) · [Download source ZIP](https://github.com/synapxnet/XnetMLops-web/releases/download/v1.3.0/XnetMLops-web-v1.3.0-0a0ce65a-source.zip) · [GOAI source branch](https://github.com/synapxnet/XnetMLops-web/tree/GOAI-Competition) · [Build and delivery guide](https://github.com/synapxnet/XnetMLops-web/blob/0a0ce65a4b654b372355800057f30e8fc551b883/docs/GOAI-FINALS-V1.3.0-SOURCE-DELIVERY.md)**

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

Together with the [XnetMLops backend](https://github.com/synapxnet/XnetMLops), it forms an enterprise-grade, multi-tenant, frontend/backend-separated system. The frontend uses Vue 3, TypeScript, Vite, Ant Design Vue, and the [Vue Vben Admin framework](https://github.com/vbenjs/vue-vben-admin).

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

## Development

```bash
corepack enable
pnpm install
pnpm dev:antd
pnpm build:antd
```

Use Node.js 20+ and pnpm 9.15.7. Never commit production credentials or access tokens.

## Demo

- URL: <https://www.xnetmlops.synapxnet.cn>
- Phone: `12345678900`
- Verification code: `000000`

The fixed code is only for the public showcase. Production must use secure authentication.

## License and Upstream

Released under the [MIT License](./LICENSE). The frontend uses [Vue Vben Admin](https://github.com/vbenjs/vue-vben-admin); its upstream MIT copyright and license notices are retained.

XnetMLops is part of [OpenXnet](https://openxnet.synapxnet.com). Copyright © 2026 SynapXnet.
