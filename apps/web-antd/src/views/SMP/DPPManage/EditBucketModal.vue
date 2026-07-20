<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import {
  Button,
  Form,
  Input,
  message,
  Modal,
  Select,
  Slider,
  Switch,
  Tag,
} from 'ant-design-vue';

import { generateAccessKey } from '../utils/crypto';

const props = defineProps({
  visible: Boolean,
  currentBucket: Object,
  isEditing: Boolean,
  existingIdentifiers: Set,
  tenantOptions: Array, // 完整的组织树数据
});
const emit = defineEmits(['update:visible', 'save']);
const AModal = Modal;
const AForm = Form;
const AFormItem = Form.Item;
const AInput = Input;
const ASelect = Select;
const ASelectOption = Select.Option;
const ASwitch = Switch;
const ASlider = Slider;
const AButton = Button;

const visible = ref(false);
const formRef = ref();
const formState = ref({
  id: '',
  uid: '',
  name: '',
  identifier: '',
  type: 'public',
  tenant_uid: undefined, // 使用后端字段名
  dept_uid: undefined, // 使用后端字段名
  team_uid: undefined, // 使用后端字段名
  current_size: 0,
  max_size: 100,
  status: 'active',
  access_key: '',
  authorized_tenants: [] as string[], // 前端使用数组
});

// 计算部门选项（根据选中的租户）
const departmentOptions = computed(() => {
  if (!formState.value.tenant_uid || !props.tenantOptions) return [];

  // 递归查找租户节点
  const findTenantNode = (nodes: any[]): any | null => {
    for (const node of nodes) {
      if (node.value === formState.value.tenant_uid) {
        return node;
      }
      if (node.children) {
        const found = findTenantNode(node.children);
        if (found) return found;
      }
    }
    return null;
  };

  const tenantNode = findTenantNode(props.tenantOptions);
  return tenantNode?.children || [];
});

// 计算团队选项（根据选中的部门）
const teamOptions = computed(() => {
  if (!formState.value.dept_uid || !departmentOptions.value) return [];

  // 在部门选项中查找当前部门
  const department = departmentOptions.value.find(
    (d: any) => d.value === formState.value.dept_uid,
  );

  return department?.children || [];
});

// 计算模态框标题
const modalTitle = computed(() => {
  if (props.isEditing) {
    return formState.value.type === 'public'
      ? '编辑公共存储桶'
      : '编辑租户存储桶';
  }
  return formState.value.type === 'public'
    ? '新增公共存储桶'
    : '新增租户存储桶';
});

// 监听visible变化
watch(
  () => props.visible,
  (val) => {
    visible.value = val;
    if (val) {
      // 填充表单数据
      if (props.currentBucket) {
        // 安全处理 authorized_tenants
        const safeCurrentSize = props.currentBucket.current_size ?? 0;
        const authorizedTenants =
          props.currentBucket.authorized_tenants &&
          typeof props.currentBucket.authorized_tenants === 'string'
            ? props.currentBucket.authorized_tenants.split(',')
            : [];

        formState.value = {
          ...props.currentBucket,
          authorized_tenants: authorizedTenants,
          current_size: safeCurrentSize,
        };
      } else {
        resetForm();
      }
    }
  },
);

// 监听内部visible变化并同步到父组件
watch(visible, (val) => {
  emit('update:visible', val);
});

// 重置表单
const resetForm = () => {
  formState.value = {
    id: '',
    uid: '',
    name: '',
    identifier: '',
    type: 'public',
    tenant_uid: undefined,
    dept_uid: undefined,
    team_uid: undefined,
    current_size: 0,
    max_size: 100,
    status: 'active',
    access_key: '',
    authorized_tenants: [],
  };
};

// 名称验证器
const validateName = async (_rule: any, value: string) => {
  if (!value) {
    throw '请输入存储桶名称';
  }
  if (value.length < 3) {
    throw '名称长度至少为3个字符';
  }
  if (value.length > 50) {
    throw '名称长度不能超过50个字符';
  }
};

// 标识符验证器
const validateIdentifier = async (_rule: any, value: string) => {
  if (!value) {
    throw '请输入存储桶标识符';
  }

  // 检查标识符格式
  const identifierPattern = /^[a-z0-9-]+$/;
  if (!identifierPattern.test(value)) {
    throw '标识符只能包含小写字母、数字和连字符(-)';
  }

  // 检查是否已存在（编辑模式下排除当前项）
  const isEditing = props.isEditing;
  const isSameAsOriginal =
    isEditing && value === props.currentBucket?.identifier;

  if (!isSameAsOriginal && props.existingIdentifiers.has(value)) {
    throw '该标识符已存在，请使用其他标识符';
  }
};

// 处理存储桶类型变化
const handleTypeChange = (value: string) => {
  formState.value.type = value;
  // 重置关联字段
  formState.value.tenant_uid = undefined;
  formState.value.dept_uid = undefined;
  formState.value.team_uid = undefined;
};

// 处理租户变化
const handleTenantChange = (value: string) => {
  // 重置下级选择
  formState.value.dept_uid = undefined;
  formState.value.team_uid = undefined;
};

// 处理部门变化
const handleDepartmentChange = (value: string) => {
  // 重置下级选择
  formState.value.team_uid = undefined;
};

// 处理确定
const handleOk = async () => {
  try {
    await formRef.value.validateFields();

    // 准备保存的数据
    const payload = {
      ...formState.value,
      // 转换授权租户为逗号分隔字符串
      authorized_tenants: Array.isArray(formState.value.authorized_tenants)
        ? formState.value.authorized_tenants.join(',')
        : '',
    };

    // 公共存储桶处理
    if (payload.type === 'public') {
      // 新增时生成访问密钥
      if (!props.isEditing && !payload.access_key) {
        payload.access_key = generateAccessKey();
        message.success(`访问密钥已生成: ${payload.access_key}，请妥善保存！`);
      }
    } else {
      // 租户存储桶清除相关字段
      payload.access_key = null;
      payload.authorized_tenants = null;
    }

    // 触发保存事件
    emit('save', payload);
    visible.value = false;
  } catch (error) {
    console.log('表单验证失败', error);
    message.error('表单验证失败，请检查输入');
  }
};

// 生成新密钥
const generateNewKey = () => {
  formState.value.access_key = generateAccessKey();
  message.info(`新访问密钥已生成: ${formState.value.access_key}，请妥善保存！`);
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
    width="600px"
    @ok="handleOk"
    @cancel="handleCancel"
    :destroy-on-close="true"
    :mask-closable="false"
  >
    <AForm
      ref="formRef"
      :model="formState"
      layout="vertical"
      class="bucket-form"
    >
      <div class="form-row">
        <AFormItem
          label="存储桶名称"
          name="name"
          :rules="[
            { required: true, message: '请输入存储桶名称' },
            { validator: validateName, trigger: 'blur' },
          ]"
          class="form-item"
        >
          <AInput
            v-model:value="formState.name"
            placeholder="例如：公共图片存储"
            allow-clear
          />
        </AFormItem>

        <AFormItem
          label="存储桶标识符"
          name="identifier"
          :rules="[
            { required: true, message: '请输入唯一标识符' },
            { validator: validateIdentifier, trigger: 'blur' },
          ]"
          class="form-item"
        >
          <AInput
            v-model:value="formState.identifier"
            placeholder="例如：public-images"
            :disabled="isEditing"
            allow-clear
          />
        </AFormItem>
      </div>

      <div class="form-row">
        <AFormItem
          label="存储桶类型"
          name="type"
          class="form-item"
          :rules="[{ required: true, message: '请选择存储桶类型' }]"
        >
          <ASelect
            v-model:value="formState.type"
            @change="handleTypeChange"
            :disabled="isEditing"
          >
            <ASelectOption value="public">
              <div class="flex items-center">
                <Tag color="blue" class="mr-2">公共</Tag>
                <span>公共存储桶（所有用户可访问）</span>
              </div>
            </ASelectOption>
            <ASelectOption value="tenant">
              <div class="flex items-center">
                <Tag color="green" class="mr-2">租户</Tag>
                <span>租户/部门/团队存储桶</span>
              </div>
            </ASelectOption>
          </ASelect>
        </AFormItem>

        <AFormItem label="状态" name="status" class="form-item">
          <ASwitch
            v-model:checked="formState.status"
            checked-value="active"
            un-checked-value="disabled"
            checked-children="启用"
            un-checked-children="禁用"
          />
        </AFormItem>
      </div>
      <!-- 公共存储桶专属字段 -->
      <div v-if="formState.type === 'public'" class="form-section">
        <!-- 访问密钥 -->
        <AFormItem label="访问密钥">
          <div class="flex items-center">
            <AInput
              v-model:value="formState.access_key"
              placeholder="点击生成按钮创建密钥"
              readonly
              class="mr-2 flex-grow"
            />
            <AButton @click="generateNewKey">生成密钥</AButton>
          </div>
          <div class="ant-form-text">拥有此密钥的租户才能访问存储桶</div>
        </AFormItem>

        <!-- 授权租户 -->
        <AFormItem label="授权租户">
          <ASelect
            v-model:value="formState.authorized_tenants"
            mode="multiple"
            placeholder="选择可访问的租户"
          >
            <ASelectOption
              v-for="tenant in tenantOptions"
              :key="tenant.value"
              :value="tenant.value"
            >
              {{ tenant.label }}
            </ASelectOption>
          </ASelect>
          <div class="ant-form-text">被授权的租户可使用此存储桶</div>
        </AFormItem>
      </div>

      <!-- 租户相关字段 -->
      <div v-if="formState.type === 'tenant'" class="form-section">
        <div class="form-row">
          <AFormItem
            label="所属租户"
            name="tenant_uid"
            class="form-item"
            :rules="[{ required: true, message: '请选择租户' }]"
          >
            <ASelect
              v-model:value="formState.tenant_uid"
              placeholder="请选择租户"
              @change="handleTenantChange"
            >
              <ASelectOption
                v-for="tenant in tenantOptions"
                :key="tenant.value"
                :value="tenant.value"
              >
                {{ tenant.label }}
              </ASelectOption>
            </ASelect>
          </AFormItem>

          <AFormItem label="所属部门" name="dept_uid" class="form-item">
            <ASelect
              v-model:value="formState.dept_uid"
              placeholder="请选择部门"
              :disabled="!formState.tenant_uid"
              @change="handleDepartmentChange"
            >
              <ASelectOption
                v-for="dept in departmentOptions"
                :key="dept.value"
                :value="dept.value"
              >
                {{ dept.label }}
              </ASelectOption>
            </ASelect>
          </AFormItem>
        </div>

        <div class="form-row">
          <AFormItem label="所属团队" name="team_uid" class="form-item">
            <ASelect
              v-model:value="formState.team_uid"
              placeholder="请选择团队"
              :disabled="!formState.dept_uid"
            >
              <ASelectOption
                v-for="team in teamOptions"
                :key="team.value"
                :value="team.value"
              >
                {{ team.label }}
              </ASelectOption>
            </ASelect>
          </AFormItem>
        </div>
      </div>

      <div class="form-section">
        <AFormItem
          label="最大容量 (GB)"
          name="max_size"
          :rules="[{ required: true, message: '请设置最大容量' }]"
        >
          <div class="flex items-center">
            <ASlider
              v-model:value="formState.max_size"
              :min="10"
              :max="10000"
              :step="10"
              class="mr-4 flex-grow"
            />
            <AInput
              v-model:value="formState.max_size"
              type="number"
              :min="10"
              :max="10000"
              class="w-24"
            />
          </div>
          <div class="mt-1 text-sm text-gray-500">
            当前设置: {{ formState.max_size }} GB
            <span v-if="props.currentBucket?.current_size" class="ml-4">
              已使用: {{ props.currentBucket?.current_size }} GB
            </span>
          </div>
        </AFormItem>
      </div>
    </AForm>

    <template #footer>
      <div class="flex justify-between">
        <AButton @click="handleCancel">取消</AButton>
        <AButton type="primary" @click="handleOk">保存配置</AButton>
      </div>
    </template>
  </AModal>
</template>

<style scoped>
.bucket-form {
  max-height: 60vh;
  overflow-y: auto;
  padding: 0 10px;
}

.form-section {
  margin-bottom: 20px;
  padding: 15px;
  border-radius: 8px;
}

.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.form-item {
  flex: 1;
}

:deep(.ant-modal-body) {
  padding-bottom: 8px;
}

:deep(.ant-form-item-label) {
  font-weight: 500;
}

:deep(.ant-slider) {
  margin-top: 6px;
}

:deep(.ant-tag) {
  border-radius: 4px;
  font-weight: 500;
}
</style>
