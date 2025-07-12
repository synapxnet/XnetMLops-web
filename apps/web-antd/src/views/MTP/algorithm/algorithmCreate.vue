<script lang="ts" setup>
import type { Ref } from 'vue';

import type { DeptTreeDataItem } from '../../SMP/api/types';

import { computed, inject, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

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
  TabPane,
  Tabs,
  Tag,
  Upload,
} from 'ant-design-vue';

import { mtpRequestClient } from '#/api/request';

import { createAlgorithm } from '../../SMP/api/algorithm';
import { getbucketConfig } from '../../SMP/api/bucketConfig';
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
const formState = ref<Record<string, any>>({
  is_CAS: 0, // 默认不使用云仓
});
const isSubmitting = ref(false);
const isSubmitted = ref(false);
const currentUserInfo = inject<Ref<any>>('currentUserInfo', ref(null));
const configData = ref({
  datasetZones: [] as { label: string; value: string }[],
  datasetTypes: [] as { label: string; value: string }[],
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
  formState.value = {
    is_CAS: 0, // 重置时默认为0
  };
  selectedOrg.value = {
    level: 0,
    tenantUid: null,
    deptUid: null,
    teamUid: null,
  };
  selectedBucket.value = null;
  radioValue.value = null;
  bucketSearchValue.value = '';
  fileList.value = [];
  selectedFile.value = null;
  formState.value.cloudAlgorithm = undefined;
  formState.value.selectedAlgorithmData = null;

  // 重置文件上传相关状态
  uploadModalVisible.value = false;
  uploadProgress.value = 0;
  uploadStatus.value = 'idle';
  uploadId.value = null;
  uploadedChunks.value = 0;
  totalChunks.value = 0;
  chunkProgress.value = [];
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

// 表单配置
const schema = computed(() => [
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入算法名称',
      class: 'w-full',
    },
    fieldName: 'algorithmName',
    label: '算法名称：',
    rules: [requiredRule('请输入算法名称')],
  },
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入版本号',
      class: 'w-full',
    },
    fieldName: 'algorithmVersion',
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
    fieldName: 'algorithmZone',
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

// 文件上传相关状态
const fileList = ref<any[]>([]);
const uploadProgress = ref(0);
const uploadStatus = ref<'error' | 'idle' | 'success' | 'uploading'>('idle');
const selectedFile = ref<File | null>(null);
const uploadModalVisible = ref(false);
const uploadXHR = ref<null | XMLHttpRequest>(null);
const chunkSize = ref(100 * 1024 * 1024); // 100MB 分片大小
const uploadId = ref<null | string>(null);
const totalChunks = ref(0);
const uploadedChunks = ref(0);
const chunkProgress = ref<number[]>([]);
const isChunkedUpload = ref(false);

// 格式化文件大小
const formatFileSize = (bytes: number | undefined) => {
  if (bytes === undefined || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`;
};

// 文件上传前验证
const beforeUpload = (file: File) => {
  const isLt100G = file.size / 1024 / 1024 / 1024 < 100;
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

// 处理文件上传
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

  // 切换为文件上传模式
  formState.value.is_CAS = 0;
  formState.value.cloudAlgorithmId = null;
  formState.value.cloudAlgorithm = undefined;
};

// 取消上传
const cancelUpload = () => {
  if (uploadXHR.value) {
    uploadXHR.value.abort();
  }

  if (uploadId.value) {
    // 取消分片上传
    mtpRequestClient.post('/mtp/cancel-chunked-upload', {
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
    const initResponse = await mtpRequestClient.post(
      '/mtp/init-chunked-upload',
      {
        fileName: file.name,
        fileSize: file.size,
        chunkSize: chunkSize.value,
      },
    );

    uploadId.value = initResponse.data.uploadId;
    totalChunks.value = initResponse.data.totalChunks;
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

      await mtpRequestClient.post('/mtp/upload-chunk', formData, {
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
    const completeResponse = await mtpRequestClient.post(
      '/mtp/complete-chunked-upload',
      {
        uploadId: uploadId.value,
        fileName: file.name,
      },
    );

    uploadStatus.value = 'success';
    return completeResponse;
  } catch (error) {
    console.error('分片上传失败:', error);
    uploadStatus.value = 'error';
    throw new Error('文件上传失败');
  }
};

// 表单提交处理
const handleSubmit = async () => {
  try {
    await formRef.value?.validate();

    // 验证高级设置部分
    if (formState.value.is_CAS === 0 && !selectedFile.value) {
      message.error('请上传算法文件或选择云仓算法包');
      return;
    }
    if (formState.value.is_CAS === 1 && !formState.value.cloudAlgorithmId) {
      message.error('请选择云仓算法包');
      return;
    }

    isSubmitted.value = true;
    await onSubmit(formState.value);
  } catch (error) {
    console.error('表单验证失败:', error);
    message.error('请正确填写所有必填字段');
  }
};

const handleCancel = () => {
  router.go(-1);
};

// 提交算法
const onSubmit = async (values: Record<string, any>) => {
  isSubmitting.value = true;
  let tempFilePath: null | string = null;

  try {
    // 如果是文件上传模式
    if (formState.value.is_CAS === 0 && selectedFile.value) {
      if (isChunkedUpload.value) {
        // 使用分片上传
        tempFilePath = await uploadFileInChunks(selectedFile.value);
      } else {
        // 单文件上传
        uploadModalVisible.value = true;
        uploadStatus.value = 'uploading';

        const formData = new FormData();
        formData.append('file', selectedFile.value);

        const response = await mtpRequestClient.post('/mtp/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              uploadProgress.value = Math.round(
                (progressEvent.loaded / progressEvent.total) * 100,
              );
            }
          },
        });

        tempFilePath = response;
        uploadStatus.value = 'success';
      }
    }

    const payload = {
      id: '',
      uid: '',
      algorithm_name: values.algorithmName,
      version: values.algorithmVersion,
      zone: values.algorithmZone,
      zone_label: values.algorithmZoneLabel,
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
      is_CAS: values.is_CAS,
      cloud_algorithm_id: values.cloudAlgorithmId,
      tempFilePath, // 添加文件路径
    };
    console.log('提交的算法信息:', tempFilePath);
    // 创建算法
    const algorithm = await createAlgorithm(payload);

    // 成功处理
    message.success('算法创建成功');

    // 重置表单状态
    resetFormState();
    formRef.value?.resetFields();

    // 跳转到算法列表页
    await router.replace({
      path: '/MTP/algorithm/index',
      query: {
        expanded: 'true',
        newAlgorithmId: algorithm.id,
      },
    });
  } catch (error) {
    console.error('创建算法失败:', error);
    isSubmitted.value = false; // 确保提交状态重置
    message.error('算法创建失败');
  } finally {
    isSubmitting.value = false;
    uploadModalVisible.value = false;
  }
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

// 云仓算法包相关状态
const modalVisible = ref(false);
const selectedAlgorithm = ref<null | Record<string, any>>(null);
const searchParams = ref({
  organization: undefined,
  domain: undefined,
  module: undefined,
});

// 模拟算法数据
const algorithmOptions = [
  {
    id: '1',
    name: '人脸识别算法',
    version: 'v1.2.0',
    description: '基于深度学习的人脸识别解决方案',
    organization: 'AI实验室',
    domain: '计算机视觉',
    module: '识别模块',
  },
  {
    id: '2',
    name: '目标检测算法',
    version: 'v2.0.1',
    description: '实时目标检测算法',
    organization: '视觉科技',
    domain: '计算机视觉',
    module: '检测模块',
  },
  {
    id: '3',
    name: '语音识别算法',
    version: 'v3.1.5',
    description: '高精度语音识别引擎',
    organization: '语音科技',
    domain: '语音处理',
    module: '识别模块',
  },
];

// 弹窗相关方法
const openModal = () => {
  modalVisible.value = true;
};

const closeModal = () => {
  modalVisible.value = false;
};

const confirmSelection = () => {
  if (selectedAlgorithm.value) {
    formState.value.cloudAlgorithm = `${selectedAlgorithm.value.name}@${selectedAlgorithm.value.version}`;
    formState.value.selectedAlgorithmData = selectedAlgorithm.value;
    formState.value.cloudAlgorithmId = selectedAlgorithm.value.id;

    // 切换为云仓模式
    formState.value.is_CAS = 1;

    // 清除文件上传
    fileList.value = [];
    selectedFile.value = null;
  }
  closeModal();
};

const removeAlgorithm = () => {
  formState.value.cloudAlgorithm = undefined;
  formState.value.selectedAlgorithmData = null;
  formState.value.cloudAlgorithmId = null;
  selectedAlgorithm.value = null;

  // 重置为文件上传模式
  formState.value.is_CAS = 0;
};

// 表格列定义
const columns = [
  {
    title: '算法名称',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '版本',
    dataIndex: 'version',
    key: 'version',
  },
  {
    title: '描述',
    dataIndex: 'description',
    key: 'description',
  },
  {
    title: '组织',
    dataIndex: 'organization',
    key: 'organization',
  },
  {
    title: '领域',
    dataIndex: 'domain',
    key: 'domain',
  },
  {
    title: '模块',
    dataIndex: 'module',
    key: 'module',
  },
];

// 筛选项数据
const filterOptions = {
  organizations: [
    ...new Set(algorithmOptions.map((item) => item.organization)),
  ],
  domains: [...new Set(algorithmOptions.map((item) => item.domain))],
  modules: [...new Set(algorithmOptions.map((item) => item.module))],
};
</script>

<template>
  <Page title="新增算法">
    <template #action>
      <div class="flex items-center gap-2">
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
          <!-- 动态生成表单项 -->
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
              >
                已选择存储桶: {{ selectedBucket.name }} ({{
                  selectedBucket.identifier
                }})
              </div>
            </AFormItem>
          </template>

          <!-- 描述输入区域 -->
          <AFormItem class="col-span-2" label="描述：" name="describe">
            <AInput.TextArea
              v-model:value="formState.describe"
              :maxlength="50"
              :show-count="true"
              placeholder="请输入算法描述,不超过50个字符"
              :style="{ height: '100px' }"
            />
          </AFormItem>
        </AForm>

        <!-- 高级设置折叠面板 -->
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
            <Tabs>
              <TabPane key="0" tab="算法上传">
                <div class="upload-section">
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
                        <p class="tip-text">点击或拖拽文件到此区域上传</p>
                        <p class="support-types">支持格式：PY、ZIP、TAR</p>
                        <p class="size-limit">单个文件不超过100GB</p>
                        <p
                          v-if="formState.is_CAS === 1"
                          class="mt-2 text-red-500"
                        >
                          当前已选择云仓算法包，上传文件将取消云仓选择
                        </p>
                      </div>
                    </div>
                  </AUpload>
                </div>
              </TabPane>

              <!-- 修改云仓算法包标签页内容 -->
              <TabPane key="1" tab="云仓算法包">
                <div class="algorithm-selection">
                  <div
                    v-if="formState.cloudAlgorithm"
                    class="selected-algorithm"
                  >
                    <span class="algorithm-tag">
                      {{ formState.cloudAlgorithm }}
                      <AButton type="link" danger @click="removeAlgorithm">
                        <template #icon>删除</template>
                      </AButton>
                    </span>
                  </div>

                  <AButton
                    type="primary"
                    @click="openModal"
                    :disabled="!!formState.cloudAlgorithm"
                  >
                    选择算法包
                  </AButton>
                  <p v-if="selectedFile" class="mt-2 text-red-500">
                    当前已上传文件，选择云仓算法包将取消文件上传
                  </p>
                </div>

                <!-- 算法选择弹窗 -->
                <Modal
                  v-model:visible="modalVisible"
                  title="选择算法包"
                  width="800px"
                  :footer="null"
                  :mask-closable="false"
                >
                  <div class="algorithm-modal">
                    <!-- 筛选项 -->
                    <div class="filters mb-4">
                      <ASelect
                        v-model:value="searchParams.organization"
                        placeholder="选择组织"
                        allow-clear
                        class="filter-select"
                      >
                        <ASelect.option
                          v-for="org in filterOptions.organizations"
                          :key="org"
                          :value="org"
                        >
                          {{ org }}
                        </ASelect.option>
                      </ASelect>

                      <ASelect
                        v-model:value="searchParams.domain"
                        placeholder="选择领域"
                        allow-clear
                        class="filter-select"
                      >
                        <ASelect.option
                          v-for="domain in filterOptions.domains"
                          :key="domain"
                          :value="domain"
                        >
                          {{ domain }}
                        </ASelect.option>
                      </ASelect>

                      <ASelect
                        v-model:value="searchParams.module"
                        placeholder="选择模块"
                        allow-clear
                        class="filter-select"
                      >
                        <ASelect.option
                          v-for="module in filterOptions.modules"
                          :key="module"
                          :value="module"
                        >
                          {{ module }}
                        </ASelect.option>
                      </ASelect>
                    </div>

                    <!-- 算法列表 -->
                    <Table
                      :columns="columns"
                      :data-source="algorithmOptions"
                      :row-selection="{
                        type: 'radio',
                        selectedRowKeys: selectedAlgorithm
                          ? [selectedAlgorithm.id]
                          : [],
                        onChange: (selectedRowKeys, selectedRows) => {
                          selectedAlgorithm = selectedRows[0];
                        },
                      }"
                      row-key="id"
                      class="algorithm-table"
                    />

                    <!-- 弹窗操作按钮 -->
                    <div class="modal-actions mt-4 text-right">
                      <AButton @click="closeModal" class="mr-2">取消</AButton>
                      <AButton
                        type="primary"
                        @click="confirmSelection"
                        :disabled="!selectedAlgorithm"
                      >
                        确定
                      </AButton>
                    </div>
                  </div>
                </Modal>
              </TabPane>
            </Tabs>
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

  <!-- 文件上传弹窗 -->
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
          }}分片)</span
        >
      </div>
      <div class="h-3 rounded-full bg-gray-200">
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
            class="h-2 rounded-full bg-gray-200"
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
      <div class="h-3 rounded-full bg-gray-200">
        <div
          class="h-full rounded-full bg-blue-500 transition-all duration-300"
          :style="{ width: `${uploadProgress}%` }"
        ></div>
      </div>
      <div class="mt-2 text-sm text-gray-500">正在上传，请勿关闭页面...</div>
    </div>

    <!-- 上传结果 -->
    <div v-else-if="uploadStatus === 'success'" class="mb-4 text-center">
      <div class="text-green-500">
        <CheckCircleOutlined class="mr-2 text-2xl" />
        <span class="text-lg">上传成功!</span>
      </div>
      <div class="mt-2 text-gray-500">文件已成功上传到算法</div>
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

  <!-- 存储桶选择弹窗 -->
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
              <div class="mt-1 h-2 rounded-full bg-gray-200">
                <div
                  class="h-full rounded-full"
                  :style="{
                    width: `${record.usagePercent}%`,
                    backgroundColor:
                      record.usageStatus.color === 'red'
                        ? '#f5222d'
                        : record.usageStatus.color === 'orange'
                          ? '#fa8c16'
                          : '#52c41a',
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
.upload-section {
  @apply rounded-lg bg-gray-50;
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
  @apply absolute bottom-0 left-0 h-px w-full bg-gray-200;
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
  color: #888;
  font-size: 14px;
}

:deep(.ant-cascader) {
  width: 100%;
}

:deep(.ant-cascader-disabled) {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

:deep(.ant-input[readonly]) {
  cursor: pointer;
  background-color: #f8fafc;
}

:deep(.ant-input[readonly]:hover) {
  border-color: #1890ff;
  background-color: #e6f7ff;
}

.algorithm-selection {
  @apply flex flex-col items-start;
}

.selected-algorithm {
  @apply mb-4 w-full;
}

.algorithm-tag {
  @apply inline-flex items-center justify-between rounded border border-blue-100 bg-blue-50 px-3 py-2 text-blue-700;
  min-width: 250px;
}

.algorithm-modal {
  @apply p-4;
}

.filters {
  @apply flex gap-3;
}

.filter-select {
  @apply flex-1;
}

.algorithm-table {
  @apply rounded border border-gray-200;
}

.modal-actions {
  @apply border-t border-gray-200 pt-4;
}

:deep(.ant-progress) {
  margin-bottom: 0;
}

:deep(.ant-radio-group) {
  width: 100%;
}

.upload-progress-modal {
  padding: 20px;
}
</style>
