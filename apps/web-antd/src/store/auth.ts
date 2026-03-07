import type { Recordable, UserInfo } from '@vben/types';

import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { DEFAULT_HOME_PATH, LOGIN_PATH } from '@vben/constants';
import { resetAllStores, useAccessStore, useUserStore } from '@vben/stores';

import { notification } from 'ant-design-vue';
import { defineStore } from 'pinia';

import { getAccessCodesApi, getUserInfoApi, loginApi, logoutApi } from '#/api';
import { $t } from '#/locales';

export const useAuthStore = defineStore('auth', () => {
  const accessStore = useAccessStore();
  const userStore = useUserStore();
  const router = useRouter();

  const loginLoading = ref(false);

  /**
   * 跳转到登录页
   */
  async function redirectToLogin() {
    resetAllStores();
    await router.replace({
      path: LOGIN_PATH,
      query: {
        redirect: encodeURIComponent(router.currentRoute.value.fullPath),
      },
    });
  }

  /**
   * 获取用户信息和权限码（带错误处理）
   */
  async function fetchUserAndPermissions() {
    try {
      const [userInfo, accessCodes] = await Promise.all([
        fetchUserInfo(),
        getAccessCodesApi(),
      ]);
      return { userInfo, accessCodes };
    } catch (error) {
      // 获取用户信息或权限码失败，跳转到登录页
      notification.error({
        message: $t('authentication.requestFailed'),
        description: $t('authentication.requestFailedDesc'),
        duration: 3,
      });
      await redirectToLogin();
      throw error; // 抛出错误让上层知道失败
    }
  }

  /**
   * 异步处理登录操作
   * Asynchronously handle the login process
   * @param params 登录表单数据
   */
  async function authLogin(
    params: Recordable<any>,
    onSuccess?: () => Promise<void> | void,
  ) {
    // 异步处理用户登录操作并获取 accessToken
    let userInfo: null | UserInfo = null;
    try {
      loginLoading.value = true;
      const { accessToken } = await loginApi(params);

      // 如果成功获取到 accessToken
      if (accessToken) {
        accessStore.setAccessToken(accessToken);

        // 获取用户信息并存储到 accessStore 中
        const result = await fetchUserAndPermissions();

        if (!result) {
          return { userInfo: null };
        }

        userInfo = result.userInfo;
        userStore.setUserInfo(userInfo);
        accessStore.setAccessCodes(result.accessCodes);

        if (accessStore.loginExpired) {
          accessStore.setLoginExpired(false);
        } else {
          onSuccess
            ? await onSuccess?.()
            : await router.push(userInfo.homePath || DEFAULT_HOME_PATH);
        }

        if (userInfo?.realName) {
          notification.success({
            description: `${$t('authentication.loginSuccessDesc')}:${userInfo?.realName}`,
            duration: 3,
            message: $t('authentication.loginSuccess'),
          });
        }
      }
    } catch (error) {
      // 登录失败或其他错误
      console.error('Login failed:', error);
      // 如果已经获取到token但后续步骤失败，需要清除token
      if (accessStore.accessToken) {
        await redirectToLogin();
      }
      return { userInfo: null };
    } finally {
      loginLoading.value = false;
    }

    return {
      userInfo,
    };
  }

  /**
   * 异步处理手机号登录操作
   * Asynchronously handle the login process
   * @param params 登录表单数据
   */
  async function authCodeLogin(
    params: Recordable<any>,
    onSuccess?: () => Promise<void> | void,
  ) {
    // 异步处理用户登录操作并获取 accessToken
    let userInfo: null | UserInfo = null;
    try {
      loginLoading.value = true;
      const query = {
        userPhone: params.phoneNumber,
        code: params.code,
      };
      const { accessToken } = await loginApi(query);

      // 如果成功获取到 accessToken
      if (accessToken) {
        accessStore.setAccessToken(accessToken);

        // 获取用户信息并存储到 accessStore 中
        const result = await fetchUserAndPermissions();

        if (!result) {
          return { userInfo: null };
        }

        userInfo = result.userInfo;
        userStore.setUserInfo(userInfo);
        accessStore.setAccessCodes(result.accessCodes);

        if (accessStore.loginExpired) {
          accessStore.setLoginExpired(false);
        } else {
          onSuccess
            ? await onSuccess?.()
            : await router.push(userInfo.homePath || DEFAULT_HOME_PATH);
        }

        if (userInfo?.realName) {
          notification.success({
            description: `${$t('authentication.loginSuccessDesc')}:${userInfo?.realName}`,
            duration: 3,
            message: $t('authentication.loginSuccess'),
          });
        }
      }
    } catch (error) {
      // 登录失败或其他错误
      console.error('Code login failed:', error);
      // 如果已经获取到token但后续步骤失败，需要清除token
      if (accessStore.accessToken) {
        await redirectToLogin();
      }
      return { userInfo: null };
    } finally {
      loginLoading.value = false;
    }

    return {
      userInfo,
    };
  }

  async function logout(redirect: boolean = true) {
    try {
      await logoutApi();
    } catch {
      // 不做任何处理
    }
    resetAllStores();
    accessStore.setLoginExpired(false);

    // 回登录页带上当前路由地址
    await router.replace({
      path: LOGIN_PATH,
      query: redirect
        ? {
            redirect: encodeURIComponent(router.currentRoute.value.fullPath),
          }
        : {},
    });
  }

  async function fetchUserInfo() {
    let userInfo: null | UserInfo = null;
    try {
      userInfo = await getUserInfoApi();
      userStore.setUserInfo(userInfo);
      return userInfo;
    } catch (error) {
      console.error('Fetch user info failed:', error);
      // 获取用户信息失败，清空已设置的用户信息
      userStore.setUserInfo(null);
      throw error; // 抛出错误让上层处理
    }
  }

  function $reset() {
    loginLoading.value = false;
  }

  return {
    $reset,
    authLogin,
    authCodeLogin,
    fetchUserInfo,
    loginLoading,
    logout,
  };
});
