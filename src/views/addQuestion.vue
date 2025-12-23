<template>
  <div>
    <SiteHeader />
    <!-- 页面容器 -->
    <div class="question-page-container">
      <!-- 页面标题区 -->
      <div class="page-header">
        <!-- 新增返回按钮 -->
        <!-- 返回按钮和标题横向排列 -->
        <button class="back-btn" @click="router.back()">← 返回</button>
        <h2 class="page-title">向专家提问</h2>
        <p class="page-desc">请详细描述你的问题，专家会在24小时内回复~</p>
      </div>

      <!-- 专家信息卡片 -->
      <div class="expert-card">
        <div class="expert-avatar">
          <i class="iconfont icon-expert"></i>
        </div>
        <div class="expert-info">
          <h3 class="expert-name">提问对象：{{ expertUsername }}</h3>
          <p class="expert-tip">该专家擅长 {{ expertField || "农作物种植、病虫害防治" }} 领域</p>
        </div>
      </div>

      <!-- 提问表单 -->
      <el-form
        ref="questionFormRef"
        :model="questionForm"
        :rules="rules"
        class="question-form"
        label-width="0"
      >
        <!-- 农作物名称 -->
        <el-form-item prop="plantName" class="form-item">
          <div class="form-item-header">
            <span class="required-mark">*</span>
            <span class="item-label">农作物名称</span>
          </div>
          <el-input
            v-model="questionForm.plantName"
            placeholder="请输入农作物名称（如：水稻、人参）"
            @input="trimInput('plantName')"
            class="form-input"
          >
            <!-- 用插槽自定义前缀图标 -->
            <template #prefix>
              <i class="iconfont icon-plant"></i>
            </template>
          </el-input>
          <div class="form-hint">
            <i class="iconfont icon-info"></i> 准确输入作物名称可提高专家响应效率
          </div>
        </el-form-item>

        <!-- 问题标题 -->
        <el-form-item prop="title" class="form-item">
          <div class="form-item-header">
            <span class="required-mark">*</span>
            <span class="item-label">问题标题</span>
          </div>
          <el-input
            v-model="questionForm.title"
            placeholder="请简要描述问题（如：水稻叶片有黑斑怎么办？）"
            @input="trimInput('title')"
            class="form-input"
          >
            <template #prefix>
              <i class="iconfont icon-title"></i>
            </template>
          </el-input>
          <div class="form-hint">
            <i class="iconfont icon-info"></i> 标题需包含关键症状（至少5个字）
          </div>
        </el-form-item>

        <!-- 问题详情 -->
        <el-form-item prop="question" class="form-item">
          <div class="form-item-header">
            <span class="required-mark">*</span>
            <span class="item-label">问题详情</span>
            <span class="word-count">
              {{ questionForm.question.length }} / 200字
            </span>
          </div>
          <el-input
            v-model="questionForm.question"
            type="textarea"
            rows="6"
            placeholder="请按照以下要点描述：
1. 症状：叶片/果实有何异常？（如斑点、卷曲）
2. 环境：近期温度、湿度、施肥情况？
3. 时间：症状出现多久了？
4. 其他：是否使用过农药？"
            @input="trimInput('question')"
            class="form-textarea"
          />
          <div class="form-hint">
            <i class="iconfont icon-info"></i> 至少20字，越详细越容易获得准确解答
          </div>
        </el-form-item>

        <!-- 联系电话 -->
        <el-form-item prop="phone" class="form-item">
          <div class="form-item-header">
            <span class="required-mark">*</span>
            <span class="item-label">联系电话</span>
          </div>
          <el-input
            v-model="questionForm.phone"
            placeholder="请输入你的联系电话"
            @input="formatPhone"
            class="form-input"
          >
            <template #prefix>
              <i class="iconfont icon-phone"></i>
            </template>
          </el-input>
        </el-form-item>

        <!-- 提交按钮区 -->
        <div class="form-btn-group">
          <el-button
            type="primary"
            @click="submitQuestion"
            :loading="submitting"
            class="submit-btn"
          >
            <template v-if="submitting">提交中...</template>
            <template v-else>提交问题</template>
          </el-button>
          <el-button
            type="default"
            @click="router.back()"
            class="cancel-btn"
          >
            取消
          </el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import SiteHeader from '@/components/SiteHeader.vue';
import { questionApi, expertApi } from '@/utils/api'
import type { FormInstance } from 'element-plus';
import type { Question,ExpertDetailVO  } from '@/utils/types';

const router = useRouter();
const route = useRoute();
const expertUsername = route.query.expertUsername as string;
const expertField = route.query.expertField as string;
const submitting = ref(false);

// 从localStorage获取用户信息
const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

// 表单数据
const questionForm = reactive<Pick<Question, 'expertName' | 'questioner' | 'phone' | 'plantName' | 'title' | 'question'>>({
  expertName: expertUsername,
  questioner: '',
  phone: '',
  plantName: '',
  title: '',
  question: ''
});
// 方式1：用 reactive 定义（推荐，支持对象层级响应式）
const expertInfo = reactive<ExpertDetailVO>({
  userName: '',
  realName: '',
  phone: '',
  profession: '',
  position: '',
  belong: '',
  avatar: '', // 默认头像可填占位图地址，比如 '/assets/images/avatar-default.png'
  nickName: '',
  credit: ''
})
// 获取专家详情的方法（适配后端返回的合并数据）
const getExpertDetail = async (expertUsername: string) => {
  try {
    if (!expertUsername) {
      console.warn('用户名不能为空');
      return;
    }
    // 调用接口（适配后端返回的 ExpertDetailVO 结构）
    const res = await expertApi.getExpertDetail(username);
    if (res.code === 200 && res.data) {
      // 赋值：覆盖原有默认值（reactive 直接赋值，ref 需 .value）
      Object.assign(expertInfo, res.data);
      // 若用 ref 则：Object.assign(expertInfo.value, res.data);
    } else {
      console.error('获取专家详情失败：', res.msg);
    }
  } catch (error) {
    console.error('请求专家详情接口异常：', error);
    // 异常时重置（可选）
    Object.assign(expertInfo, {
      userName: '',
      realName: '',
      phone: '',
      profession: '',
      position: '',
      belong: '',
      avatar: '',
      nickName: '',
      credit: ''
    });
  }
};

// 表单实例
const questionFormRef = ref<FormInstance>();

// 校验规则
const rules = {
  plantName: [
    { required: true, message: '请输入农作物名称', trigger: 'blur' },
    { min: 2, message: '作物名称至少2个字', trigger: 'blur' },
    { pattern: /[^\d]{2,}/, message: '不能仅输入数字', trigger: 'blur' }
  ],
  title: [
    { required: true, message: '请输入问题标题', trigger: 'blur' },
    { min: 5, message: '标题至少5个字', trigger: 'blur' },
    { pattern: /[^\d]{5,}/, message: '不能仅输入数字', trigger: 'blur' }
  ],
  question: [
    { required: true, message: '请输入问题详情', trigger: 'blur' },
    { min: 20, message: '问题详情至少20个字', trigger: 'blur' },
    { max: 200, message: '问题详情不超过200字', trigger: 'blur' },
    { pattern: /[^\d]{20,}/, message: '不能仅输入数字', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }
  ]
};

// 页面加载时填充用户信息
onMounted(() => {
  // 获取专家详情（含头像）
  getExpertDetail();

  const currentUser = getCurrentUser();
  if (currentUser) {
    questionForm.questioner = currentUser.userName || '';
    questionForm.phone = currentUser.phone || '';
  } else {
    ElMessage.warning('请先登录后再提问');
    setTimeout(() => router.push('/login'), 1500);
  }
});

// 输入框自动去空格
const trimInput = (field: keyof typeof questionForm) => {
  if (typeof questionForm[field] === 'string') {
    questionForm[field] = questionForm[field].trim();
  }
};

// 手机号格式化
const formatPhone = () => {
  questionForm.phone = questionForm.phone.replace(/\D/g, '');
};

// 提交问题
const submitQuestion = async () => {
  if (submitting.value) return;
  try {
    submitting.value = true;
    await questionFormRef.value?.validate();

    const currentUser = getCurrentUser();
    if (!currentUser || !questionForm.questioner) {
      ElMessage.warning('用户信息失效，请重新登录');
      router.push('/login');
      return;
    }

    await questionApi.postQuestion(questionForm);

    // 重置表单
    Object.keys(questionForm).forEach(key => {
      questionForm[key as keyof typeof questionForm] = '';
    });
    questionFormRef.value?.resetFields();

    ElMessage.success({
      message: '问题提交成功，专家将尽快回复！',
      duration: 1500,
      onClose: () => router.push('/questionHome')
    });
  } catch (error) {
    console.error('提交失败：', error);
    ElMessage.error('提交失败，请稍后重试');
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
/* 全局容器 */
.question-page-container {
  max-width: 1200px;
  margin: 40px auto;
  padding: 0 30px;
}
.page-header {
  display: flex;
  align-items: center;
  gap: 12px; /* 按钮和标题的间距 */
  margin-bottom: 30px;
  padding-top: 20px;
}
.page-title {
  font-size: 26px;
  color: #2E7D32;
  font-weight: 600;
  margin-bottom: 8px;
}
.page-desc {
  font-size: 14px;
  color: #6c757d;
}

/* 返回按钮：简约风格 + 明确的悬停效果 */
.back-btn {
  background: transparent;
  border: none;
  color: #2E7D32;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px; /* 增加点击区域 */
  border-radius: 6px; /* 轻微圆角，更柔和 */
  transition: all 0.2s ease; /* 过渡动画，hover更丝滑 */
}

/* 悬停效果（加!important确保优先级） */
.back-btn:hover {
  color: #1b5e20 !important; /* 深绿色 */
  background-color: #f0fdf4 !important; /* 浅绿背景 */
}

/* 取消按钮默认的点击高亮 */
.back-btn:focus {
  outline: none;
}

/* 专家信息卡片 */
.expert-card {
  display: flex;
  align-items: center;
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 30px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.expert-avatar {
  width: 48px;
  height: 48px;
  background: #e8f5e9;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
}
.expert-avatar .iconfont {
  font-size: 24px;
  color: #2E7D32;
}
.expert-name {
  font-size: 16px;
  color: #212529;
  margin-bottom: 4px;
}
.expert-tip {
  font-size: 13px;
  color: #6c757d;
}

.expert-avatar {
  width: 48px;
  height: 48px;
  background: #e8f5e9;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  overflow: hidden; /* 裁剪头像为圆形 */
}

/* 动态头像样式 */
.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover; /* 保持头像比例 */
}

/* 兜底图标样式 */
.expert-avatar .icon-expert {
  font-size: 24px;
  color: #2E7D32;
}
/* 表单整体 */
.question-form {
  background: #fff;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}

/* 表单项 */
.form-item {
  margin-bottom: 24px;
}
.form-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.required-mark {
  color: #dc3545;
  font-size: 16px;
  margin-right: 4px;
}
.item-label {
  font-size: 15px;
  color: #212529;
  font-weight: 500;
}
.word-count {
  font-size: 13px;
  color: #6c757d;
}

/* 输入框样式 */
.form-input {
  width: 100%;
  height: 44px;
  border-radius: 8px;
  border: 1px solid #dee2e6;
  transition: all 0.2s;
}
:deep(.el-input__wrapper) {
  border-radius: 8px;
}
:deep(.el-input__wrapper:focus-within) {
  border-color: #2E7D32;
  box-shadow: 0 0 0 3px rgba(46, 125, 50, 0.1);
}
.form-textarea {
  width: 100%;
  border-radius: 8px;
  resize: vertical;
}
:deep(.el-textarea__wrapper) {
  border-radius: 8px;
}
:deep(.el-textarea__wrapper:focus-within) {
  border-color: #2E7D32;
  box-shadow: 0 0 0 3px rgba(46, 125, 50, 0.1);
}

/* 提示文本 */
.form-hint {
  font-size: 13px;
  color: #6c757d;
  margin-top: 6px;
  display: flex;
  align-items: center;
}
.form-hint .iconfont {
  margin-right: 4px;
  font-size: 14px;
}

/* 按钮组 */
.form-btn-group {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 16px;
}
.submit-btn {
  background-color: #2E7D32;
  border-color: #2E7D32;
  border-radius: 8px;
  padding: 10px 24px;
  font-size: 15px;
  transition: all 0.2s;
}
.submit-btn:hover:not(.is-loading) {
  background-color: #1b5e20;
  border-color: #1b5e20;
}
.cancel-btn {
  border-radius: 8px;
  padding: 10px 24px;
  font-size: 15px;
  transition: all 0.2s;
}
.cancel-btn:hover {
  background-color: #f8f9fa;
}

/* 图标字体样式 */
.iconfont {
  font-family: "iconfont" !important;
  font-style: normal;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
/* 图标内容（如果没有引入iconfont，可替换为实际图标） */
.icon-plant::before { content: "🌱"; }
.icon-title::before { content: "📝"; }
.icon-info::before { content: "ℹ️"; }
.icon-phone::before { content: "📞"; }
.icon-expert::before { content: "👨‍🔬"; }

/* 响应式适配：小屏幕下调整返回按钮 */
@media (max-width: 640px) {
  .back-btn {
    padding: 6px 12px;
    font-size: 13px;
  }
  .page-title {
    font-size: 22px;
  }
}
</style>
