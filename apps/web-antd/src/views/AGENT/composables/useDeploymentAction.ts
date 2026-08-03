import { onBeforeUnmount, ref } from 'vue';

import { getDeploymentAction } from '../api/mlopsTool';
import type { DeploymentAction } from '../api/mlopsTool';
import type { IncidentContext } from '../api/types';

const TERMINAL_STATES = new Set(['CANCELLED', 'FAILED', 'REJECTED', 'SUCCEEDED']);

/**
 * 轮询持久化部署动作：1 秒起步退避至 5 秒，页面隐藏和组件卸载时停止请求。
 *
 * @returns 动作状态、轮询错误和启动/停止方法
 */
export function useDeploymentAction() {
  const action = ref<DeploymentAction>();
  const pollingError = ref('');
  let timer: ReturnType<typeof setTimeout> | undefined;
  let generation = 0;

  /** 停止当前轮询并使在途结果失效。 */
  function stop() {
    generation += 1;
    if (timer) clearTimeout(timer);
    timer = undefined;
  }

  /** 启动新的动作轮询，旧 actionId 的响应不会覆盖新动作。 */
  function start(actionId: string, idempotencyKey: string, context: IncidentContext) {
    stop();
    const currentGeneration = generation;
    let delay = 1_000;

    /** 执行一次动作状态查询并安排下一轮。 */
    async function poll() {
      if (document.hidden || currentGeneration !== generation) {
        timer = setTimeout(poll, delay);
        return;
      }
      try {
        const value = await getDeploymentAction(actionId, idempotencyKey, context);
        if (currentGeneration !== generation) return;
        action.value = value;
        pollingError.value = '';
        if (TERMINAL_STATES.has(value.status)) return;
      } catch {
        pollingError.value = '动作状态暂时无法刷新，后端动作不会因此改变。';
      }
      delay = Math.min(5_000, Math.round(delay * 1.6));
      timer = setTimeout(poll, delay);
    }

    void poll();
  }

  onBeforeUnmount(stop);
  return { action, pollingError, start, stop };
}
