<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import SiteHeader from '../components/SiteHeader.vue';

import type { Expert } from '@/utils/types.ts';
import { expertApi, appointmentApi } from '@/utils/api.ts';
import { ElMessage, ElDatePicker, ElTimePicker } from 'element-plus';

const router = useRouter();
const route = useRoute();

// 1. 基础数据（校验登录）
const userStr = localStorage.getItem('user');
const user = userStr ? JSON.parse(userStr) : null;
const userName = user?.userName;
const userNickName = user?.nickName || userName;
const userPhone = user?.phone || ''; // 从user获取手机号

// 路由参数：专家用户名
const expertUsername = route.query.expertUsername as string;

// 2. 表单数据
const appointForm = ref<{
  expertUsername: string;
  expertName: string;
  userName: string;
  userNickName: string;
  appointDate: string;
  appointTime: string;
  appointPlace: string;
  appointReason: string;
  contactPhone: string;
}>({
  expertUsername: expertUsername || '',
  expertName: '',
  userName: userName || '',
  userNickName: userNickName || '',
  appointDate: '',
  appointTime: '',
  appointPlace: '',
  appointReason: '',
  contactPhone: userPhone || '' // 自动填充手机号
});

// 3. 加载状态
const expertInfo = ref<Expert | null>(null);
const formLoading = ref(false);

// 4. 获取专家详情（回显姓名）
const fetchExpertDetail = async () => {
  if (!appointForm.value.expertUsername) return;
  formLoading.value = true;
  try {
    const res = await expertApi.getExpertByUsername(appointForm.value.expertUsername);
    expertInfo.value = res.data;
    appointForm.value.expertName = res.data.realName;
  } catch (error) {
    console.error('获取专家信息失败：', error);
    ElMessage.error('获取专家信息失败，请返回重试');
  } finally {
    formLoading.value = false;
  }
};

// 5. 表单校验
const validateForm = (): boolean => {
  if (!appointForm.value.appointDate) {
    ElMessage.warning('请选择预约日期');
    return false;
  }
  if (!appointForm.value.appointTime) {
    ElMessage.warning('请选择预约时间');
    return false;
  }
  const place = appointForm.value.appointPlace.trim();
  if (!place || place.length < 2 || place.length > 100) {
    ElMessage.warning('预约地点长度需在2-100个字之间');
    return false;
  }
  const reason = appointForm.value.appointReason.trim();
  if (!reason || reason.length < 10 || reason.length > 500) {
    ElMessage.warning('预约事由长度需在10-500个字之间');
    return false;
  }
  const phone = appointForm.value.contactPhone.trim();
  const phoneReg = /^1[3-9]\d{9}$/;
  if (!phone || !phoneReg.test(phone)) {
    ElMessage.warning('请填写正确的11位手机号');
    return false;
  }
  const now = new Date();
  const appointDateTime = new Date(`${appointForm.value.appointDate} ${appointForm.value.appointTime}`);
  if (appointDateTime < now) {
    ElMessage.warning('预约时间不能早于当前时间');
    return false;
  }
  if (!appointForm.value.expertUsername) {
    ElMessage.warning('请先选择要预约的专家');
    return false;
  }
  return true;
};

// 6. 提交预约申请
const submitAppointment = async () => {
  if (!userName) {
    ElMessage.warning('请先登录后再预约');
    await router.push('/login');
    return;
  }
  if (!validateForm()) return;

  try {
    const appointDateTime = `${appointForm.value.appointDate} ${appointForm.value.appointTime}`;
    const res = await appointmentApi.addAppointment({
      ...appointForm.value,
      appointDateTime,
      status: 'pending',
      createTime: new Date().toISOString()
    });
    if (res.code === 200) {
      ElMessage.success('预约申请提交成功，等待专家确认');
      resetForm();
      // 提交成功后可选择跳转到「我的预约记录」页面
      // router.push('/my-appointment');
    } else {
      ElMessage.error(res.msg || '提交预约失败');
    }
  } catch (error) {
    console.error('提交预约失败：', error);
    ElMessage.error('提交预约失败，请重试');
  }
};

// 7. 重置表单
const resetForm = () => {
  appointForm.value = {
    expertUsername: expertUsername || '',
    expertName: expertInfo.value?.realName || '',
    userName: userName || '',
    userNickName: userNickName || '',
    appointDate: '',
    appointTime: '',
    appointPlace: '',
    appointReason: '',
    contactPhone: userPhone || ''
  };
};

// 8. 页面初始化
onMounted(() => {
  if (!userName) {
    ElMessage.warning('请先登录');
    router.push('/login');
    return;
  }
  if (appointForm.value.expertUsername) {
    fetchExpertDetail();
  }
});

// 9. 监听路由参数变化
watch(() => route.query.expertUsername, (newVal) => {
  if (newVal) {
    appointForm.value.expertUsername = newVal as string;
    fetchExpertDetail();
  }
}, { immediate: true });
// 新增：返回上一页方法
const goBack = () => {
  // 优先返回上一页，若没有则跳转到专家列表页（兜底）
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/expert'); // 替换为你的专家列表页路由
  }
};
</script>

<template>
  <div>
    <SiteHeader />
    <!-- 页面标题（新增返回按钮） -->
    <div class="page-header">
      <div class="header-left">
        <!-- 返回按钮 -->
        <button class="back-btn" @click="goBack">
          ← 返回
        </button>
      </div>
      <h1 class="page-title">专家线下预约</h1>
      <p class="page-desc">填写预约信息，与专家面对面沟通农业问题</p>
    </div>

      <!-- 预约表单 -->
      <div class="appoint-form-card" v-loading="formLoading">
        <h2 class="form-title">
          <span v-if="expertInfo">预约 {{ expertInfo.realName }} 专家</span>
          <span v-else>选择专家进行预约</span>
        </h2>

        <div class="form-content">
          <!-- 专家信息（只读） -->
          <div class="form-item" v-if="expertInfo">
            <label class="form-label">预约专家：</label>
            <div class="form-value">
              <span>{{ expertInfo.realName }}</span>
              <span class="profession-tag">{{ expertInfo.profession }}</span>
            </div>
          </div>

          <!-- 预约人信息（只读） -->
          <div class="form-item">
            <label class="form-label">预约人：</label>
            <div class="form-value">{{ userNickName }}</div>
          </div>

          <!-- 预约日期 -->
          <div class="form-item">
            <label class="form-label required">预约日期：</label>
            <el-date-picker
              v-model="appointForm.appointDate"
              type="date"
              placeholder="选择预约日期"
              class="form-input"
              :disabled-date="(date) => date < new Date()"
            />
          </div>

          <!-- 预约时间 -->
          <div class="form-item">
            <label class="form-label required">预约时间：</label>
            <el-time-picker
              v-model="appointForm.appointTime"
              placeholder="选择预约时间"
              class="form-input"
              format="HH:mm"
              value-format="HH:mm"
            />
          </div>

          <!-- 预约地点 -->
          <div class="form-item">
            <label class="form-label required">预约地点：</label>
            <input
              v-model="appointForm.appointPlace"
              placeholder="请填写具体预约地点（如XX农业站/XX会议室）"
              class="form-input"
              maxlength="100"
            />
          </div>

          <!-- 预约事由 -->
          <div class="form-item">
            <label class="form-label required">预约事由：</label>
            <textarea
              v-model="appointForm.appointReason"
              placeholder="请简要说明预约沟通的问题（如水稻病害诊断/种植技术指导）"
              class="form-textarea"
              rows="3"
              maxlength="500"
            />
          </div>

          <!-- 联系电话（只读） -->
          <div class="form-item">
            <label class="form-label required">联系电话：</label>
            <input
              v-model="appointForm.contactPhone"
              placeholder="请填写11位手机号，方便专家联系"
              class="form-input"
              type="tel"
              maxlength="11"
              readonly
            />
          </div>

          <!-- 提交按钮 -->
          <div class="form-submit">
            <button class="submit-btn" @click="submitAppointment">提交预约申请</button>
            <button class="reset-btn" @click="resetForm">重置</button>
          </div>
        </div>
      </div>
    </div>

</template>

<style scoped>
/* 保留原有样式，无需修改 */
.appoint-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-size: 14px;
  color: #333;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
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

.appoint-form-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  padding: 25px;
  margin-bottom: 30px;
}

.form-title {
  font-size: 18px;
  color: #2E7D32;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.form-content {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.form-label {
  width: 100px;
  text-align: right;
  padding-top: 6px;
  color: #666;
}

.form-label.required::after {
  content: '*';
  color: #f44336;
  margin-left: 4px;
}

.form-value {
  flex: 1;
  padding: 6px 0;
  color: #333;
}

.profession-tag {
  display: inline-block;
  background: #e8f5e9;
  color: #2E7D32;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-left: 10px;
}

.form-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
}

.form-input:focus {
  border-color: #2E7D32;
  box-shadow: 0 0 0 2px rgba(46, 125, 50, 0.1);
}

.form-textarea {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  resize: vertical;
  outline: none;
}

.form-textarea:focus {
  border-color: #2E7D32;
  box-shadow: 0 0 0 2px rgba(46, 125, 50, 0.1);
}

.form-submit {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
}

.submit-btn {
  padding: 12px 30px;
  background: #2E7D32;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.3s;
}

.submit-btn:hover {
  background: #1B5E20;
}

.reset-btn {
  padding: 12px 30px;
  background: #fff;
  color: #666;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s;
}

.reset-btn:hover {
  background: #f5f5f5;
}
/* 新增：返回按钮样式 */
.page-header {
  text-align: center;
  margin-bottom: 30px;
  position: relative; /* 新增：为返回按钮定位 */
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
.page-title {
  font-size: 24px;
  color: #2E7D32;
  margin-bottom: 8px;
}
.back-btn:hover {
  background: #e8f5e9;
  border-color: #2E7D32;
}

:deep(.el-date-picker__panel), :deep(.el-time-picker__panel) {
  z-index: 9999 !important;
}

:deep(.el-input__wrapper) {
  box-shadow: none !important;
}
</style>
