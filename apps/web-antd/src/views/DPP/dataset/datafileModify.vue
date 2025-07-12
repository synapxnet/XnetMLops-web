<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

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

// 引入API函数
import { fetchDatasetDetail, updateDataset } from '../../SMP/api/dataset'; // 新增fetchDatasetDetail和updateDataset
import { fetchConfig } from '../../SMP/api/datasetConfig'; // 新增fetchDatasetDetail和updateDataset

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
const route = useRoute();
const formRef = ref<InstanceType<typeof AForm>>();
const activeKeys = ref(['advanced-settings']);
const formState = ref<Record<string, any>>({
  datasetFile: '',
  datasetType: undefined,
  datasetZone: undefined,
  encryption: undefined,
  subDataArea: undefined,
  bucket: undefined,
  describe: '',
  teamName: '',
});

// 当前编辑的数据集ID
const datasetId = ref<null | number>(null);

// 配置数据
const configData = ref({
  datasetTypes: [] as { label: string; value: string }[],
  datasetZones: [] as { label: string; value: string }[],
});

// 从API加载配置
const loadConfig = async () => {
  try {
    const data = await fetchConfig();
    configData.value = {
      datasetTypes: data.datasetTypes,
      datasetZones: data.datasetZones,
    };
  } catch (error) {
    console.error('加载配置失败:', error);
    message.error('加载配置失败，使用默认配置');

    // 使用默认配置作为后备
    configData.value = {
      datasetTypes: [
        { label: '文本', value: '1' },
        { label: '图像', value: '2' },
        { label: '音频', value: '3' },
      ],
      datasetZones: [
        { label: '南京', value: '1' },
        { label: '江西', value: '2' },
        { label: '广东', value: '3' },
      ],
    };
  }
};

// 通用验证规则生成器
const requiredRule = (message: string) => ({ required: true, message });

// 表单配置 - 使用计算属性
const schema = computed(() => [
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入数据集名称',
      class: 'disabled-input',
      disabled: true,
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
      options: configData.value.datasetTypes,
      placeholder: '请选择',
      filterOption: (input: string, option: any) =>
        option.label.toLowerCase().includes(input.toLowerCase()),
      class: 'disabled-input',
      disabled: true, // 数据类型不可修改
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
      options: configData.value.datasetZones,
      placeholder: '请选择',
      filterOption: (input: string, option: any) =>
        option.label.toLowerCase().includes(input.toLowerCase()),
      class: 'disabled-input',
      disabled: true, // 数据区域不可修改
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
      class: 'disabled-input',
      disabled: true, // 加密选项不可修改
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
      class: 'disabled-input',
      disabled: true, // 子数据域不可修改
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
      class: 'disabled-input',
      disabled: true, // 存储桶不可修改
    },
    fieldName: 'bucket',
    label: '存储桶',
    rules: [requiredRule('请选择存储桶选项')],
  },
  {
    component: 'Input',
    componentProps: {
      placeholder: '租户信息',
      class: 'disabled-input',
      disabled: true,
    },
    fieldName: 'teamName',
    label: '团队：',
  },
]);

// 加载数据集信息 - 从后端API获取
const loadDataset = async () => {
  const id = route.query.id ? Number.parseInt(route.query.id as string) : null;
  if (!id) {
    message.error('数据集ID无效');
    router.go(-1);
    return;
  }

  datasetId.value = id;

  try {
    // 调用API获取数据集详情
    const dataset = await fetchDatasetDetail(id);

    // 填充表单
    formState.value = {
      teamName: dataset.team_name || dataset.tenant_uid || '',
      datasetFile: dataset.dataset_file,
      datasetType: dataset.type,
      datasetZone: dataset.zone,
      encryption: dataset.encryption ? '1' : '0',
      subDataArea: dataset.subdata_area ? '1' : '0',
      bucket: dataset.bucket_name,
      describe: dataset.description || '',
    };
  } catch (error) {
    console.error('加载数据集详情失败', error);
    message.error('加载数据集详情失败');
    router.go(-1);
  }
};

// 初始化加载数据
onMounted(async () => {
  await loadConfig();
  await loadDataset();
});

// 表单提交处理
const handleSubmit = async () => {
  try {
    await formRef.value?.validate();
    await onSubmit(formState.value);
  } catch {
    message.error('请正确填写所有必填字段');
  }
};

const handleCancel = () => {
  router.go(-1);
};

// 表单提交 - 调用API更新数据集
const onSubmit = async (values: Record<string, any>) => {
  if (!datasetId.value) return;

  try {
    // 构造更新数据
    const updateData = {
      description: values.describe,
    };

    await updateDataset(datasetId.value, updateData);

    message.success('数据集更新成功');
    // 跳转回列表页，并展开当前数据集
    router.push({
      path: '/DPP/dataset/index',
      query: {
        expanded: 'true',
        newDatasetId: datasetId.value.toString(),
      },
    });
  } catch (error) {
    console.error('更新数据集失败', error);
    message.error('更新数据集失败');
  }
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
  <!-- 模板部分保持不变 -->
  <Page title="修改数据集" />
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
          <AFormItem
            v-if="formState.fieldName === 'teamName'"
            class="col-span-2"
            :label="formState.label"
            :name="formState.fieldName"
            :rules="formState.rules"
          >
            <component
              :is="formState.component === 'Input' ? AInput : ASelect"
              v-bind="formState.componentProps"
              v-model:value="formState[formState.fieldName]"
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
            保存修改
          </AButton>
          <AButton @click="handleCancel">取消</AButton>
        </div>
      </ACard>
    </div>
  </div>
</template>

<!-- 样式部分保持不变 -->
<style scoped>
/* 与创建页面完全相同的样式 */
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

:deep(.advanced-collapse) {
  margin-top: 0px;
}

:deep(.ant-form-item) {
  margin-bottom: 0px;
}

.upload-section {
  margin-top: 10px;
}

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

/* 添加禁用字段样式 */
:deep(.disabled-input .ant-select-selector),
:deep(.disabled-input .ant-input) {
  background-color: #f5f5f5 !important;
  cursor: not-allowed !important;
  color: rgba(0, 0, 0, 0.65) !important;
}

:deep(.disabled-input .ant-select-arrow) {
  display: none;
}
</style>
