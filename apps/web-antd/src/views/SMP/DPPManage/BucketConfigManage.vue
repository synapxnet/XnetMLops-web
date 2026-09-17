<script lang="ts" setup>
import BusinessPage from '#/components/workspace/BusinessPage.vue';
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  GlobalOutlined,
  PlusOutlined,
  SearchOutlined,
  TeamOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Input,
  message,
  Modal,
  Select,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  createBucketConfig,
  deleteBucketConfig,
  getbucketConfig,
  updateBucketConfig,
} from '../api/bucketConfig';
import { getOrganizationTree } from '../api/deptTreeData';
import EditBucketModal from './EditBucketModal.vue';
// 显式注册组件
const ACard = Card;
const ATable = Table;
const AButton = Button;
const AInput = Input;
const ASelect = Select;
const ASelectOption = Select.Option;

// 存储桶类型定义
interface BucketItem {
  id: number; // 改为 number 类型
  uid: string; // 新增 uid 字段
  name: string;
  identifier: string;
  type: 'public' | 'tenant';
  tenant_uid?: null | string; // 改为后端字段名
  dept_uid?: null | string; // 改为后端字段名
  team_uid?: null | string; // 改为后端字段名
  current_size: null | number; // 允许 null
  max_size: null | number; // 允许 null
  status: 'active' | 'disabled';
  access_key: string;
  authorized_tenants: [];
  created_at: null | string; // 允许 null
}

// 定义组织树数据结构（包含完整层级）
interface DeptTreeDataItem {
  label: string;
  value: string; // 使用 uid
  children?: DeptTreeDataItem[];
}

// 组织树数据
const organizationTree = ref<DeptTreeDataItem[]>([]);

// 递归查找节点路径
const findNodePath = (
  tree: DeptTreeDataItem[],
  value: string,
  path: string[] = [],
): null | string[] => {
  for (const node of tree) {
    const currentPath = [...path, node.label];

    if (node.value === value) {
      return currentPath;
    }

    if (node.children) {
      const found = findNodePath(node.children, value, currentPath);
      if (found) return found;
    }
  }
  return null;
};

// 修改 getOwnerPath 函数
const getOwnerPath = (bucket: BucketItem): null | string => {
  if (bucket.tenant_uid) {
    return (
      findNodePath(organizationTree.value, bucket.tenant_uid)?.join(' / ') ||
      null
    );
  }
  if (bucket.dept_uid) {
    return (
      findNodePath(organizationTree.value, bucket.dept_uid)?.join(' / ') || null
    );
  }
  if (bucket.team_uid) {
    return (
      findNodePath(organizationTree.value, bucket.team_uid)?.join(' / ') || null
    );
  }
  return null;
};

// 存储桶数据
const buckets = ref<BucketItem[]>([]);
const filteredBuckets = ref<BucketItem[]>([]);

// 搜索和过滤状态
const searchKey = ref('');
const bucketTypeFilter = ref<'all' | 'public' | 'tenant'>('all');
const tenantFilter = ref<string[]>([]);
const departmentFilter = ref<string[]>([]);
const teamFilter = ref<string[]>([]);

// 弹窗控制
const modalVisible = ref(false);
const currentBucket = ref<BucketItem | null>(null);
const isEditing = ref(false);

// 计算属性：所有已存在的标识符
const existingIdentifiers = computed(() => {
  return new Set(buckets.value.map((b) => b.identifier));
});

// 获取组织树数据
const fetchOrganizationTree = async () => {
  try {
    const treeData = await getOrganizationTree();
    organizationTree.value = treeData;
  } catch (error) {
    console.error('获取组织树失败', error);
    organizationTree.value = [];
  }
};

// 修改 loadBuckets 函数
const loadBuckets = async () => {
  try {
    const response = await getbucketConfig();
    console.log('获取存储桶数据', response);
    if (response === null) {
      message.error(`获取存储桶数据失败: ${response.message}`);
      buckets.value = [];
    } else {
      buckets.value = response;
      filterBuckets();
    }
  } catch (error) {
    console.error('获取存储桶数据失败', error);
    buckets.value = [];
  }
};

// 过滤存储桶
const filterBuckets = () => {
  filteredBuckets.value = buckets.value.filter((bucket) => {
    // 搜索条件
    const matchesSearch =
      !searchKey.value ||
      bucket.name.toLowerCase().includes(searchKey.value.toLowerCase()) ||
      bucket.identifier.toLowerCase().includes(searchKey.value.toLowerCase());

    // 类型过滤
    const matchesType =
      bucketTypeFilter.value === 'all' ||
      bucket.type === bucketTypeFilter.value;

    // 租户过滤
    const matchesTenant =
      tenantFilter.value.length === 0 ||
      (bucket.tenant_uid && tenantFilter.value.includes(bucket.tenant_uid));

    const matchesDepartment =
      departmentFilter.value.length === 0 ||
      (bucket.dept_uid && departmentFilter.value.includes(bucket.dept_uid));

    const matchesTeam =
      teamFilter.value.length === 0 ||
      (bucket.team_uid && teamFilter.value.includes(bucket.team_uid));

    return (
      matchesSearch &&
      matchesType &&
      matchesTenant &&
      matchesDepartment &&
      matchesTeam
    );
  });
};
// 处理过滤条件变化
const handleFilterChange = () => {
  filterBuckets();
};

// 显示新增模态框
const showAddModal = (type: 'public' | 'tenant' = 'public') => {
  currentBucket.value = {
    id: '',
    name: '',
    identifier: '',
    type,
    currentSize: 0,
    maxSize: 100,
    status: 'active',
    access_key: '',
    authorized_tenants: [],
    createdAt: new Date().toISOString().split('T')[0],
  };
  isEditing.value = false;
  modalVisible.value = true;
};

// 编辑存储桶
const editBucket = (bucket: BucketItem) => {
  currentBucket.value = {
    ...bucket,
    // 添加兼容字段
    tenant: bucket.tenant_uid,
    department: bucket.dept_uid,
    team: bucket.team_uid,
  };
  isEditing.value = true;
  modalVisible.value = true;
};

// 删除存储桶
const deleteBucket = (bucketId: string) => {
  Modal.confirm({
    title: '确认删除',
    content: '确定要删除这个存储桶吗？此操作不可恢复。',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        // 显示加载状态
        const hide = message.loading('正在删除存储桶...', 0);

        // 调用后端API删除存储桶
        await deleteBucketConfig(bucketId);

        // 关闭加载状态
        hide();

        // 从前端列表中移除
        buckets.value = buckets.value.filter((b) => b.id !== bucketId);
        filterBuckets();
        message.success('存储桶已删除');
      } catch (error: any) {
        // 关闭加载状态（如果已开始）
        const hide = message.loading();
        hide?.();

        console.error('删除存储桶失败', error);

        // 显示具体的错误信息
        let errorMsg = '删除存储桶失败';
        if (error.response) {
          console.error('响应错误:', error.response.data);
          errorMsg = error.response.data?.message || error.response.statusText;
        } else if (error.message) {
          errorMsg = error.message;
        }

        message.error(`删除失败: ${errorMsg}`);
      }
    },
  });
};

// 扩容存储桶
const expandBucket = (bucket: BucketItem) => {
  currentBucket.value = { ...bucket };
  isEditing.value = true;
  modalVisible.value = true;
};

// 处理保存
const handleSave = async (newBucket: BucketItem) => {
  try {
    const payload = {
      ...newBucket,
      current_size: newBucket.current_size ?? 0,
      max_size: newBucket.max_size ?? 100,
    };

    // 显示保存中的提示
    const hide = message.loading('正在保存存储桶配置...', 0);

    let response;
    response = await (isEditing.value
      ? updateBucketConfig(newBucket.id, payload)
      : createBucketConfig(payload));

    hide();

    // 保存成功后，重新加载存储桶列表
    await loadBuckets();

    // 显示成功消息
    message.success(isEditing.value ? '存储桶更新成功' : '存储桶创建成功');
  } catch (error: any) {
    console.error('保存存储桶失败', error);

    let errorMsg = '保存存储桶失败';
    if (error.response) {
      // 处理唯一键冲突错误
      errorMsg =
        error.response.data?.error?.includes('Duplicate entry') &&
        error.response.data?.error?.includes('identifier')
          ? '存储桶标识符已存在，请更换其他标识符'
          : error.response.data?.message || error.response.statusText;
    } else if (error.message) {
      errorMsg = error.message;
    }

    message.error(`保存失败: ${errorMsg}`);
  } finally {
    modalVisible.value = false;
  }
};
// 获取存储桶类型标签
const getBucketTypeTag = (type: string) => {
  return type === 'public'
    ? { text: '公共存储桶', color: 'blue' }
    : { text: '租户存储桶', color: 'green' };
};

// 获取使用率状态 - 优化后
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

// 表格列配置
const columns = [
  {
    title: '存储桶名称',
    dataIndex: 'name',
    key: 'name',
    slots: { customRender: 'name' },
  },
  {
    title: '标识符',
    dataIndex: 'identifier',
    key: 'identifier',
    slots: { customRender: 'identifier' },
  },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    slots: { customRender: 'type' },
  },
  {
    title: '所属',
    key: 'owner',
    slots: { customRender: 'owner' },
  },
  {
    title: '存储使用',
    key: 'usage',
    slots: { customRender: 'usage' },
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    slots: { customRender: 'status' },
  },
  {
    title: '操作',
    key: 'action',
    width: '200px',
    slots: { customRender: 'action' },
  },
];

onMounted(() => {
  fetchOrganizationTree().then(() => {
    loadBuckets();
  });
});
</script>

<template>
  <BusinessPage domain="资源配置" description="管理组织内的数据连接、仓库、工作站与计算资源。" existing-title>
  <Page title="存储桶配置管理" />

  <!-- 内容区域 -->
  <div class="mt-5 rounded-lg bg-white p-6 shadow">
    <!-- 过滤条件卡片（置顶） -->
    <ACard
      class="mb-6 !border-0 bg-gray-50 dark:bg-gray-800 p-4 shadow-sm"
      :body-style="{ padding: '16px 20px' }"
    >
      <div class="flex flex-wrap items-center gap-4">
        <!-- 存储桶类型过滤 -->
        <div class="flex items-center">
          <span class="mr-2 font-medium text-gray-700">存储桶类型:</span>
          <ASelect
            v-model:value="bucketTypeFilter"
            style="width: 120px"
            @change="handleFilterChange"
          >
            <ASelectOption value="all">全部</ASelectOption>
            <ASelectOption value="public">公共存储桶</ASelectOption>
            <ASelectOption value="tenant">租户存储桶</ASelectOption>
          </ASelect>
        </div>

        <!-- 租户过滤 -->
        <div
          v-if="bucketTypeFilter === 'tenant' || bucketTypeFilter === 'all'"
          class="flex items-center"
        >
          <span class="mr-2 font-medium text-gray-700">租户:</span>
          <ASelect
            v-model:value="tenantFilter"
            mode="multiple"
            style="width: 150px"
            placeholder="选择租户"
            @change="handleFilterChange"
          >
            <ASelectOption
              v-for="tenant in organizationTree"
              :key="tenant.value"
              :value="tenant.value"
            >
              {{ tenant.label }}
            </ASelectOption>
          </ASelect>
        </div>

        <!-- 部门过滤 -->
        <div
          v-if="
            (bucketTypeFilter === 'tenant' || bucketTypeFilter === 'all') &&
            tenantFilter.length > 0
          "
          class="flex items-center transition-all duration-300"
        >
          <span class="mr-2 font-medium text-gray-700">部门:</span>
          <ASelect
            v-model:value="departmentFilter"
            mode="multiple"
            style="width: 150px"
            placeholder="选择部门"
            @change="handleFilterChange"
          >
            <template v-for="tenantId in tenantFilter" :key="tenantId">
              <template
                v-for="dept in organizationTree.find(
                  (t) => t.value === tenantId,
                )?.children || []"
              >
                <ASelectOption :value="dept.value">
                  {{ dept.label }}
                </ASelectOption>
              </template>
            </template>
          </ASelect>
        </div>

        <!-- 团队过滤 -->
        <div
          v-if="
            (bucketTypeFilter === 'tenant' || bucketTypeFilter === 'all') &&
            departmentFilter.length > 0
          "
          class="flex items-center transition-all duration-300"
        >
          <span class="mr-2 font-medium text-gray-700">团队:</span>
          <ASelect
            v-model:value="teamFilter"
            mode="multiple"
            style="width: 150px"
            placeholder="选择团队"
            @change="handleFilterChange"
          >
            <template v-for="deptId in departmentFilter" :key="deptId">
              <template v-for="tenant in organizationTree">
                <template v-for="dept in tenant.children || []">
                  <template v-if="dept.value === deptId">
                    <template v-for="team in dept.children || []">
                      <ASelectOption :value="team.value">
                        {{ team.label }}
                      </ASelectOption>
                    </template>
                  </template>
                </template>
              </template>
            </template>
          </ASelect>
        </div>
      </div>
    </ACard>

    <!-- 操作区域 -->
    <div class="mb-6 flex items-center justify-between">
      <!-- 搜索框 -->
      <AInput
        v-model:value="searchKey"
        placeholder="搜索存储桶名称或标识符"
        allow-clear
        style="width: 300px"
        @change="handleFilterChange"
      >
        <template #prefix>
          <SearchOutlined class="text-gray-400" />
        </template>
      </AInput>

      <!-- 新增按钮 -->
      <div class="flex gap-3">
        <AButton
          type="primary"
          @click="showAddModal('public')"
          class="flex items-center"
        >
          <PlusOutlined class="mr-1" />
          新增公共存储桶
        </AButton>

        <AButton
          type="primary"
          @click="showAddModal('tenant')"
          class="flex items-center !bg-green-500 !border-green-500 hover:!bg-green-600"
        >
          <PlusOutlined class="mr-1" />
          新增租户存储桶
        </AButton>
      </div>
    </div>

    <!-- 存储桶表格 -->
    <ACard :bordered="false" class="!shadow-none">
      <ATable
        :data-source="filteredBuckets"
        :columns="columns"
        row-key="id"
        :pagination="{ pageSize: 8 }"
      >
        <!-- 存储桶名称列插槽 -->
        <template #name="{ record }">
          <div class="flex items-center">
            <GlobalOutlined
              v-if="record.type === 'public'"
              class="mr-2 text-blue-500"
            />
            <TeamOutlined v-else class="mr-2 text-green-500" />
            <span>{{ record.name }}</span>
          </div>
        </template>

        <!-- 标识符列插槽 -->
        <template #identifier="{ text }">
          <code>{{ text }}</code>
        </template>

        <!-- 类型列插槽 -->
        <template #type="{ record }">
          <Tag :color="getBucketTypeTag(record.type).color">
            {{ getBucketTypeTag(record.type).text }}
          </Tag>
        </template>

        <!-- 所属列插槽 - 显示完整路径 -->
        <template #owner="{ record }">
          <div v-if="record.type === 'public'">公共</div>
          <div v-else-if="getOwnerPath(record)" class="text-gray-700">
            {{ getOwnerPath(record) }}
          </div>
          <div v-else class="text-gray-400">未知所属</div>
        </template>

        <!-- 存储使用列插槽 -->
        <template #usage="{ record }">
          <div>
            <div class="flex justify-between text-sm">
              <span>{{ record.current_size }}GB / {{ record.max_size }}GB</span>
              <span>
                {{
                  ((record.current_size / record.max_size) * 100).toFixed(1)
                }}%
              </span>
            </div>
            <div class="mt-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                class="h-full rounded-full"
                :class="{
                  'bg-red-500': getUsageStatus(record.current_size, record.max_size).color === 'red',
                  'bg-orange-500': getUsageStatus(record.current_size, record.max_size).color === 'orange',
                  'bg-green-500': getUsageStatus(record.current_size, record.max_size).color !== 'red' && getUsageStatus(record.current_size, record.max_size).color !== 'orange',
                }"
                :style="{
                  width: `${(record.current_size / record.max_size) * 100}%`,
                }"
              ></div>
            </div>
            <Tag
              :color="
                getUsageStatus(record.current_size, record.max_size).color
              "
              class="mt-1"
            >
              {{ getUsageStatus(record.current_size, record.max_size).text }}
            </Tag>
          </div>
        </template>

        <!-- 状态列插槽 -->
        <template #status="{ text }">
          <Tag :color="text === 'active' ? 'green' : 'red'">
            {{ text === 'active' ? '已启用' : '已禁用' }}
          </Tag>
        </template>

        <!-- 操作列插槽 -->
        <template #action="{ record }">
          <div class="flex space-x-2">
            <AButton type="link" @click="editBucket(record)">编辑</AButton>
            <AButton type="link" @click="expandBucket(record)">扩容</AButton>
            <AButton type="link" danger @click="deleteBucket(record.id)">
              删除
            </AButton>
          </div>
        </template>

        <template #emptyText>
          <!-- 空状态模板保持不变 -->
        </template>
      </ATable>
    </ACard>
  </div>

  <!-- 编辑/扩容模态框 -->
  <EditBucketModal
    v-model:visible="modalVisible"
    :current-bucket="currentBucket"
    :is-editing="isEditing"
    :existing-identifiers="existingIdentifiers"
    :tenant-options="organizationTree"
    :department-options="[]"
    :team-options="[]"
    @save="handleSave"
  />

  </BusinessPage>
</template>

<style scoped>
/* 卡片样式 */
:deep(.ant-card) {
  border-radius: 8px;
}

/* 过滤条件卡片 */
.filter-card {
  border-radius: 8px;
}

/* 表格样式 */
:deep(.ant-table) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.ant-table-thead > tr > th) {
  font-weight: 600;
}

/* 按钮样式 */
:deep(.ant-btn-link) {
  padding: 0 4px;
}

/* 搜索框样式 */
:deep(.ant-input-affix-wrapper) {
  border-radius: 6px;
  transition: all 0.3s;
}

:deep(.ant-input-affix-wrapper:hover) {
  border-color: var(--ant-color-primary);
}

:deep(.ant-input-affix-wrapper-focused) {
  border-color: var(--ant-color-primary);
}

/* 标签样式 */
:deep(.ant-tag) {
  border-radius: 4px;
  font-weight: 500;
}

/* 进度条样式 */
.progress-bar {
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
}

/* 平滑过渡效果 */
.transition-all {
  transition: all 0.3s ease;
}
</style>
