<script lang="ts" setup>
import type { ComponentPublicInstance, Ref } from 'vue';

import type { TaskFormState } from '../taskcommon/task';

import { computed, inject, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Button, Card, message, Steps } from 'ant-design-vue';

// 导入训练任务API
import {
  createTrainTask,
  fetchTrainTaskDetail,
  updateTrainTask,
} from '../../../SMP/api/traintask';
import Step1 from '../step/Step1.vue';
import Step2 from '../step/Step2.vue';
import Step3 from '../step/Step3.vue';
import Step4 from '../step/Step4.vue';

// 添加租户和用户信息（从 store 获取）
const currentUserInfo = inject<Ref<any>>('currentUserInfo', ref(null));
const currentTenantInfo = inject<Ref<any>>('selectedOrganization', ref(null));
const tenantUid = computed(() => currentTenantInfo.value?.tenantUid || '');
const userId = computed(() => currentUserInfo.value?.userId || '');

const route = useRoute();
const router = useRouter();
const isEditMode = ref(false);
const taskId = ref<null | string>(null);
const currentStep = ref(0);
const steps = ref([
  { title: '基础信息' },
  { title: '算法与训练数据集' },
  { title: '自定义参数' },
  { title: '调度与输出' },
]);

const AButton = Button;

// 动态组件配置
const stepComponents = [Step1, Step2, Step3, Step4];
const stepRefs = [
  ref<ComponentPublicInstance>(),
  ref<ComponentPublicInstance>(),
  ref<ComponentPublicInstance>(),
  ref<ComponentPublicInstance>(),
];

const activeStepComponent = computed(() => stepComponents[currentStep.value]);
// 步骤切换方法
const handleStepChange = async (newStep: number) => {
  if (newStep < 0 || newStep > 3) return;

  // 向后跳转时验证当前步骤
  if (newStep > currentStep.value) {
    try {
      const currentRef = stepRefs[currentStep.value].value;
      if (currentRef?.validate) {
        await currentRef.validate();
      }
    } catch {
      message.error('请正确填写当前步骤的所有必填字段');
      return;
    }
  }

  currentStep.value = newStep;
};

// 统一表单数据管理
// 初始化表单状态
const formState = ref<TaskFormState>({
  taskStep1: {
    taskName: '',
    taskType: '',
    encryption: '',
    taskZone: '',
    podType: '',
    resources: '',
    trainType: '',
    imageUid: '',
    image: '',
    describe: '',
  },
  taskStep2: {
    // 算法UID
    algorithmUID: '',
    algorithmName: '',
    algorithmVersion: '',
    datasets: [],
    taskroute: '',
  },
  taskStep3: {
    customVariables: [],
    trainConfig: {
      content: '',
      format: 'txt',
    },
  },
  taskStep4: {
    notificationConfig: {
      isActive: false,
      notificationContent: '',
      notificationTitle: '',
      notificationUserID: '',
    },
    outputConfig: {
      autoPublish: false,
      isActive: false,
      outputPath: '',
      outputType: '',
    },
    scheduleConfig: {
      intervalType: 'daily',
      cronExpression: '',
      dailyTime: '',
      dateRange: [],
      hourlyMinute: '',
      intervalDuration: 1,
      intervalUnit: 'hours',
      offsetTime: '',
      onceTime: null,
      weeklyDays: [],
      weeklyTime: '',
      isActive: false, // 确保初始状态为false
    },
  },
});

const close = () => {
  router.push('/MTP/train/index');
};

// 初始化：检查URL参数
onMounted(() => {
  taskId.value = route.query.id as string;
  isEditMode.value = !!taskId.value;

  if (isEditMode.value) {
    loadTaskData(taskId.value);
  }
});

// 加载任务数据
const loadTaskData = async (id: string) => {
  try {
    const taskData = await fetchTrainTaskDetail(id, tenantUid.value);

    // 转换后端数据为前端表单格式
    formState.value = {
      taskStep1: {
        taskName: taskData.task_name,
        taskType: taskData.task_type,
        encryption: taskData.encryption,
        taskZone: taskData.task_zone,
        podType: taskData.pod_type,
        resources: taskData.resources,
        trainType: taskData.train_type,
        imageUid: taskData.image_uid,
        image: taskData.image,
        describe: taskData.description,
      },
      taskStep2: {
        // 算法UID
        algorithmUID: taskData.algorithm_uid,
        algorithmName: taskData.algorithm_name,
        algorithmVersion: taskData.algorithm_version,
        datasets: taskData.datasets.map((ds) => ({
          id: ds.dataset_id,
          selectedId: ds.dataset_id,
          name: ds.dataset_file, // 需要额外获取名称
          selectedName: ds.dataset_name, // 需要额外获取
          selectedUID: ds.dataset_uid,
          bucketIdentifier: ds.bucket_identifier,
          datasetName: ds.dataset_name,
        })),
        taskroute: taskData.task_route,
      },
      taskStep3: {
        customVariables: taskData.custom_variables.map((cv) => ({
          id: cv.uid, // 或生成新ID
          name: cv.name,
          value: cv.value,
        })),
        trainConfig: {
          content: taskData.train_config_content,
          format: taskData.train_config_format,
        },
      },
      taskStep4: {
        notificationConfig: JSON.parse(taskData.notification_config || '{}'),
        outputConfig: JSON.parse(taskData.output_config || '{}'),
        scheduleConfig: JSON.parse(taskData.schedule_config || '{}'),
      },
    };
  } catch {
    message.error('加载任务数据失败');
  }
};

// 页面标题动态化
const pageTitle = computed(() => (isEditMode.value ? '编辑任务' : '新增任务'));

// 提交处理（区分创建/编辑）
const handleSubmit = async () => {
  // 确保所有步骤完成
  if (currentStep.value < 3) {
    message.warning('请完成所有步骤');
    return;
  }

  try {
    // 验证所有步骤
    for (let i = 0; i < 4; i++) {
      const stepRef = stepRefs[i].value;
      if (stepRef?.validate) {
        await stepRef.validate();
      }
    }

    if (isEditMode.value && taskId.value) {
      await updateTrainTask(
        taskId.value,
        formState.value,
        userId.value,
        tenantUid.value,
      );
      message.success('任务更新成功！');
    } else {
      await createTrainTask(formState.value, userId.value, tenantUid.value);
      message.success('任务创建成功！');
    }
    router.push('/MTP/train/index');
  } catch (error) {
    console.error('操作失败:', error);
    message.error(
      `操作失败: ${error.response?.data?.message || error.message}`,
    );
  }
};
</script>

<template>
  <!-- 动态标题 -->
  <Page :title="pageTitle" />
  <Card class="p-4 shadow">
    <div v-if="isEditMode" class="edit-mode-indicator">编辑模式</div>
    <!-- 步骤指示器 -->
    <Steps
      :current="currentStep"
      :items="steps"
      label-placement="vertical"
      class="mb-8"
      @change="handleStepChange"
    />

    <!-- 步骤内容容器 -->
    <!-- 动态步骤内容 -->
    <div class="step-content-container">
      <KeepAlive>
        <component
          :is="activeStepComponent"
          :ref="stepRefs[currentStep]"
          @update:model-value="(val) => (formState = val)"
          v-model="formState"
          @next="() => handleStepChange(currentStep + 1)"
          @prev="() => handleStepChange(currentStep - 1)"
          @submit="handleSubmit"
          :is-edit-mode="isEditMode"
        />
      </KeepAlive>
    </div>
    <!-- 操作按钮 -->
    <div class="action-buttons">
      <div class="btn-group">
        <AButton
          type="primary"
          v-if="currentStep > 0"
          @click="() => handleStepChange(currentStep - 1)"
        >
          上一步
        </AButton>
        <AButton
          type="primary"
          v-if="currentStep < 3"
          @click="() => handleStepChange(currentStep + 1)"
        >
          下一步
        </AButton>
        <AButton type="primary" @click="close" v-if="currentStep === 0">
          取消
        </AButton>
        <AButton type="primary" v-if="currentStep === 3" @click="handleSubmit">
          {{ isEditMode ? '更新' : '提交' }}
        </AButton>
      </div>
    </div>
  </Card>
</template>
<style lang="scss" scoped>
@use '../taskcommon/form-styles.scss' as *;
</style>
