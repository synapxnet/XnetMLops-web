<script lang="ts" setup>
import BusinessPage from '#/components/workspace/BusinessPage.vue';
import { publicRequestMessage } from '#/api/public-error';
import type { HdfsFile } from '../../SMP/api/types';

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  DeleteOutlined,
  DownloadOutlined,
  EllipsisOutlined,
  FileOutlined,
  FolderOutlined,
  HomeOutlined,
  LockOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue';
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  Dropdown,
  Input,
  Menu,
  message,
  Modal,
  Progress,
  Table,
  Upload,
} from 'ant-design-vue';

import {
  createAlgorithmDirectory,
  deleteAlgorithmFile,
  downloadAlgorithmFile,
  fetchAlgorithmFileList,
  uploadAlgorithmFile,
} from '../../SMP/api/algorithmManager';

const route = useRoute();
const router = useRouter();

// 算法信息
const algorithmId = ref(route.query.id as string);
const algorithmName = ref(route.query.name as string);
const isCAS = ref(route.query.isCAS === 'true');

// HDFS文件列表
const fileList = ref<HdfsFile[]>([]);
const loading = ref(false);
const readError = ref('');
const currentPath = ref('/');
const breadcrumbItems = ref<{ name: string; path: string }[]>([]);
const selectedFiles = ref<string[]>([]);

// 表格列定义
const columns = ref([
  {
    title: '名称',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '大小',
    dataIndex: 'size',
    key: 'size',
  },
  {
    title: '修改时间',
    dataIndex: 'modificationTime',
    key: 'modificationTime',
  },
  {
    title: '操作',
    key: 'action',
  },
]);

// 上传相关状态
const uploadVisible = ref(false);
const uploadProgress = ref(0);
const uploadFile = ref<File | null>(null);
const uploadFileName = ref('');
const createFolderVisible = ref(false);
const newFolderName = ref('');

// 读取失败持续显示并允许重试，不误报为空目录。 Keep read failures visible and retryable instead of reporting an empty directory.
const fetchFileList = async () => {
  loading.value = true;
  readError.value = '';
  try {
    const response = await fetchAlgorithmFileList(
      algorithmId.value,
      currentPath.value,
    );

    console.log('获取算法文件列表API响应:', response);

    // 更新CAS状态（从后端响应获取）
    if (response && response.isCAS !== undefined) {
      isCAS.value = response.isCAS;
    }

    const data = response?.data || response;

    if (data && Array.isArray(data) && data.length > 0) {
      fileList.value = data.map((file: any) => {
        // 处理 HDFS URI
        let rawPath = file.path;
        if (rawPath.startsWith('hdfs://')) {
          const hdfsMatch = rawPath.match(/^hdfs:\/\/[^/]+(\/.*)/);
          if (hdfsMatch) {
            rawPath = hdfsMatch[1];
          }
        }

        const fileName = rawPath.split('/').pop() || '未知文件';
        const filePath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;

        return {
          ...file,
          id: filePath,
          name: fileName,
          isDirectory: file.directory,
          sizeFormatted: formatFileSize(file.size || 0),
          modificationTime: file.modificationTime,
          permissions: file.permissions || '-',
          owner: file.owner || '-',
          group: file.group || '-',
          path: filePath,
        };
      });

      updateBreadcrumb();
    } else {
      message.info('当前目录为空');
      fileList.value = [];
    }
  } catch (error) {
    fileList.value = [];
    selectedFiles.value = [];
    readError.value = publicRequestMessage(error, '文件列表读取失败');
    console.error('获取文件列表失败:', error);
    message.error('获取文件列表失败');
  } finally {
    loading.value = false;
  }
};

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

// 进入文件夹
const enterDirectory = (path: string) => {
  if (!path) return;

  let newPath = path;
  if (!newPath.startsWith('/')) {
    newPath = `/${newPath}`;
  }

  currentPath.value = newPath;
  fetchFileList();
};

// 返回上一级
const goBack = () => {
  const paths = currentPath.value.split('/').filter(Boolean);
  if (paths.length > 0) {
    paths.pop();
    currentPath.value = paths.length > 0 ? `/${paths.join('/')}` : '/';
    fetchFileList();
  } else {
    message.info('已经在根目录');
  }
};

// 返回根目录
const goToRoot = () => {
  currentPath.value = '/';
  fetchFileList();
};

// 更新面包屑导航
const updateBreadcrumb = () => {
  const paths = currentPath.value.split('/').filter(Boolean);
  const items = [{ path: '/', name: '根目录' }];

  let currentPathStr = '';
  for (const path of paths) {
    currentPathStr += `/${path}`;
    items.push({ path: currentPathStr, name: path });
  }

  breadcrumbItems.value = items;
};

// 处理文件上传
const handleUpload = async () => {
  if (isCAS.value) {
    message.warning('CAS模式下不允许上传文件，请使用云算法仓库');
    return;
  }

  if (!uploadFile.value) {
    message.warning('请选择要上传的文件');
    return;
  }

  try {
    const response = await uploadAlgorithmFile(
      algorithmId.value,
      currentPath.value,
      uploadFile.value,
      (progress) => {
        uploadProgress.value = progress;
      },
    );

    if (response.code === 0) {
      message.success('文件上传成功（已覆盖同名文件）');
      fetchFileList();
      uploadVisible.value = false;
      uploadFile.value = null;
      uploadFileName.value = '';
      uploadProgress.value = 0;
    } else {
      message.error(response.message || '文件上传失败');
    }
  } catch (error: any) {
    console.error('文件上传失败:', error);
    if (error?.response?.data?.message) {
      message.error(error.response.data.message);
    } else {
      message.error('文件上传失败');
    }
  }
};

const downloadProgress = ref<Record<string, number>>({});

// 显示实际传输进度，防止重复下载并释放完成后的对象URL。 / Show actual transfer progress, prevent duplicate downloads and release completed object URLs.
const handleDownload = async (file: HdfsFile) => {
  if (!file?.path) return;

  if (file.isDirectory) {
    enterDirectory(file.path);
    return;
  }

  const key = file.id || file.path;
  if (downloadProgress.value[key] !== undefined) return;
  downloadProgress.value[key] = 0;
  try {
    const blob = await downloadAlgorithmFile(
      algorithmId.value,
      key,
      // 将当前文件接收进度写回界面。 / Reflect the current file's receive progress in the view.
      (progress) => { downloadProgress.value[key] = progress; },
    );

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', file.name || 'file');
    document.body.append(link);
    link.click();
    link.remove();
    // 浏览器保存启动后释放临时文件URL。 / Release the temporary file URL after the browser starts saving.
    window.setTimeout(() => window.URL.revokeObjectURL(url), 30_000);
  } catch (error) {
    console.error('文件下载失败:', error);
    message.error('文件下载失败');
  } finally {
    delete downloadProgress.value[key];
  }
};

// 删除文件或目录
const handleDelete = (file: HdfsFile) => {
  if (isCAS.value) {
    message.warning('CAS模式下不允许删除文件');
    return;
  }

  if (!file?.id) return;

  Modal.confirm({
    title: `确定要删除${file.isDirectory ? '文件夹' : '文件'} ${file.name || ''} 吗？`,
    content: '删除后不可恢复',
    onOk: async () => {
      try {
        const response = await deleteAlgorithmFile(algorithmId.value, file.id);

        if (response.code === 0) {
          message.success('删除成功');
          fetchFileList();
        } else {
          message.error(response.message || '删除失败');
        }
      } catch (error) {
        console.error('删除失败:', error);
        message.error('删除失败');
      }
    },
  });
};

// 创建文件夹
const handleCreateFolder = async () => {
  if (isCAS.value) {
    message.warning('CAS模式下不允许创建目录');
    return;
  }

  if (!newFolderName.value) {
    message.warning('请输入文件夹名称');
    return;
  }

  try {
    const response = await createAlgorithmDirectory(
      algorithmId.value,
      currentPath.value,
      newFolderName.value,
    );

    if (response.code === 0) {
      message.success('文件夹创建成功');
      fetchFileList();
      createFolderVisible.value = false;
      newFolderName.value = '';
    } else {
      message.error(response.message || '文件夹创建失败');
    }
  } catch (error) {
    console.error('文件夹创建失败:', error);
    message.error('文件夹创建失败');
  }
};

// 文件选择处理
const beforeUpload = (file: File) => {
  uploadFile.value = file;
  uploadFileName.value = file.name;
  return false;
};

// 多选处理
const rowSelection = computed(() => ({
  selectedRowKeys: selectedFiles.value,
  onChange: (selectedKeys: string[]) => {
    selectedFiles.value = selectedKeys;
  },
}));

// 批量删除
const handleBatchDelete = () => {
  if (isCAS.value) {
    message.warning('CAS模式下不允许删除文件');
    return;
  }

  if (selectedFiles.value.length === 0) {
    message.warning('请选择要删除的文件');
    return;
  }

  Modal.confirm({
    title: `确定要删除选中的 ${selectedFiles.value.length} 个文件/文件夹吗？`,
    content: '删除后不可恢复',
    onOk: async () => {
      try {
        // 逐个删除
        for (const filePath of selectedFiles.value) {
          await deleteAlgorithmFile(algorithmId.value, filePath);
        }

        message.success('删除成功');
        selectedFiles.value = [];
        fetchFileList();
      } catch (error) {
        console.error('删除失败:', error);
        message.error('删除失败');
      }
    },
  });
};

onMounted(() => {
  fetchFileList();
});
</script>

<template>
  <BusinessPage
    domain="模型研发"
    description="连接算法、训练记录与模型证据，让每一次迭代都有据可循。"
    :error="readError"
    :loading="loading"
    @retry="fetchFileList"
  >
    <Card class="p-4 shadow">
      <div class="mb-4">
        <Button @click="router.push({ path: '/MTP/algorithm/index' })">
          <template #icon><HomeOutlined /></template>
          返回算法列表
        </Button>
      </div>

      <!-- CAS模式提示 -->
      <Alert
        v-if="isCAS"
        message="CAS模式"
        description="当前算法来自云算法仓库(CAS)，只能查看和下载文件，不支持上传、删除或修改操作。如需修改，请在SMP云算法仓库中操作。"
        type="warning"
        show-icon
        class="mb-4"
      >
        <template #icon><LockOutlined /></template>
      </Alert>

      <Card :title="`算法: ${algorithmName}`" class="mb-4">
        <div class="mb-4 flex items-center justify-between">
          <div class="flex items-center">
            <Breadcrumb>
              <Breadcrumb.Item v-for="item in breadcrumbItems" :key="item.path">
                <a @click="enterDirectory(item.path)">{{ item.name }}</a>
              </Breadcrumb.Item>
            </Breadcrumb>
          </div>

          <div>
            <Button @click="goBack" class="mr-2">返回上一级</Button>
            <Button @click="goToRoot" class="mr-4">返回根目录</Button>

            <!-- 非CAS模式显示操作按钮 -->
            <Dropdown v-if="!isCAS">
              <Button type="primary"> 操作 <EllipsisOutlined /> </Button>
              <template #overlay>
                <Menu>
                  <Menu.Item @click="uploadVisible = true">
                    <UploadOutlined /> 上传文件（覆盖模式）
                  </Menu.Item>
                  <Menu.Item @click="createFolderVisible = true">
                    <PlusOutlined /> 新建文件夹
                  </Menu.Item>
                  <Menu.Item
                    @click="handleBatchDelete"
                    :disabled="selectedFiles.length === 0"
                  >
                    <DeleteOutlined /> 批量删除
                  </Menu.Item>
                </Menu>
              </template>
            </Dropdown>
          </div>
        </div>

        <Table
          :data-source="fileList"
          :columns="columns"
          :loading="loading"
          :row-selection="isCAS ? undefined : rowSelection"
          row-key="id"
          :pagination="false"
          class="hdfs-table"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <div class="flex items-center">
                <FolderOutlined
                  v-if="record?.isDirectory"
                  class="mr-2 text-lg text-blue-500"
                />
                <FileOutlined v-else class="mr-2 text-lg text-gray-500" />
                <a
                  v-if="record?.isDirectory"
                  @click="enterDirectory(record?.path || '/')"
                >
                  {{ record?.name || '未知文件夹' }}
                </a>
                <span v-else>{{ record?.name || '未知文件' }}</span>
              </div>
            </template>

            <template v-if="column.key === 'size'">
              {{ record?.isDirectory ? '-' : record?.sizeFormatted || '0 B' }}
            </template>

            <template v-if="column.key === 'modificationTime'">
              {{
                record?.modificationTime
                  ? new Date(record.modificationTime).toLocaleString()
                  : '-'
              }}
            </template>

            <template v-if="column.key === 'action'">
              <Button
                type="link"
                @click="handleDownload(record)"
                :loading="downloadProgress[record.id || record.path] !== undefined"
                v-if="record && !record.isDirectory"
              >
                <DownloadOutlined /> {{ downloadProgress[record.id || record.path] !== undefined ? `下载中 ${downloadProgress[record.id || record.path]}%` : '下载' }}
              </Button>
              <!-- 非CAS模式才显示删除按钮 -->
              <Button
                v-if="!isCAS"
                type="link"
                danger
                @click="handleDelete(record)"
              >
                <DeleteOutlined /> 删除
              </Button>
            </template>
          </template>

          <template #expandedRowRender="{ record }">
            <div v-if="record && !record.isDirectory" class="file-details">
              <div class="detail-item">
                <span class="detail-label">路径:</span>
                <span class="detail-value">{{ record?.path || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">权限:</span>
                <span class="detail-value">{{
                  record?.permissions || '-'
                }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">所有者:</span>
                <span class="detail-value"
                  >{{ record?.owner || '-' }}:{{ record?.group || '-' }}</span
                >
              </div>
            </div>
          </template>
        </Table>
      </Card>
    </Card>

    <!-- 上传文件模态框 -->
    <Modal
      v-model:visible="uploadVisible"
      title="上传文件（覆盖模式）"
      @ok="handleUpload"
      @cancel="uploadVisible = false"
    >
      <Alert
        message="注意：上传同名文件将会覆盖原有文件"
        type="info"
        show-icon
        class="mb-4"
      />
      <div class="upload-container">
        <Upload
          :before-upload="beforeUpload"
          :show-upload-list="false"
          accept="*"
        >
          <Button class="mb-4"> <UploadOutlined /> 选择文件 </Button>
        </Upload>

        <div v-if="uploadFile" class="file-info">
          <FileOutlined class="mr-2" />
          {{ uploadFileName }}
          <span class="file-size">({{ formatFileSize(uploadFile.size) }})</span>
        </div>

        <div v-if="uploadProgress > 0" class="mt-4">
          <Progress :percent="uploadProgress" status="active" />
        </div>
      </div>
    </Modal>

    <!-- 创建文件夹模态框 -->
    <Modal
      v-model:visible="createFolderVisible"
      title="新建文件夹"
      @ok="handleCreateFolder"
      @cancel="createFolderVisible = false"
    >
      <div class="create-folder">
        <Input
          v-model:value="newFolderName"
          placeholder="请输入文件夹名称"
          @press-enter="handleCreateFolder"
        />
      </div>
    </Modal>
  </BusinessPage>
</template>

<style scoped>
.hdfs-table :deep(.ant-table-thead > tr > th) {
  font-weight: 600;
}

.file-details {
  padding: 16px;
  border: 1px solid var(--ant-color-border);
  border-radius: 4px;
  margin: 8px 0;
}

.detail-item {
  display: flex;
  margin-bottom: 8px;
}

.detail-label {
  font-weight: 600;
  width: 80px;
  color: var(--ant-color-text-secondary);
}

.detail-value {
  flex: 1;
}

.upload-container {
  padding: 16px;
  border: 1px dashed var(--ant-color-border);
  border-radius: 4px;
  text-align: center;
}

.file-info {
  padding: 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.file-size {
  color: var(--ant-color-text-tertiary);
  margin-left: 8px;
}
</style>
