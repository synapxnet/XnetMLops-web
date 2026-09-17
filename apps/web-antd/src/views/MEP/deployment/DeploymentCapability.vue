<!--
Copyright (C) 2026 Synapxnet. All rights reserved.
This file is Synapxnet Proprietary and Confidential. It is strictly
forbidden to copy, distribute, or use without explicit authorization.
部署执行能力说明。 / Deployment execution capability disclosure.
Author: maoyo | Department: 研发部 | Date: 2026-09-15 | Version: 1.3.0
Security Level: INTERNAL | Maintainer: maoyo | Email: synapxnet@gmail.com
-->
<script setup lang="ts">
import { InfoCircleOutlined, RightOutlined } from '@ant-design/icons-vue';
</script>

<template>
  <details class="deployment-capability">
    <summary>
      <InfoCircleOutlined aria-hidden="true" />
      <span>部署能力</span>
      <span class="capability-status">运行状态待核验</span>
      <RightOutlined class="capability-chevron" aria-hidden="true" />
    </summary>
    <div class="capability-detail">
      <p>
        配置记录、部署执行与运行观测分别确认，执行能力以当前服务的实际响应为准。
      </p>
      <p>
        历史状态和日志不代表当前健康。启动、停止或扩缩容后，还需重新读取运行观测确认结果。
      </p>
    </div>
  </details>
</template>

<style scoped>
.deployment-capability {
  margin-bottom: 16px;
  border-bottom: 1px solid hsl(var(--border));
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

summary {
  display: flex;
  min-height: 40px;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  cursor: pointer;
  list-style: none;
}

summary::-webkit-details-marker {
  display: none;
}

summary:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 3px;
}

.capability-status {
  margin-left: auto;
  text-align: right;
}

.capability-chevron {
  flex: none;
  font-size: 10px;
  transition: transform 160ms ease;
}

details[open] .capability-chevron {
  transform: rotate(90deg);
}

.capability-detail {
  padding: 0 0 8px 22px;
  line-height: 1.7;
}

.capability-detail p {
  margin-bottom: 6px;
}

@media (prefers-reduced-motion: reduce) {
  .capability-chevron {
    transition: none;
  }
}
</style>
