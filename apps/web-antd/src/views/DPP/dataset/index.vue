<script lang="ts" setup>
// 添加必要的导入
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import {
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Input,
  message,
  Select,
  SelectOption,
  Table,
  TabPane,
  Tabs,
} from 'ant-design-vue';

// 导入API函数
import { deleteDataset, fetchDatasetList } from '../../SMP/api/dataset';

const router = useRouter();

// 定义数据集详情数据结构
interface DatasetDetail {
  id: number;
  name: string;
  type: string;
  zone: string;
  encryption: boolean;
  subDataArea: boolean;
  bucket: string;
  description?: string;
}

interface DataItem {
  id: number;
  tabActiveKey: string;
  name: string;
  platform: string;
  version: string;
  creator: string;
  createdAt: string;
  detail: DatasetDetail;
}

const columns = [
  { title: '数据集名称', dataIndex: 'name', key: 'name' },
  { title: '类型', dataIndex: 'platform', key: 'platform' },
  { title: '大小', dataIndex: 'version', key: 'version' },
  { title: '修改者', dataIndex: 'creator', key: 'creator' },
  { title: '更新时间', dataIndex: 'createdAt', key: 'createdAt' },
  { title: '操作', key: 'operation' },
];

// 数据集列表数据
const data = ref<DataItem[]>([]);
// 当前展开的行keys
const expandedRowKeys = ref<number[]>([]);
// 加载状态
const loading = ref(false);

// 从API加载数据集
const loadDatasets = async () => {
  loading.value = true;
  try {
    const datasets = await fetchDatasetList();

    // 转换数据格式
    data.value = datasets.map((ds) => ({
      id: ds.id,
      tabActiveKey: '0',
      name: ds.dataset_file,
      platform: getTypeLabel(ds.type),
      version: `${Math.floor(Math.random() * 100)}.${Math.floor(Math.random() * 10)} MB`, // 模拟大小
      creator: `用户${ds.userId}`,
      createdAt: ds.created_at ? new Date(ds.created_at).toLocaleString() : new Date().toLocaleString(),
      detail: {
        id: ds.id,
        name: ds.dataset_file,
        type: ds.type,
        zone: ds.zone,
        encryption: ds.encryption,
        subDataArea: ds.subdata_area,
        bucket: ds.bucket_name,
        description: ds.description,
      },
    }));

    // 检查是否需要展开新数据集
    const query = router.currentRoute.value.query;
    if (query.expanded === 'true' && query.newDatasetId) {
      const newId = Number.parseInt(query.newDatasetId as string);
      expandedRowKeys.value = [newId];

      // 清除查询参数
      router.replace({ path: '/DPP/dataset/index', query: {} });
    }
  } catch (error) {
    console.error('加载数据集失败:', error);
    message.error('加载数据集失败');
  } finally {
    loading.value = false;
  }
};

// 获取类型标签
const getTypeLabel = (type: string) => {
  switch (type) {
    case '1': {
      return '文本';
    }
    case '2': {
      return '图像';
    }
    case '3': {
      return '音频';
    }
    default: {
      return '未知';
    }
  }
};

// 初始化加载数据
onMounted(() => {
  loadDatasets();
  watch(
    () => router.currentRoute.value.query,
    (query) => {
      if (query.expanded === 'true' && query.newDatasetId) {
        const newId = Number(query.newDatasetId);
        nextTick(() => {
          expandedRowKeys.value = [newId];
        });
        setTimeout(() => {
          router.replace({ path: '/DPP/dataset/index', query: {} });
        }, 300);
      }
    },
    { immediate: true },
  );
});
const handleExpand = (expanded: boolean, record: DataItem) => {
  expandedRowKeys.value = expanded
    ? [...expandedRowKeys.value, record.id]
    : expandedRowKeys.value.filter((id) => id !== record.id);
};
// 添加搜索相关逻辑
const searchName = ref('');
const searchType = ref('');

// 获取所有任务类型选项
const platformOptions = computed(() => {
  return [...new Set(data.value.map((item) => item.platform))];
});

// 过滤后的数据
const filteredData = computed(() => {
  return data.value.filter((item) => {
    const nameMatch = (item.name || '')
      .toLowerCase()
      .includes((searchName.value || '').toLowerCase());
    const typeMatch = searchType.value
      ? item.platform === searchType.value
      : true;
    return nameMatch && typeMatch;
  });
});

const handleAdd = () => {
  router.push({ path: '/DPP/dataset/datafileCreate' });
};

// 点击数据集名称跳转到修改页面
const handleNameClick = (record: DataItem) => {
  router.push({
    path: '/DPP/dataset/datafileModify',
    query: { id: record.id },
  });
};

// 点击查看目录按钮跳转到文件管理页面
const handleViewDirectory = (record: DataItem) => {
  router.push({
    path: '/DPP/dataset/datafileManager',
    query: {
      id: record.id,
      name: record.name,
      type: record.platform,
    },
  });
};

const state = reactive({
  selectedRowKeys: [] as number[],
  loading: false,
});

// 计算是否有选中的行
const hasSelected = computed(() => state.selectedRowKeys.length > 0);

// 处理选择变化
const onSelectChange = (selectedRowKeys: number[]) => {
  state.selectedRowKeys = selectedRowKeys;
};

// 批量删除函数
const handleBatchDelete = async (ids?: number[]) => {
  const deleteIds = ids || state.selectedRowKeys;
  if (deleteIds.length === 0) return;

  state.loading = true;

  try {
    // 调用API删除
    await Promise.all(deleteIds.map((id) => deleteDataset(id)));

    message.success('删除数据集成功');
    // 重新加载数据
    await loadDatasets();
  } catch (error) {
    console.error('删除数据集失败', error);
    message.error('删除数据集失败');
  } finally {
    state.loading = false;
    // 清空选中状态
    if (!ids) {
      state.selectedRowKeys = [];
    }
  }
};

// 单条删除函数
const handleSingleDelete = async (id: number) => {
  try {
    await deleteDataset(id);
    message.success('删除数据集成功');
    await loadDatasets();
  } catch (error) {
    console.error('删除数据集失败', error);
    message.error('删除数据集失败');
  }
};
// 添加下游任务状态管理（示例数据）
const downstreamTasks = ref<
  Record<number, Array<{ name: string; type: string }>>
>({});

// 初始化下游任务数据（示例）
// 注意：这里需要在实际项目中替换为真实数据
const initDownstreamTasks = () => {
  downstreamTasks.value = {};
  data.value.forEach((item) => {
    downstreamTasks.value[item.id] = [
      { name: '下游任务A', type: '数据任务' },
      { name: '下游任务B', type: '训练任务' },
      { name: '下游任务C', type: '训练任务' },
    ];
  });
};

// 监听数据变化重新初始化下游任务
watch(data, initDownstreamTasks, { immediate: true });
</script>

<template>
  <Card class="p-4 shadow">
    <!-- 顶部操作区域 -->
    <div class="mb-4 flex w-full justify-between">
      <div>
        <Button type="primary" @click="handleAdd">新增数据集</Button>
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

      <!-- 搜索区域 -->
      <div class="flex space-x-2">
        <Input
          v-model:value="searchName"
          placeholder="搜索数据集名称"
          allow-clear
          style="width: 200px"
        />
        <Select
          v-model:value="searchType"
          placeholder="筛选类型"
          allow-clear
          style="width: 120px"
        >
          <SelectOption
            v-for="type in platformOptions"
            :key="type"
            :value="type"
          >
            {{ type }}
          </SelectOption>
        </Select>
      </div>
    </div>

    <!-- 数据集表格 -->
    <Table
      :columns="columns"
      @expand="handleExpand"
      :row-selection="{
        selectedRowKeys: state.selectedRowKeys,
        onChange: onSelectChange,
      }"
      :data-source="filteredData"
      :expanded-row-keys="expandedRowKeys"
      row-key="id"
      :loading="loading"
      class="custom-table"
      bordered
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <a @click="handleNameClick(record)">{{ record.name }}</a>
        </template>
        <template v-if="column.key === 'operation'">
          <Button type="link" size="small" @click="handleViewDirectory(record)">
            查看目录
          </Button>
          <span class="divider"></span>
          <Button
            type="link"
            size="small"
            @click="handleSingleDelete(record.id)"
          >
            删除
          </Button>
        </template>
      </template>

      <!-- 展开行内容 -->
      <template #expandedRowRender="{ record }">
        <Tabs
          :active-key="record.tabActiveKey"
          @update:active-key="(key) => (record.tabActiveKey = key)"
        >
          <TabPane key="0" tab="基本信息">
            <div class="p-4">
              <Descriptions bordered :column="2" layout="horizontal">
                <DescriptionsItem label="数据集名称">
                  {{ record.detail.name }}
                </DescriptionsItem>
                <DescriptionsItem label="数据类型">
                  {{ record.platform }}
                </DescriptionsItem>

                <DescriptionsItem label="数据区域">
                  {{
                    record.detail.zone === '1'
                      ? '南京'
                      : record.detail.zone === '2'
                        ? '江西'
                        : '广东'
                  }}
                </DescriptionsItem>
                <DescriptionsItem label="是否需要加密">
                  {{ record.detail.encryption ? '是' : '否' }}
                </DescriptionsItem>

                <DescriptionsItem label="子数据域">
                  {{ record.detail.subDataArea ? '是' : '否' }}
                </DescriptionsItem>
                <DescriptionsItem label="存储桶">
                  {{ record.detail.bucket }}
                </DescriptionsItem>

                <DescriptionsItem label="描述" :span="2">
                  {{ record.detail.description || '暂无描述' }}
                </DescriptionsItem>
              </Descriptions>
            </div>
          </TabPane>

          <TabPane key="1" tab="关联任务">
            <Card class="p-4 shadow">
              <div class="downstream-tasks">
                <div
                  v-if="downstreamTasks[record.id]?.length"
                  class="task-list"
                >
                  <div class="task-header">
                    <div class="header-item" style="width: 40%">任务名称</div>
                    <div class="header-item" style="width: 40%">任务类型</div>
                  </div>

                  <div
                    v-for="(task, index) in downstreamTasks[record.id]"
                    :key="index"
                    class="task-item"
                  >
                    <div style="width: 40%">{{ task.name }}</div>
                    <div style="width: 40%">{{ task.type }}</div>
                  </div>
                </div>

                <div v-else class="no-tasks">
                  当前数据集没有被任何下游任务依赖
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
  border: 1px solid var(--ant-color-border);
  border-radius: 4px;
}

/* 表头样式 */
.custom-table :deep(.ant-table-thead) > tr > th {
  font-weight: 600;
}

/* 表格单元格边框 */
.custom-table :deep(.ant-table-tbody) > tr > td {
  border-right: 1px solid var(--ant-color-border);
}

/* 最后单元格去掉右边框 */
.custom-table :deep(.ant-table-tbody) > tr > td:last-child {
  border-right: none;
}

/* 添加链接样式 */
.custom-table :deep(.ant-table-tbody) a {
  color: var(--ant-color-primary);
  cursor: pointer;
}
.custom-table :deep(.ant-table-tbody) a:hover {
  color: var(--ant-color-primary-hover);
}
/* 添加卡片样式 */
.mb-6 {
  margin-bottom: 1.5rem;
}

/* 描述列表样式 */
:deep(.ant-descriptions-item-label) {
  font-weight: 600;
  width: 150px;
}

/* 预格式化文本样式 */
pre {
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
  background-color: var(--ant-color-border);
}

.divider-title {
  padding: 0 12px;
  font-weight: 600;
  color: var(--ant-color-primary);
  white-space: nowrap;
}
/* 添加上游依赖样式 */
/* 添加依赖项样式 */
.dependency-item {
  border: 1px solid var(--ant-color-border);
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
  border: 1px solid var(--ant-color-primary-border);
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.selected-text {
  font-weight: 500;
}

.delete-btn {
  color: var(--ant-color-error);
  padding: 0;
}

.confirmed-mode,
.edit-mode {
  transition: all 0.3s ease;
}

.no-dependencies {
  border: 1px dashed var(--ant-color-border);
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
  border: 1px solid var(--ant-color-primary-border);
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.selected-text {
  font-weight: 500;
}

.delete-btn {
  color: var(--ant-color-error);
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
  border-bottom: 1px solid var(--ant-color-primary-border);
  font-weight: 600;
}

.task-item {
  display: flex;
  padding: 12px;
  border-bottom: 1px solid var(--ant-color-border);
}

.no-tasks {
  padding: 24px;
  text-align: center;
  color: var(--ant-color-text-tertiary);
  font-size: 16px;
}

/* 添加分隔线样式 */
.divider {
  display: inline-block;
  height: 12px;
  width: 1px;
  background-color: var(--ant-color-border);
  margin: 0 8px;
  vertical-align: middle;
}
</style>
