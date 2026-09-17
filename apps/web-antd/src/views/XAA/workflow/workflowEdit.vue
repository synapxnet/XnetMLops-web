<script lang="ts" setup>
import BusinessPage from '#/components/workspace/BusinessPage.vue';
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  Alert,
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
const loadError = ref('');
const workflowLoaded = ref(false);
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

// 读取失败时显示重试并阻止保存空工作流。Show retry and prevent saving an empty workflow after read failure.
const loadWorkflow = async () => {
  const id = route.query.id;
  if (!id) {
    message.error('缺少工作流ID');
    router.push({ path: '/XAA/workflow/index' });
    return;
  }

  workflowId.value = Number(id);
  loading.value = true;
  loadError.value = '';
  workflowLoaded.value = false;

  try {
    const workflow = await fetchWorkflowById(workflowId.value);
    formState.name = workflow.name;
    formState.description = workflow.description || '';
    formState.type = workflow.type || 'workflow';
    workflowLoaded.value = true;
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '工作流暂不可用';
    console.error('加载工作流失败:', error);
    message.error('加载工作流失败');
  } finally {
    loading.value = false;
  }
};

// 提交表单
const handleSubmit = async () => {
  if (!workflowLoaded.value || loading.value || submitting.value) return;
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
  if (!workflowLoaded.value) return;
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
  <BusinessPage domain="智能协作" description="用助手、技能与工作流串联日常任务，查看每一步执行记录。">
  <Alert v-if="loadError" type="error" show-icon message="工作流未加载" :description="loadError"><template #action><Button @click="loadWorkflow">重试</Button></template></Alert>
  <Card v-if="!loadError" title="编辑工作流" class="p-4 shadow">
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

  </BusinessPage>
</template>
