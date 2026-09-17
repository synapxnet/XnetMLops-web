/* Copyright (C) 2026 Synapxnet. All rights reserved.
This file is Synapxnet Proprietary and Confidential. It is strictly
forbidden to copy, distribute, or use without explicit authorization.
用途：流式回复和持久化回执回归。Purpose: Regress streaming completion and persisted message receipts.
Author: maoyo | Department: 研发部 | Date: 2026-09-14 | Version: 1.0.0 | Security Level: INTERNAL
__version__: 1.0.0 | __author__: maoyo | __copyright__: Copyright 2026 Synapxnet
__maintainer__: maoyo | __email__: synapxnet@gmail.com */
import { describe, expect, it } from 'vitest';
import { isPersistedMessage, readAssistantStream } from './message-stream';

/** 按网络分块构造真实流式响应。 Construct an actual streaming response from network-like chunks. */
function reply(chunks: string[]) {
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks)
          controller.enqueue(new TextEncoder().encode(chunk));
        controller.close();
      },
    }),
    { headers: { 'content-type': 'text/event-stream' } },
  );
}
describe('助手消息真实性 / assistant message integrity', () => {
  it('处理跨块事件与末尾无换行的完成标记 / handles split events and completion without a trailing newline', async () => {
    const seen: string[] = [];
    const result = await readAssistantStream(
      reply([
        'data: {"choices":[{"delta":{"content":"你',
        '好"}}]}\n\ndata: [DONE]',
      ]),
      (text) => seen.push(text),
    );
    expect(result).toBe('你好');
    expect(seen).toEqual(['你好']);
  });
  it('中断流拒绝成为完整回复 / rejects a truncated stream as a completed reply', async () => {
    await expect(
      readAssistantStream(
        reply(['data: {"choices":[{"delta":{"content":"部分"}}]}\n']),
        () => undefined,
      ),
    ).rejects.toThrow('中断');
  });
  it('拒绝非流响应和服务端错误 / rejects non-stream responses and server errors', async () => {
    await expect(
      readAssistantStream(new Response('{}'), () => undefined),
    ).rejects.toThrow('有效');
    await expect(
      readAssistantStream(new Response('', { status: 503 }), () => undefined),
    ).rejects.toThrow('503');
  });
  it('拒绝错误事件和空成功流 / rejects error events and empty completed streams', async () => {
    await expect(
      readAssistantStream(
        reply(['data: {"error":"failed"}\n']),
        () => undefined,
      ),
    ).rejects.toThrow('拒绝');
    await expect(
      readAssistantStream(reply(['data: [DONE]\n']), () => undefined),
    ).rejects.toThrow('没有返回');
  });
  it('要求持久消息属于目标会话 / requires persisted messages to belong to the target conversation', () => {
    expect(
      isPersistedMessage({ id: 4, conversationId: 2, content: '保存回执' }, 2),
    ).toBe(true);
    expect(
      isPersistedMessage({ id: 4, conversationId: 3, content: '其他会话' }, 2),
    ).toBe(false);
    expect(
      isPersistedMessage({ conversationId: 2, content: '没有服务端ID' }, 2),
    ).toBe(false);
  });
});
