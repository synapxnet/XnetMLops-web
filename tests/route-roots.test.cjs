/* Copyright (C) 2026 Synapxnet. All rights reserved.
 * Synapxnet Proprietary and Confidential. Unauthorized copying, distribution or use is forbidden.
 * Vue页面根节点回归，避免Transition离场后全局空白。Vue root regression against blank transitions.
 * Author: maoyo | Department: 研发部 | Date: 2026-09-14 | Version: 1.0.0 | Security Level: INTERNAL
 * __version__: 1.0.0 | __author__: maoyo | __copyright__: Copyright 2026 Synapxnet
 * __maintainer__: maoyo | __email__: synapxnet@gmail.com
 */
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const frontend = createRequire(path.join(__dirname, '../package.json'));
const fromVue = createRequire(frontend.resolve('vue'));
const { parse, compileTemplate } = fromVue('@vue/compiler-sfc');
const routes = require('./route-contracts.json').routes;

/** 全部注册页面需要稳定的单个根节点以完成切换。Every registered page needs a stable single root for transitions. */
test('all 69 local route entries compile to a stable single element root', () => {
  const problems = [];
  for (const route of routes) {
    const filename = path.join(__dirname, '../apps/web-antd/src', route.component);
    const source = fs.readFileSync(filename, 'utf8');
    const { descriptor, errors } = parse(source, { filename });
    if (errors.length) problems.push({ path: route.path, errors: errors.map(String) });
    const result = compileTemplate({ source: descriptor.template.content, filename, id: route.component });
    const children = result.ast.children.filter((node) => node.type !== 3 && !(node.type === 2 && !node.content.trim()));
    if (result.errors.length || children.length !== 1 || children[0].type !== 1) {
      problems.push({ path: route.path, roots: children.map((node) => ({ type: node.type, tag: node.tag })), errors: result.errors.map(String) });
    }
  }
  assert.deepEqual(problems, []);
});
