<template>
  <Drawer
    v-model:open="visible"
    :title="`文档分块查看 - ${docName}`"
    :width="720"
    @close="handleClose"
  >
    <div class="chunk-viewer">
      <div class="chunk-viewer__header">
        <div class="chunk-stats">
          <div class="stat-item">
            <span class="stat-value">{{ chunks.length }}</span>
            <span class="stat-label">总分块数</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ totalTokens }}</span>
            <span class="stat-label">总Token数</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ avgChunkSize }}</span>
            <span class="stat-label">平均字符数</span>
          </div>
        </div>

        <div class="chunk-actions">
          <Input
            v-model:value="searchKeyword"
            placeholder="搜索分块内容..."
            style="width: 200px"
            allow-clear
          >
            <template #prefix><SearchOutlined /></template>
          </Input>
        </div>
      </div>

      <Spin :spinning="loading">
        <div v-if="filteredChunks.length > 0" class="chunk-list">
          <div
            v-for="(chunk, index) in filteredChunks"
            :key="chunk.id"
            class="chunk-item"
            :class="{ 'chunk-item--selected': selectedChunk?.id === chunk.id }"
            @click="selectChunk(chunk)"
          >
            <div class="chunk-item__header">
              <div class="chunk-item__index">
                <NumberOutlined />
                分块 {{ chunk.position + 1 }}
              </div>
              <div class="chunk-item__meta">
                <Tag size="small">{{ chunk.tokenCount }} tokens</Tag>
                <Tag size="small" color="blue">{{ chunk.charCount }} 字符</Tag>
                <Tag v-if="chunk.pageNumber" size="small" color="green">
                  第 {{ chunk.pageNumber }} 页
                </Tag>
              </div>
            </div>
            <div class="chunk-item__content">
              {{ truncateContent(chunk.content) }}
            </div>
            <div v-if="chunk.keywords" class="chunk-item__keywords">
              <TagOutlined />
              {{ chunk.keywords }}
            </div>
          </div>
        </div>
        <Empty v-else description="暂无分块数据" />
      </Spin>
    </div>

    <!-- 分块详情面板 -->
    <div v-if="selectedChunk" class="chunk-detail">
      <Divider />
      <div class="chunk-detail__header">
        <h4>分块详情</h4>
        <Button type="text" @click="selectedChunk = null">
          <CloseOutlined />
        </Button>
      </div>

      <Descriptions :column="2" size="small" bordered>
        <DescriptionsItem label="分块ID">{{ selectedChunk.uid }}</DescriptionsItem>
        <DescriptionsItem label="位置">{{ selectedChunk.position + 1 }}</DescriptionsItem>
        <DescriptionsItem label="Token数">{{ selectedChunk.tokenCount }}</DescriptionsItem>
        <DescriptionsItem label="字符数">{{ selectedChunk.charCount }}</DescriptionsItem>
        <DescriptionsItem v-if="selectedChunk.pageNumber" label="页码">
          {{ selectedChunk.pageNumber }}
        </DescriptionsItem>
        <DescriptionsItem v-if="selectedChunk.startIndex !== undefined" label="起止位置">
          {{ selectedChunk.startIndex }} - {{ selectedChunk.endIndex }}
        </DescriptionsItem>
        <DescriptionsItem label="层级">{{ selectedChunk.chunkLevel }}</DescriptionsItem>
        <DescriptionsItem v-if="selectedChunk.embeddingId" label="嵌入ID">
          {{ selectedChunk.embeddingId }}
        </DescriptionsItem>
      </Descriptions>

      <div class="chunk-detail__content">
        <div class="content-label">完整内容</div>
        <div class="content-text">{{ selectedChunk.content }}</div>
      </div>

      <div v-if="selectedChunk.summary" class="chunk-detail__summary">
        <div class="content-label">摘要</div>
        <div class="content-text">{{ selectedChunk.summary }}</div>
      </div>

      <div v-if="selectedChunk.metadata" class="chunk-detail__metadata">
        <div class="content-label">元数据</div>
        <pre class="metadata-json">{{ JSON.stringify(selectedChunk.metadata, null, 2) }}</pre>
      </div>
    </div>
  </Drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  Drawer,
  Input,
  Spin,
  Empty,
  Tag,
  Divider,
  Button,
  Descriptions,
  DescriptionsItem,
} from 'ant-design-vue';
import {
  SearchOutlined,
  NumberOutlined,
  TagOutlined,
  CloseOutlined,
} from '@ant-design/icons-vue';

import type { KBChunk } from '../types';
import { fetchChunks } from '../api';

const props = defineProps<{
  open: boolean;
  kbId: number;
  docId: number;
  docName: string;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
}>();

const visible = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
});

const loading = ref(false);
const chunks = ref<KBChunk[]>([]);
const searchKeyword = ref('');
const selectedChunk = ref<KBChunk | null>(null);

const filteredChunks = computed(() => {
  if (!searchKeyword.value) return chunks.value;
  const keyword = searchKeyword.value.toLowerCase();
  return chunks.value.filter(
    (chunk) =>
      chunk.content.toLowerCase().includes(keyword) ||
      (chunk.keywords && chunk.keywords.toLowerCase().includes(keyword))
  );
});

const totalTokens = computed(() => {
  return chunks.value.reduce((sum, chunk) => sum + chunk.tokenCount, 0);
});

const avgChunkSize = computed(() => {
  if (chunks.value.length === 0) return 0;
  const total = chunks.value.reduce((sum, chunk) => sum + chunk.charCount, 0);
  return Math.round(total / chunks.value.length);
});

watch(
  () => props.open,
  (newVal) => {
    if (newVal && props.kbId && props.docId) {
      loadChunks();
    }
  }
);

async function loadChunks() {
  loading.value = true;
  try {
    chunks.value = await fetchChunks(props.kbId, props.docId);
  } catch (error) {
    console.error('Failed to load chunks:', error);
  } finally {
    loading.value = false;
  }
}

function truncateContent(content: string, maxLen = 200): string {
  if (content.length <= maxLen) return content;
  return content.substring(0, maxLen) + '...';
}

function selectChunk(chunk: KBChunk) {
  selectedChunk.value = selectedChunk.value?.id === chunk.id ? null : chunk;
}

function handleClose() {
  selectedChunk.value = null;
  searchKeyword.value = '';
  visible.value = false;
}
</script>

<style lang="scss" scoped>
.chunk-viewer {
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f0f0f0;
  }
}

.chunk-stats {
  display: flex;
  gap: 24px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 600;
  color: #1890ff;
}

.stat-label {
  font-size: 12px;
  color: #9ca3af;
}

.chunk-list {
  max-height: calc(100vh - 400px);
  overflow-y: auto;
}

.chunk-item {
  padding: 16px;
  margin-bottom: 12px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #1890ff;
    background: #f6f9ff;
  }

  &--selected {
    border-color: #1890ff;
    background: #e6f7ff;
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  &__index {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    color: #1f2937;
  }

  &__meta {
    display: flex;
    gap: 4px;
  }

  &__content {
    font-size: 13px;
    color: #4b5563;
    line-height: 1.6;
    word-break: break-all;
  }

  &__keywords {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed #e5e7eb;
    font-size: 12px;
    color: #6b7280;
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

.chunk-detail {
  margin-top: 16px;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    h4 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
  }

  &__content,
  &__summary,
  &__metadata {
    margin-top: 16px;
  }
}

.content-label {
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.content-text {
  padding: 12px;
  background: #f9fafb;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: #4b5563;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
}

.metadata-json {
  padding: 12px;
  background: #1f2937;
  border-radius: 6px;
  font-size: 12px;
  color: #10b981;
  overflow-x: auto;
  margin: 0;
}
</style>
