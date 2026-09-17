<script lang="ts" setup>
import BusinessPage from '#/components/workspace/BusinessPage.vue';
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  Button,
  Card,
  Form,
  FormItem,
  Input,
  message,
  Select,
  SelectOption,
  Textarea,
} from 'ant-design-vue';

import { createWorkflow } from '../api/workflow';

const router = useRouter();

// 表单数据
const formState = reactive({
  name: '',
  description: '',
  type: 'workflow',
});

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入工作流名称', trigger: 'blur' },
    { min: 2, max: 100, message: '名称长度应为2-100个字符', trigger: 'blur' },
  ],
};

// 工作流类型选项
const typeOptions = [
  { value: 'workflow', label: '标准工作流' },
  { value: 'pipeline', label: 'Pipeline流水线' },
];

const submitting = ref(false);
const formRef = ref();

// 提交表单
const handleSubmit = async () => {
  try {
    await formRef.value.validate();

    submitting.value = true;
    const workflow = await createWorkflow({
      name: formState.name,
      description: formState.description,
      type: formState.type,
    });

    message.success('工作流创建成功');

    // 跳转到设计器页面
    router.push({
      path: '/XAA/workflow/designer',
      query: { id: workflow.id },
    });
  } catch (error) {
    console.error('创建工作流失败:', error);
    message.error('创建工作流失败');
  } finally {
    submitting.value = false;
  }
};

// 返回列表
const handleCancel = () => {
  router.push({ path: '/XAA/workflow/index' });
};
</script>

<template>
  <BusinessPage domain="智能协作" description="用助手、技能与工作流串联日常任务，查看每一步执行记录。">
  <Card title="创建工作流" class="p-4 shadow">
    <Form
      ref="formRef"
      :model="formState"
      :rules="rules"
      :label-col="{ span: 4 }"
      :wrapper-col="{ span: 16 }"
      class="max-w-2xl"
    >
      <FormItem label="工作流名称" name="name">
        <Input
          v-model:value="formState.name"
          placeholder="请输入工作流名称"
          :maxlength="100"
        />
      </FormItem>

      <FormItem label="工作流类型" name="type">
        <Select v-model:value="formState.type" placeholder="请选择工作流类型">
          <SelectOption
            v-for="option in typeOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </SelectOption>
        </Select>
      </FormItem>

      <FormItem label="描述" name="description">
        <Textarea
          v-model:value="formState.description"
          placeholder="请输入工作流描述（可选）"
          :rows="4"
          :maxlength="500"
          show-count
        />
      </FormItem>

      <FormItem :wrapper-col="{ offset: 4, span: 16 }">
        <Button type="primary" :loading="submitting" @click="handleSubmit">
          创建并设计
        </Button>
        <Button style="margin-left: 10px" @click="handleCancel">
          取消
        </Button>
      </FormItem>
    </Form>
  </Card>

  </BusinessPage>
</template>
