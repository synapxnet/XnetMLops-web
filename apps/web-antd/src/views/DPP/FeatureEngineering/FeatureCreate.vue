<script lang="ts" setup>
import type { Ref } from 'vue';

import type { ColumnInfo, DataSource, TableInfo } from '../../SMP/api/datasource';
import type { FeatureEngineering } from '../../SMP/api/featureEngineering';
import type {
  FeatureColumnConfig,
  FeatureOperator,
  ParsedFeatureOperator,
} from '../../SMP/api/featureOperator';
import type { BucketItem, DatasetItem, DockerFile, DeptTreeDataItem } from '../../SMP/api/types';

import { computed, inject, onMounted, reactive, ref, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined,
  ExperimentOutlined,
  EyeOutlined,
  FileOutlined,
  FolderOutlined,
  LeftOutlined,
  LockOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  SaveOutlined,
  SearchOutlined,
  SettingOutlined,
  SyncOutlined,
  TableOutlined,
} from '@ant-design/icons-vue';
import {
  AutoComplete,
  Button,
  Card,
  Cascader,
  Checkbox,
  Col,
  Collapse,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Radio,
  Row,
  Select,
  Steps,
  Switch,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { getbucketConfig } from '../../SMP/api/bucketConfig';
import { fetchDatasetList } from '../../SMP/api/dataset';
import {
  fetchColumns,
  fetchDatabases,
  fetchEnabledDataSources,
  fetchTables,
  previewTableData,
} from '../../SMP/api/datasource';
import { fetchConfig } from '../../SMP/api/datasetConfig';
import { getDockerFiles } from '../../SMP/api/dockerFileManager';
import {
  createFeatureEngineering,
  fetchFeatureEngineeringById,
  updateFeatureEngineering,
} from '../../SMP/api/featureEngineering';
import {
  fetchFeatureOperators,
  getCategoryLabel,
  parseFeatureOperator,
} from '../../SMP/api/featureOperator';

const router = useRouter();
const route = useRoute();
const formRef = ref();
const loading = ref(false);
const editingId = ref<number | null>(null);

// 当前步骤
const currentStep = ref(0);

// 是否为编辑模式
const isEditMode = computed(() => editingId.value !== null);

// 从导航头部组件获取已选组织信息
const organizationTree = inject<Ref<DeptTreeDataItem[]>>(
  'organizationTree',
  ref([]),
);

// 当前用户信息
const currentUserInfo = inject<Ref<any>>('currentUserInfo', ref(null));

// 本地组织选择状态
const selectedOrg = ref<{
  deptUid: null | string;
  level: number;
  teamUid: null | string;
  tenantUid: null | string;
}>({
  level: 0,
  tenantUid: null,
  deptUid: null,
  teamUid: null,
});

// 查找团队名称
const findTeamName = (): string => {
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

// 数据源相关
const dataSources = ref<DataSource[]>([]);
const databases = ref<string[]>([]);
const tables = ref<TableInfo[]>([]);
const columns = ref<ColumnInfo[]>([]);
const selectedColumns = ref<string[]>([]);

// 特征算子相关
const featureOperators = ref<FeatureOperator[]>([]);
const selectedOperator = ref<ParsedFeatureOperator | null>(null);
const operatorLoading = ref(false);

// 字段特征配置（每个字段的特征属性设置）
const fieldFeatureConfigs = ref<Record<string, Record<string, any>>>({});

// 算子参数配置
const operatorParamsConfig = ref<Record<string, any>>({});

// 配置数据（数据类型、数据区域）
const configData = ref<{
  datasetTypes: { label: string; value: string }[];
  datasetZones: { label: string; value: string }[];
}>({
  datasetTypes: [],
  datasetZones: [],
});

// 数据区域和存储桶配置
const zoneOptions = ref<{ label: string; value: string }[]>([]);
const buckets = ref<(BucketItem & { usage: string; usagePercent: number; usageStatus: { color: string; text: string } })[]>([]);
const isLoadingBuckets = ref(false);

// 数据集列表（用于推送至数据集选择）
const datasetList = ref<DatasetItem[]>([]);
const datasetLoading = ref(false);

// 存储桶选择弹窗相关
const bucketModalVisible = ref(false);
const bucketSearchValue = ref('');
const selectedBucket = ref<null | { uid: string; name: string; identifier: string }>(null);
const radioValue = ref<null | string>(null);

// 预览相关
const previewVisible = ref(false);
const previewData = ref<{ columns: string[]; rows: any[]; total: number }>({
  columns: [],
  rows: [],
  total: 0,
});
const previewLoading = ref(false);

// 镜像选择相关
const showImageDialog = ref(false);
const searchImageKey = ref('');
const selectedImageUid = ref<string>('');
const dockerImages = ref<DockerFile[]>([]);
const loadingImages = ref(false);

// 表单数据
const formState = reactive<Partial<FeatureEngineering> & { zone?: string }>({
  name: '',
  description: '',
  datasourceId: undefined,
  datasourceName: '',
  database: '',
  tableName: '',
  selectedColumns: '',
  transformConfig: '',
  teamUid: '',
  teamName: '',
  zone: undefined,
  bucketUid: undefined,
  bucketName: undefined,
  // 新增字段
  subDataArea: '0',
  dataType: undefined,
  encryption: false,
  // 输出配置
  pushToDataset: true,
  targetDatasetId: undefined,
  targetDatasetName: '',
  outputPath: '',
  // 算子相关
  operatorId: undefined,
  operatorCode: undefined,
  operatorName: undefined,
  outputFormat: undefined,
  featureConfig: undefined,
  operatorParams: undefined,
  // 镜像相关字段
  imageUid: undefined,
  imageName: undefined,
  imageTag: undefined,
  harborUrl: undefined,
  harborCredentialsId: undefined,
  // 调度配置
  scheduleConfig: undefined,
  scheduleActive: false,
  // 通知配置
  notificationConfig: undefined,
  notificationEnabled: false,
});

// 调度配置状态
const scheduleConfigState = reactive({
  isActive: false,
  intervalType: 'daily' as 'daily' | 'weekly' | 'hourly' | 'cron' | 'interval' | 'once' | 'monthly',
  cronExpression: '',
  dailyTime: '',
  dateRange: [] as any[],
  hourlyMinute: '',
  intervalDuration: 1,
  intervalUnit: 'hours' as 'hours' | 'days' | 'weeks' | 'months',
  offsetTime: '',
  onceTime: null as any,
  weeklyDays: [] as string[],
  weeklyTime: '',
  monthlyDay: 1,
  monthlyTime: '',
});

// 通知配置状态
const notificationConfigState = reactive({
  isActive: false,
  notificationTitle: '',
  notificationContent: '',
  notificationUserID: '',
  notificationTrigger: 'on_failure' as 'on_failure' | 'on_success' | 'always',
});

// 通知触发条件选项
const notificationTriggerOptions = [
  { value: 'on_failure', label: '任务失败时通知', description: '仅当任务执行失败时发送通知' },
  { value: 'on_success', label: '任务成功时通知', description: '仅当任务执行成功时发送通知' },
  { value: 'always', label: '无论失败成功都通知', description: '无论任务执行结果如何都发送通知' },
];

// 星期选项
const weekDayOptions = [
  { value: '1', label: '星期日' },
  { value: '2', label: '星期一' },
  { value: '3', label: '星期二' },
  { value: '4', label: '星期三' },
  { value: '5', label: '星期四' },
  { value: '6', label: '星期五' },
  { value: '7', label: '星期六' },
];

// 镜像表格列定义
const imageColumns = [
  { title: '', dataIndex: 'selection', width: 40 },
  { title: '镜像名称', dataIndex: 'name' },
  { title: '标签', dataIndex: 'tags' },
  { title: '创建时间', dataIndex: 'created_at' },
  { title: '操作', dataIndex: 'action' },
];

// 过滤镜像
const filteredImages = computed(() => {
  return dockerImages.value.filter(
    (img) =>
      img.name.toLowerCase().includes(searchImageKey.value.toLowerCase()) ||
      (img.tags && img.tags.toLowerCase().includes(searchImageKey.value.toLowerCase())),
  );
});

// 名称验证规则（仅在创建模式下验证格式）
const nameRules = computed(() => {
  if (isEditMode.value) {
    return [{ required: true, message: '请输入特征工程名称' }];
  }
  return [
    { required: true, message: '请输入特征工程名称' },
    {
      pattern: /^[a-zA-Z][a-zA-Z0-9_-]*$/,
      message: '名称必须以字母开头，只能包含字母、数字、下划线(_)和中划线(-)',
    },
    {
      max: 50,
      message: '名称长度不能超过50个字符',
    },
  ];
});

// 加载中状态
const datasourceLoading = ref(false);
const databaseLoading = ref(false);
const tableLoading = ref(false);
const columnLoading = ref(false);

// 请求版本号（用于防止竞态条件）
const databaseRequestVersion = ref(0);
const tableRequestVersion = ref(0);
const columnRequestVersion = ref(0);

// 预览表格列（动态生成）
const previewColumns = ref<any[]>([]);

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
  if (isEditMode.value) return;

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
  if (value.length === 0) {
    selectedOrg.value.tenantUid = null;
    selectedOrg.value.level = 0;
  }

  // 清空已选的存储桶（因为组织变了）
  selectedBucket.value = null;
  formState.bucketUid = undefined;
  formState.bucketName = undefined;

  // 清空数据集选择
  formState.targetDatasetId = undefined;
  formState.targetDatasetName = '';
};

// 自定义级联选择器显示函数
const displayRender = ({ labels }: { labels: string[] }) => {
  return labels.join(' / ');
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
      const authorizedTenants = bucket.authorized_tenants;
      if (typeof authorizedTenants === 'string') {
        return authorizedTenants.split(',').includes(tenantUid);
      }
      return Array.isArray(authorizedTenants) && authorizedTenants.includes(tenantUid);
    }
    return false;
  });
});

// 过滤后的数据集列表（按团队筛选）
const filteredDatasets = computed(() => {
  if (!selectedOrg.value.teamUid) {
    return [];
  }
  return datasetList.value.filter(
    (ds) => ds.team_uid === selectedOrg.value.teamUid
  );
});

// 数据集选项（用于AutoComplete）
const datasetOptions = computed(() => {
  return filteredDatasets.value.map((ds) => ({
    value: ds.dataset_file,
    label: ds.dataset_file,
    id: ds.id,
  }));
});

// 打开存储桶选择弹窗
const openBucketModal = () => {
  if (!selectedOrg.value.tenantUid) {
    message.warning('请先选择所属组织');
    return;
  }

  bucketModalVisible.value = true;
  bucketSearchValue.value = '';
  radioValue.value = selectedBucket.value?.uid || null;
};

// 选择存储桶
const selectBucket = () => {
  if (!radioValue.value) {
    message.warning('请先选择一个存储桶');
    return;
  }

  const bucket = buckets.value.find((b) => b.uid === radioValue.value);
  if (bucket) {
    selectedBucket.value = {
      uid: bucket.uid,
      name: bucket.name,
      identifier: bucket.identifier,
    };
    formState.bucketUid = bucket.uid;
    formState.bucketName = bucket.name;
    bucketModalVisible.value = false;
  }
};

// 加载数据源列表
const loadDataSources = async () => {
  datasourceLoading.value = true;
  try {
    dataSources.value = await fetchEnabledDataSources();
  } catch (error) {
    console.error('加载数据源失败:', error);
    message.error('加载数据源失败');
  } finally {
    datasourceLoading.value = false;
  }
};

// 加载特征算子列表
const loadFeatureOperators = async () => {
  operatorLoading.value = true;
  try {
    featureOperators.value = await fetchFeatureOperators();
  } catch (error) {
    console.error('加载特征算子失败:', error);
    message.error('加载特征算子失败');
  } finally {
    operatorLoading.value = false;
  }
};

// 加载数据集列表
const loadDatasets = async () => {
  datasetLoading.value = true;
  try {
    datasetList.value = await fetchDatasetList();
  } catch (error) {
    console.error('加载数据集列表失败:', error);
  } finally {
    datasetLoading.value = false;
  }
};

// 加载Docker镜像
const loadDockerImages = async () => {
  try {
    loadingImages.value = true;
    const response = await getDockerFiles();
    dockerImages.value = response || [];
  } catch (error) {
    message.error('加载镜像失败');
    console.error('加载镜像错误:', error);
  } finally {
    loadingImages.value = false;
  }
};

// 打开镜像选择器
const openImageSelector = () => {
  if (dockerImages.value.length === 0) {
    loadDockerImages();
  }
  showImageDialog.value = true;
};

// 处理镜像行点击
const handleImageRowClick = (record: DockerFile) => {
  selectedImageUid.value = record.uid;
};

// 处理镜像确认
const handleImageConfirm = () => {
  if (selectedImageUid.value) {
    const record = dockerImages.value.find((img) => img.uid === selectedImageUid.value);
    if (record) {
      const primaryTag = record.tags ? record.tags.split(',')[0] : 'latest';
      formState.imageName = `${record.name}@${primaryTag}`;
      formState.imageUid = record.uid;
      formState.imageTag = primaryTag;
      showImageDialog.value = false;
      searchImageKey.value = '';
    }
  } else {
    message.warning('请先选择一个镜像');
  }
};

// 加载数据区域和存储桶配置
const loadConfigData = async () => {
  try {
    // 加载数据区域和类型配置
    const config = await fetchConfig();
    configData.value = {
      datasetTypes: config.datasetTypes || [],
      datasetZones: config.datasetZones || [],
    };
    zoneOptions.value = config.datasetZones || [];
  } catch (error) {
    console.error('加载配置失败:', error);
    // 使用默认配置
    zoneOptions.value = [
      { label: '南京', value: '1' },
      { label: '江西', value: '2' },
      { label: '广东', value: '3' },
    ];
  }

  try {
    // 加载存储桶配置
    const bucketResponse = await getbucketConfig();
    const bucketData = bucketResponse.data || bucketResponse || [];
    buckets.value = bucketData.map((bucket: BucketItem) => {
      const usagePercent =
        bucket.max_size && bucket.max_size > 0
          ? Math.round(((bucket.current_size || 0) / bucket.max_size) * 100)
          : 0;

      return {
        ...bucket,
        usage: `${bucket.current_size || 0} / ${bucket.max_size || 100} GB`,
        usagePercent,
        usageStatus: getUsageStatus(bucket.current_size || 0, bucket.max_size || 0),
      };
    });
  } catch (error) {
    console.error('加载存储桶配置失败:', error);
    buckets.value = [];
  }
};

// 处理算子选择变化
const handleOperatorChange = (operatorId: number) => {
  const operator = featureOperators.value.find((op) => op.id === operatorId);
  if (operator) {
    selectedOperator.value = parseFeatureOperator(operator);
    formState.operatorId = operator.id;
    formState.operatorCode = operator.code;
    formState.operatorName = operator.name;

    // 设置默认输出格式
    if (selectedOperator.value.outputFormats.length > 0) {
      formState.outputFormat = selectedOperator.value.outputFormats[0];
    }

    // 初始化算子参数默认值
    operatorParamsConfig.value = {};
    for (const [key, param] of Object.entries(selectedOperator.value.parameterSchema)) {
      if (param.default !== undefined) {
        operatorParamsConfig.value[key] = param.default;
      }
    }

    // 重新初始化字段特征配置
    initFieldFeatureConfigs();
  } else {
    selectedOperator.value = null;
    formState.operatorId = undefined;
    formState.operatorCode = undefined;
    formState.operatorName = undefined;
    formState.outputFormat = undefined;
    operatorParamsConfig.value = {};
  }
};

// 初始化字段特征配置
const initFieldFeatureConfigs = () => {
  if (!selectedOperator.value) {
    fieldFeatureConfigs.value = {};
    return;
  }

  const configs: Record<string, Record<string, any>> = {};
  for (const columnName of selectedColumns.value) {
    configs[columnName] = {};
    // 为每个字段设置默认值
    for (const col of selectedOperator.value.featureColumns) {
      if (col.default !== undefined) {
        configs[columnName][col.key] = col.default;
      } else {
        configs[columnName][col.key] = col.type === 'switch' ? false : '';
      }
    }
  }
  fieldFeatureConfigs.value = configs;
};

// 数据源变化时加载数据库列表
const handleDatasourceChange = async (datasourceId: number) => {
  const ds = dataSources.value.find((d) => d.id === datasourceId);
  if (ds) {
    formState.datasourceName = ds.name;
  }

  // 编辑模式下不清空已有数据
  if (!isEditMode.value) {
    formState.database = '';
    formState.tableName = '';
    databases.value = [];
    tables.value = [];
    columns.value = [];
    selectedColumns.value = [];
    fieldFeatureConfigs.value = {};
  }

  if (!datasourceId) return;

  // 增加版本号，用于防止竞态条件
  const currentVersion = ++databaseRequestVersion.value;

  databaseLoading.value = true;
  try {
    const result = await fetchDatabases(datasourceId);
    // 只有当版本号匹配时才更新数据
    if (currentVersion === databaseRequestVersion.value) {
      databases.value = result;
    }
  } catch (error) {
    if (currentVersion === databaseRequestVersion.value) {
      console.error('加载数据库列表失败:', error);
      message.error('加载数据库列表失败');
    }
  } finally {
    if (currentVersion === databaseRequestVersion.value) {
      databaseLoading.value = false;
    }
  }
};

// 数据库变化时加载表列表
const handleDatabaseChange = async (database: string) => {
  // 编辑模式下不清空已有数据
  if (!isEditMode.value) {
    formState.tableName = '';
    tables.value = [];
    columns.value = [];
    selectedColumns.value = [];
    fieldFeatureConfigs.value = {};
  }

  if (!database || !formState.datasourceId) return;

  // 增加版本号，用于防止竞态条件
  const currentVersion = ++tableRequestVersion.value;
  const currentDatasourceId = formState.datasourceId;
  const currentDatabase = database;

  tableLoading.value = true;
  try {
    const result = await fetchTables(currentDatasourceId, currentDatabase);
    // 只有当版本号匹配且当前选择的数据库没有变化时才更新数据
    if (currentVersion === tableRequestVersion.value && formState.database === currentDatabase) {
      tables.value = result;
    }
  } catch (error) {
    if (currentVersion === tableRequestVersion.value && formState.database === currentDatabase) {
      console.error('加载数据表列表失败:', error);
      message.error('加载数据表列表失败');
    }
  } finally {
    if (currentVersion === tableRequestVersion.value) {
      tableLoading.value = false;
    }
  }
};

// 数据表变化时加载字段列表
const handleTableChange = async (tableName: string) => {
  // 编辑模式下不清空已选字段
  if (!isEditMode.value) {
    columns.value = [];
    selectedColumns.value = [];
    fieldFeatureConfigs.value = {};
  }

  if (!tableName || !formState.datasourceId || !formState.database) return;

  // 增加版本号，用于防止竞态条件
  const currentVersion = ++columnRequestVersion.value;
  const currentDatasourceId = formState.datasourceId;
  const currentDatabase = formState.database;
  const currentTableName = tableName;

  columnLoading.value = true;
  try {
    const result = await fetchColumns(
      currentDatasourceId,
      currentDatabase,
      currentTableName
    );
    // 只有当版本号匹配且当前选择的表没有变化时才更新数据
    if (currentVersion === columnRequestVersion.value && formState.tableName === currentTableName) {
      columns.value = result;
      // 仅在创建模式下默认选中所有字段
      if (!isEditMode.value) {
        selectedColumns.value = columns.value.map((c) => c.name);
        initFieldFeatureConfigs();
      }
    }
  } catch (error) {
    if (currentVersion === columnRequestVersion.value && formState.tableName === currentTableName) {
      console.error('加载字段列表失败:', error);
      message.error('加载字段列表失败');
    }
  } finally {
    if (currentVersion === columnRequestVersion.value) {
      columnLoading.value = false;
    }
  }
};

// 字段选择变化
const handleColumnSelect = (columnName: string, checked: boolean) => {
  if (checked) {
    if (!selectedColumns.value.includes(columnName)) {
      selectedColumns.value.push(columnName);
      // 初始化该字段的特征配置
      if (selectedOperator.value && !fieldFeatureConfigs.value[columnName]) {
        fieldFeatureConfigs.value[columnName] = {};
        for (const col of selectedOperator.value.featureColumns) {
          if (col.default !== undefined) {
            fieldFeatureConfigs.value[columnName][col.key] = col.default;
          } else {
            fieldFeatureConfigs.value[columnName][col.key] = col.type === 'switch' ? false : '';
          }
        }
      }
    }
  } else {
    selectedColumns.value = selectedColumns.value.filter((c) => c !== columnName);
    // 移除该字段的特征配置
    delete fieldFeatureConfigs.value[columnName];
  }
};

// 全选/取消全选
const handleSelectAll = (checked: boolean) => {
  if (checked) {
    selectedColumns.value = columns.value.map((c) => c.name);
    initFieldFeatureConfigs();
  } else {
    selectedColumns.value = [];
    fieldFeatureConfigs.value = {};
  }
};

// 更新字段特征配置
const updateFieldFeatureConfig = (columnName: string, key: string, value: any) => {
  if (!fieldFeatureConfigs.value[columnName]) {
    fieldFeatureConfigs.value[columnName] = {};
  }
  fieldFeatureConfigs.value[columnName][key] = value;
};

// 处理数据集名称选择/输入
const handleDatasetSelect = (value: string) => {
  formState.targetDatasetName = value;
  // 查找是否是已有数据集
  const existingDataset = filteredDatasets.value.find((ds) => ds.dataset_file === value);
  if (existingDataset) {
    formState.targetDatasetId = existingDataset.id;
  } else {
    formState.targetDatasetId = undefined;
  }
};

// 预览数据
const handlePreview = async () => {
  if (!formState.datasourceId || !formState.database || !formState.tableName) {
    message.warning('请先选择数据源、数据库和数据表');
    return;
  }

  previewLoading.value = true;
  previewVisible.value = true;
  try {
    previewData.value = await previewTableData(
      formState.datasourceId,
      formState.database,
      formState.tableName,
      100
    );

    // 动态生成预览表格列
    previewColumns.value = previewData.value.columns.map((col) => ({
      title: col,
      dataIndex: col,
      key: col,
      ellipsis: true,
      width: 150,
    }));
  } catch (error) {
    console.error('预览数据失败:', error);
    message.error('预览数据失败');
    previewVisible.value = false;
  } finally {
    previewLoading.value = false;
  }
};

// Step1 验证
const validateStep1 = async (): Promise<boolean> => {
  try {
    await formRef.value?.validate();
  } catch {
    message.warning('请填写完整的信息');
    return false;
  }

  if (!formState.datasourceId) {
    message.warning('请选择数据源');
    return false;
  }

  if (!formState.database) {
    message.warning('请选择数据库');
    return false;
  }

  if (!formState.tableName) {
    message.warning('请选择数据表');
    return false;
  }

  if (selectedColumns.value.length === 0) {
    message.warning('请至少选择一个字段');
    return false;
  }

  if (!isEditMode.value && !selectedOrg.value.teamUid) {
    message.warning('请选择所属组织（需要选择到团队级别）');
    return false;
  }

  if (!isEditMode.value && !formState.zone) {
    message.warning('请选择数据区域');
    return false;
  }

  if (!isEditMode.value && !formState.bucketUid) {
    message.warning('请选择存储桶');
    return false;
  }

  if (!formState.dataType) {
    message.warning('请选择数据类型');
    return false;
  }

  if (!formState.operatorId) {
    message.warning('请选择特征算子');
    return false;
  }

  if (!formState.outputFormat) {
    message.warning('请选择输出格式');
    return false;
  }

  // 输出配置验证
  if (formState.pushToDataset) {
    if (!formState.targetDatasetName) {
      message.warning('请输入或选择目标数据集名称');
      return false;
    }
  } else {
    if (!formState.outputPath) {
      message.warning('请输入输出路径');
      return false;
    }
  }

  // 镜像验证
  if (!formState.imageUid) {
    message.warning('请选择镜像');
    return false;
  }

  return true;
};

// Step2 验证
const validateStep2 = (): boolean => {
  // 调度配置验证
  if (scheduleConfigState.isActive) {
    if (!scheduleConfigState.intervalType) {
      message.warning('请选择调度类型');
      return false;
    }

    switch (scheduleConfigState.intervalType) {
      case 'daily':
        if (!scheduleConfigState.dailyTime) {
          message.warning('请选择每日执行时间');
          return false;
        }
        break;
      case 'weekly':
        if (scheduleConfigState.weeklyDays.length === 0 || !scheduleConfigState.weeklyTime) {
          message.warning('请选择每周执行日期和时间');
          return false;
        }
        break;
      case 'hourly':
        if (!scheduleConfigState.hourlyMinute) {
          message.warning('请输入每小时的分钟数');
          return false;
        }
        break;
      case 'cron':
        if (!scheduleConfigState.cronExpression) {
          message.warning('请输入Cron表达式');
          return false;
        }
        break;
      case 'interval':
        if (!scheduleConfigState.intervalDuration || !scheduleConfigState.intervalUnit ||
            !scheduleConfigState.dateRange || scheduleConfigState.dateRange.length < 2) {
          message.warning('请完善间隔配置和日期范围');
          return false;
        }
        break;
      case 'once':
        if (!scheduleConfigState.onceTime) {
          message.warning('请选择执行时间');
          return false;
        }
        break;
      case 'monthly':
        if (!scheduleConfigState.monthlyDay || !scheduleConfigState.monthlyTime) {
          message.warning('请选择每月执行日期和时间');
          return false;
        }
        break;
    }
  }

  // 通知配置验证
  if (notificationConfigState.isActive) {
    if (!notificationConfigState.notificationTitle) {
      message.warning('请输入通知标题');
      return false;
    }
    if (!notificationConfigState.notificationContent) {
      message.warning('请输入通知内容');
      return false;
    }
    if (!notificationConfigState.notificationUserID) {
      message.warning('请输入通知接收人');
      return false;
    }
  }

  return true;
};

// 下一步
const handleNext = async () => {
  if (currentStep.value === 0) {
    const isValid = await validateStep1();
    if (isValid) {
      currentStep.value = 1;
    }
  }
};

// 上一步
const handlePrev = () => {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
};

// 保存
const handleSave = async () => {
  // 验证 Step2
  if (!validateStep2()) {
    return;
  }

  loading.value = true;
  try {
    // 构建调度配置JSON
    const scheduleConfigJson = scheduleConfigState.isActive ? JSON.stringify({
      intervalType: scheduleConfigState.intervalType,
      cronExpression: scheduleConfigState.cronExpression,
      dailyTime: scheduleConfigState.dailyTime,
      dateRange: scheduleConfigState.dateRange?.map((d: any) => d?.toISOString?.() || d),
      hourlyMinute: scheduleConfigState.hourlyMinute,
      intervalDuration: scheduleConfigState.intervalDuration,
      intervalUnit: scheduleConfigState.intervalUnit,
      offsetTime: scheduleConfigState.offsetTime,
      onceTime: scheduleConfigState.onceTime?.toISOString?.() || scheduleConfigState.onceTime,
      weeklyDays: scheduleConfigState.weeklyDays,
      weeklyTime: scheduleConfigState.weeklyTime,
      monthlyDay: scheduleConfigState.monthlyDay,
      monthlyTime: scheduleConfigState.monthlyTime,
    }) : undefined;

    // 构建通知配置JSON
    const notificationConfigJson = notificationConfigState.isActive ? JSON.stringify({
      notificationTitle: notificationConfigState.notificationTitle,
      notificationContent: notificationConfigState.notificationContent,
      notificationUserID: notificationConfigState.notificationUserID,
      notificationTrigger: notificationConfigState.notificationTrigger,
    }) : undefined;

    const data: FeatureEngineering = {
      ...formState,
      datasourceId: formState.datasourceId!,
      database: formState.database!,
      tableName: formState.tableName!,
      name: formState.name!,
      selectedColumns: JSON.stringify(selectedColumns.value),
      teamUid: isEditMode.value ? formState.teamUid : (selectedOrg.value.teamUid || ''),
      teamName: isEditMode.value ? formState.teamName : findTeamName(),
      zone: formState.zone,
      bucketUid: formState.bucketUid,
      bucketName: formState.bucketName,
      subDataArea: formState.subDataArea,
      dataType: formState.dataType,
      encryption: formState.encryption,
      pushToDataset: formState.pushToDataset,
      targetDatasetId: formState.targetDatasetId,
      targetDatasetName: formState.targetDatasetName,
      outputPath: formState.pushToDataset ? '' : formState.outputPath,
      operatorId: formState.operatorId,
      operatorCode: formState.operatorCode,
      operatorName: formState.operatorName,
      outputFormat: formState.outputFormat,
      featureConfig: JSON.stringify(fieldFeatureConfigs.value),
      operatorParams: JSON.stringify(operatorParamsConfig.value),
      // 镜像相关
      imageUid: formState.imageUid,
      imageName: formState.imageName,
      imageTag: formState.imageTag,
      // 调度配置
      scheduleConfig: scheduleConfigJson,
      scheduleActive: scheduleConfigState.isActive,
      // 通知配置
      notificationConfig: notificationConfigJson,
      notificationEnabled: notificationConfigState.isActive,
    };

    if (editingId.value) {
      await updateFeatureEngineering(editingId.value, data);
      message.success('更新成功');
    } else {
      await createFeatureEngineering(data);
      message.success('创建成功');
    }

    router.push('/DPP/feature-engineering/index');
  } catch (error: any) {
    console.error('保存失败:', error);
    message.error(error?.message || '保存失败');
  } finally {
    loading.value = false;
  }
};

// 返回
const handleBack = () => {
  router.push('/DPP/feature-engineering/index');
};

// 加载编辑数据
const loadEditData = async (id: number) => {
  loading.value = true;
  try {
    const data = await fetchFeatureEngineeringById(id);
    Object.assign(formState, data);

    if (data.selectedColumns) {
      selectedColumns.value = JSON.parse(data.selectedColumns);
    }

    if (data.featureConfig) {
      fieldFeatureConfigs.value = JSON.parse(data.featureConfig);
    }

    if (data.operatorParams) {
      operatorParamsConfig.value = JSON.parse(data.operatorParams);
    }

    // 设置已选算子
    if (data.operatorId) {
      const operator = featureOperators.value.find((op) => op.id === data.operatorId);
      if (operator) {
        selectedOperator.value = parseFeatureOperator(operator);
      }
    }

    // 设置已选存储桶
    if (data.bucketUid) {
      selectedBucket.value = {
        uid: data.bucketUid,
        name: data.bucketName || '',
        identifier: '',
      };
    }

    // 设置已选镜像
    if (data.imageUid) {
      selectedImageUid.value = data.imageUid;
    }

    // 解析调度配置
    if (data.scheduleConfig) {
      try {
        const scheduleData = JSON.parse(data.scheduleConfig);
        scheduleConfigState.isActive = data.scheduleActive || false;
        scheduleConfigState.intervalType = scheduleData.intervalType || 'daily';
        scheduleConfigState.cronExpression = scheduleData.cronExpression || '';
        scheduleConfigState.dailyTime = scheduleData.dailyTime || '';
        scheduleConfigState.dateRange = scheduleData.dateRange?.map((d: string) => dayjs(d)) || [];
        scheduleConfigState.hourlyMinute = scheduleData.hourlyMinute || '';
        scheduleConfigState.intervalDuration = scheduleData.intervalDuration || 1;
        scheduleConfigState.intervalUnit = scheduleData.intervalUnit || 'hours';
        scheduleConfigState.offsetTime = scheduleData.offsetTime || '';
        scheduleConfigState.onceTime = scheduleData.onceTime ? dayjs(scheduleData.onceTime) : null;
        scheduleConfigState.weeklyDays = scheduleData.weeklyDays || [];
        scheduleConfigState.weeklyTime = scheduleData.weeklyTime || '';
        scheduleConfigState.monthlyDay = scheduleData.monthlyDay || 1;
        scheduleConfigState.monthlyTime = scheduleData.monthlyTime || '';
      } catch (e) {
        console.error('解析调度配置失败:', e);
      }
    }

    // 解析通知配置
    if (data.notificationConfig) {
      try {
        const notificationData = JSON.parse(data.notificationConfig);
        notificationConfigState.isActive = data.notificationEnabled || false;
        notificationConfigState.notificationTitle = notificationData.notificationTitle || '';
        notificationConfigState.notificationContent = notificationData.notificationContent || '';
        notificationConfigState.notificationUserID = notificationData.notificationUserID || '';
        notificationConfigState.notificationTrigger = notificationData.notificationTrigger || 'on_failure';
      } catch (e) {
        console.error('解析通知配置失败:', e);
      }
    }

    // 加载数据源列表后设置数据库和表的选项
    if (data.datasourceId) {
      databaseLoading.value = true;
      try {
        databases.value = await fetchDatabases(data.datasourceId);
      } finally {
        databaseLoading.value = false;
      }
    }

    if (data.datasourceId && data.database) {
      tableLoading.value = true;
      try {
        tables.value = await fetchTables(data.datasourceId, data.database);
      } finally {
        tableLoading.value = false;
      }
    }

    if (data.datasourceId && data.database && data.tableName) {
      columnLoading.value = true;
      try {
        columns.value = await fetchColumns(data.datasourceId, data.database, data.tableName);
      } finally {
        columnLoading.value = false;
      }
    }
  } catch (error) {
    console.error('加载数据失败:', error);
    message.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

// 动态生成字段表格列
const columnTableColumns = computed(() => {
  const baseColumns = [
    {
      title: '选择',
      key: 'select',
      width: 60,
      fixed: 'left',
    },
    { title: '字段名', dataIndex: 'name', key: 'name', width: 150 },
    { title: '类型', dataIndex: 'type', key: 'type', width: 100 },
    { title: '大小', dataIndex: 'size', key: 'size', width: 80 },
    { title: '可空', dataIndex: 'nullable', key: 'nullable', width: 60 },
    { title: '说明', dataIndex: 'remarks', key: 'remarks', width: 150 },
  ];

  // 如果选择了算子，添加特征属性列
  if (selectedOperator.value && selectedOperator.value.featureColumns.length > 0) {
    for (const col of selectedOperator.value.featureColumns) {
      baseColumns.push({
        title: col.title,
        key: `feature_${col.key}`,
        width: col.type === 'switch' ? 80 : 150,
        dataIndex: col.key,
      });
    }
  }

  return baseColumns;
});

onMounted(async () => {
  await Promise.all([
    loadDataSources(),
    loadConfigData(),
    loadFeatureOperators(),
    loadDatasets(),
    loadDockerImages(),
  ]);

  // 从路由参数获取id
  const id = route.params.id;
  if (id) {
    editingId.value = Number(id);
    await loadEditData(editingId.value);
  }
});
</script>

<template>
  <Card class="p-4 shadow">
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center">
        <Button @click="handleBack" class="mr-4">
          <LeftOutlined /> 返回
        </Button>
        <span class="text-lg font-semibold">
          {{ isEditMode ? '编辑特征工程' : '新建特征工程' }}
        </span>
        <Tag v-if="isEditMode" color="orange" class="ml-2">
          <LockOutlined /> 名称和数据源配置不可修改
        </Tag>
      </div>
    </div>

    <!-- 步骤条 -->
    <Steps :current="currentStep" class="mb-6">
      <Steps.Step title="基础配置" description="数据源、算子、镜像选择" />
      <Steps.Step title="调度与通知" description="定时执行、消息通知" />
    </Steps>

    <!-- Step 1: 基础配置 -->
    <div v-show="currentStep === 0">
      <Form
        ref="formRef"
        :model="formState"
        layout="vertical"
      >
        <Row :gutter="24">
          <!-- 左侧：基本信息、数据源配置和算子配置 -->
          <Col :span="10">
            <Card title="基本信息" class="mb-4">
              <Form.Item
                label="特征工程名称"
                name="name"
                :rules="nameRules"
              >
                <Tooltip v-if="isEditMode" title="编辑模式下名称不可修改">
                  <Input
                    v-model:value="formState.name"
                    placeholder="字母开头，只允许字母、数字、下划线、中划线"
                    :disabled="isEditMode"
                  />
                </Tooltip>
                <Input
                  v-else
                  v-model:value="formState.name"
                  placeholder="字母开头，只允许字母、数字、下划线、中划线"
                />
              </Form.Item>

              <Form.Item label="描述" name="description">
                <Input.TextArea
                  v-model:value="formState.description"
                  placeholder="请输入描述（可选）"
                  :rows="2"
                />
              </Form.Item>

              <Form.Item
                label="所属组织"
                :rules="[{ required: true, message: '请选择所属组织' }]"
              >
                <template v-if="isEditMode">
                  <div class="org-display">
                    <Tag v-if="formState.teamName" color="blue">
                      {{ formState.teamName }}
                    </Tag>
                    <span v-else class="text-gray-400">未设置</span>
                  </div>
                </template>
                <Cascader
                  v-else
                  :value="cascaderValue"
                  :options="organizationTree"
                  :show-search="true"
                  placeholder="请选择租户/部门/团队"
                  expand-trigger="hover"
                  :display-render="displayRender"
                  change-on-select
                  style="width: 100%"
                  @change="handleCascaderChange"
                />
              </Form.Item>

              <Row :gutter="16">
                <Col :span="12">
                  <Form.Item
                    label="数据区域"
                    name="zone"
                    :rules="[{ required: true, message: '请选择数据区域' }]"
                  >
                    <Select
                      v-model:value="formState.zone"
                      placeholder="请选择数据区域"
                      :disabled="isEditMode"
                      style="width: 100%"
                    >
                      <Select.Option
                        v-for="zone in zoneOptions"
                        :key="zone.value"
                        :value="zone.value"
                      >
                        {{ zone.label }}
                      </Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col :span="12">
                  <Form.Item
                    label="存储桶"
                    :rules="[{ required: true, message: '请选择存储桶' }]"
                  >
                    <template v-if="isEditMode">
                      <div class="org-display">
                        <Tag v-if="formState.bucketName" color="blue">
                          {{ formState.bucketName }}
                        </Tag>
                        <span v-else class="text-gray-400">未设置</span>
                      </div>
                    </template>
                    <Input
                      v-else
                      :value="selectedBucket?.name || ''"
                      placeholder="请选择存储桶"
                      readonly
                      @click="openBucketModal"
                      style="cursor: pointer;"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row :gutter="16">
                <Col :span="8">
                  <Form.Item
                    label="数据类型"
                    name="dataType"
                    :rules="[{ required: true, message: '请选择数据类型' }]"
                  >
                    <Select
                      v-model:value="formState.dataType"
                      placeholder="请选择"
                      style="width: 100%"
                    >
                      <Select.Option
                        v-for="type in configData.datasetTypes"
                        :key="type.value"
                        :value="type.value"
                      >
                        {{ type.label }}
                      </Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col :span="8">
                  <Form.Item label="子数据域" name="subDataArea">
                    <Select
                      v-model:value="formState.subDataArea"
                      placeholder="请选择"
                      style="width: 100%"
                    >
                      <Select.Option value="0">否</Select.Option>
                      <Select.Option value="1">是</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col :span="8">
                  <Form.Item label="是否加密">
                    <Switch
                      v-model:checked="formState.encryption"
                      checked-children="是"
                      un-checked-children="否"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title="数据源配置" class="mb-4">
              <template #extra>
                <Tag v-if="isEditMode" color="orange" size="small">
                  <LockOutlined /> 不可修改
                </Tag>
              </template>

              <Form.Item label="数据源" required>
                <Tooltip v-if="isEditMode" title="编辑模式下数据源不可修改">
                  <Select
                    v-model:value="formState.datasourceId"
                    placeholder="请选择数据源"
                    :loading="datasourceLoading"
                    :disabled="isEditMode"
                    style="width: 100%"
                  >
                    <Select.Option
                      v-for="ds in dataSources"
                      :key="ds.id"
                      :value="ds.id"
                    >
                      <DatabaseOutlined class="mr-2" />
                      {{ ds.name }} ({{ ds.type?.toUpperCase() }})
                    </Select.Option>
                  </Select>
                </Tooltip>
                <Select
                  v-else
                  v-model:value="formState.datasourceId"
                  placeholder="请选择数据源"
                  :loading="datasourceLoading"
                  @change="handleDatasourceChange"
                  style="width: 100%"
                >
                  <Select.Option
                    v-for="ds in dataSources"
                    :key="ds.id"
                    :value="ds.id"
                  >
                    <DatabaseOutlined class="mr-2" />
                    {{ ds.name }} ({{ ds.type?.toUpperCase() }})
                  </Select.Option>
                </Select>
              </Form.Item>

              <Row :gutter="16">
                <Col :span="12">
                  <Form.Item label="数据库" required>
                    <Select
                      v-model:value="formState.database"
                      placeholder="请选择数据库"
                      :loading="databaseLoading"
                      :disabled="isEditMode || !formState.datasourceId"
                      @change="handleDatabaseChange"
                      style="width: 100%"
                    >
                      <Select.Option v-for="db in databases" :key="db" :value="db">
                        {{ db }}
                      </Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col :span="12">
                  <Form.Item label="数据表" required>
                    <Select
                      v-model:value="formState.tableName"
                      placeholder="请选择数据表"
                      :loading="tableLoading"
                      :disabled="isEditMode || !formState.database"
                      @change="handleTableChange"
                      style="width: 100%"
                      show-search
                      :filter-option="(input: string, option: any) =>
                        option.value.toLowerCase().includes(input.toLowerCase())"
                    >
                      <Select.Option
                        v-for="table in tables"
                        :key="table.name"
                        :value="table.name"
                      >
                        <TableOutlined class="mr-2" />
                        {{ table.name }}
                      </Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <!-- 镜像选择 -->
            <Card title="镜像配置" class="mb-4">
              <template #extra>
                <Tag color="blue">Docker镜像</Tag>
              </template>

              <Form.Item
                label="选择镜像"
                :rules="[{ required: true, message: '请选择镜像' }]"
              >
                <Input
                  :value="formState.imageName || ''"
                  placeholder="点击选择镜像"
                  readonly
                  @click="openImageSelector"
                  style="cursor: pointer;"
                />
              </Form.Item>
            </Card>

            <!-- 特征算子配置 -->
            <Card title="特征算子配置" class="mb-4">
              <template #extra>
                <ExperimentOutlined />
              </template>

              <Form.Item
                label="选择算子"
                :rules="[{ required: true, message: '请选择特征算子' }]"
              >
                <Select
                  v-model:value="formState.operatorId"
                  placeholder="请先选择特征算子"
                  :loading="operatorLoading"
                  @change="handleOperatorChange"
                  style="width: 100%"
                >
                  <Select.OptGroup
                    v-for="category in ['format_conversion', 'feature_transform', 'data_cleaning']"
                    :key="category"
                    :label="getCategoryLabel(category)"
                  >
                    <Select.Option
                      v-for="op in featureOperators.filter(o => o.category === category)"
                      :key="op.id"
                      :value="op.id"
                    >
                      <div class="flex items-center justify-between">
                        <span>{{ op.name }}</span>
                        <Tag size="small" color="blue">{{ op.code }}</Tag>
                      </div>
                    </Select.Option>
                  </Select.OptGroup>
                </Select>
              </Form.Item>

              <div v-if="selectedOperator" class="operator-info mb-4">
                <div class="text-gray-500 text-sm mb-2">
                  {{ selectedOperator.description }}
                </div>
                <div class="flex items-center gap-2">
                  <Tag color="purple">{{ getCategoryLabel(selectedOperator.category) }}</Tag>
                  <Tag v-for="fmt in selectedOperator.outputFormats" :key="fmt" color="green">
                    {{ fmt.toUpperCase() }}
                  </Tag>
                </div>
              </div>

              <Form.Item
                v-if="selectedOperator"
                label="输出格式"
                :rules="[{ required: true, message: '请选择输出格式' }]"
              >
                <Select
                  v-model:value="formState.outputFormat"
                  placeholder="请选择输出格式"
                  style="width: 100%"
                >
                  <Select.Option
                    v-for="fmt in selectedOperator.outputFormats"
                    :key="fmt"
                    :value="fmt"
                  >
                    <FileOutlined class="mr-2" />
                    {{ fmt.toUpperCase() }}
                  </Select.Option>
                </Select>
              </Form.Item>

              <!-- 算子参数配置 -->
              <Collapse v-if="selectedOperator && Object.keys(selectedOperator.parameterSchema).length > 0">
                <Collapse.Panel key="params" header="算子参数配置">
                  <template #extra>
                    <SettingOutlined />
                  </template>
                  <Row :gutter="16">
                    <Col
                      v-for="(param, key) in selectedOperator.parameterSchema"
                      :key="key"
                      :span="12"
                    >
                      <Form.Item :label="param.label">
                        <!-- Select 类型 -->
                        <Select
                          v-if="param.type === 'select'"
                          v-model:value="operatorParamsConfig[key]"
                          style="width: 100%"
                        >
                          <Select.Option
                            v-for="opt in param.options"
                            :key="typeof opt === 'string' ? opt : opt.value"
                            :value="typeof opt === 'string' ? opt : opt.value"
                          >
                            {{ typeof opt === 'string' ? opt : opt.label }}
                          </Select.Option>
                        </Select>
                        <!-- Number 类型 -->
                        <InputNumber
                          v-else-if="param.type === 'number'"
                          v-model:value="operatorParamsConfig[key]"
                          :min="param.min"
                          :max="param.max"
                          style="width: 100%"
                        />
                        <!-- Switch 类型 -->
                        <Switch
                          v-else-if="param.type === 'switch'"
                          v-model:checked="operatorParamsConfig[key]"
                        />
                        <!-- Input 类型 -->
                        <Input
                          v-else
                          v-model:value="operatorParamsConfig[key]"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </Collapse.Panel>
              </Collapse>
            </Card>

            <!-- 输出配置 -->
            <Card title="输出配置">
              <template #extra>
                <FolderOutlined />
              </template>

              <Form.Item label="输出方式">
                <Radio.Group v-model:value="formState.pushToDataset">
                  <Radio :value="true">推送至数据集</Radio>
                  <Radio :value="false">指定输出路径</Radio>
                </Radio.Group>
              </Form.Item>

              <template v-if="formState.pushToDataset">
                <Form.Item
                  label="目标数据集"
                  :rules="[{ required: true, message: '请输入或选择数据集名称' }]"
                >
                  <AutoComplete
                    v-model:value="formState.targetDatasetName"
                    :options="datasetOptions"
                    placeholder="输入新数据集名称或选择已有数据集"
                    style="width: 100%"
                    @select="handleDatasetSelect"
                    :filter-option="(input: string, option: any) =>
                      option.value.toLowerCase().includes(input.toLowerCase())"
                  >
                    <template #option="{ value, label }">
                      <div class="flex items-center justify-between">
                        <span>{{ label }}</span>
                        <Tag size="small" color="blue">已有</Tag>
                      </div>
                    </template>
                  </AutoComplete>
                  <div class="text-gray-400 text-xs mt-1">
                    <template v-if="formState.targetDatasetId">
                      <Tag color="green" size="small">已有数据集</Tag> 将追加到此数据集
                    </template>
                    <template v-else-if="formState.targetDatasetName">
                      <Tag color="orange" size="small"><PlusOutlined /> 新建数据集</Tag> 将创建新数据集
                    </template>
                    <template v-else>
                      输入新名称创建数据集，或从下拉列表选择已有数据集
                    </template>
                  </div>
                </Form.Item>
              </template>

              <template v-else>
                <Form.Item
                  label="输出路径"
                  name="outputPath"
                  :rules="[{ required: true, message: '请输入输出路径' }]"
                >
                  <Input
                    v-model:value="formState.outputPath"
                    placeholder="请输入输出路径，如：/output/feature_data"
                  />
                </Form.Item>
              </template>
            </Card>
          </Col>

          <!-- 右侧：字段选择与特征属性配置 -->
          <Col :span="14">
            <Card title="选择字段与特征属性配置">
              <template #extra>
                <div class="flex items-center gap-4">
                  <Checkbox
                    :checked="selectedColumns.length === columns.length && columns.length > 0"
                    :indeterminate="selectedColumns.length > 0 && selectedColumns.length < columns.length"
                    @change="(e: any) => handleSelectAll(e.target.checked)"
                    :disabled="columns.length === 0"
                  >
                    全选
                  </Checkbox>
                  <span class="text-gray-500">
                    已选择 {{ selectedColumns.length }} / {{ columns.length }} 个字段
                  </span>
                  <Button @click="handlePreview" :disabled="!formState.tableName" size="small">
                    <EyeOutlined /> 预览数据
                  </Button>
                </div>
              </template>

              <div v-if="!selectedOperator" class="text-center py-8 text-gray-400">
                <ExperimentOutlined style="font-size: 48px" class="mb-4" />
                <p>请先在左侧选择特征算子，然后配置字段的特征属性</p>
              </div>

              <Table
                v-else
                :columns="columnTableColumns"
                :data-source="columns"
                :loading="columnLoading"
                :pagination="false"
                row-key="name"
                size="small"
                :scroll="{ x: 'max-content', y: 500 }"
                :locale="{ emptyText: '请先选择数据表' }"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'select'">
                    <Checkbox
                      :checked="selectedColumns.includes(record.name)"
                      @change="(e: any) => handleColumnSelect(record.name, e.target.checked)"
                    />
                  </template>
                  <template v-else-if="column.key === 'nullable'">
                    {{ record.nullable ? '是' : '否' }}
                  </template>
                  <!-- 动态渲染特征属性列 -->
                  <template v-else-if="column.key?.startsWith('feature_')">
                    <template v-for="featureCol in selectedOperator?.featureColumns" :key="featureCol.key">
                      <template v-if="column.key === `feature_${featureCol.key}`">
                        <template v-if="selectedColumns.includes(record.name)">
                          <!-- Select 类型 -->
                          <Select
                            v-if="featureCol.type === 'select'"
                            :value="fieldFeatureConfigs[record.name]?.[featureCol.key]"
                            @change="(v: any) => updateFieldFeatureConfig(record.name, featureCol.key, v)"
                            size="small"
                            style="width: 100%"
                          >
                            <Select.Option
                              v-for="opt in featureCol.options"
                              :key="opt.value"
                              :value="opt.value"
                            >
                              {{ opt.label }}
                            </Select.Option>
                          </Select>
                          <!-- Input 类型 -->
                          <Input
                            v-else-if="featureCol.type === 'input'"
                            :value="fieldFeatureConfigs[record.name]?.[featureCol.key]"
                            @change="(e: any) => updateFieldFeatureConfig(record.name, featureCol.key, e.target.value)"
                            size="small"
                            :placeholder="featureCol.placeholder"
                          />
                          <!-- Number 类型 -->
                          <InputNumber
                            v-else-if="featureCol.type === 'number'"
                            :value="fieldFeatureConfigs[record.name]?.[featureCol.key]"
                            @change="(v: any) => updateFieldFeatureConfig(record.name, featureCol.key, v)"
                            size="small"
                            :min="featureCol.min"
                            :max="featureCol.max"
                            style="width: 100%"
                          />
                          <!-- Switch 类型 -->
                          <Switch
                            v-else-if="featureCol.type === 'switch'"
                            :checked="fieldFeatureConfigs[record.name]?.[featureCol.key]"
                            @change="(v: any) => updateFieldFeatureConfig(record.name, featureCol.key, v)"
                            size="small"
                          />
                        </template>
                        <span v-else class="text-gray-300">-</span>
                      </template>
                    </template>
                  </template>
                </template>
              </Table>
            </Card>
          </Col>
        </Row>
      </Form>
    </div>

    <!-- Step 2: 调度与通知配置 -->
    <div v-show="currentStep === 1">
      <Row :gutter="24">
        <Col :span="24">
          <!-- 周期调度配置 -->
          <Card class="mb-4">
            <template #title>
              <Checkbox v-model:checked="scheduleConfigState.isActive">
                开启周期调度
              </Checkbox>
            </template>

            <div v-if="scheduleConfigState.isActive" class="scheduling-config">
              <!-- 调度类型选择 -->
              <Form.Item label="调度类型">
                <Radio.Group
                  v-model:value="scheduleConfigState.intervalType"
                  button-style="solid"
                >
                  <Radio.Button value="daily">每天</Radio.Button>
                  <Radio.Button value="weekly">每周</Radio.Button>
                  <Radio.Button value="monthly">每月</Radio.Button>
                  <Radio.Button value="hourly">每小时</Radio.Button>
                  <Radio.Button value="cron">Cron表达式</Radio.Button>
                  <Radio.Button value="interval">周期间隔</Radio.Button>
                  <Radio.Button value="once">预约调度</Radio.Button>
                </Radio.Group>
              </Form.Item>

              <!-- 每天调度配置 -->
              <Row v-if="scheduleConfigState.intervalType === 'daily'" :gutter="16">
                <Col :span="8">
                  <Form.Item label="开始时间">
                    <Input
                      v-model:value="scheduleConfigState.dailyTime"
                      type="time"
                      placeholder="23:00"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <!-- 每周调度配置 -->
              <Row v-if="scheduleConfigState.intervalType === 'weekly'" :gutter="16">
                <Col :span="12">
                  <Form.Item label="选择星期">
                    <Select
                      v-model:value="scheduleConfigState.weeklyDays"
                      mode="multiple"
                      placeholder="选择星期"
                      :options="weekDayOptions"
                    />
                  </Form.Item>
                </Col>
                <Col :span="12">
                  <Form.Item label="执行时间">
                    <Input
                      v-model:value="scheduleConfigState.weeklyTime"
                      type="time"
                      placeholder="23:00"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <!-- 每月调度配置 -->
              <Row v-if="scheduleConfigState.intervalType === 'monthly'" :gutter="16">
                <Col :span="8">
                  <Form.Item label="每月几号">
                    <InputNumber
                      v-model:value="scheduleConfigState.monthlyDay"
                      :min="1"
                      :max="31"
                      placeholder="1-31"
                      style="width: 100%"
                    />
                  </Form.Item>
                </Col>
                <Col :span="8">
                  <Form.Item label="执行时间">
                    <Input
                      v-model:value="scheduleConfigState.monthlyTime"
                      type="time"
                      placeholder="23:00"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <!-- 每小时调度配置 -->
              <Row v-if="scheduleConfigState.intervalType === 'hourly'" :gutter="16">
                <Col :span="8">
                  <Form.Item label="开始分钟">
                    <Input
                      v-model:value="scheduleConfigState.hourlyMinute"
                      placeholder="0-59"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <!-- Cron表达式 -->
              <Row v-if="scheduleConfigState.intervalType === 'cron'" :gutter="16">
                <Col :span="12">
                  <Form.Item label="Cron表达式">
                    <Input
                      v-model:value="scheduleConfigState.cronExpression"
                      placeholder="* * * * *"
                    />
                    <div class="mt-1 text-sm text-gray-500">
                      使用标准cron表达式格式（分 时 日 月 周）
                    </div>
                  </Form.Item>
                </Col>
              </Row>

              <!-- 周期间隔 -->
              <div v-if="scheduleConfigState.intervalType === 'interval'">
                <Row :gutter="16">
                  <Col :span="6">
                    <Form.Item label="间隔时长">
                      <InputNumber
                        v-model:value="scheduleConfigState.intervalDuration"
                        :min="1"
                        style="width: 100%"
                      />
                    </Form.Item>
                  </Col>
                  <Col :span="6">
                    <Form.Item label="周期类型">
                      <Select
                        v-model:value="scheduleConfigState.intervalUnit"
                        :options="[
                          { value: 'hours', label: '小时' },
                          { value: 'days', label: '天' },
                          { value: 'weeks', label: '周' },
                          { value: 'months', label: '月' },
                        ]"
                      />
                    </Form.Item>
                  </Col>
                  <Col :span="6">
                    <Form.Item label="偏移时间">
                      <Input
                        v-model:value="scheduleConfigState.offsetTime"
                        placeholder="HH:mm"
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row :gutter="16">
                  <Col :span="12">
                    <Form.Item label="任务起止时间">
                      <DatePicker.RangePicker
                        v-model:value="scheduleConfigState.dateRange"
                        show-time
                        format="YYYY-MM-DD HH:mm"
                        style="width: 100%"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              <!-- 预约调度 -->
              <Row v-if="scheduleConfigState.intervalType === 'once'" :gutter="16">
                <Col :span="8">
                  <Form.Item label="执行时间">
                    <DatePicker
                      v-model:value="scheduleConfigState.onceTime"
                      show-time
                      format="YYYY-MM-DD HH:mm"
                      style="width: 100%"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <div v-else class="text-center py-4 text-gray-400">
              <ClockCircleOutlined style="font-size: 32px" class="mb-2" />
              <p>启用周期调度后，可以设置定时执行任务</p>
            </div>
          </Card>

          <!-- 通知模板配置 -->
          <Card>
            <template #title>
              <Checkbox v-model:checked="notificationConfigState.isActive">
                开启通知模板
              </Checkbox>
            </template>

            <div v-if="notificationConfigState.isActive" class="notification-config">
              <Row :gutter="16">
                <Col :span="12">
                  <Form.Item label="通知人">
                    <Input
                      v-model:value="notificationConfigState.notificationUserID"
                      placeholder="请输入通知接收人ID"
                    />
                  </Form.Item>
                </Col>
                <Col :span="12">
                  <Form.Item label="通知标题">
                    <Input
                      v-model:value="notificationConfigState.notificationTitle"
                      placeholder="请输入通知标题"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="通知内容">
                <Input.TextArea
                  v-model:value="notificationConfigState.notificationContent"
                  :rows="4"
                  placeholder="请输入通知内容"
                />
              </Form.Item>

              <!-- 高级设置 - 通知触发条件 -->
              <div class="advanced-settings mt-4">
                <h4 class="mb-2 flex items-center text-sm font-medium text-gray-700">
                  <span>高级设置</span>
                  <Tooltip title="配置通知的触发条件">
                    <QuestionCircleOutlined class="ml-1 text-gray-400" />
                  </Tooltip>
                </h4>
                <Form.Item label="触发条件">
                  <Radio.Group
                    v-model:value="notificationConfigState.notificationTrigger"
                    class="notification-trigger-radio"
                  >
                    <Radio
                      v-for="option in notificationTriggerOptions"
                      :key="option.value"
                      :value="option.value"
                      class="notification-radio-item"
                    >
                      <div class="flex flex-col">
                        <span class="font-medium">{{ option.label }}</span>
                        <span class="text-xs text-gray-500">{{ option.description }}</span>
                      </div>
                    </Radio>
                  </Radio.Group>
                </Form.Item>
              </div>
            </div>

            <div v-else class="text-center py-4 text-gray-400">
              <ExclamationCircleOutlined style="font-size: 32px" class="mb-2" />
              <p>启用通知模板后，可以在任务执行完成时发送通知</p>
            </div>
          </Card>
        </Col>
      </Row>
    </div>

    <!-- 底部按钮 -->
    <div class="mt-6 flex justify-end gap-4">
      <Button v-if="currentStep > 0" @click="handlePrev">
        上一步
      </Button>
      <Button v-if="currentStep < 1" type="primary" @click="handleNext">
        下一步
      </Button>
      <Button
        v-if="currentStep === 1"
        type="primary"
        @click="handleSave"
        :loading="loading"
      >
        <SaveOutlined /> 保存
      </Button>
    </div>

    <!-- 预览数据弹窗 -->
    <Modal
      v-model:open="previewVisible"
      title="数据预览"
      width="90%"
      :footer="null"
    >
      <Table
        :columns="previewColumns"
        :data-source="previewData.rows"
        :loading="previewLoading"
        :pagination="{ pageSize: 10 }"
        :scroll="{ x: 'max-content' }"
        size="small"
        row-key="(record: any, index: number) => index"
      />
      <div class="text-right text-gray-500 mt-2">
        共 {{ previewData.total }} 条记录（仅显示前 100 条）
      </div>
    </Modal>

    <!-- 存储桶选择弹窗 -->
    <Modal
      v-model:open="bucketModalVisible"
      title="选择存储桶"
      width="800px"
      :footer="null"
      destroy-on-close
    >
      <div class="mb-4">
        <Input
          v-model:value="bucketSearchValue"
          placeholder="搜索存储桶名称或标识符"
          allow-clear
          style="width: 300px"
        >
          <template #prefix>
            <SearchOutlined class="text-gray-400" />
          </template>
        </Input>
      </div>

      <div v-if="selectedOrg.tenantUid" class="mb-4 text-sm text-blue-600">
        当前租户: {{ selectedOrg.tenantUid }}
      </div>

      <Radio.Group v-model:value="radioValue" class="w-full">
        <Table
          :data-source="filteredBuckets"
          :columns="[
            { title: '选择', key: 'selection', width: '60px' },
            { title: '存储桶名称', dataIndex: 'name', key: 'name' },
            { title: '标识符', dataIndex: 'identifier', key: 'identifier' },
            { title: '类型', key: 'type', width: '100px' },
            { title: '存储使用情况', key: 'usage', width: '300px' },
          ]"
          row-key="uid"
          :pagination="{ pageSize: 5 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'selection'">
              <Radio :value="record.uid" />
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
              <SyncOutlined spin class="mb-2 text-xl text-blue-500" />
              <p class="mt-2">加载存储桶中...</p>
            </div>
            <div v-else-if="selectedOrg.tenantUid" class="py-8 text-center">
              <p class="text-gray-500">没有找到符合条件的存储桶</p>
              <p class="mt-2 text-sm text-gray-400">
                请确认当前租户有权限访问存储桶
              </p>
            </div>
            <div v-else class="py-8 text-center">
              <p class="text-gray-500">请先选择所属组织</p>
            </div>
          </template>
        </Table>
      </Radio.Group>

      <div class="mt-4 text-right">
        <Button type="primary" @click="selectBucket">确认选择</Button>
      </div>
    </Modal>

    <!-- 镜像选择弹窗 -->
    <Modal
      v-model:open="showImageDialog"
      title="选择镜像"
      width="800px"
      @cancel="selectedImageUid = ''"
      :after-close="() => (searchImageKey = '')"
    >
      <div class="image-selector">
        <div class="mb-4 flex justify-between">
          <Input.Search
            v-model:value="searchImageKey"
            placeholder="输入镜像名称或标签搜索..."
            class="w-64"
          />
          <Button type="primary" @click="loadDockerImages" :loading="loadingImages">
            <SyncOutlined :spin="loadingImages" />
            刷新镜像
          </Button>
        </div>

        <Table
          :columns="imageColumns"
          :data-source="filteredImages"
          :pagination="{ pageSize: 5 }"
          row-key="uid"
          :loading="loadingImages"
          :custom-row="(record: DockerFile) => ({ onClick: () => handleImageRowClick(record) })"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'selection'">
              <Radio
                :checked="selectedImageUid === record.uid"
                @click.stop="selectedImageUid = record.uid"
              />
            </template>
            <template v-if="column.dataIndex === 'name'">
              <div class="font-medium">{{ record.name }}</div>
            </template>
            <template v-if="column.dataIndex === 'tags'">
              <div class="flex flex-wrap gap-1">
                <Tag
                  v-for="tag in (record.tags ? record.tags.split(',').slice(0, 3) : [])"
                  :key="tag"
                  color="blue"
                >
                  {{ tag }}
                </Tag>
              </div>
            </template>
            <template v-if="column.dataIndex === 'created_at'">
              {{ new Date(record.created_at).toLocaleDateString() }}
            </template>
            <template v-if="column.dataIndex === 'action'">
              <Button
                type="link"
                size="small"
                @click.stop="Modal.info({
                  title: 'Dockerfile 内容',
                  width: '60%',
                  content: record.content,
                })"
              >
                查看内容
              </Button>
            </template>
          </template>

          <template #emptyText>
            <div v-if="loadingImages" class="py-8 text-center">
              <SyncOutlined spin class="mb-2 text-xl text-blue-500" />
              <p>正在加载镜像列表...</p>
            </div>
            <div v-else class="py-8 text-center text-gray-500">
              <ExclamationCircleOutlined class="mb-2 text-xl" />
              <p>暂无镜像数据</p>
              <Button type="link" @click="loadDockerImages">重新加载</Button>
            </div>
          </template>
        </Table>
      </div>

      <template #footer>
        <Button @click="showImageDialog = false">取消</Button>
        <Button
          type="primary"
          @click="handleImageConfirm"
          :disabled="!selectedImageUid"
        >
          确定
        </Button>
      </template>
    </Modal>
  </Card>
</template>

<style scoped>
:deep(.ant-table-thead > tr > th) {
  font-weight: 600;
}

.org-display {
  padding: 8px 12px;
  background-color: #f5f5f5;
  border-radius: 4px;
  min-height: 40px;
  display: flex;
  align-items: center;
}

:deep(.ant-input-disabled),
:deep(.ant-select-disabled .ant-select-selector) {
  background-color: #f5f5f5 !important;
  color: rgba(0, 0, 0, 0.65) !important;
}

:deep(.ant-input[readonly]) {
  cursor: pointer;
}

:deep(.ant-input[readonly]:hover) {
  border-color: var(--ant-color-primary);
}

:deep(.ant-radio-group) {
  width: 100%;
}

.operator-info {
  padding: 12px;
  background-color: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #eee;
}

:deep(.ant-collapse-header) {
  padding: 8px 12px !important;
}

:deep(.ant-table-cell) {
  padding: 8px !important;
}

.notification-trigger-radio {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.notification-radio-item {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  padding: 12px 16px;
  margin: 0 !important;
  transition: all 0.3s;
}

.notification-radio-item:hover {
  border-color: #1890ff;
  background-color: #f0f9ff;
}

:deep(.ant-radio-wrapper-checked.notification-radio-item) {
  border-color: #1890ff;
  background-color: #e6f7ff;
}

.advanced-settings {
  border-top: 1px solid #f0f0f0;
  padding-top: 16px;
}

.image-selector :deep(.ant-table-row) {
  cursor: pointer;
  transition: background-color 0.2s;
}

.image-selector :deep(.ant-table-row:hover) {
  background-color: #f0f7ff;
}

:deep(.ant-steps) {
  margin-bottom: 24px;
}
</style>
