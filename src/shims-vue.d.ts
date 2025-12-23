// src/shims-vue.d.ts
// 1. 声明 .vue 模块类型（之前已添加）
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// 2. 扩展 ImportMeta 类型，添加 env 属性（解决当前错误）
declare interface ImportMeta {
  env: {
    BASE_URL: string; // 对应 import.meta.env.BASE_URL（Vite 内置环境变量）
    MODE: string;     // 可选：添加其他常用 Vite 环境变量（如开发/生产模式）
    DEV: boolean;     // 可选：是否开发环境
    PROD: boolean;    // 可选：是否生产环境
    // 若你还用到了自定义环境变量（如 VITE_APP_BASE_API），也可以添加在这里
     VITE_APP_BASE_API?: string;
     VITE_API_BASE_URL?: string;
  };
}
