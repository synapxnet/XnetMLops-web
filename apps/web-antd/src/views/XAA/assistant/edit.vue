<script lang="ts" setup>
// 编辑页面直接复用创建页面组件
</script>

<template>
  <!-- 编辑助手页面，复用create.vue的逻辑 -->
  <component :is="() => import('./create.vue')" />
</template>
