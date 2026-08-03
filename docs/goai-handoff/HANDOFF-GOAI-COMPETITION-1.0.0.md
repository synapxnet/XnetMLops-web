# GOAI Competition 1.0.0 前端交接

- 仓库：`synapxnet/XnetMLops-web`
- 任务：`MLOPS-FE-01`
- Worktree：`D:\synapxnet\.codex-build\goai-competition-1.0.0\XnetMLops-web`
- 分支：`GOAI-Competition`
- 基线提交：`64ecfbc5eae691aba4ada1fbfd9c9574f6017e38`
- 结束提交：见 `GOAI-Competition` 分支候选 HEAD
- 产品/契约版本：`1.0.0`

## 页面与治理边界

深链：

```text
/agent/incidents/inc_model_contract_001/model-evidence?workspaceId=ws_goai_demo&traceId=trace_model_contract_001&deploymentUid=deploy_risk_prod
```

页面显示部署、Runtime readiness、修订、模型契约和独立 Probe。真实回滚前会刷新 `resourceVersion`，要求审批 ID、原因、阈值和幂等键。Dry Run 没有 `actionId` 时明确显示“未创建动作、审计回执，也未修改 Runtime”，不会启动轮询。

动作轮询 1 秒起步并退避至 5 秒；终态停止，组件卸载停止，页面隐藏时暂停网络请求，旧动作响应不能覆盖新动作。

## 配置与联调

Agent Client 指向 MEP Service；配置值由部署环境注入，仓库不保存 Token。后端比赛分支：[`synapxnet/XnetMLops`](https://github.com/synapxnet/XnetMLops/tree/GOAI-Competition)。

## 验证记录

```powershell
node node_modules\vue-tsc\bin\vue-tsc.js --noEmit --skipLibCheck -p <isolated-mlops-tsconfig>
```

结果：本次新增路由、API、Composable 和 Vue 页面 0 类型错误。验证中修复了 UUID 默认参数的窄类型推断和未解构的停止轮询函数；`pnpm build:antd` 生产构建通过，Turbo 11/11 任务成功。全仓 `pnpm -F @vben/web-antd run typecheck` 已执行，但仍被比赛改造前既有 XAA 页面、preferences 命名和表格行类型问题阻塞；这些存量错误不来自 AGENT 页面，需作为仓库级技术债单独关闭。发布 CI 仍需复跑全仓 typecheck、单测、lint 和生产构建。

## 已知限制与回退

- 409、审批过期、进程重启恢复和真实 Docker Action 需在集成环境做浏览器 E2E。
- 回退删除新增 AGENT 路由/页面、API 与 Composable；不会删除后端持久化 Action。
- 客户端超时后应继续读取 Action，不能把超时显示成回滚失败或成功。
