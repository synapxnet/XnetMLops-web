<script lang="ts" setup>
import type { TaskFormState, TaskFormStep2 } from '../taskcommon/task';

import { nextTick, onMounted, ref, watch } from 'vue';

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

import { fetchAlgorithmList } from '../../../SMP/api/algorithm';
import { fetchDatasetList } from '../../../SMP/api/dataset';

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
  id: string;
  name: string;
  selectedName: string;
  selectedId: string;
  selectedUID: string;
  bucketIdentifier: string;
  datasetName: string;
}

// 本地表单状态
const localFormState = ref<TaskFormStep2>({
  algorithmUID: '',
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
      algorithmUID: newVal.algorithmUID || '',
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
        algorithmUID: localFormState.value.algorithmUID,
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
  if (!localFormState.value.datasets) {
    localFormState.value.datasets = [];
  }

  const newDataset: Dataset = {
    id: crypto.randomUUID(),
    name: '',
    selectedName: '',
  };

  localFormState.value.datasets.push(newDataset);

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

// 选择算法
const selectedAlgorithmId = ref<string>(''); // 修复：使用字符串类型

// 获取组件类型
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

// 确认选择的算法 - 修复：使用正确的字段名
const handleAlgorithmConfirm = () => {
  if (selectedAlgorithmId.value) {
    const record = algorithmOptions.value.find(
      (a) => a.id === selectedAlgorithmId.value,
    );
    if (record) {
      // 使用后端返回的正确字段名
      localFormState.value.algorithmUID = record.uid;
      localFormState.value.algorithmName = record.algorithm_name;
      localFormState.value.algorithmVersion = record.version;
      showAlgorithmDialog.value = false;
      selectedAlgorithmId.value = '';
    }
  } else {
    message.warning('请先选择一个算法');
  }
};

// 处理算法行点击 - 修复：直接设置表单值
const handleAlgorithmRowClick = (record: any) => {
  selectedAlgorithmId.value = record.id;

  // 直接更新表单状态，避免需要点击确定按钮
  localFormState.value.algorithmName = record.algorithm_name;
  localFormState.value.algorithmUID = record.uid;
  localFormState.value.algorithmVersion = record.version;
};

// 处理数据集选择
const handleDatasetSelect = (record: any) => {
  if (
    currentDatasetIndex.value >= 0 &&
    localFormState.value.datasets?.length > currentDatasetIndex.value
  ) {
    localFormState.value.datasets[currentDatasetIndex.value].selectedName =
      record.dataset_file;
    localFormState.value.datasets[currentDatasetIndex.value].selectedId =
      record.id;
    localFormState.value.datasets[currentDatasetIndex.value].selectedUID =
      record.uid;
    localFormState.value.datasets[currentDatasetIndex.value].bucketIdentifier =
      record.bucket_identifier;
    localFormState.value.datasets[currentDatasetIndex.value].datasetName =
      record.dataset_name;
    showDatasetDialog.value = false;
    currentDatasetIndex.value = -1;
  } else {
    console.error('无效的数据集索引:', currentDatasetIndex.value);
    message.error('数据集选择失败: 无效的索引');
  }
};

// 从后端获取算法列表
const algorithmOptions = ref<any[]>([]);
const fetchAlgorithms = async () => {
  try {
    const data = await fetchAlgorithmList();
    algorithmOptions.value = data.map((item) => ({
      ...item,
      id: item.id.toString(), // 确保ID是字符串类型
      uid: item.uid,
      algorithm_name: item.algorithm_name,
      version: item.version,
      updated: item.updated_at || '未知',
      creationdate: item.created_at || '未知',
      bucket: item.bucket_name || '未知',
      description: item.description || '无描述',
    }));
  } catch (error) {
    console.error('获取算法列表失败:', error);
    message.error('获取算法列表失败');
  }
};

// 从后端获取数据集列表
const datasetOptions = ref<any[]>([]);
const fetchDatasets = async () => {
  try {
    const data = await fetchDatasetList();
    datasetOptions.value = data.map((item) => ({
      ...item,
      id: item.id.toString(), // 确保ID是字符串类型
      name: item.dataset_file,
      bucket_identifier: item.bucket_identifier,
      dataset_name: item.dataset_file,
      dataset_uid: item.uid,
      type: getTypeLabel(item.type),
      version: `${Math.floor(Math.random() * 100)}.${Math.floor(Math.random() * 10)} MB`,
    }));
  } catch (error) {
    console.error('获取数据集列表失败:', error);
    message.error('获取数据集列表失败');
  }
};

// 获取类型标签
const getTypeLabel = (type: string) => {
  switch (type) {
    case '1': {
      return '文本';
    }
    case '2': {
      return '图像';
    }
    case '3': {
      return '音频';
    }
    default: {
      return '未知';
    }
  }
};

// 组件挂载时获取数据
onMounted(() => {
  fetchAlgorithms();
  fetchDatasets();
});

// 算法表格列定义
const algorithmColumns = ref([
  {
    title: '',
    dataIndex: 'selection',
    width: 40,
  },
  { title: '算法名称', dataIndex: 'algorithm_name' },
  { title: '版本', dataIndex: 'version' },
  { title: '更新时间', dataIndex: 'updated' },
  { title: '描述', dataIndex: 'description' },
]);

// 数据集表格列定义
const datasetColumns = ref([
  {
    title: '',
    dataIndex: 'selection',
    width: 40,
  },
  { title: '数据集名称', dataIndex: 'dataset_file' },
  { title: '版本', dataIndex: 'version' },
  { title: '类型', dataIndex: 'type' },
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
              + 新增参数
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
    @cancel="selectedAlgorithmId = ''"
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
              @click.stop="handleAlgorithmRowClick(record)"
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
      :pagination="{ pageSize: 5 }"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'selection'">
          <ARadio
            :checked="
              localFormState.datasets[currentDatasetIndex]?.selectedName ===
              record.dataset_file
            "
            @click="handleDatasetSelect(record)"
          />
        </template>
        <template v-else-if="column.dataIndex === 'type'">
          {{ getTypeLabel(record.type) }}
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
