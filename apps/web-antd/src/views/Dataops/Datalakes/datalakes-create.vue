<script lang="ts" setup>
import { reactive, ref } from 'vue';
import { Page } from '@vben/common-ui';
import { Button, Card, Form, Input, message } from 'ant-design-vue';

const formRef = ref();
const formState = reactive({
  tenantEnName: '',
  creatorId: '',
  phone: '',
  authCode: '',
});

const rules = {
  tenantEnName: [{ required: true, message: '请输入数据湖名称', trigger: 'blur' }],
  creatorId: [{ required: true, message: '请输入创建工号', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
  authCode: [{ required: true, message: '请输入权限码', trigger: 'blur' }],
};

const handleSubmit = async () => {
  try {
    await formRef.value.validate();
    
    // 模拟API调用
    const res = await fetch('/api/create-data-lake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: formState })
    });

    if (res.ok) {
      message.success('数据湖创建成功');
      formRef.value.resetFields();
    }
  } catch (error) {
    if (error.errorFields) {
      message.warning('请填写所有必填项');
    } else {
      message.error('创建失败，请稍后重试');
    }
  }
};
</script>

<template>
  <Page
    description="数据湖创建与管理"
    title="数据湖配置中心"
  >
    <Card title="新建数据湖">
      <Form 
        ref="formRef"
        :model="formState" 
        :rules="rules"
        layout="vertical"
      >
        <Form.Item label="数据湖名称" name="tenantEnName">
          <Input v-model:value="formState.tenantEnName" placeholder="请输入英文名称" />
        </Form.Item>

        <Form.Item label="创建工号" name="creatorId">
          <Input v-model:value="formState.creatorId" placeholder="请输入工号" />
        </Form.Item>

        <Form.Item label="手机号" name="phone">
          <Input v-model:value="formState.phone" placeholder="请输入手机号" />
        </Form.Item>

        <Form.Item label="权限码" name="authCode">
          <Input v-model:value="formState.authCode" placeholder="请输入权限码" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" @click="handleSubmit">确认创建</Button>
        </Form.Item>
      </Form>
    </Card>
  </Page>
</template>