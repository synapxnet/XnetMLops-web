<script lang="ts" setup>
import type { NotificationItem } from '@vben/layouts';

import { computed, onMounted, provide, ref, watch } from 'vue';

import { AuthenticationLoginExpiredModal } from '@vben/common-ui';
import { useWatermark } from '@vben/hooks';
import { BookOpenText, MdiGithub } from '@vben/icons';
import {
  BasicLayout,
  LockScreen,
  Notification,
  UserDropdown,
} from '@vben/layouts';
import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';
import { openWindow } from '@vben/utils';

import { useAuthStore } from '#/store';
import AssistantFloatingWindow from '#/components/AssistantFloatingWindow/index.vue';
import LoginForm from '#/views/_core/authentication/login.vue';

import { getOrganizationTree } from '../views/SMP/api/deptTreeData';

const OPENXNET_URL = 'https://openxnet.synapxnet.com';
const FRONTEND_REPOSITORY_URL = 'https://github.com/synapxnet/XnetMLops-web';
const BACKEND_REPOSITORY_URL = 'https://github.com/synapxnet/XnetMLops';

// 智能助手浮窗控制
const showAssistantFloat = ref(true);

const notifications = ref<NotificationItem[]>([
  {
    avatar: 'https://avatar.vercel.sh/synapxnet.svg?text=SX',
    date: '3小时前',
    isRead: true,
    message: '描述信息描述信息描述信息',
    title: '收到了 14 份新周报',
  },
  {
    avatar: 'https://avatar.vercel.sh/1',
    date: '刚刚',
    isRead: false,
    message: '描述信息描述信息描述信息',
    title: '朱偏右 回复了你',
  },
  {
    avatar: 'https://avatar.vercel.sh/1',
    date: '2024-01-01',
    isRead: false,
    message: '描述信息描述信息描述信息',
    title: '曲丽丽 评论了你',
  },
  {
    avatar: 'https://avatar.vercel.sh/satori',
    date: '1天前',
    isRead: false,
    message: '描述信息描述信息描述信息',
    title: '代办提醒',
  },
]);

const userStore = useUserStore();
const authStore = useAuthStore();
const accessStore = useAccessStore();
const { destroyWatermark, updateWatermark } = useWatermark();
const showDot = computed(() =>
  notifications.value.some((item) => !item.isRead),
);

const menus = computed(() => [
  {
    handler: () => {
      openWindow(OPENXNET_URL, {
        target: '_blank',
      });
    },
    icon: BookOpenText,
    text: 'OpenXnet 开源社区',
  },
  {
    handler: () => {
      openWindow(FRONTEND_REPOSITORY_URL, {
        target: '_blank',
      });
    },
    icon: MdiGithub,
    text: 'XnetMLops Web 源码',
  },
  {
    handler: () => {
      openWindow(BACKEND_REPOSITORY_URL, {
        target: '_blank',
      });
    },
    icon: MdiGithub,
    text: 'XnetMLops 后端源码',
  },
]);

const avatar = computed(() => {
  return userStore.userInfo?.avatar ?? preferences.app.defaultAvatar;
});

async function handleLogout() {
  await authStore.logout(false);
}

function handleNoticeClear() {
  notifications.value = [];
}

function handleMakeAll() {
  notifications.value.forEach((item) => (item.isRead = true));
}
watch(
  () => preferences.app.watermark,
  async (enable) => {
    if (enable) {
      await updateWatermark({
        content: `${userStore.userInfo?.username}`,
      });
    } else {
      destroyWatermark();
    }
  },
  {
    immediate: true,
  },
);
// 定义组织树数据结构
interface DeptTreeDataItem {
  label: string;
  value: string; // 使用 uid
  children?: DeptTreeDataItem[];
}

// 组织树数据（从后端获取）
const organizationTree = ref<DeptTreeDataItem[]>([]);

// 获取组织树数据
const fetchOrganizationTree = async () => {
  try {
    const treeData = await getOrganizationTree();
    organizationTree.value = transformOrgTree(treeData);

    // +++ 新增：在树数据加载后恢复选择 +++
    restoreSelectedOrg();
  } catch (error) {
    console.error('获取组织树失败', error);
    organizationTree.value = [];
  }
};

// 优化转换函数（根据实际数据结构）
const transformOrgTree = (tree: any[]): DeptTreeDataItem[] => {
  if (!tree || !Array.isArray(tree)) return [];

  return tree.map((item) => ({
    label: item.label,
    value: item.value,
    // 处理子节点（空数组转为 undefined）
    children:
      item.children && item.children.length > 0
        ? transformOrgTree(item.children)
        : undefined,
  }));
};

// 创建响应式引用
const selectedOrg = ref({
  level: 0,
  tenantUid: null,
  deptUid: null,
  teamUid: null,
});
// 提供组织树数据
provide('organizationTree', organizationTree);
// 提供数据
provide('selectedOrganization', selectedOrg);
// 提供当前用户信息
const userInfo = computed(() => userStore.userInfo);
provide('currentUserInfo', userInfo);

// 修改 handleDepartmentChange
function handleDepartmentChange(value: string[]) {
  const [tenantUid, deptUid, teamUid] = value;

  selectedOrg.value = {
    level: value.length,
    tenantUid: tenantUid || null,
    deptUid: deptUid || null,
    teamUid: teamUid || null,
  };
  console.log('选择的选择:', selectedOrg.value);

  // 保存到本地存储
  localStorage.setItem(
    'selectedOrganization',
    JSON.stringify(selectedOrg.value),
  );
}

const restoreSelectedOrg = () => {
  const savedOrg = localStorage.getItem('selectedOrganization');
  if (savedOrg) {
    try {
      selectedOrg.value = JSON.parse(savedOrg);
      console.log('恢复的组织选择:', selectedOrg.value);
    } catch (error) {
      console.error('解析保存的组织数据失败', error);
      localStorage.removeItem('selectedOrganization');
    }
  }
};
// 修改初始化逻辑
onMounted(() => {
  // +++ 先恢复选择状态 +++
  restoreSelectedOrg();
  // 再获取组织树数据（获取完成后会再次恢复）
  fetchOrganizationTree();
});
</script>

<template>
  <BasicLayout
    @clear-preferences-and-logout="handleLogout"
    :tree-data="organizationTree"
    @department-change="handleDepartmentChange"
  >
    <template #user-dropdown>
      <UserDropdown
        :avatar
        :menus
        :text="userStore.userInfo?.realName"
        description="SynapXnet 开源团队"
        tag-text="1.0.0"
        @logout="handleLogout"
      />
    </template>
    <template #notification>
      <Notification
        :dot="showDot"
        :notifications="notifications"
        @clear="handleNoticeClear"
        @make-all="handleMakeAll"
      />
    </template>
    <template #extra>
      <AuthenticationLoginExpiredModal
        v-model:open="accessStore.loginExpired"
        :avatar
      >
        <LoginForm />
      </AuthenticationLoginExpiredModal>
    </template>
    <template #lock-screen>
      <LockScreen :avatar @to-login="handleLogout" />
    </template>
  </BasicLayout>

  <!-- 智能助手浮动窗口 -->
  <AssistantFloatingWindow
    v-if="showAssistantFloat"
    :visible="showAssistantFloat"
    @close="showAssistantFloat = false"
  />
</template>
