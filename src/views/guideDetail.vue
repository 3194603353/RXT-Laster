<template>
  <div>
    <!-- 动态Header -->
    <ExpertHeader v-if="userRole === 'expert'" />
    <SiteHeader v-else />

    <div class="simple-page">
      <!-- 返回按钮 -->
      <button class="back-btn" @click="handleBack">← 返回</button>

      <!-- 加载/无权限/无数据兜底 -->
      <div class="loading-tip" v-if="loading">加载中...</div>
      <div class="empty-tip" v-if="!loading && !hasPermission">
        暂无权限访问，请登录后重试
      </div>
      <div class="empty-tip" v-if="!loading && hasPermission && !question">
        未找到该问答信息
      </div>

      <!-- 核心详情区（仅有权限+有数据时显示） -->
      <div class="question-detail" v-if="!loading && hasPermission && question">
        <!-- 标题栏（场景化操作按钮） -->
        <div class="title-bar">
          <h1 class="detail-title">{{ question.title }}</h1>
          <!-- 场景1：普通用户-自有提问 → 显示删除/编辑按钮 -->
          <div class="title-actions" v-if="userRole !== 'expert' && isSelfQuestion&& question.status === 'unanswered'">
            <button class="edit-btn" @click="startEditQuestion">编辑提问</button>
            <button class="delete-btn" @click="confirmDeleteQuestion">删除提问</button>
          </div>
        </div>

        <!-- 基础信息栏（统一展示+场景化标注） -->
        <div class="meta-bar">
          <div class="meta-group">
            <span class="meta-item">咨询者：{{ question.questioner || '匿名' }}</span>
            <span class="meta-item">农作物：{{ question.plantName || '未分类' }}</span>
            <span class="meta-item">提交时间：{{ formatTime(question.createTime) }}</span>
            <span class="meta-item">对接专家：{{ question.expertName || '暂未指定' }}</span>
            <span class="meta-item status-tag" :class="[
              question.status === 'answered' ? 'status-answered' :
              question.status === 'user_canceled' ? 'status-canceled' : 'status-unanswered'
              ]">
                {{
                    question.status === 'answered' ? '已回答' :
                    question.status === 'user_canceled' ? '已取消' : '未回答'
                }}
            </span>
          </div>
          <!-- 场景标注（提升用户认知） -->
          <div class="scene-tag" v-if="isSelfQuestion">
            <i>📌</i> 这是您发起的提问
          </div>
          <div class="scene-tag" v-if="userRole === 'expert' && isAssignedExpert">
            <i>👨‍🔬</i> 这是向您发起的咨询
          </div>
          <div class="scene-tag" v-if="userRole === 'expert' && !isAssignedExpert">
            <i>👥</i> 同行问答参考
          </div>
        </div>

        <!-- 问题描述区（所有场景可见） -->
        <div class="content-block">
          <h2 class="block-title">问题描述</h2>
          <div v-if="isEditingQuestion" class="edit-content-area">
            <el-input
              v-model="editTitle"
              placeholder="请输入问题标题"
              class="edit-title-input"
            />
            <el-select
              v-model="editPlantName"
              placeholder="请选择农作物类型"
              class="edit-plant-select"
            >
              <el-option label="番薯" value="番薯" />
              <el-option label="水稻" value="水稻" />
              <el-option label="小麦" value="小麦" />
              <el-option label="其他" value="其他" />
            </el-select>
            <textarea
              v-model="editQuestionContent"
              placeholder="请输入问题描述"
              rows="4"
              class="edit-question-textarea"
            ></textarea>
            <!-- 编辑操作按钮 -->
            <div class="edit-actions">
              <button class="save-edit-btn" @click="confirmSaveQuestion">保存编辑后的问题</button>
              <button class="cancel-edit-btn" @click="cancelEditQuestion">取消编辑</button>
            </div>
          </div>
          <!-- 非编辑状态：显示静态内容 -->
          <div v-else class="content">{{ question.question || '暂无描述' }}</div>
        </div>

        <!-- 回答区（按场景差异化渲染） -->
        <div class="answer-block">
          <!-- 场景1：普通用户-自有提问 → 查看回答+催答/取消提问 -->
          <template v-if="userRole !== 'expert' && isSelfQuestion">
            <h2 class="block-title">专家回答</h2>
            <!-- 已回答 -->
            <div class="answer-content" v-if="question.status === 'answered' && question.answer">
              {{ question.answer }}
            </div>
            <!-- 未回答 → 显示催答/取消按钮 -->
            <div class="no-answer-actions" v-if="question.status === 'unanswered'">
              <p class="no-answer-tip">该问题暂未得到专家回答</p>
              <div class="action-group">
                <button class="cancel-btn" @click="confirmCancelQuestion">取消提问</button>
              </div>
            </div>
          </template>

          <!-- 场景2：普通用户-他人提问 → 仅查看（无操作） -->
          <template v-if="userRole !== 'expert' && !isSelfQuestion">
            <h2 class="block-title">专家回答</h2>
            <div class="answer-content" v-if="question.status === 'answered' && question.answer">
              {{ question.answer }}
            </div>
            <p class="no-answer-tip" v-else>该问题暂未得到专家回答</p>
          </template>

          <!-- 场景3：专家-被提问 → 回答/编辑回答 -->
          <template v-if="userRole === 'expert' && isAssignedExpert">
            <h2 class="block-title">
              您的回答
              <span class="edit-answer-tag" v-if="question.status === 'answered'" @click="toggleEditAnswer">
                {{ isEditingAnswer ? '取消编辑' : '编辑答案' }}
              </span>
            </h2>
            <!-- 未回答 → 回答输入框 -->
            <div class="answer-edit-area" v-if="question.status === 'unanswered'">
              <textarea
                v-model="answerContent"
                placeholder="请输入您的专业回答..."
                rows="8"
                class="answer-input"
              ></textarea>
              <button class="submit-btn" @click="submitAnswer" :disabled="!answerContent.trim()">
                提交回答
              </button>
            </div>
            <!-- 已回答 → 查看/编辑 -->
            <div v-if="question.status === 'answered'">
              <div class="answer-content" v-if="!isEditingAnswer">
                {{ question.answer }}
              </div>
              <div class="answer-edit-area" v-if="isEditingAnswer">
                <textarea
                  v-model="editAnswerContent"
                  placeholder="请修改您的回答..."
                  rows="8"
                  class="answer-input"
                ></textarea>
                <button class="save-btn" @click="saveAnswer" :disabled="!editAnswerContent.trim()">
                  保存修改
                </button>
              </div>
            </div>
          </template>

          <!-- 场景4：专家-同行问答 → 仅查看（标注回答专家） -->
          <template v-if="userRole === 'expert' && !isAssignedExpert">
            <h2 class="block-title">
              专家回答
              <span class="answer-expert-tag" v-if="question.status === 'answered'">
                回答专家：{{ question.expertName || '匿名专家' }}
              </span>
            </h2>
            <div class="answer-content" v-if="question.status === 'answered' && question.answer">
              {{ question.answer }}
            </div>
            <p class="no-answer-tip" v-else>该问题暂未得到专家回答</p>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import ExpertHeader from '@/components/ExpertHeader.vue';
import SiteHeader from '@/components/SiteHeader.vue';
import { questionApi } from '@/utils/api';
import { Question } from '@/utils/types.ts';

// 路由/导航
const route = useRoute();
const router = useRouter();

// 核心状态
const loading = ref(true);
const question = ref<Question | null>(null);
const hasPermission = ref(false); // 简化权限判断（登录即有权限）

// 用户信息
const userInfo = ref<any>(null);
const userRole = ref<'expert' | 'user' | ''>(''); // 仅区分专家/普通用户
const userName = ref('');

// 场景判断（核心）
const isSelfQuestion = ref(false); // 普通用户-自有提问
const isAssignedExpert = ref(false); // 专家-被提问

// 新增：问题编辑相关状态
const isEditingQuestion = ref(false); // 是否处于问题编辑状态
const editTitle = ref(''); // 编辑时的标题临时存储
const editPlantName = ref(''); // 编辑时的农作物临时存储
const editQuestionContent = ref(''); // 编辑时的问题描述临时存储

// 专家编辑相关
const isEditingAnswer = ref(false);
const answerContent = ref('');
const editAnswerContent = ref('');

// 格式化时间
const formatTime = (time: Date | string | undefined) => {
  if (!time) return '未知';
  return new Date(time).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 初始化用户信息
const initUserInfo = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      userInfo.value = JSON.parse(userStr);
      userName.value = userInfo.value.userName || '';
      userRole.value = (userInfo.value.role || '').toLowerCase() === 'expert' ? 'expert' : 'user';
      hasPermission.value = true;
    } else {
      hasPermission.value = false;
      ElMessage.warning('请先登录');
      router.push('/login');
    }
  } catch (err) {
    hasPermission.value = false;
    ElMessage.error('用户信息解析失败');
  }
};

// 获取问答详情
const getQuestionDetail = async () => {
  try {
    const id = route.params.id;
    if (!id || typeof id !== 'string') throw new Error('问题ID无效');

    const questionId = Number(id);
    const res = await questionApi.getQuestionDetail(questionId);
    question.value = res.data;

    // 新增：初始化编辑内容
    editTitle.value = question.value.title;
    editPlantName.value = question.value.plantName;
    editQuestionContent.value = question.value.question;

    // 场景判断
    if (userRole.value === 'user') {
      // 普通用户：判断是否自有提问
      isSelfQuestion.value = question.value?.questioner === userName.value;
    } else if (userRole.value === 'expert') {
      // 专家：判断是否被提问
      isAssignedExpert.value = question.value?.expertName === userName.value;
      // 初始化编辑内容
      editAnswerContent.value = question.value?.answer || '';
    }
  } catch (error) {
    console.error('获取详情失败：', error);
    ElMessage.error('加载问答详情失败');
  } finally {
    loading.value = false;
  }
};
// 开始编辑问题
const startEditQuestion = () => {
  isEditingQuestion.value = true;
  // 重新同步最新内容（防止编辑过程中数据变化）
  editTitle.value = question.value?.title || '';
  editPlantName.value = question.value?.plantName || '';
  editQuestionContent.value = question.value?.question || '';
};

// 取消编辑问题
const cancelEditQuestion = () => {
  isEditingQuestion.value = false;
};

// 确认保存编辑后的问题
const confirmSaveQuestion = async () => {
  // 校验必填项
  if (!editTitle.value.trim() || !editPlantName.value.trim() || !editQuestionContent.value.trim()) {
    ElMessage.warning('标题、农作物类型、问题描述不能为空');
    return;
  }

  // 二次确认
  ElMessageBox.confirm(
    '是否确认更改？',
    '提示',
    { type: 'info' }
  ).then(async () => {
    try {
      // 调用接口更新问题
      await questionApi.updateQuestion({
        questionId: Number(route.params.id),
        title: editTitle.value,
        plantName: editPlantName.value,
        question: editQuestionContent.value
      });
      // 更新本地数据
      question.value!.title = editTitle.value;
      question.value!.plantName = editPlantName.value;
      question.value!.question = editQuestionContent.value;
      // 退出编辑状态
      isEditingQuestion.value = false;
      ElMessage.success('问题编辑成功');
    } catch (err) {
      ElMessage.error('编辑失败，请稍后重试');
    }
  });
};

// 普通用户-删除提问
const confirmDeleteQuestion = () => {
  ElMessageBox.confirm('确定删除该提问？删除后不可恢复！', '提示', {
    type: 'warning'
  }).then(async () => {
    try {
      await questionApi.deleteQuestion(Number(route.params.id));
      ElMessage.success('删除成功');
      router.back();
    } catch (err) {
      ElMessage.error('删除失败');
    }
  });
};


// 取消提问的点击事件
const confirmCancelQuestion = async () => {
  try {
    await ElMessageBox.confirm('确定取消该提问？', '提示', { type: 'info' });

    // 调用通用状态更新接口，传 statusType = "userCancel"
    const res = await questionApi.updateQuestionStatus({
      questionId: Number(route.params.id), // 问题ID（从路由/参数中取）
      statusType: 'userCancel', // 对应后端switch中的case值
    });

    if (res.code === 200) {
      ElMessage.success('取消提问成功');
      // 步骤1：本地更新状态
      const targetQuestion = myQuestionList.value.find(
        item => item.questionId === Number(route.params.id)
      );
      if (targetQuestion) {
        targetQuestion.status = 'user_canceled'; // 同步为“用户取消”
      }
      // 步骤2：重新请求列表（保证数据最终一致性）
      fetchMyQuestions();
      router.back();
    }
  } catch (err) {
    ElMessage.error('取消失败，请稍后重试');
  }
};

// 专家-提交回答
const submitAnswer = async () => {
  try {
    await questionApi.answerQuestion({
      questionId: Number(route.params.id),
      answer: answerContent.value.trim(),
      expertName: userName.value,
      status: "answered"
    });
    ElMessage.success('回答提交成功');
    question.value!.answer = answerContent.value.trim();
    question.value!.status = "answered";
    answerContent.value = '';
  } catch (err) {
    ElMessage.error('提交回答失败');
  }
};

// 专家-保存编辑后的回答
const saveAnswer = async () => {
  try {
    await questionApi.updateAnswer({
      questionId: Number(route.params.id),
      answer: editAnswerContent.value.trim()
    });
    ElMessage.success('回答修改成功');
    question.value!.answer = editAnswerContent.value.trim();
    isEditingAnswer.value = false;
  } catch (err) {
    ElMessage.error('修改回答失败');
  }
};

// 切换编辑状态
const toggleEditAnswer = () => {
  isEditingAnswer.value = !isEditingAnswer.value;
  if (isEditingAnswer.value) {
    editAnswerContent.value = question.value?.answer || '';
  }
};

// 返回上一页
const handleBack = () => {
  router.back();
};

// 初始化
onMounted(() => {
  initUserInfo();
  if (hasPermission.value) {
    getQuestionDetail();
  } else {
    loading.value = false;
  }
});
</script>

<style scoped>
/* 基础布局 */
.simple-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  min-height: calc(100vh - 80px);
  background: #f8fafc;
}

.back-btn {
  padding: 8px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  color: #334155;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  margin-bottom: 20px;
}

.back-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

/* 兜底提示 */
.loading-tip, .empty-tip {
  text-align: center;
  padding: 100px 0;
  color: #64748b;
  font-size: 16px;
}

.empty-tip {
  color: #94a3b8;
}

/* 核心详情容器 */
.question-detail {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  padding: 32px;
}

/* 标题栏 */
.title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.detail-title {
  font-size: 24px;
  color: #1e293b;
  font-weight: 600;
  margin: 0;
}

.title-actions {
  display: flex;
  gap: 12px;
}
/* 新增：编辑问题区域样式 */
.edit-content-area {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
}

.edit-title-input, .edit-plant-select {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.edit-question-textarea {
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  line-height: 1.8;
  font-size: 16px;
  resize: vertical;
  min-height: 120px;
}

.edit-actions {
  display: flex;
  gap: 12px;
}

.save-edit-btn, .cancel-edit-btn {
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  border: none;
}

.save-edit-btn {
  background: #2563eb;
  color: #fff;
}

.cancel-edit-btn {
  background: #f1f5f9;
  color: #64748b;
}
.edit-btn, .delete-btn {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  border: 1px solid #e2e8f0;
}

.edit-btn {
  background: #fff;
  color: #2563eb;
}

.delete-btn {
  background: #fef2f2;
  color: #dc2626;
  border-color: #fecdd3;
}

/* 元信息栏 */
.meta-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  margin-bottom: 24px;
}

.meta-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.meta-item {
  font-size: 14px;
  color: #64748b;
}

.status-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.status-answered {
  background: #ecfdf5;
  color: #10b981;
}

.status-unanswered {
  background: #fffbeb;
  color: #f59e0b;
}

.scene-tag {
  font-size: 14px;
  color: #2563eb;
  background: #eff6ff;
  padding: 4px 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 内容块通用 */
.content-block, .answer-block {
  margin-bottom: 32px;
}

.block-title {
  font-size: 18px;
  color: #1e293b;
  font-weight: 500;
  margin-bottom: 16px;
  padding-left: 8px;
  border-left: 3px solid #2e7d32;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.content, .answer-content {
  padding: 20px;
  border-radius: 8px;
  line-height: 1.8;
  font-size: 16px;
  color: #334155;
}

.content {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.answer-content {
  background: #ecfdf5;
  border: 1px solid #d1fae5;
}

/* 普通用户-未回答操作区 */
.no-answer-actions {
  text-align: center;
  padding: 24px;
  background: #f8fafc;
  border-radius: 8px;
}

.no-answer-tip {
  color: #64748b;
  font-size: 16px;
  margin-bottom: 20px;
}

.action-group {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.remind-btn, .cancel-btn {
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  border: none;
}

.remind-btn {
  background: #2563eb;
  color: #fff;
}

.cancel-btn {
  background: #f1f5f9;
  color: #64748b;
}

/* 专家回答编辑区 */
.answer-edit-area {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.answer-input {
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  line-height: 1.8;
  font-size: 16px;
  resize: vertical;
  min-height: 160px;
}

.answer-input:focus {
  outline: none;
  border-color: #2e7d32;
  box-shadow: 0 0 0 2px rgba(46, 125, 50, 0.1);
}

.submit-btn, .save-btn {
  align-self: flex-start;
  padding: 10px 24px;
  border-radius: 8px;
  border: none;
  background: #2e7d32;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.submit-btn:disabled, .save-btn:disabled {
  background: #a3e635;
  cursor: not-allowed;
}
/* 新增：已取消状态样式 */
.status-canceled {
  background: #f1f5f9;
  color: #64748b;
}
/* 专家-同行问答标注 */
.answer-expert-tag {
  font-size: 14px;
  color: #64748b;
  background: #f1f5f9;
  padding: 4px 12px;
  border-radius: 6px;
}

/* 专家编辑标签 */
.edit-answer-tag {
  font-size: 14px;
  color: #2563eb;
  cursor: pointer;
  padding: 4px 12px;
  background: #eff6ff;
  border-radius: 6px;
}
</style>
