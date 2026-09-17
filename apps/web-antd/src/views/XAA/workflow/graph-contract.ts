/* Copyright (C) 2026 Synapxnet. All rights reserved.
 * Synapxnet Proprietary and Confidential. Unauthorized copying, distribution or use is forbidden.
 * 工作流画布与持久化契约转换。Workflow canvas and persistence contract conversion.
 * Author: maoyo | Department: 研发部 | Date: 2026-09-14 | Version: 1.0.0 | Security Level: INTERNAL
 * __version__: 1.0.0 | __author__: maoyo | __copyright__: Copyright 2026 Synapxnet
 * __maintainer__: maoyo | __email__: synapxnet@gmail.com
 */
import type {
  WorkflowNode as StoredNode,
  WorkflowEdge as StoredEdge,
  WorkflowGraph,
} from '../api/types';
import type { WorkflowNode, WorkflowEdge, NodeType } from './designer/types';

/** 用数据库ID找到画布UID，保留零坐标及条件。Resolve database IDs to canvas UIDs, preserving zero coordinates and conditions. */
export function decodeGraph(
  nodes: StoredNode[],
  edges: StoredEdge[],
): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  const ids = new Map(
    nodes.map((node) => [node.id, node.uid || `node-${node.id}`]),
  );
  return {
    nodes: nodes.map((node) => ({
      id: ids.get(node.id)!,
      type: 'custom',
      position: { x: node.positionX ?? 100, y: node.positionY ?? 100 },
      width: node.width,
      height: node.height,
      data: {
        type: node.nodeType as NodeType,
        title: node.title,
        description: node.description || '',
        config: node.configJson ? JSON.parse(node.configJson) : {},
      },
    })),
    edges: edges.map((edge) => {
      const source = ids.get(edge.sourceNodeId);
      const target = ids.get(edge.targetNodeId);
      if (!source || !target)
        throw new Error('工作流连线引用缺失节点，请修复原图后重试');
      return {
        id: edge.uid || `edge-${edge.id}`,
        source,
        target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        type: 'smoothstep',
        edgeType: edge.edgeType,
        conditionJson: edge.conditionJson,
        sortOrder: edge.sortOrder,
      };
    }),
  };
}

/** 保存UID关联，不把画布字符串当数据库主键。Persist UID references rather than treating canvas strings as database keys. */
export function encodeGraph(
  workflowId: number,
  graph: { nodes: WorkflowNode[]; edges: WorkflowEdge[] },
): WorkflowGraph {
  return {
    nodes: graph.nodes.map((node, sortOrder) => ({
      uid: node.id,
      workflowId,
      nodeType: node.data.type,
      title: node.data.title,
      description: node.data.description || '',
      configJson: JSON.stringify(node.data.config || {}),
      positionX: node.position.x,
      positionY: node.position.y,
      width: node.width ?? 200,
      height: node.height ?? 80,
      sortOrder,
    })),
    edges: graph.edges.map((edge, sortOrder) => ({
      uid: edge.id,
      workflowId,
      sourceNodeUid: edge.source,
      targetNodeUid: edge.target,
      sourceHandle: edge.sourceHandle || '',
      targetHandle: edge.targetHandle || '',
      edgeType: edge.edgeType || 'default',
      conditionJson: edge.conditionJson,
      sortOrder: edge.sortOrder ?? sortOrder,
    })),
  };
}
