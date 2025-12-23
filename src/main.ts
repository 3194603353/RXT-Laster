import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus' // 引入 Element Plus
import App from './App.vue'
import router from './router'
import '@/utils/api'
import 'element-plus/dist/index.css'
import ElementPlus from 'element-plus' // 新增：引入ElementPlus核心库
import { Close } from '@element-plus/icons-vue'
const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus) // 使用 Element Plus
app.component('ElIconClose', Close)
app.use(ElementPlus) // 全局注册所有组件
app.mount('#app')
