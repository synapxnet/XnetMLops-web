<script lang="ts" setup>
import type { TaskFormState, TaskFormStep3 } from '../taskcommon/task';

import { defineProps, nextTick, ref, watch } from 'vue';

import { Button, Form, Input, Radio, Select } from 'ant-design-vue';

// 定义组件Props和Emits
const props = defineProps<{
  modelValue: TaskFormState;
}>();
const emit = defineEmits(['update:modelValue']);

// 组件注册
const AForm = Form;
const AFormItem = Form.Item;
const AInput = Input;
const ASelect = Select;

const ARadioGroup = Radio.Group;
const AButton = Button;

const formRef = ref<InstanceType<typeof AForm>>();

const current = ref(0);
const schemas = ref([]);
// 本地表单状态（包含防御性初始化）
const localFormState = ref<TaskFormStep3>({
  customVariables: [],
  trainConfig: {
    content: '',
    format: 'txt',
  },
});

const validate = async () => {
  try {
    await formRef.value?.validateFields();

    emit('update:modelValue', {
      ...props.modelValue,
      taskStep3: {
        ...localFormState.value,
      },
    });
    return true;
  } catch (error) {
    return Promise.reject(error);
  }
};

defineExpose({ validate });

// 深度同步父组件数据
watch(
  () => props.modelValue.taskStep3,
  (newVal) => {
    localFormState.value = {
      customVariables: newVal.customVariables?.length
        ? [...newVal.customVariables]
        : [],
      trainConfig: {
        content: newVal.trainConfig?.content || '',
        format: newVal.trainConfig?.format || 'txt',
      },
    };
  },
  { immediate: true, deep: true },
);
// 自定义变量操作
const addCustomVariable = () => {
  localFormState.value.customVariables = [
    ...localFormState.value.customVariables,
    {
      id: crypto.randomUUID(), // 添加唯一标识
      name: '',
      value: '',
    },
  ];

  nextTick(() => {
    formRef.value?.validate([
      [
        'customVariables',
        localFormState.value.customVariables.length - 1,
        'name',
      ],
      [
        'customVariables',
        localFormState.value.customVariables.length - 1,
        'value',
      ],
    ]);
  });
};
// 算法选择相关状态
const showAlgorithmDialog = ref(false);
const removeCustomVariable = (index: number) => {
  localFormState.value.customVariables =
    localFormState.value.customVariables.filter((_, i) => i !== index);
  nextTick(() => formRef.value?.validate());
};

const formatOptions = ref([
  { label: 'TXT', value: 'txt' },
  { label: 'JSON', value: 'json' },
  { label: 'Python', value: 'py' },
  { label: 'YAML', value: 'yml' },
]);
// 数据集表格列定义
const getComponent = (componentType: string) => {
  switch (componentType) {
    case 'Input': {
      return AInput;
    }
    case 'RadioGroup': {
      return ARadioGroup;
    }
    case 'Select': {
      return ASelect;
    }
    default: {
      return AInput;
    }
  }
};
</script>
<template>
  <AForm
    ref="formRef"
    :model="localFormState"
    layout="vertical"
    class="grid grid-cols-1 gap-4 md:grid-cols-2"
  >
    <!-- 原有字段 -->
    <template v-for="item in schemas[current]" :key="item.fieldName">
      <AFormItem :label="item.label" :name="item.fieldName" :rules="item.rules">
        <component
          :is="getComponent(item.component)"
          v-bind="{
            ...item.componentProps,
            onClick: () => (showAlgorithmDialog = true),
          }"
          v-model:value="localFormState[item.fieldName]"
          class="cursor-pointer"
        />
      </AFormItem>
    </template>

    <!-- 新增自定义变量配置 -->
    <div class="col-span-2">
      <div class="dataset-section">
        <div class="section-header">
          <div class="header-top">
            <h3 class="section-title">自定义变量配置</h3>
            <AButton
              type="dashed"
              @click="addCustomVariable"
              :disabled="localFormState.customVariables.length >= 10"
              class="add-btn"
            >
              <PlusOutlined /> 新增参数
            </AButton>
          </div>
          <a-divider class="divider" />
        </div>

        <div
          v-for="(variable, index) in localFormState.customVariables"
          :key="variable.id"
          class="dataset-row"
        >
          <div class="flex w-full gap-4">
            <!-- 变量名称 -->
            <AFormItem
              :label="index === 0 ? '变量名称：' : ''"
              :name="`customVariables.${index}.name`"
              class="flex-1"
            >
              <AInput
                v-model:value="variable.name"
                placeholder="请输入变量名称"
              />
            </AFormItem>

            <!-- 变量值 -->
            <AFormItem
              :label="index === 0 ? '变量值：' : ''"
              :name="`customVariables.${index}.value`"
              class="flex-1"
            >
              <AInput
                v-model:value="variable.value"
                placeholder="请输入变量值"
              />
            </AFormItem>

            <AButton
              danger
              @click="removeCustomVariable(index)"
              class="ml-2 self-end"
              style="height: 32px"
            >
              删除
            </AButton>
          </div>
        </div>
      </div>
    </div>
    <!-- 新增训练配置 -->
    <div class="col-span-2">
      <div class="dataset-section">
        <div class="section-header">
          <div class="header-top">
            <h3 class="section-title">训练配置文件</h3>
            <div class="format-selector">
              <ASelect
                v-model:value="localFormState.trainConfig.format"
                placeholder="请选择配置文件格式"
                :options="formatOptions"
                style="width: 120px"
              />
            </div>
          </div>
          <a-divider class="divider" />
        </div>

        <AFormItem label="配置内容：" name="trainConfig.content">
          <AInput.TextArea
            v-model:value="localFormState.trainConfig.content"
            :auto-size="{ minRows: 8, maxRows: 12 }"
            placeholder="请输入训练配置内容..."
            class="config-editor"
          />
        </AFormItem>
      </div>
    </div>
  </AForm>
</template>
<style lang="scss" scoped>
@use '../taskcommon/form-styles.scss' as *;
</style>
