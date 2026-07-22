<script lang="ts" setup>
import type { HdfsFile } from '../../SMP/api/types';

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  AlertOutlined,
  CloudOutlined,
  FileOutlined,
  FolderOutlined,
} from '@ant-design/icons-vue';
import {
  Alert,
  Button,
  Card,
  Collapse,
  Descriptions,
  Form,
  Input,
  message,
  Modal,
  Progress,
  Select,
  Table,
  Upload,
} from 'ant-design-vue';

// 引入API函数
import { fetchAlgorithmDetail, updateAlgorithm } from '../../SMP/api/algorithm';
import {
  fetchAlgorithmFileList,
  uploadAlgorithmFile,
} from '../../SMP/api/algorithmManager';
import { getbucketConfig } from '../../SMP/api/bucketConfig';
import { fetchConfig } from '../../SMP/api/datasetConfig';

// 组件注册
const AForm = Form;
const AFormItem = Form.Item;
const AInput = Input;
const ASelect = Select;
const AUpload = Upload;
const ACollapse = Collapse;
const ACollapsePanel = Collapse.Panel;

const router = useRouter();
const route = useRoute();
const formRef = ref<InstanceType<typeof AForm>>();
const activeKeys = ref(['advanced-settings']);
const formState = ref<Record<string, any>>({});
const algorithmId = ref<null | number>(null);

// CAS 模式相关
const isCAS = ref(false);
const cloudAlgorithmInfo = ref<{
  id: string;
  name: string;
  version: string;
} | null>(null);

// 算法文件列表（非CAS模式）
const algorithmFiles = ref<HdfsFile[]>([]);
const filesLoading = ref(false);

// 配置数据
const configData = ref({
  datasetTypes: [] as { label: string; value: string }[],
  datasetZones: [] as { label: string; value: string }[],
});

// 存储桶数据
const buckets = ref<any[]>([]);
const selectedBucket = ref<any>(null);

// 文件上传相关状态
const fileList = ref<any[]>([]);
const uploadProgress = ref(0);
const uploadStatus = ref<'error' | 'idle' | 'success' | 'uploading'>('idle');
const selectedFile = ref<File | null>(null);
const uploadModalVisible = ref(false);

// 文件列表表格列
const fileColumns = [
  { title: '文件名', dataIndex: 'name', key: 'name' },
  { title: '大小', dataIndex: 'sizeFormatted', key: 'size' },
  {
    title: '修改时间',
    dataIndex: 'modificationTime',
    key: 'modificationTime',
    customRender: ({ text }: { text: number }) =>
      text ? new Date(text).toLocaleString() : '-',
  },
];

// 从API加载配置
const loadConfig = async () => {
  try {
    const data = await fetchConfig();
    configData.value = {
      datasetTypes: data.datasetTypes,
      datasetZones: data.datasetZones,
    };
  } catch (error) {
    console.error('加载配置失败:', error);
    message.error('加载配置失败，使用默认配置');

    configData.value = {
      datasetTypes: [
        { label: '文本', value: '1' },
        { label: '图像', value: '2' },
        { label: '音频', value: '3' },
      ],
      datasetZones: [
        { label: '南京', value: '1' },
        { label: '江西', value: '2' },
        { label: '广东', value: '3' },
      ],
    };
  }
};

// 加载存储桶
const loadBuckets = async () => {
  try {
    const response = await getbucketConfig();
    buckets.value = response;
  } catch (error) {
    console.error('获取存储桶失败:', error);
    message.error('获取存储桶列表失败');
    buckets.value = [];
  }
};

// 通用验证规则生成器
const requiredRule = (message: string) => ({ required: true, message });

// 表单配置
const schema = computed(() => [
  {
    component: 'Input',
    componentProps: {
      placeholder: '算法名称',
      class: 'w-full disabled-input',
      disabled: true, // 算法名称不可修改
    },
    fieldName: 'algorithm_name',
    label: '算法名称：',
  },
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入版本号',
      class: 'w-full',
    },
    fieldName: 'version',
    label: '版本：',
    rules: [requiredRule('请输入版本号')],
  },
  {
    component: 'Select',
    componentProps: {
      allowClear: true,
      showSearch: true,
      options: configData.value.datasetZones,
      placeholder: '请选择',
      filterOption: (input: string, option: any) =>
        option.label.toLowerCase().includes(input.toLowerCase()),
    },
    fieldName: 'zone',
    label: '数据区域：',
    rules: [requiredRule('请选择数据区域')],
  },
  {
    component: 'Select',
    componentProps: {
      allowClear: true,
      showSearch: true,
      options: [
        { label: '否', value: '0' },
        { label: '是', value: '1' },
      ],
      placeholder: '请选择',
      filterOption: (input: string, option: any) =>
        option.label.toLowerCase().includes(input.toLowerCase()),
    },
    fieldName: 'encryption',
    label: '是否需要加密',
    rules: [requiredRule('请选择加密选项')],
  },
  {
    component: 'Select',
    componentProps: {
      allowClear: true,
      showSearch: true,
      options: [
        { label: '否', value: '0' },
        { label: '是', value: '1' },
      ],
      placeholder: '请选择',
      filterOption: (input: string, option: any) =>
        option.label.toLowerCase().includes(input.toLowerCase()),
    },
    fieldName: 'subdata_area',
    label: '子数据域',
    rules: [requiredRule('请选择子数据域选项')],
  },
  {
    component: 'Input',
    componentProps: {
      placeholder: '存储桶',
      class: 'w-full disabled-input',
      disabled: true, // 存储桶不可修改
    },
    fieldName: 'bucket_name',
    label: '存储桶：',
  },
  {
    component: 'Input',
    componentProps: {
      placeholder: '团队名称',
      class: 'w-full disabled-input',
      disabled: true, // 团队名称不可修改
    },
    fieldName: 'team_name',
    label: '团队：',
  },
]);

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

// 加载算法文件列表（非CAS模式）
const loadAlgorithmFiles = async () => {
  if (!algorithmId.value || isCAS.value) return;

  filesLoading.value = true;
  try {
    const response = await fetchAlgorithmFileList(
      algorithmId.value.toString(),
      '/',
    );

    const data = response?.data || response;

    if (data && Array.isArray(data)) {
      algorithmFiles.value = data.map((file: any) => {
        let rawPath = file.path;
        if (rawPath.startsWith('hdfs://')) {
          const hdfsMatch = rawPath.match(/^hdfs:\/\/[^/]+(\/.*)/);
          if (hdfsMatch) {
            rawPath = hdfsMatch[1];
          }
        }

        const fileName = rawPath.split('/').pop() || '未知文件';

        return {
          ...file,
          id: rawPath,
          name: fileName,
          isDirectory: file.directory,
          sizeFormatted: formatFileSize(file.size || 0),
        };
      });
    }
  } catch (error) {
    console.error('加载算法文件列表失败:', error);
  } finally {
    filesLoading.value = false;
  }
};

// 加载算法信息
const loadAlgorithm = async () => {
  const id = route.query.id ? Number.parseInt(route.query.id as string) : null;
  if (!id) {
    message.error('算法ID无效');
    router.go(-1);
    return;
  }

  algorithmId.value = id;

  try {
    // 调用API获取算法详情
    const algorithm = await fetchAlgorithmDetail(id);

    // 设置 CAS 模式
    isCAS.value = algorithm.is_CAS === true || algorithm.isCAS === true;

    // 如果是 CAS 模式，设置云算法信息
    if (isCAS.value && algorithm.cloud_algorithm_id) {
      cloudAlgorithmInfo.value = {
        id: algorithm.cloud_algorithm_id,
        name: algorithm.algorithm_name,
        version: algorithm.version,
      };
    }

    // 查找存储桶信息
    const bucket = buckets.value.find((b) => b.name === algorithm.bucket_name);
    if (bucket) {
      selectedBucket.value = bucket;
    }

    // 填充表单
    formState.value = {
      ...algorithm,
      encryption: algorithm.encryption ? '1' : '0',
      subdata_area: algorithm.subdata_area ? '1' : '0',
    };

    // 非 CAS 模式加载文件列表
    if (!isCAS.value) {
      await loadAlgorithmFiles();
    }
  } catch (error) {
    console.error('加载算法详情失败', error);
    message.error('加载算法详情失败');
    router.go(-1);
  }
};

// 初始化加载数据
onMounted(async () => {
  await loadConfig();
  await loadBuckets();
  await loadAlgorithm();
});

// 表单提交处理
const handleSubmit = async () => {
  try {
    await formRef.value?.validate();
    await onSubmit(formState.value);
  } catch {
    message.error('请正确填写所有必填字段');
  }
};

const handleCancel = () => {
  router.go(-1);
};

// 表单提交 - 调用API更新算法
const onSubmit = async (values: Record<string, any>) => {
  if (!algorithmId.value) return;

  try {
    // 构造更新数据
    const updateData = {
      version: values.version,
      zone: values.zone,
      encryption: values.encryption === '1',
      subdata_area: values.subdata_area === '1',
      description: values.description,
    };

    await updateAlgorithm(algorithmId.value, updateData);

    message.success('算法更新成功');
    // 跳转回列表页，并展开当前算法
    router.push({
      path: '/MTP/algorithm/index',
      query: {
        expanded: 'true',
        newAlgorithmId: algorithmId.value.toString(),
      },
    });
  } catch (error) {
    console.error('更新算法失败', error);
    message.error('更新算法失败');
  }
};

// 文件上传处理
const beforeUpload = (file: File) => {
  const isLt100G = file.size / 1024 / 1024 / 1024 < 100; // 100GB
  if (!isLt100G) {
    message.error('文件大小不能超过100GB');
    return false;
  }

  // 检查文件类型
  const validTypes = ['py', 'zip', 'tar'];
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (!extension || !validTypes.includes(extension)) {
    message.error('只支持PY、ZIP和TAR格式的文件');
    return false;
  }

  return true;
};

const handleFileChange = (info: any) => {
  const file = info.file;

  if (file.status === 'removed') {
    fileList.value = [];
    selectedFile.value = null;
    return;
  }

  const rawFile = file.originFileObj;
  if (!rawFile) return;

  if (!beforeUpload(rawFile)) {
    fileList.value = [];
    selectedFile.value = null;
    return;
  }

  selectedFile.value = rawFile;
  fileList.value = [
    {
      ...file,
      status: 'done',
      url: URL.createObjectURL(rawFile),
    },
  ];

  // 重置上传状态
  uploadStatus.value = 'idle';
  uploadProgress.value = 0;
};

const startUpload = async () => {
  if (!selectedFile.value) {
    message.warning('请先选择文件');
    return;
  }

  if (!algorithmId.value) {
    message.error('算法ID无效');
    return;
  }

  uploadModalVisible.value = true;
  uploadStatus.value = 'uploading';
  uploadProgress.value = 0;

  try {
    const response = await uploadAlgorithmFile(
      algorithmId.value.toString(),
      '/',
      selectedFile.value,
      (progress) => {
        uploadProgress.value = progress;
      },
    );

    if (response.code === 0) {
      uploadStatus.value = 'success';
      message.success('文件上传成功（已覆盖同名文件）');
      // 刷新文件列表
      await loadAlgorithmFiles();
      // 清空选择
      fileList.value = [];
      selectedFile.value = null;
    } else {
      uploadStatus.value = 'error';
      message.error(response.message || '文件上传失败');
    }
  } catch (error: any) {
    uploadStatus.value = 'error';
    console.error('文件上传失败:', error);
    message.error(error?.response?.data?.message || '文件上传失败');
  }
};

const cancelUpload = () => {
  uploadModalVisible.value = false;
  uploadStatus.value = 'idle';
  uploadProgress.value = 0;
  message.info('上传已取消');
};

// 跳转到完整文件管理器
const goToFileManager = () => {
  router.push({
    path: '/MTP/algorithm/algorithmFileManager',
    query: {
      id: algorithmId.value?.toString(),
      name: formState.value.algorithm_name,
      isCAS: isCAS.value ? 'true' : 'false',
    },
  });
};

// 选择云算法（CAS模式）
const selectCloudAlgorithm = () => {
  // 跳转到 SMP 云算法仓库选择页面
  message.info('请前往 SMP 云算法仓库选择算法');
  // TODO: 实现云算法选择逻辑
};
</script>

<template>
  <Page title="修改算法" />
  <div class="page-container">
    <Card class="form-card">
      <AForm
        ref="formRef"
        :model="formState"
        layout="vertical"
        class="form-grid"
      >
        <!-- 动态生成表单项 -->
        <template v-for="item in schema" :key="item.fieldName">
          <AFormItem :label="item.label" :name="item.fieldName">
            <component
              :is="item.component === 'Input' ? AInput : ASelect"
              v-bind="item.componentProps"
              v-model:value="formState[item.fieldName]"
            />
          </AFormItem>
        </template>

        <!-- 描述输入区域 -->
        <AFormItem class="col-span-2" label="描述：" name="description">
          <AInput.TextArea
            v-model:value="formState.description"
            :maxlength="100"
            :show-count="true"
            placeholder="请输入算法描述"
            :style="{ height: '100px' }"
          />
        </AFormItem>
      </AForm>

      <!-- 高级设置折叠面板 -->
      <ACollapse
        v-model:active-key="activeKeys"
        class="advanced-collapse"
        :bordered="false"
      >
        <ACollapsePanel key="advanced-settings" :show-arrow="true">
          <template #header>
            <div class="collapse-header">
              高级设置
              <div class="header-line"></div>
            </div>
          </template>

          <!-- CAS 模式：显示云算法信息 -->
          <div v-if="isCAS" class="cas-section">
            <Alert
              message="云算法仓库 (CAS) 模式"
              description="当前算法来自云算法仓库，如需修改算法文件请在 SMP 云算法仓库中操作。"
              type="info"
              show-icon
              class="mb-4"
            >
              <template #icon><CloudOutlined /></template>
            </Alert>

            <h3 class="section-title">
              <CloudOutlined class="mr-2" />
              云算法信息
            </h3>

            <Descriptions bordered :column="1" class="mb-4">
              <Descriptions.Item label="云算法ID">
                {{ cloudAlgorithmInfo?.id || formState.cloud_algorithm_id || '-' }}
              </Descriptions.Item>
              <Descriptions.Item label="算法名称">
                {{ cloudAlgorithmInfo?.name || formState.algorithm_name || '-' }}
              </Descriptions.Item>
              <Descriptions.Item label="版本">
                {{ cloudAlgorithmInfo?.version || formState.version || '-' }}
              </Descriptions.Item>
            </Descriptions>

            <Button type="primary" @click="selectCloudAlgorithm">
              <CloudOutlined />
              更换云算法
            </Button>
          </div>

          <!-- 非 CAS 模式：显示算法文件 -->
          <div v-else class="upload-section">
            <h3 class="section-title">
              <FileOutlined class="mr-2" />
              算法文件
            </h3>

            <!-- 当前文件列表 -->
            <div class="current-files mb-4">
              <div class="flex justify-between items-center mb-2">
                <span class="text-gray-600">当前文件列表：</span>
                <Button type="link" size="small" @click="goToFileManager">
                  查看完整目录
                </Button>
              </div>

              <Table
                :data-source="algorithmFiles"
                :columns="fileColumns"
                :loading="filesLoading"
                :pagination="false"
                size="small"
                row-key="id"
                :locale="{ emptyText: '暂无文件' }"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'name'">
                    <div class="flex items-center">
                      <FolderOutlined
                        v-if="record.isDirectory"
                        class="mr-2 text-blue-500"
                      />
                      <FileOutlined v-else class="mr-2 text-gray-500" />
                      <span>{{ record.name }}</span>
                    </div>
                  </template>
                </template>
              </Table>
            </div>

            <!-- 上传新文件 -->
            <div class="upload-area">
              <h4 class="text-sm font-medium mb-2">上传新文件（覆盖模式）：</h4>
              <Alert
                message="上传同名文件将会覆盖原有文件"
                type="warning"
                show-icon
                class="mb-3"
              >
                <template #icon><AlertOutlined /></template>
              </Alert>

              <AUpload
                class="w-full"
                :file-list="fileList"
                @change="handleFileChange"
                accept=".py,.zip,.tar"
                :before-upload="() => false"
                type="drag"
                :multiple="false"
                :show-upload-list="{
                  showPreviewIcon: true,
                  showRemoveIcon: true,
                  showDownloadIcon: false,
                }"
              >
                <div class="drag-content">
                  <div class="upload-tip">
                    <span class="tip-icon">📁</span>
                    <p class="tip-text">点击或拖拽文件到此区域上传</p>
                    <p class="support-types">支持格式：PY、ZIP、TAR</p>
                    <p class="size-limit">单个文件不超过100GB</p>
                  </div>
                </div>
              </AUpload>

              <div class="mt-4 flex gap-2">
                <Button
                  type="primary"
                  @click="startUpload"
                  :disabled="!selectedFile"
                >
                  上传文件
                </Button>
                <Button @click="goToFileManager">
                  打开文件管理器
                </Button>
              </div>
            </div>
          </div>
        </ACollapsePanel>
      </ACollapse>

      <!-- 操作按钮区域 - 与数据集页面保持一致 -->
      <div class="mt-6 text-center">
        <Button type="primary" @click="handleSubmit" class="mr-2">
          保存修改
        </Button>
        <Button @click="handleCancel"> 取消 </Button>
      </div>
    </Card>

    <!-- 文件上传弹窗 -->
    <Modal
      v-model:visible="uploadModalVisible"
      title="文件上传"
      width="600px"
      :footer="null"
    >
      <div class="upload-progress-container">
        <div class="file-info">
          <div class="file-icon">📁</div>
          <div>
            <div class="file-name">{{ selectedFile?.name || '未知文件' }}</div>
            <div class="file-size">
              {{
                selectedFile?.size
                  ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                  : ''
              }}
            </div>
          </div>
        </div>

        <div class="progress-container">
          <div class="progress-header">
            <span>上传进度</span>
            <span>{{ uploadProgress }}%</span>
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: `${uploadProgress}%` }"
            ></div>
          </div>
          <div class="progress-status">
            <span v-if="uploadStatus === 'uploading'"
              >正在上传，请勿关闭页面...</span
            >
            <span v-else-if="uploadStatus === 'success'" class="success-text"
              >上传成功!</span
            >
            <span v-else-if="uploadStatus === 'error'" class="error-text"
              >上传失败</span
            >
          </div>
        </div>

        <div class="action-buttons">
          <Button
            v-if="uploadStatus === 'uploading'"
            type="default"
            @click="cancelUpload"
          >
            取消上传
          </Button>
          <Button
            v-else-if="uploadStatus === 'success'"
            type="primary"
            @click="uploadModalVisible = false"
          >
            完成
          </Button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.form-card {
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 24px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.col-span-2 {
  grid-column: span 2;
}

.advanced-collapse {
  margin-top: 30px;
}

.collapse-header {
  position: relative;
  font-size: 16px;
  font-weight: 600;
  color: var(--ant-color-primary);
  padding-bottom: 8px;
}

.header-line {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 1px;
  background-color: var(--ant-color-border);
}

.upload-section,
.cas-section {
  padding: 20px;
  border-radius: 6px;
  margin-top: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
}

.section-note {
  color: hsl(var(--muted-foreground));
  margin-bottom: 16px;
}

.current-files {
  background: var(--ant-color-bg-container);
  border: 1px solid var(--ant-color-border);
  border-radius: 6px;
  padding: 16px;
}

.upload-area {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--ant-color-border);
}

:deep(.ant-upload.ant-upload-drag) {
  height: 180px;
  border: 2px dashed var(--ant-color-border);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

:deep(.ant-upload.ant-upload-drag:hover) {
  border-color: var(--ant-color-primary);
}

.drag-content {
  text-align: center;
}

.tip-icon {
  font-size: 40px;
  margin-bottom: 12px;
  display: block;
  color: var(--ant-color-primary);
}

.tip-text {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
}

.support-types,
.size-limit {
  color: hsl(var(--muted-foreground));
  font-size: 14px;
  margin-bottom: 4px;
}

.upload-progress-container {
  padding: 20px;
}

.file-info {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
}

.file-icon {
  font-size: 36px;
  margin-right: 16px;
}

.file-name {
  font-size: 16px;
  font-weight: 500;
}

.file-size {
  color: hsl(var(--muted-foreground));
  font-size: 14px;
}

.progress-container {
  margin-bottom: 24px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.progress-bar {
  height: 10px;
  border-radius: 5px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--ant-color-primary);
  border-radius: 5px;
  transition: width 0.3s;
}

.progress-status {
  margin-top: 8px;
  font-size: 14px;
  text-align: center;
}

.success-text {
  color: var(--ant-color-success);
  font-weight: 500;
}

.error-text {
  color: var(--ant-color-error);
  font-weight: 500;
}

/* 操作按钮区域样式 */
.action-buttons {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 40px;
  padding-top: 30px;
  border-top: 1px solid hsl(var(--border));
}

.save-button,
.cancel-button {
  min-width: 160px;
  height: 48px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.save-button {
  background: var(--ant-color-success);
  color: white;
  border: none;
}

.cancel-button {
  background: var(--ant-color-error);
  color: white;
  border: none;
}

.save-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(82, 196, 26, 0.4);
}

.cancel-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(255, 77, 79, 0.4);
}

.save-button:active,
.cancel-button:active {
  transform: translateY(1px);
}

.button-icon {
  margin-right: 8px;
  font-size: 18px;
}

:deep(.disabled-input .ant-input),
:deep(.disabled-input .ant-select-selector) {
  cursor: not-allowed;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
    gap: 12px;
  }

  .save-button,
  .cancel-button {
    width: 100%;
  }
}
</style>
