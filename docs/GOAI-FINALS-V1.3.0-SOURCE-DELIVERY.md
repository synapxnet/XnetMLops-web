<!-- Copyright (C) 2026 Synapxnet. All rights reserved.
This file is Synapxnet Proprietary and Confidential. It is strictly forbidden to copy,
distribute, or use without explicit authorization.
源码交付与版本说明 / Source delivery and version notes.
Author: maoyo | Department: 研发部 | Date: 2026-09-17 | Version: 1.3.0
Security Level: INTERNAL | Maintainer: maoyo | Email: synapxnet@gmail.com -->

# XnetMLOps Web GOAI 决赛 V1.3.0 源码交付

根产品及 `apps/web-antd` 版本为 1.3.0；Vben 工作区框架包沿用各自版本。发布入口是 `apps/web-antd`，其余示例应用不是 MLOps 线上入口。

本次包括统一品牌登录、平台导航与驻场 Agent 面板、工作/分析区分、模型证据、真实下载进度及二进制响应处理、工作流输入输出契约、模型部署能力状态和全页交互修订。已合入实际 2026-09-17 登录发布使用的布局与品牌资源。

需要 Node.js 20.10 或以上及 package.json 声明的 pnpm。使用声明的 pnpm 9.15.7 安装依赖后运行 `pnpm build:antd`；若安装时跳过生命周期脚本，先运行 `pnpm -r --if-present run stub`，产物位于 `apps/web-antd/dist`。同源 API 代理、鉴权与服务器地址由部署环境负责。浏览器没有驻场模型密钥明文默认值，模型配置由服务端保存。

后端对应 [XnetMLops GOAI-Competition](https://github.com/synapxnet/XnetMLops/tree/GOAI-Competition) V1.3.0。驻场运行时固定依赖 [OpenXnet c841ef841da8477fc312e27cd390aecac8ed2d7e](https://github.com/synapxnet/OpenXnet/tree/c841ef841da8477fc312e27cd390aecac8ed2d7e/services/platform-resident-agent)。实际部署需要管理员配置同源 resident 代理与平台身份。

本轮在独立源码副本完成 pnpm 9.15.7 冻结锁/离线检查、标准工作区 stub 与 `pnpm build:antd` 生产构建（11/11 构建任务，无缓存命中），以及 31 项针对性回归：24 项 Node 与 7 项 Vitest 全部通过。路由回归覆盖 69 个页面模板的单根节点编译，业务测试覆盖输入输出契约、下载错误包络、训练状态、模型证据、工作流保存、会话消息与认证状态。生产构建与针对性回归不等同于所有业务页面和真实执行环境均已验收。此前发布记录已披露全量 vue-tsc 存在既有类型问题，不宣称全量类型检查通过。

`node_modules`、`dist`、运行日志、缓存、私有配置和真实凭据不提交。回退静态站点时需同时确认 API 契约与当前后端兼容，不能以旧缓存视为已完成升级。

本轮恢复了锁文件与 pnpm 9 overrides 的一致性；全局 pnpm 11 不应代替项目声明版本。构建仍有既有大分包、旧 Browserslist 数据及 commitlint 同级依赖告警，不影响本轮构建退出状态。
