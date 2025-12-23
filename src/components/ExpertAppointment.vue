<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import type { Appointment } from '@/utils/types.ts';
import { appointmentApi } from '@/utils/api.ts';
import { ElMessage, ElSelect, ElOption } from 'element-plus';
import { useRouter } from 'vue-router';

const router = useRouter();

// 接收专家名称
const props = defineProps<{
  expertName: string;
}>();

// 向父组件传递预约统计更新
const emit = defineEmits<{
  (e: 'update-appointment-stats', stats: {
    pendingAppointment: number;
    confirmedAppointment: number;
    completedAppointment: number;
    rejectedAppointment: number;
    expiredAppointment: number;
    cancelledAppointment: number;
  }): void;
}>();

// 1. 合法状态枚举（和后端保持一致）
const VALID_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed', 'rejected', 'expired'] as const;
type AppointmentStatus = (typeof VALID_STATUSES)[number];

// 2. 预约管理变量（增加参数校验）
const appointmentSearchKey = ref(''); // 对应后端的searchKeys
const selectedStatus = ref<AppointmentStatus | ''>(''); // 空字符串=全部状态
// 分页参数（默认值和后端对齐）
const appointmentPageNum = ref(1);
const appointmentPageSize = ref(10); // 后端默认10，最大100

const appointmentList = ref<Appointment[]>([]);
const appointmentTotal = ref(0);
const appointmentLoading = ref(false);

// 计算总页数（适配后端返回的total）
const appointmentTotalPages = computed(() => {
  return Math.ceil(appointmentTotal.value / appointmentPageSize.value);
});

// 状态选项（和后端合法状态匹配）
const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '待确认', value: 'pending' },
  { label: '已确认', value: 'confirmed' },
  { label: '已取消', value: 'cancelled' },
  { label: '已完成', value: 'completed' },
  { label: '已拒绝', value: 'rejected' },
  { label: '已过期', value: 'expired' }
];

// 跳转预约详情页面（同时传递appointId和expertName）
const goToDetail = (appointId: number) => {
  router.push({
    path: '/E_appointment',
    query: {
      id: appointId,
      expertName: props.expertName  // 传递专家名称
    }
  });
};

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
    console.warn('时间格式化失败：', e);
    return '格式错误';
  }
};

const fetchExpertAppointments = async () => {
  // 1. 参数校验（和后端逻辑对齐）
  const pageNum = Math.max(1, appointmentPageNum.value); // 页码≥1
  const pageSize = Math.min(Math.max(1, appointmentPageSize.value), 100); // 1≤页大小≤100
  const searchKeys = appointmentSearchKey.value.trim(); // 去空格
  // 2. 状态值校验（仅传递合法状态或空字符串）
  let status = selectedStatus.value;
  if (status && !VALID_STATUSES.includes(status as AppointmentStatus)) {
    status = ''; // 非法状态重置为全部
    selectedStatus.value = '';
    ElMessage.warning('选择的状态不合法，已重置为全部状态');
  }

  appointmentLoading.value = true;
  try {
    // 3. 调用后端接口（参数名和后端严格匹配）
    const res = await appointmentApi.getExpertAppointmentPage({
      expertUsername: props.expertName.trim(), // 对应后端的 expertUsername
      searchKeys: searchKeys,
      status: status,
      pageNum: pageNum,
      pageSize: pageSize
    });

    // 4. 处理响应数据
    if (res.code === 200 && res.data) {
      appointmentList.value = res.data.records || [];
      appointmentTotal.value = res.data.total || 0;
      calculateAppointmentStats(); // 同步统计
    } else {
      appointmentList.value = [];
      appointmentTotal.value = 0;
      ElMessage.error('获取预约列表失败：' + (res.msg || '接口返回异常'));
    }
  } catch (error) {
    console.error('加载预约列表失败：', error);
    appointmentList.value = [];
    appointmentTotal.value = 0;
    ElMessage.error('加载预约列表失败，请重试');
  } finally {
    appointmentLoading.value = false;
  }
};

const calculateAppointmentStats = () => {
  // 统计所有状态的数量
  const stats = {
    total: appointmentList.value.length, // 总预约数
    pending: appointmentList.value.filter(a => a.status === 'pending').length,
    confirmed: appointmentList.value.filter(a => a.status === 'confirmed').length,
    cancelled: appointmentList.value.filter(a => a.status === 'cancelled').length,
    completed: appointmentList.value.filter(a => a.status === 'completed').length,
    rejected: appointmentList.value.filter(a => a.status === 'rejected').length,
    expired: appointmentList.value.filter(a => a.status === 'expired').length
  };

  // 传递给父组件（用于工作台统计展示）
  emit('update-appointment-stats', {
    pendingAppointment: stats.pending,
    confirmedAppointment: stats.confirmed,
    cancelledAppointment: stats.cancelled,
    completedAppointment: stats.completed,
    rejectedAppointment: stats.rejected,
    expiredAppointment: stats.expired
  });

  return stats; // 返回统计结果，用于当前页面展示
};

// 新增：存储当前页面的统计数据
const appointmentStats = ref<ReturnType<typeof calculateAppointmentStats>>({
  total: 0, pending: 0, confirmed: 0, cancelled: 0, completed: 0, rejected: 0, expired: 0
});

// ========== 分页逻辑（适配后端校验） ==========
const prevAppointmentPage = () => {
  if (appointmentPageNum.value > 1) {
    appointmentPageNum.value--;
    fetchExpertAppointments();
  }
};

const nextAppointmentPage = () => {
  if (appointmentPageNum.value < appointmentTotalPages.value) {
    appointmentPageNum.value++;
    fetchExpertAppointments();
  }
};

// ========== 搜索/筛选逻辑 ==========
const searchAppointment = () => {
  appointmentPageNum.value = 1; // 搜索后重置页码到第1页
  fetchExpertAppointments();
};

// 监听搜索关键词（回车触发搜索）
watch(appointmentSearchKey, (newVal) => {
  if (newVal === '') {
    searchAppointment();
  }
});

// 监听状态筛选（自动刷新）
watch(selectedStatus, () => {
  appointmentPageNum.value = 1;
  fetchExpertAppointments();
});

onMounted(() => {
  // 初始化时校验专家名称
  if (!props.expertName?.trim()) {
    ElMessage.error('专家名称不能为空，无法加载预约列表');
    return;
  }
  fetchExpertAppointments();
});
</script>

<template>
  <div class="section">
    <h2 class="section-title">我的线下预约管理</h2>

    <!-- 搜索&筛选区域（优化输入提示） -->
    <div class="search-box">
      <input
        v-model="appointmentSearchKey"
        placeholder="搜索：预约人/事由/地点"
        class="search-input"
        @keyup.enter="searchAppointment"
      />
      <ElSelect
        v-model="selectedStatus"
        placeholder="选择预约状态"
        class="status-select"
        clearable
      >
        <ElOption
          v-for="item in statusOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </ElSelect>
      <button @click="searchAppointment" class="search-btn">搜索</button>
    </div>

    <!-- 预约列表 -->
    <div class="appointment-list" v-loading="appointmentLoading">
      <div
        class="appointment-item"
        v-for="item in appointmentList"
        :key="item.appointId"
        @click="goToDetail(item.appointId)" style="cursor: pointer"
      >
        <div class="appointment-header">
          <h3 class="appointment-title">预约人：{{ item.userName || '未知' }}</h3>
          <span :class="`appointment-status ${item.status}`">
            {{
              item.status === 'pending' ? '待确认' :
                item.status === 'confirmed' ? '已确认' :
                  item.status === 'cancelled' ? '已取消' :
                    item.status === 'completed' ? '已完成' :
                      item.status === 'rejected' ? '已拒绝' :
                        item.status === 'expired' ? '已过期' : '未知状态'
            }}
          </span>
        </div>
        <div class="appointment-row">
          <span class="label">预约时间：</span>
          <span class="value">{{ formatTime(item.appointDateTime) }}</span>
        </div>
        <div class="appointment-row">
          <span class="label">预约事由：</span>
          <span class="value">{{ item.appointReason || '未填写' }}</span>
        </div>
        <div class="appointment-row">
          <span class="label">提交时间：</span>
          <span class="value">{{ formatTime(item.createTime) }}</span>

        </div>

      </div>
    </div>

    <!-- 空数据提示 -->
    <div class="empty-tip" v-if="appointmentList.length === 0 && !appointmentLoading">
      暂无线下预约记录~
    </div>

    <!-- 分页控件 -->
    <div class="pagination" v-if="appointmentTotal > 0 && !appointmentLoading">
      <button @click="prevAppointmentPage" :disabled="appointmentPageNum <= 1">上一页</button>
      <span>{{ appointmentPageNum }} / {{ appointmentTotalPages }}</span>
      <button @click="nextAppointmentPage" :disabled="appointmentPageNum >= appointmentTotalPages">下一页</button>
    </div>
  </div>
</template>

<style scoped>
/* 基础样式 */
.section {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.section-title {
  color: #333;
  font-size: 18px;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
  font-weight: 600;
}

/* 搜索&筛选区域 */
.search-box {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  align-items: center;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 200px;
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: #2E7D32;
}

.status-select {
  width: 120px;
  flex-shrink: 0;
}

.search-btn {
  padding: 12px 20px;
  background: #2E7D32;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s;
  white-space: nowrap;
}

.search-btn:hover {
  background: #1B5E20;
}

/* 预约列表 */
.appointment-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 30px;
}

.appointment-item {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 20px;
  transition: all 0.3s;
  background-color: #fff;
}

.appointment-item:hover {
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
  border-color: #e0e0e0;
}

.appointment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.appointment-title {
  color: #333;
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

/* 状态样式 */
.appointment-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.appointment-status.pending {
  background: #fff8e1;
  color: #ff9800;
}

.appointment-status.confirmed {
  background: #e8f5e9;
  color: #2E7D32;
}

.appointment-status.cancelled {
  background: #ffebee;
  color: #f44336;
}

.appointment-status.completed {
  background: #e1f5fe;
  color: #0288d1;
}

.appointment-status.rejected {
  background: #fce4ec;
  color: #c2185b;
}

.appointment-status.expired {
  background: #f5f5f5;
  color: #757575;
}

/* 预约内容 */
.appointment-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: #666;
  margin-bottom: 15px;
}

.appointment-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.appointment-row .label {
  width: 80px;
  color: #999;
  flex-shrink: 0;
}

.reply-content {
  color: #2E7D32;
  font-weight: 500;
}

/* 操作按钮 */
.appointment-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.reply-btn {
  padding: 6px 12px;
  background: #2196F3;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
  font-size: 14px;
}

.reply-btn:hover {
  background: #1976D2;
}

.reject-btn {
  padding: 6px 12px;
  background: #c2185b;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
  font-size: 14px;
}

.reject-btn:hover {
  background: #ad1457;
}

.cancel-btn {
  padding: 6px 12px;
  background: #f44336;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
  font-size: 14px;
}

.cancel-btn:hover {
  background: #d32f2f;
}

.complete-btn {
  padding: 6px 12px;
  background: #00acc1;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
  font-size: 14px;
}

.complete-btn:hover {
  background: #00838f;
}

/* 空数据提示 */
.empty-tip {
  text-align: center;
  color: #999;
  padding: 50px 0;
  font-size: 16px;
  background-color: #fff;
  border-radius: 8px;
  margin-bottom: 20px;
}

/* 分页控件 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 10px;
}

.pagination button {
  padding: 8px 16px;
  border: 1px solid #2E7D32;
  background: #fff;
  color: #2E7D32;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination button:hover:not(:disabled) {
  background: #2E7D32;
  color: #fff;
}

.pagination span {
  color: #666;
  font-size: 14px;
}

/* 弹窗样式 */
.form-item {
  margin-bottom: 20px;
}

.form-item label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-size: 14px;
  font-weight: 500;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .search-box {
    flex-direction: column;
    align-items: stretch;
  }

  .status-select {
    width: 100%;
  }

  .appointment-actions {
    justify-content: flex-start;
  }

  .appointment-row .label {
    width: 100%;
    margin-bottom: 5px;
  }
}
</style>
