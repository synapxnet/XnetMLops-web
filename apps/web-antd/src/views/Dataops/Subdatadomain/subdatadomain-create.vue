<script lang="ts" setup>
import { reactive, ref, onMounted, watch } from 'vue';
import { Page } from '@vben/common-ui';
import { Button, Card, Form, Input, Select, message } from 'ant-design-vue';
import type { Rule } from 'ant-design-vue/es/form';

interface FormState {
  selectedLake: string;
  selectedParentDomain: string;
  newSubDomain: string;
  phone: string;
  authCode: string;
}

const formRef = ref();
const formState = reactive<FormState>({
  selectedLake: '',
  selectedParentDomain: '',
  newSubDomain: '',
  phone: '',
  authCode: '',
});

// 数据列表相关
const dataLakeOptions = ref<{ value: string; label: string }[]>([]);
const parentDomainOptions = ref<{ value: string; label: string }[]>([]);
const loading = ref({
  lakes: false,
  parentDomains: false,
  checking: false,
  submitting: false
});

// 子数据域校验
const checkSubDomainExists = async (_rule: Rule, value: string) => {
  if (!value || !formState.selectedParentDomain) return Promise.resolve();
  try {
    loading.value.checking = true;
    const res = await fetch(
      `/api/check-subdomain?parentId=${formState.selectedParentDomain}&name=${value}`
    );
    const data = await res.json();
    return data.exists ? Promise.reject('该子数据域已存在') : Promise.resolve();
  } catch {
    return Promise.reject('校验服务不可用');
  } finally {
    loading.value.checking = false;
  }
};

const rules = {
  selectedLake: [{ required: true, message: '请选择数据湖', trigger: 'change' }],
  selectedParentDomain: [{ required: true, message: '请选择父数据域', trigger: 'change' }],
  newSubDomain: [
    { required: true, message: '请输入子数据域名称', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_-]{4,20}$/, message: '4-20位英文、数字及下划线', trigger: 'blur' },
    { validator: checkSubDomainExists, trigger: 'blur' }
  ],
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

// 监听数据湖选择变化
watch(() => formState.selectedLake, (newVal) => {
  formState.selectedParentDomain = '';
  formState.newSubDomain = '';
  if (newVal) fetchParentDomains(newVal);
});

const handleSubmit = async () => {
  try {
    await formRef.value.validate();
    
    loading.value.submitting = true;
    const payload = {
      parentDomainId: formState.selectedParentDomain,
      subDomain: formState.newSubDomain,
      operator: {
        phone: formState.phone,
        authCode: formState.authCode
      }
    };

    const res = await fetch('/api/create-subdomain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (res.ok) {
      message.success(`子数据域 ${formState.newSubDomain} 创建成功`);
      formRef.value.resetFields(['newSubDomain']);
      fetchParentDomains(formState.selectedLake); // 刷新父域列表
    } else {
      message.error(result.message || '创建失败');
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
    description="子数据域创建与管理"
    title="数据域配置中心"
  >
    <Card title="新建子数据域">
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

        <Form.Item label="选择数据域" name="selectedParentDomain">
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

        <Form.Item label="子数据域名称" name="newSubDomain">
          <Input 
            v-model:value="formState.newSubDomain"
            placeholder="输入4-20位英文、数字或下划线"
            :suffix="loading.checking ? '校验中...' : ''"
            :disabled="!formState.selectedParentDomain"
          />
        </Form.Item>

        <Form.Item label="负责人手机号" name="phone">
          <Input 
            v-model:value="formState.phone" 
            placeholder="用于接收通知短信"
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
            type="primary" 
            @click="handleSubmit"
            :loading="loading.submitting"
          >立即创建</Button>
        </Form.Item>
      </Form>
    </Card>
  </Page>
</template>