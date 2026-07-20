<script lang="ts" setup>
import { reactive, ref, onMounted } from 'vue';
import { Page } from '@vben/common-ui';
import { Button, Card, Form, Input, Select, message } from 'ant-design-vue';

const formRef = ref();
const formState = reactive({
  selectedLake: '',    // 已选择的数据湖
  newLakeName: '',     // 新数据湖名称
  creatorId: '',
  phone: '',
  authCode: '',
});

// 数据湖列表相关
const dataLakeOptions = ref<{ value: string; label: string }[]>([]);
const loading = ref(false);

const rules = {
  selectedLake: [{ required: true, message: '请选择要重新命名的数据湖', trigger: 'change' }],
  newLakeName: [
    { required: true, message: '请输入新数据湖名称', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_-]+$/, message: '只允许英文、数字及下划线', trigger: 'blur' }
  ],
  creatorId: [{ required: true, message: '请输入创建工号', trigger: 'blur' }],
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
      dataLakeOptions.value = data.map(item => ({
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

// 提交重命名
const handleSubmit = async () => {
  try {
    await formRef.value.validate();
    
    const payload = {
      originalId: formState.selectedLake,
      newName: formState.newLakeName,
      operatorInfo: {
        creatorId: formState.creatorId,
        phone: formState.phone,
        authCode: formState.authCode
      }
    };

    const res = await fetch('/api/rename-data-lake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      message.success('数据湖重命名成功');
      formRef.value.resetFields();
      fetchDataLakes(); // 刷新列表
    }
  } catch (error) {
    if (error.errorFields) {
      message.warning('请填写所有必填项');
    } else {
      message.error('操作失败，请检查权限码或网络连接');
    }
  }
};

onMounted(() => {
  fetchDataLakes();
});
</script>

<template>
  <Page
    description="数据湖重命名与管理"
    title="数据湖配置中心"
  >
    <Card title="数据湖重命名">
      <Form 
        ref="formRef"
        :model="formState" 
        :rules="rules"
        layout="vertical"
      >
        <Form.Item label="选择数据湖" name="selectedLake">
          <Select
            v-model:value="formState.selectedLake"
            placeholder="请选择要修改的数据湖"
            :options="dataLakeOptions"
            :loading="loading"
            show-search
            option-filter-prop="label"
          />
        </Form.Item>

        <Form.Item label="新数据湖名称" name="newLakeName">
          <Input 
            v-model:value="formState.newLakeName" 
            placeholder="请输入新的英文名称"
            allow-clear
          />
        </Form.Item>

        <Form.Item label="操作人工号" name="creatorId">
          <Input v-model:value="formState.creatorId" placeholder="请输入您的工号" />
        </Form.Item>

        <Form.Item label="手机号" name="phone">
          <Input v-model:value="formState.phone" placeholder="请输入验证手机号" />
        </Form.Item>

        <Form.Item label="权限码" name="authCode">
          <Input.Password 
            v-model:value="formState.authCode" 
            placeholder="请输入安全权限码"
          />
        </Form.Item>

        <Form.Item>
          <Button 
            type="primary" 
            @click="handleSubmit"
            :loading="loading"
          >确认修改</Button>
        </Form.Item>
      </Form>
    </Card>
  </Page>
</template>