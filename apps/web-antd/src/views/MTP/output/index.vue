<!-- Copyright (C) 2026 Synapxnet. All rights reserved.
Synapxnet Proprietary and Confidential. Unauthorized copying, distribution or use is forbidden.
模型输出与真实运行摘要。Model outputs and recorded run summaries.
Author: maoyo | Department: 研发部 | Date: 2026-09-13 | Version: 1.0.0 | Security Level: INTERNAL
__version__: 1.0.0 | __author__: maoyo | __copyright__: Copyright 2026 Synapxnet
__maintainer__: maoyo | __email__: synapxnet@gmail.com -->
<script setup lang="ts">
import type { Ref } from 'vue';
import type { ModelEvidenceRun } from '../model-evidence/model';
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Alert, Button, Descriptions, DescriptionsItem, Drawer, Empty, Input, Select, Space, Table, Tag } from 'ant-design-vue';
import BusinessPage from '#/components/workspace/BusinessPage.vue';
import { fetchModelEvidence } from '../model-evidence/api';
import { fetchModelArtifacts, type ModelArtifact } from '../api/modelArtifact';

const router = useRouter();
const organization = inject<Ref<{ tenantUid: null | string }>>('selectedOrganization', ref({ tenantUid: null }));
const runs = ref<ModelEvidenceRun[]>([]);
const artifacts = ref<ModelArtifact[]>([]);
const query = ref('');
const status = ref<string>();
const loading = ref(false);
const error = ref('');
const selected = ref<ModelEvidenceRun>();
const detailOpen = ref(false);
let generation = 0;
const columns = [
  { title: '模型 / 运行', key: 'run', dataIndex: 'runUid', width: 240 },
  { title: '数据版本', dataIndex: 'productVersion', width: 180 },
  { title: '状态', key: 'status', width: 140 },
  { title: '模型摘要', key: 'digest', width: 220 },
  { title: '完成时间', dataIndex: 'completedAt', width: 200 },
  { title: '操作', key: 'actions', width: 180 },
];
const statuses: Record<string, string> = { succeeded: '训练已完成', failed: '训练失败', running: '训练中', unknown: '状态未知' };
/** 仅筛选当前授权组织的记录。Filter only current authorized organization records. */
function filteredRuns() { return runs.value.filter((run) => `${run.runUid} ${run.productVersion}`.toLowerCase().includes(query.value.toLowerCase()) && (!status.value || run.status === status.value)); }
const visibleRuns = computed(filteredRuns);

/** 读取真实输出摘要，清除旧范围并拒绝迟到响应。Read real output summaries and reject stale scope responses. */
async function loadOutputs() {
  const request = ++generation; const tenantUid = organization.value.tenantUid;
  runs.value = []; artifacts.value = []; selected.value = undefined; detailOpen.value = false; error.value = '';
  if (!tenantUid) { loading.value = false; return; }
  loading.value = true;
  try {
    const [evidence, registered] = await Promise.all([fetchModelEvidence(tenantUid), fetchModelArtifacts(tenantUid)]);
    if (request !== generation) return;
    if (evidence.scope?.tenantUid !== tenantUid || !Array.isArray(evidence.runs)) throw new Error('scope');
    runs.value = evidence.runs;
    artifacts.value = Array.isArray(registered) ? registered : [];
  } catch { if (request === generation) error.value = '模型输出读取失败。请检查服务与组织权限后重试。'; }
  finally { if (request === generation) loading.value = false; }
}
/** 查看输出摘要，不公开原始文件路径。Open output summaries without exposing raw file paths. */
function showDetails(run: ModelEvidenceRun) { selected.value = run; detailOpen.value = true; }
/** 保留既有新增输出入口。Preserve the existing output creation entry. */
function createOutput() { void router.push('/MTP/modeloutput/outputcreate'); }
/** 打开已有证据比较工作台。Open the existing evidence comparison workspace. */
function compareModels() { void router.push('/MTP/model-evidence'); }
/** 卸载后丢弃未完成请求。Discard pending requests after unmount. */
function invalidateRequests() { generation += 1; }
watch(organization, loadOutputs, { deep: true, immediate: true });
onBeforeUnmount(invalidateRequests);
</script>
<template>
  <BusinessPage domain="模型研发" description="查看训练产生的模型摘要、数据版本与完成记录，继续比较迭代结果。">
    <div class="output-toolbar"><Space wrap><Input v-model:value="query" allow-clear placeholder="搜索运行或数据版本" aria-label="搜索模型输出" style="width: 260px" /><Select v-model:value="status" allow-clear placeholder="全部状态" aria-label="模型输出状态" style="width: 150px" :options="[{ label: '已完成', value: 'succeeded' }, { label: '运行中', value: 'running' }, { label: '失败', value: 'failed' }]" /></Space><Space wrap><Button :loading="loading" @click="loadOutputs">刷新</Button><Button @click="createOutput">新增输出</Button><Button type="primary" @click="compareModels">比较模型证据</Button></Space></div>
    <Alert v-if="error" type="error" show-icon :message="error" class="mb-4"><template #action><Button size="small" @click="loadOutputs">重试</Button></template></Alert>
    <Alert type="info" show-icon message="当前组织的训练证据与已登记模型制品。制品 UID 可用于后续部署和审计。" class="mb-4" />
    <Table :columns="columns" :data-source="visibleRuns" :loading="loading" :scroll="{ x: 1160 }" row-key="runUid">
      <template #emptyText><Empty :description="error ? '数据暂不可用' : '当前范围暂无模型输出'" /></template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'run'"><Button type="link" @click="showDetails(record as ModelEvidenceRun)">{{ record.runUid }}</Button></template>
        <template v-else-if="column.key === 'status'"><Tag :color="record.status === 'succeeded' ? 'blue' : 'default'">{{ statuses[record.status] || '状态未知' }}</Tag></template>
        <template v-else-if="column.key === 'digest'"><span :title="record.modelDigestSha256">{{ record.modelDigestSha256 ? record.modelDigestSha256.slice(0, 20) + '…' : '尚未记录' }}</span></template>
        <template v-else-if="column.key === 'actions'"><Button type="link" @click="showDetails(record as ModelEvidenceRun)">详情</Button><Button disabled title="文件目录尚未接入" type="text">目录</Button><Button disabled title="训练证据为只读记录" type="text">删除</Button></template>
      </template>
    </Table>
    <section v-if="artifacts.length" class="mt-6"><h3 class="mb-3 text-base font-semibold">已登记模型制品</h3><Table :pagination="false" :data-source="artifacts" :columns="[{ title: '制品名称', dataIndex: 'outputName' }, { title: '框架', dataIndex: 'framework' }, { title: '领域', dataIndex: 'domain' }, { title: '文件', key: 'file' }, { title: '登记时间', dataIndex: 'createdAt' }]" row-key="uid"><template #bodyCell="{ column, record }"><span v-if="column.key === 'file'">{{ record.artifactPath ? '已归档到 HDFS' : '仅元数据' }}</span></template></Table></section>
    <Drawer v-model:open="detailOpen" title="模型输出详情" width="580">
      <Descriptions v-if="selected" :column="1" bordered><DescriptionsItem label="运行">{{ selected.runUid }}</DescriptionsItem><DescriptionsItem label="数据版本">{{ selected.productVersion }}</DescriptionsItem><DescriptionsItem label="模型 SHA-256"><span style="overflow-wrap:anywhere">{{ selected.modelDigestSha256 || '尚未记录' }}</span></DescriptionsItem><DescriptionsItem label="测试样本">{{ selected.sampleCounts?.test ?? '未知' }}</DescriptionsItem><DescriptionsItem label="指标"><pre>{{ JSON.stringify(selected.metrics, null, 2) }}</pre></DescriptionsItem></Descriptions>
      <p class="xnet-muted mt-4">这里只展示已记录证据。完整评测套件和真实部署验证仍需补齐。</p>
    </Drawer>
  </BusinessPage>
</template>
<style scoped>.output-toolbar { display:flex; justify-content:space-between; flex-wrap:wrap; gap:16px; margin-bottom:20px; }</style>
