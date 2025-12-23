<script setup lang="ts">
// 导入左侧导航组件（路径确保正确：components/BankHeader.vue）
import BankHeader from '../components/BankHeader.vue';
</script>

<template>
  <div class="app-container">
    <!-- 左侧导航：直接使用BankHeader组件 -->
    <BankHeader />
    <!-- 右侧内容区域：路由出口，渲染UserRandomDisplay等子组件 -->
    <router-view />
  </div>
</template>

<style scoped lang="scss">
// 父容器：flex布局，左侧固定，右侧自适应
.app-container {
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden; // 防止页面整体滚动
}

// 右侧路由出口样式：避开左侧导航，自适应宽度
router-view {
  flex: 1; // 占满剩余宽度
  margin-left: 220px; // 与左侧导航宽度一致（220px）
  padding: 24px;
  background-color: #f9fafb;
  overflow-y: auto; // 右侧内容超出时可滚动
  box-sizing: border-box;
}

// 小屏幕适配（左侧导航收缩为60px时，同步调整右侧边距）
@media (max-width: 768px) {
  router-view {
    margin-left: 60px;
    padding: 16px;
  }
}
</style>
