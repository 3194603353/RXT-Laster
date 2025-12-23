<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import expertHeader from '../components/expertHeader.vue';
import ExpertDashboard from '../components/ExpertDashboard.vue';
import ExpertQuestion from '../components/ExpertQuestion.vue';
import ExpertAppointment from '../components/ExpertAppointment.vue';
import ExpertKnowledge from '../components/ExpertKnowledge.vue';
import { ElMessage } from 'element-plus';

const router = useRouter();

// 全局用户信息（传递给子组件）
const userStr = localStorage.getItem('user');
const user = userStr ? JSON.parse(userStr) : null;
const expertName = user?.userName;

// 全局统计数据（子组件通过emit更新）
const stats = ref({
  answered: 0,
  unanswered: 0,
  totalKnowledge: 0,
  pendingAppointment: 0,
  confirmedAppointment: 0,
  completedAppointment: 0
});

// 页面初始化校验
onMounted(() => {
  if (!expertName) {
    ElMessage.warning('请先登录');
    router.push('/login');
  }
});

// 接收子组件的统计更新
const updateStats = (type: string, value: number) => {
  stats.value = { ...stats.value, [type]: value };
};

// 接收预约统计批量更新
const updateAppointmentStats = (appointmentStats: {
  pendingAppointment: number;
  confirmedAppointment: number;
  completedAppointment: number;
}) => {
  stats.value = { ...stats.value, ...appointmentStats };
};
</script>

<template>
  <div>
    <expertHeader />
    <div class="manage-page">
      <h1 class="page-title">专家工作台</h1>

      <!-- 仪表盘组件 -->
      <ExpertDashboard :stats="stats" />



      <!-- 被提问管理子组件 -->
      <ExpertQuestion
        v-if="expertName"
        :expert-name="expertName"
        @update-stats="updateStats"
      />

      <!-- 线下预约管理子组件 -->
      <ExpertAppointment
        v-if="expertName"
        :expert-name="expertName"
        @update-appointment-stats="updateAppointmentStats"
      />

      <!-- 农业知识管理子组件 -->
      <ExpertKnowledge
        v-if="expertName"
        :expert-name="expertName"
        @update-stats="updateStats"
      />
    </div>
  </div>
</template>

<style scoped>
.manage-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  background-color: #f5f5f5;
  min-height: calc(100vh - 80px);
}

.page-title {
  color: #333;
  font-size: 24px;
  margin-bottom: 30px;
  border-bottom: 1px solid #eee;
  padding-bottom: 15px;
  font-weight: 600;
}

.action-bar {
  margin-bottom: 20px;
  text-align: right;
}

.publish-btn {
  padding: 10px 20px;
  background: #2E7D32;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
  font-size: 14px;
}

.publish-btn:hover {
  background: #1B5E20;
}
</style>
