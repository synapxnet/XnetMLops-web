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
            target: 'http://192.168.10.42:30783/api',

            // mock代理目标地址
            // http://localhost:5320/api
            // http://192.168.10.102:8181/api

            ws: true,
          },
          '/dpp': {
            changeOrigin: true, // 开启跨域
            rewrite: (path) => path.replace(/^\/dpp/, ''),
            target: 'http://192.168.10.42:30783/api',

            // mock代理目标地址
            // http://localhost:5320/api
            // http://192.168.10.102:8181/api

            ws: true,
          },
          '/mtp': {
            changeOrigin: true, // 开启跨域
            rewrite: (path) => path.replace(/^\/mtp/, ''),
            target: 'http://192.168.10.42:30783/api',

            // mock代理目标地址
            // http://localhost:5320/api
            // http://192.168.10.102:8181/api

            ws: true,
          },
          '/smp': {
            changeOrigin: true, // 开启跨域
            rewrite: (path) => path.replace(/^\/smp/, ''),
            target: 'http://192.168.10.42:30783/api',

            // mock代理目标地址
            // http://localhost:5320/api
            // http://192.168.10.102:8181/api

            ws: true,
          },
        },
      },
    },
  };
});
