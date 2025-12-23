<script setup lang="ts">
import { computed } from 'vue';
import { ElProgress } from 'element-plus';

// 接收主页面传递的统计数据
const props = defineProps<{
  stats: {
    answered: number;
    unanswered: number;
    totalKnowledge: number;
    pendingAppointment: number;
    confirmedAppointment: number;
    completedAppointment: number;
    cancelledAppointment: number;  // 已取消
    rejectedAppointment: number;   // 已拒绝
    expiredAppointment: number;    // 已过期
  };
}>();

// 计算环形进度条占比
const questionTotal = computed(() => props.stats.answered + props.stats.unanswered);
const questionAnsweredRate = computed(() => questionTotal.value > 0 ? (props.stats.answered / questionTotal.value) * 100 : 0);
// 预约统计：简化为「未处理（仅待确认）+ 已处理（所有其他状态）」
const unhandledAppointment = computed(() => props.stats.pendingAppointment); // 未处理=待确认
const handledAppointment = computed(() => {
  return props.stats.confirmedAppointment +
    props.stats.completedAppointment +
    props.stats.cancelledAppointment +
    props.stats.rejectedAppointment +
    props.stats.expiredAppointment;
});
const appointmentTotal = computed(() => unhandledAppointment.value + handledAppointment.value);
// 未处理占比（用于进度条展示）
const unhandledRate = computed(() => appointmentTotal.value > 0 ? (unhandledAppointment.value / appointmentTotal.value) * 100 : 0);
</script>

<template>
  <div class="dashboard">
    <!-- 问题统计 -->
    <div class="stat-card">
      <div class="stat-title">问题统计</div>
      <ElProgress
        type="circle"
        :percentage="questionAnsweredRate"
        :format="() => `${stats.answered}/${questionTotal}`"
        :color="[{ color: '#4CAF50', percentage: 100 }]"
        width="120"
      />
      <div class="stat-desc">
        <span style="color: #4CAF50">已回答：{{ stats.answered }}</span>
        <span style="color: #FF9800"> 未回答：{{ stats.unanswered }}</span>
      </div>
    </div>

    <!-- 知识统计 -->
    <div class="stat-card">
      <div class="stat-title">已发布知识</div>
      <ElProgress
        type="circle"
        :percentage="100"
        :format="(percent) => `${stats.totalKnowledge}`"
        color="#2E7D32"
        width="120"
      />
      <div class="stat-desc">{{ stats.totalKnowledge }} 条农业知识分享</div>
    </div>

    <!-- 预约统计：极简版，只展示“未处理预约数” -->
    <div class="stat-card appointment-card">
      <div class="stat-title">预约统计</div>
      <ElProgress
        type="circle"
        :percentage="unhandledRate"
        :format="() => `${unhandledAppointment}`"
      :color="[
      { color: '#FF9800', percentage: unhandledRate }, // 未处理-橙色
      { color: '#E0E0E0', percentage: 100 } // 已处理-浅灰
      ]"
      width="120"
      />
      <!-- 只展示核心信息：未处理数量 + 友好提示 -->
      <div class="stat-desc unhandled-desc">
        <span style="color: #FF9800; font-weight: 600;">
          {{ unhandledAppointment }} 条预约待处理
        </span>
        <span v-if="unhandledAppointment > 0" style="font-size: 12px;">
          请及时确认/处理哦～
        </span>
        <span v-else style="font-size: 12px;">
          暂无待处理预约 ✨
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  gap: 30px;
  margin-bottom: 30px;
  flex-wrap: wrap;
  justify-content: center;
}

.stat-card {
  flex: 0 0 200px;
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  text-align: center;
  transition: box-shadow 0.3s;
  border-left: 4px solid #2E7D32;
}

.stat-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-title {
  color: #666;
  font-size: 16px;
  margin-bottom: 15px;
  font-weight: 500;
}

.stat-desc {
  color: #999;
  font-size: 14px;
  margin-top: 15px;
  line-height: 1.8;
}

/* 预约统计卡片专属样式 */
.appointment-card {
  border-left-color: #FF9800; /* 橙色边框，突出待处理 */
}

/* 未处理预约提示样式 */
.unhandled-desc {
  line-height: 1.5;
}

/* 响应式优化 */
@media (max-width: 768px) {
  .dashboard {
    flex-direction: column;
  }
  .stat-card {
    min-width: 100%;
  }
}
</style>
