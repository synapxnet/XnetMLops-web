/* Copyright (C) 2026 Synapxnet. All rights reserved.
This file is Synapxnet Proprietary and Confidential. It is strictly
forbidden to copy, distribute, or use without explicit authorization.
用途：助手流式回复完整性校验。Purpose: Validate completion of assistant streaming replies.
Author: maoyo | Department: 研发部 | Date: 2026-09-14 | Version: 1.0.0 | Security Level: INTERNAL
__version__: 1.0.0 | __author__: maoyo | __copyright__: Copyright 2026 Synapxnet
__maintainer__: maoyo | __email__: synapxnet@gmail.com */

/** 读取有界SSE并要求结束标记，不把中断流当作完整回复。 Read bounded SSE with a completion marker so interrupted streams never become completed replies. */
export async function readAssistantStream(
  response: Response,
  onDelta: (text: string) => void,
): Promise<string> {
  if (!response.ok) throw new Error(`模型服务返回 ${response.status}`);
  if (!response.headers.get('content-type')?.includes('text/event-stream'))
    throw new Error('模型服务没有返回有效的流式回复');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('无法读取模型回复');
  const decoder = new TextDecoder();
  let buffer = '',
    content = '',
    completed = false,
    bytes = 0;
  /** 解析单行事件并保留完成信号。 Parse one SSE line while preserving the completion signal. */
  const line = (value: string) => {
    const raw = value.trim();
    if (!raw.startsWith('data:')) return;
    const data = raw.slice(5).trim();
    if (data === '[DONE]') {
      completed = true;
      return;
    }
    if (!data) return;
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch {
      throw new Error('模型返回无法解析的流式事件');
    }
    if (parsed.error) throw new Error('模型服务拒绝了本次请求');
    const choice = parsed.choices?.[0];
    if (typeof choice?.delta?.content === 'string') {
      content += choice.delta.content;
      onDelta(content);
    }
    if (choice?.finish_reason !== undefined && choice.finish_reason !== null)
      completed = true;
  };
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 4 * 1024 * 1024)
        throw new Error('模型回复超过当前页面可接收上限');
      buffer += decoder.decode(chunk.value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const value of lines) line(value);
    }
    buffer += decoder.decode();
    if (buffer.trim()) line(buffer);
    if (!completed) throw new Error('模型回复中断，部分内容尚未保存');
    if (!content.trim()) throw new Error('模型没有返回文字回复');
    return content;
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
}

/** 检查消息属于目标会话并具有服务端记录标识。 Validate that a persisted message has an identifier and belongs to the target conversation. */
export function isPersistedMessage(
  value: unknown,
  conversationId: number,
): boolean {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    Number.isSafeInteger(record.id) &&
    Number(record.id) > 0 &&
    record.conversationId === conversationId &&
    typeof record.content === 'string'
  );
}
