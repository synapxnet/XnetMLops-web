<script lang="ts" setup>
import type { ConfigItem, DatasetConfig } from '../api/datasetConfig';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { PlusOutlined, SearchOutlined } from '@ant-design/icons-vue';
import { Button, Card, Input, message, Table } from 'ant-design-vue';

import {
  addConfigItem,
  deleteConfigItem,
  fetchConfig,
} from '../api/datasetConfig';
import EditConfigModal from './EditConfigModal.vue';

// 显式注册组件
const ACard = Card;
const ATable = Table;
const AButton = Button;
const AInput = Input;

// 配置数据
const configData = ref<DatasetConfig>({
  datasetTypes: [],
  datasetZones: [],
});

// 搜索词
const typeSearchKey = ref('');
const zoneSearchKey = ref('');

// 计算属性：获取所有已存在的值
const existingValues = computed(() => {
  const values = new Set<string>();
  configData.value.datasetTypes.forEach((item) => values.add(item.value));
  configData.value.datasetZones.forEach((item) => values.add(item.value));
  return values;
});

// 计算属性：获取所有已存在的名称
const existingLabels = computed(() => {
  const labels = new Set<string>();
  configData.value.datasetTypes.forEach((item) => labels.add(item.label));
  configData.value.datasetZones.forEach((item) => labels.add(item.label));
  return labels;
});

// 计算属性：过滤后的数据类型
const filteredTypes = computed(() => {
  if (!typeSearchKey.value) return configData.value.datasetTypes;

  const searchKey = typeSearchKey.value.toLowerCase();
  return configData.value.datasetTypes.filter(
    (item) =>
      item.label.toLowerCase().includes(searchKey) ||
      item.value.toLowerCase().includes(searchKey),
  );
});

// 计算属性：过滤后的数据区域
const filteredZones = computed(() => {
  if (!zoneSearchKey.value) return configData.value.datasetZones;

  const searchKey = zoneSearchKey.value.toLowerCase();
  return configData.value.datasetZones.filter(
    (item) =>
      item.label.toLowerCase().includes(searchKey) ||
      item.value.toLowerCase().includes(searchKey),
  );
});

// 表格列配置
const typeColumns = [
  { title: '类型名称', dataIndex: 'label', key: 'label' },
  { title: '类型值', dataIndex: 'value', key: 'value' },
  { title: '操作', dataIndex: 'action', key: 'action', width: '150px' },
];

const zoneColumns = [
  { title: '区域名称', dataIndex: 'label', key: 'label' },
  { title: '区域值', dataIndex: 'value', key: 'value' },
  { title: '操作', dataIndex: 'action', key: 'action', width: '150px' },
];

// 弹窗控制
const modalVisible = ref(false);
const currentConfigType = ref<'datasetTypes' | 'datasetZones'>();
const currentItem = ref<ConfigItem | null>(null);

// 从后端加载配置
const loadConfig = async () => {
  try {
    const data = await fetchConfig();
    configData.value = data;
  } catch (error) {
    console.error('加载配置失败:', error);
    message.error('加载配置失败');
  }
};

onMounted(() => {
  loadConfig();
});

// 显示新增模态框
const showAddModal = (type: 'datasetTypes' | 'datasetZones') => {
  currentConfigType.value = type;
  currentItem.value = null;
  modalVisible.value = true;
};

// 编辑项目
const editItem = (type: 'datasetTypes' | 'datasetZones', item: ConfigItem) => {
  currentConfigType.value = type;
  currentItem.value = { ...item };
  modalVisible.value = true;
};

// 删除项目
const deleteItem = async (
  type: 'datasetTypes' | 'datasetZones',
  value: string,
) => {
  try {
    await deleteConfigItem(type, value);

    // 更新本地状态
    const newItems = configData.value[type].filter(
      (item) => item.value !== value,
    );
    configData.value = {
      ...configData.value,
      [type]: newItems,
    };

    message.success('删除成功');
  } catch (error) {
    console.error('删除失败:', error);
    message.error('删除失败');
  }
};

// 处理保存 - 修改为保存单个配置项
const handleSave = async (
  type: 'datasetTypes' | 'datasetZones',
  newItem: ConfigItem,
) => {
  try {
    const isEditing = currentItem.value !== null;
    const currentItems = [...configData.value[type]];

    if (isEditing) {
      // 编辑现有项
      // 1. 检查是否修改了值，且新值是否已存在
      if (
        currentItem.value.value !== newItem.value &&
        existingValues.value.has(newItem.value)
      ) {
        message.error(`值 "${newItem.value}" 已存在，请使用其他值`);
        return;
      }

      // 2. 检查是否修改了标签，且新标签是否已存在
      if (
        currentItem.value.label !== newItem.label &&
        existingLabels.value.has(newItem.label)
      ) {
        message.error(`名称 "${newItem.label}" 已存在，请使用其他名称`);
        return;
      }

      // 3. 调用更新API
      await loadConfig();

      // 4. 更新本地状态
      const index = currentItems.findIndex(
        (item) => item.value === currentItem.value?.value,
      );
      if (index !== -1) {
        currentItems[index] = newItem;
      }
    } else {
      // 新增项
      // 1. 检查值是否已存在
      if (existingValues.value.has(newItem.value)) {
        message.error(`值 "${newItem.value}" 已存在，请使用其他值`);
        return;
      }

      // 2. 检查标签是否已存在
      if (existingLabels.value.has(newItem.label)) {
        message.error(`名称 "${newItem.label}" 已存在，请使用其他名称`);
        return;
      }

      // 3. 调用新增API
      await addConfigItem(type, newItem);

      // 4. 更新本地状态
      currentItems.push(newItem);
    }

    // 更新整个配置
    configData.value = {
      ...configData.value,
      [type]: currentItems,
    };

    modalVisible.value = false;
    message.success('保存成功');
  } catch (error) {
    console.error('保存失败:', error);
    message.error('保存失败');
  }
};

// 清除类型搜索
const clearTypeSearch = () => {
  typeSearchKey.value = '';
};

// 清除区域搜索
const clearZoneSearch = () => {
  zoneSearchKey.value = '';
};
</script>

<template>
  <Page title="数据集配置管理" />
  <!-- 内容区域 -->
  <div class="rounded-lg bg-white p-4 shadow" style="margin-top: 20px">
    <!-- 数据类型配置卡片 -->
    <ACard
      title="数据类型配置"
      class="mb-6"
    >
      <template #extra>
        <div class="flex items-center gap-2">
          <!-- 搜索框 -->
          <AInput
            v-model:value="typeSearchKey"
            placeholder="搜索名称或值"
            allow-clear
            @click:clear="clearTypeSearch"
            class="w-48"
          >
            <template #prefix>
              <SearchOutlined class="text-gray-400" />
            </template>
          </AInput>

          <AButton
            type="primary"
            @click="showAddModal('datasetTypes')"
          >
            <PlusOutlined />
            新增数据类型
          </AButton>
        </div>
      </template>

      <ATable
        :data-source="filteredTypes"
        :columns="typeColumns"
        row-key="value"
        :pagination="false"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'action'">
            <AButton
              type="link"
              @click="editItem('datasetTypes', record)"
            >
              编辑
            </AButton>
            <AButton
              type="link"
              danger
              @click="deleteItem('datasetTypes', record.value)"
            >
              删除
            </AButton>
          </template>
        </template>

        <template #emptyText>
          <div class="py-8 text-center text-gray-500">
            {{
              typeSearchKey
                ? `未找到匹配"${typeSearchKey}"的数据类型`
                : '暂无数据类型配置'
            }}
          </div>
        </template>
      </ATable>
    </ACard>

    <!-- 数据区域配置卡片 -->
    <ACard title="数据区域配置">
      <template #extra>
        <div class="flex items-center gap-2">
          <!-- 搜索框 -->
          <AInput
            v-model:value="zoneSearchKey"
            placeholder="搜索名称或值"
            allow-clear
            @click:clear="clearZoneSearch"
            class="w-48"
          >
            <template #prefix>
              <SearchOutlined class="text-gray-400" />
            </template>
          </AInput>

          <AButton
            type="primary"
            @click="showAddModal('datasetZones')"
          >
            <PlusOutlined />
            新增数据区域
          </AButton>
        </div>
      </template>

      <ATable
        :data-source="filteredZones"
        :columns="zoneColumns"
        row-key="value"
        :pagination="false"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'action'">
            <AButton
              type="link"
              @click="editItem('datasetZones', record)"
            >
              编辑
            </AButton>
            <AButton
              type="link"
              danger
              @click="deleteItem('datasetZones', record.value)"
            >
              删除
            </AButton>
          </template>
        </template>

        <template #emptyText>
          <div class="py-8 text-center text-gray-500">
            {{
              zoneSearchKey
                ? `未找到匹配"${zoneSearchKey}"的数据区域`
                : '暂无数据区域配置'
            }}
          </div>
        </template>
      </ATable>
    </ACard>
  </div>

  <EditConfigModal
    v-model:visible="modalVisible"
    :config-type="currentConfigType"
    :current-item="currentItem"
    :existing-values="existingValues"
    :existing-labels="existingLabels"
    @save="handleSave"
  />
</template>

<style scoped>
/* 添加必要的样式覆盖 */
:deep(.ant-table) {
  border: 1px solid var(--ant-color-border);
  border-radius: 4px;
}

:deep(.ant-btn-link) {
  padding: 0 4px;
}

/* 卡片标题区域样式 */
:deep(.ant-card-head-wrapper) {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 确保按钮不会被覆盖 */
:deep(.page-header) {
  z-index: 10;
  position: relative;
}

/* 搜索框样式 */
:deep(.ant-input-affix-wrapper) {
  border-radius: 4px;
  transition: all 0.3s;
}

:deep(.ant-input-affix-wrapper:hover) {
  border-color: var(--ant-color-primary);
}

:deep(.ant-input-affix-wrapper-focused) {
  border-color: var(--ant-color-primary);
}
</style>
