<script lang="ts" setup>
import type { ApiResponse, HdfsFile } from '../../SMP/api/types';

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  DeleteOutlined,
  DownloadOutlined,
  EllipsisOutlined,
  FileOutlined,
  FolderOutlined,
  HomeOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue';
import {
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

// 导入统一的API函数
import {
  batchDeleteHdfsFiles,
  createHdfsDirectory,
  deleteHdfsFile,
  downloadHdfsFile,
  fetchHdfsFileList,
  uploadHdfsFile,
} from '../../SMP/api/datasetManager';

const route = useRoute();
const router = useRouter();

// 数据集信息
const datasetId = ref(route.query.id as string);
const datasetName = ref(route.query.name as string);
const datasetType = ref(route.query.type as string);

// HDFS文件列表
const fileList = ref<HdfsFile[]>([]);
const loading = ref(false);
const currentPath = ref('/'); // 当前路径
const breadcrumbItems = ref<{ name: string; path: string }[]>([]);
const selectedFiles = ref<string[]>([]);

// 添加表格列定义
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

// 获取文件列表
const fetchFileList = async () => {
  loading.value = true;
  try {
    const response = await fetchHdfsFileList(
      datasetId.value,
      currentPath.value,
    );

    console.log('获取文件列表API响应:', response);

    if (response && Array.isArray(response) && response.length > 0) {
      // 确保正确处理数组响应
      fileList.value = response.map((file) => {
        // 处理 HDFS URI，提取实际路径
        // 例如：hdfs://127.0.0.1:8020/datasets/... -> /datasets/...
        let rawPath = file.path;
        if (rawPath.startsWith('hdfs://')) {
          // 移除 hdfs://host:port 前缀，只保留路径部分
          const hdfsMatch = rawPath.match(/^hdfs:\/\/[^/]+(\/.*)/);
          if (hdfsMatch) {
            rawPath = hdfsMatch[1];
          }
        }

        // 从完整路径中提取文件名
        const fileName = rawPath.split('/').pop() || '未知文件';

        // 确保路径以斜杠开头
        const filePath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;

        return {
          ...file,
          id: filePath, // 使用处理后的路径作为ID
          name: fileName,
          isDirectory: file.directory, // 使用后端返回的directory字段
          sizeFormatted: formatFileSize(file.size || 0),
          modificationTime: file.modificationTime,
          permissions: file.permissions || '-',
          owner: file.owner || '-',
          group: file.group || '-',
          path: filePath, // 确保路径格式正确
        };
      });

      console.log('处理后的文件列表:', fileList.value);

      // 更新面包屑导航
      updateBreadcrumb();
    } else {
      console.warn('获取的文件列表为空');
      message.info('当前目录为空');
      fileList.value = [];
    }
  } catch (error) {
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

  // 确保路径格式正确
  let newPath = path;
  if (!newPath.startsWith('/')) {
    newPath = `/${newPath}`;
  }

  console.log('进入目录:', newPath);
  currentPath.value = newPath;
  fetchFileList();
};

// 返回上一级
const goBack = () => {
  const paths = currentPath.value.split('/').filter(Boolean);
  if (paths.length > 0) {
    paths.pop();
    currentPath.value = paths.length > 0 ? `/${paths.join('/')}` : '/';
    console.log('返回上一级到:', currentPath.value);
    fetchFileList();
  } else {
    console.log('已经在根目录');
    message.info('已经在根目录');
  }
};

// 返回根目录
const goToRoot = () => {
  console.log('返回根目录');
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
  console.log('更新面包屑:', items);
};

// 处理文件上传
const handleUpload = async () => {
  if (!uploadFile.value) {
    message.warning('请选择要上传的文件');
    return;
  }

  try {
    // 响应拦截器已经提取了 data 字段，response 直接就是 data 的内容
    // 如果请求成功，response 会是 data 对象；如果失败会抛出异常
    await uploadHdfsFile(
      datasetId.value,
      currentPath.value,
      uploadFile.value,
      (progress) => {
        uploadProgress.value = progress;
      },
    );

    // 请求成功（没有抛出异常）
    message.success('文件上传成功');
    fetchFileList();
    uploadVisible.value = false;
    uploadFile.value = null;
    uploadFileName.value = '';
    uploadProgress.value = 0;
  } catch (error) {
    console.error('文件上传失败:', error);
    message.error('文件上传失败');
  }
};

// 下载文件
const handleDownload = async (file: HdfsFile) => {
  if (!file?.path) return;

  if (file.isDirectory) {
    enterDirectory(file.path);
    return;
  }

  try {
    // 使用完整路径下载
    const blob = await downloadHdfsFile(datasetId.value, file.id || file.path);

    // 创建下载链接
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', file.name || 'file');
    document.body.append(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error('文件下载失败:', error);
    message.error('文件下载失败');
  }
};

// 删除文件或目录
const handleDelete = (file: HdfsFile) => {
  if (!file?.id) return;

  Modal.confirm({
    title: `确定要删除${file.isDirectory ? '文件夹' : '文件'} ${file.name || ''} 吗？`,
    content: '删除后不可恢复',
    onOk: async () => {
      try {
        // 响应拦截器已经提取了 data 字段，成功时不会抛出异常
        await deleteHdfsFile(
          datasetId.value,
          file.id, // 使用完整路径作为ID
        );

        message.success('删除成功');
        fetchFileList();
      } catch (error) {
        console.error('删除失败:', error);
        message.error('删除失败');
      }
    },
  });
};

// 创建文件夹
const handleCreateFolder = async () => {
  if (!newFolderName.value) {
    message.warning('请输入文件夹名称');
    return;
  }

  try {
    // 响应拦截器已经提取了 data 字段，成功时不会抛出异常
    await createHdfsDirectory(
      datasetId.value,
      currentPath.value,
      newFolderName.value,
    );

    message.success('文件夹创建成功');
    fetchFileList();
    createFolderVisible.value = false;
    newFolderName.value = '';
  } catch (error) {
    console.error('文件夹创建失败:', error);
    message.error('文件夹创建失败');
  }
};

// 文件选择处理
const beforeUpload = (file: File) => {
  uploadFile.value = file;
  uploadFileName.value = file.name;
  return false; // 阻止自动上传
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
  if (selectedFiles.value.length === 0) {
    message.warning('请选择要删除的文件');
    return;
  }

  Modal.confirm({
    title: `确定要删除选中的 ${selectedFiles.value.length} 个文件/文件夹吗？`,
    content: '删除后不可恢复',
    onOk: async () => {
      try {
        // 响应拦截器已经提取了 data 字段，成功时不会抛出异常
        await batchDeleteHdfsFiles(
          datasetId.value,
          selectedFiles.value,
        );

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

// 初始化时获取文件列表
onMounted(() => {
  fetchFileList();
});
</script>

<template>
  <Card class="p-4 shadow">
    <div class="mb-4">
      <Button @click="router.push({ path: '/DPP/dataset/index' })">
        <template #icon><HomeOutlined /></template>
        返回数据集列表
      </Button>
    </div>

    <Card :title="`数据集: ${datasetName}`" class="mb-4">
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center">
          <span class="mr-4">类型: {{ datasetType }}</span>
          <!-- 修复面包屑警告 -->
          <Breadcrumb>
            <Breadcrumb.Item v-for="item in breadcrumbItems" :key="item.path">
              <a @click="enterDirectory(item.path)">{{ item.name }}</a>
            </Breadcrumb.Item>
          </Breadcrumb>
        </div>

        <div>
          <Button @click="goBack" class="mr-2">返回上一级</Button>
          <Button @click="goToRoot" class="mr-4">返回根目录</Button>

          <Dropdown>
            <Button type="primary"> 操作 <EllipsisOutlined /> </Button>
            <template #overlay>
              <Menu>
                <MenuItem @click="uploadVisible = true">
                  <UploadOutlined /> 上传文件
                </MenuItem>
                <MenuItem @click="createFolderVisible = true">
                  <PlusOutlined /> 新建文件夹
                </MenuItem>
                <MenuItem
                  @click="handleBatchDelete"
                  :disabled="selectedFiles.length === 0"
                >
                  <DeleteOutlined /> 批量删除
                </MenuItem>
              </Menu>
            </template>
          </Dropdown>
        </div>
      </div>

      <!-- 添加表格列定义 -->
      <Table
        :data-source="fileList"
        :columns="columns"
        :loading="loading"
        :row-selection="rowSelection"
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
              v-if="record && !record.isDirectory"
            >
              <DownloadOutlined /> 下载
            </Button>
            <Button type="link" danger @click="handleDelete(record)">
              <DeleteOutlined /> 删除
            </Button>
          </template>
        </template>

        <template
          #expandedRowRender="{ record }"
          v-if="record && !record.isDirectory"
        >
          <div class="file-details">
            <div class="detail-item">
              <span class="detail-label">路径:</span>
              <span class="detail-value">{{ record?.path || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">权限:</span>
              <span class="detail-value">{{ record?.permissions || '-' }}</span>
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
    title="上传文件"
    @ok="handleUpload"
    @cancel="uploadVisible = false"
  >
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
