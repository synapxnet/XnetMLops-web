<script lang="ts" setup>
import type { DockerFile } from '../../../SMP/api/types';
import type { TaskFormState, TaskFormStep1 } from '../taskcommon/task';
import type { JenkinsNode } from '../../../SMP/api/jenkinsNode';

import { computed, defineProps, h, nextTick, ref, watch } from 'vue';

import {
  ExclamationCircleOutlined,
  QuestionCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Divider,
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
import { fetchJenkinsNodesByStatus } from '../../../SMP/api/jenkinsNode';

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

// 非中文验证规则（类似文件夹命名）
const noChineseRule = {
  validator: (_rule: any, value: string) => {
    if (!value) return Promise.resolve();
    // 检查是否包含中文字符
    const chineseRegex = /[\u4e00-\u9fa5]/;
    if (chineseRegex.test(value)) {
      return Promise.reject('任务名称不能包含中文字符');
    }
    // 检查是否符合文件夹命名规范（字母、数字、下划线、中划线）
    const validNameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!validNameRegex.test(value)) {
      return Promise.reject('任务名称只能包含字母、数字、下划线和中划线');
    }
    return Promise.resolve();
  },
  trigger: 'blur',
};
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
const selectedNode = ref<JenkinsNode | null>(null);

// 已部署的Jenkins节点
const deployedNodes = ref<JenkinsNode[]>([]);
const loadingNodes = ref(false);

// 加载已部署的Jenkins节点
const loadDeployedNodes = async () => {
  try {
    loadingNodes.value = true;
    const nodes = await fetchJenkinsNodesByStatus('deployed');
    deployedNodes.value = nodes || [];
  } catch (error) {
    console.error('加载节点失败:', error);
    deployedNodes.value = [];
  } finally {
    loadingNodes.value = false;
  }
};

// 根据训练模式过滤已部署的节点
const filteredDeployedNodes = computed(() => {
  const trainType = localFormState.value.trainType;
  if (!trainType) {
    return deployedNodes.value;
  }
  return deployedNodes.value.filter((node) => node.resource_type === trainType);
});

// 监听训练模式变化，重置已选资源
watch(() => localFormState.value.trainType, () => {
  selectedNode.value = null;
  localFormState.value.resources = '';
});

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
      componentProps: { placeholder: '请输入任务名称（仅支持字母、数字、下划线、中划线）', class: 'w-full' },
      fieldName: 'taskName',
      label: '任务名称：',
      rules: [requiredRule('请输入任务名称'), noChineseRule],
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
          { label: 'CPU', value: 'cpu' },
          { label: '单卡GPU', value: 'single_gpu' },
          { label: '多卡GPU', value: 'multi_gpu' },
        ],
      },
      fieldName: 'trainType',
      label: '训练模式',
      tooltip: '选择与作业节点资源类型匹配的训练模式',
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
  // 加载已部署节点
  if (deployedNodes.value.length === 0) {
    loadDeployedNodes();
  }
  showResourceDialog.value = true;
};

// 选择已部署节点的资源
const selectNodeResource = (node: JenkinsNode) => {
  selectedNode.value = node;

  // 构建显示文本
  let displayText = `${node.name}`;
  const specs = [];
  if (node.cpu_cores) specs.push(`CPU: ${node.cpu_cores}核`);
  if (node.ram_gb) specs.push(`RAM: ${node.ram_gb}GB`);
  if (node.gpu_memory) {
    if (node.gpu_count && node.gpu_count > 1) {
      specs.push(`GPU: ${node.gpu_count}x${node.gpu_memory}GB (${node.gpu_count}x${node.gpu_model})`);
    } else {
      specs.push(`GPU: ${node.gpu_memory}GB (${node.gpu_model || ''})`);
    }
  }
  if (specs.length > 0) {
    displayText += ` (${specs.join(', ')})`;
  }

  localFormState.value.resources = displayText;
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
    title="选择作业节点资源"
    width="900px"
    :footer="null"
  >
    <div class="resource-selector">
      <!-- 提示信息 -->
      <div v-if="!localFormState.trainType" class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-700">
        请先选择训练模式，以便筛选匹配的作业节点
      </div>

      <!-- 加载中 -->
      <div v-if="loadingNodes" class="text-center py-8">
        <SyncOutlined spin class="text-2xl text-blue-500" />
        <p class="mt-2 text-gray-500">正在加载作业节点...</p>
      </div>

      <!-- 已部署节点资源 -->
      <div v-else-if="filteredDeployedNodes.length > 0">
        <div class="mb-4 text-sm text-gray-500">
          共 {{ filteredDeployedNodes.length }} 个可用节点
          <span v-if="localFormState.trainType">
            （{{ localFormState.trainType === 'cpu' ? 'CPU' : localFormState.trainType === 'single_gpu' ? '单卡GPU' : '多卡GPU' }} 类型）
          </span>
        </div>
        <div class="resource-grid">
          <div
            v-for="node in filteredDeployedNodes"
            :key="node.id"
            class="resource-card"
            :class="{ selected: selectedNode?.id === node.id }"
            @click="selectNodeResource(node)"
          >
            <div class="card-header">
              <h3>{{ node.name }}</h3>
              <Tag v-if="node.resource_type === 'cpu'" color="blue">CPU</Tag>
              <Tag v-else-if="node.resource_type === 'single_gpu'" color="green">单卡GPU</Tag>
              <Tag v-else-if="node.resource_type === 'multi_gpu'" color="orange">多卡GPU</Tag>
            </div>
            <div class="card-body">
              <div class="spec-item">
                <span class="spec-label">地域:</span>
                <span class="spec-value">{{ node.region === 'guangzhou' ? '广州' : node.region === 'beijing' ? '北京' : node.region === 'shanghai' ? '上海' : node.region === 'silicon_valley' ? '硅谷' : node.region === 'singapore' ? '新加坡' : node.region || '-' }}</span>
              </div>
              <div class="spec-item">
                <span class="spec-label">主机:</span>
                <span class="spec-value">{{ node.host }}</span>
              </div>
              <div class="spec-item">
                <span class="spec-label">CPU:</span>
                <span class="spec-value">{{ node.cpu_cores || 2 }} 核</span>
              </div>
              <div class="spec-item">
                <span class="spec-label">RAM:</span>
                <span class="spec-value">{{ node.ram_gb || 128 }} GB</span>
              </div>
              <div v-if="node.gpu_memory" class="spec-item">
                <span class="spec-label">GPU:</span>
                <span class="spec-value">{{ node.gpu_count && node.gpu_count > 1 ? `${node.gpu_count}x` : '' }}{{ node.gpu_memory }}GB</span>
              </div>
              <div v-if="node.gpu_model" class="spec-item">
                <span class="spec-label">GPU型号:</span>
                <span class="spec-value">{{ node.gpu_count && node.gpu_count > 1 ? `${node.gpu_count}x ` : '' }}{{ node.gpu_model }}</span>
              </div>
            </div>
            <div class="card-footer">
              <Tag :color="node.container_type === 'cce' ? 'purple' : 'cyan'">
                {{ node.container_type === 'cce' ? 'CCE' : 'Docker' }}
              </Tag>
            </div>
          </div>
        </div>
      </div>

      <!-- 无可用节点 -->
      <div v-else class="text-center py-8 text-gray-400">
        <ExclamationCircleOutlined class="text-4xl mb-4" />
        <p>暂无可用的作业节点</p>
        <p class="text-sm mt-2">请先在SMP模块中配置并部署作业节点</p>
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

.resource-selector {
  max-height: 500px;
  overflow-y: auto;
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.resource-card {
  border: 2px solid hsl(var(--border));
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: hsl(var(--card));

  &:hover {
    border-color: #40a9ff;
    box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15);
    transform: translateY(-2px);
  }

  &.selected {
    border-color: #1890ff;
    background-color: hsl(var(--primary) / 12%);
    box-shadow: 0 4px 12px rgba(24, 144, 255, 0.25);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid hsl(var(--border));

    h3 {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
      color: hsl(var(--foreground));
    }
  }

  .card-body {
    margin-bottom: 12px;
  }

  .spec-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
    font-size: 13px;
  }

  .spec-label {
    color: hsl(var(--muted-foreground));
  }

  .spec-value {
    color: hsl(var(--foreground));
    font-weight: 500;
  }

  .card-footer {
    padding-top: 8px;
    border-top: 1px solid hsl(var(--border));
  }

  .description {
    font-size: 12px;
    color: hsl(var(--muted-foreground));
  }

  h3 {
    margin-top: 0;
    margin-bottom: 8px;
    color: hsl(var(--foreground));
  }

  .specs {
    color: hsl(var(--muted-foreground));
    margin-bottom: 0;
  }
}

.resource-card.selected .card-header h3 {
  color: #1890ff;
}

.image-selector {
  .ant-table-row {
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: hsl(var(--primary) / 8%);
    }

    &.selected {
      background-color: hsl(var(--primary) / 12%);
    }
  }
}
</style>
