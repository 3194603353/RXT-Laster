<script setup lang="ts">
import { ref, onMounted, computed, watch,nextTick } from 'vue'; // 新增 nextTick 导入
import { useRouter, useRoute } from 'vue-router';
import SiteHeader from '../components/SiteHeader.vue';
import ExpertHeader from '@/components/ExpertHeader.vue'; // 导入专家专属 Header

import type { Question, Expert } from '@/utils/types.ts';
import { expertApi, questionApi } from '@/utils/api.ts';
import { ElMessage, ElMessageBox } from 'element-plus';

const router = useRouter();
const route = useRoute();

// 1. 核心修改：监听路由参数自动切换到专家预约标签
const activeTab = ref<'question' | 'expert' | 'myQuestion'>('question');
// 定义专家预约模块的DOM引用
const expertModuleRef = ref<HTMLDivElement | null>(null);

// 用户信息
const userStr = localStorage.getItem('user');
const user = userStr ? JSON.parse(userStr) : null;
const userName = user?.userName;

// 核心：判断是否为专家角色
const isExpert = computed(() => {
  if (!user) return false;
  return (user.role || '').toLowerCase() === 'expert';
});
// 问答模块
const searchKeys = ref('');
const pageNum = ref(1);
const pageSize = ref(10);
const questionList = ref<Question[]>([]);
const questionTotal = ref(0);
const loading = ref<boolean>(false);
const totalPages = computed(() => Math.ceil(questionTotal.value / pageSize.value));

// 我的提问管理模块
const myQuestionSearchKeys = ref('');
const myQuestionPageNum = ref(1);
const myQuestionPageSize = ref(10);
const myQuestionList = ref<Question[]>([]);
const myQuestionTotal = ref(0);
const myQuestionLoading = ref(false);
const myQuestionTotalPages = computed(() => Math.ceil(myQuestionTotal.value / myQuestionPageSize.value));

// 专家模块
const expertSearchKeys = ref('');
const expertPageNum = ref(1);
const expertPageSize = ref(10);
const expertList = ref<Expert[]>([]);
const expertTotal = ref(0);
const expertLoading = ref<boolean>(false);
const expertTotalPages = computed(() => Math.ceil(expertTotal.value / expertPageSize.value));

// 格式化时间
const formatTime = (time: Date | string) => {
  if (!time) return '';
  return new Date(time).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 获取公共问答列表
const fetchQuestionList = async () => {
  // 新增：关键词去空格
  const trimedKeys = searchKeys.value.trim();
  console.log('最终搜索关键词：', trimedKeys); // 验证去空格后的值
  loading.value = true;
  try {
    const res = await questionApi.getQuestionPage(trimedKeys, pageNum.value, pageSize.value);
    questionList.value = res.data.records;
    questionTotal.value = res.data.total || 0;
  } catch (error) {
    console.error('获取问答列表失败：', error);
    questionList.value = [];
    questionTotal.value = 0;
  } finally {
    loading.value = false;
  }
};

// 获取我的提问列表
const fetchMyQuestionList = async () => {
  if (!userName) return;
  myQuestionLoading.value = true;
  try {
    const res = await questionApi.getSelfQuestionPage(
      userName,
      myQuestionSearchKeys.value,
      myQuestionPageNum.value,
      myQuestionPageSize.value
    );
    myQuestionList.value = res.data.records as Question[];
    myQuestionTotal.value = res.data.total as number;
  } catch (error) {
    console.error('加载我的提问失败：', error);
    myQuestionList.value = [];
    myQuestionTotal.value = 0;
    ElMessage.error('加载失败，请重试');
  } finally {
    myQuestionLoading.value = false;
  }
};

// 获取专家列表
const fetchExpertList = async () => {
  expertLoading.value = true;
  try {
    const res = await expertApi.getExpertPage(expertSearchKeys.value, expertPageNum.value, expertPageSize.value);
    expertList.value = res.data.records;
    expertTotal.value = res.data.total || 0;
  } catch (error) {
    console.error('获取专家列表失败：', error);
    expertList.value = [];
    expertTotal.value = 0;
  } finally {
    expertLoading.value = false;
  }
};

// 滚动到专家预约模块的方法
const scrollToExpertModule = () => {
  if (expertModuleRef.value) {
    // 平滑滚动到模块位置
    expertModuleRef.value.scrollIntoView({
      behavior: 'smooth',
      block: 'start' // 滚动到模块顶部
    });
  }
};

// 删除提问
const deleteQuestion = async (questionId: number) => {
  ElMessageBox.confirm(
    '确定要删除该提问吗？删除后不可恢复！',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(async () => {
    try {
      const res = await questionApi.deleteQuestion(questionId);
      if (res.data) {
        ElMessage.success('删除成功');
        await fetchMyQuestionList();
      } else {
        ElMessage.error(res.data.msg );
      }
    } catch (error) {
      ElMessage.error('删除失败，请重试');
    }
  }).catch(() => {});
};

// 页面跳转方法
const toDetail = (questionId: number) => {
  router.push(`/guide/${questionId}`);
};

const toAddQuestion = (expertUsername: string) => {
  if (!userName) {
    ElMessage.warning('请先登录');
    return;
  }
  router.push({ path: '/addQuestion', query: { expertUsername } });
};

// 新增"线下问答“跳转方法
const toAppointExpert = (expertUsername: string) => {
  if (!userName) {
    ElMessage.warning('请先登录');
    return;
  }
  router.push({ path: '/appointExpert', query: { expertUsername } });
};

// 新增：跳转到我的预约页面
const toMyAppointment = () => {
  router.push('/myAppointment'); // 对应之前创建的独立页面路由
};

// 分页方法
const prevPage = () => {
  if (pageNum.value > 1) {
    pageNum.value--;
    fetchQuestionList();
  }
};

const nextPage = () => {
  if (pageNum.value < totalPages.value) {
    pageNum.value++;
    fetchQuestionList();
  }
};

const prevMyQuestionPage = () => {
  if (myQuestionPageNum.value > 1) {
    myQuestionPageNum.value--;
    fetchMyQuestionList();
  }
};

const nextMyQuestionPage = () => {
  if (myQuestionPageNum.value < myQuestionTotalPages.value) {
    myQuestionPageNum.value++;
    fetchMyQuestionList();
  }
};

const prevExpertPage = () => {
  if (expertPageNum.value > 1) {
    expertPageNum.value--;
    fetchExpertList();
  }
};

const nextExpertPage = () => {
  if (expertPageNum.value < expertTotalPages.value) {
    expertPageNum.value++;
    fetchExpertList();
  }
};

// 页面初始化
onMounted(() => {
  // 专家默认选中同行问答
  if (isExpert.value) {
    activeTab.value = 'question';
  }
  fetchQuestionList();
  if (userName) fetchMyQuestionList();
  fetchExpertList();

  // 初始化时检查参数，切换标签+滚动
  if (route.query.scrollToExpert === '1') {
    activeTab.value = 'expert';
    nextTick(() => {
      scrollToExpertModule();
    });
  }
  // 读取sessionStorage中的标识
  const scrollToExpert = sessionStorage.getItem('scrollToExpert');
  if (scrollToExpert === '1') {
    // 切换到专家预约标签
    activeTab.value = 'expert';
    // 页面渲染完成后滚动到专家模块
    nextTick(() => {
      scrollToExpertModule();
    });
    // 立即清除标识（避免重复执行）
    sessionStorage.removeItem('scrollToExpert');
  }
  // 新增：监听路由变化，从详情页返回时刷新我的提问列表
  watch(
    () => route.fullPath,
    (newPath, oldPath) => {
      // 当从详情页（/guide/:id）返回当前页面时，刷新列表
      if (oldPath.includes('/guide/') && newPath === route.fullPath) {
        fetchMyQuestionList();
      }
    }
  );
});
</script>

<template>
  <div>
    <!-- 核心修改：专家显示 ExpertHeader，普通用户显示 SiteHeader -->
    <ExpertHeader v-if="isExpert" />
    <SiteHeader v-else />
    <div class="simple-page">
      <div class="tab-header">
        <!-- 专家：仅显示「同行问答」 -->
        <button
          v-if="isExpert"
          :class="{ active: activeTab === 'question' }"
          @click="activeTab = 'question'"
          style="display: none;"
        >
          同行问答
        </button>
        <!-- 普通用户：显示原有所有标签 -->
        <template v-else>
          <button :class="{ active: activeTab === 'question' }" @click="activeTab = 'question'">
            在线问答
          </button>
          <button :class="{ active: activeTab === 'expert' }" @click="activeTab = 'expert'">
            专家预约
          </button>
          <button :class="{ active: activeTab === 'myQuestion' }" @click="activeTab = 'myQuestion'">
            我的提问管理
          </button>
          <button
            :class="{ active: activeTab === 'myAppointment' }"
            @click="toMyAppointment"
          >
            我的预约管理
          </button>
        </template>
      </div>

      <div class="tab-content">
        <!-- 公共问答列表 -->
        <div v-if="activeTab === 'question'">
          <div class="search-box">
            <input
              v-model="searchKeys"
              placeholder="输入关键词搜索问答（标题/农作物）..."
              class="search-input"
            />
            <button @click="fetchQuestionList" class="search-btn">搜索</button>
          </div>

          <div class="question-list">
            <div
              class="question-item"
              v-for="item in questionList"
              :key="item.questionId"
              @click="toDetail(item.questionId)"
            >
              <h3 class="item-title">{{ item.title }}</h3>
              <div class="item-meta">
                <span>咨询者：{{ item.questioner }}</span>
                <span>农作物：{{ item.plantName }}</span>
                <span :class="[
                  item.status === 'answered' ? 'status-answered' :
                  item.status === 'user_canceled' ? 'status-canceled' : 'status-unanswered'
                  ]">
                    {{
                        item.status === 'answered' ? '已回答' :
                        item.status === 'user_canceled' ? '已取消' : '未回答'
                     }}
                </span>
              </div>
              <p class="item-content">{{ item.question.substring(0, 80) }}...</p>
            </div>
          </div>

          <div class="empty-tip" v-if="questionList.length === 0 && !loading">
            暂无相关问答数据~
          </div>

          <div class="pagination" v-if="questionTotal > 0">
            <button @click="prevPage" :disabled="pageNum <= 1">上一页</button>
            <span>{{ pageNum }} / {{ totalPages }}</span>
            <button @click="nextPage" :disabled="pageNum >= totalPages">下一页</button>
          </div>
        </div>

        <!-- 专家预约列表：添加ref引用用于滚动定位 -->
        <div v-if="activeTab === 'expert'" ref="expertModuleRef">
          <div class="search-box">
            <input
              v-model="expertSearchKeys"
              placeholder="输入关键词搜索专家（姓名/专业）..."
              class="search-input"
            />
            <button @click="fetchExpertList" class="search-btn">搜索</button>
          </div>

          <div class="expert-list">
            <div class="expert-card" v-for="item in expertList" :key="item.userName">
              <h3 class="card-name">{{ item.realName }}</h3>
              <div class="card-info">
                <p><i class="iconfont">📌</i> 职称：{{ item.position }}</p>
                <p><i class="iconfont">🔬</i> 专业领域：{{ item.profession }}</p>
                <p><i class="iconfont">🏢</i> 单位：{{ item.belong }}</p>
                <p><i class="iconfont">📞</i> 电话：{{ item.phone }}</p>
              </div>
              <div class="card-actions">
                <button @click="toAddQuestion(item.userName)" class="question-btn">向我提问</button>
                <button @click="toAppointExpert(item.userName)" class="appoint-btn">线下预约</button>
              </div>
            </div>
          </div>

          <div class="empty-tip" v-if="expertList.length === 0 && !expertLoading">
            暂无相关专家数据~
          </div>

          <div class="pagination" v-if="expertTotal > 0">
            <button @click="prevExpertPage" :disabled="expertPageNum <= 1">上一页</button>
            <span>{{ expertPageNum }} / {{ expertTotalPages }}</span>
            <button @click="nextExpertPage" :disabled="expertPageNum >= expertTotalPages">下一页</button>
          </div>
        </div>

        <!-- 我的提问管理 -->
        <div v-if="activeTab === 'myQuestion'">
          <h1 class="page-title">我的提问管理</h1>

          <div class="search-box">
            <input
              v-model="myQuestionSearchKeys"
              placeholder="搜索我的提问（标题/农作物）..."
              class="search-input"
            />
            <button @click="fetchMyQuestionList" class="search-btn">搜索</button>
          </div>

          <div class="question-list">
            <div
              class="question-item"
              v-for="item in myQuestionList"
              :key="item.questionId"
              @click="toDetail(item.questionId)"
            >
              <h3 class="item-title">{{ item.title }}</h3>
              <div class="item-meta">
                <span>农作物：{{ item.plantName }}</span>
                <span>对接专家：{{ item.expertName || '暂未分配' }}</span>
                <span :class="[
                  item.status === 'answered' ? 'status-answered' :
                  item.status === 'user_canceled' ? 'status-canceled' : 'status-unanswered'
                ]">
                  {{
                        item.status === 'answered' ? '已回答' :
                        item.status === 'user_canceled' ? '已取消' : '未回答'
                  }}
                </span>
                <span>提交时间：{{ formatTime(item.createTime) }}</span>
              </div>
              <p class="item-content">{{ item.question.substring(0, 60) }}...</p>
              <div class="item-actions">
                <button class="delete-btn" @click.stop="deleteQuestion(item.questionId)">
                  删除提问
                </button>
              </div>
            </div>
          </div>

          <div class="empty-tip" v-if="myQuestionList.length === 0 && !myQuestionLoading">
            暂无自己的提问~
          </div>

          <div class="pagination" v-if="myQuestionTotal > 0 && !myQuestionLoading">
            <button @click="prevMyQuestionPage" :disabled="myQuestionPageNum <= 1">上一页</button>
            <span>{{ myQuestionPageNum }} / {{ myQuestionTotalPages }}</span>
            <button @click="nextMyQuestionPage" :disabled="myQuestionPageNum >= myQuestionTotalPages">下一页</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 保留原样式并优化 */
.simple-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.tab-header {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
}

.tab-header button {
  padding: 12px 25px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s;
}

.tab-header button.active {
  background: #2E7D32;
  color: #fff;
  border-color: #2E7D32;
}

/* 我的预约管理按钮样式统一 */
.tab-header .sub-btn {
  padding: 12px 25px;
  border: 1px solid #2E7D32;
  color: #2E7D32;
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s;
}

.tab-header .sub-btn:hover {
  background: #f5f5f5;
}

.page-title {
  color: #333;
  font-size: 22px;
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.search-box {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.search-input {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
}
.status-canceled {
  color: #94a3b8;
  background: #f8fafc;
}
.search-btn {
  padding: 12px 20px;
  background: #2E7D32;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s;
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
}

.question-item:hover {
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
}

.item-title {
  color: #333;
  margin-bottom: 10px;
  font-size: 18px;
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
}

.status-unanswered {
  color: #FF9800;
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

.delete-btn {
  padding: 6px 12px;
  background: #f44336;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
  font-size: 14px;
}

.delete-btn:hover {
  background: #d32f2f;
}

.expert-list {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 30px;
}

.expert-card {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 20px;
  transition: all 0.3s;
  width: calc(50% - 10px);
  box-sizing: border-box;
}

.expert-card:hover {
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
}

.card-name {
  color: #333;
  margin-bottom: 15px;
  font-size: 18px;
}

.card-info {
  color: #666;
  margin-bottom: 20px;
  line-height: 1.8;
  font-size: 14px;
}

.card-info i {
  margin-right: 5px;
}

.card-actions {
  display: flex;
  gap: 10px;
}

.question-btn {
  background: #2E7D32;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
}

.question-btn:hover {
  background: #1B5E20;
}

.appoint-btn {
  border: 1px solid #2E7D32;
  color: #2E7D32;
  background: #fff;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.appoint-btn:hover {
  background: #f5f5f5;
}

.empty-tip {
  text-align: center;
  color: #999;
  padding: 50px 0;
  font-size: 16px;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
}

.pagination button {
  padding: 8px 16px;
  border: 1px solid #2E7D32;
  background: #fff;
  color: #2E7D32;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
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
}
</style>
