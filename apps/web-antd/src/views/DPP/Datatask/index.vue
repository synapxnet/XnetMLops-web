<!-- Copyright (C) 2026 Synapxnet. All rights reserved.
Synapxnet Proprietary and Confidential. Unauthorized copying, distribution or use is forbidden.
数据任务入口使用已有特征工程能力。Data task entry using the existing feature engineering capability.
Author: maoyo | Department: 研发部 | Date: 2026-09-13 | Version: 1.0.0 | Security Level: INTERNAL
__version__: 1.0.0 | __author__: maoyo | __copyright__: Copyright 2026 Synapxnet
__maintainer__: maoyo | __email__: synapxnet@gmail.com -->
<script setup lang="ts">
import { useRouter } from 'vue-router';
import { Alert, Button } from 'ant-design-vue';
import FeatureTasks from '../FeatureEngineering/index.vue';
const router = useRouter();
/** 保留通用数据任务的登记入口。Preserve the generic data task registration entry. */
function openRegistration() { void router.push('/DPP/Datatask/task'); }
</script>
<template>
  <section aria-label="数据任务工作区">
  <div class="p-4"><Alert show-icon type="info" message="数据任务入口已接入数据集登记与文件上传；特征工程任务可继续使用独立流程。"><template #action><Button @click="openRegistration">新增数据任务</Button></template></Alert></div>
  <FeatureTasks />
  </section>
</template>
