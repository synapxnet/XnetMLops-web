<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  Button,
  Card,
  Form,
  FormItem,
  Input,
  message,
  Select,
  SelectOption,
  Spin,
  Textarea,
} from 'ant-design-vue';

import { fetchWorkflowById, updateWorkflow } from '../api/workflow';

const router = useRouter();
const route = useRoute();

// 表单数据
const formState = reactive({
  name: '',
  description: '',
  type: 'workflow',
});

// 加载状态
const loading = ref(false);
const submitting = ref(false);
const formRef = ref();
const workflowId = ref<number>(0);

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

// 加载工作流数据
const loadWorkflow = async () => {
  const id = route.query.id;
  if (!id) {
    message.error('缺少工作流ID');
    router.push({ path: '/XAA/workflow/index' });
    return;
  }

  workflowId.value = Number(id);
  loading.value = true;

  try {
    const workflow = await fetchWorkflowById(workflowId.value);
    formState.name = workflow.name;
    formState.description = workflow.description || '';
    formState.type = workflow.type || 'workflow';
  } catch (error) {
    console.error('加载工作流失败:', error);
    message.error('加载工作流失败');
  } finally {
    loading.value = false;
  }
};

// 提交表单
const handleSubmit = async () => {
  try {
    await formRef.value.validate();

    submitting.value = true;
    await updateWorkflow(workflowId.value, {
      name: formState.name,
      description: formState.description,
      type: formState.type,
    });

    message.success('工作流更新成功');
    router.push({ path: '/XAA/workflow/index' });
  } catch (error) {
    console.error('更新工作流失败:', error);
    message.error('更新工作流失败');
  } finally {
    submitting.value = false;
  }
};

// 返回列表
const handleCancel = () => {
  router.push({ path: '/XAA/workflow/index' });
};

// 跳转到设计器
const handleDesign = () => {
  router.push({
    path: '/XAA/workflow/designer',
    query: { id: workflowId.value },
  });
};

onMounted(() => {
  loadWorkflow();
});
</script>

<template>
  <Card title="编辑工作流" class="p-4 shadow">
    <Spin :spinning="loading">
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
            保存
          </Button>
          <Button style="margin-left: 10px" @click="handleDesign">
            设计工作流
          </Button>
          <Button style="margin-left: 10px" @click="handleCancel">
            取消
          </Button>
        </FormItem>
      </Form>
    </Spin>
  </Card>
</template>
