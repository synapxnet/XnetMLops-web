<script lang="ts" setup>
import { reactive, ref, onMounted, watch } from 'vue';
import { Page } from '@vben/common-ui';
import { Button, Card, Form, Input, Select, Modal, message } from 'ant-design-vue';
import type { Rule } from 'ant-design-vue/es/form';

interface FormState {
  selectedLake: string;
  selectedParentDomain: string;
  selectedSubDomain: string;
  newSubDomainName: string;
  phone: string;
  authCode: string;
}

const formRef = ref();
const formState = reactive<FormState>({
  selectedLake: '',
  selectedParentDomain: '',
  selectedSubDomain: '',
  newSubDomainName: '',
  phone: '',
  authCode: '',
});

// 数据列表相关
const dataLakeOptions = ref<{ value: string; label: string }[]>([]);
const parentDomainOptions = ref<{ value: string; label: string }[]>([]);
const subDomainOptions = ref<{ value: string; label: string; enName: string }[]>([]);
const loading = ref({
  lakes: false,
  parentDomains: false,
  subDomains: false,
  checking: false,
  submitting: false
});

// 校验规则
const checkNewName = async (_rule: Rule, value: string) => {
  if (!value || !formState.selectedSubDomain) return Promise.resolve();
  
  // 检查是否与原名称相同
  const originalName = subDomainOptions.value.find(d => d.value === formState.selectedSubDomain)?.enName;
  if (value === originalName) {
    return Promise.reject('新名称不能与原名称相同');
  }

  try {
    loading.value.checking = true;
    const res = await fetch(
      `/api/check-subdomain?parentId=${formState.selectedParentDomain}&name=${value}`
    );
    const data = await res.json();
    return data.exists ? Promise.reject('该名称已存在') : Promise.resolve();
  } catch {
    return Promise.reject('校验服务不可用');
  } finally {
    loading.value.checking = false;
  }
};

const rules = {
  selectedLake: [{ required: true, message: '请选择数据湖', trigger: 'change' }],
  selectedParentDomain: [{ required: true, message: '请选择父数据域', trigger: 'change' }],
  selectedSubDomain: [{ required: true, message: '请选择子数据域', trigger: 'change' }],
  newSubDomainName: [
    { required: true, message: '请输入新名称', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_-]{4,20}$/, message: '4-20位英文、数字及下划线' },
    { validator: checkNewName, trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' }
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
        label: item.name,
        enName: item.enName
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
  formState.newSubDomainName = '';
  if (newVal) fetchParentDomains(newVal);
});

watch(() => formState.selectedParentDomain, (newVal) => {
  formState.selectedSubDomain = '';
  formState.newSubDomainName = '';
  if (newVal) fetchSubDomains(newVal);
});

watch(() => formState.selectedSubDomain, (newVal) => {
  if (newVal) {
    const selected = subDomainOptions.value.find(d => d.value === newVal);
    formState.newSubDomainName = selected?.enName || '';
  }
});

const showRenameConfirm = () => {
  Modal.confirm({
    title: '确认重命名子数据域？',
    content: `确定要将名称从 ${subDomainOptions.value.find(d => d.value === formState.selectedSubDomain)?.enName} 修改为 ${formState.newSubDomainName} 吗？`,
    okText: '确认修改',
    okType: 'primary',
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
      newName: formState.newSubDomainName,
      operator: {
        phone: formState.phone,
        authCode: formState.authCode
      }
    };

    const res = await fetch('/api/rename-subdomain', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (res.ok) {
      message.success('重命名成功');
      // 刷新数据
      if (formState.selectedParentDomain) {
        fetchSubDomains(formState.selectedParentDomain);
      }
      formRef.value.resetFields(['selectedSubDomain', 'newSubDomainName']);
    } else {
      message.error(result.message || '修改失败');
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
    description="子数据域重命名与管理"
    title="数据域配置中心"
  >
    <Card title="重命名子数据域">
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
            placeholder="请先选择数据域"
            :options="subDomainOptions"
            :loading="loading.subDomains"
            :disabled="!formState.selectedParentDomain"
            show-search
            option-filter-prop="label"
          />
        </Form.Item>

        <Form.Item label="新数据域名称" name="newSubDomainName">
          <Input 
            v-model:value="formState.newSubDomainName"
            placeholder="输入4-20位英文、数字或下划线"
            :suffix="loading.checking ? '校验中...' : ''"
            :disabled="!formState.selectedSubDomain"
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
            type="primary"
            @click="showRenameConfirm"
            :loading="loading.submitting"
          >提交修改</Button>
        </Form.Item>
      </Form>
    </Card>
  </Page>
</template>