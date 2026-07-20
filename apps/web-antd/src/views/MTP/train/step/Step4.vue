<script lang="ts" setup>
import type { TaskFormState, TaskFormStep4 } from '../taskcommon/task';

import { computed, ref, watch } from 'vue';

import { PlusOutlined, QuestionCircleOutlined } from '@ant-design/icons-vue';
import {
  Button,
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Radio,
  Select,
  Table,
  Tooltip,
} from 'ant-design-vue';
import dayjs from 'dayjs';

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
const ARadioButton = Radio.Button;
const ADatePicker = DatePicker;
const ADateRangePicker = DatePicker.RangePicker;
const AInputNumber = InputNumber;
const AButton = Button;
const ATable = Table;
const ACheckbox = Checkbox;
const ATooltip = Tooltip;

// 修改本地表单状态初始化，添加通知触发条件
const localFormState = ref<TaskFormStep4>({
  scheduleConfig: {
    intervalType: 'daily',
    cronExpression: '',
    dailyTime: '',
    dateRange: [],
    hourlyMinute: '',
    intervalDuration: 1,
    intervalUnit: 'hours',
    offsetTime: '',
    onceTime: null,
    weeklyDays: [],
    weeklyTime: '',
    isActive: false,
  },
  outputConfig: {
    autoPublish: false,
    isActive: false,
    outputPath: '',
    outputType: '',
  },
  notificationConfig: {
    notificationContent: '',
    notificationTitle: '',
    notificationUserID: '',
    notificationTrigger: 'on_failure', // 新增：通知触发条件，默认失败通知
    isActive: false,
  },
});

watch(
  () => props.modelValue.taskStep4,
  (newVal) => {
    const { scheduleConfig, outputConfig, notificationConfig } = newVal;

    // 过滤掉undefined的属性，避免覆盖本地已有值
    const sanitizeConfig = (config: any) => {
      const sanitized = { ...config };
      Object.keys(sanitized).forEach(
        (key) => sanitized[key] === undefined && delete sanitized[key],
      );
      return sanitized;
    };

    localFormState.value = {
      scheduleConfig: {
        ...localFormState.value.scheduleConfig,
        ...scheduleConfig,
        isActive: scheduleConfig?.isActive ?? false,
        dailyTime: scheduleConfig?.dailyTime || '',
        weeklyTime: scheduleConfig?.weeklyTime || '',
        hourlyMinute: scheduleConfig?.hourlyMinute || '',
        onceTime: scheduleConfig?.onceTime
          ? dayjs(scheduleConfig.onceTime)
          : null,
        dateRange: scheduleConfig?.dateRange?.map((d) => dayjs(d)) || [],
      },
      outputConfig: {
        ...localFormState.value.outputConfig,
        ...sanitizeConfig(outputConfig || {}),
        isActive: outputConfig?.isActive ?? false,
      },
      notificationConfig: {
        ...localFormState.value.notificationConfig,
        ...sanitizeConfig(notificationConfig || {}),
        isActive: notificationConfig?.isActive ?? false,
        // 设置默认值，如果没有则使用失败通知
        notificationTrigger:
          notificationConfig?.notificationTrigger || 'on_failure',
      },
    };
  },
  { immediate: true, deep: true },
);

// 表单验证
const formRef = ref<InstanceType<typeof AForm>>();
const validate = async () => {
  try {
    const errors: string[] = [];
    const { scheduleConfig, outputConfig, notificationConfig } =
      localFormState.value;

    // 调度配置验证
    if (scheduleConfig.isActive) {
      if (scheduleConfig.intervalType) {
        const validateMap = {
          daily: () =>
            !localFormState.value.scheduleConfig.dailyTime?.trim() &&
            '每日时间',
          weekly: () =>
            (!localFormState.value.scheduleConfig.weeklyDays?.length ||
              !localFormState.value.scheduleConfig.weeklyTime?.trim()) &&
            '每周日期/时间',
          hourly: () =>
            !localFormState.value.scheduleConfig.hourlyMinute?.trim() &&
            '分钟数',
          cron: () => !scheduleConfig.cronExpression && 'Cron表达式',
          interval: () =>
            (!scheduleConfig.intervalDuration ||
              !scheduleConfig.intervalUnit ||
              !scheduleConfig.dateRange?.[0] ||
              !scheduleConfig.dateRange?.[1]) &&
            '间隔配置和日期范围',
          once: () => !scheduleConfig.onceTime && '执行时间',
        };

        const errorMsg = validateMap[scheduleConfig.intervalType]?.();
        if (errorMsg) errors.push(errorMsg);
      } else {
        errors.push('请选择调度类型');
      }
    }

    // 输出配置验证
    if (outputConfig.isActive) {
      if (!outputConfig.outputPath) errors.push('输出路径');
      if (!outputConfig.outputType) errors.push('输出类型');
    }

    // 通知配置验证
    if (notificationConfig.isActive) {
      if (!notificationConfig.notificationTitle) errors.push('通知标题');
      if (!notificationConfig.notificationContent) errors.push('通知内容');
      if (!notificationConfig.notificationUserID) errors.push('接收人');
      // 新增：通知触发条件验证（可选，因为有默认值）
      if (!notificationConfig.notificationTrigger) {
        localFormState.value.notificationConfig.notificationTrigger =
          'on_failure';
      }
    }

    if (errors.length > 0) {
      throw new Error(`以下必填项未填写：${errors.join('、')}`);
    }

    // 数据转换
    const submitData: TaskFormStep4 = {
      scheduleConfig: {
        ...localFormState.value.scheduleConfig,
        dateRange: localFormState.value.scheduleConfig.dateRange?.map((d) =>
          d.toDate(),
        ),
        onceTime: localFormState.value.scheduleConfig.onceTime?.toDate(),
        dailyTime: localFormState.value.scheduleConfig.dailyTime,
        weeklyTime: localFormState.value.scheduleConfig.weeklyTime,
        hourlyMinute: localFormState.value.scheduleConfig.hourlyMinute,
      },
      outputConfig: { ...localFormState.value.outputConfig },
      notificationConfig: { ...localFormState.value.notificationConfig },
    };
    emit('update:modelValue', {
      ...props.modelValue,
      taskStep4: submitData,
    });

    return true;
  } catch (error) {
    if (error.errorFields) {
      message.error('请正确填写表单中的红色提示项');
    } else {
      message.error(error.message);
    }
    return false;
  }
};
defineExpose({ validate });

// 星期选项
const weekDayOptions = ref(
  Array.from({ length: 7 }, (_, i) => ({
    value: String(i + 1),
    label: `星期${['日', '一', '二', '三', '四', '五', '六'][i]}`,
  })),
);

// 通知触发条件选项
const notificationTriggerOptions = [
  {
    value: 'on_failure',
    label: '任务失败时通知',
    description: '仅当任务执行失败时发送通知',
  },
  {
    value: 'on_success',
    label: '任务成功时通知',
    description: '仅当任务执行成功时发送通知',
  },
  {
    value: 'always',
    label: '无论失败成功都通知',
    description: '无论任务执行结果如何都发送通知',
  },
];

// 自动发布绑定到scheduleConfig
const autoPublish = computed({
  get: () => localFormState.value.outputConfig.autoPublish,
  set: (val) => (localFormState.value.outputConfig.autoPublish = val),
});

// 调度配置启用状态
const enableScheduling = computed({
  get: () => localFormState.value.scheduleConfig.isActive,
  set: (val) => {
    localFormState.value.scheduleConfig.isActive = val;
    if (!val) {
      localFormState.value.scheduleConfig = {
        ...localFormState.value.scheduleConfig,
        intervalType: undefined,
        autoPublish: false,
        cronExpression: undefined,
        dailyTime: undefined,
        dateRange: undefined,
        hourlyMinute: undefined,
        intervalDuration: undefined,
        intervalUnit: undefined,
        offsetTime: undefined,
        onceTime: undefined,
        weeklyDays: undefined,
        weeklyTime: undefined,
      };
    }
  },
});

// 输出配置启用状态
const enableOutput = computed({
  get: () => localFormState.value.outputConfig.isActive,
  set: (val) => {
    localFormState.value.outputConfig.isActive = val;
    if (!val) {
      localFormState.value.outputConfig = {
        autoPublish: false,
        isActive: false,
        outputPath: '',
        outputType: '',
      };
    }
  },
});

// 通知配置启用状态
const enableNotification = computed({
  get: () => localFormState.value.notificationConfig.isActive,
  set: (val) => {
    localFormState.value.notificationConfig.isActive = val;
    if (!val) {
      localFormState.value.notificationConfig = {
        isActive: false,
        notificationContent: '',
        notificationTitle: '',
        notificationUserID: '',
        notificationTrigger: 'on_failure', // 重置时也重置触发条件
      };
    }
  },
});

const showOutputDialog = ref(false);
// 通知配置相关状态

interface OutputConfig {
  id: number;
  name: string;
  description: string;
}
const selectedOutput = ref<OutputConfig>();

// 输出配置相关状态
const outputSearchKey = ref('');
const showAddForm = ref(false);
const newOutput = ref<OutputConfig>({
  id: 0,
  name: '',
  description: '',
});
const handleConfirmOutput = () => {
  if (selectedOutput.value) {
    localFormState.value.outputConfig.outputPath = selectedOutput.value.name;
    localFormState.value.outputConfig.outputType =
      selectedOutput.value.name.toLowerCase();
    localFormState.value.outputConfig.isActive = true;
    showOutputDialog.value = false;
  }
};
// 过滤后的输出配置
const filteredOutputs = computed(() => {
  return outputOptions.value.filter((config) =>
    config.name.toLowerCase().includes(outputSearchKey.value.toLowerCase()),
  );
});
// 更新处理方法
const handleSelectOutput = (record: OutputConfig) => {
  selectedOutput.value = record;
};
// 新增输出配置
const handleAddOutput = () => {
  if (!newOutput.value.name) {
    message.warning('请输入配置名称');
    return;
  }

  // 生成新ID
  newOutput.value.id = outputOptions.value.length + 1;

  outputOptions.value.push({ ...newOutput.value });
  message.success('新增成功');
  showAddForm.value = false;
  newOutput.value = { id: 0, name: '', description: '' };
};
// 调度配置相关状态

const outputOptions = ref<OutputConfig[]>([
  { id: 1, name: '模型输出', description: '训练模型结果输出' },
  { id: 2, name: '日志输出', description: '训练过程日志输出' },
  { id: 3, name: '数据输出', description: '处理后的数据输出' },
]);
</script>
<template>
  <AForm
    ref="formRef"
    :model="localFormState"
    layout="vertical"
    class="grid grid-cols-1 gap-4 md:grid-cols-2"
  >
    <!-- 周期调度配置 -->
    <div class="col-span-2">
      <div class="dataset-section">
        <div class="section-header">
          <div class="header-top">
            <h3 class="section-title">
              <ACheckbox v-model:checked="enableScheduling">
                开启周期调度
              </ACheckbox>
            </h3>
          </div>
          <a-divider class="divider" />
        </div>

        <div v-if="enableScheduling" class="scheduling-config">
          <!-- 调度类型选择 -->
          <AFormItem
            label="调度类型"
            name="['scheduleConfig', 'intervalType']"
            :rules="[{ required: true, message: '请选择调度类型' }]"
          >
            <ARadioGroup
              v-model:value="localFormState.scheduleConfig.intervalType"
              button-style="solid"
              class="scheduler-type-radio"
            >
              <ARadioButton value="daily">每天</ARadioButton>
              <ARadioButton value="weekly">每周</ARadioButton>
              <ARadioButton value="hourly">每小时</ARadioButton>
              <ARadioButton value="cron">Cron表达式</ARadioButton>
              <ARadioButton value="interval"> 周期间隔 </ARadioButton>
              <ARadioButton value="once">预约调度</ARadioButton>
            </ARadioGroup>
          </AFormItem>

          <!-- 每天调度配置 -->
          <div
            v-if="localFormState.scheduleConfig.intervalType === 'daily'"
            class="grid grid-cols-2 gap-4"
          >
            <AFormItem
              label="开始时间"
              name="scheduleConfig.dailyTime"
              :rules="[{ required: true, message: '请选择时间' }]"
            >
              <AInput
                v-model:value="localFormState.scheduleConfig.dailyTime"
                type="time"
                placeholder="23:00"
              />
            </AFormItem>
          </div>

          <!-- 每周调度配置 -->
          <div
            v-if="localFormState.scheduleConfig.intervalType === 'weekly'"
            class="grid grid-cols-2 gap-4"
          >
            <AFormItem
              label="选择星期"
              name="scheduleConfig.weeklyDays"
              :rules="[{ required: true, message: '请选择星期' }]"
            >
              <ASelect
                v-model:value="localFormState.scheduleConfig.weeklyDays"
                mode="multiple"
                placeholder="选择星期"
                :options="weekDayOptions"
              />
            </AFormItem>
            <AFormItem
              label="执行时间"
              name="scheduleConfig.weeklyTime"
              :rules="[{ required: true, message: '请选择时间' }]"
            >
              <AInput
                v-model:value="localFormState.scheduleConfig.weeklyTime"
                type="time"
                placeholder="23:00"
              />
            </AFormItem>
          </div>

          <!-- 每小时调度配置 -->
          <div
            v-if="localFormState.scheduleConfig.intervalType === 'hourly'"
            class="grid grid-cols-2 gap-4"
          >
            <AFormItem
              label="开始分钟"
              name="scheduleConfig.hourlyMinute"
              :rules="[{ required: true, message: '请输入分钟数' }]"
            >
              <AInput
                v-model:value="localFormState.scheduleConfig.hourlyMinute"
                :min="0"
                :max="59"
                placeholder="0-59"
              />
            </AFormItem>
          </div>

          <!-- Cron表达式 -->
          <div
            v-if="localFormState.scheduleConfig.intervalType === 'cron'"
            class="grid grid-cols-2 gap-4"
          >
            <AFormItem
              label="Cron表达式"
              name="scheduleConfig.cronExpression"
              :rules="[{ required: true, message: '请输入Cron表达式' }]"
            >
              <AInput
                v-model:value="localFormState.scheduleConfig.cronExpression"
                placeholder="* * * * *"
              />
              <div class="mt-1 text-sm text-gray-500">
                使用标准cron表达式格式（分 时 日 月 周）
              </div>
            </AFormItem>
          </div>

          <!-- 周期间隔 -->
          <div
            v-if="localFormState.scheduleConfig.intervalType === 'interval'"
            class="grid grid-cols-3 gap-4"
          >
            <AFormItem
              label="间隔时长"
              name="scheduleConfig.intervalDuration"
              :rules="[{ required: true, message: '请输入间隔时长' }]"
            >
              <AInputNumber
                v-model:value="localFormState.scheduleConfig.intervalDuration"
                :min="1"
              />
            </AFormItem>
            <AFormItem
              label="周期类型"
              name="scheduleConfig.intervalUnit"
              :rules="[{ required: true, message: '请选择间隔单位' }]"
            >
              <ASelect
                v-model:value="localFormState.scheduleConfig.intervalUnit"
                :options="[
                  { value: 'hours', label: '小时' },
                  { value: 'days', label: '天' },
                  { value: 'weeks', label: '周' },
                  { value: 'months', label: '月' },
                ]"
              />
            </AFormItem>
            <AFormItem label="偏移时间" name="scheduleConfig.offsetTime">
              <AInput
                v-model:value="localFormState.scheduleConfig.offsetTime"
                placeholder="HH:mm"
              />
            </AFormItem>
            <AFormItem
              label="任务起止时间"
              name="scheduleConfig.dateRange"
              class="col-span-3"
            >
              <ADateRangePicker
                v-model:value="localFormState.scheduleConfig.dateRange"
                show-time
                format="YYYY-MM-DD HH:mm"
              />
            </AFormItem>
          </div>

          <!-- 预约调度 -->
          <div
            v-if="localFormState.scheduleConfig.intervalType === 'once'"
            class="grid grid-cols-2 gap-4"
          >
            <AFormItem
              label="执行时间"
              name="scheduleConfig.onceTime"
              :rules="[{ required: true, message: '请选择执行时间' }]"
            >
              <ADatePicker
                v-model:value="localFormState.scheduleConfig.onceTime"
                show-time
                format="YYYY-MM-DD HH:mm"
              />
            </AFormItem>
          </div>
        </div>
      </div>
    </div>

    <!-- 输出配置 -->
    <div class="col-span-2">
      <div class="dataset-section">
        <div class="section-header">
          <div class="header-top">
            <h3 class="section-title">
              <ACheckbox v-model:checked="enableOutput">
                开启输出配置
              </ACheckbox>
            </h3>
          </div>
          <a-divider class="divider" />
        </div>

        <div v-if="enableOutput" class="output-config">
          <AFormItem
            label="输出配置"
            name="outputConfig.outputPath"
            :rules="[{ required: true, message: '请选择输出配置' }]"
          >
            <AInput
              :value="localFormState.outputConfig.outputPath"
              readonly
              placeholder="点击选择输出配置"
              class="cursor-pointer"
              @click="showOutputDialog = true"
            />
          </AFormItem>
          <AFormItem label="自动发布" name="outputConfig.autoPublish">
            <ACheckbox v-model:checked="autoPublish"> 自动发布结果 </ACheckbox>
          </AFormItem>
        </div>
      </div>
    </div>

    <!-- 通知模板配置 -->
    <div class="col-span-2">
      <div class="dataset-section">
        <div class="section-header">
          <div class="header-top">
            <h3 class="section-title">
              <ACheckbox v-model:checked="enableNotification">
                开启通知模板
              </ACheckbox>
            </h3>
          </div>
          <a-divider class="divider" />
        </div>

        <div v-if="enableNotification" class="notification-config">
          <AFormItem
            label="通知人"
            name="notificationConfig.notificationUserID"
            :rules="[{ required: true, message: '请输入用户ID' }]"
          >
            <AInput
              v-model:value="
                localFormState.notificationConfig.notificationUserID
              "
            />
          </AFormItem>
          <AFormItem
            label="通知标题"
            name="notificationConfig.notificationTitle"
            :rules="[{ required: true, message: '请输入标题' }]"
          >
            <AInput
              v-model:value="
                localFormState.notificationConfig.notificationTitle
              "
            />
          </AFormItem>
          <AFormItem
            label="通知内容"
            name="notificationConfig.notificationContent"
            :rules="[{ required: true, message: '请输入内容' }]"
          >
            <AInput.TextArea
              v-model:value="
                localFormState.notificationConfig.notificationContent
              "
              :rows="4"
            />
          </AFormItem>

          <!-- 新增：高级设置 - 通知触发条件 -->
          <div class="advanced-settings mt-4">
            <h4
              class="mb-2 flex items-center text-sm font-medium text-gray-700"
            >
              <span>高级设置</span>
              <ATooltip title="配置通知的触发条件">
                <QuestionCircleOutlined class="ml-1 text-gray-400" />
              </ATooltip>
            </h4>
            <AFormItem
              label="触发条件"
              name="notificationConfig.notificationTrigger"
              class="mt-2"
            >
              <ARadioGroup
                v-model:value="
                  localFormState.notificationConfig.notificationTrigger
                "
                class="notification-trigger-radio"
              >
                <ARadio
                  v-for="option in notificationTriggerOptions"
                  :key="option.value"
                  :value="option.value"
                  class="notification-radio-item"
                >
                  <div class="flex flex-col">
                    <span class="font-medium">{{ option.label }}</span>
                    <span class="text-xs text-gray-500">{{
                      option.description
                    }}</span>
                  </div>
                </ARadio>
              </ARadioGroup>
            </AFormItem>
          </div>
        </div>
      </div>
    </div>
  </AForm>
  <!-- 输出配置选择弹窗 -->
  <Modal v-model:open="showOutputDialog" title="输出配置管理" width="800px">
    <div class="output-manager">
      <!-- 搜索栏 -->
      <div class="search-bar mb-4 flex items-center gap-2">
        <AInput.Search
          v-model:value="outputSearchKey"
          placeholder="输入配置名称搜索..."
          enter-button
          class="max-w-[600px] flex-1"
        />
        <AButton
          type="primary"
          @click="showAddForm = true"
          class="min-w-[100px] whitespace-nowrap"
        >
          <PlusOutlined /> 新增配置
        </AButton>
      </div>

      <!-- 新增表单 -->
      <div v-if="showAddForm" class="add-form mb-4 rounded bg-gray-50 p-4">
        <AForm :model="newOutput" layout="vertical">
          <AFormItem label="配置名称" required>
            <AInput v-model:value="newOutput.name" />
          </AFormItem>
          <AFormItem label="配置描述">
            <AInput.TextArea v-model:value="newOutput.description" />
          </AFormItem>
          <div class="flex gap-2">
            <AButton type="primary" @click="handleAddOutput">保存</AButton>
            <AButton @click="showAddForm = false">取消</AButton>
          </div>
        </AForm>
      </div>

      <!-- 配置列表 -->
      <ATable
        :columns="[
          {
            title: '',
            dataIndex: 'selection',
            width: 40,
          },
          { title: '名称', dataIndex: 'name' },
          { title: '描述', dataIndex: 'description' },
        ]"
        :data-source="filteredOutputs"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'selection'">
            <ARadio
              :checked="selectedOutput?.id === record.id"
              @click.stop="handleSelectOutput(record)"
            />
          </template>
          <template v-if="column.dataIndex === 'name'">
            <div class="text-blue-500 hover:underline">{{ record.name }}</div>
          </template>
        </template>
      </ATable>
    </div>

    <!-- 添加底部按钮 -->
    <template #footer>
      <div class="flex justify-end gap-2">
        <AButton @click="showOutputDialog = false">取消</AButton>
        <AButton
          type="primary"
          @click="handleConfirmOutput"
          :disabled="!selectedOutput"
        >
          确定
        </AButton>
      </div>
    </template>
  </Modal>
</template>
<style lang="scss" scoped>
@use '../taskcommon/form-styles.scss' as *;

.notification-trigger-radio {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;

  .notification-radio-item {
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    padding: 12px 16px;
    margin: 0 !important;
    transition: all 0.3s;

    &:hover {
      border-color: #1890ff;
      background-color: #f0f9ff;
    }

    &.ant-radio-wrapper-checked {
      border-color: #1890ff;
      background-color: #e6f7ff;

      .ant-radio-inner {
        border-color: #1890ff;
        background-color: #1890ff;
      }
    }

    .ant-radio {
      top: 2px;
    }

    .ant-radio + span {
      padding: 0 8px;
      flex: 1;
    }
  }
}

.advanced-settings {
  border-top: 1px solid #f0f0f0;
  padding-top: 16px;
}
</style>
