/* Copyright (C) 2026 Synapxnet. All rights reserved.
 * This file is Synapxnet Proprietary and Confidential. It is strictly
 * forbidden to copy, distribute, or use without explicit authorization.
 * 用途：真实组件读取失败与空态回归。Purpose: Regress failed reads and empty states in the actual component.
 * Author: maoyo | Department: 研发部 | Date: 2026-09-14 | Version: 1.0.0 | Security Level: INTERNAL
 * __version__: 1.0.0 | __author__: maoyo | __copyright__: Copyright 2026 Synapxnet
 * __maintainer__: maoyo | __email__: synapxnet@gmail.com
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');
const test = require('node:test');

/** 等待响应式渲染和异步请求完成。Flush reactive rendering and pending request continuations. */
async function settle(vue) {
  await Promise.resolve();
  await vue.nextTick();
  await Promise.resolve();
  await vue.nextTick();
}

/** 挂载真实SFC，替换网络、路由和组件库外壳。Mount the actual SFC while replacing network, routing and component-library shells. */
async function mountFeaturePage(fetchList) {
  const { Window } = await import('happy-dom');
  const window = new Window();
  for (const key of ['window', 'document', 'HTMLElement', 'SVGElement', 'Element', 'Node']) {
    global[key] = key === 'window' ? window : window[key];
  }
  const vue = require('vue');
  const ts = require('typescript');
  const compiler = createRequire(require.resolve('vue'))('@vue/compiler-sfc');
  const file = path.join(__dirname, 'index.vue');
  const { descriptor } = compiler.parse(fs.readFileSync(file, 'utf8'));
  const script = compiler.compileScript(descriptor, { id: 'feature-list-regression', inlineTemplate: true });
  const code = ts.transpileModule(script.content, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const shell = vue.defineComponent({ setup: (_, { slots }) => () => vue.h('section', slots.default?.()) });
  const button = vue.defineComponent({ setup: (_, { slots, attrs }) => () => vue.h('button', attrs, slots.default?.()) });
  const alert = vue.defineComponent({ props: ['message', 'description'], setup: (props, { slots }) => () => vue.h('section', { role: 'alert' }, [props.message, props.description, slots.action?.()]) });
  const table = vue.defineComponent({ props: ['dataSource'], setup: (props, { slots }) => () => vue.h('section', props.dataSource.length ? props.dataSource.map((row) => row.name).join(',') : slots.emptyText?.()) });
  const icon = vue.defineComponent({ setup: () => () => null });
  const library = new Proxy({ Alert: alert, Button: button, Table: table, Drawer: icon, message: { error() {}, success() {} }, Modal: {} }, { get: (value, key) => value[key] ?? shell });
  /** 只替换外部依赖，列表状态及模板保持生产代码。Replace external boundaries only, preserving production list state and template. */
  function scopedRequire(name) {
    if (name === 'vue') return vue;
    if (name === 'vue-router') return { useRouter: () => ({ push() {} }) };
    if (name === 'ant-design-vue') return library;
    if (name === '@ant-design/icons-vue') return new Proxy({}, { get: () => icon });
    if (name === '#/components/workspace/BusinessPage.vue') return { default: shell };
    if (name === '../../SMP/api/featureEngineering') return { fetchFeatureEngineeringList: fetchList };
    throw new Error(`Unexpected dependency: ${name}`);
  }
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(scopedRequire, module, module.exports);
  const host = document.createElement('div');
  document.body.append(host);
  const app = vue.createApp(module.exports.default);
  app.mount(host);
  return { app, host, vue, window };
}

/** 复现503后误报空态，并验证重试成功后才出现真实空态。Reproduce false empty state after a 503 and require successful retry before the real empty state appears. */
test('failed list reads remain visible and retry distinguishes pending, empty and invalid responses / 读取失败持续可见且重试区分等待、空态和非法响应', async () => {
  let resolveRequest;
  let rejectRequest;
  let calls = 0;
  const page = await mountFeaturePage(() => {
    calls++;
    return new Promise((resolve, reject) => { resolveRequest = resolve; rejectRequest = reject; });
  });
  const previousConsoleError = console.error;
  console.error = () => {};
  try {
    assert.equal(calls, 1);
    assert.match(page.host.textContent, /正在读取特征工程任务/);
    assert.doesNotMatch(page.host.textContent, /暂无特征工程任务|创建第一个特征工程/);
    rejectRequest(new Error('读取失败夹具 HTTP 503'));
    await settle(page.vue);
    assert.match(page.host.querySelector('[role="alert"]').textContent, /特征工程任务读取失败.*503/);
    assert.doesNotMatch(page.host.textContent, /暂无特征工程任务|创建第一个特征工程/);
    const retry = [...page.host.querySelectorAll('button')].find((element) => element.textContent === '重试读取');
    retry.click();
    await settle(page.vue);
    assert.equal(calls, 2);
    assert.match(page.host.textContent, /正在读取特征工程任务/);
    assert.doesNotMatch(page.host.textContent, /暂无特征工程任务|创建第一个特征工程/);
    resolveRequest([]);
    await settle(page.vue);
    assert.equal(page.host.querySelector('[role="alert"]'), null);
    assert.match(page.host.textContent, /暂无特征工程任务.*创建第一个特征工程/);
    [...page.host.querySelectorAll('button')].find((element) => element.textContent.includes('刷新')).click();
    await settle(page.vue);
    resolveRequest({ invalid: true });
    await settle(page.vue);
    assert.match(page.host.querySelector('[role="alert"]').textContent, /响应格式无效/);
    assert.doesNotMatch(page.host.textContent, /暂无特征工程任务|创建第一个特征工程/);
  } finally {
    console.error = previousConsoleError;
    page.app.unmount();
    await page.window.happyDOM.close();
  }
});
