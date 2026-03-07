/**
 * 工作流节点组件注册
 */

import { markRaw } from 'vue';
import BaseNode from './BaseNode.vue';
import NodePreview from './NodePreview.vue';

// 所有节点使用 BaseNode 作为基础组件
// BaseNode 会根据 data.type 自动渲染不同样式
export const nodeTypes = {
  // 使用自定义节点类型
  custom: markRaw(BaseNode),
};

export { BaseNode, NodePreview };
