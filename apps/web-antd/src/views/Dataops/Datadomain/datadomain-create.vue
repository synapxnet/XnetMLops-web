<script lang="ts" setup>
import { reactive, ref, onMounted } from 'vue';
import { Page } from '@vben/common-ui';
import { Button, Card, Form, Input, Select, message } from 'ant-design-vue';
import type { Rule } from 'ant-design-vue/es/form';

interface FormState {
  selectedLake: string;
  newDomain: string;
  phone: string;
  authCode: string;
}

const formRef = ref();
const formState = reactive<FormState>({
  selectedLake: '',
  newDomain: '',
  phone: '',
  authCode: '',
});

// 数据湖列表相关
const dataLakeOptions = ref<{ value: string; label: string }[]>([]);
const loading = ref(false);
const checking = ref(false);

const checkDomainExists = async (_rule: Rule, value: string) => {
  if (!value || !formState.selectedLake) return Promise.resolve();
  try {
    checking.value = true;
    const res = await fetch(`/api/check-domain?lakeId=${formState.selectedLake}&domain=${value}`);
    const data = await res.json();
    if (data.exists) {
      return Promise.reject('该数据域名称已存在');
    }
    return Promise.resolve();
  } catch {
    return Promise.reject('校验服务不可用');
  } finally {
    checking.value = false;
  }
};

const rules = {
  selectedLake: [{ required: true, message: '请选择数据湖', trigger: 'change' }],
  newDomain: [
    { required: true, message: '请输入数据域名称', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_-]{4,20}$/, message: '4-20位英文、数字及下划线', trigger: 'blur' },
    { validator: checkDomainExists, trigger: 'blur' }
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
    loading.value = true;
    const res = await fetch('/api/data-lakes');
    if (res.ok) {
      const data = await res.json();
      dataLakeOptions.value = data.map((item: any) => ({
        value: item.id,
        label: `${item.name} (${item.enName})`
      }));
    }
  } catch (error) {
    message.error('数据湖列表加载失败');
  } finally {
    loading.value = false;
  }
};

const handleSubmit = async () => {
  try {
    await formRef.value.validate();
    
    const payload = {
      lakeId: formState.selectedLake,
      domain: formState.newDomain,
      creator: {
        phone: formState.phone,
        authCode: formState.authCode
      }
    };

    const res = await fetch('/api/create-domain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (res.ok) {
      message.success(`数据域 ${formState.newDomain} 创建成功`);
      formRef.value.resetFields();
    } else {
      message.error(result.message || '创建失败');
    }
  } catch (error) {
    if (error.errorFields) {
      message.warning('请完善所有必填项');
    } else {
      message.error('网络错误，请稍后重试');
    }
  }
};

onMounted(fetchDataLakes);
</script>

<template>
  <Page
    description="数据域创建与管理"
    title="数据域配置中心"
  >
    <Card title="新建数据域">
      <Form 
        ref="formRef"
        :model="formState" 
        :rules="rules"
        layout="vertical"
      >
        <Form.Item label="选择数据湖" name="selectedLake">
          <Select
            v-model:value="formState.selectedLake"
            placeholder="请选择目标数据湖"
            :options="dataLakeOptions"
            :loading="loading"
            show-search
            option-filter-prop="label"
          />
        </Form.Item>

        <Form.Item label="数据域名称" name="newDomain">
          <Input 
            v-model:value="formState.newDomain"
            placeholder="输入4-20位英文、数字或下划线"
            :suffix="checking ? '校验中...' : ''"
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
            :loading="loading"
          >立即创建</Button>
        </Form.Item>
      </Form>
    </Card>
  </Page>
</template>