<script lang="ts" setup>
import BusinessPage from '#/components/workspace/BusinessPage.vue';
import { Alert } from 'ant-design-vue';
import type { ComponentPublicInstance, Ref } from 'vue';

import type { TaskFormState } from '../taskcommon/task';

import { computed, inject, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Button, message, Steps } from 'ant-design-vue';

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
const tenantUid = computed(
  () => currentTenantInfo.value?.tenantUid || 'default',
);
const userId = computed(() => currentUserInfo.value?.userId || '');

const route = useRoute();
const router = useRouter();
const isEditMode = ref(false);
const isCopyMode = ref(false);
const taskId = ref<null | string>(null);
const copyFromId = ref<null | string>(null);
const sourceLoading = ref(false);
const sourceError = ref('');
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
  if (sourceLoading.value || sourceError.value) return;
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
  // 使用 replace 避免历史记录问题，并强制刷新列表页
  router.replace('/MTP/train/index');
};

// 初始化：检查URL参数
onMounted(() => {
  taskId.value = route.query.id as string;
  copyFromId.value = route.query.copyFrom as string;
  isEditMode.value = !!taskId.value;
  isCopyMode.value = !!copyFromId.value;

  if (isEditMode.value) {
    loadTaskData(taskId.value);
  } else if (isCopyMode.value) {
    // 复制模式：加载原任务数据但清除uid，并提示修改名称
    loadTaskDataForCopy(copyFromId.value);
  }
});

// 加载编辑来源，失败时阻止空记录编辑。Load the source task and prevent empty editing after failure.
const loadTaskData = async (id: string) => {
  sourceLoading.value = true;
  sourceError.value = '';
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
    sourceError.value = '原任务暂时无法加载，请重试后再编辑。';
  } finally {
    sourceLoading.value = false;
  }
};

// 加载复制来源，失败时不创建缺少配置的任务。Load the copy source without creating a task from missing configuration.
const loadTaskDataForCopy = async (id: string) => {
  sourceLoading.value = true;
  sourceError.value = '';
  try {
    const taskData = await fetchTrainTaskDetail(id, tenantUid.value);

    // 转换后端数据为前端表单格式，但修改任务名称并清除uid相关信息
    formState.value = {
      taskStep1: {
        taskName: taskData.task_name + '_clone', // 添加克隆后缀
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
        algorithmUID: taskData.algorithm_uid,
        algorithmName: taskData.algorithm_name,
        algorithmVersion: taskData.algorithm_version,
        datasets: taskData.datasets.map((ds) => ({
          id: ds.dataset_id,
          selectedId: ds.dataset_id,
          name: ds.dataset_file,
          selectedName: ds.dataset_name,
          selectedUID: ds.dataset_uid,
          bucketIdentifier: ds.bucket_identifier,
          datasetName: ds.dataset_name,
        })),
        taskroute: taskData.task_route,
      },
      taskStep3: {
        customVariables: taskData.custom_variables.map((cv) => ({
          id: Date.now() + Math.random(), // 生成新ID
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
        scheduleConfig: {
          ...JSON.parse(taskData.schedule_config || '{}'),
          isActive: false, // 复制时默认不启用调度
        },
      },
    };

    message.info('已加载任务数据，请修改任务名称后保存');
  } catch {
    sourceError.value = '原任务暂时无法加载，请重试后再复制。';
  } finally {
    sourceLoading.value = false;
  }
};

// 页面标题动态化
const pageTitle = computed(() => {
  if (isEditMode.value) return '编辑任务';
  if (isCopyMode.value) return '复制任务';
  return '新增任务';
});

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
      message.success(isCopyMode.value ? '任务复制成功！' : '任务创建成功！');
    }
    // 使用 replace 避免返回时出现空白页
    router.replace('/MTP/train/index');
  } catch (error) {
    console.error('操作失败:', error);
    message.error(
      `操作失败: ${error.response?.data?.message || error.message}`,
    );
  }
};
</script>

<template>
  <BusinessPage
    domain="模型研发"
    description="配置训练任务、算法数据、参数与调度。"
    :title="pageTitle"
    variant="form"
  >
    <template #actions><AButton @click="close">返回训练任务</AButton></template>
    <Alert
      v-if="sourceError"
      type="error"
      show-icon
      message="原任务未加载"
      :description="sourceError"
      ><template #action
        ><AButton
          @click="
            () =>
              isEditMode && taskId
                ? loadTaskData(taskId)
                : copyFromId
                  ? loadTaskDataForCopy(copyFromId)
                  : undefined
          "
          >重试</AButton
        ></template
      ></Alert
    >
    <div v-if="sourceLoading" class="py-8">正在加载原任务…</div>
    <section v-if="!sourceError && !sourceLoading" class="training-editor">
      <div class="training-stepbar">
        <!-- 步骤指示器 -->
        <Steps
          :current="currentStep"
          :items="steps"
          size="small"
          @change="handleStepChange"
        />
      </div>
      <div class="training-step-heading">
        <h2>{{ steps[currentStep]?.title }}</h2>
        <span
          >第 {{ currentStep + 1 }} / 4 步<span v-if="isEditMode">
            · 编辑任务</span
          ><span v-else-if="isCopyMode"> · 复制任务</span></span
        >
      </div>

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
      <div class="action-buttons training-actions">
        <span>完成当前配置后继续下一步</span>
        <div class="btn-group">
          <AButton
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
          <AButton @click="close" v-if="currentStep === 0"> 取消 </AButton>
          <AButton
            type="primary"
            v-if="currentStep === 3"
            @click="handleSubmit"
          >
            {{ isEditMode ? '更新' : isCopyMode ? '保存副本' : '提交' }}
          </AButton>
        </div>
      </div>
    </section>
  </BusinessPage>
</template>
<style lang="scss" scoped>
@use '../taskcommon/form-styles.scss' as *;
.training-editor {
  border: 1px solid var(--xnet-line);
  border-radius: var(--xnet-radius);
  background: var(--xnet-surface);
  overflow: hidden;
}
.training-stepbar {
  padding: 20px 26px;
  border-bottom: 1px solid var(--xnet-line);
  background: color-mix(in srgb, var(--xnet-base) 55%, var(--xnet-surface));
}
.training-step-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 22px 26px 0;
}
.training-step-heading h2 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}
.training-step-heading > span {
  font-size: 12px;
  color: var(--xnet-muted);
}
.step-content-container {
  padding: 22px 26px 26px;
}
.training-actions {
  margin: 0;
  padding: 16px 26px;
  border-top: 1px solid var(--xnet-line);
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  background: color-mix(in srgb, var(--xnet-base) 45%, var(--xnet-surface));
}
.training-actions > span {
  font-size: 12px;
  color: var(--xnet-muted);
}
.training-actions .btn-group {
  width: auto;
  padding: 0;
  gap: 8px;
  justify-content: flex-end;
}
.training-actions .btn-group button {
  height: 34px;
  min-width: 86px;
}
@media (max-width: 768px) {
  .training-stepbar {
    padding: 16px;
  }
  .training-step-heading {
    padding: 18px 16px 0;
  }
  .step-content-container {
    padding: 18px 16px;
  }
  .training-actions {
    padding: 14px 16px;
    flex-wrap: wrap;
  }
  .training-actions .btn-group {
    margin-left: auto;
  }
}
/* 窄屏步骤采用两行排列，保留组件的当前、禁用与点击行为。Arrange mobile steps in two rows while retaining current, disabled and click behavior. */
@media (max-width: 576px) {
  .training-stepbar {
    padding: 12px;
  }
  .training-stepbar :deep(.ant-steps) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .training-stepbar :deep(.ant-steps > .ant-steps-item) {
    min-width: 0;
    margin: 0;
    padding: 0;
  }
  .training-stepbar
    :deep(.ant-steps .ant-steps-item > .ant-steps-item-container) {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 32px;
    padding: 4px 6px;
    border: 1px solid transparent;
    border-radius: 8px;
  }
  .training-stepbar
    :deep(.ant-steps .ant-steps-item-active > .ant-steps-item-container) {
    border-color: hsl(var(--primary) / 28%);
    background: hsl(var(--primary) / 8%);
  }
  .training-stepbar :deep(.ant-steps .ant-steps-item .ant-steps-item-icon) {
    flex: 0 0 20px;
    float: none;
    width: 20px;
    height: 20px;
    margin: 0;
    font-size: 12px;
    line-height: 18px;
  }
  .training-stepbar :deep(.ant-steps .ant-steps-item .ant-steps-item-content) {
    flex: 1;
    min-width: 0;
    min-height: 0;
  }
  .training-stepbar :deep(.ant-steps .ant-steps-item .ant-steps-item-title) {
    padding: 0;
    font-size: 12px;
    line-height: 20px;
  }
  .training-stepbar :deep(.ant-steps-item-tail),
  .training-stepbar :deep(.ant-steps-item-title::after) {
    display: none !important;
  }
}
</style>
