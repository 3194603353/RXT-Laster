<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Appointment } from '@/utils/types.ts';
import { appointmentApi } from '@/utils/api.ts';
import { ElMessage, ElDialog } from 'element-plus';
import expertHeader from '../components/expertHeader.vue';

// 路由相关
const route = useRoute();
const router = useRouter();

// 获取从列表页传递的参数
const appointId = Number(route.query.id); // 从URL获取预约ID
const expertName = route.query.expertName as string; // 接收专家名称

// 预约详情数据
const appointment = ref<Partial<Appointment>>({});
const loading = ref(true);
const isLoading = ref(false);

// 响应相关弹窗
const isReplyDialogVisible = ref(false);
const replyContent = ref('');
const isRejectDialogVisible = ref(false);
const rejectReason = ref('');

// 时间格式化
const formatTime = (time: Date | string | undefined) => {
  if (!time) return '未填写';
  try {
    return new Date(time).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return '格式错误';
  }
};

// 获取预约详情
const fetchAppointmentDetail = async () => {
  if (!appointId) {
    ElMessage.error('预约ID不存在');
    router.back();
    return;
  }

  loading.value = true;
  try {
    const res = await appointmentApi.getAppointmentDetail(appointId);
    if (res.code === 200 && res.data) {
      appointment.value = res.data;
      replyContent.value = res.data.replyContent || '';
    } else {
      ElMessage.error('获取预约详情失败：' + (res.msg || '未知错误'));
      router.back();
    }
  } catch (error) {
    console.error('加载预约详情失败：', error);
    ElMessage.error('加载预约详情失败，请重试');
  } finally {
    loading.value = false;
  }
};

// 更新预约状态（确认/拒绝/完成等）
const updateStatus = async (status: string, content?: string) => {
  if (!appointId) return;
  isLoading.value = true;
  try {
    // 先更新状态
    await appointmentApi.updateAppointmentStatus(appointId, status);
    // 如有响应内容，同步更新
    if (content) {
      await appointmentApi.replyAppointment(appointId, {
        replyContent: content.trim(),
        expertName: appointment.value.expertName || ''
      });
    }
    ElMessage.success('操作成功');
    // 刷新详情
    await fetchAppointmentDetail();
    // 关闭弹窗
    isReplyDialogVisible.value = false;
    isRejectDialogVisible.value = false;
  } catch (error) {
    console.error('更新预约状态失败：', error);
    ElMessage.error('操作失败，请重试');
  } finally {
    isLoading.value = false;
  }
};

// 页面初始化
onMounted(() => {
  fetchAppointmentDetail();
});
</script>

<template>
  <div>
    <expertHeader />
  <div class="appointment-detail-page">
    <div class="page-header">
      <h1>预约详情</h1>
      <button class="back-btn" @click="router.back()">返回列表</button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">加载中...</div>

    <!-- 详情内容 -->
    <div v-else class="detail-container">
      <!-- 状态标签 -->
      <div class="status-tag" :class="appointment.status">
        {{
          appointment.status === 'pending' ? '待确认' :
            appointment.status === 'confirmed' ? '已确认' :
              appointment.status === 'cancelled' ? '已取消' :
                appointment.status === 'completed' ? '已完成' :
                  appointment.status === 'rejected' ? '已拒绝' :
                    appointment.status === 'expired' ? '已过期' : '未知状态'
        }}
      </div>

      <!-- 基础信息 -->
      <div class="info-section">
        <h2 class="section-title">基础信息</h2>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">预约编号：</span>
            <span class="value">{{ appointment.appointId || 'N/A' }}</span>
          </div>
          <div class="info-item">
            <span class="label">预约人：</span>
            <span class="value">{{ appointment.userName || '未知' }}</span>
          </div>
          <div class="info-item">
            <span class="label">联系电话：</span>
            <span class="value">{{ appointment.contactPhone || '未填写' }}</span>
          </div>
          <div class="info-item">
            <span class="label">提交时间：</span>
            <span class="value">{{ formatTime(appointment.createTime) }}</span>
          </div>
        </div>
      </div>

      <!-- 预约信息 -->
      <div class="info-section">
        <h2 class="section-title">预约详情</h2>
        <div class="info-item full-width">
          <span class="label">预约时间：</span>
          <span class="value">{{ formatTime(appointment.appointDateTime) }}</span>
        </div>
        <div class="info-item full-width">
          <span class="label">预约地点：</span>
          <span class="value">{{ appointment.appointPlace || '未填写' }}</span>
        </div>
        <div class="info-item full-width">
          <span class="label">预约事由：</span>
          <span class="value">{{ appointment.appointReason || '未填写' }}</span>
        </div>
      </div>

      <!-- 专家响应 -->
      <div class="info-section" v-if="appointment.replyContent">
        <h2 class="section-title">我的响应</h2>
        <div class="reply-content">
          {{ appointment.replyContent }}
        </div>
      </div>

      <!-- 操作按钮区 -->
      <div class="action-buttons">
        <template v-if="appointment.status === 'pending'">
          <button class="primary-btn" @click="isReplyDialogVisible = true">确认预约</button>
          <button class="danger-btn" @click="isRejectDialogVisible = true">拒绝预约</button>
          <button class="cancel-btn" @click="updateStatus('cancelled')">取消预约</button>
        </template>
        <template v-if="appointment.status === 'confirmed'">
          <button class="success-btn" @click="updateStatus('completed')">标记为已完成</button>
          <button class="cancel-btn" @click="updateStatus('cancelled')">取消预约</button>
        </template>
      </div>
    </div>

    <!-- 确认预约弹窗 -->
    <ElDialog
      v-model="isReplyDialogVisible"
      title="确认预约并响应"
      width="600px"
    >
      <ElTextarea
        v-model="replyContent"
        placeholder="请输入响应内容（如确认时间、地点细节或其他说明）"
        rows="6"
        resize="vertical"
      />
      <template #footer>
        <button class="dialog-btn cancel" @click="isReplyDialogVisible = false">取消</button>
        <button
          class="dialog-btn confirm"
          @click="updateStatus('confirmed', replyContent)"
          :disabled="!replyContent.trim() || isLoading"
        >
          {{ isLoading ? '处理中...' : '确认提交' }}
        </button>
      </template>
    </ElDialog>

    <!-- 拒绝预约弹窗 -->
    <ElDialog
      v-model="isRejectDialogVisible"
      title="拒绝预约"
      width="500px"
    >
      <ElTextarea
        v-model="rejectReason"
        placeholder="请输入拒绝理由（将通知预约人）"
        rows="4"
        resize="vertical"
      />
      <template #footer>
        <button class="dialog-btn cancel" @click="isRejectDialogVisible = false">取消</button>
        <button
          class="dialog-btn confirm"
          @click="updateStatus('rejected', rejectReason)"
          :disabled="!rejectReason.trim() || isLoading"
        >
          {{ isLoading ? '处理中...' : '确认拒绝' }}
        </button>
      </template>
    </ElDialog>
  </div>
  </div>

</template>

<style scoped>
.appointment-detail-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.back-btn {
  padding: 8px 16px;
  background: #f5f5f5;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
}

.back-btn:hover {
  background: #e0e0e0;
}

.loading-state {
  text-align: center;
  padding: 50px 0;
  color: #666;
}

.detail-container {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  padding: 20px;
}

.status-tag {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 14px;
  margin-bottom: 20px;
  color: #fff;
}

.status-tag.pending {
  background: #ff9800;
}

.status-tag.confirmed {
  background: #2E7D32;
}

.status-tag.cancelled {
  background: #f44336;
}

.status-tag.completed {
  background: #0288d1;
}

.status-tag.rejected {
  background: #c2185b;
}

.status-tag.expired {
  background: #757575;
}

.info-section {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px dashed #eee;
}

.info-section:last-child {
  border-bottom: none;
}

.section-title {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 18px;
  color: #333;
  font-weight: 600;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.info-item {
  display: flex;
  margin-bottom: 15px;
}

.info-item.full-width {
  grid-column: 1 / -1;
}

.label {
  width: 100px;
  color: #999;
  flex-shrink: 0;
}

.value {
  flex: 1;
  color: #333;
  word-break: break-word;
}

.reply-content {
  padding: 15px;
  background: #f9f9f9;
  border-radius: 4px;
  color: #333;
  line-height: 1.6;
}

.action-buttons {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.primary-btn {
  padding: 8px 16px;
  background: #2196F3;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
}

.primary-btn:hover {
  background: #1976D2;
}

.success-btn {
  padding: 8px 16px;
  background: #00acc1;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
}

.success-btn:hover {
  background: #00838f;
}

.danger-btn {
  padding: 8px 16px;
  background: #c2185b;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
}

.danger-btn:hover {
  background: #ad1457;
}

.cancel-btn {
  padding: 8px 16px;
  background: #f44336;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
}

.cancel-btn:hover {
  background: #d32f2f;
}

.dialog-btn {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
  border: none;
}

.dialog-btn.cancel {
  background: #f5f5f5;
  color: #333;
}

.dialog-btn.confirm {
  background: #2E7D32;
  color: #fff;
}

.dialog-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }

  .info-item.full-width {
    grid-column: 1;
  }

  .action-buttons {
    flex-direction: column;
  }

  .action-buttons button {
    width: 100%;
  }
}
</style>
