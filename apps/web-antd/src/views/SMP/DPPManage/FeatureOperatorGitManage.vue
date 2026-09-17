<script lang="ts" setup>
import BusinessPage from '#/components/workspace/BusinessPage.vue';
import type { FeatureOperator } from '../api/featureOperatorConfig';

import { computed, h, onMounted, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import {
  BranchesOutlined,
  CodeOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  TeamOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Input,
  message,
  Modal,
  Select,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import {
  createFeatureOperatorConfig,
  deleteFeatureOperatorConfig,
  getFeatureOperatorConfig,
  getSingleFeatureOperatorConfig,
  updateFeatureOperatorConfig,
} from '../api/featureOperatorConfig';
import { getOrganizationTree } from '../api/deptTreeData';

// 组织树数据结构
interface DeptTreeDataItem {
  label: string;
  value: string;
  children?: DeptTreeDataItem[];
}

// 组织树数据
const organizationTree = ref<DeptTreeDataItem[]>([]);

// 获取所有叶子节点（团队）
const allLeafTeams = computed(() => {
  const teams: { label: string; value: string }[] = [];

  function traverse(nodes: DeptTreeDataItem[]) {
    nodes.forEach((node) => {
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      } else {
        teams.push({
          label: node.label,
          value: node.value,
        });
      }
    });
  }

  traverse(organizationTree.value);
  return teams;
});

// 查找节点路径
const findNodePath = (
  tree: DeptTreeDataItem[],
  value: string,
  path: string[] = [],
): null | string[] => {
  for (const node of tree) {
    const currentPath = [...path, node.label];

    if (node.value === value) {
      return currentPath;
    }

    if (node.children) {
      const found = findNodePath(node.children, value, currentPath);
      if (found) return found;
    }
  }
  return null;
};

// 获取组织树数据
const fetchOrganizationTree = async () => {
  try {
    const treeData = await getOrganizationTree();
    organizationTree.value = treeData;
  } catch (error) {
    console.error('获取组织树失败:', error);
    message.error('获取团队结构失败');
    organizationTree.value = [];
  }
};

// 当前用户团队
const currentUserTeam = ref('');

// 组件状态
const allOperators = ref<FeatureOperator[]>([]);
const displayOperators = ref<FeatureOperator[]>([]);
const loading = ref(false);
const searchKey = ref('');
const modalVisible = ref(false);
const editMode = ref(false);
const currentOperator = ref<FeatureOperator>({
  id: undefined,
  uid: '',
  url: '',
  encrypted_token: '',
  operator_name: '',
  operator_code: '',
  operator_version: '',
  description: '',
  tenant_uid: '',
  dept_uid: '',
  team_uid: '',
  authorized_tenants: '',
  created_by: '',
  updated_by: '',
  created_at: '',
  updated_at: '',
});
const formErrors = ref({
  url: '',
  token: '',
  operator_name: '',
  operator_code: '',
  operator_version: '',
  team_uid: '',
});

// 获取团队完整路径
const getTeamPath = (teamUid: string): null | string => {
  const path = findNodePath(organizationTree.value, teamUid);
  return path ? path.join(' / ') : null;
};

// 表格列配置
const columns = [
  {
    title: '算子名称',
    dataIndex: 'operator_name',
    key: 'operator_name',
    width: '12%',
  },
  {
    title: '算子代码',
    dataIndex: 'operator_code',
    key: 'operator_code',
    width: '10%',
    customRender: ({ text }: { text: string }) => {
      return h('div', { class: 'flex items-center' }, [
        h(CodeOutlined, { class: 'mr-1 text-blue-500' }),
        h('span', { class: 'font-mono' }, text),
      ]);
    },
  },
  {
    title: '版本',
    dataIndex: 'operator_version',
    key: 'operator_version',
    width: '8%',
    customRender: ({ text }: { text: string }) => {
      return h('div', { class: 'flex items-center' }, [
        h(BranchesOutlined, { class: 'mr-1 text-purple-500' }),
        h('span', { class: 'font-mono' }, text),
      ]);
    },
  },
  {
    title: 'Git仓库URL',
    dataIndex: 'url',
    key: 'url',
    ellipsis: true,
    width: '20%',
  },
  {
    title: '凭证Token',
    dataIndex: 'encrypted_token',
    key: 'encrypted_token',
    ellipsis: true,
    width: '15%',
    customRender: ({ text }: { text: string }) => {
      if (!text) return '';
      const masked = `${text.slice(0, 4)}****${text.slice(Math.max(0, text.length - 4))}`;
      return h(
        Tooltip,
        { title: '点击查看完整Token', placement: 'top' },
        {
          default: () =>
            h(
              Tag,
              {
                color: 'blue',
                style: { cursor: 'pointer' },
                onClick: () => showToken(text),
              },
              masked,
            ),
        },
      );
    },
  },
  {
    title: '所属团队',
    dataIndex: 'team_uid',
    key: 'team_uid',
    width: '12%',
    customRender: ({ text }: { text: string }) => {
      const path = getTeamPath(text);
      return h('div', { class: 'flex items-center' }, [
        h(TeamOutlined, { class: 'mr-1 text-blue-500' }),
        h('span', { class: 'truncate' }, path || text),
      ]);
    },
  },
  {
    title: '可访问团队',
    dataIndex: 'authorized_tenants',
    key: 'authorized_tenants',
    width: '15%',
    customRender: ({ text }: { text: string }) => {
      if (!text) return '';
      const teams = text.split(',');
      const visibleTeams = teams.slice(0, 2);
      const hiddenCount = teams.length - visibleTeams.length;

      return h('div', { class: 'flex flex-wrap gap-1' }, [
        ...visibleTeams.map((team) => {
          const path = getTeamPath(team) || team;
          return h(Tooltip, { title: path }, () =>
            h(Tag, { color: 'green' }, path.split('/').pop() || path),
          );
        }),
        ...(hiddenCount > 0
          ? [h(Tag, { color: 'orange' }, `+${hiddenCount}`)]
          : []),
      ]);
    },
  },
  {
    title: '操作',
    key: 'action',
    width: '120px',
    customRender: ({ record }: { record: FeatureOperator }) => {
      const canEdit = record.team_uid === currentUserTeam.value;

      return h('div', { class: 'flex gap-2' }, [
        h(
          Button,
          {
            type: 'link',
            onClick: () => editItem(record),
            style: { color: canEdit ? '#1890ff' : 'hsl(var(--muted-foreground))' },
            disabled: !canEdit,
          },
          [h(EditOutlined), ' 编辑'],
        ),
        h(
          Button,
          {
            type: 'link',
            danger: true,
            onClick: () => confirmDelete(record),
            style: { color: canEdit ? '#ff4d4f' : 'hsl(var(--muted-foreground))' },
            disabled: !canEdit,
          },
          [h(DeleteOutlined), ' 删除'],
        ),
      ]);
    },
  },
];

// 加载特征算子数据
const loadOperators = async () => {
  try {
    loading.value = true;
    const response = await getFeatureOperatorConfig();
    if (response) {
      allOperators.value = response;
      applySearchFilter();
    }
  } catch (error) {
    console.error('加载特征算子失败:', error);
    message.error('加载特征算子失败');
  } finally {
    loading.value = false;
  }
};

// 应用搜索过滤
const applySearchFilter = () => {
  if (!searchKey.value) {
    displayOperators.value = [...allOperators.value];
    return;
  }

  const key = searchKey.value.toLowerCase();
  displayOperators.value = allOperators.value.filter(
    (a) =>
      a.url?.toLowerCase().includes(key) ||
      a.operator_name?.toLowerCase().includes(key) ||
      a.operator_code?.toLowerCase().includes(key) ||
      a.operator_version?.toLowerCase().includes(key) ||
      (a.description && a.description.toLowerCase().includes(key)) ||
      getTeamPath(a.team_uid)?.toLowerCase().includes(key),
  );
};

// 显示添加模态框
const showAddModal = () => {
  currentOperator.value = {
    id: undefined,
    uid: '',
    url: '',
    encrypted_token: '',
    operator_name: '',
    operator_code: '',
    operator_version: '',
    description: '',
    tenant_uid: '',
    dept_uid: '',
    team_uid: currentUserTeam.value,
    authorized_tenants: currentUserTeam.value,
    created_by: '',
    updated_by: '',
    created_at: '',
    updated_at: '',
  };
  editMode.value = false;
  modalVisible.value = true;
  formErrors.value = {
    url: '',
    token: '',
    operator_name: '',
    operator_code: '',
    operator_version: '',
    team_uid: '',
  };
};

// 编辑特征算子
const editItem = async (operator: FeatureOperator) => {
  try {
    if (operator.id) {
      const response = await getSingleFeatureOperatorConfig(operator.id);
      if (response.data) {
        currentOperator.value = { ...response.data };
      }
    }

    editMode.value = true;
    modalVisible.value = true;
    formErrors.value = {
      url: '',
      token: '',
      operator_name: '',
      operator_code: '',
      operator_version: '',
      team_uid: '',
    };
  } catch (error) {
    console.error('获取特征算子详情失败:', error);
    message.error('获取特征算子详情失败');
  }
};

// 验证表单
const validateForm = () => {
  let valid = true;
  formErrors.value = {
    url: '',
    token: '',
    operator_name: '',
    operator_code: '',
    operator_version: '',
    team_uid: '',
  };

  if (!currentOperator.value.url) {
    formErrors.value.url = '请输入仓库URL';
    valid = false;
  } else if (
    !/^(http|https|git):\/\/.[^\n\r.\u2028\u2029]*\..+$/.test(
      currentOperator.value.url,
    )
  ) {
    formErrors.value.url = '请输入有效的仓库URL';
    valid = false;
  }

  if (!currentOperator.value.encrypted_token) {
    formErrors.value.token = '请输入访问凭证';
    valid = false;
  }

  if (!currentOperator.value.operator_name) {
    formErrors.value.operator_name = '请输入算子名称';
    valid = false;
  }

  if (!currentOperator.value.operator_code) {
    formErrors.value.operator_code = '请输入算子代码';
    valid = false;
  } else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(currentOperator.value.operator_code)) {
    formErrors.value.operator_code = '算子代码必须以字母开头，只能包含字母、数字和下划线';
    valid = false;
  }

  if (!currentOperator.value.team_uid) {
    formErrors.value.team_uid = '请选择所属团队';
    valid = false;
  }

  if (!currentOperator.value.operator_version) {
    formErrors.value.operator_version = '请输入算子版本';
    valid = false;
  }

  return valid;
};

// 保存特征算子
const saveOperator = async () => {
  if (!validateForm()) return;

  try {
    if (editMode.value && currentOperator.value.id) {
      await updateFeatureOperatorConfig(
        currentOperator.value.id,
        currentOperator.value,
      );
      message.success('特征算子更新成功');
    } else {
      await createFeatureOperatorConfig(currentOperator.value);
      message.success('特征算子添加成功');
    }

    modalVisible.value = false;
    await loadOperators();
  } catch (error) {
    console.error('保存失败:', error);
    message.error(editMode.value ? '更新特征算子失败' : '添加特征算子失败');
  }
};

// 删除确认
const confirmDelete = (operator: FeatureOperator) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除特征算子 "${operator.operator_name}" 吗？此操作不可恢复。`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try {
        if (operator.team_uid !== currentUserTeam.value) {
          message.error('您没有权限删除此特征算子');
          return;
        }

        if (operator.id) {
          await deleteFeatureOperatorConfig(operator.id);
          message.success('特征算子已删除');
          await loadOperators();
        }
      } catch (error) {
        console.error('删除失败:', error);
        message.error('删除特征算子失败');
      }
    },
  });
};

// 显示完整Token
const showToken = (token: string) => {
  Modal.info({
    title: '完整访问凭证',
    content: h('div', [
      h('p', { class: 'mb-2' }, '请妥善保管您的访问凭证：'),
      h(
        'div',
        { class: 'bg-gray-100 dark:bg-gray-800 p-3 rounded-md break-all font-mono' },
        token,
      ),
      h(
        'p',
        { class: 'mt-3 text-red-500' },
        '警告：此凭证具有访问权限，请勿泄露给他人！',
      ),
    ]),
    okText: '我已记录',
    width: 600,
  });
};

// 清除搜索
const clearSearch = () => {
  searchKey.value = '';
  applySearchFilter();
};

onMounted(async () => {
  await fetchOrganizationTree();

  if (allLeafTeams.value.length > 0) {
    currentUserTeam.value = allLeafTeams.value[0].value;
  }

  await loadOperators();
});

watch(searchKey, () => {
  applySearchFilter();
});
</script>

<template>
  <BusinessPage domain="资源配置" description="管理组织内的数据连接、仓库、工作站与计算资源。" existing-title>
  <Page title="特征算子Git仓库管理" />

  <div class="mt-6 rounded-lg bg-white p-4 shadow">
    <Card>
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <Input
            v-model:value="searchKey"
            placeholder="搜索算子名称、代码、URL..."
            allow-clear
            class="w-72"
            @click:clear="clearSearch"
          >
            <template #prefix>
              <SearchOutlined class="text-gray-400" />
            </template>
          </Input>
        </div>

        <Button type="primary" @click="showAddModal">
          <PlusOutlined />
          添加特征算子
        </Button>
      </div>

      <div class="mb-4 flex items-center text-sm text-blue-600">
        <UserSwitchOutlined class="mr-1" />
        当前操作团队:
        <span class="ml-1 font-medium">
          {{ getTeamPath(currentUserTeam) || currentUserTeam }}
        </span>
      </div>

      <Table
        :data-source="displayOperators"
        :columns="columns"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 10 }"
      >
        <template #emptyText>
          <div class="py-8 text-center text-gray-500">
            <div v-if="searchKey" class="mb-2">
              未找到匹配 "{{ searchKey }}" 的特征算子
            </div>
            <div v-else>
              <p class="mb-2">暂无特征算子记录</p>
              <Button type="primary" @click="showAddModal">
                添加第一个特征算子
              </Button>
            </div>
          </div>
        </template>
      </Table>
    </Card>
  </div>

  <!-- 添加/编辑特征算子模态框 -->
  <Modal
    :title="editMode ? '编辑特征算子' : '添加特征算子'"
    v-model:visible="modalVisible"
    :width="700"
    :ok-text="editMode ? '更新' : '添加'"
    cancel-text="取消"
    @ok="saveOperator"
  >
    <div class="p-4">
      <!-- 团队选择 -->
      <div class="mb-4 grid grid-cols-2 gap-4">
        <div>
          <label class="mb-1 block font-medium text-gray-700">
            所属团队 <span class="text-red-500">*</span>
          </label>
          <Select
            v-model:value="currentOperator.team_uid"
            class="w-full"
            :options="allLeafTeams"
            :disabled="editMode"
            placeholder="选择算子所属团队"
            :class="{ 'border-red-500': formErrors.team_uid }"
          />
          <p v-if="formErrors.team_uid" class="mt-1 text-sm text-red-500">
            {{ formErrors.team_uid }}
          </p>
          <p
            v-if="currentOperator.team_uid"
            class="mt-1 text-xs text-gray-500"
          >
            完整路径: {{ getTeamPath(currentOperator.team_uid) }}
          </p>
        </div>

        <div>
          <label class="mb-1 block font-medium text-gray-700">
            可访问团队
          </label>
          <Select
            v-model:value="currentOperator.authorized_tenants"
            mode="multiple"
            class="w-full"
            :options="allLeafTeams"
            placeholder="选择可访问的团队"
            option-label-prop="label"
          >
            <template #option="{ value, label }">
              <Tooltip :title="getTeamPath(value)">
                <span>{{ label }}</span>
              </Tooltip>
            </template>
          </Select>
          <p class="mt-1 text-xs text-gray-500">
            选择可以使用此特征算子的团队（支持多选）
          </p>
        </div>
      </div>

      <div class="mb-4">
        <label class="mb-1 block font-medium text-gray-700">Git仓库URL <span class="text-red-500">*</span></label>
        <Input
          v-model:value="currentOperator.url"
          placeholder="https://github.com/username/feature-operators.git"
          class="w-full"
          :class="{ 'border-red-500': formErrors.url }"
        />
        <p v-if="formErrors.url" class="mt-1 text-sm text-red-500">
          {{ formErrors.url }}
        </p>
      </div>

      <div class="mb-4">
        <label class="mb-1 block font-medium text-gray-700">访问凭证 <span class="text-red-500">*</span></label>
        <Input.Password
          v-model:value="currentOperator.encrypted_token"
          placeholder="输入访问token或密钥"
          class="w-full"
          :class="{ 'border-red-500': formErrors.token }"
        />
        <p v-if="formErrors.token" class="mt-1 text-sm text-red-500">
          {{ formErrors.token }}
        </p>
        <p class="mt-1 text-xs text-gray-500">
          示例: &lt;github-personal-access-token&gt;
        </p>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <div class="mb-4">
          <label class="mb-1 block font-medium text-gray-700">
            算子名称 <span class="text-red-500">*</span>
          </label>
          <Input
            v-model:value="currentOperator.operator_name"
            placeholder="如：数据标准化"
            class="w-full"
            :class="{ 'border-red-500': formErrors.operator_name }"
          />
          <p v-if="formErrors.operator_name" class="mt-1 text-sm text-red-500">
            {{ formErrors.operator_name }}
          </p>
        </div>

        <div class="mb-4">
          <label class="mb-1 block font-medium text-gray-700">
            算子代码 <span class="text-red-500">*</span>
          </label>
          <Input
            v-model:value="currentOperator.operator_code"
            placeholder="如：standardization"
            class="w-full"
            :class="{ 'border-red-500': formErrors.operator_code }"
          />
          <p v-if="formErrors.operator_code" class="mt-1 text-sm text-red-500">
            {{ formErrors.operator_code }}
          </p>
          <p class="mt-1 text-xs text-gray-500">唯一标识符，用于调用</p>
        </div>

        <div class="mb-4">
          <label class="mb-1 block font-medium text-gray-700">
            算子版本 <span class="text-red-500">*</span>
          </label>
          <Input
            v-model:value="currentOperator.operator_version"
            placeholder="如：v1.0.0"
            class="w-full"
            :class="{ 'border-red-500': formErrors.operator_version }"
          />
          <p
            v-if="formErrors.operator_version"
            class="mt-1 text-sm text-red-500"
          >
            {{ formErrors.operator_version }}
          </p>
        </div>
      </div>

      <div class="mb-2">
        <label class="mb-1 block font-medium text-gray-700">描述信息</label>
        <Input.TextArea
          v-model:value="currentOperator.description"
          placeholder="描述此特征算子的功能和用途..."
          :auto-size="{ minRows: 2, maxRows: 4 }"
          class="w-full"
        />
      </div>
    </div>
  </Modal>

  </BusinessPage>
</template>

<style scoped>
.ant-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.09);
}

:deep(.ant-table-thead > tr > th) {
  font-weight: 600;
}

:deep(.ant-table) {
  border-radius: 6px;
  overflow: hidden;
}

:deep(.ant-btn-link) {
  padding: 0 4px;
}

:deep(.ant-input-affix-wrapper) {
  border-radius: 6px;
}

:deep(.ant-select-selector) {
  border-radius: 6px !important;
}
</style>
