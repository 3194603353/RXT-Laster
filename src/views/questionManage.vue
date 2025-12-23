<template>
  <div>
    <SiteHeader />
    <div class="manage-page">
      <h1 class="page-title">
        {{ currentRole === 'User' ? '我的提问管理' : '我的被提问管理' }}
      </h1>

      <div class="search-box">
        <input
          v-model="searchKeys"
          :placeholder="currentRole === 'User' ? '搜索我的提问（标题/农作物）...' : '搜索向我提问（标题/农作物）...'"
          class="search-input"
        />
        <button @click="fetchData" class="search-btn">搜索</button>
      </div>

      <!-- 普通用户布局 -->
      <div v-if="currentRole === 'User'">
        <div class="question-list">
          <div
            class="question-item"
            v-for="item in questionList"
            :key="item.questionId"
            @click="toDetail(item.questionId)"
          >
            <h3 class="item-title">{{ item.title }}</h3>
            <div class="item-meta">
              <span>农作物：{{ item.plantName }}</span>
              <span>对接专家：{{ item.expertName || '暂未分配' }}</span>
              <span :class="item.status === 1 ? 'status-answered' : 'status-unanswered'">
                {{ item.status === 1 ? '已回答' : '未回答' }}
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
        <div class="empty-tip" v-if="questionList.length === 0 && !loading">
          暂无自己的提问~
        </div>
      </div>

      <!-- 专家布局 -->
      <div v-if="currentRole === 'expert'">
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
              <span :class="item.status === 1 ? 'status-answered' : 'status-unanswered'">
                {{ item.status === 1 ? '已回答' : '未回答' }}
              </span>
              <span>提交时间：{{ formatTime(item.createTime) }}</span>
            </div>
            <p class="item-content">{{ item.question.substring(0, 60) }}...</p>
            <div class="item-actions">
              <button
                class="answer-btn"
                @click.stop="toAnswerPage(item.questionId)"
              >
                {{ item.status === 1 ? '查看回答' : '去回答' }}
              </button>
            </div>
          </div>
        </div>
        <div class="empty-tip" v-if="questionList.length === 0 && !loading">
          暂无用户向你提问~
        </div>
      </div>

      <div class="pagination" v-if="total > 0 && !loading">
        <button @click="prevPage" :disabled="pageNum <= 1">上一页</button>
        <span>{{ pageNum }} / {{ totalPages }}</span>
        <button @click="nextPage" :disabled="pageNum >= totalPages">下一页</button>
      </div>
    </div>
  </div>
</template>

<!--
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import SiteHeader from '@/components/SiteHeader.vue';
import type { Question } from '@/utils/types.ts';
import { questionApi } from '@/utils/api.ts';
import { ElMessage, ElMessageBox } from 'element-plus';

const router = useRouter();

// 1. 核心：存储用户名和角色（无泛型，手动解析）
const currentUserName = ref('');
const currentRole = ref<'user' | 'expert'>('user');

// 2. 分页与数据存储（不变）
const searchKeys = ref('');
const pageNum = ref(1);
const pageSize = ref(10);
const questionList = ref<Question[]>([]);
const total = ref(0);
const loading = ref(false);
const totalPages = computed(() => Math.ceil(total.value / pageSize.value));

// 3. 格式化时间（不变）
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

// 4. 初始化：查角色→加载数据（适配无泛型接口）
const initPage = async () => {
  loading.value = true;
  try {
   /* /!*!// 第一步：获取本地存储的用户名（登录时存入）
    const localUsername = localStorage.getItem('username');
    if (!localUsername) {
      router.push('/login');
      return;
    }*!/
    /!*!//下面这是测试用的
    currentUserName.value = "zwr";*!/
    // 第二步：调用无泛型接口，查角色（res.data.data 中取 role）
/!*
    const roleRes = await userApi.getUserRole();
*!/
    // 手动解析：无泛型 Result，数据在 data.data 中
    const role = roleRes.data.data.role as 'user' | 'expert';
    currentRole.value = role;
*/
    // 第三步：加载对应数据
    await fetchData();
  } catch (error) {
    console.error('页面初始化失败：', error);
    ElMessage.error('加载失败，请重试');
  } finally {
    loading.value = false;
  }
};

// 5. 加载数据（适配无泛型接口，手动解析 records 和 total）
const fetchData = async () => {
  loading.value = true;
  try {
    let res;
    if (currentRole.value === 'user') {
      // 普通用户：调用无泛型接口
      res = await questionApi.getUserQuestionPage({
        username: currentUserName.value,
        keyword: searchKeys.value,
        pageNum: pageNum.value,
        pageSize: pageSize.value
      });
    } else {
      // 专家：调用无泛型接口
      res = await questionApi.getExpertAssignedPage({
        expertName: currentUserName.value,
        keyword: searchKeys.value,
        pageNum: pageNum.value,
        pageSize: pageSize.value
      });
    }

    // 手动解析数据：无泛型 Result 返回 Map，取 records 和 total
    const data = res.data.data;
    questionList.value = data.records as Question[]; // 强制类型转换
    total.value = data.total as number;
  } catch (error) {
    console.error('加载数据失败：', error);
    questionList.value = [];
    total.value = 0;
    ElMessage.error('加载失败，请重试');
  } finally {
    loading.value = false;
  }
};

// 6. 删除提问（适配无泛型接口）
const deleteQuestion = async (questionId: number) => {

// 正确代码：
  ElMessageBox.confirm(
    '确定要删除该提问吗？删除后不可恢复！',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(async () => {
    try {
      // 调用无泛型删除接口
      const res = await questionApi.deleteQuestion(questionId);
      // 无泛型接口直接判断成功/失败（根据后端 Result 格式）
      if (res.data.success) { // 假设 Result 有 success 字段标识状态
        ElMessage.success('删除成功');
        fetchData();
      } else {
        ElMessage.error(res.data.message || '删除失败');
      }
    } catch (error) {
      console.error('删除失败：', error);
      ElMessage.error('删除失败，请重试');
    }
  }).catch(() => {});
};

// 7. 跳转相关方法（不变）
const toAnswerPage = (questionId: number) => {
  router.push({ path: '/guide/:id', query: { questionId } });
};

const toDetail = (questionId: number) => {
  router.push(`/guide/${questionId}`);
};

// 8. 分页操作（不变）
const prevPage = () => {
  if (pageNum.value > 1) {
    pageNum.value&#45;&#45;;
    fetchData();
  }
};
const nextPage = () => {
  if (pageNum.value < totalPages.value) {
    pageNum.value++;
    fetchData();
  }
};

// 页面初始化
onMounted(() => {
  initPage();
});
</script>
-->

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import SiteHeader from '@/components/SiteHeader.vue';
import type { Question } from '@/utils/types.ts';
import { questionApi } from '@/utils/api.ts';
import { ElMessage, ElMessageBox } from 'element-plus';

const router = useRouter();

// 2. 分页与数据存储（不变）
const searchKeys = ref('');
const pageNum = ref(1);
const pageSize = ref(10);

const questionList = ref<Question[]>([]);
const total = ref(0);
const loading = ref(false);
const totalPages = computed(() => Math.ceil(total.value / pageSize.value));
// 第一步：获取用户信息（从后端接口）

const userStr = localStorage.getItem('user'); // 获取存储的用户对象字符串
const user = userStr ? JSON.parse(userStr) : null; // 解析为对象
const userName = user?.userName; // 提取用户名（注意可选链判断，避免null报错）

// 1. 存储用户名和角色
const currentRole = user?.role;

// 3. 格式化时间（不变）
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

// 4. 初始化：获取用户信息→判断角色→加载数据
const initPage = async () => {
  loading.value = true;
  try {
    if (!userName) {
      // 未登录或获取失败，跳转到登录页
/*
      await router.push('/login');
*/
      console.error('未登录或获取用户信息失败：', userRes.data.message);
      return;
    }

    // 第三步：加载对应数据
    await fetchData();
  } catch (error) {
    console.error('页面初始化失败：', error);
    ElMessage.error('加载失败，请重试');
  } finally {
    loading.value = false;
  }
};

// 5. 加载数据（根据角色调用不同接口）
const fetchData = async () => {
  loading.value = true;
  console.log('传递的 username：', userName); // 若为 undefined 或空字符串，会导致报错
  try {
    const res = await questionApi.getSelfQuestionPage(
      userName, searchKeys.value, pageNum.value, pageSize.value);

    // 解析接口返回数据
    if (res) {
      console.log('接口返回数据：', res.data);
      questionList.value = res.data.data.records as Question[];
      total.value = res.data.data.total as number;
    } else {
      questionList.value = [];
      total.value = 0;
    }
  } catch (error) {
    console.error('加载数据失败：', error);
    questionList.value = [];
    total.value = 0;
    ElMessage.error('加载失败，请重试');
  } finally {
    loading.value = false;
  }
};

// 6. 删除提问（修正接口判断逻辑）
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
      // 根据后端Result格式判断（code=200为成功）
      if (res.data.code === 200) {
        ElMessage.success('删除成功');
        fetchData(); // 重新加载数据
      } else {
        ElMessage.error(res.data.msg || '删除失败');
      }
    } catch (error) {
      console.error('删除失败：', error);
      ElMessage.error('删除失败，请重试');
    }
  }).catch(() => {});
};

// 7. 跳转相关方法（不变）
const toAnswerPage = (questionId: number) => {
  router.push({ path: `/guide/${questionId}` }); };

const toDetail = (questionId: number) => {
  router.push(`/guide/${questionId}`);
};

// 8. 分页操作（不变）
const prevPage = () => {
  if (pageNum.value > 1) {
    pageNum.value--;
    fetchData();
  }
};
const nextPage = () => {
  if (pageNum.value < totalPages.value) {
    pageNum.value++;
    fetchData();
  }
};

// 页面初始化
onMounted(() => {
  initPage();
});
</script>
<style scoped>
/* 样式部分完全不变，无需修改 */
.manage-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
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
