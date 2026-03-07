import type {
  ApplicationConfig,
  VbenAdminProAppConfigRaw,
} from '@vben/types/global';

/**
 * 由 vite-inject-app-config 注入的全局配置
 */
export function useAppConfig(
  env: Record<string, any>,
  isProduction: boolean,
): ApplicationConfig {
  // 生产环境下，直接使用 window._VBEN_ADMIN_PRO_APP_CONF_ 全局变量
  const config = isProduction
    ? window._VBEN_ADMIN_PRO_APP_CONF_
    : (env as VbenAdminProAppConfigRaw);

  const {
    VITE_GLOB_API_URL,
    VITE_SMP_API_URL,
    VITE_DPP_API_URL,
    VITE_MTP_API_URL,
    VITE_MEP_API_URL,
    VITE_XAA_API_URL,
  } = config;

  return {
    apiURL: VITE_GLOB_API_URL,
    dppApiURL: VITE_DPP_API_URL,
    mtpApiURL: VITE_MTP_API_URL,
    smpApiURL: VITE_SMP_API_URL,
    mepApiURL: VITE_MEP_API_URL,
    xaaApiURL: VITE_XAA_API_URL,
  };
}
