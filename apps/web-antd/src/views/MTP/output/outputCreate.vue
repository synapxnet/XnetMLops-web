<!-- Copyright (C) 2026 Synapxnet. All rights reserved.
Synapxnet Proprietary and Confidential. Unauthorized copying, distribution or use is forbidden.
模型制品登记页面。Model artifact registration page.
Author: maoyo | Department: 研发部 | Date: 2026-09-16 | Version: 1.0.0 | Security Level: INTERNAL
__version__: 1.0.0 | __author__: maoyo | __copyright__: Copyright 2026 Synapxnet
__maintainer__: maoyo | __email__: synapxnet@gmail.com -->
<script setup lang="ts">
import type { Ref } from 'vue';
import { inject, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Alert, Button, Card, Form, Input, message, Select, Upload } from 'ant-design-vue';
import type { FormInstance, UploadChangeParam } from 'ant-design-vue';
import BusinessPage from '#/components/workspace/BusinessPage.vue';
import { Page } from '@vben/common-ui';
import { createModelArtifact, uploadModelToTemp } from '../api/modelArtifact';

const router = useRouter(); const formRef = ref<FormInstance>(); const formState = ref({ outputName: '', framework: '', domain: '', description: '' });
const selectedFile = ref<File>(); const submitting = ref(false); const uploadPercent = ref(0);
const organization = inject<Ref<{ tenantUid?: string | null; teamUid?: string | null; deptUid?: string | null }>>('selectedOrganization', ref({}));
const currentUserInfo = inject<Ref<{ userId?: string | null }>>('currentUserInfo', ref({}));
/** 接收用户选择的模型文件。 / Capture the selected model file. */
function onFileChange(info: UploadChangeParam) { selectedFile.value = info.file.originFileObj as File | undefined; }
/** 阻止组件自行上传，提交时统一登记。 / Prevent auto-upload so registration remains atomic. */
function beforeUpload(file: File) { selectedFile.value = file; return false; }
/** 提交元数据并转存可选模型文件。 / Submit metadata and move the optional model file. */
async function handleSubmit() {
  try { await formRef.value?.validate(); const tenantUid = organization.value.tenantUid || ''; const teamUid = organization.value.teamUid || ''; const deptUid = organization.value.deptUid || null; const userId = currentUserInfo.value.userId || ''; if (!tenantUid || !teamUid || !userId) throw new Error('请先选择企业空间、团队并确认登录身份'); submitting.value = true; uploadPercent.value = 0; const tempPath = selectedFile.value ? await uploadModelToTemp(selectedFile.value) : null; if (selectedFile.value) uploadPercent.value = 100; await createModelArtifact({ ...formState.value, teamUid, deptUid, tenantUid, userId, teamName: teamUid, artifactPath: tempPath }); message.success('模型制品登记成功'); await router.replace('/MTP/modeloutput/index'); }
  catch (error) { message.error(error instanceof Error ? error.message : '模型制品登记失败'); }
  finally { submitting.value = false; }
}
/** 返回模型输出列表。 / Return to the model output list. */
function handleCancel() { void router.go(-1); }
</script>
<template>
  <BusinessPage domain="模型研发" description="登记训练产物，保留模型文件、版本和组织归属，供后续证据与部署流程引用。" existing-title>
    <Page title="新增模型制品" />
    <Card><Alert class="mb-4" type="info" show-icon message="提交后会创建租户范围内的模型制品记录，模型文件将转存到 HDFS。" />
      <Form ref="formRef" :model="formState" layout="vertical" class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Form.Item label="输出名称" name="outputName" :rules="[{ required: true, message: '请输入输出名称' }]"><Input v-model:value="formState.outputName" placeholder="例如 dcn-recommendation-v1" /></Form.Item>
        <Form.Item label="训练框架" name="framework" :rules="[{ required: true, message: '请选择训练框架' }]"><Select v-model:value="formState.framework" :options="[{ label: 'PyTorch', value: 'pytorch' }, { label: 'TensorFlow', value: 'tensorflow' }, { label: 'ONNX', value: 'onnx' }, { label: '其他', value: 'other' }]" placeholder="请选择" /></Form.Item>
        <Form.Item label="技术领域" name="domain" :rules="[{ required: true, message: '请选择技术领域' }]"><Select v-model:value="formState.domain" :options="[{ label: '推荐', value: 'recommendation' }, { label: '分类', value: 'classification' }, { label: '检测', value: 'detection' }, { label: 'NLP', value: 'nlp' }]" placeholder="请选择" /></Form.Item>
        <Form.Item class="md:col-span-2" label="模型文件"><Upload :before-upload="beforeUpload" :show-upload-list="true" :max-count="1" accept=".pt,.pth,.onnx,.safetensors,.zip,.tar.gz" @change="onFileChange"><Button>选择模型文件</Button></Upload><div v-if="selectedFile" class="mt-2 text-xs text-gray-500">{{ selectedFile.name }} <span v-if="uploadPercent">{{ uploadPercent }}%</span></div></Form.Item>
        <Form.Item class="md:col-span-2" label="描述"><Input.TextArea v-model:value="formState.description" :maxlength="500" show-count placeholder="说明模型用途和来源" /></Form.Item>
      </Form>
      <div class="mt-4 flex justify-end gap-2"><Button @click="handleCancel">取消</Button><Button type="primary" :loading="submitting" @click="handleSubmit">登记模型制品</Button></div>
    </Card>
  </BusinessPage>
</template>
