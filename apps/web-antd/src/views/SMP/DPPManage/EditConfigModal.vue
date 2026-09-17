<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import { Form, Input, Modal } from 'ant-design-vue';
import { useForm } from 'ant-design-vue/es/form';

const props = defineProps({
  visible: Boolean,
  saving: Boolean,
  configType: String,
  currentItem: Object,
  existingValues: Set, // 所有已存在的值
  existingLabels: Set, // 所有已存在的名称
});
const emit = defineEmits(['update:visible', 'save']);
const AModal = Modal;
const AForm = Form;
const AFormItem = Form.Item;
const AInput = Input;

const visible = ref(false);
const formRef = ref();
const formState = ref({
  label: '',
  value: '',
});

const { resetFields } = useForm(formState);

// 计算模态框标题
const modalTitle = computed(() => {
  const typeMap = {
    datasetTypes: '数据类型',
    datasetZones: '数据区域',
  };
  const action = props.currentItem ? '编辑' : '新增';
  return `${action}${typeMap[props.configType] || '配置'}`;
});

// 监听visible变化
watch(
  () => props.visible,
  (val) => {
    visible.value = val;
    if (val) {
      // 填充表单数据
      if (props.currentItem) {
        formState.value = { ...props.currentItem };
      } else {
        resetFields();
      }
    }
  },
);

// 监听内部visible变化并同步到父组件
watch(visible, (val) => {
  emit('update:visible', val);
});

// 名称验证器
const validateLabel = async (_rule: any, value: string) => {
  if (!value) {
    throw '请输入名称';
  }

  // 检查是否已存在相同的名称（除了当前编辑项）
  const isEditing = !!props.currentItem;
  const isSameAsOriginal = isEditing && value === props.currentItem?.label;

  if (!isSameAsOriginal && props.existingLabels.has(value)) {
    throw '该名称已存在，请使用其他名称';
  }
};

// 值验证器
const validateValue = async (_rule: any, value: string) => {
  if (!value) {
    throw '请输入值';
  }

  // 检查是否已存在相同的值（除了当前编辑项）
  const isEditing = !!props.currentItem;
  const isSameAsOriginal = isEditing && value === props.currentItem?.value;

  if (!isSameAsOriginal && props.existingValues.has(value)) {
    throw '该值已存在，请使用其他值';
  }
};

// 仅请求保存，由父页在API成功后关闭。Request persistence and let the parent close only after API success.
const handleOk = async () => {
  try {
    // 验证表单
    await formRef.value.validateFields();

    // 如果通过验证，触发保存
    emit('save', props.configType, { ...formState.value });
  } catch (error) {
    console.log('验证失败', error);
  }
};

// 处理取消
const handleCancel = () => {
  visible.value = false;
};
</script>

<template>
  <AModal
    v-model:visible="visible"
    :title="modalTitle"
    :confirm-loading="saving"
    @ok="handleOk"
    @cancel="handleCancel"
    :destroy-on-close="true"
  >
    <AForm ref="formRef" :model="formState" layout="vertical">
      <AFormItem
        label="名称"
        name="label"
        :rules="[
          { required: true, message: '请输入名称' },
          { validator: validateLabel, trigger: 'blur' },
        ]"
      >
        <AInput
          v-model:value="formState.label"
          placeholder="请输入配置项名称"
          allow-clear
        />
      </AFormItem>

      <AFormItem
        label="值"
        name="value"
        :rules="[
          { required: true, message: '请输入唯一值' },
          { validator: validateValue, trigger: 'blur' },
        ]"
      >
        <AInput
          v-model:value="formState.value"
          placeholder="请输入唯一标识值"
          :disabled="!!currentItem"
          allow-clear
        />
      </AFormItem>
    </AForm>
  </AModal>
</template>
