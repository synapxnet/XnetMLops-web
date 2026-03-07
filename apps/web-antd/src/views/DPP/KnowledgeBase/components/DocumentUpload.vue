<template>
  <Modal
    v-model:open="visible"
    title="上传文档"
    :width="600"
    @ok="handleUpload"
    :confirm-loading="uploading"
    @cancel="handleCancel"
  >
    <div class="upload-section">
      <Dragger
        v-model:file-list="fileList"
        :multiple="true"
        :before-upload="beforeUpload"
        :accept="acceptTypes"
        @remove="handleRemove"
      >
        <p class="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p class="ant-upload-text">点击或拖拽文件到此区域上传</p>
        <p class="ant-upload-hint">
          支持 PDF、Word、TXT、Markdown、Excel 等格式，单个文件最大 50MB
        </p>
      </Dragger>

      <div v-if="fileList.length > 0" class="file-list">
        <div class="file-list__header">
          <span>待上传文件 ({{ fileList.length }})</span>
          <Button type="link" size="small" @click="handleClearAll">清空</Button>
        </div>
        <div
          v-for="file in fileList"
          :key="file.uid"
          class="file-item"
        >
          <div class="file-item__info">
            <FileTextOutlined class="file-item__icon" />
            <span class="file-item__name">{{ file.name }}</span>
            <span class="file-item__size">{{ formatSize(file.size || 0) }}</span>
          </div>
          <DeleteOutlined class="file-item__delete" @click="handleRemoveFile(file)" />
        </div>
      </div>

      <Divider />

      <div class="advanced-options">
        <div class="advanced-options__header" @click="showAdvanced = !showAdvanced">
          <span>高级选项</span>
          <DownOutlined :class="{ 'rotated': showAdvanced }" />
        </div>
        <div v-if="showAdvanced" class="advanced-options__content">
          <Row :gutter="16">
            <Col :span="12">
              <FormItem label="自定义分块大小">
                <InputNumber
                  v-model:value="customChunkSize"
                  :min="100"
                  :max="2000"
                  placeholder="使用知识库默认值"
                  style="width: 100%"
                />
                <div class="form-help">留空则使用知识库默认配置</div>
              </FormItem>
            </Col>
            <Col :span="12">
              <FormItem label="自定义重叠大小">
                <InputNumber
                  v-model:value="customChunkOverlap"
                  :min="0"
                  :max="500"
                  placeholder="使用知识库默认值"
                  style="width: 100%"
                />
                <div class="form-help">留空则使用知识库默认配置</div>
              </FormItem>
            </Col>
          </Row>
        </div>
      </div>
    </div>

    <div v-if="uploadProgress > 0 && uploading" class="upload-progress">
      <Progress :percent="uploadProgress" status="active" />
      <div class="upload-progress__text">正在上传: {{ currentUploadFile }}</div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  Modal,
  Upload,
  Button,
  Divider,
  Row,
  Col,
  InputNumber,
  Progress,
  message,
} from 'ant-design-vue';
import type { FormInstance } from 'ant-design-vue';
import {
  InboxOutlined,
  FileTextOutlined,
  DeleteOutlined,
  DownOutlined,
} from '@ant-design/icons-vue';
import type { UploadFile, UploadProps } from 'ant-design-vue';

import { uploadDocument } from '../api';

const { Dragger } = Upload;
const FormItem = { name: 'FormItem', template: '<div class="form-item"><label>{{label}}</label><slot /></div>' };

const props = defineProps<{
  open: boolean;
  kbId: number;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'success'): void;
}>();

const visible = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
});

const fileList = ref<UploadFile[]>([]);
const uploading = ref(false);
const uploadProgress = ref(0);
const currentUploadFile = ref('');
const showAdvanced = ref(false);
const customChunkSize = ref<number | undefined>(undefined);
const customChunkOverlap = ref<number | undefined>(undefined);

const acceptTypes = '.pdf,.doc,.docx,.txt,.md,.markdown,.xls,.xlsx,.csv,.json,.html,.htm';

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const beforeUpload: UploadProps['beforeUpload'] = (file) => {
  const isLt50M = file.size / 1024 / 1024 < 50;
  if (!isLt50M) {
    message.error('文件大小不能超过 50MB');
    return Upload.LIST_IGNORE;
  }
  return false; // 阻止自动上传
};

function handleRemove(file: UploadFile) {
  const index = fileList.value.indexOf(file);
  if (index > -1) {
    fileList.value.splice(index, 1);
  }
}

function handleRemoveFile(file: UploadFile) {
  handleRemove(file);
}

function handleClearAll() {
  fileList.value = [];
}

async function handleUpload() {
  if (fileList.value.length === 0) {
    message.warning('请选择要上传的文件');
    return;
  }

  uploading.value = true;
  uploadProgress.value = 0;

  const total = fileList.value.length;
  let completed = 0;
  const failedFiles: string[] = [];

  for (const file of fileList.value) {
    if (file.originFileObj) {
      currentUploadFile.value = file.name;
      try {
        await uploadDocument(props.kbId, file.originFileObj, {
          customChunkSize: customChunkSize.value,
          customChunkOverlap: customChunkOverlap.value,
        });
        completed++;
        uploadProgress.value = Math.round((completed / total) * 100);
      } catch (error) {
        failedFiles.push(file.name);
        completed++;
        uploadProgress.value = Math.round((completed / total) * 100);
      }
    }
  }

  uploading.value = false;

  if (failedFiles.length === 0) {
    message.success(`成功上传 ${total} 个文件`);
    handleCancel();
    emit('success');
  } else if (failedFiles.length < total) {
    message.warning(`${total - failedFiles.length} 个文件上传成功，${failedFiles.length} 个失败`);
    emit('success');
  } else {
    message.error('所有文件上传失败');
  }
}

function handleCancel() {
  fileList.value = [];
  uploadProgress.value = 0;
  currentUploadFile.value = '';
  showAdvanced.value = false;
  customChunkSize.value = undefined;
  customChunkOverlap.value = undefined;
  visible.value = false;
}
</script>

<style lang="scss" scoped>
.upload-section {
  padding: 16px 0;
}

.file-list {
  margin-top: 16px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 12px;
  max-height: 200px;
  overflow-y: auto;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-weight: 500;
    color: #1f2937;
  }
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 4px;
  margin-bottom: 4px;

  &:last-child {
    margin-bottom: 0;
  }

  &__info {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    overflow: hidden;
  }

  &__icon {
    color: #1890ff;
    font-size: 16px;
  }

  &__name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__size {
    color: #9ca3af;
    font-size: 12px;
    margin-left: 8px;
  }

  &__delete {
    color: #ff4d4f;
    cursor: pointer;
    padding: 4px;

    &:hover {
      color: #cf1322;
    }
  }
}

.advanced-options {
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    padding: 8px 0;
    color: #1890ff;

    .anticon {
      transition: transform 0.3s;

      &.rotated {
        transform: rotate(180deg);
      }
    }
  }

  &__content {
    padding-top: 16px;
  }
}

.form-help {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
}

.upload-progress {
  margin-top: 16px;
  padding: 12px;
  background: #f6ffed;
  border-radius: 8px;

  &__text {
    margin-top: 8px;
    font-size: 12px;
    color: #52c41a;
  }
}

.form-item {
  margin-bottom: 16px;

  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #374151;
  }
}
</style>
