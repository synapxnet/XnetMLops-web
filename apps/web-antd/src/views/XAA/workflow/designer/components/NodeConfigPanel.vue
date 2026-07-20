<template>
  <div v-if="node" class="node-config-panel">
    <div class="node-config-panel__header">
      <div class="node-config-panel__title-row">
        <div
          class="node-config-panel__icon"
          :style="{ backgroundColor: metadata?.color }"
        >
          <component :is="getIcon(metadata?.icon)" />
        </div>
        <div class="node-config-panel__title">
          {{ metadata?.title }}
        </div>
      </div>
      <Button type="text" size="small" @click="closePanel">
        <template #icon><CloseOutlined /></template>
      </Button>
    </div>

    <div class="node-config-panel__content">
      <!-- 基础配置 -->
      <Form layout="vertical" :model="formData">
        <FormItem label="节点名称">
          <Input
            v-model:value="formData.title"
            placeholder="输入节点名称"
            @change="updateNodeData"
          />
        </FormItem>

        <FormItem label="描述">
          <Textarea
            v-model:value="formData.description"
            placeholder="输入节点描述"
            :rows="2"
            @change="updateNodeData"
          />
        </FormItem>

        <Divider />

        <!-- 根据节点类型显示不同配置 -->
        <!-- DPP 数据集配置 -->
        <template v-if="node.data.type === 'dpp-dataset'">
          <FormItem label="选择数据集">
            <Select
              v-model:value="formData.config.datasetId"
              placeholder="选择数据集"
              :options="datasetOptions"
              show-search
              allow-clear
              @change="updateNodeData"
            />
          </FormItem>
        </template>

        <!-- DPP 特征工程配置 -->
        <template v-else-if="node.data.type === 'dpp-feature'">
          <FormItem label="选择特征工程">
            <Select
              v-model:value="formData.config.featureId"
              placeholder="选择特征工程"
              :options="featureOptions"
              show-search
              allow-clear
              @change="updateNodeData"
            />
          </FormItem>
        </template>

        <!-- MTP 算法配置 -->
        <template v-else-if="node.data.type === 'mtp-algorithm'">
          <FormItem label="选择算法">
            <Select
              v-model:value="formData.config.algorithmId"
              placeholder="选择算法"
              :options="algorithmOptions"
              show-search
              allow-clear
              @change="updateNodeData"
            />
          </FormItem>
        </template>

        <!-- MTP 训练配置 -->
        <template v-else-if="node.data.type === 'mtp-train'">
          <FormItem label="训练任务名称">
            <Input
              v-model:value="formData.config.taskName"
              placeholder="输入训练任务名称"
              @change="updateNodeData"
            />
          </FormItem>
          <FormItem label="超参数配置">
            <Textarea
              v-model:value="hyperParamsJson"
              placeholder='{"learning_rate": 0.001, "epochs": 100}'
              :rows="4"
              @change="updateHyperParams"
            />
          </FormItem>
        </template>

        <!-- MEP 部署配置 -->
        <template v-else-if="node.data.type === 'mep-deploy'">
          <FormItem label="部署名称">
            <Input
              v-model:value="formData.config.deploymentName"
              placeholder="输入部署名称"
              @change="updateNodeData"
            />
          </FormItem>
          <FormItem label="副本数">
            <InputNumber
              v-model:value="formData.config.replicas"
              :min="1"
              :max="10"
              @change="updateNodeData"
            />
          </FormItem>
          <FormItem label="CPU">
            <Input
              v-model:value="formData.config.resourceConfig.cpu"
              placeholder="例如: 1000m"
              @change="updateNodeData"
            />
          </FormItem>
          <FormItem label="内存">
            <Input
              v-model:value="formData.config.resourceConfig.memory"
              placeholder="例如: 2Gi"
              @change="updateNodeData"
            />
          </FormItem>
        </template>

        <!-- 条件分支配置 -->
        <template v-else-if="node.data.type === 'if-else'">
          <div v-for="(caseItem, index) in formData.config.cases" :key="caseItem.caseId" class="condition-case">
            <div class="condition-case__header">
              <span>{{ index === 0 ? 'IF' : `ELSE IF ${index}` }}</span>
              <Button
                v-if="index > 0"
                type="text"
                size="small"
                danger
                @click="removeCase(index)"
              >
                <template #icon><DeleteOutlined /></template>
              </Button>
            </div>
            <FormItem label="分支名称">
              <Input
                v-model:value="caseItem.name"
                placeholder="输入分支名称"
                @change="updateNodeData"
              />
            </FormItem>
            <FormItem label="条件">
              <div v-for="(condition, cIndex) in caseItem.conditions" :key="condition.id" class="condition-row">
                <Input
                  v-model:value="condition.variable"
                  placeholder="变量"
                  style="width: 30%"
                  @change="updateNodeData"
                />
                <Select
                  v-model:value="condition.operator"
                  style="width: 30%"
                  :options="operatorOptions"
                  @change="updateNodeData"
                />
                <Input
                  v-model:value="condition.value"
                  placeholder="值"
                  style="width: 30%"
                  @change="updateNodeData"
                />
                <Button type="text" size="small" danger @click="removeCondition(index, cIndex)">
                  <template #icon><MinusCircleOutlined /></template>
                </Button>
              </div>
              <Button type="dashed" size="small" block @click="addCondition(index)">
                <template #icon><PlusOutlined /></template>
                添加条件
              </Button>
            </FormItem>
          </div>
          <Button type="dashed" block @click="addCase">
            <template #icon><PlusOutlined /></template>
            添加 ELSE IF 分支
          </Button>
        </template>

        <!-- HTTP 请求配置 -->
        <template v-else-if="node.data.type === 'http-request'">
          <FormItem label="请求方法">
            <Select
              v-model:value="formData.config.method"
              :options="methodOptions"
              @change="updateNodeData"
            />
          </FormItem>
          <FormItem label="URL">
            <Input
              v-model:value="formData.config.url"
              placeholder="https://api.example.com/endpoint"
              @change="updateNodeData"
            />
          </FormItem>
          <FormItem label="请求头">
            <Textarea
              v-model:value="headersJson"
              placeholder='{"Content-Type": "application/json"}'
              :rows="3"
              @change="updateHeaders"
            />
          </FormItem>
          <FormItem label="请求体">
            <Textarea
              v-model:value="formData.config.body"
              placeholder="请求体内容"
              :rows="4"
              @change="updateNodeData"
            />
          </FormItem>
          <FormItem label="超时时间 (ms)">
            <InputNumber
              v-model:value="formData.config.timeout"
              :min="1000"
              :max="120000"
              :step="1000"
              @change="updateNodeData"
            />
          </FormItem>
        </template>

        <!-- 代码执行配置 -->
        <template v-else-if="node.data.type === 'code'">
          <FormItem label="编程语言">
            <Select
              v-model:value="formData.config.language"
              :options="languageOptions"
              @change="updateNodeData"
            />
          </FormItem>
          <FormItem label="代码">
            <Textarea
              v-model:value="formData.config.code"
              placeholder="在这里编写代码"
              :rows="10"
              style="font-family: monospace"
              @change="updateNodeData"
            />
          </FormItem>
        </template>

        <!-- 等待节点配置 -->
        <template v-else-if="node.data.type === 'wait'">
          <FormItem label="等待时间">
            <Space>
              <InputNumber
                v-model:value="formData.config.duration"
                :min="1"
                @change="updateNodeData"
              />
              <Select
                v-model:value="formData.config.unit"
                style="width: 100px"
                :options="unitOptions"
                @change="updateNodeData"
              />
            </Space>
          </FormItem>
        </template>

        <!-- 开始/结束节点无需额外配置 -->
        <template v-else-if="node.data.type === 'start' || node.data.type === 'end'">
          <Empty description="此节点无需额外配置" />
        </template>

        <!-- 其他节点显示通用配置 -->
        <template v-else>
          <Alert message="此节点类型的配置面板正在开发中" type="info" show-icon />
        </template>
      </Form>
    </div>

    <div class="node-config-panel__footer">
      <Button danger @click="deleteNode">
        <template #icon><DeleteOutlined /></template>
        删除节点
      </Button>
    </div>
  </div>
  <div v-else class="node-config-panel node-config-panel--empty">
    <Empty description="选择一个节点查看配置" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  Button,
  Form,
  FormItem,
  Input,
  Textarea,
  Select,
  InputNumber,
  Divider,
  Space,
  Empty,
  Alert,
} from 'ant-design-vue';
import {
  CloseOutlined,
  DeleteOutlined,
  PlusOutlined,
  MinusCircleOutlined,
  PlayCircleOutlined,
  StopOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  ThunderboltOutlined,
  RobotOutlined,
  RocketOutlined,
  CrownOutlined,
  CloudUploadOutlined,
  ApiOutlined,
  BranchesOutlined,
  SyncOutlined,
  ApartmentOutlined,
  GlobalOutlined,
  CodeOutlined,
  EditOutlined,
  FileTextOutlined,
  HourglassOutlined,
} from '@ant-design/icons-vue';
import { NODE_METADATA, DEFAULT_NODE_CONFIGS } from '../constants';
import type { WorkflowNode, NodeData } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  node: WorkflowNode | null;
  datasets?: any[];
  features?: any[];
  algorithms?: any[];
}

const props = withDefaults(defineProps<Props>(), {
  datasets: () => [],
  features: () => [],
  algorithms: () => [],
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update', nodeId: string, data: Partial<NodeData>): void;
  (e: 'delete', nodeId: string): void;
}>();

const metadata = computed(() => {
  if (!props.node) return null;
  return NODE_METADATA[props.node.data.type];
});

const formData = ref<NodeData>({
  type: 'start' as any,
  title: '',
  description: '',
  config: {},
});

const hyperParamsJson = ref('{}');
const headersJson = ref('{}');

watch(
  () => props.node,
  (newNode) => {
    if (newNode) {
      formData.value = JSON.parse(JSON.stringify(newNode.data));
      hyperParamsJson.value = JSON.stringify(formData.value.config?.hyperParameters || {}, null, 2);
      headersJson.value = JSON.stringify(formData.value.config?.headers || {}, null, 2);
    }
  },
  { immediate: true, deep: true }
);

const iconMap: Record<string, any> = {
  'play-circle': PlayCircleOutlined,
  'stop-circle': StopOutlined,
  database: DatabaseOutlined,
  experiment: ExperimentOutlined,
  thunderbolt: ThunderboltOutlined,
  robot: RobotOutlined,
  rocket: RocketOutlined,
  crown: CrownOutlined,
  'cloud-upload': CloudUploadOutlined,
  api: ApiOutlined,
  branches: BranchesOutlined,
  sync: SyncOutlined,
  apartment: ApartmentOutlined,
  global: GlobalOutlined,
  code: CodeOutlined,
  edit: EditOutlined,
  'file-text': FileTextOutlined,
  hourglass: HourglassOutlined,
};

function getIcon(iconName?: string) {
  if (!iconName) return null;
  return iconMap[iconName] || null;
}

const datasetOptions = computed(() =>
  props.datasets.map((d) => ({ value: d.id, label: d.name }))
);

const featureOptions = computed(() =>
  props.features.map((f) => ({ value: f.id, label: f.name }))
);

const algorithmOptions = computed(() =>
  props.algorithms.map((a) => ({ value: a.id, label: a.name }))
);

const operatorOptions = [
  { value: 'equals', label: '等于' },
  { value: 'not_equals', label: '不等于' },
  { value: 'contains', label: '包含' },
  { value: 'not_contains', label: '不包含' },
  { value: 'greater_than', label: '大于' },
  { value: 'less_than', label: '小于' },
  { value: 'is_empty', label: '为空' },
  { value: 'is_not_empty', label: '不为空' },
];

const methodOptions = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'PATCH', label: 'PATCH' },
];

const languageOptions = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
];

const unitOptions = [
  { value: 'seconds', label: '秒' },
  { value: 'minutes', label: '分钟' },
  { value: 'hours', label: '小时' },
];

function closePanel() {
  emit('close');
}

function updateNodeData() {
  if (props.node) {
    emit('update', props.node.id, formData.value);
  }
}

function updateHyperParams() {
  try {
    formData.value.config.hyperParameters = JSON.parse(hyperParamsJson.value);
    updateNodeData();
  } catch (e) {
    // Invalid JSON, ignore
  }
}

function updateHeaders() {
  try {
    formData.value.config.headers = JSON.parse(headersJson.value);
    updateNodeData();
  } catch (e) {
    // Invalid JSON, ignore
  }
}

function deleteNode() {
  if (props.node) {
    emit('delete', props.node.id);
  }
}

function addCase() {
  const newCase = {
    caseId: uuidv4(),
    name: `分支 ${formData.value.config.cases.length + 1}`,
    logicalOperator: 'and',
    conditions: [],
  };
  formData.value.config.cases.push(newCase);
  updateNodeData();
}

function removeCase(index: number) {
  formData.value.config.cases.splice(index, 1);
  updateNodeData();
}

function addCondition(caseIndex: number) {
  const newCondition = {
    id: uuidv4(),
    variable: '',
    operator: 'equals',
    value: '',
  };
  formData.value.config.cases[caseIndex].conditions.push(newCondition);
  updateNodeData();
}

function removeCondition(caseIndex: number, conditionIndex: number) {
  formData.value.config.cases[caseIndex].conditions.splice(conditionIndex, 1);
  updateNodeData();
}
</script>

<style lang="scss" scoped>
.node-config-panel {
  width: 320px;
  height: 100%;
  background: #fff;
  border-left: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;

  &--empty {
    justify-content: center;
    align-items: center;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid #e5e7eb;
  }

  &__title-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    color: #fff;
    font-size: 16px;
  }

  &__title {
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
  }

  &__content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  &__footer {
    padding: 16px;
    border-top: 1px solid #e5e7eb;
  }
}

.condition-case {
  margin-bottom: 16px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    font-weight: 600;
    color: #374151;
  }
}

.condition-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}
</style>
