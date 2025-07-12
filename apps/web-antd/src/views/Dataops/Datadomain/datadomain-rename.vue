<script lang="ts" setup>
import { reactive, ref, onMounted, watch } from 'vue';
import { Page } from '@vben/common-ui';
import { Button, Card, Form, Input, Select, Modal, message } from 'ant-design-vue';
import type { Rule } from 'ant-design-vue/es/form';

interface FormState {
  selectedLake: string;
  selectedDomain: string;
  newDomainName: string;
  phone: string;
  authCode: string;
}

const formRef = ref();
const formState = reactive<FormState>({
  selectedLake: '',
  selectedDomain: '',
  newDomainName: '',
  phone: '',
  authCode: '',
});

// 数据列表相关
const dataLakeOptions = ref<{ value: string; label: string }[]>([]);
const domainOptions = ref<{ value: string; label: string; enName: string }[]>([]);
const loading = ref({
  lakes: false,
  domains: false,
  submit: false,
  checking: false
});

// 名称校验规则
const checkNewName = async (_rule: Rule, value: string) => {
  if (!value || !formState.selectedDomain) return Promise.resolve();
  
  // 如果名称未修改
  if (value === domainOptions.value.find(d => d.value === formState.selectedDomain)?.enName) {
    return Promise.reject('新名称不能与原名称相同');
  }

  try {
    loading.value.checking = true;
    const res = await fetch(
      `/api/check-domain?lakeId=${formState.selectedLake}&domain=${value}`
    );
    const data = await res.json();
    return data.exists ? Promise.reject('名称已存在') : Promise.resolve();
  } catch {
    return Promise.reject('校验服务不可用');
  } finally {
    loading.value.checking = false;
  }
};

const rules = {
  selectedLake: [{ required: true, message: '请选择数据湖', trigger: 'change' }],
  selectedDomain: [{ required: true, message: '请选择数据域', trigger: 'change' }],
  newDomainName: [
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

// 获取数据域列表
const fetchDomains = async (lakeId: string) => {
  try {
    loading.value.domains = true;
    const res = await fetch(`/api/domains?lakeId=${lakeId}`);
    if (res.ok) {
      domainOptions.value = (await res.json()).map((item: any) => ({
        value: item.id,
        label: item.name,
        enName: item.enName
      }));
    }
  } finally {
    loading.value.domains = false;
  }
};

// 监听数据域选择
watch(() => formState.selectedDomain, (newVal) => {
  if (newVal) {
    const selected = domainOptions.value.find(d => d.value === newVal);
    formState.newDomainName = selected?.enName || '';
  }
});

// 显示确认对话框
const showRenameConfirm = () => {
  Modal.confirm({
    title: '确认重命名数据域？',
    content: `即将修改数据域标识，可能会影响关联系统。确认将名称修改为 ${formState.newDomainName} 吗？`,
    okText: '确认修改',
    okType: 'primary',
    cancelText: '取消',
    onOk: handleSubmit
  });
};

// 提交重命名
const handleSubmit = async () => {
  try {
    await formRef.value.validate();
    
    loading.value.submit = true;
    const payload = {
      lakeId: formState.selectedLake,
      domainId: formState.selectedDomain,
      newName: formState.newDomainName,
      operator: {
        phone: formState.phone,
        authCode: formState.authCode
      }
    };

    const res = await fetch('/api/rename-domain', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (res.ok) {
      message.success('重命名成功');
      fetchDomains(formState.selectedLake); // 刷新列表
      formRef.value.resetFields(['selectedDomain', 'newDomainName']);
    } else {
      message.error(result.message || '操作失败');
    }
  } catch (error) {
    if (error.errorFields) {
      message.warning('请完善所有必填项');
    }
  } finally {
    loading.value.submit = false;
  }
};

onMounted(fetchDataLakes);
</script>

<template>
  <Page
    description="数据域重命名与管理"
    title="数据域配置中心"
  >
    <Card title="数据域重命名">
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

        <Form.Item label="选择数据域" name="selectedDomain">
          <Select
            v-model:value="formState.selectedDomain"
            placeholder="请先选择数据湖"
            :options="domainOptions"
            :loading="loading.domains"
            :disabled="!formState.selectedLake"
            show-search
            option-filter-prop="label"
          />
        </Form.Item>

        <Form.Item label="新数据域名称" name="newDomainName">
          <Input 
            v-model:value="formState.newDomainName"
            placeholder="输入4-20位英文、数字或下划线"
            :suffix="loading.checking ? '校验中...' : ''"
          />
        </Form.Item>

        <Form.Item label="操作人手机号" name="phone">
          <Input 
            v-model:value="formState.phone"
            placeholder="请输入绑定手机号"
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
            :loading="loading.submit"
          >提交修改</Button>
        </Form.Item>
      </Form>
    </Card>
  </Page>
</template>