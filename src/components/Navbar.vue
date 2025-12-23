<template>
  <nav class="nav-bar">
    <router-link to="/" class="nav-item">首页</router-link>
    <router-link to="/commodity-supply" class="nav-item">商品货源</router-link>
    <router-link to="/purchase-demand" class="nav-item">求购需求</router-link>
    <router-link to="/agricultural-knowledge" class="nav-item">农业知识</router-link>
    <router-link to="/expert-guidance" class="nav-item">专家指导</router-link>
    <router-link to="/shopping-cart" class="nav-item">购物车</router-link>
    <router-link to="/financing-application" class="nav-item">融资申请</router-link>
    <!-- 登录/注册入口（根据当前路由动态显示） -->
    <template v-if="$route.path !== '/login' && $route.path !== '/register'">
      <router-link to="/login" class="nav-item login-register-link">登录</router-link>
      <router-link to="/register" class="nav-item login-register-link">注册</router-link>
    </template>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { RouterLink } from 'vue-router'

const $route = useRoute()
</script>

<style scoped>
.nav-bar {
  display: flex;
  gap: 20px;
  padding: 15px 0;
  border-bottom: 1px solid #eee;
}
.nav-item {
  text-decoration: none;
  color: #333;
  font-size: 16px;
  padding: 5px 10px;
}
.nav-item:hover {
  color: #2d5f28;
  font-weight: 500;
}
.login-register-link {
  margin-left: auto;
}
</style>
