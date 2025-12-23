<script setup lang="ts">
import { ref, onMounted, watch , nextTick} from 'vue';
import { useRouter } from 'vue-router';
import SiteHeader from '../components/SiteHeader.vue';

import type { Appointment } from '@/utils/types.ts';
import { appointmentApi } from '@/utils/api.ts';
import { ElMessage } from 'element-plus';

const router = useRouter();

// 新增：返回上一页方法
const goBack = () => {
  // 优先返回上一页，若没有则跳转到专家指导页（兜底）
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/questionHome'); // 上级页面路由
  }
};

// 1. 基础数据（校验登录）
const userStr = localStorage.getItem('user');
const user = userStr ? JSON.parse(userStr) : null;
const userName = user?.userName;
const userNickName = user?.nickName || userName;

// 2. 筛选/分页参数
const statusOptions = ref([
  { label: '全部', value: '' },
  { label: '待确认', value: 'pending' },
  { label: '已确认', value: 'confirmed' },
  { label: '已取消', value: 'cancelled' },
  { label: '已完成', value: 'completed' },
  { label: '已拒绝', value: 'rejected' },
  { label: '已过期', value: 'expired' }
]);
const selectedStatus = ref('');
const pageNum = ref(1);
const pageSize = ref(10);
const total = ref(0); // 总记录数

// 3. 数据存储
const appointList = ref<Appointment[]>([]);
const appointLoading = ref(false);

// 4. 工具函数：格式化时间
const formatAppointTime  = (date: string | undefined,time: Date | string) => {
  if (!date || !time) return '无效时间';
  const fullTimeStr = `${date} ${time}`;
  try {
    return new Date(fullTimeStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }catch ( e){
    return '格式错误';
  }
};

// 5. 状态映射函数
const getStatusText = (status: string) => {
  const statusMap = {
    pending: '待专家确认',
    confirmed: '已确认',
    cancelled: '已取消',
    completed: '已完成',
    rejected: '专家已拒绝该预约',
    expired: '已过期'
  };
  return statusMap[status as keyof typeof statusMap] || '未知状态';
};

const getStatusClass = (status: string) => {
  const classMap = {
    pending: 'pending',
    confirmed: 'confirm',
    cancelled: 'cancel',
    completed: 'confirm',
    rejected: 'cancel',
    expired: 'cancel'
  };
  return classMap[status as keyof typeof classMap] || '';
};

// 6. 获取我的预约记录（支持状态筛选+分页）
const fetchMyAppointList = async () => {
  if (!userName) return;
  appointLoading.value = true;
  try {
    const res = await appointmentApi.getSelfAppointmentPage(
      userName,
      selectedStatus.value, // 确保传递最新的状态值
      pageNum.value,
      pageSize.value
    );
    appointList.value = res.data.records;
    total.value = res.data.total;
  } catch (error) {
    console.error('获取预约记录失败：', error);
    ElMessage.error('加载预约记录失败');
  } finally {
    appointLoading.value = false;
  }
};

// 7. 筛选/分页事件
const handleStatusChange = () => {
  pageNum.value = 1; // 切换状态重置页码
  // 确保nextTick已导入后，再调用
  nextTick(() => {
    fetchMyAppointList();
  });
};

const handlePageChange = (newPageNum: number) => {
  pageNum.value = newPageNum;
  fetchMyAppointList();
};

const handlePageSizeChange = (newPageSize: number) => { // 修正：接收新页大小参数
  pageSize.value = newPageSize;
  pageNum.value = 1; // 切换页大小重置页码
  fetchMyAppointList();
};

// 8. 新增：监听 selectedStatus 变化（兜底保障）
watch(selectedStatus, (newVal) => {
  selectedStatus.value = newVal;
  handleStatusChange();
}, { immediate: false });

// 9. 取消预约
const cancelAppointment = async (appointId: number) => {
  try {
    await appointmentApi.updateAppointmentStatus(appointId, 'cancelled');
    ElMessage.success('预约已取消');
    await fetchMyAppointList(); // 刷新列表
  } catch (error) {
    console.error('取消预约失败：', error);
    ElMessage.error('取消预约失败，请重试');
  }
};

// 10. 跳转到线下预约页面（优化：用sessionStorage传递标识，地址栏无参数）
const toAppointPage = () => {
  // 存储标识，用于questionHome页面自动切换标签
  sessionStorage.setItem('scrollToExpert', '1');
  // 用replace跳转，地址栏无参数
  router.replace('/questionHome');
};

// 11. 页面初始化
onMounted(() => {
  // 未登录跳转登录页
  if (!userName) {
    ElMessage.warning('请先登录');
    router.push('/login');
    return;
  }
  fetchMyAppointList(); // 初始化加载预约记录
});
</script>

<template>
  <div>
    <SiteHeader />
    <div class="my-appoint-page">
      <!-- 页面标题（新增返回按钮） -->
      <div class="page-header">
        <div class="header-left">
          <button class="back-btn" @click="goBack">
            ← 返回
          </button>
        </div>
        <h1 class="page-title">我的预约记录</h1>
        <p class="page-desc">查看和管理您的所有专家线下预约记录</p>
      </div>

      <!-- 筛选+新增按钮区域 -->
      <div class="filter-bar">
        <div class="status-filter">
          <label>状态筛选：</label>
          <!-- 关键修改1：移除@change，靠watch监听值变化；添加key确保重新渲染 -->
          <select
            v-model="selectedStatus"
            class="status-select"
            key="status-select"
          >
            <option v-for="item in statusOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </div>
        <button class="add-appoint-btn" @click="toAppointPage">
          新增线下预约
        </button>
      </div>

      <!-- 预约记录列表 -->
      <div class="appoint-record-card" v-loading="appointLoading">
        <!-- 空状态 -->
        <div class="empty-tip" v-if="appointList.length === 0 && !appointLoading">
          暂无线下预约记录，快去预约专家吧~
        </div>

        <!-- 记录列表 -->
        <div class="record-list" v-else>
          <div class="record-item" v-for="item in appointList" :key="item.appointId">
            <div class="record-header">
              <h3 class="record-expert">预约专家：{{ item.expertName }}</h3>
              <span class="record-status" :class="getStatusClass(item.status)">
                {{ getStatusText(item.status) }}
              </span>
            </div>

            <div class="record-content">
              <div class="record-row">
                <span class="label">预约时间：</span>
                <span class="value">{{formatAppointTime(item.appointDate, item.appointTime)}}</span>
              </div>
              <div class="record-row">
                <span class="label">预约地点：</span>
                <span class="value">{{ item.appointPlace }}</span>
              </div>
              <div class="record-row">
                <span class="label">预约事由：</span>
                <span class="value">{{ item.appointReason }}</span>
              </div>
              <div class="record-row">
                <span class="label">联系电话：</span>
                <span class="value">{{ item.contactPhone }}</span>
              </div>
              <div class="record-row">
                <span class="label">提交时间：</span>
                <span class="value">{{ formatAppointTime(item.createTime) }}</span>
              </div>
            </div>

            <!-- 仅待确认状态可取消 -->
            <div class="record-actions" v-if="item.status === 'pending'">
              <button class="cancel-btn" @click="cancelAppointment(item.appointId)">
                取消预约
              </button>
            </div>
          </div>
        </div>

        <!-- 分页组件 -->
        <div class="pagination-wrapper" v-if="total > 0">
          <el-pagination
            v-model:current-page="pageNum"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50]"
            :total="total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handlePageSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 页面整体样式 */
.my-appoint-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-size: 14px;
  color: #333;
}

/* 页面标题（新增返回按钮样式） */
.page-header {
  text-align: center;
  margin-bottom: 30px;
  position: relative; /* 为返回按钮定位 */
}

.header-left {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
}

.back-btn {
  padding: 6px 12px;
  background: #f5f5f5;
  color: #2E7D32;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.back-btn:hover {
  background: #e8f5e9;
  border-color: #2E7D32;
}

.page-title {
  font-size: 24px;
  color: #2E7D32;
  margin-bottom: 8px;
}

.page-desc {
  color: #999;
  font-size: 16px;
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px 20px;
  background: #f9f9f9;
  border-radius: 8px;
}

.status-filter {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-select {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  outline: none;
  color: #666;
}

.status-select:focus {
  border-color: #2E7D32;
}

.add-appoint-btn {
  padding: 8px 20px;
  background: #2E7D32;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
}

.add-appoint-btn:hover {
  background: #1B5E20;
}

/* 记录卡片 */
.appoint-record-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  padding: 25px;
}

/* 记录列表 */
.record-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
}

.record-item {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 20px;
  transition: box-shadow 0.3s;
}

.record-item:hover {
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.record-expert {
  font-size: 16px;
  color: #333;
  font-weight: 500;
}

.record-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.record-status.pending {
  background: #fff8e1;
  color: #ff9800;
}

.record-status.confirm {
  background: #e8f5e9;
  color: #2E7D32;
}

.record-status.cancel {
  background: #ffebee;
  color: #f44336;
}

.record-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: #666;
}

.record-row {
  display: flex;
  gap: 10px;
}

.record-row .label {
  width: 80px;
  color: #999;
}

.record-actions {
  margin-top: 15px;
  text-align: right;
}

.cancel-btn {
  padding: 6px 12px;
  background: #ffebee;
  color: #f44336;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.3s;
}

.cancel-btn:hover {
  background: #ffcdd2;
}

/* 空状态 */
.empty-tip {
  text-align: center;
  color: #999;
  padding: 50px 0;
  font-size: 16px;
}

/* 分页 */
.pagination-wrapper {
  text-align: right;
}

:deep(.el-pagination) {
  --el-pagination-text-color: #666;
  --el-pagination-button-hover-color: #2E7D32;
  --el-pagination-button-active-color: #2E7D32;
}
</style>
