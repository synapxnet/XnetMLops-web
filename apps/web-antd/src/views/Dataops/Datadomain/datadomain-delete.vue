<script lang="ts" setup>
import { reactive, ref, onMounted, watch } from 'vue';
import { Page } from '@vben/common-ui';
import { Button, Card, Form, Input, Select, Modal, message } from 'ant-design-vue';
import type { Rule } from 'ant-design-vue/es/form';

interface FormState {
  selectedLake: string;
  selectedDomain: string;
  phone: string;
  authCode: string;
}

const formRef = ref();
const formState = reactive<FormState>({
  selectedLake: '',
  selectedDomain: '',
  phone: '',
  authCode: '',
});

// 数据列表相关
const dataLakeOptions = ref<{ value: string; label: string }[]>([]);
const domainOptions = ref<{ value: string; label: string }[]>([]);
const loading = ref({
  lakes: false,
  domains: false,
  submit: false
});

const rules = {
  selectedLake: [{ required: true, message: '请选择数据湖', trigger: 'change' }],
  selectedDomain: [{ required: true, message: '请选择数据域', trigger: 'change' }],
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
      const data = await res.json();
      dataLakeOptions.value = data.map((item: any) => ({
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
      const data = await res.json();
      domainOptions.value = data.map((item: any) => ({
        value: item.id,
        label: `${item.name} (${item.enName})`
      }));
    }
  } finally {
    loading.value.domains = false;
  }
};

// 监听数据湖选择变化
watch(() => formState.selectedLake, (newVal) => {
  formState.selectedDomain = ''; // 清空已选数据域
  if (newVal) fetchDomains(newVal);
});

const showDeleteConfirm = () => {
  Modal.confirm({
    title: '确认删除数据域？',
    content: '该操作将永久删除数据域及其所有关联数据，请谨慎操作！',
    okText: '确认删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: handleSubmit
  });
};

const handleSubmit = async () => {
  try {
    await formRef.value.validate();
    
    loading.value.submit = true;
    const payload = {
      lakeId: formState.selectedLake,
      domainId: formState.selectedDomain,
      operator: {
        phone: formState.phone,
        authCode: formState.authCode
      }
    };

    const res = await fetch('/api/delete-domain', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (res.ok) {
      message.success('数据域删除成功');
      formRef.value.resetFields();
      fetchDomains(formState.selectedLake); // 刷新数据域列表
    } else {
      message.error(result.message || '删除失败');
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
    description="数据域删除与管理"
    title="数据域配置中心"
  >
    <Card title="删除数据域">
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
            danger
            @click="showDeleteConfirm"
            :loading="loading.submit"
          >删除数据域</Button>
        </Form.Item>
      </Form>
    </Card>
  </Page>
</template>