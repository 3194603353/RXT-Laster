<script setup lang="ts">
import SiteHeader from '../components/BankHeader.vue'
</script>

<template>
  <div class="app-container">
    <SiteHeader />
    <router-view />
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
}
router-view {
  flex: 1;
  padding: 20px;
}
</style>
