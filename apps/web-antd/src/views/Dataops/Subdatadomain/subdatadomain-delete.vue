<script lang="ts" setup>
import { reactive, ref, onMounted, watch } from 'vue';
import { Page } from '@vben/common-ui';
import { Button, Card, Form, Input, Select, Modal, message } from 'ant-design-vue';
import type { Rule } from 'ant-design-vue/es/form';

interface FormState {
  selectedLake: string;
  selectedParentDomain: string;
  selectedSubDomain: string;
  phone: string;
  authCode: string;
}

const formRef = ref();
const formState = reactive<FormState>({
  selectedLake: '',
  selectedParentDomain: '',
  selectedSubDomain: '',
  phone: '',
  authCode: '',
});

// 数据列表相关
const dataLakeOptions = ref<{ value: string; label: string }[]>([]);
const parentDomainOptions = ref<{ value: string; label: string }[]>([]);
const subDomainOptions = ref<{ value: string; label: string }[]>([]);
const loading = ref({
  lakes: false,
  parentDomains: false,
  subDomains: false,
  submitting: false
});

const rules = {
  selectedLake: [{ required: true, message: '请选择数据湖', trigger: 'change' }],
  selectedParentDomain: [{ required: true, message: '请选择父数据域', trigger: 'change' }],
  selectedSubDomain: [{ required: true, message: '请选择子数据域', trigger: 'change' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
  authCode: [{ required: true, message: '请输入权限码', trigger: 'blur' }],
};

// 获取数据湖列表
const fetchDataLakes = async () => {
  try {
    loading.value.lakes = true;
    const res = await fetch('/api/data-lakes');
    if (res.ok) {
      dataLakeOptions.value = (await res.json()).map((item: any) => ({
        value: item.id,
        label: `${item.name} (${item.enName})`
      }));
    }
  } finally {
    loading.value.lakes = false;
  }
};

// 获取父数据域列表
const fetchParentDomains = async (lakeId: string) => {
  try {
    loading.value.parentDomains = true;
    const res = await fetch(`/api/domains?lakeId=${lakeId}`);
    if (res.ok) {
      parentDomainOptions.value = (await res.json()).map((item: any) => ({
        value: item.id,
        label: `${item.name} (${item.enName})`
      }));
    }
  } finally {
    loading.value.parentDomains = false;
  }
};

// 获取子数据域列表
const fetchSubDomains = async (parentId: string) => {
  try {
    loading.value.subDomains = true;
    const res = await fetch(`/api/subdomains?parentId=${parentId}`);
    if (res.ok) {
      subDomainOptions.value = (await res.json()).map((item: any) => ({
        value: item.id,
        label: `${item.name} (${item.enName})`
      }));
    }
  } finally {
    loading.value.subDomains = false;
  }
};

// 级联选择监听
watch(() => formState.selectedLake, (newVal) => {
  formState.selectedParentDomain = '';
  formState.selectedSubDomain = '';
  if (newVal) fetchParentDomains(newVal);
});

watch(() => formState.selectedParentDomain, (newVal) => {
  formState.selectedSubDomain = '';
  if (newVal) fetchSubDomains(newVal);
});

const showDeleteConfirm = () => {
  Modal.confirm({
    title: '确认删除子数据域？',
    content: '该操作将永久删除该子数据域及其所有关联数据，请谨慎操作！',
    okText: '确认删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: handleSubmit
  });
};

const handleSubmit = async () => {
  try {
    await formRef.value.validate();
    
    loading.value.submitting = true;
    const payload = {
      subDomainId: formState.selectedSubDomain,
      operator: {
        phone: formState.phone,
        authCode: formState.authCode
      }
    };

    const res = await fetch('/api/delete-subdomain', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (res.ok) {
      message.success('子数据域删除成功');
      formRef.value.resetFields();
      // 刷新列表
      if (formState.selectedParentDomain) {
        fetchSubDomains(formState.selectedParentDomain);
      }
    } else {
      message.error(result.message || '删除失败');
    }
  } catch (error) {
    if (error.errorFields) {
      message.warning('请完善所有必填项');
    } else {
      message.error('网络错误，请稍后重试');
    }
  } finally {
    loading.value.submitting = false;
  }
};

onMounted(fetchDataLakes);
</script>

<template>
  <Page
    description="子数据域删除与管理"
    title="数据域配置中心"
  >
    <Card title="删除子数据域">
      <Form 
        ref="formRef"
        :model="formState" 
        :rules="rules"
        layout="vertical"
      >
        <Form.Item label="选择数据湖" name="selectedLake">
          <Select
            v-model:value="formState.selectedLake"
            placeholder="请选择数据湖"
            :options="dataLakeOptions"
            :loading="loading.lakes"
            show-search
            option-filter-prop="label"
          />
        </Form.Item>

        <Form.Item label="选择父数据域" name="selectedParentDomain">
          <Select
            v-model:value="formState.selectedParentDomain"
            placeholder="请先选择数据湖"
            :options="parentDomainOptions"
            :loading="loading.parentDomains"
            :disabled="!formState.selectedLake"
            show-search
            option-filter-prop="label"
          />
        </Form.Item>

        <Form.Item label="选择子数据域" name="selectedSubDomain">
          <Select
            v-model:value="formState.selectedSubDomain"
            placeholder="请先选择父数据域"
            :options="subDomainOptions"
            :loading="loading.subDomains"
            :disabled="!formState.selectedParentDomain"
            show-search
            option-filter-prop="label"
          />
        </Form.Item>

        <Form.Item label="操作人手机号" name="phone">
          <Input 
            v-model:value="formState.phone" 
            placeholder="用于身份验证"
            maxlength="11"
          />
        </Form.Item>

        <Form.Item label="安全权限码" name="authCode">
          <Input.Password 
            v-model:value="formState.authCode"
            placeholder="输入系统分配的权限码"
          />
        </Form.Item>

        <Form.Item>
          <Button 
            danger
            @click="showDeleteConfirm"
            :loading="loading.submitting"
          >删除子数据域</Button>
        </Form.Item>
      </Form>
    </Card>
  </Page>
</template>