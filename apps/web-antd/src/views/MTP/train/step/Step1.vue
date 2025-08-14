<script lang="ts" setup>
import type { DockerFile } from '../../../SMP/api/types';
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
  Tag,
  Tooltip,
} from 'ant-design-vue';

// 新增API导入
import { getDockerFiles } from '../../../SMP/api/dockerFileManager';

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
  image: '', // 存储用于显示的镜像名称
  imageUid: '', // 新增：存储镜像UID
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
      imageUid: newVal?.imageUid || '', // 新增
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
        image: localFormState.value.image, // 显示名称
        imageUid: localFormState.value.imageUid, // 新增：UID
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
const searchImageKey = ref('');
const selectedImageUid = ref<string>('');

// Docker镜像列表
const dockerImages = ref<DockerFile[]>([]);
const loadingImages = ref(false);

// 镜像表格列定义
const imageColumns = ref([
  {
    title: '',
    dataIndex: 'selection',
    width: 40,
  },
  {
    title: '镜像名称',
    dataIndex: 'name',
    customRender: ({ text }: { text: string }) =>
      h('div', { class: 'font-medium' }, text),
  },
  {
    title: '标签',
    dataIndex: 'tags',
    customRender: ({ text }: { text: string }) => {
      const tags = text ? text.split(',').slice(0, 3) : [];
      return h(
        'div',
        { class: 'flex flex-wrap gap-1' },
        tags.map((tag) => h(Tag, { color: 'blue' }, tag)),
      );
    },
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    customRender: ({ text }: { text: string }) =>
      new Date(text).toLocaleDateString(),
  },
  {
    title: '操作',
    dataIndex: 'action',
    customRender: ({ record }: { record: DockerFile }) =>
      h(
        Button,
        {
          type: 'link',
          size: 'small',
          onClick: (e: Event) => {
            e.stopPropagation();
            Modal.info({
              title: 'Dockerfile 内容',
              width: '60%',
              content: h(
                'pre',
                {
                  class:
                    'bg-gray-100 p-4 rounded overflow-auto max-h-96 font-mono text-sm',
                },
                record.content,
              ),
            });
          },
        },
        '查看内容',
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
      fieldName: 'image', // 注意：这里绑定的是显示名称字段
      label: '镜像：',
      rules: [requiredRule('请选择镜像')],
    },
  ],
]);

// 加载Docker镜像
const loadDockerImages = async () => {
  try {
    loadingImages.value = true;
    const response = await getDockerFiles();
    dockerImages.value = response || [];
  } catch (error) {
    message.error('加载镜像失败');
    console.error('加载镜像错误:', error);
  } finally {
    loadingImages.value = false;
  }
};

// 打开镜像选择器
const openImageSelector = () => {
  if (dockerImages.value.length === 0) {
    loadDockerImages();
  }
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

// 过滤镜像
const filteredImages = computed(() => {
  return dockerImages.value.filter(
    (img) =>
      img.name.toLowerCase().includes(searchImageKey.value.toLowerCase()) ||
      (img.tags &&
        img.tags.toLowerCase().includes(searchImageKey.value.toLowerCase())),
  );
});

// 处理行点击
const handleRowClick = (record: DockerFile) => {
  selectedImageUid.value = record.uid;
};

// 处理镜像确认
const handleImageConfirm = () => {
  if (selectedImageUid.value) {
    selectImage();
  } else {
    message.warning('请先选择一个镜像');
  }
};

// 选择镜像 - 修改：存储UID并显示名称
const selectImage = () => {
  if (selectedImageUid.value) {
    const record = dockerImages.value.find(
      (img) => img.uid === selectedImageUid.value,
    );
    if (record) {
      // 使用更友好的显示格式：名称@标签
      const primaryTag = record.tags ? record.tags.split(',')[0] : 'latest';

      // 设置显示名称
      localFormState.value.image = `${record.name}@${primaryTag}`;

      // 存储镜像UID（向后端传递）
      localFormState.value.imageUid = record.uid;

      showImageDialog.value = false;
      selectedImageUid.value = record.uid;
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
    @cancel="selectedImageUid = ''"
    :after-close="() => (searchImageKey = '')"
  >
    <div class="image-selector">
      <div class="mb-4 flex justify-between">
        <AInput.Search
          v-model:value="searchImageKey"
          placeholder="输入镜像名称或标签搜索..."
          class="w-64"
        />
        <Button
          type="primary"
          @click="loadDockerImages"
          :loading="loadingImages"
        >
          <SyncOutlined :spin="loadingImages" />
          刷新镜像
        </Button>
      </div>

      <ATable
        :columns="imageColumns"
        :data-source="filteredImages"
        :pagination="{ pageSize: 5 }"
        row-key="uid"
        :loading="loadingImages"
        :custom-row="(record) => ({ onClick: () => handleRowClick(record) })"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'selection'">
            <ARadio
              :checked="selectedImageUid === record.uid"
              @click.stop="selectedImageUid = record.uid"
            />
          </template>
          <template v-if="column.dataIndex === 'name'">
            <div class="font-medium">{{ record.name }}</div>
          </template>
        </template>

        <template #emptyText>
          <div v-if="loadingImages" class="py-8 text-center">
            <SyncOutlined spin class="mb-2 text-xl text-blue-500" />
            <p>正在加载镜像列表...</p>
          </div>
          <div v-else class="py-8 text-center text-gray-500">
            <ExclamationCircleOutlined class="mb-2 text-xl" />
            <p>暂无镜像数据</p>
            <Button type="link" @click="loadDockerImages">重新加载</Button>
          </div>
        </template>
      </ATable>
    </div>

    <template #footer>
      <AButton @click="showImageDialog = false">取消</AButton>
      <AButton
        type="primary"
        @click="handleImageConfirm"
        :disabled="!selectedImageUid"
      >
        确定
      </AButton>
    </template>
  </Modal>
</template>

<style lang="scss" scoped>
@use '../taskcommon/form-styles.scss' as *;

.resource-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.resource-card {
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    border-color: #40a9ff;
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
  }

  &.selected {
    border-color: #1890ff;
    background-color: #e6f7ff;
  }

  h3 {
    margin-top: 0;
    margin-bottom: 8px;
    color: #262626;
  }

  .specs {
    color: #595959;
    margin-bottom: 0;
  }
}

.image-selector {
  .ant-table-row {
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: #f0f7ff;
    }

    &.selected {
      background-color: #e6f7ff;
    }
  }
}
</style>
