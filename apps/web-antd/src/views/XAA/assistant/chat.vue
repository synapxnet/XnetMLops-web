<script lang="ts" setup>
import BusinessPage from '#/components/workspace/BusinessPage.vue';
import type {
  Assistant,
  AssistantConversation,
  AssistantMessage,
} from '../api/types';
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAccessStore, useUserStore } from '@vben/stores';
import { useAppConfig } from '@vben/hooks';
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
  Alert,
  Avatar,
  Button,
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
  createConversation,
  deleteConversation,
  fetchAssistant,
  fetchConversations,
  fetchMessages,
} from '../api/assistant';
import { isPersistedMessage, readAssistantStream } from './message-stream';

const { Paragraph, Text } = Typography;
const { TextArea } = Input;
const router = useRouter(),
  route = useRoute();
const userStore = useUserStore(),
  accessStore = useAccessStore();
const appConfig = useAppConfig(import.meta.env, import.meta.env.PROD);
const xaaApiURL =
  'xaaApiURL' in appConfig && typeof appConfig.xaaApiURL === 'string'
    ? appConfig.xaaApiURL
    : '/xaa';
const assistant = ref<Assistant | null>(null),
  loading = ref(false),
  loadError = ref('');
const conversations = ref<AssistantConversation[]>([]),
  currentConversation = ref<AssistantConversation | null>(null);
const messages = ref<AssistantMessage[]>([]),
  historyDrawerVisible = ref(false),
  historyError = ref(''),
  messageError = ref('');
const inputMessage = ref(''),
  sending = ref(false),
  creating = ref(false),
  conversationLoading = ref(false);
const messageContainerRef = ref<HTMLElement>(),
  streamingContent = ref(''),
  sendError = ref('');
let assistantGeneration = 0,
  conversationGeneration = 0,
  streamController: AbortController | undefined;
const ready = computed(
  () =>
    !!assistant.value &&
    !loading.value &&
    !loadError.value &&
    !historyError.value &&
    !messageError.value &&
    !conversationLoading.value,
);

/** 停止旧会话回复，避免切页或换助手后回填。 Stop an old stream before route or assistant changes can receive its output. */
function stopStream() {
  streamController?.abort();
  streamController = undefined;
  sending.value = false;
  streamingContent.value = '';
}
/** 读取有效助手与历史，失败显示可重试状态而非空白聊天。 Load a valid assistant and history with an explicit retryable failure state. */
async function loadAssistant() {
  const generation = ++assistantGeneration;
  conversationGeneration++;
  stopStream();
  assistant.value = null;
  currentConversation.value = null;
  conversations.value = [];
  messages.value = [];
  creating.value = false;
  conversationLoading.value = false;
  inputMessage.value = '';
  loadError.value = '';
  historyError.value = '';
  messageError.value = '';
  sendError.value = '';
  const raw = route.query.id;
  const id =
    typeof raw === 'string' && /^[1-9]\d*$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isSafeInteger(id)) {
    loadError.value = '缺少有效的助手 ID，请从助手列表打开对话。';
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const result = await fetchAssistant(id);
    if (generation !== assistantGeneration) return;
    if (!result || result.id !== id) throw new Error('助手不存在');
    assistant.value = result;
    await loadConversations(generation);
  } catch {
    if (generation === assistantGeneration)
      loadError.value = '助手资料加载失败或已不可访问，请重试或返回列表。';
  } finally {
    if (generation === assistantGeneration) loading.value = false;
  }
}
/** 读取当前助手的历史会话，失败禁止按空历史发送。 Load current assistant history and prevent sending against a failed empty state. */
async function loadConversations(generation = assistantGeneration) {
  if (!assistant.value) return;
  historyError.value = '';
  try {
    const result = await fetchConversations(assistant.value.id);
    if (generation !== assistantGeneration) return;
    if (!Array.isArray(result)) throw new Error('会话资料无效');
    conversations.value = result;
    if (result.length && !currentConversation.value)
      await selectConversation(result[0]!);
  } catch {
    if (generation === assistantGeneration)
      historyError.value = '历史会话加载失败，请重试后继续。';
  }
}
/** 切换会话时清除旧记录并丢弃迟到消息及错误。 Clear old records and reject stale messages or errors when switching conversations. */
async function selectConversation(conv: AssistantConversation) {
  if (sending.value) return;
  const generation = ++conversationGeneration;
  currentConversation.value = conv;
  messages.value = [];
  streamingContent.value = '';
  messageError.value = '';
  sendError.value = '';
  historyDrawerVisible.value = false;
  conversationLoading.value = true;
  try {
    const result = await fetchMessages(conv.id);
    if (generation !== conversationGeneration) return;
    if (
      !Array.isArray(result) ||
      result.some((item) => !isPersistedMessage(item, conv.id))
    )
      throw new Error('消息资料无效');
    messages.value = result;
    scrollToBottom();
  } catch {
    if (generation === conversationGeneration)
      messageError.value = '会话消息加载失败，请重试后发送。';
  } finally {
    if (generation === conversationGeneration)
      conversationLoading.value = false;
  }
}
/** 用当前认证身份创建真实会话，仅在成功回执后选中。 Create a real conversation using the authenticated identity and select it only after success. */
async function createNewConversation(): Promise<AssistantConversation | null> {
  if (
    !assistant.value ||
    creating.value ||
    loadError.value ||
    historyError.value
  )
    return null;
  creating.value = true;
  const generation = assistantGeneration;
  try {
    const userId = String(userStore.userInfo?.userId ?? '');
    const userName =
      userStore.userInfo?.realName || userStore.userInfo?.username || '';
    if (!userId) throw new Error('登录身份不可用，请重新登录');
    const conv = await createConversation(assistant.value.id, userId, userName);
    if (generation !== assistantGeneration) return null;
    if (
      !conv ||
      !Number.isSafeInteger(conv.id) ||
      conv.id <= 0 ||
      conv.assistantId !== assistant.value.id
    )
      throw new Error('服务端没有返回有效会话');
    conversations.value.unshift(conv);
    conversationGeneration++;
    currentConversation.value = conv;
    messages.value = [];
    messageError.value = '';
    sendError.value = '';
    streamingContent.value = '';
    historyDrawerVisible.value = false;
    return conv;
  } catch (error) {
    if (generation === assistantGeneration)
      sendError.value =
        error instanceof Error ? error.message : '创建会话失败，输入已保留';
    return null;
  } finally {
    if (generation === assistantGeneration) creating.value = false;
  }
}
/** 删除成功后清除当前会话，失败保留已有历史。 Remove the current conversation only after deletion succeeds and retain history on failure. */
async function handleDeleteConversation(convId: number) {
  if (sending.value || creating.value) return;
  const generation = assistantGeneration;
  try {
    await deleteConversation(convId);
    if (generation !== assistantGeneration) return;
    conversations.value = conversations.value.filter(
      (item) => item.id !== convId,
    );
    if (currentConversation.value?.id === convId) {
      conversationGeneration++;
      currentConversation.value = null;
      messages.value = [];
      messageError.value = '';
      streamingContent.value = '';
    }
    message.success('删除成功');
  } catch {
    if (generation === assistantGeneration)
      sendError.value = '删除未完成，历史会话已保留。';
  }
}
/** 验证用户消息已持久化后才发送到模型，任一步失败都给出真实状态。 Send to the model only after user-message persistence and report each failed boundary honestly. */
async function sendMessage() {
  if (
    !inputMessage.value.trim() ||
    sending.value ||
    creating.value ||
    !ready.value
  )
    return;
  if (!assistant.value?.gatewayUrl) {
    sendError.value = '未配置 Gateway URL，请在助手设置中配置后发送。';
    return;
  }
  const targetAssistant = assistant.value;
  const generation = assistantGeneration;
  const content = inputMessage.value.trim();
  sending.value = true;
  sendError.value = '';
  streamingContent.value = '';
  let persisted = false;
  try {
    const conv = currentConversation.value ?? (await createNewConversation());
    if (!conv || generation !== assistantGeneration) return;
    const messageGeneration = conversationGeneration;
    const savedUser = await addMessage(conv.id, 'user', content);
    if (
      generation !== assistantGeneration ||
      messageGeneration !== conversationGeneration
    )
      return;
    if (!isPersistedMessage(savedUser, conv.id) || savedUser.role !== 'user')
      throw new Error('服务端未确认用户消息保存');
    persisted = true;
    messages.value.push(savedUser);
    inputMessage.value = '';
    scrollToBottom();
    const controller = new AbortController();
    streamController = controller;
    const timer = setTimeout(() => controller.abort(), 60_000);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      };
      if (accessStore.accessToken)
        headers.Authorization = `Bearer ${accessStore.accessToken}`;
      const scopeRaw = sessionStorage.getItem('synapxnet:organization-scope');
      if (scopeRaw) {
        const scope = JSON.parse(scopeRaw);
        for (const [key, field] of [
          ['X-Tenant-Uid', 'tenantUid'],
          ['X-Dept-Uid', 'deptUid'],
          ['X-Team-Uid', 'teamUid'],
        ])
          if (typeof scope[field!] === 'string') headers[key!] = scope[field!];
      }
      const response = await fetch(
        `${xaaApiURL.replace(/\/$/, '')}/assistants/${targetAssistant.id}/chat/completions`,
        {
          method: 'POST',
          headers,
          signal: controller.signal,
          body: JSON.stringify({
            model: 'openclaw',
            messages: messages.value
              .slice(-20)
              .map((item) => ({ role: item.role, content: item.content })),
            stream: true,
            user: conv.uid,
          }),
        },
      );
      const reply = await readAssistantStream(response, (text) => {
        if (
          generation === assistantGeneration &&
          messageGeneration === conversationGeneration
        ) {
          streamingContent.value = text;
          scrollToBottom();
        }
      });
      if (
        generation !== assistantGeneration ||
        messageGeneration !== conversationGeneration
      )
        return;
      const savedReply = await addMessage(conv.id, 'assistant', reply, {
        modelUsed: targetAssistant.defaultModel,
      });
      if (
        generation !== assistantGeneration ||
        messageGeneration !== conversationGeneration
      )
        return;
      if (
        !isPersistedMessage(savedReply, conv.id) ||
        savedReply.role !== 'assistant'
      )
        throw new Error('服务端未确认助手回复保存');
      messages.value.push(savedReply);
      streamingContent.value = '';
      scrollToBottom();
    } finally {
      clearTimeout(timer);
      if (streamController === controller) streamController = undefined;
    }
  } catch (error) {
    if (generation === assistantGeneration) {
      const detail =
        error instanceof Error && error.name === 'AbortError'
          ? '回复超时或已取消'
          : error instanceof Error
            ? error.message
            : '请求失败';
      sendError.value =
        (persisted
          ? '用户消息已保存，AI 回复未完成：'
          : '消息发送未确认，输入已保留：') + detail;
    }
  } finally {
    if (generation === assistantGeneration) sending.value = false;
  }
}
/** 下一帧将当前消息容器滚动到最新内容。 Scroll the current message container to its newest content on the next frame. */
function scrollToBottom() {
  nextTick(() => {
    if (messageContainerRef.value)
      messageContainerRef.value.scrollTop =
        messageContainerRef.value.scrollHeight;
  });
}
/** 返回助手列表并由卸载钩子停止当前流。 Return to the assistant list and let unmount stop the active stream. */
function handleBack() {
  router.push('/XAA/assistant/index');
}
/** 使用本地时间显示有效消息时间。 Display valid message timestamps in local time. */
function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  return Number.isNaN(date.getTime())
    ? '时间未知'
    : date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}
/** 清空尚未发送的输入草稿。 Clear the unsent input draft. */
function clearInput() {
  inputMessage.value = '';
}
/** Enter发送，Shift+Enter保留换行。 Send on Enter while preserving newlines with Shift+Enter. */
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    void sendMessage();
  }
}
// 换助手后废弃旧资料和旧流。 Discard previous records and streams when the route target changes.
watch(() => [route.path, route.query.id], loadAssistant, { immediate: true });
onBeforeUnmount(() => {
  assistantGeneration++;
  conversationGeneration++;
  stopStream();
});
</script>

<template>
  <BusinessPage
    domain="智能协作"
    description="用助手、技能与工作流串联日常任务，查看每一步执行记录。"
    existing-title
  >
    <div class="assistant-chat flex min-h-[600px] flex-col bg-gray-50">
      <!-- 顶部栏 -->
      <div
        class="flex items-center justify-between border-b bg-white px-4 py-3 shadow-sm"
      >
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
            <h3 class="m-0 font-semibold">
              {{
                assistant?.name || (loading ? '正在加载助手…' : '助手暂不可用')
              }}
            </h3>
            <Text type="secondary" class="text-xs">
              {{ assistant?.defaultModel }}
              <span v-if="assistant?.gatewayUrl" class="ml-2">网关已配置</span>
            </Text>
          </div>
        </div>
        <Space>
          <Tooltip title="历史会话">
            <Button
              aria-label="历史会话"
              :disabled="!assistant || loading || sending"
              @click="historyDrawerVisible = true"
            >
              <HistoryOutlined />
            </Button>
          </Tooltip>
          <Tooltip title="新建对话">
            <Button
              type="primary"
              aria-label="新建对话"
              :loading="creating"
              :disabled="!ready || sending"
              @click="createNewConversation"
            >
              <PlusOutlined />
            </Button>
          </Tooltip>
        </Space>
      </div>

      <Alert
        v-if="loadError"
        :message="loadError"
        type="error"
        show-icon
        class="m-4"
      >
        <template #action
          ><Button @click="loadAssistant">重试读取</Button></template
        >
      </Alert>
      <Alert
        v-if="historyError"
        :message="historyError"
        type="error"
        show-icon
        class="m-4"
      >
        <template #action
          ><Button @click="loadConversations()">重试历史</Button></template
        >
      </Alert>
      <Alert
        v-if="messageError"
        :message="messageError"
        type="error"
        show-icon
        class="m-4"
      >
        <template #action
          ><Button
            @click="
              currentConversation && selectConversation(currentConversation)
            "
            >重试消息</Button
          ></template
        >
      </Alert>
      <Alert
        v-if="sendError"
        :message="sendError"
        type="warning"
        show-icon
        class="m-4"
      />
      <!-- 消息区域 -->
      <div ref="messageContainerRef" class="flex-1 overflow-y-auto p-4">
        <Spin :spinning="loading || conversationLoading">
          <!-- 欢迎消息 -->
          <div
            v-if="messages.length === 0 && ready"
            class="flex flex-col items-center justify-center py-20"
          >
            <Avatar :size="80" class="mb-4 bg-blue-500">
              <RobotOutlined class="text-3xl" />
            </Avatar>
            <h2 class="mb-2 text-xl">{{ assistant?.name }}</h2>
            <Paragraph type="secondary" class="max-w-md text-center">
              {{
                assistant?.welcomeMessage ||
                '你好！我是你的AI助手，有什么可以帮助你的吗？'
              }}
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
                  :class="
                    msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                  "
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
                  <template v-if="sending"
                    ><LoadingOutlined class="mr-1" />
                    正在接收，尚未保存…</template
                  >
                  <template v-else>部分回复 · 尚未保存</template>
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
            :disabled="sending || creating || !ready"
            class="flex-1"
            @keydown="handleKeydown"
          />
          <div class="flex flex-col gap-1">
            <Button
              type="primary"
              :loading="sending"
              :disabled="!inputMessage.trim() || !ready || creating"
              aria-label="发送消息"
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
          <Button
            type="primary"
            block
            :disabled="!ready || sending"
            :loading="creating"
            @click="createNewConversation"
          >
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
                      :disabled="sending || creating"
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
                    <span>{{
                      new Date(item.updatedAt).toLocaleDateString()
                    }}</span>
                  </div>
                </template>
              </ListItemMeta>
            </ListItem>
          </template>
        </List>

        <Empty
          v-else
          :description="historyError ? '历史会话尚未读取成功' : '暂无历史会话'"
        />
      </Drawer>
    </div>
  </BusinessPage>
</template>

<style scoped>
.ant-input-textarea-show-count::after {
  display: none;
}
.assistant-chat {
  height: min(900px, calc(100dvh - 160px));
  min-height: 480px;
}
.assistant-chat :deep(.ant-alert-action) {
  margin-left: 8px;
}
@media (max-width: 640px) {
  .assistant-chat {
    height: calc(100dvh - 130px);
    min-height: 420px;
  }
  .assistant-chat > div:first-child {
    flex-wrap: wrap;
    gap: 12px;
  }
}
</style>
