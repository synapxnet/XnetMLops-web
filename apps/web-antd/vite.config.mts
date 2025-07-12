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
            target: 'http://192.168.31.31:8181/api',

            // mock代理目标地址
            // http://localhost:5320/api
            // http://192.168.31.31:8181/api

            ws: true,
          },
          '/dpp': {
            changeOrigin: true, // 开启跨域
            rewrite: (path) => path.replace(/^\/dpp/, ''),
            target: 'http://192.168.31.31:8182/api',

            // mock代理目标地址
            // http://localhost:5320/api
            // http://192.168.31.31:8181/api

            ws: true,
          },
          '/mtp': {
            changeOrigin: true, // 开启跨域
            rewrite: (path) => path.replace(/^\/mtp/, ''),
            target: 'http://192.168.31.31:8183/api',

            // mock代理目标地址
            // http://localhost:5320/api
            // http://192.168.31.31:8181/api

            ws: true,
          },
          '/smp': {
            changeOrigin: true, // 开启跨域
            rewrite: (path) => path.replace(/^\/smp/, ''),
            target: 'http://192.168.31.31:8185/api',

            // mock代理目标地址
            // http://localhost:5320/api
            // http://192.168.31.31:8181/api

            ws: true,
          },
        },
      },
    },
  };
});
