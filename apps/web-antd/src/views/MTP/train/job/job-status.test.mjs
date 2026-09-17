/*
Copyright (C) 2026 Synapxnet. All rights reserved.
This file is Synapxnet Proprietary and Confidential. It is strictly
forbidden to copy, distribute, or use without explicit authorization.
用途：训练详情失败、原始日志与迟到响应回归。Purpose: Training detail failures, source logs and stale-response regression.
Author: maoyo | Department: 研发部 | Date: 2026-09-14
Version: 1.0.0 | Security Level: INTERNAL
__version__: 1.0.0 | __author__: maoyo | __copyright__: Copyright 2026 Synapxnet
__maintainer__: maoyo | __email__: synapxnet@gmail.com
*/
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { compileScript, compileTemplate, parse } from 'vue/compiler-sfc';
import ts from 'typescript';
import { computed, reactive, ref } from 'vue';
import {
  formatJobTime,
  parsePipelineStatus,
  routeIdentity,
} from './job-status.ts';

/** 建立明确的本地测试作业，不使用产品记录。 Build an explicit fixture job without product data. */
function fixture(overrides = {}) {
  return {
    jobName: 'job-fixture-a',
    overallStatus: 'RUNNING',
    stages: [],
    ...overrides,
  };
}

/** 未知和缺失状态不能被映射为运行或成功。 Unknown and missing statuses cannot become running or succeeded. */
test('missing records and unknown statuses never synthesize job progress', () => {
  assert.throws(() => parsePipelineStatus(null, 'job-fixture-a'));
  assert.throws(() =>
    parsePipelineStatus(fixture({ jobName: 'other' }), 'job-fixture-a'),
  );
  const job = parsePipelineStatus(
    fixture({ overallStatus: 'FUTURE_STATE' }),
    'job-fixture-a',
  );
  assert.match(job.statusLabel, /未知/);
  assert.equal(job.createTime, null);
  assert.equal(job.creator, null);
  assert.equal(job.startTime, null);
  assert.equal(job.elapsedTime, null);
  assert.deepEqual(job.stages, []);
  assert.equal(routeIdentity(['job-fixture-a']), '');
  assert.equal(routeIdentity(undefined), '');
});

/** 阶段保持原始状态与日志，运行中阶段不推算结束时间。 Preserve stage states and logs without deriving completion for running stages. */
test('actual stages retain status and source logs without synthetic cleanup', () => {
  const job = parsePipelineStatus(
    fixture({
      stages: [
        { stageName: '等待资源', status: 'PENDING' },
        {
          stageName: '训练',
          status: 'IN_PROGRESS',
          startTime: '2026-09-14T00:00:00Z',
          durationMillis: 2500,
          logs: ['[raw] fixture message'],
        },
        {
          stageName: '校验',
          status: 'FAILED',
          startTime: '2026-09-14T00:01:00Z',
          durationMillis: 1500,
        },
      ],
    }),
    'job-fixture-a',
  );
  assert.deepEqual(
    job.stages.map((stage) => stage.status),
    ['wait', 'process', 'error'],
  );
  assert.equal(job.stages[1].endTime, null);
  assert.deepEqual(job.stages[1].logs, ['[raw] fixture message']);
  assert.deepEqual(job.stages[2].logs, []);
  assert.equal(job.stages[2].endTimeDerived, true);
  assert.equal(job.stages.length, 3);
});

/** 非法时间和负耗时保持未知，零耗时仍为有效观测。 Invalid dates and negative durations remain unknown while observed zero stays valid. */
test('invalid timestamps and incomplete duration evidence remain unknown', () => {
  const job = parsePipelineStatus(
    fixture({
      stages: [
        {
          stageName: 'invalid',
          status: 'SUCCESS',
          startTime: 'bad-time',
          durationMillis: -1,
        },
        {
          stageName: 'zero',
          status: 'SUCCESS',
          startTime: '2026-09-14T00:00:00Z',
          durationMillis: 0,
        },
        {
          stageName: 'contradictory',
          status: 'SUCCESS',
          startTime: '2026-09-14T00:00:00Z',
          endTime: '2026-09-13T00:00:00Z',
          durationMillis: 1,
        },
      ],
    }),
    'job-fixture-a',
  );
  assert.equal(job.stages[0].startTime, null);
  assert.equal(job.stages[0].endTime, null);
  assert.equal(job.stages[0].duration, null);
  assert.equal(job.stages[1].duration, '00:00:00');
  assert.equal(job.stages[1].endTime, formatJobTime('2026-09-14T00:00:00Z'));
  assert.equal(job.stages[2].endTime, null);
});

/** 执行真实SFC逻辑，仅用受控请求替换网络与挂载。 Execute actual SFC logic with controlled requests and lifecycle hooks. */
function createHarness() {
  const source = readFileSync(
    new URL('./JobManager.vue', import.meta.url),
    'utf8',
  );
  const { descriptor, errors } = parse(source);
  assert.deepEqual(errors, []);
  compileScript(descriptor, { id: 'job-fixture' });
  const template = compileTemplate({
    source: descriptor.template.content,
    filename: 'JobManager.vue',
    id: 'job-fixture',
  });
  assert.deepEqual(template.errors, []);
  const script = ts.transpileModule(
    descriptor.scriptSetup.content.replace(/^import .*;\r?\n/gm, ''),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
      },
    },
  ).outputText;
  const route = reactive({
    query: { id: 'job-fixture-a', tenantUid: 'tenant-fixture' },
  });
  const requests = [];
  const context = {
    computed,
    ref,
    Error,
    parsePipelineStatus,
    routeIdentity,
    /** 读取可控路由，触发计算属性更新。 Read a controlled route with reactive identity updates. */
    useRoute() {
      return route;
    },
    /** 返回测试导航记录器。 Return a fixture navigator. */
    useRouter() {
      return { push() {} };
    },
    /** 测试显式控制首次读取。 Tests explicitly control the initial read. */
    watch() {},
    /** 测试显式调用离页清理。 Tests explicitly invoke disposal. */
    onBeforeUnmount() {},
    /** 保留每次请求和完成回调。 Retain each request and completion callback. */
    fetchPipelineStatus(job, tenant, includeConsole = false) {
      return new Promise((resolve, reject) =>
        requests.push({ job, tenant, includeConsole, resolve, reject }),
      );
    },
  };
  vm.runInNewContext(
    script +
      ';globalThis.app={loadTaskData,viewFullLogs,closeLogs,dispose,taskInfo,error,loading,stages,fullLogs,logsError,logsLoading};',
    context,
  );
  return { app: context.app, requests, route };
}

/** 读取失败必须清除旧成功状态，重试后恢复实际结果。 Failed reads clear old successful state and retries restore actual results. */
test('404 clears old details and a successful retry restores only the returned record', async () => {
  const { app, requests } = createHarness();
  let pending = app.loadTaskData();
  requests[0].resolve(
    fixture({
      overallStatus: 'SUCCESS',
      stages: [{ stageName: 'fixture-stage', status: 'SUCCESS' }],
    }),
  );
  await pending;
  assert.equal(app.stages.value.length, 1);
  pending = app.loadTaskData();
  requests[1].reject(new Error('fixture 404'));
  await pending;
  assert.equal(app.taskInfo.value, null);
  assert.equal(app.stages.value.length, 0);
  assert.match(app.error.value, /404/);
  assert.equal(app.loading.value, false);
  pending = app.loadTaskData();
  requests[2].resolve(fixture({ overallStatus: 'QUEUED' }));
  await pending;
  assert.equal(app.error.value, '');
  assert.equal(app.taskInfo.value.statusLabel, '等待中');
  assert.equal(app.stages.value.length, 0);
});

/** 路由变化后的旧响应不能覆盖新作业，离页后也不得回写。 Old responses cannot overwrite a new job or update a disposed page. */
test('late job and log responses cannot overwrite a different route', async () => {
  const { app, requests, route } = createHarness();
  const first = app.loadTaskData();
  route.query.id = 'job-fixture-b';
  const second = app.loadTaskData();
  requests[1].resolve(fixture({ jobName: 'job-fixture-b' }));
  await second;
  requests[0].resolve(fixture({ overallStatus: 'SUCCESS' }));
  await first;
  assert.equal(app.taskInfo.value.id, 'job-fixture-b');
  const logs = app.viewFullLogs();
  assert.equal(requests[2].includeConsole, true);
  route.query.id = 'job-fixture-c';
  const third = app.loadTaskData();
  requests[2].resolve(
    fixture({ jobName: 'job-fixture-b', consoleOutput: 'stale fixture log' }),
  );
  await logs;
  assert.equal(app.fullLogs.value, null);
  app.dispose();
  requests[3].resolve(fixture({ jobName: 'job-fixture-c' }));
  await third;
  assert.equal(app.taskInfo.value, null);
});

/** 控制台使用原文，失败可重试且不修改任务状态。 Console output retains original text and retries without altering job status. */
test('console reads preserve exact source text and expose failures', async () => {
  const { app, requests } = createHarness();
  const loading = app.loadTaskData();
  requests[0].resolve(fixture());
  await loading;
  let pending = app.viewFullLogs();
  requests[1].reject(new Error('fixture logs unavailable'));
  await pending;
  assert.match(app.logsError.value, /unavailable/);
  pending = app.viewFullLogs();
  const raw = '[fixture] first\r\n  next <raw>\n';
  requests[2].resolve(fixture({ consoleOutput: raw }));
  await pending;
  assert.equal(app.fullLogs.value, raw);
  assert.equal(app.taskInfo.value.statusLabel, '运行中');
});
