<script lang="ts" setup>
import type { AlgorithmItem } from '../../SMP/api/types';

import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import {
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Input,
  message,
  Table,
  TabPane,
  Tabs,
} from 'ant-design-vue';

import { deleteAlgorithm, fetchAlgorithmList } from '../../SMP/api/algorithm';

const router = useRouter();

// 使用正确的字段名定义列
const columns = [
  { title: '算法名称', dataIndex: 'algorithm_name', key: 'algorithm_name' },
  { title: '版本', dataIndex: 'version', key: 'version' },
  {
    title: '大小',
    key: 'size',
    customRender: () => 'N/A',
  },
  {
    title: '修改者',
    // 修正：使用小写 userId（注意大小写）
    dataIndex: 'userId',
    key: 'userId',
  },
  {
    title: '更新时间',
    key: 'updated_at',
    dataIndex: 'updated_at',
  },
  { title: '描述', dataIndex: 'description', key: 'description' },
  { title: '操作', key: 'operation' },
];

// 使用ref存储算法列表
const algorithmList = ref<AlgorithmItem[]>([]);
const loading = ref(false);
// 当前展开的行keys
const expandedRowKeys = ref<number[]>([]);

// 获取数据
const fetchAlgorithms = async () => {
  try {
    loading.value = true;
    const data = await fetchAlgorithmList();
    algorithmList.value = data.map((item) => ({
      ...item,
      key: item.id,
      // 添加tabActiveKey用于控制每个算法的标签页
      tabActiveKey: '0',
      // 添加 created_at 字段（如果没有）
      created_at: item.created_at || new Date().toLocaleString(),
    }));
  } catch (error) {
    console.error('获取算法列表失败:', error);
    message.error('获取算法列表失败');
  } finally {
    loading.value = false;
  }
};

// 组件挂载时获取数据
onMounted(() => {
  fetchAlgorithms();
});

// 处理展开行
const handleExpand = (expanded: boolean, record: AlgorithmItem) => {
  expandedRowKeys.value = expanded
    ? [...expandedRowKeys.value, record.id]
    : expandedRowKeys.value.filter((id) => id !== record.id);
};

// 搜索功能
const handleSearch = () => {
  fetchAlgorithms();
};

// 重置搜索
const handleReset = () => {
  searchName.value = '';
  fetchAlgorithms();
};

// 批量删除状态管理
const state = reactive({
  selectedRowKeys: [] as number[],
  deleteLoading: false,
});

// 是否有选中项
const hasSelected = computed(() => state.selectedRowKeys.length > 0);

// 选择变化处理
const onSelectChange = (selectedRowKeys: number[]) => {
  state.selectedRowKeys = selectedRowKeys;
};

// 批量删除 - 使用API
const handleBatchDelete = async () => {
  if (state.selectedRowKeys.length === 0) return;

  try {
    state.deleteLoading = true;
    await Promise.all(state.selectedRowKeys.map((id) => deleteAlgorithm(id)));
    await fetchAlgorithms();
    state.selectedRowKeys = [];
    message.success('批量删除成功');
  } catch (error) {
    console.error('删除失败:', error);
    message.error('删除失败');
  } finally {
    state.deleteLoading = false;
  }
};

// 路由跳转
const handleAdd = () => {
  router.push('/MTP/algorithm/algorithmCreate');
};

const handleNameClick = (record: AlgorithmItem) => {
  router.push({
    path: '/MTP/algorithm/algorithmModify',
    query: { id: record.id },
  });
};

// 单个删除 - 使用API
const handleDelete = async (id: number) => {
  try {
    await deleteAlgorithm(id);
    await fetchAlgorithms();
    message.success('删除成功');
  } catch (error) {
    console.error('删除失败:', error);
    message.error('删除失败');
  }
};

// 查看目录 - 跳转到算法文件管理器
const handleViewDirectory = (record: AlgorithmItem) => {
  router.push({
    path: '/MTP/algorithm/algorithmFileManager',
    query: {
      id: record.id.toString(),
      name: record.algorithm_name,
      isCAS: record.is_CAS ? 'true' : 'false',
    },
  });
};

// 添加下游任务状态管理（示例数据）
const downstreamTasks = ref<
  Record<number, Array<{ name: string; type: string }>>
>({});

// 初始化下游任务数据（示例）
const initDownstreamTasks = () => {
  downstreamTasks.value = {};
  algorithmList.value.forEach((item) => {
    downstreamTasks.value[item.id] = [
      { name: '训练任务A', type: '图像识别' },
      { name: '训练任务B', type: '自然语言处理' },
      { name: '训练任务C', type: '预测分析' },
    ];
  });
};

// 监听数据变化重新初始化下游任务
watch(algorithmList, initDownstreamTasks, { immediate: true });

// 搜索相关
const searchName = ref('');
</script>

<template>
  <Card class="p-4 shadow">
    <!-- 搜索区域 -->
    <div class="mb-4 flex justify-between">
      <div class="flex space-x-2">
        <Input
          v-model:value="searchName"
          placeholder="输入算法名称"
          style="width: 200px"
          @press-enter="handleSearch"
        />
        <Button type="primary" @click="handleSearch">搜索</Button>
        <Button @click="handleReset">重置</Button>
      </div>

      <div>
        <Button type="primary" @click="handleAdd">新增算法</Button>
        <Button
          type="primary"
          danger
          :disabled="!hasSelected"
          :loading="state.deleteLoading"
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
      :data-source="algorithmList"
      :loading="loading"
      :expanded-row-keys="expandedRowKeys"
      @expand="handleExpand"
      :row-selection="{
        selectedRowKeys: state.selectedRowKeys,
        onChange: onSelectChange,
      }"
      row-key="id"
      class="custom-table"
      bordered
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'algorithm_name'">
          <a @click="handleNameClick(record)">{{ record.algorithm_name }}</a>
        </template>
        <template v-if="column.key === 'operation'">
          <Button type="link" size="small" @click="handleViewDirectory(record)">
            查看目录
          </Button>
          <span class="divider"></span>
          <Button type="link" size="small" @click="handleDelete(record.id)">
            删除
          </Button>
        </template>
      </template>

      <!-- 展开行详情 -->
      <template #expandedRowRender="{ record }">
        <Tabs
          :active-key="record.tabActiveKey"
          @update:active-key="(key) => (record.tabActiveKey = key)"
        >
          <TabPane key="0" tab="基本信息">
            <div class="p-4">
              <Descriptions bordered :column="2" layout="horizontal">
                <DescriptionsItem label="算法名称">
                  {{ record.algorithm_name }}
                </DescriptionsItem>
                <DescriptionsItem label="版本">
                  {{ record.version }}
                </DescriptionsItem>

                <DescriptionsItem label="数据区域">
                  {{
                    record.zone === '1'
                      ? '南京'
                      : record.zone === '2'
                        ? '江西'
                        : record.zone === '3'
                          ? '广东'
                          : '未知'
                  }}
                </DescriptionsItem>
                <DescriptionsItem label="是否加密">
                  {{ record.encryption ? '是' : '否' }}
                </DescriptionsItem>

                <DescriptionsItem label="子数据域">
                  {{ record.subdata_area ? '是' : '否' }}
                </DescriptionsItem>
                <DescriptionsItem label="存储桶">
                  {{ record.bucket_name }}
                </DescriptionsItem>

                <DescriptionsItem label="团队名称">
                  {{ record.team_name || '未分配' }}
                </DescriptionsItem>
                <DescriptionsItem label="CAS认证">
                  {{ record.is_CAS ? '是' : '否' }}
                </DescriptionsItem>

                <!-- 添加修改者信息 -->
                <DescriptionsItem label="修改者">
                  {{ record.userId || '未知' }}
                </DescriptionsItem>

                <!-- 添加上次更新时间 -->
                <DescriptionsItem label="更新时间">
                  {{ record.created_at || '未知' }}
                </DescriptionsItem>

                <DescriptionsItem label="描述" :span="2">
                  {{ record.description || '暂无描述' }}
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

                <div v-else class="no-tasks">当前算法没有被任何任务使用</div>
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

.divider {
  display: inline-block;
  height: 12px;
  margin: 0 8px;
  border-left: 1px solid var(--ant-color-border);
}

/* 描述列表样式 */
:deep(.ant-descriptions-item-label) {
  font-weight: 600;
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
</style>
