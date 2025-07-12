<script lang="ts" setup>
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Button, Card, Table } from 'ant-design-vue';

const router = useRouter();
// 定义任务详情数据结构
interface TaskDetail {
  taskStep1: {
    describe: string;
    encryption: string;
    image: string;
    podType: string;
    resources: string;
    taskName: string;
    taskType: string;
    taskZone: string;
    trainType: string;
  };
  taskStep2: {
    algorithmName: string;
    algorithmVersion: string;
    datasets: Array<{
      id: string;
      name: string;
      selectedName: string;
    }>;
    taskroute: string;
  };
  taskStep3: {
    customVariables: Array<{
      id: string;
      name: string;
      value: string;
    }>;
    trainConfig: {
      content: string;
      format: string;
    };
  };
  taskStep4: {
    notificationConfig: {
      isActive: boolean;
      notificationContent: string;
      notificationTitle: string;
      notificationUserID: string;
    };
    outputConfig: {
      autoPublish: boolean;
      isActive: boolean;
      outputPath: string;
      outputType: string;
    };
    scheduleConfig: {
      cronExpression: string;
      dailyTime: string;
      dateRange: string[];
      hourlyMinute: string;
      intervalDuration: number;
      intervalType: string;
      intervalUnit: string;
      isActive: boolean;
      offsetTime: string;
      weeklyDays: string[];
      weeklyTime: string;
    };
  };
}
interface DataItem {
  tabActiveKey: string;
  key: number;
  name: string;
  platform: string;
  version: string;
  upgradeNum: number;
  creator: string;
  createdAt: string;
  detail?: TaskDetail;
}

interface InnerDataItem {
  key: number;
  date: string;
  name: string;
  upgradeNum: string;
}

const columns = [
  { title: '数据集名称', dataIndex: 'name', key: 'name' },
  { title: '版本', dataIndex: 'platform', key: 'platform' },
  { title: '大小', dataIndex: 'version', key: 'version' },
  { title: '修改者', dataIndex: 'upgradeNum', key: 'upgradeNum' },
  { title: '更新时间', dataIndex: 'creator', key: 'creator' },
  { title: '描述', dataIndex: 'createdAt', key: 'createdAt' },
  { title: '操作', key: 'operation' },
];
// 创建任务详情数据
const createTaskDetail = (): TaskDetail => ({
  taskStep1: {
    taskName: '1',
    taskType: '1',
    encryption: '1',
    taskZone: '0',
    podType: '0',
    resources: 'GPU-V100',
    trainType: '0',
    image: 'TensorFlow 2.9@v2.9.0',
    describe: 'ss',
  },
  taskStep2: {
    algorithmName: '神经网络',
    algorithmVersion: 'v2.1.3',
    datasets: [
      {
        id: 'a89239b1-2cef-434f-a412-c5004fcdc151',
        name: 'dis',
        selectedName: 'IMDB',
      },
    ],
    taskroute: 'main.py',
  },
  taskStep3: {
    customVariables: [
      {
        id: '0412b02e-781b-4253-b8cd-adf48bce70c5',
        name: 'ss',
        value: 'ss',
      },
    ],
    trainConfig: {
      content: 'uuu',
      format: 'txt',
    },
  },
  taskStep4: {
    scheduleConfig: {
      intervalType: 'daily',
      cronExpression: '',
      dailyTime: '',
      dateRange: [],
      hourlyMinute: '',
      intervalDuration: 1,
      intervalUnit: 'hours',
      offsetTime: '',
      weeklyDays: [],
      weeklyTime: '',
      isActive: false,
    },
    outputConfig: {
      autoPublish: true,
      isActive: true,
      outputPath: '数据输出',
      outputType: '数据输出',
    },
    notificationConfig: {
      notificationContent: '',
      notificationTitle: '',
      notificationUserID: '',
      isActive: false,
    },
  },
});
const data: DataItem[] = [];
for (let i = 0; i < 3; ++i) {
  data.push({
    tabActiveKey: '3',
    key: i,
    name: `Screem ${i + 1}`,
    platform: 'iOS',
    version: '10.3.4.5654',
    upgradeNum: 500,
    creator: 'Jack',
    createdAt: '2014-12-24 23:12:00',
    detail: createTaskDetail(),
  });
}

const executeRecordData = [
  { title: '算法名称', dataIndex: 'algorithmName', key: 'algorithmName' },
  { title: '状态', dataIndex: 'taskType', key: 'taskType' },
  { title: '周期时间', dataIndex: 'scheduleTime', key: 'scheduleTime' },
  { title: '开始时间', dataIndex: 'taskStartTime', key: 'taskStartTime' },
  { title: '结束时间', dataIndex: 'taskEndTime', key: 'taskEndTime' },
  {
    title: '执行时间',
    dataIndex: 'taskExecutionTime',
    key: 'taskExecutionTime',
  },
  {
    title: '操作',
    dataIndex: 'operation',
    key: 'operation',
  },
];

const innerData: InnerDataItem[] = [];
for (let i = 0; i < 3; ++i) {
  innerData.push({
    key: i,
    date: '2014-12-24 23:12:00',
    name: `This is production name ${i + 1}`,
    upgradeNum: 'Upgraded: 56',
  });
}

// 添加搜索相关逻辑
const searchName = ref('');
const searchType = ref('');

// 获取所有任务类型选项
const platformOptions = [...new Set(data.map((item) => item.platform))];

// 过滤后的数据
const filteredData = computed(() => {
  return data.filter((item) => {
    const nameMatch = item.name
      .toLowerCase()
      .includes(searchName.value.toLowerCase());
    const typeMatch = searchType.value
      ? item.platform === searchType.value
      : true;
    return nameMatch && typeMatch;
  });
});
const handleAdd = () => {
  router.push({ path: '/MTP/modeloutput/outputcreate' });
};
const handleNameClick = (record: DataItem) => {
  router.push({
    path: '/MTP/train/task',
    query: { id: record.key }, // 传递任务ID
  });
};
const state = reactive({
  selectedRowKeys: [] as number[], // 存储选中行的key
  loading: false, // 删除按钮的加载状态
});

// 计算是否有选中的行
const hasSelected = computed(() => state.selectedRowKeys.length > 0);

// 处理选择变化
const onSelectChange = (selectedRowKeys: number[]) => {
  state.selectedRowKeys = selectedRowKeys;
};

// 批量删除函数
const handleBatchDelete = () => {
  state.loading = true;
  // 模拟异步删除操作
  setTimeout(() => {
    // 实际项目中这里应该是调用API删除
    // 这里从数据源中移除选中的行
    const newData = data.filter(
      (item) => !state.selectedRowKeys.includes(item.key),
    );
    data.splice(0, data.length, ...newData); // 更新原始数据

    state.loading = false;
    state.selectedRowKeys = [];
  }, 1000);
};
</script>
<template>
  <Card class="p-4 shadow">
    <div class="mb-4 flex w-full justify-between">
      <div>
        <Button type="primary" @click="handleAdd"> 新增s输出 </Button>
        <Button
          type="primary"
          danger
          :disabled="!hasSelected"
          :loading="state.loading"
          @click="handleBatchDelete"
          style="margin-left: 8px"
        >
          批量删除
        </Button>
        <span style="margin-left: 8px">
          <template v-if="hasSelected">
            {{ `已选择 ${state.selectedRowKeys.length} 项` }}
          </template>
        </span>
      </div>
    </div>

    <Table
      :columns="columns"
      :row-selection="{
        selectedRowKeys: state.selectedRowKeys,
        onChange: onSelectChange,
      }"
      row-key="key"
      :data-source="filteredData"
      class="custom-table"
      bordered
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <a @click="handleNameClick(record)">{{ record.name }}</a>
        </template>
        <template v-if="column.key === 'operation'">
          <Button type="link" size="small">查看目录</Button>
          <span class="divider"></span>
          <Button type="link" size="small">删除</Button>
        </template>
      </template>
      <template #expandedRowRender="{ record }"> </template>
    </Table>
  </Card>
</template>
<style scoped>
/* 表格边框样式 */
.custom-table {
  border: 1px solid #e8e8e8;
  border-radius: 4px;
}

/* 表头样式 */
.custom-table :deep(.ant-table-thead) > tr > th {
  background-color: #f0f8ff; /* 淡灰蓝色 */
  color: #2c3e50; /* 文字颜色 */
  font-weight: 600;
  border-bottom: 1px solid #d9d9d9 !important;
}

/* 表格单元格边框 */
.custom-table :deep(.ant-table-tbody) > tr > td {
  border-right: 1px solid #e8e8e8;
}

/* 最后单元格去掉右边框 */
.custom-table :deep(.ant-table-tbody) > tr > td:last-child {
  border-right: none;
}

/* 行悬停效果 */
.custom-table :deep(.ant-table-tbody) > tr:hover > td {
  background-color: #fafafa;
}
/* 添加链接样式 */
.custom-table :deep(.ant-table-tbody) a {
  color: #1890ff;
  cursor: pointer;
}
.custom-table :deep(.ant-table-tbody) a:hover {
  color: #40a9ff;
}
/* 添加卡片样式 */
.mb-6 {
  margin-bottom: 1.5rem;
}

/* 描述列表样式 */
:deep(.ant-descriptions-item-label) {
  font-weight: 600;
  background-color: #fafafa;
  width: 150px;
}

/* 预格式化文本样式 */
pre {
  background-color: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  overflow: auto;
  max-height: 150px;
  margin: 0;
}

/* 分隔线样式 */
.section-divider {
  display: flex;
  align-items: center;
  margin: 24px 0 16px;
}

.divider-line {
  flex-grow: 1;
  height: 1px;
  background-color: #e8e8e8;
}

.divider-title {
  padding: 0 12px;
  font-weight: 600;
  color: #1890ff;
  white-space: nowrap;
}
/* 添加上游依赖样式 */
/* 添加依赖项样式 */
.dependency-item {
  border: 1px solid #e8e8e8;
  background-color: #fafafa;
}

.dependency-selectors {
  display: flex;
  margin-bottom: 16px;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
}

.selected-info {
  padding: 12px 16px;
  background-color: #f0f8ff;
  border: 1px solid #91d5ff;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.selected-text {
  font-weight: 500;
}

.delete-btn {
  color: #ff4d4f;
  padding: 0;
}

.confirmed-mode,
.edit-mode {
  transition: all 0.3s ease;
}

.no-dependencies {
  border: 1px dashed #d9d9d9;
  border-radius: 4px;
}
.upstream-dependency {
  padding: 16px;
}

.dependency-selectors {
  display: flex;
  margin-bottom: 16px;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
}

.selected-info {
  padding: 12px 16px;
  background-color: #f0f8ff;
  border: 1px solid #91d5ff;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.selected-text {
  font-weight: 500;
}

.delete-btn {
  color: #ff4d4f;
  padding: 0;
}

.confirmed-mode,
.edit-mode {
  transition: all 0.3s ease;
}
/* 添加下游任务样式 */
.downstream-tasks {
  padding: 16px;
}

.task-header {
  display: flex;
  padding: 8px 12px;
  background-color: #f0f8ff;
  border-bottom: 1px solid #91d5ff;
  font-weight: 600;
}

.task-item {
  display: flex;
  padding: 12px;
  border-bottom: 1px solid #e8e8e8;
}

.task-item:hover {
  background-color: #fafafa;
}

.no-tasks {
  padding: 24px;
  text-align: center;
  color: #999;
  font-size: 16px;
}
</style>
