<div align="center">

[简体中文](./README.md) | [English](./README.en-US.md) | **日本語**

# XnetMLops Web

**モデル開発、配備、リソース、RAG、エージェントの Web コンソール**

[![Version](https://img.shields.io/badge/version-1.0.0-1677ff.svg)](https://www.xnetmlops.synapxnet.cn) [![Vue](https://img.shields.io/badge/Vue-3-42b883.svg)](https://vuejs.org/) [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)](https://www.typescriptlang.org/) [![License](https://img.shields.io/badge/license-MIT-2ea44f.svg)](./LICENSE)

[オンラインデモ](https://www.xnetmlops.synapxnet.cn) · [バックエンド: XnetMLops](https://github.com/synapxnet/XnetMLops) · [OpenXnet](https://openxnet.synapxnet.com) · [ライセンス](./LICENSE)

</div>

![XnetMLops MLOps 分析センター](./docs/images/xnetmlops-analytics-2026.png)

## 画面プレビュー

| データセット管理 | RAG ナレッジベース |
| --- | --- |
| ![データセット](./docs/images/xnetmlops-dpp-datasets.png) | ![RAG](./docs/images/xnetmlops-dpp-knowledge-base.png) |
| 学習ジョブ | モデル配備 |
| ![学習](./docs/images/xnetmlops-mtp-training.png) | ![配備](./docs/images/xnetmlops-mep-deployments.png) |
| ワークステーション | エージェントワークフロー |
| ![ワークステーション](./docs/images/xnetmlops-smp-workstations.png) | ![ワークフロー](./docs/images/xnetmlops-xaa-workflows.png) |
| メタスキル | AI アシスタント |
| ![スキル](./docs/images/xnetmlops-xaa-skills.png) | ![アシスタント](./docs/images/xnetmlops-xaa-assistants.png) |
| デモログイン | プロジェクト情報 |
| ![ログイン](./docs/images/xnetmlops-login.png) | ![プロジェクト情報](./docs/images/xnetmlops-about.png) |

## 概要

XnetMLops Web は **SynapXnet チーム**が公開するモデルエンジニアリングコンソールです。データエンジニア、ML エンジニア、プラットフォーム管理者、AI アプリ開発者に、データ処理、学習、モデルサービス、リソース、RAG、エージェントの統合ワークスペースを提供します。

[XnetMLops バックエンド](https://github.com/synapxnet/XnetMLops) と組み合わせることで、企業向けマルチテナント、フロントエンド・バックエンド分離システムを構成します。Vue 3、TypeScript、Vite、Ant Design Vue、および [Vue Vben Admin](https://github.com/vbenjs/vue-vben-admin) を採用しています。

## 特長

- テナント、部門、チーム、権限を横断する企業向けマルチテナント。
- データ準備、定期学習、モデル配備、エージェントまでの一貫した工程。
- フロントエンドの独立配備とモジュール化ルート。
- 長時間タスク、ログ、リソース状態を一貫して可視化。
- SynapXnet チームによる継続的な更新。

## モジュール

| モジュール | 主な機能 |
| --- | --- |
| DPP | データセット、前処理、特徴量、パイプライン、RAG |
| MTP | アルゴリズム、学習、スケジュール、パラメータ、成果物 |
| MEP | モデル配備、LLM、API キー、ノード、OpenClaw |
| SMP | テナント、チーム、データソース、ストレージ、計算資源 |
| XAA | アシスタント、会話、ワークフロー、スキル、編成 |
| 概要・認証 | プラットフォーム指標、デモログイン、アクセス制御 |

## 開発

```bash
corepack enable
pnpm install
pnpm dev:antd
pnpm build:antd
```

Node.js 20+ と pnpm 9.15.7 を使用してください。本番の認証情報やトークンをコミットしないでください。

## デモ

- URL: <https://www.xnetmlops.synapxnet.cn>
- 電話番号: `12345678900`
- 確認コード: `000000`

固定確認コードは公開デモ専用です。本番環境では安全な認証方式を使用してください。

## ライセンスと上流プロジェクト

[MIT License](./LICENSE) の下で公開されています。フロントエンドは [Vue Vben Admin](https://github.com/vbenjs/vue-vben-admin) を採用し、上流プロジェクトの MIT 著作権・ライセンス表示を保持しています。

XnetMLops は [OpenXnet](https://openxnet.synapxnet.com) の一部です。Copyright © 2026 SynapXnet.
