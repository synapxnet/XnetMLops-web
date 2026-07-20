<script lang="ts" setup>
import type {
  DockerFile,
  DockerFilePushStatus,
  HarborRepository, // 新增类型
  PushHistoryItem,
} from '../api/types.ts';

import { computed, h, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  CheckCircleOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  SearchOutlined,
  StopOutlined,
  SyncOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  createDockerFile,
  createPipeline, // 新增API方法
  deleteDockerFile,
  getDockerFiles,
  updateDockerFile,
  updatePushStatus,
} from '../api/dockerFileManager';
import { getHarborRepositories } from '../api/harborRepository';

// 新增：租户ID（实际项目中应从用户信息中获取）
const tenantUid = ref('default-tenant'); // 示例值，实际应从认证信息中获取

// Docker文件列表
const dockerFiles = ref<DockerFile[]>([]);
const harborRepositories = ref<HarborRepository[]>([]);
const loading = ref(true);
const tableKey = ref(0); // 用于强制重新渲染表格

// 当前编辑的Docker文件
const currentFile = reactive({
  id: 0,
  name: '',
  content: '',
  tags: [] as string[],
  push_status: 'PENDING' as DockerFilePushStatus,
  harbor_uid: '',
  created_by: '',
  updated_by: '',
});

// 模态框状态
const modalVisible = ref(false);
const isEditing = ref(false);
const newTag = ref('');
const searchQuery = ref('');

// 加载数据
const loadData = async () => {
  try {
    loading.value = true;
    const [filesRes, harborRes] = await Promise.all([
      getDockerFiles(),
      getHarborRepositories(),
    ]);

    // 确保正确处理 API 返回的 null 值
    dockerFiles.value = Array.isArray(filesRes)
      ? filesRes.map((item) => ({
          ...item,
          push_status: item.pushStatus || 'PENDING', // 处理 null 状态
          harbor_uid: item.harbor_uid || '',
          tags: item.tags || '',
          push_history: item.pushHistory || null,
          created_by: item.created_by || '',
          updated_by: item.updated_by || '',
          created_at: item.created_at || new Date().toISOString(),
          updated_at: item.updated_at || new Date().toISOString(),
        }))
      : [];

    harborRepositories.value = Array.isArray(harborRes)
      ? harborRes.filter((item) => item != null)
      : [];

    tableKey.value++; // 每次加载数据后更新key，强制重新渲染表格
  } catch (error) {
    message.error('数据加载失败');
    console.error('数据加载错误:', error);
  } finally {
    loading.value = false;
  }
};

// 搜索功能
const filteredFiles = computed(() => {
  if (!searchQuery.value) return dockerFiles.value;

  return dockerFiles.value.filter(
    (file) =>
      (file.name || '')
        .toLowerCase()
        .includes(searchQuery.value.toLowerCase()) ||
      (file.content || '')
        .toLowerCase()
        .includes(searchQuery.value.toLowerCase()) ||
      (file.tags &&
        file.tags.toLowerCase().includes(searchQuery.value.toLowerCase())),
  );
});

// 创建新文件
const createNewFile = () => {
  Object.assign(currentFile, {
    id: 0,
    name: '',
    content: '',
    tags: [],
    push_status: 'PENDING',
    harbor_uid: '',
    created_by: 'admin', // 实际应用中应从用户信息获取
    updated_by: '',
  });

  isEditing.value = false;
  modalVisible.value = true;
};

// 编辑文件
const editFile = (file: DockerFile) => {
  Object.assign(currentFile, {
    ...file,
    tags: file.tags ? file.tags.split(',').map((t) => t.trim()) : [],
  });

  isEditing.value = true;
  modalVisible.value = true;
};

// 添加标签
const addTag = () => {
  if (newTag.value.trim() && !currentFile.tags.includes(newTag.value.trim())) {
    currentFile.tags.push(newTag.value.trim());
    newTag.value = '';
  }
};

// 删除标签
const removeTag = (index: number) => {
  currentFile.tags.splice(index, 1);
};

// 保存文件
const saveFile = async () => {
  if (!currentFile.name.trim()) {
    message.error('文件名不能为空');
    return;
  }

  if (!currentFile.content.trim()) {
    message.error('Dockerfile内容不能为空');
    return;
  }

  if (!currentFile.harbor_uid) {
    message.error('请选择关联的Harbor仓库');
    return;
  }

  try {
    const fileData = {
      ...currentFile,
      tags: currentFile.tags.join(','),
    };

    await (isEditing.value
      ? updateDockerFile(currentFile.id, fileData)
      : createDockerFile(fileData));

    modalVisible.value = false;
    await loadData();
  } catch (error) {
    message.error('保存失败');
    console.error('保存错误:', error);
  }
};

// 删除文件
const deleteFile = async (id: number) => {
  try {
    await deleteDockerFile(id);
    message.success('Docker文件已删除');
    await loadData();
  } catch (error) {
    message.error('删除失败');
    console.error('删除错误:', error);
  }
};

// 推送Docker文件 - 修改为调用流水线接口
const pushFile = async (file: DockerFile) => {
  try {
    // 获取当前最新状态的文件
    const currentFile = dockerFiles.value.find((f) => f.id === file.id);
    if (!currentFile) return;

    // 调用创建流水线接口
    const response = await createPipeline(
      currentFile.uid, // Docker文件UID
      tenantUid.value, // 租户ID
    );

    // 处理响应
    if (response) {
      // 添加成功记录
      const successHistory = [
        {
          timestamp: new Date().toISOString(),
          status: 'PUSHED',
          harborName: getHarborName(currentFile.harbor_uid),
          message: `流水线创建成功: ${response.data}`,
        },
      ];

      await updatePushStatus(
        currentFile.uid,
        'PUSHED',
        JSON.stringify(successHistory),
      );

      message.success(`${currentFile.name} 流水线创建成功！`);
    } else {
      // 添加失败记录
      const failHistory = [
        ...newHistory,
        {
          timestamp: new Date().toISOString(),
          status: 'FAILED',
          harborName: getHarborName(currentFile.harbor_uid),
          message: `创建失败: ${response.msg || '未知错误'}`,
        },
      ];

      await updatePushStatus(
        currentFile.uid,
        'FAILED',
        JSON.stringify(failHistory),
      );

      message.error(`${currentFile.name} 流水线创建失败: ${response.msg}`);
    }
  } catch (error) {
    message.error('推送操作失败');
    console.error('推送错误:', error);
  } finally {
    // 刷新数据
    await loadData();
  }
};

// 取消推送
const cancelPush = async (file: DockerFile) => {
  try {
    // 获取当前最新状态的文件
    const currentFile = dockerFiles.value.find((f) => f.id === file.id);
    if (!currentFile) return;

    // 获取当前推送历史
    const history: PushHistoryItem[] = currentFile.push_history
      ? JSON.parse(currentFile.push_history)
      : [];

    // 添加取消记录
    const newHistory = [
      ...history,
      {
        timestamp: new Date().toISOString(),
        status: 'CANCELLED',
        harborName: getHarborName(currentFile.harbor_uid),
        message: '流水线创建已取消',
      },
    ];

    await updatePushStatus(
      currentFile.uid,
      'CANCELLED',
      JSON.stringify(newHistory),
    );

    message.info(`已取消 ${currentFile.name} 的流水线创建`);
    await loadData();
  } catch (error) {
    message.error('取消推送失败');
    console.error('取消推送错误:', error);
  }
};

// 状态标签渲染 - 添加取消状态
const renderStatusTag = (status: DockerFilePushStatus | null) => {
  // 处理 null 状态
  const actualStatus = status || 'PENDING';

  const statusMap = {
    PENDING: { text: '未推送', color: 'orange', icon: h(CloudUploadOutlined) },
    PUSHING: {
      text: '推送中',
      color: 'blue',
      icon: h(SyncOutlined, { spin: true }),
    },
    PUSHED: { text: '已推送', color: 'green', icon: h(CheckCircleOutlined) },
    FAILED: {
      text: '推送失败',
      color: 'red',
      icon: h(ExclamationCircleOutlined),
    },
    CANCELLED: {
      text: '已取消',
      color: 'gray',
      icon: h(ExclamationCircleOutlined),
    },
  };

  const config = statusMap[actualStatus] || {
    text: '未知状态',
    color: 'gray',
    icon: h(ExclamationCircleOutlined),
  };

  return h(Tag, { color: config.color }, [
    h('span', { class: 'flex items-center gap-1' }, [
      config.icon,
      h('span', config.text),
    ]),
  ]);
};

// 获取仓库名称
const getHarborName = (uid: null | string) => {
  if (!uid) return '未选择仓库';

  const harbor = harborRepositories.value.find((h) => h.uid === uid);
  return harbor ? harbor.name : '未知仓库';
};

// 查看推送历史
const viewPushHistory = (file: DockerFile) => {
  if (!file.push_history) {
    message.info('暂无推送历史记录');
    return;
  }

  try {
    const history: PushHistoryItem[] = JSON.parse(file.push_history);
    Modal.info({
      title: `${file.name} - 推送历史`,
      width: 600,
      content: h('div', { class: 'max-h-96 overflow-y-auto' }, [
        h(
          'ul',
          { class: 'space-y-3' },
          history.map((item) =>
            h('li', { class: 'border-b pb-2 last:border-0' }, [
              h('div', { class: 'flex justify-between' }, [
                h(
                  'span',
                  { class: 'font-medium' },
                  item.harborName || '未知仓库',
                ),
                h(
                  'span',
                  { class: 'text-gray-500 text-sm' },
                  item.timestamp
                    ? new Date(item.timestamp).toLocaleString()
                    : '未知时间',
                ),
              ]),
              h('div', { class: 'flex items-center mt-1' }, [
                h(
                  Tag,
                  {
                    color:
                      item.status === 'PUSHED'
                        ? 'green'
                        : item.status === 'FAILED'
                          ? 'red'
                          : item.status === 'PUSHING'
                            ? 'blue'
                            : item.status === 'CANCELLED'
                              ? 'gray'
                              : 'orange',
                  },
                  item.status === 'PUSHED'
                    ? '成功'
                    : item.status === 'FAILED'
                      ? '失败'
                      : item.status === 'PUSHING'
                        ? '推送中'
                        : item.status === 'CANCELLED'
                          ? '已取消'
                          : '未推送',
                ),
                h('span', { class: 'ml-2' }, item.message || '无消息'),
              ]),
            ]),
          ),
        ),
      ]),
    });
  } catch {
    message.error('解析推送历史失败');
  }
};

// 表格列配置 - 添加取消状态处理
const columns = [
  {
    title: '文件名',
    dataIndex: 'name',
    key: 'name',
    width: '20%',
    customRender: ({ text }: { text: string }) => text || '未命名',
  },
  {
    title: '仓库',
    key: 'harbor_uid',
    width: '15%',
    customRender: ({ record }: { record: DockerFile }) => {
      if (!record.harbor_uid)
        return h('span', { class: 'text-gray-400' }, '未选择');
      return h('span', getHarborName(record.harbor_uid));
    },
  },
  {
    title: '推送状态',
    key: 'pushStatus',
    width: '15%',
    customRender: ({ record }: { record: DockerFile }) => {
      return h('div', { class: 'flex items-center gap-2' }, [
        renderStatusTag(record.push_status),
        record.push_history &&
          h(
            Button,
            {
              type: 'link',
              size: 'small',
              onClick: () => viewPushHistory(record),
            },
            '历史',
          ),
      ]);
    },
  },
  {
    title: '标签',
    key: 'tags',
    customRender: ({ record }: { record: DockerFile }) => {
      if (!record.tags) return null;
      const tags = record.tags.split(',').map((t) => t.trim());
      return tags.map((tag) => h(Tag, { color: 'blue' }, () => tag));
    },
  },
  {
    title: '创建时间',
    key: 'createdAt',
    width: '15%',
    customRender: ({ record }: { record: DockerFile }) => {
      return record.created_at
        ? new Date(record.created_at).toLocaleDateString()
        : '未设置';
    },
  },
  {
    title: '操作',
    key: 'action',
    width: '30%',
    customRender: ({ record }: { record: DockerFile }) => {
      // 处理 null 状态
      const status = record.push_status || 'PENDING';
      const isPushing = status === 'PUSHING';

      // 创建按钮数组
      const buttons = [
        h(
          Button,
          {
            type: isPushing ? 'default' : 'primary',
            disabled: isPushing,
            onClick: () => !isPushing && editFile(record),
          },
          () => [h(EditOutlined), ' 编辑'],
        ),
        h(
          Popconfirm,
          {
            title: '确定要删除这个Docker文件吗？',
            onConfirm: () => deleteFile(record.id),
          },
          () =>
            h(
              Button,
              {
                type: 'primary',
                danger: true,
                disabled: isPushing,
              },
              () => [h(DeleteOutlined), ' 删除'],
            ),
        ),
      ];

      // 条件添加推送按钮
      if (
        status === 'PENDING' ||
        status === 'FAILED' ||
        status === 'CANCELLED'
      ) {
        buttons.push(
          h(
            Button,
            {
              type:
                status === 'FAILED' || status === 'CANCELLED'
                  ? 'dashed'
                  : 'primary',
              onClick: () => pushFile(record),
              danger: status === 'FAILED',
              disabled: !record.harbor_uid,
            },
            () => [h(CloudUploadOutlined), ' 推送'],
          ),
        );
      }

      // 条件添加取消推送按钮
      if (status === 'PUSHING') {
        buttons.push(
          h(
            Button,
            {
              danger: true,
              onClick: () => cancelPush(record),
            },
            () => [h(StopOutlined), ' 取消推送'],
          ),
        );
      }

      return h('div', { class: 'flex flex-wrap gap-2' }, buttons);
    },
  },
];

onMounted(() => {
  loadData();
});
</script>

<template>
  <Page title="Docker文件管理">
    <div class="container mx-auto px-4 py-6">
      <!-- 标题和操作区 -->
      <div class="mb-6 flex items-center justify-between">
        <div class="flex gap-3">
          <Button
            type="primary"
            @click="createNewFile"
            class="flex items-center"
          >
            <PlusOutlined />
            创建新文件
          </Button>
        </div>
      </div>

      <!-- 搜索和列表区 -->
      <Card class="rounded-lg shadow">
        <template #title>
          <div
            class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center"
          >
            <h2 class="text-lg font-semibold">Docker文件列表</h2>
            <Input
              v-model:value="searchQuery"
              placeholder="搜索文件名、内容或标签..."
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
          :key="tableKey"
          :data-source="filteredFiles"
          :columns="columns"
          :pagination="{ pageSize: 8 }"
          :row-key="(record) => record.id || record.uid"
          :loading="loading"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'content'">
              <div
                class="docker-preview max-h-20 overflow-y-auto rounded bg-gray-100 p-2 font-mono text-sm"
              >
                <pre>{{ record.content || '无内容' }}</pre>
              </div>
            </template>
          </template>

          <template #emptyText>
            <div v-if="loading" class="py-12 text-center">
              <SyncOutlined spin class="mb-3 text-2xl text-blue-500" />
              <p class="text-gray-600">正在加载Docker文件...</p>
            </div>
            <div v-else class="py-12 text-center">
              <div v-if="searchQuery" class="text-gray-500">
                没有找到匹配 "{{ searchQuery }}" 的文件
              </div>
              <div v-else>
                <p class="mb-4 text-gray-500">暂无Docker文件</p>
                <Button type="primary" @click="createNewFile">
                  创建第一个Docker文件
                </Button>
              </div>
            </div>
          </template>
        </Table>
      </Card>
    </div>

    <!-- Docker文件编辑模态框 -->
    <Modal
      :title="isEditing ? '编辑Docker文件' : '创建新Docker文件'"
      v-model:visible="modalVisible"
      width="800px"
      :ok-text="isEditing ? '更新' : '创建'"
      cancel-text="取消"
      @ok="saveFile"
    >
      <div class="docker-editor-panel p-4">
        <div class="form-item mb-4">
          <label class="mb-2 block font-medium text-gray-700">
            文件名 <span class="text-red-500">*</span>
          </label>
          <Input
            v-model:value="currentFile.name"
            placeholder="输入文件名"
            class="w-full"
          />
        </div>

        <div class="form-item mb-4">
          <label class="mb-2 block font-medium text-gray-700">
            Dockerfile内容 <span class="text-red-500">*</span>
          </label>
          <Input.TextArea
            v-model:value="currentFile.content"
            placeholder="输入Dockerfile内容..."
            :rows="12"
            class="w-full font-mono text-sm"
          />
        </div>

        <div class="form-item mb-4">
          <label class="mb-2 block font-medium text-gray-700"> 标签 </label>
          <div class="mb-3 flex gap-2">
            <Input
              v-model:value="newTag"
              placeholder="输入标签后按添加"
              class="flex-1"
              @press-enter="addTag"
            />
            <Button type="primary" @click="addTag">添加</Button>
          </div>

          <div class="flex flex-wrap gap-2">
            <Tag
              v-for="(tag, index) in currentFile.tags"
              :key="index"
              closable
              color="blue"
              @close="removeTag(index)"
            >
              {{ tag }}
            </Tag>
          </div>
        </div>

        <div class="form-item">
          <label class="mb-2 block font-medium text-gray-700">
            Harbor仓库 <span class="text-red-500">*</span>
            <span class="ml-1 text-xs text-gray-500">(选择此文件关联的仓库)</span>
          </label>
          <Select
            v-model:value="currentFile.harbor_uid"
            placeholder="请选择Harbor仓库"
            class="w-full"
            show-search
            option-filter-prop="label"
            :options="
              harborRepositories.map((r) => ({
                value: r.uid,
                label: r.name,
                title: r.url,
              }))
            "
          >
            <template #option="{ value, label, title }">
              <div class="flex flex-col">
                <span class="font-medium">{{ label }}</span>
                <span class="text-xs text-gray-500">{{ title }}</span>
              </div>
            </template>
          </Select>
          <p v-if="!currentFile.harbor_uid" class="mt-1 text-xs text-red-500">
            请为Docker文件选择一个关联的Harbor仓库
          </p>
        </div>
      </div>
    </Modal>
  </Page>
</template>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
}

.docker-preview {
  max-height: 100px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.docker-editor-panel {
  border-radius: 8px;
}

:deep(.ant-input) {
  border: 1px solid #d9d9d9;
}

.dark .docker-editor-panel {
  background-color: #1f2937;
}

:deep(.ant-input:hover),
:deep(.ant-input:focus) {
  border-color: #40a9ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

:deep(.ant-modal-body) {
  padding: 0;
}

:deep(.ant-modal-content) {
  border-radius: 8px;
  overflow: hidden;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.spin {
  animation: spin 1s linear infinite;
}
</style>
