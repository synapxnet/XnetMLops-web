<script lang="ts" setup>
import type { TaskFormState, TaskFormStep2 } from '../taskcommon/task';

import { nextTick, ref, watch } from 'vue';

import {
  Button,
  Form,
  Input,
  message,
  Modal,
  Radio,
  Select,
  Table,
} from 'ant-design-vue';

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

const ARadio = Radio;
const ARadioGroup = Radio.Group;

const AButton = Button;
const ATable = Table;

// 数据集相关状态
interface Dataset {
  id: string; // 新增唯一标识
  name: string;
  selectedName: string;
}
// 本地表单状态
const localFormState = ref<TaskFormStep2>({
  algorithmName: '',
  algorithmVersion: '',
  datasets: [],
  taskroute: '',
});

// 同步父组件数据
watch(
  () => props.modelValue.taskStep2,
  (newVal) => {
    localFormState.value = {
      algorithmName: newVal.algorithmName || '',
      algorithmVersion: newVal.algorithmVersion || '',
      datasets: newVal.datasets?.length ? [...newVal.datasets] : [],
      taskroute: newVal.taskroute || '',
    };
  },
  { immediate: true, deep: true },
);

const formRef = ref<InstanceType<typeof AForm>>();
const requiredRule = (message: string) => ({ required: true, message });

const current = ref(0);
const validate = async () => {
  try {
    await formRef.value?.validateFields();
    emit('update:modelValue', {
      ...props.modelValue,
      taskStep2: {
        algorithmName: localFormState.value.algorithmName,
        algorithmVersion: localFormState.value.algorithmVersion,
        datasets: localFormState.value.datasets,
        taskroute: localFormState.value.taskroute,
      },
    });
    return true;
  } catch (error) {
    console.error('Step2 验证失败:', error);
    return Promise.reject(new Error('表单验证失败'));
  }
};
defineExpose({ validate });
const showAlgorithmDialog = ref(false);

const addDataset = () => {
  // 确保datasets数组存在
  if (!localFormState.value.datasets) {
    localFormState.value.datasets = [];
  }

  // 添加新数据集时生成唯一ID
  const newDataset: Dataset = {
    id: crypto.randomUUID(), // 使用更可靠的ID生成方式
    name: '',
    selectedName: '',
  };

  localFormState.value.datasets.push(newDataset);

  // 优化验证清理逻辑
  nextTick(() => {
    const lastIndex = localFormState.value.datasets.length - 1;
    formRef.value?.clearValidate([
      `datasets.${lastIndex}.name`,
      `datasets.${lastIndex}.selectedName`,
    ]);
  });
};
const currentDatasetIndex = ref(-1);
const showDatasetDialog = ref(false);
// 打开数据集选择弹窗
const openDatasetSelect = (index: number) => {
  // 添加索引有效性检查
  if (index >= 0 && localFormState.value.datasets?.length > index) {
    currentDatasetIndex.value = index;
    showDatasetDialog.value = true;
  } else {
    message.error('操作失败: 无效的数据集索引');
  }
};
// 删除数据集参数行
const removeDataset = (index: number) => {
  if (index >= 0 && localFormState.value.datasets?.length > index) {
    localFormState.value.datasets.splice(index, 1);
    nextTick(() => formRef.value?.validate());
  } else {
    message.error('无法删除不存在的数据集');
  }
};

// 选择数据集
const selectedAlgorithmId = ref<number>();
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
const handleAlgorithmConfirm = () => {
  if (selectedAlgorithmId.value) {
    const record = algorithmOptions.value.find(
      (a) => a.id === selectedAlgorithmId.value,
    );
    if (record) {
      localFormState.value.algorithmName = record.name;
      localFormState.value.algorithmVersion = record.version;
      showAlgorithmDialog.value = false;
      selectedAlgorithmId.value = undefined;
    }
  } else {
    message.warning('请先选择一个算法');
  }
};
// 算法选择处理方法
const handleAlgorithmRowClick = (record: any) => {
  selectedAlgorithmId.value = record.id;
};
// 处理数据集选择
const handleDatasetSelect = (record: any) => {
  // 添加双重验证
  if (
    currentDatasetIndex.value >= 0 &&
    localFormState.value.datasets?.length > currentDatasetIndex.value
  ) {
    localFormState.value.datasets[currentDatasetIndex.value].selectedName =
      record.name;
    showDatasetDialog.value = false;
    currentDatasetIndex.value = -1; // 重置为安全值
  } else {
    console.error('无效的数据集索引:', currentDatasetIndex.value);
    message.error('数据集选择失败: 无效的索引');
  }
};
const datasetOptions = ref([
  { id: 1, name: 'MNIST', version: 'v1.0', type: '图像' },
  { id: 2, name: 'CIFAR-10', version: 'v2.1', type: '图像' },
  { id: 3, name: 'IMDB', version: 'v1.5', type: '文本' },
]);
const schemas = ref([
  [
    {
      component: 'Input',
      componentProps: {
        placeholder: '点击选择算法',
        class: 'w-full',
        readonly: true,
      },
      fieldName: 'algorithmName',
      label: '算法：',
      rules: [requiredRule('请选择算法')],
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '点击选择版本',
        class: 'w-full',
        readonly: true,
      },
      fieldName: 'algorithmVersion',
      label: '版本：',
      rules: [requiredRule('请选择版本')],
    },
  ],
]);

// 算法表格列定义
const algorithmColumns = ref([
  {
    title: '',
    dataIndex: 'selection',
    width: 40,
  },
  { title: '算法名称', dataIndex: 'name' },
  { title: '版本', dataIndex: 'version' },
  { title: '创建时间', dataIndex: 'creationdate' },
  { title: '更新时间', dataIndex: 'updated' },
  { title: '存储桶', dataIndex: 'bucket' },
  { title: '描述', dataIndex: 'description' },
]);

const algorithmOptions = ref([
  {
    id: 1,
    name: '随机森林',
    version: 'v1.2.0',
    updated: '2023-04-20',
    creationdate: '2023-04-20',
    bucket: 'bucket1',
    description: '用于分类任务的随机森林算法',
  },
  {
    id: 2,
    name: '神经网络',
    version: 'v2.1.3',
    creationdate: '2023-04-20',
    updated: '2023-04-20',
    bucket: 'bucket1',
    description: '深度学习神经网络模型',
  },
  {
    id: 3,
    name: 'SVM',
    version: 'v3.0.1',
    creationdate: '2023-04-20',
    updated: '2023-04-20',
    bucket: 'bucket1',
    description: '支持向量机分类器',
  },
]);

const datasetColumns = ref([
  {
    title: '',
    dataIndex: 'selection',
    width: 40,
  },
  { title: '数据集名称', dataIndex: 'name' },
  { title: '版本', dataIndex: 'version' },
  { title: '类型', dataIndex: 'type' },
]);
</script>
<template>
  <AForm
    ref="formRef"
    :model="localFormState"
    layout="vertical"
    class="grid grid-cols-1 gap-4 md:grid-cols-2"
  >
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

    <!-- 隐藏的高级配置 -->
    <!-- 修改后的第二步表单部分 -->
    <div
      v-if="localFormState.algorithmName && localFormState.algorithmVersion"
      class="col-span-2"
    >
      <!-- 数据集配置 -->
      <div class="dataset-section">
        <div class="section-header">
          <div class="header-top">
            <h3 class="section-title">数据集参数配置</h3>
            <AButton type="dashed" @click="addDataset" class="add-btn">
              <PlusOutlined /> 新增参数
            </AButton>
          </div>
          <a-divider class="divider" />
        </div>

        <div
          v-for="(dataset, index) in localFormState.datasets || []"
          :key="dataset.id"
          class="dataset-row"
        >
          <AFormItem
            :label="index === 0 ? '数据集目录：数据集名称：' : ''"
            :name="['datasets', index, 'name']"
            :rules="[{ required: true, message: '请输入数据集名称' }]"
          >
            <div class="dataset-input-group">
              <AInput
                v-model:value="dataset.name"
                placeholder="请输入数据集名称"
                class="dataset-name-input"
              />
              <AInput
                v-model:value="dataset.selectedName"
                placeholder="选择数据集"
                readonly
                class="dataset-select-input"
                @click="openDatasetSelect(index)"
              />
              <AButton
                v-if="index >= 0"
                danger
                @click="removeDataset(index)"
                class="ml-2"
              >
                删除
              </AButton>
            </div>
          </AFormItem>
        </div>
      </div>

      <!-- 算法配置 -->
      <div class="dataset-section">
        <div class="section-header">
          <div class="header-top">
            <h3 class="section-title">算法配置</h3>
            <a-divider class="divider" />
          </div>

          <AFormItem
            label="入口脚本："
            name="taskroute"
            :rules="[{ required: true, message: '请输入脚本入口' }]"
          >
            <AInput
              v-model:value="localFormState.taskroute"
              placeholder="请输入脚本入口（示例：main.py）"
              class="w-full"
            />
          </AFormItem>
        </div>
      </div>
    </div>
  </AForm>
  <!-- 算法选择弹窗 -->
  <Modal
    v-model:open="showAlgorithmDialog"
    title="选择算法"
    width="800px"
    @cancel="selectedAlgorithmId = undefined"
  >
    <div class="algorithm-selector">
      <ATable
        :columns="algorithmColumns"
        :data-source="algorithmOptions"
        :pagination="{ pageSize: 5 }"
        row-key="id"
        :custom-row="
          (record) => ({ onClick: () => handleAlgorithmRowClick(record) })
        "
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'selection'">
            <ARadio
              :checked="selectedAlgorithmId === record.id"
              @click.stop="selectedAlgorithmId = record.id"
            />
          </template>
        </template>
      </ATable>
    </div>

    <template #footer>
      <AButton @click="showAlgorithmDialog = false">取消</AButton>
      <AButton type="primary" @click="handleAlgorithmConfirm">确定</AButton>
    </template>
  </Modal>
  <!-- 数据集选择弹窗 -->
  <Modal v-model:open="showDatasetDialog" title="选择数据集" width="800px">
    <ATable
      :columns="datasetColumns"
      :data-source="datasetOptions"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'selection'">
          <ARadio
            :checked="
              localFormState.datasets[currentDatasetIndex]?.selectedName ===
              record.name
            "
            @click="handleDatasetSelect(record)"
          />
        </template>
      </template>
    </ATable>
    <template #footer>
      <AButton @click="showDatasetDialog = false">取消</AButton>
      <AButton type="primary" @click="showDatasetDialog = false">确定</AButton>
    </template>
  </Modal>
</template>
<style lang="scss" scoped>
@use '../taskcommon/form-styles.scss' as *;
</style>
