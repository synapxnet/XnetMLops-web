<script lang="ts" setup>
import { reactive, ref, onMounted } from 'vue';
import { Page } from '@vben/common-ui';
import {  Card, Form, Select, message } from 'ant-design-vue';

const formRef = ref();
const formState = reactive({
  tenantEnName: '',
  creatorId: '',
  phone: '',
  authCode: '',
});

// 新增数据湖选项和加载状态
const dataLakeOptions = ref<{ value: string; label: string }[]>([]);
const loading = ref(false);

const rules = {
  tenantEnName: [{ required: true, message: '请选择需要删除的数据湖', trigger: 'change' }], // 修改触发方式为change
  // 其他规则保持不变...
};

// 获取数据湖列表
const fetchDataLakes = async () => {
  try {
    loading.value = true;
    const res = await fetch('/api/data-lakes');
    if (res.ok) {
      const data = await res.json();
      dataLakeOptions.value = data.map(item => ({
        value: item.enName,  // 根据实际返回字段调整
        label: item.name    // 显示名称
      }));
    }
  } catch (error) {
    message.error('获取数据湖列表失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchDataLakes();
});

// 保持原有的提交逻辑...
</script>

<template>
  <Page
    description="数据湖删除与管理"
    title="数据湖配置中心"
  >
    <Card title="删除数据湖">
      <Form 
        ref="formRef"
        :model="formState" 
        :rules="rules"
        layout="vertical"
      >
        <Form.Item label="选择数据湖" name="tenantEnName">
          <Select
            v-model:value="formState.tenantEnName"
            placeholder="请选择数据湖"
            :loading="loading"
            :options="dataLakeOptions"
          />
        </Form.Item>

        <!-- 其他表单项保持不变 -->
      </Form>
    </Card>
  </Page>
</template>