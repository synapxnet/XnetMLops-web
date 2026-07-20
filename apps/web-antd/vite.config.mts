import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      server: {
        proxy: {
          '/api': {
            changeOrigin: true, // 开启跨域
            rewrite: (path) => path.replace(/^\/api/, ''),
            target: 'http://127.0.0.1:8181/api',

            // mock代理目标地址
            // http://localhost:5320/api
            // http://127.0.0.1:8181/api

            ws: true,
          },
          '/dpp': {
            changeOrigin: true, // 开启跨域
            rewrite: (path) => path.replace(/^\/dpp/, ''),
            target: 'http://127.0.0.1:8182/api',

            // mock代理目标地址
            // http://localhost:5320/api
            // http://127.0.0.1:8181/api

            ws: true,
          },
          '/mtp': {
            changeOrigin: true, // 开启跨域
            rewrite: (path) => path.replace(/^\/mtp/, ''),
            target: 'http://127.0.0.1:8183/api',

            // mock代理目标地址
            // http://localhost:5320/api
            // http://127.0.0.1:8181/api

            ws: true,
          },
          '/smp/smp': {
            changeOrigin: true, // 开启跨域
            rewrite: (path) => path.replace(/^\/smp\/smp/, '/api/smp'),
            target: 'http://127.0.0.1:8185',

            // 处理 /smp/smp/xxx 路径（smpRequestClient baseURL=/smp + API路径/smp/xxx）
            ws: true,
          },
          '/smp': {
            changeOrigin: true, // 开启跨域
            rewrite: (path) => path.replace(/^\/smp/, ''),
            target: 'http://127.0.0.1:8185/api',

            // mock代理目标地址
            // http://localhost:5320/api
            // http://127.0.0.1:8181/api

            ws: true,
          },
          '/mep': {
            changeOrigin: true, // 开启跨域
            // 后端Controller路径: /mep/xxx (如 /mep/api-keys, /mep/nodes)
            target: 'http://127.0.0.1:8184',

            ws: true,
          },
          '/xaa': {
            changeOrigin: true, // 开启跨域
            rewrite: (path) => path.replace(/^\/xaa/, '/api/xaa'),
            target: 'http://127.0.0.1:8186',

            ws: true,
          },
        },
      },
    },
  };
});
