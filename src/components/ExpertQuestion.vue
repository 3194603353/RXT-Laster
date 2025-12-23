<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useRoute } from 'vue-router'; // 新增

import type { Question } from '@/utils/types.ts';
import { questionApi } from '@/utils/api.ts';
import {ElMessageBox, ElMessage } from 'element-plus';

const route = useRoute(); // 新增：获取路由实例

// 接收专家名称
const props = defineProps<{
  expertName: string;
}>();

// 向父组件传递统计更新
const emit = defineEmits<{
  (e: 'update-stats', type: string, value: number): void;
}>();

const router = useRouter();
// 脚本中新增表单实例的 ref（和原 rejectForm 区分）
const rejectForm = ref({ // 表单数据（保留）
  reason: ''
});
// 问题管理变量
const questionSearchKey = ref('');
const pageNum = ref(1);
const pageSize = ref(10);
const questionList = ref<Question[]>([]);
const total = ref(0);
const loading = ref(false);
const totalPages = computed(() => Math.ceil(total.value / pageSize.value));

// 拒绝相关状态
const isRejectDialogVisible = ref(false);
const currentQuestion = ref<Question | null>(null);  // 当前操作的问题

const rejectRules = ref({
  reason: [
    { required: true, message: '请填写拒绝原因', trigger: 'blur' },
    { min: 5, message: '原因至少5个字', trigger: 'blur' }
  ]
});

// 格式化时间
const formatTime = (time: Date | string) => {
  if (!time) return '';
  try {
    return new Date(time).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return e;
  }
};

// 获取问题列表
const fetchExpertQuestions = async () => {
  loading.value = true;
  try {
    const res = await questionApi.getExpertAssignedPage(
      props.expertName,
      questionSearchKey.value,
      pageNum.value,
      pageSize.value
    );
    questionList.value = res.data?.records || [];
    total.value = res.data?.total || 0;
    calculateStats();
  } catch (error) {
    console.error('加载提问列表失败：', error);
    questionList.value = [];
    total.value = 0;
    ElMessage.error('加载提问列表失败，请重试');
  } finally {
    loading.value = false;
  }
};

// 计算统计并通知父组件
const calculateStats = () => {
  const answered = questionList.value.filter(q => q.status === 'answered').length;
  const unanswered = questionList.value.filter(q => q.status === 'unanswered').length;
  const rejected = questionList.value.filter(q => q.status === 'expert_rejected').length;

  emit('update-stats', 'answered', answered);
  emit('update-stats', 'unanswered', unanswered);
  emit('update-stats', 'rejected', rejected); // 可选：传递拒绝数量给父组件

};

// 跳转回答页
const toAnswerPage = (questionId: number | string) => {
  router.push({ path: `/guide/${questionId}` });
};

// 跳转详情
const toDetail = (questionId: number | string) => {
  router.push({ path: `/guide/${questionId}` });
};

// 打开拒绝弹窗
const openRejectDialog = (question: Question) => {
  if (!question || !question.questionId) {
    ElMessage.warning('问题信息异常，无法拒绝');
    return;
  }

  currentQuestion.value = question;
  rejectForm.value = { reason: '' };
  isRejectDialogVisible.value = true;
};

// 专家拒绝回答的点击事件
const confirmRejectQuestion = async () => {
  // 1. 先校验表单
  if (!rejectFormRef.value) return;

  // 新增：校验当前选中的问题
  if (!currentQuestion.value || !currentQuestion.value.questionId) {
    ElMessage.warning('未选中要拒绝的问题');
    return;
  }

  try {
    await rejectFormRef.value.validate(); // 触发表单校验
  } catch (error) {
    // 校验失败则终止
    ElMessage.warning('请按要求填写拒绝原因');
    return;
  }
  try{
    await ElMessageBox.confirm('确定拒绝回答该提问？', '提示', { type: 'warning' });

    // 调用通用状态更新接口，传 statusType = "expertReject"
    const res = await questionApi.updateQuestionStatus({
      questionId: currentQuestion.value?.questionId, // 改这里：从当前选中的问题取 ID（不是 route.params.id）
      statusType: 'expertReject',
      reason: rejectForm.value.reason // 新增：传递拒绝原因给后端
    });

    if (res.code === 200) {
        ElMessage.success('拒绝回答成功');
        // 更新本地列表中的状态
        const target = questionList.value.find(q => q.questionId === currentQuestion.value?.questionId);
        if (target) {
          target.status = 'expert_rejected'; // 同步状态
        }
        // 关闭弹窗 + 刷新列表
        isRejectDialogVisible.value = false;
        fetchExpertQuestions();
      }
  } catch (err) {
    ElMessage.error('拒绝失败，请稍后重试');
  }
};

// 关闭拒绝弹窗
const handleRejectClose = () => {
  isRejectDialogVisible.value = false;
};


// 分页方法
const prevPage = () => {
  if (pageNum.value > 1) {
    pageNum.value--;
    fetchExpertQuestions();
  }
};
const nextPage = () => {
  if (pageNum.value < totalPages.value) {
    pageNum.value++;
    fetchExpertQuestions();
  }
};

// 监听搜索关键词
watch(questionSearchKey, (newVal) => {
  if (newVal === '') {
    pageNum.value = 1;
    fetchExpertQuestions();
  }
});

// 初始化加载
onMounted(() => {
  fetchExpertQuestions();
});
</script>

<template>
  <div class="section">
    <h2 class="section-title">我的被提问管理</h2>
    <div class="search-box">
      <input
        v-model="questionSearchKey"
        placeholder="搜索向我提问（标题/农作物）..."
        class="search-input"
        @keyup.enter="fetchExpertQuestions"
      />
      <button @click="fetchExpertQuestions" class="search-btn">搜索</button>
    </div>

    <div class="question-list" v-loading="loading">
      <div
        class="question-item"
        v-for="item in questionList"
        :key="item.questionId"
        @click="toDetail(item.questionId)"
      >
        <h3 class="item-title">{{ item.title }}</h3>
        <div class="item-meta">
          <span>咨询者：{{ item.questioner || '未知' }}</span>
          <span>农作物：{{ item.plantName || '未知' }}</span>
          <span :class="[
            item.status === 'answered' ? 'status-answered' :
            item.status === 'expert_rejected' ? 'status-rejected' : 'status-unanswered'
          ]">
            {{
              item.status === 'answered' ? '已回答' :
                item.status === 'expert_rejected' ? '已拒绝' : '未回答'
            }}          </span>
          <span>提交时间：{{ formatTime(item.createTime) }}</span>
        </div>
        <p class="item-content">{{ (item.question || '').substring(0, 60) }}...</p>

        <!-- 操作按钮组 -->
        <div class="item-actions">
          <button class="answer-btn" @click.stop="toAnswerPage(item.questionId)">
            {{ item.status === 'answered' ? '查看回答' : '去回答' }}
          </button>
          <!-- 仅未回答问题显示拒绝按钮 -->
          <button
            class="reject-btn"
            @click.stop="openRejectDialog(item)"
            v-if="item.status === 'unanswered'"
          >
          拒绝回答
          </button>
        </div>
      </div>
    </div>

    <div class="empty-tip" v-if="questionList.length === 0 && !loading">
      暂无用户向你提问~
    </div>

    <div class="pagination" v-if="total > 0 && !loading">
      <button @click="prevPage" :disabled="pageNum <= 1">上一页</button>
      <span>{{ pageNum }} / {{ totalPages }}</span>
      <button @click="nextPage" :disabled="pageNum >= totalPages">下一页</button>
    </div>

    <!-- 拒绝回答弹窗 -->
    <el-dialog
      v-model="isRejectDialogVisible"
      title="拒绝回答此问题"
      width="500px"
      :before-close="handleRejectClose"
    >
      <el-form ref="rejectFormRef" :model="rejectForm" :rules="rejectRules" label-width="100px">
        <el-form-item label="拒绝原因" prop="reason">
          <el-input
            type="textarea"
            v-model="rejectForm.reason"
            placeholder="请说明拒绝原因（如：非本领域问题）"
            rows="3"
          ></el-input>
          <p class="form-hint">原因将展示给用户，建议填写清晰以便理解</p>
        </el-form-item>
      </el-form>
      <template #footer>
        <button class="dialog-btn cancel" @click="handleRejectClose">取消</button>
        <button class="dialog-btn confirm" @click="confirmRejectQuestion">确认拒绝</button>
      </template>
    </el-dialog>
  </div>
</template>
<style scoped>
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

.search-box {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.search-input {
  flex: 1;
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

.question-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 30px;
}

.question-item {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  background-color: #fff;
}

.question-item:hover {
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
  border-color: #e0e0e0;
}

.item-title {
  color: #333;
  margin-bottom: 10px;
  font-size: 18px;
  font-weight: 600;
}

.item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 15px 30px;
  color: #999;
  font-size: 13px;
  margin-bottom: 10px;
}

.status-answered {
  color: #4CAF50;
  font-weight: 500;
}

.status-unanswered {
  color: #FF9800;
  font-weight: 500;
}

.item-content {
  color: #666;
  line-height: 1.6;
  font-size: 14px;
  margin-bottom: 15px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-actions {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 10px;
}

.answer-btn {
  padding: 6px 12px;
  background: #2196F3;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
  font-size: 14px;
}

.answer-btn:hover {
  background: #1976D2;
}

.empty-tip {
  text-align: center;
  color: #999;
  padding: 50px 0;
  font-size: 16px;
  background-color: #fff;
  border-radius: 8px;
  margin-bottom: 20px;
}

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
/* 拒绝按钮样式 */
.reject-btn {
  padding: 6px 12px;
  background: #F44336;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
  font-size: 14px;
}

.reject-btn:hover {
  background: #D32F2F;
}

/* 已拒绝状态标签样式 */
.status-rejected {
  color: #F44336;
  font-weight: 500;
}

/* 弹窗样式 */
.dialog-btn {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.dialog-btn.cancel {
  border: 1px solid #ddd;
  background: #fff;
  color: #666;
  margin-right: 10px;
}

.dialog-btn.confirm {
  background: #2E7D32;
  color: #fff;
  border: none;
}

.form-hint {
  margin-top: 5px;
  font-size: 12px;
  color: #999;
  margin-bottom: 0;
}
@media (max-width: 768px) {
  .item-actions {
    position: static;
    margin-top: 10px;
    justify-content: flex-start;
  }
}

</style>
