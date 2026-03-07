<script lang="ts" setup>
import type { Algorithm } from '../api/algorithmConfig';

import { computed, h, onMounted, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import {
  BranchesOutlined,
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
  createAlgorithmConfig,
  deleteAlgorithmConfig,
  getAlgorithmConfig,
  getSingleAlgorithmConfig,
  updateAlgorithmConfig,
} from '../api/algorithmConfig';
import { getOrganizationTree } from '../api/deptTreeData';

// 组织树数据结构
interface DeptTreeDataItem {
  label: string;
  value: string; // UID
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
    console.log('组织树数据加载成功', treeData);
  } catch (error) {
    console.error('获取组织树失败:', error);
    message.error('获取团队结构失败');
    organizationTree.value = [];
  }
};

// 当前用户真实团队信息
const currentUserTeam = ref('');

// 组件状态
const allAlgorithms = ref<Algorithm[]>([]); // 所有算法数据
const displayAlgorithms = ref<Algorithm[]>([]); // 显示在表格中的数据
const loading = ref(false);
const searchKey = ref('');
const modalVisible = ref(false);
const editMode = ref(false);
const currentAlgorithm = ref<Algorithm>({
  id: undefined,
  uid: '',
  url: '',
  encrypted_token: '',
  algorithm: '',
  algorithm_version: '',
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
  algorithm: '',
  algorithm_version: '',
  team_uid: '',
});

// 获取团队完整路径
const getTeamPath = (teamUid: string): null | string => {
  const path = findNodePath(organizationTree.value, teamUid);
  return path ? path.join(' / ') : null;
};

// 表格列配置
const columns = [
  // 算法名称列
  {
    title: '算法名称',
    dataIndex: 'algorithm',
    key: 'algorithm',
    width: '10%',
  },
  // 算法版本列
  {
    title: '算法版本',
    dataIndex: 'algorithm_version',
    key: 'algorithm_version',
    width: '10%',
    customRender: ({ text }: { text: string }) => {
      return h('div', { class: 'flex items-center' }, [
        h(BranchesOutlined, { class: 'mr-1 text-purple-500' }),
        h('span', { class: 'font-mono' }, text),
      ]);
    },
  },
  // URL列
  {
    title: 'URL',
    dataIndex: 'url',
    key: 'url',
    ellipsis: true,
    width: '20%',
  },
  // 凭证Token列
  {
    title: '凭证Token',
    dataIndex: 'encrypted_token',
    key: 'encrypted_token',
    ellipsis: true,
    width: '18%',
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
  // 所属团队列
  {
    title: '所属团队',
    dataIndex: 'team_uid',
    key: 'team_uid',
    width: '15%',
    customRender: ({ text }: { text: string }) => {
      const path = getTeamPath(text);
      return h('div', { class: 'flex items-center' }, [
        h(TeamOutlined, { class: 'mr-1 text-blue-500' }),
        h('span', { class: 'truncate' }, path || text),
      ]);
    },
  },
  // 可访问团队列
  {
    title: '可访问团队',
    dataIndex: 'authorized_tenants',
    key: 'authorized_tenants',
    width: '20%',
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
  // 操作列
  {
    title: '操作',
    key: 'action',
    width: '150px',
    customRender: ({ record }: { record: Algorithm }) => {
      // 仅允许所属团队的用户编辑/删除
      const canEdit = record.team_uid === currentUserTeam.value;

      return h('div', { class: 'flex gap-2' }, [
        h(
          Button,
          {
            type: 'link',
            onClick: () => editItem(record),
            style: { color: canEdit ? '#1890ff' : '#bfbfbf' },
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
            style: { color: canEdit ? '#ff4d4f' : '#bfbfbf' },
            disabled: !canEdit,
          },
          [h(DeleteOutlined), ' 删除'],
        ),
      ]);
    },
  },
];

// 加载算法数据
const loadAlgorithms = async () => {
  try {
    loading.value = true;
    const response = await getAlgorithmConfig();
    if (response) {
      allAlgorithms.value = response;
      applySearchFilter();
    }
  } catch (error) {
    console.error('加载算法失败:', error);
    message.error('加载算法失败');
  } finally {
    loading.value = false;
  }
};

// 应用搜索过滤
const applySearchFilter = () => {
  if (!searchKey.value) {
    displayAlgorithms.value = [...allAlgorithms.value];
    return;
  }

  const key = searchKey.value.toLowerCase();
  displayAlgorithms.value = allAlgorithms.value.filter(
    (a) =>
      a.url?.toLowerCase().includes(key) ||
      a.algorithm?.toLowerCase().includes(key) ||
      a.algorithm_version?.toLowerCase().includes(key) ||
      (a.description && a.description.toLowerCase().includes(key)) ||
      getTeamPath(a.team_uid)?.toLowerCase().includes(key) ||
      (a.authorized_tenants &&
        a.authorized_tenants
          .split(',')
          .some((team) => getTeamPath(team)?.toLowerCase().includes(key))),
  );
};

// 显示添加模态框
const showAddModal = () => {
  currentAlgorithm.value = {
    id: undefined,
    uid: '',
    url: '',
    encrypted_token: '',
    algorithm: '',
    algorithm_version: '',
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
    algorithm: '',
    algorithm_version: '',
    team_uid: '',
  };
};

// 编辑算法
const editItem = async (algorithm: Algorithm) => {
  try {
    // 根据ID获取完整算法详情
    if (algorithm.id) {
      const response = await getSingleAlgorithmConfig(algorithm.id);
      if (response.data) {
        currentAlgorithm.value = { ...response.data };
      }
    }

    editMode.value = true;
    modalVisible.value = true;
    formErrors.value = {
      url: '',
      token: '',
      algorithm: '',
      algorithm_version: '',
      team_uid: '',
    };
  } catch (error) {
    console.error('获取算法详情失败:', error);
    message.error('获取算法详情失败');
  }
};

// 验证表单
const validateForm = () => {
  let valid = true;
  formErrors.value = {
    url: '',
    token: '',
    algorithm: '',
    algorithm_version: '',
    team_uid: '',
  };

  if (!currentAlgorithm.value.url) {
    formErrors.value.url = '请输入仓库URL';
    valid = false;
  } else if (
    !/^(http|https|git):\/\/.[^\n\r.\u2028\u2029]*\..+$/.test(
      currentAlgorithm.value.url,
    )
  ) {
    formErrors.value.url = '请输入有效的仓库URL';
    valid = false;
  }

  if (!currentAlgorithm.value.encrypted_token) {
    formErrors.value.token = '请输入访问凭证';
    valid = false;
  }

  if (!currentAlgorithm.value.algorithm) {
    formErrors.value.algorithm = '请选择算法类型';
    valid = false;
  }

  if (!currentAlgorithm.value.team_uid) {
    formErrors.value.team_uid = '请选择所属团队';
    valid = false;
  }

  if (!currentAlgorithm.value.algorithm_version) {
    formErrors.value.algorithm_version = '请输入算法版本';
    valid = false;
  }

  return valid;
};

// 保存算法
const saveAlgorithm = async () => {
  if (!validateForm()) return;

  try {
    if (editMode.value && currentAlgorithm.value.id) {
      await updateAlgorithmConfig(
        currentAlgorithm.value.id,
        currentAlgorithm.value,
      );
      message.success('算法更新成功');
    } else {
      await createAlgorithmConfig(currentAlgorithm.value);
      message.success('算法添加成功');
    }

    modalVisible.value = false;
    await loadAlgorithms();
  } catch (error) {
    console.error('保存失败:', error);
    message.error(editMode.value ? '更新算法失败' : '添加算法失败');
  }
};

// 删除确认
const confirmDelete = (algorithm: Algorithm) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除 ${algorithm.url} 的算法吗？此操作不可恢复。`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try {
        // 权限检查：只有所属团队可以删除
        if (algorithm.team_uid !== currentUserTeam.value) {
          message.error('您没有权限删除此算法');
          return;
        }

        if (algorithm.id) {
          await deleteAlgorithmConfig(algorithm.id);
          message.success('算法已删除');
          await loadAlgorithms();
        }
      } catch (error) {
        console.error('删除失败:', error);
        message.error('删除算法失败');
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

  // 获取当前用户真实团队
  if (allLeafTeams.value.length > 0) {
    currentUserTeam.value = allLeafTeams.value[0].value;
  }

  await loadAlgorithms();
});

// 监听搜索关键词变化
watch(searchKey, () => {
  applySearchFilter();
});
</script>

<template>
  <Page title="算法管理" />

  <!-- 主内容区域 -->
  <div class="mt-6 rounded-lg bg-white p-4 shadow">
    <Card>
      <!-- 操作区域 -->
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <Input
            v-model:value="searchKey"
            placeholder="搜索URL、团队、算法或版本..."
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
          添加算法
        </Button>
      </div>

      <!-- 团队选择提示 -->
      <div class="mb-4 flex items-center text-sm text-blue-600">
        <UserSwitchOutlined class="mr-1" />
        当前操作团队:
        <span class="ml-1 font-medium">
          {{ getTeamPath(currentUserTeam) || currentUserTeam }}
        </span>
      </div>

      <!-- 算法表格 -->
      <Table
        :data-source="displayAlgorithms"
        :columns="columns"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 8 }"
      >
        <template #emptyText>
          <div class="py-8 text-center text-gray-500">
            <div v-if="searchKey" class="mb-2">
              未找到匹配 "{{ searchKey }}" 的算法
            </div>
            <div v-else>
              <p class="mb-2">暂无算法记录</p>
              <Button type="primary" @click="showAddModal">
                添加第一个算法
              </Button>
            </div>
          </div>
        </template>
      </Table>
    </Card>
  </div>

  <!-- 添加/编辑算法模态框 -->
  <Modal
    :title="editMode ? '编辑算法' : '添加算法'"
    v-model:visible="modalVisible"
    :width="700"
    :ok-text="editMode ? '更新' : '添加'"
    cancel-text="取消"
    @ok="saveAlgorithm"
  >
    <div class="p-4">
      <!-- 团队选择 -->
      <div class="mb-4 grid grid-cols-2 gap-4">
        <div>
          <label class="mb-1 block font-medium text-gray-700">
            所属团队 <span class="text-red-500">*</span>
          </label>
          <Select
            v-model:value="currentAlgorithm.team_uid"
            class="w-full"
            :options="allLeafTeams"
            :disabled="editMode"
            placeholder="选择算法所属团队"
            :class="{ 'border-red-500': formErrors.team_uid }"
          />
          <p v-if="formErrors.team_uid" class="mt-1 text-sm text-red-500">
            {{ formErrors.team_uid }}
          </p>
          <p
            v-if="currentAlgorithm.team_uid"
            class="mt-1 text-xs text-gray-500"
          >
            完整路径: {{ getTeamPath(currentAlgorithm.team_uid) }}
          </p>
        </div>

        <div>
          <label class="mb-1 block font-medium text-gray-700">
            可访问团队
          </label>
          <Select
            v-model:value="currentAlgorithm.authorized_tenants"
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
            选择可以使用此算法的团队（支持多选）
          </p>
        </div>
      </div>

      <div class="mb-4">
        <label class="mb-1 block font-medium text-gray-700">仓库URL <span class="text-red-500">*</span></label>
        <Input
          v-model:value="currentAlgorithm.url"
          placeholder="https://github.com/username/repo.git"
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
          v-model:value="currentAlgorithm.encrypted_token"
          placeholder="输入访问token或密钥"
          class="w-full"
          :class="{ 'border-red-500': formErrors.token }"
        />
        <p v-if="formErrors.token" class="mt-1 text-sm text-red-500">
          {{ formErrors.token }}
        </p>
        <p class="mt-1 text-xs text-gray-500">
          示例: ghp_AbC123DeF456GhI789JkL012MnO345Pqr678
        </p>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="mb-4">
          <label class="mb-1 block font-medium text-gray-700">
            算法名称 <span class="text-red-500">*</span>
          </label>
          <Input
            v-model:value="currentAlgorithm.algorithm"
            placeholder="输入算法名称"
            class="w-full"
            :class="{ 'border-red-500': formErrors.algorithm }"
          />
          <p v-if="formErrors.algorithm" class="mt-1 text-sm text-red-500">
            {{ formErrors.algorithm }}
          </p>
          <p class="mt-1 text-xs text-gray-500">算法标识名称</p>
        </div>

        <div class="mb-4">
          <label class="mb-1 block font-medium text-gray-700">
            算法版本 <span class="text-red-500">*</span>
          </label>
          <Input
            v-model:value="currentAlgorithm.algorithm_version"
            placeholder="输入版本号 (如 v1.0.0)"
            class="w-full"
            :class="{ 'border-red-500': formErrors.algorithm_version }"
          />
          <p
            v-if="formErrors.algorithm_version"
            class="mt-1 text-sm text-red-500"
          >
            {{ formErrors.algorithm_version }}
          </p>
          <p class="mt-1 text-xs text-gray-500">算法版本标识</p>
        </div>
      </div>

      <div class="mb-2">
        <label class="mb-1 block font-medium text-gray-700">描述信息</label>
        <Input.TextArea
          v-model:value="currentAlgorithm.description"
          placeholder="描述此算法的用途或关联项目..."
          :auto-size="{ minRows: 2, maxRows: 4 }"
          class="w-full"
        />
      </div>
    </div>
  </Modal>
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

/* 算法版本图标样式 */
:deep(.anticon-branches) {
  color: #7e22ce;
}
</style>
