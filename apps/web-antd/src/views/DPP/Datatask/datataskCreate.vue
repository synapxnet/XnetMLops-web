<script lang="ts" setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Collapse,
  Form,
  Input,
  message,
  Select,
  Upload,
} from 'ant-design-vue';

// 组件注册
const AForm = Form;
const AFormItem = Form.Item;
const AInput = Input;
const ASelect = Select;
const AButton = Button;
const ACard = Card;
const AUpload = Upload;
const ACollapse = Collapse;
const ACollapsePanel = Collapse.Panel;

const router = useRouter();
const formRef = ref<InstanceType<typeof AForm>>();
const activeKeys = ref(['advanced-settings']);
const formState = ref<Record<string, any>>({});

// 通用验证规则生成器
const requiredRule = (message: string) => ({ required: true, message });

// 表单配置
const schema = [
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入数据集名称',
      class: 'w-full',
    },
    fieldName: 'datasetFile',
    label: '数据集名称：',
    rules: [requiredRule('请输入数据集名称')],
  },
  {
    component: 'Select',
    componentProps: {
      allowClear: true,
      showSearch: true,
      options: [
        { label: '文本', value: '1' },
        { label: '图像', value: '2' },
        { label: '音频', value: '3' },
      ],
      placeholder: '请选择',
      filterOption: (input: string, option: any) =>
        option.label.toLowerCase().includes(input.toLowerCase()),
    },
    fieldName: 'datasetType',
    label: '数据类型：',
    rules: [requiredRule('请选择数据类型')],
  },
  {
    component: 'Select',
    componentProps: {
      allowClear: true,
      showSearch: true,
      options: [
        { label: '南京', value: '1' },
        { label: '江西', value: '2' },
        { label: '广东', value: '3' },
      ],
      placeholder: '请选择',
      filterOption: (input: string, option: any) =>
        option.label.toLowerCase().includes(input.toLowerCase()),
    },
    fieldName: 'datasetZone',
    label: '数据区域：',
    rules: [requiredRule('请选择数据区域')],
  },
  {
    component: 'Select',
    componentProps: {
      allowClear: true,
      showSearch: true,
      options: [
        { label: '否', value: '0' },
        { label: '是', value: '1' },
      ],
      placeholder: '请选择',
      filterOption: (input: string, option: any) =>
        option.label.toLowerCase().includes(input.toLowerCase()),
    },
    fieldName: 'encryption',
    label: '是否需要加密',
    rules: [requiredRule('请选择加密选项')],
  },
  {
    component: 'Select',
    componentProps: {
      allowClear: true,
      showSearch: true,
      options: [
        { label: '否', value: '0' },
        { label: '是', value: '1' },
      ],
      placeholder: '请选择',
      filterOption: (input: string, option: any) =>
        option.label.toLowerCase().includes(input.toLowerCase()),
    },
    fieldName: 'subDataArea',
    label: '子数据域',
    rules: [requiredRule('请选择子数据域选项')],
  },
  {
    component: 'Select',
    componentProps: {
      allowClear: true,
      showSearch: true,
      options: [
        { label: '否', value: '0' },
        { label: '是', value: '1' },
      ],
      placeholder: '请选择',
      filterOption: (input: string, option: any) =>
        option.label.toLowerCase().includes(input.toLowerCase()),
    },
    fieldName: 'bucket',
    label: '存储桶',
    rules: [requiredRule('请选择存储桶选项')],
  },
];

// 表单提交处理
const handleSubmit = async () => {
  try {
    await formRef.value?.validate();
    onSubmit(formState.value);
  } catch {
    message.error('请正确填写所有必填字段');
  }
};

const handleCancel = () => {
  router.go(-1);
};

const onSubmit = (values: Record<string, any>) => {
  message.success(`表单数据: ${JSON.stringify(values)}`);
};

// 文件上传处理
const beforeUpload = (file: File) => {
  const isLt100G = file.size / 1024 / 1024 / 1024 < 100; // 100GB
  if (!isLt100G) {
    message.error('文件大小不能超过100GB');
    return false;
  }
  return true;
};
</script>

<template>
  <Page title="新增数据集" />
  <div class="flex flex-col">
    <div class="p-1 shadow">
      <ACard class="mb-4">
        <AForm
          ref="formRef"
          :model="formState"
          layout="vertical"
          class="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <!-- 动态生成表单项 -->
          <template v-for="item in schema" :key="item.fieldName">
            <AFormItem
              :label="item.label"
              :name="item.fieldName"
              :rules="item.rules"
            >
              <component
                :is="item.component === 'Input' ? AInput : ASelect"
                v-bind="item.componentProps"
                v-model:value="formState[item.fieldName]"
              />
            </AFormItem>
          </template>

          <!-- 描述输入区域 -->
          <AFormItem class="col-span-2" label="描述：" name="describe">
            <AInput.TextArea
              v-model:value="formState.describe"
              :maxlength="50"
              :show-count="true"
              placeholder="请输入数据集描述,不超过50个字符"
              :style="{ height: '100px' }"
            />
          </AFormItem>
        </AForm>

        <!-- 高级设置折叠面板 -->
        <ACollapse
          v-model:active-key="activeKeys"
          class="advanced-collapse mt-4"
          :bordered="false"
        >
          <ACollapsePanel key="advanced-settings" :show-arrow="true">
            <template #header>
              <div class="collapse-header">
                高级设置
                <div class="header-line"></div>
              </div>
            </template>

            <div class="upload-section">
              <AUpload
                class="w-full"
                action="/upload"
                accept=".csv,.txt,.json,.zip"
                :show-upload-list="true"
                :before-upload="beforeUpload"
                type="drag"
                :multiple="false"
              >
                <div class="drag-content">
                  <div class="upload-tip">
                    <span class="tip-icon">📁</span>
                    <p class="tip-text">点击或拖拽文件到此区域上传</p>
                    <p class="support-types">支持格式：CSV、TXT、JSON、ZIP</p>
                    <p class="size-limit">单个文件不超过100GB</p>
                  </div>
                </div>
              </AUpload>
            </div>
          </ACollapsePanel>
          <div class="divider"></div>
        </ACollapse>

        <!-- 操作按钮 -->
        <div class="mt-6 text-center">
          <AButton type="primary" @click="handleSubmit" class="mr-2">
            提交
          </AButton>
          <AButton @click="handleCancel">取消</AButton>
        </div>
      </ACard>
    </div>
  </div>
</template>

<style scoped>
/* 上传区域样式 */
.upload-section {
  @apply rounded-lg bg-gray-50;
}

:deep(.ant-upload.ant-upload-drag) {
  @apply h-full border-2 border-dashed border-gray-200 bg-transparent p-8 hover:border-blue-500;
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.ant-upload.ant-upload-drag-hover) {
  @apply border-blue-500 bg-blue-50;
}

:deep(.ant-upload-text) {
  @apply hidden;
}

/* 调整高级设置和描述之间的间距 */
:deep(.advanced-collapse) {
  margin-top: 0px; /* 调整折叠面板的上间距 */
}

:deep(.ant-form-item) {
  margin-bottom: 0px; /* 调整每个表单项的下间距 */
}

.upload-section {
  margin-top: 10px; /* 控制上传区域的顶部间距 */
}

/* 折叠面板样式 */
:deep(.advanced-collapse) {
  background: transparent !important;
  border: 0 !important;
}

:deep(.advanced-collapse .ant-collapse-item) {
  border: 0 !important;
}

:deep(.advanced-collapse .ant-collapse-header) {
  padding: 12px 0 !important;
  border: 0 !important;
  cursor: pointer !important;
}

:deep(.advanced-collapse .ant-collapse-content) {
  border: 0 !important;
  background: transparent !important;
}

.header-line {
  @apply absolute bottom-0 left-0 h-px w-full bg-gray-200;
}

/* 拖拽内容样式 */
.drag-content {
  @apply flex flex-col items-center justify-center text-center;
}

.upload-tip {
  @apply space-y-2;
}

.tip-icon {
  @apply mb-3 text-4xl;
}

.tip-text {
  @apply text-base font-medium text-gray-800;
}

.support-types {
  @apply text-sm text-gray-600;
}

.size-limit {
  @apply text-xs text-gray-400;
}
</style>
