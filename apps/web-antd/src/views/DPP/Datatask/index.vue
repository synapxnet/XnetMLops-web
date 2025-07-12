<script lang="ts" setup>
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Table,
  TabPane,
  Tabs,
} from 'ant-design-vue';

const router = useRouter();
// 定义数据集详情数据结构
interface DatasetDetail {
  datasetFile: string;
  datasetType: string;
  datasetZone: string;
  encryption: string;
  subDataArea: string;
  bucket: string;
  describe?: string;
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
  detail?: DatasetDetail;
}

// 创建数据集详情数据
const createDatasetDetail = (): DatasetDetail => ({
  datasetFile: `数据集${Math.floor(Math.random() * 1000)}`,
  datasetType: ['1', '2', '3'][Math.floor(Math.random() * 3)],
  datasetZone: ['1', '2', '3'][Math.floor(Math.random() * 3)],
  encryption: ['0', '1'][Math.floor(Math.random() * 2)],
  subDataArea: ['0', '1'][Math.floor(Math.random() * 2)],
  bucket: ['0', '1'][Math.floor(Math.random() * 2)],
  describe: '这是一个示例数据集描述',
});

const columns = [
  { title: '数据集名称', dataIndex: 'name', key: 'name' },
  { title: '类型', dataIndex: 'platform', key: 'platform' },
  { title: '大小', dataIndex: 'version', key: 'version' },
  { title: '修改者', dataIndex: 'upgradeNum', key: 'upgradeNum' },
  { title: '更新时间', dataIndex: 'creator', key: 'creator' },
  { title: '描述', dataIndex: 'createdAt', key: 'createdAt' },
  { title: '操作', key: 'operation' },
];

const data: DataItem[] = [];
for (let i = 0; i < 3; ++i) {
  data.push({
    tabActiveKey: '0', // 默认激活基本信息标签页
    key: i,
    name: `数据集 ${i + 1}`,
    platform: ['文本', '图像', '音频'][i],
    version: `${Math.floor(Math.random() * 100)}.${Math.floor(Math.random() * 10)} MB`,
    upgradeNum: 500,
    creator: `用户${i + 1}`,
    createdAt: `2024-0${i + 1}-${10 + i} 12:30:00`,
    detail: createDatasetDetail(),
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
  router.push({ path: '/DPP/Datatask/task' });
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
// 添加下游任务状态管理（示例数据）
const downstreamTasks = ref<
  Record<number, Array<{ name: string; type: string }>>
>({});

// 初始化下游任务数据（示例）
data.forEach((item) => {
  downstreamTasks.value[item.key] = [
    { name: '下游任务A', type: '数据任务' },
    { name: '下游任务B', type: '训练任务' },
    { name: '下游任务C', type: '训练任务' },
  ];
});
</script>
<template>
  <Card class="p-4 shadow">
    <div class="mb-4 flex w-full justify-between">
      <div>
        <Button type="primary" @click="handleAdd"> 新增数据任务 </Button>
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
      <template #expandedRowRender="{ record }">
        <Tabs
          :activekey="record.tabActiveKey"
          @update:active-key="(key) => (record.tabActiveKey = key)"
        >
          <TabPane key="0" tab="基本信息">
            <div class="p-4">
              <Descriptions bordered :column="2" layout="horizontal">
                <DescriptionsItem label="数据集名称">
                  {{ record.detail?.datasetFile }}
                </DescriptionsItem>
                <DescriptionsItem label="数据类型">
                  {{
                    record.detail?.datasetType === '1'
                      ? '文本'
                      : record.detail?.datasetType === '2'
                        ? '图像'
                        : '音频'
                  }}
                </DescriptionsItem>

                <DescriptionsItem label="数据区域">
                  {{
                    record.detail?.datasetZone === '1'
                      ? '南京'
                      : record.detail?.datasetZone === '2'
                        ? '江西'
                        : '广东'
                  }}
                </DescriptionsItem>
                <DescriptionsItem label="是否需要加密">
                  {{ record.detail?.encryption === '1' ? '是' : '否' }}
                </DescriptionsItem>

                <DescriptionsItem label="子数据域">
                  {{ record.detail?.subDataArea === '1' ? '是' : '否' }}
                </DescriptionsItem>
                <DescriptionsItem label="存储桶">
                  {{ record.detail?.bucket === '1' ? '是' : '否' }}
                </DescriptionsItem>

                <DescriptionsItem label="描述" :span="2">
                  {{ record.detail?.describe || '暂无描述' }}
                </DescriptionsItem>
              </Descriptions>
            </div>
          </TabPane>
          <!-- 可以添加其他标签页 -->
          <TabPane key="1" tab="关联任务">
            <Card class="p-4 shadow">
              <div class="downstream-tasks">
                <div
                  v-if="downstreamTasks[record.key]?.length"
                  class="task-list"
                >
                  <div class="task-header">
                    <div class="header-item" style="width: 40%">任务名称</div>
                    <div class="header-item" style="width: 40%">任务类型</div>
                  </div>

                  <div
                    v-for="(task, index) in downstreamTasks[record.key]"
                    :key="index"
                    class="task-item"
                  >
                    <div style="width: 40%">{{ task.name }}</div>
                    <div style="width: 40%">{{ task.type }}</div>
                  </div>
                </div>

                <div v-else class="no-tasks">
                  当前任务没有被任何下游任务依赖
                </div>
              </div>
            </Card>
          </TabPane>
        </Tabs>
      </template>
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
