/**
 * 该文件可自行根据业务逻辑进行调整
 */
import type { RequestClientOptions } from '@vben/request';

import { useAppConfig } from '@vben/hooks';
import { preferences } from '@vben/preferences';
import {
  authenticateResponseInterceptor,
  defaultResponseInterceptor,
  errorMessageResponseInterceptor,
  RequestClient,
} from '@vben/request';
import { useAccessStore, useUserStore } from '@vben/stores';

import { message } from 'ant-design-vue';

import { useAuthStore } from '#/store';

import { refreshTokenApi } from './core';

const { apiURL, smpApiURL, dppApiURL, mtpApiURL, mepApiURL, xaaApiURL } =
  useAppConfig(import.meta.env, import.meta.env.PROD);

const ORGANIZATION_SCOPE_KEY = 'synapxnet:organization-scope';

interface OrganizationScope {
  deptUid: null | string;
  teamUid: null | string;
  tenantUid: null | string;
}

/** 读取当前页签内的组织范围，解析失败时按未授权处理。 */
function readOrganizationScope(): null | OrganizationScope {
  try {
    const raw = globalThis.sessionStorage?.getItem(ORGANIZATION_SCOPE_KEY);
    return raw ? (JSON.parse(raw) as OrganizationScope) : null;
  } catch {
    return null;
  }
}

/** 将已选租户、部门和团队写入业务请求头，供服务端二次校验。 */
function appendOrganizationScopeHeaders(headers: Record<string, any>) {
  const scope = readOrganizationScope();
  if (!scope?.tenantUid || !scope.deptUid || !scope.teamUid) return;
  headers['X-Tenant-Uid'] = scope.tenantUid;
  headers['X-Dept-Uid'] = scope.deptUid;
  headers['X-Team-Uid'] = scope.teamUid;
}

function createRequestClient(baseURL: string, options?: RequestClientOptions) {
  const client = new RequestClient({
    ...options,
    baseURL,
    timeout: 600_000,
  });

  /**
   * 重新认证逻辑
   */
  async function doReAuthenticate() {
    console.warn('Access token or refresh token is invalid or expired. ');
    const authStore = useAuthStore();
    await authStore.forceLogout();
  }

  /**
   * 刷新token逻辑
   */
  async function doRefreshToken() {
    const accessStore = useAccessStore();
    const resp = await refreshTokenApi();
    const newToken = resp.data;
    accessStore.setAccessToken(newToken);
    useAuthStore().startSessionExpirationMonitor();
    return newToken;
  }

  function formatToken(token: null | string) {
    return token ? `Bearer ${token}` : null;
  }

  // 请求头处理
  client.addRequestInterceptor({
    fulfilled: async (config) => {
      const accessStore = useAccessStore();
      const userStore = useUserStore();

      config.headers.Authorization = formatToken(accessStore.accessToken);
      config.headers['Accept-Language'] = preferences.app.locale;
      // 添加用户ID到请求头
      if (userStore.userInfo?.userId) {
        config.headers['X-User-Id'] = userStore.userInfo.userId;
      }
      appendOrganizationScopeHeaders(config.headers);
      return config;
    },
  });

  // 处理返回的响应数据格式
  client.addResponseInterceptor(
    defaultResponseInterceptor({
      codeField: 'code',
      dataField: 'data',
      successCode: 0,
    }),
  );

  // token过期的处理
  client.addResponseInterceptor(
    authenticateResponseInterceptor({
      client,
      doReAuthenticate,
      doRefreshToken,
      enableRefreshToken: preferences.app.enableRefreshToken,
      formatToken,
    }),
  );

  // 通用的错误处理,如果没有进入上面的错误处理逻辑，就会进入这里
  client.addResponseInterceptor(
    errorMessageResponseInterceptor((msg: string, error) => {
      // 这里可以根据业务进行定制,你可以拿到 error 内的信息进行定制化处理，根据不同的 code 做不同的提示，而不是直接使用 message.error 提示 msg
      // 当前mock接口返回的错误字段是 error 或者 message
      const responseData = error?.response?.data ?? {};
      const errorMessage = responseData?.error ?? responseData?.message ?? '';
      // 如果没有错误信息，则会根据状态码进行提示
      message.error(errorMessage || msg);
    }),
  );

  return client;
}

/**
 * 创建保留公共 ToolResponse 包络的 MEP Agent 请求客户端。
 *
 * @param serviceBaseURL MEP 原有 API 地址
 * @returns 证据、探针和动作请求客户端
 */
function createAgentRequestClient(serviceBaseURL: string) {
  const baseURL = serviceBaseURL
    .replace(/\/api\/[^/]+\/?$/, '')
    .replace(/\/mep\/?$/, '');
  const client = new RequestClient({
    baseURL,
    responseReturn: 'data',
    timeout: 65_000,
  });
  client.addRequestInterceptor({
    fulfilled: async (config) => {
      const token = useAccessStore().accessToken;
      config.headers.Authorization = token ? `Bearer ${token}` : null;
      config.headers['Accept-Language'] = preferences.app.locale;
      appendOrganizationScopeHeaders(config.headers);
      return config;
    },
  });
  return client;
}

export const requestClient = createRequestClient(apiURL, {
  responseReturn: 'data',
});
// dpp接口请求客户端
export const dppRequestClient = createRequestClient(dppApiURL, {
  responseReturn: 'data',
});
// mtp接口请求客户端
export const mtpRequestClient = createRequestClient(mtpApiURL, {
  responseReturn: 'data',
});
// smp接口请求客户端
export const smpRequestClient = createRequestClient(smpApiURL, {
  responseReturn: 'data',
});
// mep接口请求客户端(模型部署平台)
export const mepRequestClient = createRequestClient(mepApiURL, {
  responseReturn: 'data',
});
// xaa接口请求客户端(Xnet智能体)
export const xaaRequestClient = createRequestClient(xaaApiURL, {
  responseReturn: 'data',
});

export const agentMepRequestClient = createAgentRequestClient(mepApiURL);

export const baseRequestClient = new RequestClient({ baseURL: apiURL });
