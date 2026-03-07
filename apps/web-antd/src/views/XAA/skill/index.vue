<script lang="ts" setup>
import { ref } from 'vue';

import {
  Button,
  Card,
  Empty,
  Result,
} from 'ant-design-vue';

// 技能管理功能预留
const skillList = ref([]);
</script>

<template>
  <Card class="p-4 shadow">
    <template #title>
      <div class="flex items-center justify-between">
        <span>技能管理 (XAS)</span>
        <Button type="primary" disabled>
          新建技能
        </Button>
      </div>
    </template>

    <Result
      status="info"
      title="功能开发中"
      sub-title="技能管理模块 (Xnet-Agent-Skill) 正在开发中，敬请期待..."
    >
      <template #extra>
        <div class="text-left max-w-lg mx-auto">
          <h4 class="font-semibold mb-2">计划功能：</h4>
          <ul class="list-disc list-inside text-gray-600">
            <li>创建和管理自定义技能</li>
            <li>技能配置和参数设置</li>
            <li>技能版本管理</li>
            <li>技能市场和共享</li>
            <li>与工作流节点集成</li>
          </ul>
        </div>
      </template>
    </Result>
  </Card>
</template>

<style scoped>
.ant-result {
  padding: 48px 32px;
}
</style>
