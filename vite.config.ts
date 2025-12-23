import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    port: 3000, // 前端固定端口
    proxy: {
      '/api': {
        target: 'http://localhost:8082', // 后端服务地址
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '') // 移除/api前缀
      }
    }
  },
  base: process.env.NODE_ENV === 'production' ? '/<RXT-Laster>/' : '/',
  build: {
    outDir: 'dist'
  }
})
