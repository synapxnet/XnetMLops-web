<script lang="ts" setup>
import type { Assistant, AssistantConversation, AssistantMessage } from '../api/types';

import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  ArrowLeftOutlined,
  ClearOutlined,
  DeleteOutlined,
  HistoryOutlined,
  LoadingOutlined,
  PlusOutlined,
  RobotOutlined,
  SendOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';
import {
  Avatar,
  Button,
  Card,
  Drawer,
  Empty,
  Input,
  List,
  ListItem,
  ListItemMeta,
  message,
  Popconfirm,
  Space,
  Spin,
  Tooltip,
  Typography,
} from 'ant-design-vue';

import {
  addMessage,
  archiveConversation,
  createConversation,
  deleteConversation,
  fetchAssistant,
  fetchConversations,
  fetchMessages,
} from '../api/assistant';

const { Paragraph, Text } = Typography;
const { TextArea } = Input;

const router = useRouter();
const route = useRoute();

// 助手信息
const assistant = ref<Assistant | null>(null);
const loading = ref(false);

// 会话相关
const conversations = ref<AssistantConversation[]>([]);
const currentConversation = ref<AssistantConversation | null>(null);
const messages = ref<AssistantMessage[]>([]);
const historyDrawerVisible = ref(false);

// 输入相关
const inputMessage = ref('');
const sending = ref(false);
const messageContainerRef = ref<HTMLElement>();

// 连接状态
const wsConnected = ref(false);
const streamingContent = ref('');

// 获取助手信息
const loadAssistant = async () => {
  const id = route.query.id as string;
  if (!id) {
    message.error('缺少助手ID');
    router.push('/XAA/assistant/index');
    return;
  }

  loading.value = true;
  try {
    assistant.value = await fetchAssistant(Number(id));
    if (!assistant.value) {
      message.error('助手不存在');
      router.push('/XAA/assistant/index');
      return;
    }

    // 加载会话列表
    await loadConversations();

    // 检查 Gateway 连接
    if (assistant.value?.gatewayUrl) {
      wsConnected.value = true;
    }
  } catch (error) {
    console.error('加载助手失败:', error);
    message.error('加载助手失败');
  } finally {
    loading.value = false;
  }
};

// 加载会话列表
const loadConversations = async () => {
  if (!assistant.value) return;
  try {
    conversations.value = await fetchConversations(assistant.value.id);
    // 如果有会话，选择最近的一个
    if (conversations.value.length > 0 && !currentConversation.value) {
      await selectConversation(conversations.value[0]);
    }
  } catch (error) {
    console.error('加载会话列表失败:', error);
  }
};

// 选择会话
const selectConversation = async (conv: AssistantConversation) => {
  currentConversation.value = conv;
  historyDrawerVisible.value = false;

  try {
    messages.value = await fetchMessages(conv.id);
    scrollToBottom();
  } catch (error) {
    console.error('加载消息失败:', error);
  }
};

// 创建新会话
const createNewConversation = async () => {
  if (!assistant.value) return;

  try {
    // 模拟用户ID（实际应该从认证系统获取）
    const userId = 'current-user';
    const userName = '当前用户';

    const conv = await createConversation(assistant.value.id, userId, userName);
    conversations.value.unshift(conv);
    await selectConversation(conv);
  } catch (error) {
    console.error('创建会话失败:', error);
    message.error('创建会话失败');
  }
};

// 删除会话
const handleDeleteConversation = async (convId: number) => {
  try {
    await deleteConversation(convId);
    conversations.value = conversations.value.filter((c) => c.id !== convId);
    if (currentConversation.value?.id === convId) {
      currentConversation.value = null;
      messages.value = [];
    }
    message.success('删除成功');
  } catch (error) {
    console.error('删除会话失败:', error);
    message.error('删除失败');
  }
};

// 发送消息
const sendMessage = async () => {
  if (!inputMessage.value.trim() || sending.value) return;
  if (!currentConversation.value) {
    await createNewConversation();
  }

  const content = inputMessage.value.trim();
  inputMessage.value = '';
  sending.value = true;

  // 添加用户消息到列表
  const userMsg: AssistantMessage = {
    id: Date.now(),
    uid: `MSG-${Date.now()}`,
    conversationId: currentConversation.value!.id,
    role: 'user',
    content,
    createdAt: new Date().toISOString(),
  };
  messages.value.push(userMsg);
  scrollToBottom();

  // 保存用户消息到后端
  try {
    await addMessage(currentConversation.value!.id, 'user', content);
  } catch (error) {
    console.error('保存用户消息失败:', error);
  }

  // 通过 OpenClaw Gateway HTTP API 发送消息
  if (assistant.value?.gatewayUrl) {
    await sendToGateway(content);
  } else {
    message.error('未配置 Gateway URL，请在助手设置中配置');
    sending.value = false;
  }
};

// 通过后端代理转发到 OpenClaw Gateway（SSE 流式），避免浏览器 CORS 限制
const sendToGateway = async (userContent: string) => {
  // 构建消息历史（最近的消息作为上下文）
  const chatMessages = messages.value.slice(-20).map((msg) => ({
    role: msg.role as 'user' | 'assistant' | 'system',
    content: msg.content,
  }));

  try {
    const response = await fetch(`/xaa/assistants/${assistant.value!.id}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openclaw',
        messages: chatMessages,
        stream: true,
        user: currentConversation.value?.uid || 'default',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gateway 返回 ${response.status}: ${errText}`);
    }

    // 读取 SSE 流式响应
    const reader = response.body?.getReader();
    if (!reader) throw new Error('无法读取响应流');

    const decoder = new TextDecoder();
    let buffer = '';
    streamingContent.value = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            streamingContent.value += delta;
            scrollToBottom();
          }
        } catch {
          // 忽略解析错误
        }
      }
    }

    // 流式完成，保存完整回复
    if (streamingContent.value) {
      await saveAssistantMessage(streamingContent.value);
      streamingContent.value = '';
    }
  } catch (error: any) {
    console.error('Gateway 请求失败:', error);
    message.error(`AI 回复失败: ${error.message || '未知错误'}`);
  } finally {
    sending.value = false;
  }
};

// 保存助手消息
const saveAssistantMessage = async (content: string) => {
  if (!currentConversation.value) return;

  const assistantMsg: AssistantMessage = {
    id: Date.now(),
    uid: `MSG-${Date.now()}`,
    conversationId: currentConversation.value.id,
    role: 'assistant',
    content,
    modelUsed: assistant.value?.defaultModel,
    createdAt: new Date().toISOString(),
  };
  messages.value.push(assistantMsg);
  scrollToBottom();

  try {
    await addMessage(currentConversation.value.id, 'assistant', content, {
      modelUsed: assistant.value?.defaultModel,
    });
  } catch (error) {
    console.error('保存助手消息失败:', error);
  }
};

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messageContainerRef.value) {
      messageContainerRef.value.scrollTop = messageContainerRef.value.scrollHeight;
    }
  });
};

// 返回列表
const handleBack = () => {
  router.push('/XAA/assistant/index');
};

// 格式化时间
const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

// 清空输入
const clearInput = () => {
  inputMessage.value = '';
};

// 键盘事件
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
};

onMounted(() => {
  loadAssistant();
});
</script>

<template>
  <div class="flex h-screen flex-col bg-gray-50">
    <!-- 顶部栏 -->
    <div class="flex items-center justify-between border-b bg-white px-4 py-3 shadow-sm">
      <div class="flex items-center gap-3">
        <Button type="text" @click="handleBack">
          <ArrowLeftOutlined />
        </Button>
        <Avatar
          v-if="assistant"
          :size="40"
          :src="assistant.avatar"
          class="bg-blue-500"
        >
          {{ assistant.name?.charAt(0).toUpperCase() }}
        </Avatar>
        <div>
          <h3 class="m-0 font-semibold">{{ assistant?.name || '加载中...' }}</h3>
          <Text type="secondary" class="text-xs">
            {{ assistant?.defaultModel }}
            <span v-if="wsConnected" class="ml-2 text-green-500">已连接</span>
          </Text>
        </div>
      </div>
      <Space>
        <Tooltip title="历史会话">
          <Button @click="historyDrawerVisible = true">
            <HistoryOutlined />
          </Button>
        </Tooltip>
        <Tooltip title="新建对话">
          <Button type="primary" @click="createNewConversation">
            <PlusOutlined />
          </Button>
        </Tooltip>
      </Space>
    </div>

    <!-- 消息区域 -->
    <div
      ref="messageContainerRef"
      class="flex-1 overflow-y-auto p-4"
    >
      <Spin :spinning="loading">
        <!-- 欢迎消息 -->
        <div v-if="messages.length === 0 && !loading" class="flex flex-col items-center justify-center py-20">
          <Avatar :size="80" class="mb-4 bg-blue-500">
            <RobotOutlined class="text-3xl" />
          </Avatar>
          <h2 class="mb-2 text-xl">{{ assistant?.name }}</h2>
          <Paragraph type="secondary" class="max-w-md text-center">
            {{ assistant?.welcomeMessage || '你好！我是你的AI助手，有什么可以帮助你的吗？' }}
          </Paragraph>
        </div>

        <!-- 消息列表 -->
        <div class="mx-auto max-w-3xl space-y-4">
          <div
            v-for="msg in messages"
            :key="msg.id"
            class="flex gap-3"
            :class="{ 'flex-row-reverse': msg.role === 'user' }"
          >
            <Avatar
              :size="36"
              :class="msg.role === 'user' ? 'bg-green-500' : 'bg-blue-500'"
            >
              <UserOutlined v-if="msg.role === 'user'" />
              <RobotOutlined v-else />
            </Avatar>
            <div
              class="max-w-[70%] rounded-lg px-4 py-2"
              :class="
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white shadow'
              "
            >
              <div class="whitespace-pre-wrap">{{ msg.content }}</div>
              <div
                class="mt-1 text-xs"
                :class="msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'"
              >
                {{ formatTime(msg.createdAt) }}
              </div>
            </div>
          </div>

          <!-- 流式响应 -->
          <div v-if="streamingContent" class="flex gap-3">
            <Avatar :size="36" class="bg-blue-500">
              <RobotOutlined />
            </Avatar>
            <div class="max-w-[70%] rounded-lg bg-white px-4 py-2 shadow">
              <div class="whitespace-pre-wrap">{{ streamingContent }}</div>
              <div class="mt-1 text-xs text-gray-400">
                <LoadingOutlined class="mr-1" /> 正在输入...
              </div>
            </div>
          </div>

          <!-- 加载中 -->
          <div v-if="sending && !streamingContent" class="flex gap-3">
            <Avatar :size="36" class="bg-blue-500">
              <RobotOutlined />
            </Avatar>
            <div class="rounded-lg bg-white px-4 py-3 shadow">
              <LoadingOutlined class="text-blue-500" />
              <span class="ml-2 text-gray-500">正在思考...</span>
            </div>
          </div>
        </div>
      </Spin>
    </div>

    <!-- 输入区域 -->
    <div class="border-t bg-white px-4 py-3">
      <div class="mx-auto flex max-w-3xl gap-2">
        <TextArea
          v-model:value="inputMessage"
          :placeholder="assistant?.placeholder || '输入消息...'"
          :auto-size="{ minRows: 1, maxRows: 4 }"
          :disabled="sending"
          class="flex-1"
          @keydown="handleKeydown"
        />
        <div class="flex flex-col gap-1">
          <Button
            type="primary"
            :loading="sending"
            :disabled="!inputMessage.trim()"
            @click="sendMessage"
          >
            <SendOutlined />
          </Button>
          <Button
            v-if="inputMessage"
            size="small"
            type="text"
            @click="clearInput"
          >
            <ClearOutlined />
          </Button>
        </div>
      </div>
      <div class="mx-auto mt-2 max-w-3xl text-center text-xs text-gray-400">
        按 Enter 发送，Shift+Enter 换行
      </div>
    </div>

    <!-- 历史会话抽屉 -->
    <Drawer
      v-model:open="historyDrawerVisible"
      title="历史会话"
      placement="right"
      :width="360"
    >
      <div class="mb-4">
        <Button type="primary" block @click="createNewConversation">
          <PlusOutlined /> 新建对话
        </Button>
      </div>

      <List
        v-if="conversations.length > 0"
        :data-source="conversations"
        :split="true"
      >
        <template #renderItem="{ item }">
          <ListItem
            class="cursor-pointer hover:bg-gray-50"
            :class="{ 'bg-blue-50': currentConversation?.id === item.id }"
            @click="selectConversation(item)"
          >
            <ListItemMeta>
              <template #title>
                <div class="flex items-center justify-between">
                  <span class="truncate">{{ item.title || '新对话' }}</span>
                  <Popconfirm
                    title="确定删除这个会话吗？"
                    @confirm.stop="handleDeleteConversation(item.id)"
                  >
                    <Button type="text" size="small" danger @click.stop>
                      <DeleteOutlined />
                    </Button>
                  </Popconfirm>
                </div>
              </template>
              <template #description>
                <div class="flex items-center gap-2 text-xs text-gray-400">
                  <span>{{ item.messageCount }} 条消息</span>
                  <span>{{ new Date(item.updatedAt).toLocaleDateString() }}</span>
                </div>
              </template>
            </ListItemMeta>
          </ListItem>
        </template>
      </List>

      <Empty v-else description="暂无历史会话" />
    </Drawer>
  </div>
</template>

<style scoped>
.ant-input-textarea-show-count::after {
  display: none;
}
</style>
