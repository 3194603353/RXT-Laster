<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import UserCenter from './UserCenter.vue'

type ExtraNavLink = {
  label: string
  to: RouteLocationRaw
}

const props = defineProps<{ extraNavLink?: ExtraNavLink }>()

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
    case 'expert': return '/expert-home'
    case 'bankuser': return '/bank-user-home'
    default: return '/home'
  }
})
onMounted(() => {
  updateAuth()
  window.addEventListener('storage', updateAuth)
})
onUnmounted(() => window.removeEventListener('storage', updateAuth))

const extraNavLink = computed(() => props.extraNavLink)
</script>

<template>
  <header class="site-header">
    <div class="site-top">
      <div class="brand">
        <span class="brand-name">融销通</span>
        <span class="brand-sub">农产品购销一体化平台</span>
      </div>

      <div class="auth-links" v-if="!isAuthed">
        <router-link to="/login" class="link">登录</router-link>
        <router-link to="/register" class="link register">注册</router-link>
      </div>
      <div v-else class="user-center-slot">
        <UserCenter />
      </div>
    </div>

    <div class="site-nav">
      <!-- 只有非管理员才显示主导航 -->
      <nav class="main-nav" v-if="role !== 'admin'">
        <router-link :to="homePath">首页</router-link>
        <router-link to="/products">商品货源</router-link>
        <router-link to="/requests">求购需求</router-link>
        <router-link
          to="/knowledge"
          :class="{
      'router-link-active':
        $route.path === '/knowledge' ||  // 农业知识列表页
        $route.path.startsWith('/knowledge/')
    }"
        >
          农业知识
        </router-link>
        <router-link
          to="/questionHome"
          :class="{
      'router-link-active':
        $route.path === '/questionHome' ||
        $route.path.startsWith('/guide/' )||
        $route.path.startsWith('/expert/')||
        $route.path.startsWith('/myAppointment')||
        $route.path.startsWith('/appointExpert')||
        $route.path.startsWith('/addQuestion')

    }"
        >专家指导</router-link>
        <router-link to="/cart">购物车</router-link>
        <router-link to="/orders">我的订单</router-link>
        <router-link to="/delivery-address">收货地址</router-link>
        <router-link to="/finance">融资申请</router-link>
        <router-link to="/finance-management">融资管理</router-link>
      </nav>
      <router-link v-if="extraNavLink" class="manage-link" :to="extraNavLink.to">
        {{ extraNavLink.label }}
      </router-link>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  background: white;
  border-bottom: 1px solid #eee;
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
  color: #36a24a;
  font-weight: 700;
  font-size: 20px;
}
.brand-sub {
  color: #666;
  font-size: 13px;
}
.auth-links {
  display: flex;
  align-items: center;
  gap: 12px;
}
.user-center-slot { display:flex; align-items:center; }
.auth-links .link {
  color: #36a24a;
  text-decoration: none;
  padding: 6px;
}
.auth-links .register {
  border-radius: 6px;
  padding: 6px 10px;
  background: #36a24a;
  color: #fff;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
  transition:
    background 0.2s,
    transform 0.08s;
}
.site-nav {
  padding: 12px 0; /* Adjusted padding */
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.main-nav {
  display: flex;
  gap: 18px;
  margin-left: 8px; /* small left offset so nav starts under brand area nicely */
}
.main-nav a {
  color: #333;
  text-decoration: none;
}

/* active route highlight */
.main-nav a.router-link-active {
  color: #36a24a;
  font-weight: 700;
}

.manage-link {
  margin-right: 24px;
  padding: 6px 14px;
  border-radius: 18px;
  border: 1px solid #36a24a;
  color: #36a24a;
  text-decoration: none;
  font-size: 14px;
  transition: background 0.15s, color 0.15s;
}

.manage-link:hover {
  background: #36a24a;
  color: #fff;
}

.auth-links .register:hover {
  background: #2f923f;
}
.auth-links .register:active {
  transform: translateY(1px);
}

/* small screens: collapse subtitle and allow nav scrolling */
@media (max-width: 640px) {
  .brand-sub {
    display: none;
  }
  .main-nav {
    overflow: auto;
    padding: 6px 0;
    gap: 12px;
  }
}
</style>
