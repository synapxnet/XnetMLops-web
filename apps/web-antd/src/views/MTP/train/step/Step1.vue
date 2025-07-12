<script lang="ts" setup>
import type { TaskFormState, TaskFormStep1 } from '../taskcommon/task';

import { computed, defineProps, h, nextTick, ref, watch } from 'vue';

import {
  Button,
  Form,
  Input,
  message,
  Modal,
  Radio,
  Select,
  Table,
  Tooltip,
} from 'ant-design-vue';

// 修改props定义
const props = defineProps<{
  isEditMode: {
    default: false;
    type: Boolean;
  };
  modelValue: TaskFormState;
}>();

const emit = defineEmits(['update:modelValue']);
const requiredRule = (message: string) => ({ required: true, message });
// 组件注册
const AForm = Form;
const AFormItem = Form.Item;
const AInput = Input;
const ASelect = Select;
const ARadio = Radio;
const ARadioGroup = Radio.Group;

const AButton = Button;
const ATable = Table;

const formRef = ref<InstanceType<typeof AForm>>();
const localFormState = ref<TaskFormStep1>({
  taskName: '',
  taskType: '',
  encryption: '',
  taskZone: '',
  podType: '',
  resources: '',
  trainType: '',
  image: '',
  describe: '',
});
const current = ref(0);
// 添加watch同步数据
watch(
  () => props.modelValue.taskStep1,
  (newVal) => {
    localFormState.value = {
      taskName: newVal?.taskName || '',
      taskType: newVal?.taskType || '',
      encryption: newVal?.encryption || '',
      taskZone: newVal?.taskZone || '',
      podType: newVal?.podType || '',
      resources: newVal?.resources || '',
      trainType: newVal?.trainType || '',
      image: newVal?.image || '',
      describe: newVal?.describe || '',
    };
  },
  { immediate: true },
);
const validate = async () => {
  try {
    // 正确合并方式：将当前步骤数据放在 taskStep1 层级
    const updatedValue = {
      ...props.modelValue, // 保留其他步骤数据
      taskStep1: {
        taskName: localFormState.value.taskName,
        taskType: localFormState.value.taskType,
        encryption: localFormState.value.encryption,
        taskZone: localFormState.value.taskZone,
        podType: localFormState.value.podType,
        resources: localFormState.value.resources,
        trainType: localFormState.value.trainType,
        image: localFormState.value.image,
        describe: localFormState.value.describe,
      },
    };

    emit('update:modelValue', updatedValue);
    await formRef.value?.validateFields();
    return true;
  } catch (error) {
    return Promise.reject(error);
  }
};

defineExpose({ validate });
// 资源选择弹窗状态
const showResourceDialog = ref(false);
const resourceOptions = ref([
  { id: 1, name: 'GPU-A100', specs: '80GB显存' },
  { id: 2, name: 'GPU-V100', specs: '32GB显存' },
  { id: 3, name: 'CPU-16C', specs: '16核64GB' },
]);

// 镜像选择相关状态
const showImageDialog = ref(false);
const showPackageDialog = ref(false);
const searchImageKey = ref('');
const selectedPackages = ref<Record<string, string>>({});
const selectedImageId = ref<number>();

const imageOptions = ref([
  {
    id: 1,
    name: 'TensorFlow 2.9',
    version: 'v2.9.0',
    size: '1.2GB',
    updated: '2023-03-15',
    packages: {
      numpy: '1.23.5',
      tensorflow: '2.9.0',
      keras: '2.9.0',
    },
  },
  {
    id: 2,
    name: 'PyTorch 1.12',
    version: 'v1.12.1',
    size: '890MB',
    updated: '2023-04-20',
    packages: {
      torch: '1.12.1',
      numpy: '1.22.4',
      cuda: '11.6',
    },
  },
  {
    id: 3,
    name: 'Ubuntu 20.04',
    version: '20.04.4',
    size: '2.1GB',
    updated: '2023-05-10',
    packages: {
      bash: '5.0.17',
      coreutils: '8.30',
      apt: '2.0.9',
    },
  },
]);

const imageColumns = ref([
  {
    title: '',
    dataIndex: 'selection',
    width: 40,
  },
  { title: '镜像名称', dataIndex: 'name' },
  { title: '版本', dataIndex: 'version' },
  { title: '大小', dataIndex: 'size' },
  { title: '更新时间', dataIndex: 'updated' },
  {
    title: '库列表',
    dataIndex: 'packages',
    customRender: ({ record }: { record: any }) =>
      h(
        'a',
        {
          onClick: (e: Event) => {
            e.stopPropagation();
            selectedPackages.value = record.packages;
            showPackageDialog.value = true;
          },
        },
        '查看详细',
      ),
  },
]);

const schemas = ref([
  [
    {
      component: 'Input',
      componentProps: { placeholder: '请输入任务名称', class: 'w-full' },
      fieldName: 'taskName',
      label: '任务名称：',
      rules: [requiredRule('请输入任务名称')],
    },
    {
      component: 'Select',
      componentProps: {
        placeholder: '请选择任务类型',
        class: 'w-full',
        options: [
          { label: '训练任务', value: '0' },
          { label: '聚类任务', value: '1' },
        ],
      },
      fieldName: 'taskType',
      label: '任务类型：',
      rules: [requiredRule('请选择任务类型')],
    },
    {
      component: 'Select',
      componentProps: {
        placeholder: '请选择是否加密',
        class: 'w-full',
        options: [
          { label: '否', value: '0' },
          { label: '是', value: '1' },
        ],
      },
      fieldName: 'encryption',
      label: '加密：',
      rules: [requiredRule('请选择是否加密')],
    },
    {
      component: 'Select',
      componentProps: {
        placeholder: '请选择训练区域',
        class: 'w-full',
        options: [
          { label: '南京', value: '0' },
          { label: '江西', value: '1' },
        ],
      },
      fieldName: 'taskZone',
      label: '训练区域：',
      rules: [requiredRule('请选择训练区域')],
    },
    {
      component: 'RadioGroup',
      optionType: 'button',
      rules: [requiredRule('请选择容器类型')],
      componentProps: {
        options: [
          { label: 'CCE', value: '0' },
          { label: 'Docker', value: '1' },
        ],
      },
      fieldName: 'podType',
      tooltip: '请选择容器池类型，CCE为云容器引擎，Docker为本地容器',
      label: '容器池',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请选择资源规格',
        class: 'w-full',
        readonly: true,
      },
      fieldName: 'resources',
      label: '资源规格：',
      rules: [requiredRule('请选择资源规格')],
    },
    {
      component: 'RadioGroup',
      optionType: 'button',
      rules: [requiredRule('请选择训练模式')],
      componentProps: {
        options: [
          { label: '单机CPU', value: '0' },
          { label: '多机CPU', value: '1' },
          { label: '单机GPU', value: '2' },
          { label: '多机GPU', value: '3' },
        ],
      },
      fieldName: 'trainType',
      label: '训练模式',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '点击选择镜像',
        class: 'w-full',
        readonly: true,
      },
      fieldName: 'image',
      label: '镜像：',
      rules: [requiredRule('请选择镜像')],
    },
  ],
]);
const openImageSelector = () => {
  showImageDialog.value = true;
};

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

const openResourceSelector = () => {
  showResourceDialog.value = true;
};

const selectResource = (resource: any) => {
  localFormState.value.resources = resource.name;
  showResourceDialog.value = false;

  // 主动触发资源字段验证
  nextTick(() => {
    formRef.value?.validateFields(['resources']);
  });
};
const filteredImages = computed(() => {
  return imageOptions.value.filter((img) =>
    img.name.toLowerCase().includes(searchImageKey.value.toLowerCase()),
  );
});
const handleRowClick = (record: any) => {
  selectedImageId.value = record.id;
};
const handleImageConfirm = () => {
  if (selectedImageId.value) {
    selectImage();
  } else {
    message.warning('请先选择一个镜像');
  }
};
const selectImage = () => {
  if (selectedImageId.value) {
    const record = imageOptions.value.find(
      (img) => img.id === selectedImageId.value,
    );
    if (record) {
      localFormState.value.image = `${record.name}@${record.version}`;
      showImageDialog.value = false;
      selectedImageId.value = undefined;
      searchImageKey.value = '';

      // 主动触发镜像字段验证
      nextTick(() => {
        formRef.value?.validateFields(['image']);
      });
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
    <template v-for="item in schemas[current]" :key="item.fieldName">
      <AFormItem
        :label="item.label"
        :name="item.fieldName"
        :rules="item.rules"
        :disabled="isEditMode"
      >
        <template v-if="item.tooltip">
          <div class="flex items-center">
            <Tooltip :title="item.tooltip">
              <QuestionCircleOutlined class="mr-1" />
            </Tooltip>
            <component
              :is="getComponent(item.component)"
              v-bind="item.componentProps"
              v-model:value="localFormState[item.fieldName]"
              @click="item.fieldName === 'resources' && openResourceSelector()"
              :class="{
                'cursor-pointer': ['resources', 'image'].includes(
                  item.fieldName,
                ),
              }"
            />
          </div>
        </template>
        <template v-else>
          <component
            :is="getComponent(item.component)"
            v-bind="item.componentProps"
            v-model:value="localFormState[item.fieldName]"
            @click="
              item.fieldName === 'resources'
                ? openResourceSelector()
                : item.fieldName === 'image'
                  ? openImageSelector()
                  : null
            "
            :class="{
              'cursor-pointer': ['resources', 'image'].includes(item.fieldName),
            }"
          />
        </template>
      </AFormItem>
    </template>

    <AFormItem class="col-span-2" label="描述：" name="describe">
      <AInput.TextArea
        v-model:value="localFormState.describe"
        :maxlength="50"
        :show-count="true"
        placeholder="请输入数据集描述,不超过50个字符"
        :style="{ height: '100px' }"
      />
    </AFormItem>
  </AForm>

  <!-- 资源选择弹窗 -->
  <Modal
    v-model:open="showResourceDialog"
    title="选择资源规格"
    width="800px"
    :footer="null"
  >
    <div class="resource-grid">
      <div
        v-for="resource in resourceOptions"
        :key="resource.id"
        class="resource-card"
        @click="selectResource(resource)"
        :class="{ selected: localFormState.resources === resource.name }"
      >
        <h3>{{ resource.name }}</h3>
        <p class="specs">{{ resource.specs }}</p>
      </div>
    </div>
  </Modal>

  <!-- 镜像选择弹窗 -->
  <Modal
    v-model:open="showImageDialog"
    title="选择镜像"
    width="800px"
    @cancel="selectedImageId = undefined"
  >
    <div class="image-selector">
      <AInput.Search
        v-model:value="searchImageKey"
        placeholder="输入镜像名称搜索..."
        class="mb-4 w-64"
      />

      <ATable
        :columns="imageColumns"
        :data-source="filteredImages"
        :pagination="{ pageSize: 5 }"
        row-key="id"
        :custom-row="(record) => ({ onClick: () => handleRowClick(record) })"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'selection'">
            <ARadio
              :checked="selectedImageId === record.id"
              @click.stop="selectedImageId = record.id"
            />
          </template>
          <template v-if="column.dataIndex === 'name'">
            <div class="font-medium">{{ record.name }}</div>
          </template>
        </template>
      </ATable>
    </div>

    <template #footer>
      <AButton @click="showImageDialog = false">取消</AButton>
      <AButton type="primary" @click="handleImageConfirm">确定</AButton>
    </template>
  </Modal>

  <!-- 库详情弹窗 -->
  <Modal
    v-model:open="showPackageDialog"
    title="库详细信息"
    width="600px"
    :footer="null"
  >
    <div class="package-detail">
      <div
        v-for="(version, name) in selectedPackages"
        :key="name"
        class="package-item"
      >
        <span class="package-name">{{ name }}</span>
        <span class="package-version">{{ version }}</span>
      </div>
    </div>
    <div class="dialog-footer">
      <AButton type="primary" @click="showPackageDialog = false">关闭</AButton>
    </div>
  </Modal>
</template>
<style lang="scss" scoped>
@use '../taskcommon/form-styles.scss' as *;
</style>
