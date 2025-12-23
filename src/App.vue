<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="route-root">
    <!-- 使用 slot + KeepAlive 缓存路由组件，返回时保留状态/滚动位置 -->
    <!-- 只缓存首页等列表页，详情页不缓存 -->
    <RouterView v-slot="{ Component, route }">
      <component :is="Component" :key="route.fullPath" />
    </RouterView>
  </div>
</template>

<style>
/* App-level minimal styles; routes (login/register) provide their own layout */
</style>

<style>
/* Ensure routed pages can span the full app width when root uses grid */

.route-root { width:100%; }
</style>
