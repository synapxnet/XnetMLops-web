<template>
  <BusinessPage domain="智能协作" description="用助手、技能与工作流串联日常任务，查看每一步执行记录。">
  <div class="create-skill">
    <Card class="create-skill__card">
      <template #title>
        <div class="create-skill__header">
          <Button type="text" @click="goBack">
            <template #icon><ArrowLeftOutlined /></template>
          </Button>
          <span>创建技能</span>
        </div>
      </template>

      <Form
        ref="formRef"
        :model="formState"
        :rules="rules"
        layout="vertical"
        class="create-skill__form"
      >
        <Row :gutter="24">
          <Col :span="12">
            <FormItem label="技能名称" name="name">
              <Input
                v-model:value="formState.name"
                placeholder="输入技能名称"
                :maxlength="100"
              />
            </FormItem>
          </Col>
          <Col :span="12">
            <FormItem label="技能类型" name="type">
              <Select v-model:value="formState.type" placeholder="选择技能类型">
                <SelectOption
                  v-for="opt in SKILL_TYPE_OPTIONS"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </SelectOption>
              </Select>
            </FormItem>
          </Col>
        </Row>

        <Row :gutter="24">
          <Col :span="12">
            <FormItem label="技能分类" name="category">
              <Select v-model:value="formState.category" placeholder="选择分类">
                <SelectOption
                  v-for="cat in categories"
                  :key="cat.key"
                  :value="cat.key"
                >
                  <span :style="{ color: cat.color }">{{ cat.name }}</span>
                </SelectOption>
              </Select>
            </FormItem>
          </Col>
          <Col :span="12">
            <FormItem label="图标" name="icon">
              <Select v-model:value="formState.icon" placeholder="选择图标" allow-clear>
                <SelectOption v-for="(_, key) in iconOptions" :key="key" :value="key">
                  <component :is="iconOptions[key]" />
                  <span style="margin-left: 8px">{{ key }}</span>
                </SelectOption>
              </Select>
            </FormItem>
          </Col>
        </Row>

        <FormItem label="描述" name="description">
          <Textarea
            v-model:value="formState.description"
            placeholder="输入技能描述，这将在技能仓库中显示"
            :rows="3"
            :maxlength="500"
            show-count
          />
        </FormItem>

        <FormItem label="标签" name="tags">
          <Input
            v-model:value="formState.tags"
            placeholder="输入标签，多个标签用逗号分隔"
          />
        </FormItem>

        <Divider orientation="left">技能内容 (SKILL.md)</Divider>

        <FormItem label="技能说明文档" name="contentMd">
          <Textarea
            v-model:value="formState.contentMd"
            placeholder="使用 Markdown 格式编写技能说明，包括用途、使用方法、示例等"
            :rows="12"
            style="font-family: monospace"
          />
        </FormItem>

        <Divider orientation="left">资源配置</Divider>

        <Row :gutter="24">
          <Col :span="8">
            <FormItem name="hasScripts">
              <Checkbox v-model:checked="formState.hasScripts">
                包含脚本
              </Checkbox>
            </FormItem>
          </Col>
          <Col :span="8">
            <FormItem name="hasReferences">
              <Checkbox v-model:checked="formState.hasReferences">
                包含参考文档
              </Checkbox>
            </FormItem>
          </Col>
          <Col :span="8">
            <FormItem name="hasAssets">
              <Checkbox v-model:checked="formState.hasAssets">
                包含资源文件
              </Checkbox>
            </FormItem>
          </Col>
        </Row>

        <FormItem label="来源URL" name="sourceUrl">
          <Input
            v-model:value="formState.sourceUrl"
            placeholder="可选，填写技能来源URL"
          />
        </FormItem>

        <Divider />

        <FormItem>
          <Space>
            <Button type="primary" :loading="submitting" @click="handleSubmit">
              创建技能
            </Button>
            <Button @click="handleSaveAsDraft">
              保存为草稿
            </Button>
            <Button @click="goBack">
              取消
            </Button>
          </Space>
        </FormItem>
      </Form>
    </Card>
  </div>

  </BusinessPage>
</template>

<script setup lang="ts">
import BusinessPage from '#/components/workspace/BusinessPage.vue';
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  Card,
  Form,
  FormItem,
  Input,
  Textarea,
  Select,
  SelectOption,
  Button,
  Row,
  Col,
  Checkbox,
  Divider,
  Space,
  message,
} from 'ant-design-vue';
import {
  ArrowLeftOutlined,
  FileTextOutlined,
  HighlightOutlined,
  CodeOutlined,
  DatabaseOutlined,
  ApartmentOutlined,
  RobotOutlined,
  ToolOutlined,
  StarOutlined,
  FilePdfOutlined,
  LayoutOutlined,
  ApiOutlined,
  BugOutlined,
  BarChartOutlined,
} from '@ant-design/icons-vue';

import type { SkillCategory, CreateSkillRequest, SkillType, SkillCategoryKey } from '../types';
import { createSkill, fetchSkillCategories } from '../../api/skill';
import { SKILL_TYPE_OPTIONS } from '../repository/constants';

const router = useRouter();
const formRef = ref();

// 图标选项
const iconOptions: Record<string, any> = {
  'file-text': FileTextOutlined,
  'file-pdf': FilePdfOutlined,
  'highlight': HighlightOutlined,
  'code': CodeOutlined,
  'database': DatabaseOutlined,
  'apartment': ApartmentOutlined,
  'robot': RobotOutlined,
  'tool': ToolOutlined,
  'star': StarOutlined,
  'layout': LayoutOutlined,
  'api': ApiOutlined,
  'bug': BugOutlined,
  'bar-chart': BarChartOutlined,
};

// 状态
const categories = ref<SkillCategory[]>([]);
const submitting = ref(false);

const formState = reactive<CreateSkillRequest & { hasScripts: boolean; hasReferences: boolean; hasAssets: boolean }>({
  name: '',
  description: '',
  type: 'tool' as SkillType,
  category: 'custom' as SkillCategoryKey,
  tags: '',
  contentMd: '',
  icon: '',
  sourceUrl: '',
  hasScripts: false,
  hasReferences: false,
  hasAssets: false,
});

const rules = {
  name: [
    { required: true, message: '请输入技能名称', trigger: 'blur' },
    { min: 2, max: 100, message: '名称长度应在2-100个字符之间', trigger: 'blur' },
  ],
  type: [
    { required: true, message: '请选择技能类型', trigger: 'change' },
  ],
  category: [
    { required: true, message: '请选择技能分类', trigger: 'change' },
  ],
};

async function loadCategories() {
  try {
    categories.value = await fetchSkillCategories();
  } catch (error) {
    console.error('Failed to load categories:', error);
  }
}

async function handleSubmit() {
  try {
    await formRef.value.validate();
    submitting.value = true;

    const data: CreateSkillRequest = {
      name: formState.name,
      description: formState.description,
      type: formState.type,
      category: formState.category,
      tags: formState.tags,
      contentMd: formState.contentMd,
      icon: formState.icon || undefined,
      sourceUrl: formState.sourceUrl || undefined,
      hasScripts: formState.hasScripts,
      hasReferences: formState.hasReferences,
      hasAssets: formState.hasAssets,
    };

    await createSkill(data);
    message.success('技能创建成功');
    router.push('/XAA/skill/repository');
  } catch (error: any) {
    if (error.errorFields) {
      // 表单验证错误
      return;
    }
    message.error(error.message || '创建失败');
  } finally {
    submitting.value = false;
  }
}

async function handleSaveAsDraft() {
  try {
    await formRef.value.validateFields(['name', 'type', 'category']);
    submitting.value = true;

    const data: CreateSkillRequest = {
      name: formState.name,
      description: formState.description,
      type: formState.type,
      category: formState.category,
      tags: formState.tags,
      contentMd: formState.contentMd,
      icon: formState.icon || undefined,
      sourceUrl: formState.sourceUrl || undefined,
      hasScripts: formState.hasScripts,
      hasReferences: formState.hasReferences,
      hasAssets: formState.hasAssets,
    };

    await createSkill(data);
    message.success('已保存为草稿');
    router.push('/XAA/skill/repository');
  } catch (error: any) {
    if (error.errorFields) {
      return;
    }
    message.error(error.message || '保存失败');
  } finally {
    submitting.value = false;
  }
}

function goBack() {
  router.back();
}

onMounted(() => {
  loadCategories();
});
</script>

<style lang="scss" scoped>
.create-skill {
  padding: 16px;
  min-height: 100%;
  background: hsl(var(--background-deep));

  &__card {
    max-width: 900px;
    margin: 0 auto;
    border-radius: 12px;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__form {
    max-width: 800px;
  }
}
</style>
