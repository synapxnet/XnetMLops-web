<script lang="ts" setup>
import type { Assistant } from '../api/types';

import { computed, h, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  MessageOutlined,
  PauseCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  RobotOutlined,
  SearchOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons-vue';
import {
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Input,
  message,
  Modal,
  Popconfirm,
  Row,
  Select,
  SelectOption,
  Space,
  Spin,
  Statistic,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import {
  deleteAssistant,
  fetchAssistantList,
  setDefaultAssistant,
  updateAssistantStatus,
} from '../api/assistant';

const router = useRouter();

// 助手列表
const assistantList = ref<Assistant[]>([]);
const loading = ref(false);

// 搜索条件
const searchParams = reactive({
  name: '',
  status: undefined as 'active' | 'disabled' | undefined,
});

// 获取数据
const fetchData = async () => {
  try {
    loading.value = true;
    assistantList.value = await fetchAssistantList();
  } catch (error) {
    console.error('获取助手列表失败:', error);
    message.error('获取助手列表失败');
  } finally {
    loading.value = false;
  }
};

// 过滤后的列表
const filteredList = computed(() => {
  return assistantList.value.filter((item) => {
    if (searchParams.name && !item.name.toLowerCase().includes(searchParams.name.toLowerCase())) {
      return false;
    }
    if (searchParams.status && item.status !== searchParams.status) {
      return false;
    }
    return true;
  });
});

// 新建助手
const handleCreate = () => {
  router.push('/XAA/assistant/create');
};

// 编辑助手
const handleEdit = (record: Assistant) => {
  router.push({
    path: '/XAA/assistant/edit',
    query: { id: record.id },
  });
};

// 删除助手
const handleDelete = async (id: number) => {
  try {
    await deleteAssistant(id);
    message.success('删除成功');
    await fetchData();
  } catch (error) {
    console.error('删除失败:', error);
    message.error('删除失败');
  }
};

// 切换状态
const handleToggleStatus = async (record: Assistant) => {
  try {
    const newStatus = record.status === 'active' ? 'disabled' : 'active';
    await updateAssistantStatus(record.id, newStatus);
    message.success(newStatus === 'active' ? '已启用' : '已禁用');
    await fetchData();
  } catch (error) {
    console.error('状态更新失败:', error);
    message.error('状态更新失败');
  }
};

// 设为默认
const handleSetDefault = async (id: number) => {
  try {
    await setDefaultAssistant(id);
    message.success('已设为默认助手');
    await fetchData();
  } catch (error) {
    console.error('设置默认失败:', error);
    message.error('设置默认失败');
  }
};

// 打开聊天
const handleChat = (record: Assistant) => {
  router.push({
    path: '/XAA/assistant/chat',
    query: { id: record.id },
  });
};

// 重置搜索
const handleReset = () => {
  searchParams.name = '';
  searchParams.status = undefined;
};

// 获取头像颜色
const getAvatarColor = (name: string) => {
  const colors = ['#1890ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1', '#13c2c2'];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

onMounted(() => {
  fetchData();
});
</script>

<template>
  <div class="p-4">
    <!-- 页面标题 -->
    <Card class="mb-4 shadow">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <RobotOutlined class="text-3xl text-blue-500" />
          <div>
            <h2 class="m-0 text-xl font-semibold">智能助手</h2>
            <p class="m-0 text-gray-500">管理OpenClaw个人助手，配置AI模型和技能</p>
          </div>
        </div>
        <Space>
          <Tooltip title="刷新">
            <Button @click="fetchData">
              <ReloadOutlined />
            </Button>
          </Tooltip>
          <Button type="primary" @click="handleCreate">
            <PlusOutlined />
            新建助手
          </Button>
        </Space>
      </div>
    </Card>

    <!-- 搜索区域 -->
    <Card class="mb-4 shadow">
      <div class="flex flex-wrap items-center gap-4">
        <Input
          v-model:value="searchParams.name"
          placeholder="搜索助手名称"
          style="width: 200px"
          allow-clear
        >
          <template #prefix>
            <SearchOutlined />
          </template>
        </Input>
        <Select
          v-model:value="searchParams.status"
          placeholder="状态筛选"
          style="width: 140px"
          allow-clear
        >
          <SelectOption value="active">已启用</SelectOption>
          <SelectOption value="disabled">已禁用</SelectOption>
        </Select>
        <Button @click="handleReset">重置</Button>
      </div>
    </Card>

    <!-- 助手卡片列表 -->
    <Spin :spinning="loading">
      <Row v-if="filteredList.length > 0" :gutter="[16, 16]">
        <Col v-for="item in filteredList" :key="item.id" :xs="24" :sm="12" :md="8" :lg="6">
          <Card
            class="assistant-card h-full cursor-pointer shadow transition-all hover:shadow-lg"
            :class="{ 'opacity-60': item.status === 'disabled' }"
            hoverable
          >
            <!-- 卡片头部 -->
            <template #cover>
              <div class="relative flex h-32 items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600">
                <Avatar
                  :size="64"
                  :src="item.avatar"
                  :style="{ backgroundColor: item.avatar ? undefined : getAvatarColor(item.name) }"
                >
                  {{ item.name.charAt(0).toUpperCase() }}
                </Avatar>
                <!-- 默认标记 -->
                <div v-if="item.isDefault" class="absolute right-2 top-2">
                  <Tag color="gold">
                    <StarFilled /> 默认
                  </Tag>
                </div>
                <!-- 状态标记 -->
                <div class="absolute left-2 top-2">
                  <Tag :color="item.status === 'active' ? 'success' : 'default'">
                    <CheckCircleOutlined v-if="item.status === 'active'" />
                    <PauseCircleOutlined v-else />
                    {{ item.status === 'active' ? '运行中' : '已禁用' }}
                  </Tag>
                </div>
              </div>
            </template>

            <!-- 卡片内容 -->
            <div class="space-y-3">
              <div>
                <h3 class="m-0 truncate text-lg font-semibold" :title="item.name">
                  {{ item.name }}
                </h3>
                <p class="m-0 mt-1 line-clamp-2 h-10 text-gray-500" :title="item.description">
                  {{ item.description || '暂无描述' }}
                </p>
              </div>

              <!-- 统计信息 -->
              <Row :gutter="8">
                <Col :span="12">
                  <Statistic
                    title="对话数"
                    :value="item.totalConversations || 0"
                    :value-style="{ fontSize: '16px' }"
                  />
                </Col>
                <Col :span="12">
                  <Statistic
                    title="消息数"
                    :value="item.totalMessages || 0"
                    :value-style="{ fontSize: '16px' }"
                  />
                </Col>
              </Row>

              <!-- 模型信息 -->
              <div class="flex items-center gap-2">
                <Tag color="blue">{{ item.defaultModel || '未配置模型' }}</Tag>
                <Tag v-if="item.ragEnabled" color="green">RAG</Tag>
                <Tag v-if="item.toolsEnabled" color="purple">Tools</Tag>
              </div>
            </div>

            <!-- 卡片操作 -->
            <template #actions>
              <Tooltip title="开始对话">
                <MessageOutlined @click.stop="handleChat(item)" />
              </Tooltip>
              <Tooltip title="编辑">
                <EditOutlined @click.stop="handleEdit(item)" />
              </Tooltip>
              <Tooltip :title="item.isDefault ? '已是默认' : '设为默认'">
                <StarOutlined
                  v-if="!item.isDefault"
                  @click.stop="handleSetDefault(item.id)"
                />
                <StarFilled v-else class="text-yellow-500" />
              </Tooltip>
              <Popconfirm
                title="确定要删除该助手吗？"
                ok-text="确定"
                cancel-text="取消"
                @confirm="handleDelete(item.id)"
              >
                <Tooltip title="删除">
                  <DeleteOutlined class="text-red-500" @click.stop />
                </Tooltip>
              </Popconfirm>
            </template>
          </Card>
        </Col>
      </Row>

      <!-- 空状态 -->
      <Card v-else class="shadow">
        <Empty description="暂无助手">
          <Button type="primary" @click="handleCreate">
            <PlusOutlined />
            创建第一个助手
          </Button>
        </Empty>
      </Card>
    </Spin>
  </div>
</template>

<style scoped>
.assistant-card :deep(.ant-card-cover) {
  border-radius: 8px 8px 0 0;
  overflow: hidden;
}

.assistant-card :deep(.ant-card-actions) {
  border-top: 1px solid hsl(var(--border));
}

.assistant-card :deep(.ant-card-actions > li) {
  margin: 8px 0;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
