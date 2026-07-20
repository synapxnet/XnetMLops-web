<script lang="ts" setup>
import type { HarborRepository } from '../api/types.ts';

import { computed, h, onMounted, reactive, ref } from 'vue';

import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  SearchOutlined,
  SyncOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Input,
  InputPassword,
  message,
  Modal,
  Popconfirm,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  createHarborRepository,
  deleteHarborRepository,
  getHarborRepositories,
  updateHarborRepository,
} from '../api/harborRepository';

// Harbor仓库列表
const repositories = ref<HarborRepository[]>([]);
const loading = ref(true);
const searchQuery = ref('');

// 当前编辑的仓库
const currentRepo = reactive<HarborRepository>({
  id: 0,
  uid: '',
  name: '',
  url: '',
  username: '',
  password: '',
  created_by: 'admin',
  updated_by: '',
  created_at: '',
  updated_at: '',
});

// 模态框状态
const modalVisible = ref(false);
const isEditing = ref(false);
const showPassword = ref(false);

// 加载数据
const loadData = async () => {
  try {
    loading.value = true;
    const response = await getHarborRepositories();

    if (response === null) {
      message.error(`加载Harbor仓库失败: ${response.message}`);
    } else {
      repositories.value = response || [];
    }
  } catch (error) {
    message.error('数据加载失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
};

// 搜索功能
const filteredRepositories = computed(() => {
  if (!searchQuery.value) return repositories.value;

  const query = searchQuery.value.toLowerCase();
  return repositories.value.filter(
    (repo) =>
      repo.name.toLowerCase().includes(query) ||
      repo.url.toLowerCase().includes(query) ||
      (repo.username && repo.username.toLowerCase().includes(query)),
  );
});

// 创建新仓库
const createNewRepo = () => {
  Object.assign(currentRepo, {
    id: 0,
    uid: '',
    name: '',
    url: '',
    username: '',
    password: '',
    createdBy: 'admin',
    updated_by: '',
    created_at: '',
    updated_at: '',
  });

  isEditing.value = false;
  showPassword.value = true;
  modalVisible.value = true;
};

// 编辑仓库
const editRepo = (repo: HarborRepository) => {
  Object.assign(currentRepo, {
    ...repo,
    password: '', // 编辑时不显示密码，需要用户重新输入
  });

  isEditing.value = true;
  showPassword.value = false;
  modalVisible.value = true;
};

// 保存仓库
const saveRepo = async () => {
  if (!currentRepo.name) {
    message.error('仓库名称不能为空');
    return;
  }

  if (!currentRepo.url) {
    message.error('仓库URL不能为空');
    return;
  }

  if (!currentRepo.username) {
    message.error('用户名不能为空');
    return;
  }

  // 如果是创建或密码有变化
  if ((!isEditing.value || showPassword.value) && !currentRepo.password) {
    message.error('密码不能为空');
    return;
  }

  try {
    const repoData = { ...currentRepo };

    // 如果是编辑且用户没有修改密码，不发送密码字段
    if (isEditing.value && !showPassword.value) {
      delete repoData.password;
    }

    let response;
    response = await (isEditing.value
      ? updateHarborRepository(currentRepo.id, repoData)
      : createHarborRepository(repoData));

    if (response === null) {
      message.error(response.message || '操作失败');
    } else {
      message.success(isEditing.value ? '仓库已更新' : '仓库已创建');
      await loadData();
      modalVisible.value = false;
    }
  } catch (error) {
    message.error('保存失败');
    console.error(error);
  }
};

// 删除仓库
const deleteRepo = async (id: number) => {
  try {
    const response = await deleteHarborRepository(id);

    if (response === null) {
      message.error(response.message || '删除失败');
    } else {
      message.success('仓库已删除');
      await loadData();
    }
  } catch (error) {
    message.error('删除失败');
    console.error(error);
  }
};

// 状态标签渲染
const renderStatusTag = (repo: HarborRepository) => {
  // 简单验证URL格式
  const isValidUrl =
    repo.url.startsWith('http://') || repo.url.startsWith('https://');

  return h(
    Tag,
    {
      color: isValidUrl ? 'green' : 'red',
    },
    // 使用函数形式的 slot
    () => h('span', { class: 'flex items-center gap-1' }, [
      isValidUrl ? h(CheckCircleOutlined) : h(ExclamationCircleOutlined),
      h('span', isValidUrl ? '有效' : '无效'),
    ]),
  );
};

// 表格列配置
const columns = [
  {
    title: '仓库名称',
    dataIndex: 'name',
    key: 'name',
    width: '20%',
  },
  {
    title: 'URL',
    key: 'url',
    customRender: ({ record }: { record: HarborRepository }) => {
      return h(
        'a',
        {
          href: record.url,
          target: '_blank',
          class: 'text-blue-500 hover:underline',
        },
        record.url,
      );
    },
  },
  {
    title: '用户名',
    dataIndex: 'username',
    key: 'username',
    width: '15%',
  },
  {
    title: '状态',
    key: 'status',
    width: '15%',
    customRender: ({ record }: { record: HarborRepository }) => {
      return renderStatusTag(record);
    },
  },
  {
    title: '创建时间',
    key: 'createdAt',
    width: '15%',
    customRender: ({ record }: { record: HarborRepository }) => {
      return new Date(record.createdAt).toLocaleDateString();
    },
  },
  {
    title: '操作',
    key: 'action',
    width: '20%',
    customRender: ({ record }: { record: HarborRepository }) => {
      return h('div', { class: 'flex gap-2' }, [
        h(
          Button,
          {
            type: 'primary',
            onClick: () => editRepo(record),
          },
          () => [h(EditOutlined), ' 编辑'],
        ),
        h(
          Popconfirm,
          {
            title: '确定要删除这个仓库吗？',
            onConfirm: () => deleteRepo(record.id),
          },
          () =>
            h(
              Button,
              {
                type: 'primary',
                danger: true,
              },
              () => [h(DeleteOutlined), ' 删除'],
            ),
        ),
      ]);
    },
  },
];

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="image-manage-wrapper">
  <div class="container mx-auto px-4 py-6">
    <!-- 标题和操作区 -->
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-800">Harbor仓库管理</h1>
      <div class="flex gap-3">
        <Button type="primary" @click="createNewRepo" class="flex items-center">
          <PlusOutlined />
          添加仓库
        </Button>
      </div>
    </div>

    <!-- 仓库列表 -->
    <Card class="rounded-lg shadow">
      <template #title>
        <div
          class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center"
        >
          <h2 class="text-lg font-semibold">仓库列表</h2>
          <Input
            v-model:value="searchQuery"
            placeholder="搜索仓库名称或URL..."
            class="w-full md:w-80"
            allow-clear
          >
            <template #prefix>
              <SearchOutlined class="text-gray-400" />
            </template>
          </Input>
        </div>
      </template>

      <Table
        :data-source="filteredRepositories"
        :columns="columns"
        :pagination="{ pageSize: 8 }"
        row-key="id"
        :loading="loading"
      >
        <template #emptyText>
          <div v-if="loading" class="py-12 text-center">
            <SyncOutlined spin class="mb-3 text-2xl text-blue-500" />
            <p class="text-gray-600">正在加载仓库数据...</p>
          </div>
          <div v-else class="py-12 text-center">
            <div v-if="searchQuery" class="text-gray-500">
              没有找到匹配 "{{ searchQuery }}" 的仓库
            </div>
            <div v-else>
              <p class="mb-4 text-gray-500">暂无仓库配置</p>
              <Button type="primary" @click="createNewRepo">
                添加第一个仓库
              </Button>
            </div>
          </div>
        </template>
      </Table>
    </Card>
  </div>

  <!-- 添加/编辑仓库模态框 -->
  <Modal
    :title="isEditing ? '编辑仓库' : '添加仓库'"
    v-model:open="modalVisible"
    width="600px"
    :ok-text="isEditing ? '更新' : '创建'"
    cancel-text="取消"
    @ok="saveRepo"
  >
    <div class="p-4">
      <div class="form-item mb-5">
        <label class="mb-2 block font-medium text-gray-700">
          仓库名称 <span class="text-red-500">*</span>
        </label>
        <Input
          v-model:value="currentRepo.name"
          placeholder="输入仓库名称"
          class="w-full"
        />
      </div>

      <div class="form-item mb-5">
        <label class="mb-2 block font-medium text-gray-700">
          URL <span class="text-red-500">*</span>
        </label>
        <Input
          v-model:value="currentRepo.url"
          placeholder="https://harbor.example.com"
          class="w-full"
        />
        <p class="mt-1 text-xs text-gray-500">请输入完整的Harbor仓库URL</p>
      </div>

      <div class="form-item mb-5">
        <label class="mb-2 block font-medium text-gray-700">
          用户名 <span class="text-red-500">*</span>
        </label>
        <Input
          v-model:value="currentRepo.username"
          placeholder="输入用户名"
          class="w-full"
        />
      </div>

      <div class="form-item">
        <label class="mb-2 block font-medium text-gray-700">
          密码
          <span class="text-red-500" v-if="!isEditing || showPassword">*</span>
          <span
            class="ml-1 text-xs text-gray-500"
            v-if="isEditing && !showPassword"
          >
            (留空表示不修改)
          </span>
        </label>

        <template v-if="isEditing">
          <div class="mb-2 flex items-center">
            <Button
              v-if="!showPassword"
              type="link"
              size="small"
              @click="showPassword = true"
            >
              修改密码
            </Button>
            <Button
              v-if="showPassword"
              type="link"
              size="small"
              @click="showPassword = false"
            >
              取消修改
            </Button>
          </div>
        </template>

        <InputPassword
          v-if="!isEditing || showPassword"
          v-model:value="currentRepo.password"
          placeholder="输入密码"
          class="w-full"
        />
        <Input v-else value="********" disabled class="w-full" />
      </div>
    </div>
  </Modal>
  </div>
</template>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
}

.form-item {
  margin-bottom: 20px;
}

:deep(.ant-card) {
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

:deep(.ant-table-thead > tr > th) {
  font-weight: 600;
}

:deep(.ant-table) {
  border-radius: 6px;
  overflow: hidden;
}
</style>
