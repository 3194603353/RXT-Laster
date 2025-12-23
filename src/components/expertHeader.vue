<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router' // 新增：引入路由钩子
import type { RouteLocationRaw } from 'vue-router'
import UserCenter from './UserCenter.vue'

type ExtraNavLink = {
  label: string
  to: RouteLocationRaw
}

const props = defineProps<{ extraNavLink?: ExtraNavLink }>()

const router = useRouter() // 新增：初始化路由实例
const isAuthed = ref(false)
const updateAuth = () => {
  try { isAuthed.value = !!localStorage.getItem('auth_token') } catch { isAuthed.value = false }
}
const role = computed(() => {
  if (!isAuthed.value) return null
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    const obj = JSON.parse(raw)
    return (obj.role || '').toLowerCase()
  } catch { return null }
})
const homePath = computed(() => {
  switch (role.value) {
    case 'admin': return '/admin-home'
    case 'expert': return '/expert-home' // 专家工作台首页
    case 'bankuser': return '/bank-user-home'
    default: return '/home'
  }
})

// 控制三个标签高亮状态
const activeNavKey = ref<string>('expert-home') // 初始高亮专家工作台
// 初始化从本地缓存恢复状态
const initActiveNav = () => {
  const savedKey = localStorage.getItem('expertActiveNav')
  if (savedKey) activeNavKey.value = savedKey
}
// 修正：用正确的路由实例跳转
const handleNavClick = (key: string, to: RouteLocationRaw) => {
  activeNavKey.value = key
  localStorage.setItem('expertActiveNav', key)
  router.push(to) // 修正：用useRouter获取的实例跳转
}

onMounted(() => {
  updateAuth()
  window.addEventListener('storage', updateAuth)
  initActiveNav() // 初始化高亮状态
})
onUnmounted(() => window.removeEventListener('storage', updateAuth))

const extraNavLink = computed(() => props.extraNavLink)
</script>

<template>
  <header class="site-header">
    <div class="site-top">
      <div class="brand">
        <span class="brand-name">融销通</span>
        <span class="brand-sub">农业专家服务平台</span>
      </div>

      <div class="auth-links" v-if="!isAuthed">
        <router-link to="/login" class="link">登录</router-link>
        <router-link to="/register" class="link register">专家注册</router-link>
      </div>
      <div v-else class="user-center-slot">
        <UserCenter />
      </div>
    </div>

    <div class="site-nav">
      <nav class="main-nav" v-if="role === 'expert'">
        <!-- 1. 专家工作台 -->
        <a
          href="javascript:;"
          :class="{ active: activeNavKey === 'expert-home' }"
          @click="handleNavClick('expert-home', homePath)"
        >
          专家工作台
        </a>
        <!-- 2. 同行问答 -->
        <a
          href="javascript:;"
          :class="{ active: activeNavKey === 'questionHome' }"
          @click="handleNavClick('questionHome', '/questionHome')"
        >
          同行问答
        </a>
        <!-- 3. 农业知识库 -->
        <a
          href="javascript:;"
          :class="{ active: activeNavKey === 'knowledge' }"
          @click="handleNavClick('knowledge', '/knowledge')"
        >
          农业知识库
        </a>
      </nav>

      <router-link v-if="extraNavLink" class="manage-link" :to="extraNavLink.to">
        {{ extraNavLink.label }}
      </router-link>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.site-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 24px;
}
.brand {
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.brand-name {
  color: #2E7D32;
  font-weight: 700;
  font-size: 20px;
}
.brand-sub {
  color: #4a5568;
  font-size: 13px;
  font-weight: 500;
}
.auth-links {
  display: flex;
  align-items: center;
  gap: 12px;
}
.user-center-slot {
  display:flex;
  align-items:center;
  font-size: 14px;
  color: #4a5568;
}
.auth-links .link {
  color: #2E7D32;
  text-decoration: none;
  padding: 6px;
  font-size: 14px;
}
.auth-links .register {
  border-radius: 6px;
  padding: 6px 10px;
  background: #2E7D32;
  color: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  transition:
    background 0.2s,
    transform 0.08s;
}
.site-nav {
  padding: 12px 24px;
  border-bottom: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
}
.main-nav {
  display: flex;
  gap: 24px;
}
.main-nav a {
  color: #4a5568;
  text-decoration: none;
  font-size: 15px;
  font-weight: 500;
  padding: 4px 0;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  cursor: pointer; /* 确保鼠标悬浮显示手型 */
}

/* 仅用自定义active类高亮 */
.main-nav a.active {
  color: #2E7D32 !important;
  border-bottom-color: #2E7D32 !important;
  font-weight: 600 !important;
}

.manage-link {
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid #2E7D32;
  color: #2E7D32;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
}

.manage-link:hover {
  background: #2E7D32;
  color: #fff;
}

.auth-links .register:hover {
  background: #1B5E20;
}
.auth-links .register:active {
  transform: translateY(1px);
}

@media (max-width: 768px) {
  .brand-sub {
    display: none;
  }
  .main-nav {
    overflow: auto;
    padding: 6px 0;
    gap: 16px;
  }
}
</style>
