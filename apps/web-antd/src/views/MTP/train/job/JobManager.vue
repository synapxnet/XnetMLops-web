<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { Button, Card, message, Steps, Tag } from 'ant-design-vue';

import { fetchPipelineStatus } from '../../../SMP/api/traintask';

// 定义阶段类型
interface TaskStage {
  title: string;
  status: 'error' | 'finish' | 'process' | 'wait';
  description: string;
  startTime: string;
  endTime?: string;
  duration?: string;
  logs: string[];
  metrics: { title: string; value: string }[];
}

// 当前任务ID（从路由参数获取）
const route = useRoute();
const jobUid = ref((route.query.id as string) || 'TRN-20230815-001');
const tenantUid = ref((route.query.tenantUid as string) || '');
const currentStep = ref(0); // 当前进行到第几步
const loading = ref(false);

// 任务信息
const taskInfo = ref({
  title: '训练任务',
  creator: '系统',
  createTime: '2023-08-15 09:30',
  status: 'running',
  startTime: '',
  elapsedTime: '计算中...',
  remainingTime: '计算中...',
});

// 任务阶段数据 - 初始化为空
const stages = ref<TaskStage[]>([]);

// 阶段状态映射
const mapStageStatus = (apiStatus: string) => {
  const statusMap: Record<string, 'error' | 'finish' | 'process' | 'wait'> = {
    SUCCESS: 'finish',
    FAILED: 'error',
    IN_PROGRESS: 'process',
    PENDING: 'wait',
  };
  return statusMap[apiStatus] || 'wait';
};

// 阶段描述文本
const getStageDescription = (apiStatus: string) => {
  const descriptionMap: Record<string, string> = {
    SUCCESS: '已完成',
    FAILED: '失败',
    IN_PROGRESS: '进行中',
    PENDING: '等待中',
  };
  return descriptionMap[apiStatus] || '未开始';
};

// 整体任务状态映射
const mapJobStatus = (apiStatus: string) => {
  const statusMap: Record<string, string> = {
    SUCCESS: 'finished',
    FAILED: 'error',
    RUNNING: 'running',
    PAUSED: 'paused',
    CANCELLED: 'stopped',
    QUEUED: 'queued',
  };
  return statusMap[apiStatus] || 'running';
};

// 日期格式化函数
const formatDateTime = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

// 计算持续时间
const calculateDuration = (start: string, end: string) => {
  if (!start || !end) return '';

  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const durationMillis = endTime - startTime;

  if (durationMillis <= 0) return '00:00:00';

  const seconds = Math.floor(durationMillis / 1000) % 60;
  const minutes = Math.floor(durationMillis / (1000 * 60)) % 60;
  const hours = Math.floor(durationMillis / (1000 * 60 * 60));

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// 新增步骤变更处理方法
const handleStepChange = (step: number) => {
  if (step >= 0 && step < stages.value.length) {
    currentStep.value = step;
  }
};

// 加载任务数据
// 加载任务数据
const loadTaskData = async () => {
  loading.value = true;
  try {
    const response = await fetchPipelineStatus(jobUid.value, tenantUid.value);
    // 更新任务信息
    taskInfo.value.title = response.jobName || '训练任务';
    taskInfo.value.status = mapJobStatus(response.overallStatus);

    // 处理阶段数据
    const backendStages = response.stages || [];
    const mappedStages = backendStages.map((stage: any) => {
      // 计算结束时间
      const startDate = new Date(stage.startTime);
      const endDate = new Date(startDate.getTime() + stage.durationMillis);

      // 特殊处理：当阶段名称为"Declarative: Post Actions"时，替换为"数据清理"
      const stageName =
        stage.stageName === 'Declarative: Post Actions'
          ? '数据清理'
          : stage.stageName;

      return {
        title: stageName, // 使用处理后的阶段名称
        status: mapStageStatus(stage.status),
        description: getStageDescription(stage.status),
        startTime: formatDateTime(stage.startTime),
        endTime: formatDateTime(endDate.toISOString()),
        duration: stage.durationFormatted,
        logs: [
          `[${formatDateTime(stage.startTime).split(' ')[1]}] 开始${stageName}`,
          `[${formatDateTime(endDate.toISOString()).split(' ')[1]}] ${stageName}完成`,
          `状态: ${stage.status} | 耗时: ${stage.durationFormatted}`,
        ],
        metrics: [
          {
            title: '状态',
            value: stage.status === 'SUCCESS' ? '成功' : stage.status,
          },
          { title: '持续时间', value: stage.durationFormatted },
        ],
      };
    });

    // 添加默认的Post Actions阶段（如果不存在）
    const hasDataCleaning = mappedStages.some(
      (stage) => stage.title === '数据清理',
    );
    if (!hasDataCleaning && mappedStages.length < 6) {
      mappedStages.push({
        title: '数据清理',
        status: 'wait',
        description: '未开始',
        startTime: '',
        endTime: '',
        duration: '',
        logs: [],
        metrics: [],
      });
    }

    stages.value = mappedStages;

    // 计算当前步骤（找到第一个进行中或未开始的阶段）
    const activeIndex = mappedStages.findIndex(
      (stage) => stage.status === 'process' || stage.status === 'wait',
    );
    currentStep.value =
      activeIndex === -1 ? mappedStages.length - 1 : activeIndex;

    // 更新任务时间信息
    if (backendStages.length > 0) {
      const firstStage = backendStages[0];
      const lastStage = backendStages[backendStages.length - 1];

      taskInfo.value.startTime = formatDateTime(firstStage.startTime);

      // 计算总耗时
      if (lastStage.startTime) {
        const startTime = new Date(firstStage.startTime);
        const endTime = new Date(
          new Date(lastStage.startTime).getTime() + lastStage.durationMillis,
        );
        taskInfo.value.elapsedTime = calculateDuration(
          firstStage.startTime,
          endTime.toISOString(),
        );
      }
    }
  } catch (error) {
    console.error('获取任务详情失败:', error);
    message.error('获取任务详情失败，使用默认数据');

    // 使用默认数据作为回退
    stages.value = [
      {
        title: '拉取数据',
        status: 'finish',
        description: '已完成',
        startTime: '2023-08-15 10:15:20',
        endTime: '2023-08-15 10:25:45',
        duration: '10分25秒',
        logs: ['数据获取成功'],
        metrics: [{ title: '状态', value: '成功' }],
      },
      {
        title: '构建训练任务',
        status: 'finish',
        description: '已完成',
        startTime: '2023-08-15 10:26:10',
        endTime: '2023-08-15 10:35:30',
        duration: '9分20秒',
        logs: ['任务构建完成'],
        metrics: [{ title: '状态', value: '成功' }],
      },
      {
        title: '准备训练环境',
        status: 'process',
        description: '进行中',
        startTime: '2023-08-15 10:45:32',
        logs: [
          '开始准备训练环境',
          '检测可用资源：GPU 可用，内存充足',
          '分配计算资源：2个GPU，32GB内存',
        ],
        metrics: [{ title: '状态', value: '进行中' }],
      },
      {
        title: '模型训练',
        status: 'wait',
        description: '等待中',
        logs: [],
        metrics: [],
      },
      {
        title: '模型输出',
        status: 'wait',
        description: '等待中',
        logs: [],
        metrics: [],
      },
      {
        title: '数据清理',
        status: 'wait',
        description: '等待中',
        logs: [],
        metrics: [],
      },
    ];
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadTaskData();
});

// 操作处理函数
const refreshStatus = () => {
  loading.value = true;
  loadTaskData();
  message.success('状态已刷新');
};

const viewFullLogs = () => {
  message.info('打开完整日志查看器');
};

const pauseTask = () => {
  message.warning('任务已暂停');
  taskInfo.value.status = 'paused';
};

const stopTask = () => {
  message.error('任务已终止');
  taskInfo.value.status = 'stopped';
};
</script>

<template>
  <div class="task-detail-container">
    <!-- 头部任务信息 -->
    <Card class="header-card">
      <div class="header-content">
        <div class="task-header">
          <div class="task-title-row">
            <h1 class="task-title">{{ taskInfo.title }}</h1>
            <Tag
              :color="
                taskInfo.status === 'running'
                  ? 'blue'
                  : taskInfo.status === 'paused'
                    ? 'orange'
                    : taskInfo.status === 'stopped'
                      ? 'red'
                      : 'green'
              "
            >
              {{
                taskInfo.status === 'running'
                  ? '运行中'
                  : taskInfo.status === 'paused'
                    ? '已暂停'
                    : taskInfo.status === 'stopped'
                      ? '已终止'
                      : '已完成'
              }}
            </Tag>
          </div>
          <div class="task-id">任务ID: {{ jobUid }}</div>
          <div class="task-info">
            <div>创建者: {{ taskInfo.creator }}</div>
            <div>创建时间: {{ taskInfo.createTime }}</div>
          </div>
        </div>
        <div class="time-stat">
          <div class="stat-grid">
            <div class="stat-item">
              <div class="stat-label">开始时间</div>
              <div class="stat-value">{{ taskInfo.startTime || '--' }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">已运行时间</div>
              <div class="stat-value">{{ taskInfo.elapsedTime }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">预估剩余时间</div>
              <div class="stat-value">{{ taskInfo.remainingTime }}</div>
            </div>
          </div>
        </div>
      </div>
    </Card>

    <!-- 步骤指示器 - 已修改支持点击 -->
    <Card class="steps-card">
      <Steps :current="currentStep" size="small">
        <Steps.Step
          v-for="(stage, index) in stages"
          :key="index"
          :title="stage.title"
          :description="stage.description"
          @click.native="handleStepChange(index)"
          class="step-item"
          :class="[{ active: currentStep === index }]"
        />
      </Steps>
    </Card>

    <!-- 当前阶段详情 -->
    <Card v-if="stages.length > 0 && stages[currentStep]" class="step-card">
      <div class="step-header">
        <div class="step-title">{{ stages[currentStep].title }}阶段详情</div>
        <div class="step-time">
          开始时间: {{ stages[currentStep].startTime || '--' }}
          <span v-if="stages[currentStep].endTime">
            | 结束时间: {{ stages[currentStep].endTime }} | 持续时间:
            {{ stages[currentStep].duration || '--' }}
          </span>
        </div>
      </div>

      <!-- 资源指标 -->
      <div v-if="stages[currentStep].metrics.length > 0" class="metrics-grid">
        <div
          v-for="(metric, idx) in stages[currentStep].metrics"
          :key="idx"
          class="metric-card"
        >
          <div class="metric-title">{{ metric.title }}</div>
          <div class="metric-value">{{ metric.value }}</div>
        </div>
      </div>

      <!-- 阶段日志 -->
      <div class="log-header">
        <h3 class="log-title">阶段日志</h3>
        <div class="log-stats">
          <span class="log-count">共 {{ stages[currentStep].logs.length }} 条日志</span>
          <span class="log-update">最后更新: {{ new Date().toLocaleTimeString() }}</span>
        </div>
      </div>
      <div class="logs-container">
        <div
          v-for="(log, idx) in stages[currentStep].logs"
          :key="idx"
          class="log-entry"
        >
          <span class="log-time">{{ log.split(']')[0] }}]</span>
          <span
            :class="{
              'log-info': !(log.includes('警告') || log.includes('错误')),
              'log-warning': log.includes('警告'),
              'log-error': log.includes('错误'),
            }"
          >
            {{ log.split('] ')[1] || log }}
          </span>
        </div>
        <div v-if="stages[currentStep].logs.length === 0" class="empty-logs">
          暂无日志记录
        </div>
      </div>
    </Card>

    <!-- 操作按钮 -->
    <div class="footer-actions">
      <Button type="primary" :loading="loading" @click="refreshStatus">
        <template #icon><SyncOutlined /></template>
        刷新状态
      </Button>
      <Button @click="viewFullLogs">
        <template #icon><FileTextOutlined /></template>
        查看完整日志
      </Button>
      <Button type="dashed" @click="pauseTask">
        <template #icon><PauseOutlined /></template>
        暂停任务
      </Button>
      <Button type="primary" danger @click="stopTask">
        <template #icon><StopOutlined /></template>
        终止任务
      </Button>
    </div>
  </div>
</template>

<style scoped>
/* 全局样式 */
.task-detail-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f8f9fa;
}

.header-card {
  background: linear-gradient(135deg, #1a73e8, #0d47a1);
  color: white;
  border-radius: 10px;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.task-header {
  flex: 1;
  padding-right: 20px;
}

.task-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.task-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0;
}

.task-id {
  font-size: 0.95rem;
  opacity: 0.85;
  margin-bottom: 8px;
}

.task-info {
  display: flex;
  gap: 15px;
  font-size: 0.95rem;
  opacity: 0.9;
  flex-wrap: wrap;
  align-items: center;
}

.time-stat {
  background: rgba(255, 255, 255, 0.2);
  padding: 12px;
  border-radius: 8px;
  min-width: 320px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.stat-item {
  background: rgba(255, 255, 255, 0.1);
  padding: 8px;
  border-radius: 6px;
  text-align: center;
}

.stat-label {
  font-size: 0.85rem;
  opacity: 0.8;
}

.stat-value {
  font-size: 1rem;
  font-weight: 600;
  margin-top: 3px;
}

.steps-card {
  margin-bottom: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

/* 步骤项样式 - 添加了点击效果 */
:deep(.ant-steps-item) {
  cursor: pointer;
  transition: all 0.3s;
  padding: 8px 12px;
  border-radius: 4px;
}

:deep(.ant-steps-item):hover {
  background-color: #f0f7ff;
}

:deep(.ant-steps-item).active {
  background-color: #e6f7ff;
  font-weight: 500;
}

.step-card {
  border-radius: 10px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
  flex-wrap: wrap;
}

.step-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #1a73e8;
  margin-right: 15px;
}

.step-time {
  font-size: 0.9rem;
  color: #666;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin: 15px 0;
}

.metric-card {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 12px;
  background: white;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.03);
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.metric-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
}

.metric-title {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 6px;
}

.metric-value {
  font-size: 1.2rem;
  font-weight: 600;
  color: #1a73e8;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 20px 0 10px;
  flex-wrap: wrap;
}

.log-title {
  color: #444;
  font-size: 1.1rem;
  margin-bottom: 0;
  display: flex;
  align-items: center;
}

.log-title::before {
  content: '';
  display: inline-block;
  width: 4px;
  height: 16px;
  background: #1a73e8;
  margin-right: 8px;
  border-radius: 2px;
}

.log-stats {
  font-size: 0.85rem;
  color: #666;
}

.log-count {
  margin-right: 15px;
}

.logs-container {
  background: #2d2d2d;
  color: #f1f1f1;
  border-radius: 6px;
  padding: 15px;
  font-family: 'Fira Code', 'Courier New', monospace;
  height: 500px;
  overflow-y: auto;
  margin-top: 10px;
  font-size: 0.9rem;
  border: 1px solid #444;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.5);
}

.logs-container::-webkit-scrollbar {
  width: 8px;
}

.logs-container::-webkit-scrollbar-track {
  background: #252525;
  border-radius: 4px;
}

.logs-container::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 4px;
}

.logs-container::-webkit-scrollbar-thumb:hover {
  background: #777;
}

.log-entry {
  margin-bottom: 5px;
  line-height: 1.4;
  white-space: pre-wrap;
  padding: 3px 0;
}

.log-time {
  color: #6a9955;
  margin-right: 10px;
}

.log-info {
  color: #d4d4d4;
}

.log-warning {
  color: #d7ba7d;
}

.log-error {
  color: #f48771;
}

.empty-logs {
  color: #888;
  font-style: italic;
  text-align: center;
  padding: 20px;
}

.footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.footer-actions button {
  display: flex;
  align-items: center;
  gap: 6px;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .task-info {
    flex-wrap: wrap;
    margin-top: 10px;
  }

  .time-stat {
    width: 100%;
    margin-top: 15px;
    min-width: auto;
  }

  .step-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .step-time {
    margin-top: 10px;
  }

  .footer-actions {
    flex-wrap: wrap;
    justify-content: center;
  }

  .metrics-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }

  .log-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  :deep(.ant-steps-item) {
    padding: 6px 8px;
  }
}
</style>
