<script lang="ts" setup>
import type { Ref } from 'vue';

import type { DeptTreeDataItem } from '../../SMP/api/types';

import { computed, inject, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Cascader,
  Collapse,
  Form,
  Input,
  message,
  Modal,
  Radio,
  Select,
  Table,
  Tag,
  Upload,
} from 'ant-design-vue';

import { dppRequestClient } from '#/api/request';

import { getbucketConfig } from '../../SMP/api/bucketConfig';
import { createDataset } from '../../SMP/api/dataset';
import { fetchConfig } from '../../SMP/api/datasetConfig';

// 组件注册
const AForm = Form;
const AFormItem = Form.Item;
const AInput = Input;
const ASelect = Select;
const AButton = Button;
const ACard = Card;
const AUpload = Upload;
const ACollapse = Collapse;
const ACollapsePanel = Collapse.Panel;
const ACascader = Cascader;
const AModal = Modal;
const ATable = Table;
const ARadioGroup = Radio.Group;
const ARadio = Radio;

const router = useRouter();
const formRef = ref<InstanceType<typeof AForm>>();
const activeKeys = ref(['advanced-settings']);
const formState = ref<Record<string, any>>({});
const isSubmitting = ref(false);
const isSubmitted = ref(false);
const currentUserInfo = inject<Ref<any>>('currentUserInfo', ref(null));
const configData = ref({
  datasetTypes: [] as { label: string; value: string }[],
  datasetZones: [] as { label: string; value: string }[],
});

// 组织树数据
const organizationTree = inject<Ref<DeptTreeDataItem[]>>(
  'organizationTree',
  ref([]),
);

const selectedOrg = inject<
  Ref<{
    deptUid: null | string;
    level: number;
    teamUid: null | string;
    tenantUid: null | string;
  }>
>(
  'selectedOrganization',
  ref({
    level: 0,
    tenantUid: null,
    deptUid: null,
    teamUid: null,
  }),
);

// 添加加载状态
const isOrganizationTreeLoading = ref(true);

// 监听组织树变化
watch(
  organizationTree,
  (newTree) => {
    if (newTree && newTree.length > 0) {
      isOrganizationTreeLoading.value = false;
    }
  },
  { immediate: true, deep: true },
);

// 存储桶数据
const buckets = ref(
  [] as {
    authorized_tenants: string[];
    current_size: null | number;
    dept_uid: null | string;
    id: number;
    identifier: string;
    max_size: null | number;
    name: string;
    team_uid: null | string;
    tenant_uid: null | string;
    type: 'public' | 'tenant';
    uid: string;
    usage: string;
    usagePercent: number;
    usageStatus: { color: string; text: string };
  }[],
);

// 存储桶加载状态
const isLoadingBuckets = ref(false);

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
  }
};

// 计算使用率状态
const getUsageStatus = (current: null | number, max: null | number) => {
  const cur = current || 0;
  const mx = max || 0;

  if (mx === 0) {
    return { text: '未设置容量', color: 'gray' };
  }

  const percentage = (cur / mx) * 100;
  if (percentage > 90) return { text: '空间不足', color: 'red' };
  if (percentage > 70) return { text: '空间紧张', color: 'orange' };
  return { text: '空间充足', color: 'green' };
};

// 加载存储桶
const loadBuckets = async () => {
  isLoadingBuckets.value = true;
  try {
    const response = await getbucketConfig();
    buckets.value = response.map((bucket) => {
      const usagePercent =
        bucket.max_size > 0
          ? Math.round((bucket.current_size / bucket.max_size) * 100)
          : 0;

      return {
        id: bucket.id,
        uid: bucket.uid,
        name: bucket.name,
        identifier: bucket.identifier,
        type: bucket.type,
        tenant_uid: bucket.tenant_uid,
        dept_uid: bucket.dept_uid,
        team_uid: bucket.team_uid,
        current_size: bucket.current_size || 0,
        max_size: bucket.max_size || 100,
        authorized_tenants: bucket.authorized_tenants || [],
        usage: `${bucket.current_size || 0} / ${bucket.max_size || 100} GB`,
        usagePercent,
        usageStatus: getUsageStatus(bucket.current_size, bucket.max_size),
      };
    });
  } catch (error) {
    console.error('获取存储桶失败:', error);
    message.error('获取存储桶列表失败');
    buckets.value = [];
  } finally {
    isLoadingBuckets.value = false;
  }
};

onMounted(() => {
  loadConfig();
  loadBuckets();
  resetFormState();
});

// 重置表单状态
const resetFormState = () => {
  isSubmitted.value = false;
  formState.value = {};
  selectedOrg.value = {
    level: 0,
    tenantUid: null,
    deptUid: null,
    teamUid: null,
  };
  selectedBucket.value = null;
  radioValue.value = null;
  bucketSearchValue.value = '';
  uploadProgress.value = 0;
  uploadStatus.value = 'idle';
};

// 计算是否禁用组织选择器
const isOrgSelectorDisabled = computed(() => {
  return isSubmitted.value;
});

// 计算级联选择器的值
const cascaderValue = computed(() => {
  const org = selectedOrg.value;
  if (!org) return [];

  const path = [];

  if (org.tenantUid) path.push(org.tenantUid);
  if (org.deptUid) path.push(org.deptUid);
  if (org.teamUid) path.push(org.teamUid);

  return path;
});

// 级联选择器变化处理
const handleCascaderChange = (value: string[]) => {
  if (isSubmitted.value) return;

  if (value.length > 0) {
    selectedOrg.value.tenantUid = value[0];
    selectedOrg.value.level = 1;
  }
  if (value.length >= 2) {
    selectedOrg.value.deptUid = value[1];
    selectedOrg.value.level = 2;
  }
  if (value.length >= 3) {
    selectedOrg.value.teamUid = value[2];
    selectedOrg.value.level = 3;
  }

  if (value.length < 3) selectedOrg.value.teamUid = null;
  if (value.length < 2) selectedOrg.value.deptUid = null;
  if (value.length === 0) selectedOrg.value.tenantUid = null;

  formState.value.team = value.length > 0 ? value[value.length - 1] : null;
};

// 自定义级联选择器显示函数
const displayRender = ({ labels }: { labels: string[] }) => {
  return labels.join(' / ');
};

// 通用验证规则生成器
const requiredRule = (message: string) => ({ required: true, message });

// 存储桶选择弹窗相关状态
const bucketModalVisible = ref(false);
const bucketSearchValue = ref('');
const selectedBucket = ref<null | {
  id: string;
  identifier: string;
  name: string;
}>(null);
const radioValue = ref<null | string>(null);

// 过滤后的存储桶列表
const filteredBuckets = computed(() => {
  if (!selectedOrg.value.tenantUid) {
    return [];
  }

  let result = buckets.value;
  if (bucketSearchValue.value) {
    const search = bucketSearchValue.value.toLowerCase();
    result = result.filter(
      (bucket) =>
        bucket.name.toLowerCase().includes(search) ||
        bucket.identifier.toLowerCase().includes(search),
    );
  }

  const tenantUid = selectedOrg.value.tenantUid;
  return result.filter((bucket) => {
    if (bucket.type === 'tenant') {
      return bucket.tenant_uid === tenantUid;
    }
    if (bucket.type === 'public') {
      return (
        bucket.authorized_tenants &&
        bucket.authorized_tenants.includes(tenantUid)
      );
    }
    return false;
  });
});

// 打开存储桶选择弹窗
const openBucketModal = () => {
  if (!selectedOrg.value.tenantUid) {
    message.warning('请先选择团队');
    return;
  }

  bucketModalVisible.value = true;
  bucketSearchValue.value = '';
  radioValue.value = selectedBucket.value?.id || null;
};

// 选择存储桶
const selectBucket = () => {
  if (!radioValue.value) {
    message.warning('请先选择一个存储桶');
    return;
  }

  const bucket = buckets.value.find((b) => b.id === radioValue.value);
  if (bucket) {
    selectedBucket.value = {
      id: bucket.id,
      name: bucket.name,
      identifier: bucket.identifier,
    };
    formState.value.bucket = bucket.name;
    bucketModalVisible.value = false;
  }
};

// 查找团队名称
const findTeamName = () => {
  if (!selectedOrg.value.teamUid) return '';

  const findInTree = (nodes: DeptTreeDataItem[]): string => {
    for (const node of nodes) {
      if (node.value === selectedOrg.value.teamUid) {
        return node.label;
      }
      if (node.children && node.children.length > 0) {
        const found = findInTree(node.children);
        if (found) return found;
      }
    }
    return '';
  };

  return findInTree(organizationTree.value);
};

// 格式化文件大小
const formatFileSize = (bytes: number | undefined) => {
  if (bytes === undefined || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`;
};

// 表单配置
const schema = computed(() => [
  {
    component: 'Input',
    componentProps: {
      placeholder:
        '请输入数据集名称（字母开头，仅允许字母、数字、下划线、中划线）',
      class: 'w-full',
    },
    fieldName: 'datasetFile',
    label: '数据集名称：',
    rules: [
      requiredRule('请输入数据集名称'),
      {
        validator: (_, value) => {
          if (!value) return Promise.resolve();

          if (/^\d/.test(value)) {
            return Promise.reject('数据集名称不能以数字开头');
          }

          if (!/^[\w-]+$/.test(value)) {
            return Promise.reject(
              '数据集名称只能包含字母、数字、下划线、中划线',
            );
          }

          return Promise.resolve();
        },
      },
    ],
  },
  {
    component: 'Select',
    componentProps: {
      allowClear: true,
      showSearch: true,
      options: configData.value.datasetTypes,
      placeholder: '请选择',
      filterOption: (input: string, option: any) =>
        option.label.toLowerCase().includes(input.toLowerCase()),
    },
    fieldName: 'datasetType',
    label: '数据类型：',
    rules: [requiredRule('请选择数据类型')],
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
    fieldName: 'datasetZone',
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
    fieldName: 'subDataArea',
    label: '子数据域',
    rules: [requiredRule('请选择子数据域选项')],
  },
  {
    component: 'Cascader',
    componentProps: {
      allowClear: !isOrgSelectorDisabled.value,
      showSearch: true,
      placeholder: '请选择租户/部门/团队',
      options: organizationTree.value,
      expandTrigger: 'hover',
      displayRender,
      changeOnSelect: true,
      class: 'w-full',
      disabled: isOrgSelectorDisabled.value,
      filterOption: (inputValue: string, path: any[]) => {
        return path.some((option) =>
          option.label.toLowerCase().includes(inputValue.toLowerCase()),
        );
      },
      value: cascaderValue.value,
      'onUpdate:value': handleCascaderChange,
    },
    fieldName: 'team',
    label: '所属组织：',
    rules:
      selectedOrg?.value?.level === 0
        ? []
        : [
            {
              required: true,
              message: '请选择团队',
              validator: (rule, value) => {
                if (value && selectedOrg.value.teamUid) {
                  return Promise.resolve();
                }
                return Promise.reject('请选择到团队级别');
              },
            },
          ],
  },
  {
    component: 'Input',
    componentProps: {
      placeholder: '请选择存储桶',
      class: 'w-full',
      readonly: true,
      onClick: openBucketModal,
    },
    fieldName: 'bucket',
    label: '存储桶',
    rules: [requiredRule('请选择存储桶')],
  },
]);

// 表单提交处理
const handleSubmit = async () => {
  try {
    await formRef.value?.validate();
    isSubmitted.value = true;
    await onSubmit(formState.value);
  } catch (error) {
    console.error('表单验证失败:', error);
    if (error?.response?.data?.error?.includes('countByDatasetFile')) {
      formRef.value?.setFields([
        {
          name: 'datasetFile',
          errors: ['数据集名称已存在，请使用其他名称'],
        },
      ]);
    } else {
      message.error('请正确填写所有必填字段');
    }
  }
};

const handleCancel = () => {
  router.go(-1);
};

// 文件上传相关状态
const fileList = ref<any[]>([]);
const uploadLoading = ref(false);
const uploadProgress = ref(0);
const currentDatasetId = ref<null | number>(null);
const uploadStatus = ref<'error' | 'idle' | 'success' | 'uploading'>('idle');
const selectedFile = ref<File | null>(null);
const uploadModalVisible = ref(false);
const uploadXHR = ref<null | XMLHttpRequest>(null); // 用于取消上传

// 分片上传相关状态
const chunkSize = ref(100 * 1024 * 1024); // 100MB 分片大小
const uploadId = ref<null | string>(null);
const totalChunks = ref(0);
const uploadedChunks = ref(0);
const chunkProgress = ref<number[]>([]);
const isChunkedUpload = ref(false);

// 处理文件上传 - 修改为支持分片
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

  // 判断是否需要分片上传 (大于500MB)
  isChunkedUpload.value = rawFile.size > 500 * 1024 * 1024;
};

// 文件上传前验证
const beforeUpload = (file: File) => {
  const isLt100G = file.size / 1024 / 1024 / 1024 < 100;
  if (!isLt100G) {
    message.error('文件大小不能超过100GB');
    return false;
  }

  // 检查文件类型
  const validTypes = ['csv', 'txt', 'json', 'zip'];
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (!extension || !validTypes.includes(extension)) {
    message.error('只支持CSV、TXT、JSON和ZIP格式的文件');
    return false;
  }

  return true;
};

// 取消上传 - 添加分片上传支持
const cancelUpload = () => {
  if (uploadXHR.value) {
    uploadXHR.value.abort();
  }

  if (uploadId.value) {
    // 取消分片上传
    dppRequestClient.post('/dpp/cancel-chunked-upload', {
      uploadId: uploadId.value,
    });
  }

  message.info('上传已取消');
  uploadModalVisible.value = false;
  uploadStatus.value = 'idle';
  uploadProgress.value = 0;
  uploadId.value = null;
};

// 重新上传
const retryUpload = () => {
  uploadStatus.value = 'idle';
  uploadProgress.value = 0;
  if (selectedFile.value) {
    handleFileChange({
      file: {
        status: 'done',
        originFileObj: selectedFile.value,
      },
    });
  }
};

// 分片上传函数
const uploadFileInChunks = async (file: File) => {
  try {
    uploadModalVisible.value = true;
    uploadStatus.value = 'uploading';

    // 1. 初始化上传
    const initResponse = await dppRequestClient.post(
      '/dpp/init-chunked-upload',
      {
        fileName: file.name,
        fileSize: file.size,
        chunkSize: chunkSize.value,
      },
    );

    // 响应拦截器已经提取了 data 字段，initResponse 直接就是 data 的内容
    uploadId.value = initResponse.uploadId;
    totalChunks.value = initResponse.totalChunks;
    uploadedChunks.value = 0;
    chunkProgress.value = new Array(totalChunks.value).fill(0);

    // 2. 上传所有分片
    for (let i = 0; i < totalChunks.value; i++) {
      const start = i * chunkSize.value;
      const end = Math.min(start + chunkSize.value, file.size);
      const chunk = file.slice(start, end);

      const formData = new FormData();
      formData.append('uploadId', uploadId.value);
      formData.append('chunkIndex', i.toString());
      formData.append('chunk', new Blob([chunk]), `chunk_${i}`);
      formData.append('totalChunks', totalChunks.value.toString());

      await dppRequestClient.post('/dpp/upload-chunk', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      uploadedChunks.value++;
      chunkProgress.value[i] = 100;

      // 更新整体进度
      uploadProgress.value = Math.round(
        (uploadedChunks.value / totalChunks.value) * 100,
      );
    }

    // 3. 完成上传
    const completeResponse = await dppRequestClient.post(
      '/dpp/complete-chunked-upload',
      {
        uploadId: uploadId.value,
        fileName: file.name,
      },
    );

    uploadStatus.value = 'success';
    // 响应拦截器已经提取了 data 字段，返回 filePath
    return completeResponse?.filePath || completeResponse;
  } catch (error) {
    console.error('分片上传失败:', error);
    uploadStatus.value = 'error';
    throw new Error('文件上传失败');
  }
};

// 提交数据集
const onSubmit = async (values: Record<string, any>) => {
  isSubmitting.value = true;
  let tempFilePath: null | string = null;

  try {
    if (selectedFile.value) {
      if (isChunkedUpload.value) {
        // 使用分片上传
        tempFilePath = await uploadFileInChunks(selectedFile.value);
      } else {
        // 原有单文件上传
        uploadModalVisible.value = true;
        uploadStatus.value = 'uploading';

        const formData = new FormData();
        formData.append('file', selectedFile.value);

        const response = await dppRequestClient.post('/dpp/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        // 响应拦截器已经提取了 data 字段，response 直接就是 { filePath: "..." }
        tempFilePath = response?.filePath || response;
        uploadStatus.value = 'success';
      }
    }

    const payload = {
      id: '',
      uid: '',
      dataset_file: values.datasetFile,
      type: values.datasetType,
      type_label:
        configData.value.datasetTypes.find(
          (t) => t.value === values.datasetType,
        )?.label || '',
      zone: values.datasetZone,
      zone_label:
        configData.value.datasetZones.find(
          (z) => z.value === values.datasetZone,
        )?.label || '',
      encryption: values.encryption === '1',
      subdata_area: values.subDataArea,
      bucket_name: selectedBucket.value.name,
      bucket_identifier: selectedBucket.value.identifier,
      team_uid: selectedOrg.value.teamUid!,
      team_name: findTeamName(),
      description: values.describe,
      tenant_uid: selectedOrg.value.tenantUid!,
      dept_uid: selectedOrg.value.deptUid || null,
      level: selectedOrg.value.level,
      userId: currentUserInfo?.value?.userId || '',
      tempFilePath,
    };
    console.log('提交的数据集信息:', tempFilePath);
    // 创建数据集
    const dataset = await createDataset(payload);

    // 成功处理
    message.success(`数据集创建成功${tempFilePath ? '，文件已处理' : ''}`);

    // 重置表单状态
    resetFormState();
    formRef.value?.resetFields();
    fileList.value = [];
    selectedFile.value = null;

    // 关键修复：使用 replace 防止返回创建页
    await router.replace({
      path: '/DPP/dataset/index',
      query: {
        expanded: 'true',
        newDatasetId: dataset.id,
        teamInfo: dataset.team_name,
      },
    });
  } catch (error) {
    console.error('创建数据集失败:', error);
    isSubmitted.value = false; // 确保提交状态重置
    message.error('数据集创建失败');
  } finally {
    isSubmitting.value = false;
    uploadModalVisible.value = false;
  }
};

// 跳转到配置管理页面
const goToConfig = () => {
  router.push('/DPP/dataset/config');
};

// 重置组织选择
const resetOrgSelection = () => {
  isSubmitted.value = false;
  selectedOrg.value = {
    level: 0,
    tenantUid: null,
    deptUid: null,
    teamUid: null,
  };
  formState.value.team = null;
  message.success('已重置组织选择');
};
</script>

<template>
  <Page title="新增数据集">
    <template #action>
      <div class="flex items-center gap-2">
        <AButton type="link" @click="goToConfig">
          <template #icon><SettingOutlined /></template>
          配置管理
        </AButton>
        <AButton
          v-if="isSubmitted"
          type="link"
          @click="resetOrgSelection"
          class="text-red-500"
        >
          <template #icon><ReloadOutlined /></template>
          重置组织选择
        </AButton>
      </div>
    </template>
  </Page>
  <div class="flex flex-col">
    <div class="p-1 shadow">
      <ACard class="mb-4">
        <AForm
          ref="formRef"
          :model="formState"
          layout="vertical"
          class="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <template v-for="item in schema" :key="item.fieldName">
            <AFormItem
              :label="item.label"
              :name="item.fieldName"
              :rules="item.rules"
            >
              <template
                v-if="item.fieldName === 'team' && isOrganizationTreeLoading"
              >
                <div class="loading-indicator">
                  <a-spin size="small" />
                  <span class="ml-2">加载组织数据中...</span>
                </div>
              </template>
              <component
                v-else
                :is="
                  item.component === 'Input'
                    ? AInput
                    : item.component === 'Select'
                      ? ASelect
                      : item.component === 'Cascader'
                        ? ACascader
                        : AInput
                "
                v-bind="item.componentProps"
                v-model:value="formState[item.fieldName]"
              />
              <div
                v-if="item.fieldName === 'team' && isSubmitted"
                class="mt-1 text-xs text-blue-500"
              >
                租户已锁定，提交后不可修改
              </div>
              <div
                v-if="item.fieldName === 'bucket' && selectedBucket"
                class="mt-1 text-sm text-gray-600"
              ></div>
            </AFormItem>
          </template>

          <AFormItem class="col-span-2" label="描述：" name="describe">
            <AInput.TextArea
              v-model:value="formState.describe"
              :maxlength="50"
              :show-count="true"
              placeholder="请输入数据集描述,不超过50个字符"
              :style="{ height: '100px' }"
            />
          </AFormItem>
        </AForm>

        <ACollapse
          v-model:active-key="activeKeys"
          class="advanced-collapse mt-4"
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
              <AUpload
                class="w-full"
                :file-list="fileList"
                @change="handleFileChange"
                accept=".csv,.txt,.json,.zip"
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
                    <p class="tip-text">点击或拖拽文件到此区域上传</p>
                    <p class="support-types">支持格式：CSV、TXT、JSON、ZIP</p>
                    <p class="size-limit">单个文件不超过100GB</p>
                  </div>
                </div>
              </AUpload>
            </div>
          </ACollapsePanel>
          <div class="divider"></div>
        </ACollapse>

        <div class="mt-6 text-center">
          <AButton
            type="primary"
            @click="handleSubmit"
            class="mr-2"
            :loading="isSubmitting"
            :disabled="isSubmitting"
          >
            提交
          </AButton>
          <AButton @click="handleCancel">取消</AButton>
        </div>
      </ACard>
    </div>
  </div>
  <AModal v-model:visible="uploadModalVisible" title="文件上传" width="600px">
    <!-- 头部信息 -->
    <div class="mb-4 flex items-center">
      <div class="mr-3 text-lg">
        <FileOutlined v-if="uploadStatus !== 'success'" />
        <CheckCircleOutlined v-else class="text-green-500" />
      </div>
      <div>
        <div class="font-medium">{{ selectedFile?.name || '未知文件' }}</div>
        <div class="text-sm text-gray-500">
          {{ formatFileSize(selectedFile?.size) }}
        </div>
      </div>
    </div>

    <!-- 分片上传详情 -->
    <div v-if="isChunkedUpload" class="mb-4">
      <div class="mb-2 flex justify-between">
        <span>整体进度</span>
        <span
          >{{ uploadProgress }}% ({{ uploadedChunks }}/{{
            totalChunks
          }}
          分片)</span
        >
      </div>
      <div class="h-3 rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          class="h-full rounded-full bg-blue-500 transition-all duration-300"
          :style="{ width: `${uploadProgress}%` }"
        ></div>
      </div>

      <div class="mt-4">
        <div class="mb-2 flex justify-between">
          <span>分片上传进度</span>
        </div>
        <div class="grid grid-cols-5 gap-2">
          <div
            v-for="(progress, index) in chunkProgress"
            :key="index"
            class="h-2 rounded-full bg-gray-200 dark:bg-gray-700"
          >
            <div
              class="h-full rounded-full bg-green-500"
              :style="{ width: `${progress}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 单文件上传进度 -->
    <div v-else-if="uploadStatus === 'uploading'" class="mb-4">
      <div class="mb-2 flex justify-between">
        <span>上传进度</span>
        <span>{{ uploadProgress }}%</span>
      </div>
      <div class="h-3 rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          class="h-full rounded-full bg-blue-500 transition-all duration-300"
          :style="{ width: `${uploadProgress}%` }"
        ></div>
      </div>
      <div class="mt-2 text-sm text-gray-500 dark:text-gray-400">正在上传，请勿关闭页面...</div>
    </div>

    <!-- 上传结果 -->
    <div v-else-if="uploadStatus === 'success'" class="mb-4 text-center">
      <div class="text-green-500">
        <CheckCircleOutlined class="mr-2 text-2xl" />
        <span class="text-lg">上传成功!</span>
      </div>
      <div class="mt-2 text-gray-500">文件已成功上传到数据集</div>
    </div>

    <div v-else-if="uploadStatus === 'error'" class="mb-4 text-center">
      <div class="text-red-500">
        <CloseCircleOutlined class="mr-2 text-2xl" />
        <span class="text-lg">上传失败</span>
      </div>
      <div class="mt-2 text-gray-500">文件上传失败，请重试</div>
    </div>

    <!-- 操作按钮 -->
    <div class="mt-6 flex justify-center">
      <AButton
        v-if="uploadStatus === 'uploading'"
        type="default"
        @click="cancelUpload"
      >
        取消上传
      </AButton>
      <AButton
        v-else-if="uploadStatus === 'error'"
        type="primary"
        @click="retryUpload"
      >
        重新上传
      </AButton>
      <AButton
        v-else-if="uploadStatus === 'success'"
        type="primary"
        @click="uploadModalVisible = false"
      >
        关闭
      </AButton>
    </div>
  </AModal>

  <AModal
    v-model:visible="bucketModalVisible"
    title="选择存储桶"
    width="800px"
    :footer="null"
    destroy-on-close
  >
    <div class="mb-4">
      <AInput
        v-model:value="bucketSearchValue"
        placeholder="搜索存储桶名称或标识符"
        allow-clear
        style="width: 300px"
      >
        <template #prefix>
          <SearchOutlined class="text-gray-400" />
        </template>
      </AInput>
    </div>

    <div v-if="selectedOrg.tenantUid" class="mb-4 text-sm text-blue-600">
      当前租户: {{ selectedOrg.tenantUid }}
    </div>

    <ARadioGroup v-model:value="radioValue" class="w-full">
      <ATable
        :data-source="filteredBuckets"
        :columns="[
          { title: '选择', key: 'selection', width: '60px' },
          { title: '存储桶名称', dataIndex: 'name', key: 'name' },
          { title: '标识符', dataIndex: 'identifier', key: 'identifier' },
          { title: '类型', key: 'type', width: '100px' },
          { title: '存储使用情况', key: 'usage', width: '300px' },
        ]"
        row-key="id"
        :pagination="{ pageSize: 5 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'selection'">
            <ARadio :value="record.id" />
          </template>

          <template v-else-if="column.key === 'type'">
            <Tag :color="record.type === 'public' ? 'blue' : 'green'">
              {{ record.type === 'public' ? '公共' : '租户' }}
            </Tag>
          </template>

          <template v-else-if="column.key === 'usage'">
            <div>
              <div class="flex justify-between text-sm">
                <span>{{ record.usage }}</span>
                <span>{{ record.usagePercent }}%</span>
              </div>
              <div class="mt-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  class="h-full rounded-full"
                  :style="{
                    width: `${record.usagePercent}%`,
                  }"
                  :class="{
                    'bg-red-500': record.usageStatus.color === 'red',
                    'bg-orange-500': record.usageStatus.color === 'orange',
                    'bg-green-500': record.usageStatus.color !== 'red' && record.usageStatus.color !== 'orange',
                  }"
                ></div>
              </div>
              <Tag :color="record.usageStatus.color" class="mt-1">
                {{ record.usageStatus.text }}
              </Tag>
            </div>
          </template>
        </template>

        <template #emptyText>
          <div v-if="isLoadingBuckets" class="py-8 text-center">
            <a-spin size="large" />
            <p class="mt-2">加载存储桶中...</p>
          </div>
          <div v-else-if="selectedOrg.tenantUid" class="py-8 text-center">
            <p class="text-gray-500">没有找到符合条件的存储桶</p>
            <p class="mt-2 text-sm text-gray-400">
              请确认当前租户有权限访问存储桶
            </p>
          </div>
          <div v-else class="py-8 text-center">
            <p class="text-gray-500">请先选择团队</p>
          </div>
        </template>
      </ATable>
    </ARadioGroup>

    <div class="mt-4 text-right">
      <AButton type="primary" @click="selectBucket">确认选择</AButton>
    </div>
  </AModal>
</template>

<style scoped>
.upload-progress-modal {
  padding: 20px;
}
.upload-section {
  @apply rounded-lg bg-gray-50 dark:bg-gray-800;
}

:deep(.ant-upload.ant-upload-drag) {
  @apply h-full border-2 border-dashed border-gray-200 bg-transparent p-8 hover:border-blue-500;
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.ant-upload.ant-upload-drag-hover) {
  @apply border-blue-500 bg-blue-50;
}

:deep(.ant-upload-text) {
  @apply hidden;
}

:deep(.advanced-collapse) {
  margin-top: 0px;
}

:deep(.ant-form-item) {
  margin-bottom: 0px;
}

.upload-section {
  margin-top: 10px;
}

:deep(.advanced-collapse) {
  background: transparent !important;
  border: 0 !important;
}

:deep(.advanced-collapse .ant-collapse-item) {
  border: 0 !important;
}

:deep(.advanced-collapse .ant-collapse-header) {
  padding: 12px 0 !important;
  border: 0 !important;
  cursor: pointer !important;
}

:deep(.advanced-collapse .ant-collapse-content) {
  border: 0 !important;
  background: transparent !important;
}

.header-line {
  @apply absolute bottom-0 left-0 h-px w-full bg-gray-200 dark:bg-gray-700;
}

.drag-content {
  @apply flex flex-col items-center justify-center text-center;
}

.upload-tip {
  @apply space-y-2;
}

.tip-icon {
  @apply mb-3 text-4xl;
}

.tip-text {
  @apply text-base font-medium text-gray-800;
}

.support-types {
  @apply text-sm text-gray-600;
}

.size-limit {
  @apply text-xs text-gray-400;
}

.loading-indicator {
  display: flex;
  align-items: center;
  padding: 8px 0;
  color: hsl(var(--muted-foreground));
  font-size: 14px;
}

:deep(.ant-cascader) {
  width: 100%;
}

:deep(.ant-cascader-disabled) {
  cursor: not-allowed;
}

:deep(.ant-input[readonly]) {
  cursor: pointer;
}

:deep(.ant-input[readonly]:hover) {
  border-color: var(--ant-color-primary);
}

:deep(.ant-progress) {
  margin-bottom: 0;
}

:deep(.ant-radio-group) {
  width: 100%;
}
</style>
