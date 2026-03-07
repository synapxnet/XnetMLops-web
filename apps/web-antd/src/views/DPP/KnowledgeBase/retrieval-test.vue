<template>
  <div class="retrieval-test">
    <Card class="retrieval-test__header">
      <div class="retrieval-test__title-row">
        <div class="retrieval-test__back">
          <Button @click="goBack">
            <template #icon><ArrowLeftOutlined /></template>
            返回知识库列表
          </Button>
        </div>
        <div class="retrieval-test__info">
          <h2 class="retrieval-test__title">
            <ExperimentOutlined />
            {{ kbName }} - 检索测试
          </h2>
          <p class="retrieval-test__subtitle">
            测试知识库的检索效果，调整检索参数以获得最佳结果
          </p>
        </div>
      </div>
    </Card>

    <Row :gutter="16">
      <!-- 左侧：查询面板 -->
      <Col :span="10">
        <Card title="查询设置" class="query-panel">
          <Form layout="vertical">
            <FormItem label="查询文本">
              <Textarea
                v-model:value="queryForm.query"
                placeholder="输入您要检索的问题或关键词..."
                :rows="4"
                show-count
                :maxlength="500"
              />
            </FormItem>

            <Divider orientation="left">检索参数</Divider>

            <Row :gutter="16">
              <Col :span="12">
                <FormItem label="检索方法">
                  <Select v-model:value="queryForm.retrievalMethod">
                    <SelectOption value="hybrid">混合检索</SelectOption>
                    <SelectOption value="semantic">语义检索</SelectOption>
                    <SelectOption value="keyword">关键词检索</SelectOption>
                  </Select>
                </FormItem>
              </Col>
              <Col :span="12">
                <FormItem label="返回数量 (Top K)">
                  <InputNumber
                    v-model:value="queryForm.topK"
                    :min="1"
                    :max="20"
                    style="width: 100%"
                  />
                </FormItem>
              </Col>
            </Row>

            <Row :gutter="16">
              <Col :span="12">
                <FormItem label="分数阈值">
                  <Slider
                    v-model:value="queryForm.scoreThreshold"
                    :min="0"
                    :max="1"
                    :step="0.05"
                    :marks="{ 0: '0', 0.5: '0.5', 1: '1' }"
                  />
                </FormItem>
              </Col>
              <Col :span="12">
                <FormItem label="重排序">
                  <Switch v-model:checked="queryForm.rerankEnabled" />
                  <span class="switch-label">{{ queryForm.rerankEnabled ? '已启用' : '已禁用' }}</span>
                </FormItem>
              </Col>
            </Row>

            <FormItem>
              <Button
                type="primary"
                block
                size="large"
                :loading="loading"
                :disabled="!queryForm.query.trim()"
                @click="handleSearch"
              >
                <template #icon><SearchOutlined /></template>
                执行检索
              </Button>
            </FormItem>
          </Form>

          <!-- 历史查询 -->
          <div v-if="queryHistory.length > 0" class="query-history">
            <div class="query-history__header">
              <span>历史查询</span>
              <Button type="link" size="small" @click="clearHistory">清空</Button>
            </div>
            <div class="query-history__list">
              <Tag
                v-for="(query, index) in queryHistory"
                :key="index"
                class="query-history__item"
                @click="queryForm.query = query"
              >
                {{ truncate(query, 20) }}
              </Tag>
            </div>
          </div>
        </Card>
      </Col>

      <!-- 右侧：结果面板 -->
      <Col :span="14">
        <Card class="result-panel">
          <template #title>
            <div class="result-panel__header">
              <span>检索结果</span>
              <div v-if="retrievalResult" class="result-panel__stats">
                <Tag color="blue">{{ retrievalResult.results.length }} 条结果</Tag>
                <Tag color="green">{{ retrievalResult.totalLatencyMs }}ms</Tag>
              </div>
            </div>
          </template>

          <Spin :spinning="loading">
            <div v-if="retrievalResult" class="result-content">
              <!-- 性能指标 -->
              <div class="latency-stats">
                <div class="latency-item">
                  <span class="latency-label">嵌入</span>
                  <span class="latency-value">{{ retrievalResult.embeddingLatencyMs }}ms</span>
                </div>
                <div class="latency-item">
                  <span class="latency-label">检索</span>
                  <span class="latency-value">{{ retrievalResult.retrievalLatencyMs }}ms</span>
                </div>
                <div v-if="retrievalResult.rerankLatencyMs" class="latency-item">
                  <span class="latency-label">重排序</span>
                  <span class="latency-value">{{ retrievalResult.rerankLatencyMs }}ms</span>
                </div>
                <div class="latency-item latency-item--total">
                  <span class="latency-label">总计</span>
                  <span class="latency-value">{{ retrievalResult.totalLatencyMs }}ms</span>
                </div>
              </div>

              <!-- 结果列表 -->
              <div class="result-list">
                <div
                  v-for="(result, index) in retrievalResult.results"
                  :key="result.chunkId"
                  class="result-item"
                  :class="{ 'result-item--expanded': expandedResult === index }"
                  @click="toggleExpand(index)"
                >
                  <div class="result-item__header">
                    <div class="result-item__rank">
                      <span class="rank-number">#{{ index + 1 }}</span>
                      <Tag :color="getScoreColor(result.score)">
                        {{ (result.score * 100).toFixed(1) }}%
                      </Tag>
                    </div>
                    <div class="result-item__source">
                      <FileTextOutlined />
                      {{ result.docName }}
                    </div>
                    <div class="result-item__actions">
                      <Tooltip title="复制内容">
                        <CopyOutlined @click.stop="copyContent(result.content)" />
                      </Tooltip>
                      <DownOutlined :class="{ 'rotated': expandedResult === index }" />
                    </div>
                  </div>

                  <div class="result-item__preview">
                    {{ expandedResult === index ? result.content : truncate(result.content, 150) }}
                  </div>

                  <div v-if="expandedResult === index && result.metadata" class="result-item__metadata">
                    <div class="metadata-label">元数据</div>
                    <pre class="metadata-content">{{ JSON.stringify(result.metadata, null, 2) }}</pre>
                  </div>
                </div>
              </div>
            </div>

            <Empty v-else description="输入查询文本并点击检索按钮">
              <template #image>
                <SearchOutlined style="font-size: 48px; color: #d9d9d9" />
              </template>
            </Empty>
          </Spin>
        </Card>
      </Col>
    </Row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Card,
  Button,
  Form,
  FormItem,
  Input,
  Select,
  SelectOption,
  InputNumber,
  Slider,
  Switch,
  Row,
  Col,
  Divider,
  Tag,
  Tooltip,
  Spin,
  Empty,
  message,
} from 'ant-design-vue';
import {
  ArrowLeftOutlined,
  ExperimentOutlined,
  SearchOutlined,
  FileTextOutlined,
  CopyOutlined,
  DownOutlined,
} from '@ant-design/icons-vue';

import type { RetrievalRequest, RetrievalResponse, RetrievalMethod } from './types';
import { retrieveTest } from './api';

const { Textarea } = Input;

const route = useRoute();
const router = useRouter();

// 路由参数
const kbId = computed(() => Number(route.query.id));
const kbName = computed(() => (route.query.name as string) || '知识库');

// 状态
const loading = ref(false);
const retrievalResult = ref<RetrievalResponse | null>(null);
const expandedResult = ref<number | null>(null);
const queryHistory = ref<string[]>([]);

// 查询表单
const queryForm = reactive<RetrievalRequest>({
  query: '',
  retrievalMethod: 'hybrid',
  topK: 5,
  scoreThreshold: 0.5,
  rerankEnabled: false,
});

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen) + '...';
}

function getScoreColor(score: number): string {
  if (score >= 0.8) return 'green';
  if (score >= 0.6) return 'blue';
  if (score >= 0.4) return 'orange';
  return 'red';
}

function toggleExpand(index: number) {
  expandedResult.value = expandedResult.value === index ? null : index;
}

async function handleSearch() {
  if (!queryForm.query.trim()) {
    message.warning('请输入查询文本');
    return;
  }

  loading.value = true;
  expandedResult.value = null;

  try {
    retrievalResult.value = await retrieveTest(kbId.value, queryForm);

    // 添加到历史
    if (!queryHistory.value.includes(queryForm.query)) {
      queryHistory.value.unshift(queryForm.query);
      if (queryHistory.value.length > 10) {
        queryHistory.value.pop();
      }
      // 保存到 localStorage
      localStorage.setItem(`kb_query_history_${kbId.value}`, JSON.stringify(queryHistory.value));
    }
  } catch (error) {
    message.error('检索失败');
  } finally {
    loading.value = false;
  }
}

function copyContent(content: string) {
  navigator.clipboard.writeText(content).then(() => {
    message.success('已复制到剪贴板');
  });
}

function clearHistory() {
  queryHistory.value = [];
  localStorage.removeItem(`kb_query_history_${kbId.value}`);
}

function goBack() {
  router.push('/DPP/KnowledgeBase');
}

onMounted(() => {
  // 加载历史查询
  const saved = localStorage.getItem(`kb_query_history_${kbId.value}`);
  if (saved) {
    try {
      queryHistory.value = JSON.parse(saved);
    } catch (e) {
      // ignore
    }
  }
});
</script>

<style lang="scss" scoped>
.retrieval-test {
  padding: 16px;
  min-height: 100%;
  background: #f5f5f5;

  &__header {
    margin-bottom: 16px;
    border-radius: 12px;
  }

  &__title-row {
    display: flex;
    align-items: flex-start;
    gap: 24px;
  }

  &__back {
    flex-shrink: 0;
  }

  &__info {
    flex: 1;
  }

  &__title {
    font-size: 24px;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 8px 0;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__subtitle {
    font-size: 14px;
    color: #6b7280;
    margin: 0;
  }
}

.query-panel {
  border-radius: 12px;
  height: calc(100vh - 200px);
  overflow-y: auto;
}

.switch-label {
  margin-left: 8px;
  color: #6b7280;
}

.query-history {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    font-weight: 500;
    color: #374151;
  }

  &__list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__item {
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      color: #1890ff;
      border-color: #1890ff;
    }
  }
}

.result-panel {
  border-radius: 12px;
  height: calc(100vh - 200px);
  overflow-y: auto;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__stats {
    display: flex;
    gap: 8px;
  }
}

.latency-stats {
  display: flex;
  gap: 24px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  margin-bottom: 16px;
}

.latency-item {
  text-align: center;

  &--total {
    padding-left: 24px;
    border-left: 1px solid #e5e7eb;

    .latency-value {
      color: #1890ff;
      font-weight: 600;
    }
  }
}

.latency-label {
  display: block;
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 4px;
}

.latency-value {
  font-size: 16px;
  font-weight: 500;
  color: #1f2937;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-item {
  padding: 16px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #1890ff;
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
  }

  &--expanded {
    border-color: #1890ff;
    background: #f6f9ff;
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  &__rank {
    display: flex;
    align-items: center;
    gap: 8px;

    .rank-number {
      font-weight: 600;
      color: #1890ff;
    }
  }

  &__source {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #6b7280;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 12px;
    color: #9ca3af;

    .anticon {
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        color: #1890ff;
      }

      &.rotated {
        transform: rotate(180deg);
      }
    }
  }

  &__preview {
    font-size: 14px;
    line-height: 1.6;
    color: #4b5563;
    word-break: break-all;
    white-space: pre-wrap;
  }

  &__metadata {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px dashed #e5e7eb;
  }
}

.metadata-label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 8px;
}

.metadata-content {
  padding: 12px;
  background: #1f2937;
  border-radius: 6px;
  font-size: 12px;
  color: #10b981;
  overflow-x: auto;
  margin: 0;
}
</style>
