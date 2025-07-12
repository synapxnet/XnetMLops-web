<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Collapse,
  Form,
  Input,
  message,
  Modal,
  Select,
  Upload,
} from 'ant-design-vue';

// 引入API函数
import { fetchAlgorithmDetail, updateAlgorithm } from '../../SMP/api/algorithm';
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

const startUpload = () => {
  if (!selectedFile.value) {
    message.warning('请先选择文件');
    return;
  }

  uploadModalVisible.value = true;
  uploadStatus.value = 'uploading';

  // 模拟上传进度
  const interval = setInterval(() => {
    uploadProgress.value += 5;
    if (uploadProgress.value >= 100) {
      clearInterval(interval);
      uploadStatus.value = 'success';
    }
  }, 200);
};

const cancelUpload = () => {
  uploadModalVisible.value = false;
  uploadStatus.value = 'idle';
  uploadProgress.value = 0;
  message.info('上传已取消');
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

          <div class="upload-section">
            <h3 class="section-title">算法文件</h3>
            <p class="section-note">
              当前文件: {{ formState.algorithm_file || '未上传' }}
            </p>

            <AUpload
              class="w-full"
              :file-list="fileList"
              @change="handleFileChange"
              accept=".py,.zip,.tar"
              before-upload:false
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
                  <p class="tip-text">点击或拖拽文件到此区域上传新版本</p>
                  <p class="support-types">支持格式：PY、ZIP、TAR</p>
                  <p class="size-limit">单个文件不超过100GB</p>
                </div>
              </div>
            </AUpload>

            <Button
              type="primary"
              class="mt-4"
              @click="startUpload"
              :disabled="!selectedFile"
            >
              上传新版本
            </Button>
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
  color: #1890ff;
  padding-bottom: 8px;
}

.header-line {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 1px;
  background-color: #e8e8e8;
}

.upload-section {
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 6px;
  margin-top: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}

.section-note {
  color: #666;
  margin-bottom: 16px;
}

:deep(.ant-upload.ant-upload-drag) {
  height: 180px;
  border: 2px dashed #d9d9d9;
  background-color: #fff;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

:deep(.ant-upload.ant-upload-drag:hover) {
  border-color: #1890ff;
}

.drag-content {
  text-align: center;
}

.tip-icon {
  font-size: 40px;
  margin-bottom: 12px;
  display: block;
  color: #1890ff;
}

.tip-text {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
}

.support-types,
.size-limit {
  color: #666;
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
  color: #666;
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
  background-color: #f5f5f5;
  border-radius: 5px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #1890ff;
  border-radius: 5px;
  transition: width 0.3s;
}

.progress-status {
  margin-top: 8px;
  font-size: 14px;
  text-align: center;
}

.success-text {
  color: #52c41a;
  font-weight: 500;
}

.error-text {
  color: #f5222d;
  font-weight: 500;
}

/* 操作按钮区域样式 */
.action-buttons {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 40px;
  padding-top: 30px;
  border-top: 1px solid #eee;
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
  background: linear-gradient(135deg, #52c41a, #389e0d);
  color: white;
  border: none;
}

.cancel-button {
  background: linear-gradient(135deg, #ff4d4f, #cf1322);
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
  background-color: #f5f5f5;
  color: rgba(0, 0, 0, 0.65);
  cursor: not-allowed;
  border-color: #d9d9d9;
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
