import type {
  Assistant,
  AssistantConversation,
  AssistantMessage,
} from './types';

import { xaaRequestClient } from '#/api/request';

// ==================== 助手管理 ====================

/** 获取所有助手 */
export async function fetchAssistantList(): Promise<Assistant[]> {
  const res = await xaaRequestClient.get<Assistant[]>('/assistants');
  return Array.isArray(res) ? res : (res as any).data || [];
}

/** 获取激活的助手 */
export async function fetchActiveAssistants(): Promise<Assistant[]> {
  const res = await xaaRequestClient.get<Assistant[]>('/assistants/active');
  return Array.isArray(res) ? res : (res as any).data || [];
}

/** 获取默认助手 */
export async function fetchDefaultAssistant(): Promise<Assistant | null> {
  const res = await xaaRequestClient.get<any>('/assistants/default');
  return res?.data ?? res ?? null;
}

/** 获取助手详情 */
export async function fetchAssistant(id: number): Promise<Assistant | null> {
  const res = await xaaRequestClient.get<any>(`/assistants/${id}`);
  return res?.data ?? res ?? null;
}

/** 获取助手配置(用于浮窗) */
export async function fetchAssistantConfig(
  id: number,
): Promise<Record<string, any> | null> {
  const res = await xaaRequestClient.get<any>(`/assistants/${id}/config`);
  return res?.data ?? res ?? null;
}

/** 创建助手 */
export async function createAssistant(
  data: Partial<Assistant>,
): Promise<Assistant> {
  const res = await xaaRequestClient.post<any>('/assistants', data);
  return res?.data ?? res;
}

/** 更新助手 */
export async function updateAssistant(
  id: number,
  data: Partial<Assistant>,
): Promise<Assistant> {
  const res = await xaaRequestClient.put<any>(`/assistants/${id}`, data);
  return res?.data ?? res;
}

/** 删除助手 */
export async function deleteAssistant(id: number): Promise<void> {
  await xaaRequestClient.delete(`/assistants/${id}`);
}

/** 更新助手状态 */
export async function updateAssistantStatus(
  id: number,
  status: string,
): Promise<void> {
  await xaaRequestClient.post(`/assistants/${id}/status`, { status });
}

/** 设为默认助手 */
export async function setDefaultAssistant(id: number): Promise<void> {
  await xaaRequestClient.post(`/assistants/${id}/set-default`);
}

// ==================== 会话管理 ====================

/** 获取助手的会话列表 */
export async function fetchConversations(
  assistantId: number,
): Promise<AssistantConversation[]> {
  const res = await xaaRequestClient.get<AssistantConversation[]>(
    `/assistants/${assistantId}/conversations`,
  );
  return Array.isArray(res) ? res : (res as any).data || [];
}

/** 创建新会话 */
export async function createConversation(
  assistantId: number,
  userId: string,
  userName: string,
): Promise<AssistantConversation> {
  const res = await xaaRequestClient.post<any>(
    `/assistants/${assistantId}/conversations`,
    { userId, userName },
  );
  return res?.data ?? res;
}

/** 获取会话详情 */
export async function fetchConversation(
  convId: number,
): Promise<AssistantConversation | null> {
  const res = await xaaRequestClient.get<any>(
    `/assistants/conversations/${convId}`,
  );
  return res?.data ?? res ?? null;
}

/** 归档会话 */
export async function archiveConversation(convId: number): Promise<void> {
  await xaaRequestClient.post(`/assistants/conversations/${convId}/archive`);
}

/** 删除会话 */
export async function deleteConversation(convId: number): Promise<void> {
  await xaaRequestClient.delete(`/assistants/conversations/${convId}`);
}

/** 获取用户的所有会话 */
export async function fetchUserConversations(
  userId: string,
): Promise<AssistantConversation[]> {
  const res = await xaaRequestClient.get<AssistantConversation[]>(
    `/assistants/user/${userId}/conversations`,
  );
  return Array.isArray(res) ? res : (res as any).data || [];
}

// ==================== 消息管理 ====================

/** 获取会话消息 */
export async function fetchMessages(
  convId: number,
  limit = 50,
): Promise<AssistantMessage[]> {
  const res = await xaaRequestClient.get<AssistantMessage[]>(
    `/assistants/conversations/${convId}/messages`,
    { params: { limit } },
  );
  return Array.isArray(res) ? res : (res as any).data || [];
}

/** 添加消息 */
export async function addMessage(
  convId: number,
  role: 'user' | 'assistant' | 'system',
  content: string,
  extra?: {
    tokenCount?: number;
    modelUsed?: string;
    ragSources?: string;
    toolCalls?: string;
  },
): Promise<AssistantMessage> {
  const res = await xaaRequestClient.post<any>(
    `/assistants/conversations/${convId}/messages`,
    { role, content, ...extra },
  );
  return res?.data ?? res;
}
