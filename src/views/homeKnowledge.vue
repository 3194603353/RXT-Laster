<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import SiteHeader from '@/components/SiteHeader.vue';
import ExpertHeader from '@/components/ExpertHeader.vue'; // 导入专家专属 Header

import type { Knowledge } from '@/utils/types';
import { knowledgeApi } from '@/utils/api';
// 新增：搜索关键字
const searchKeyword = ref('');
const router = useRouter();
const pageNum = ref(1);
const pageSize = ref(10);

// 正确示例（初始化为空数组）
const knowledgeList = ref<Knowledge[]>([]);
const total = ref(0);


// 新增：角色判断相关
const userInfo = ref<any>(null);
// 计算属性：判断是否为专家角色
const isExpert = computed(() => {
  // 未登录/无角色 默认展示普通 Header
  if (!userInfo.value) return false;
  // 匹配后端返回的角色值（注意大小写，和实际返回一致）
  return (userInfo.value.role || '').toLowerCase() === 'expert';
});


const totalPages = computed(() => Math.ceil(total.value / pageSize.value));
// 获取列表数据（完全匹配后端返回格式）
const fetchKnowledgeList = async () => {
  try {
    const res = await knowledgeApi.getPageList(pageNum.value, pageSize.value,searchKeyword.value);
    knowledgeList.value = res.data.records || []; // 后端返回的records数组
    total.value = res.data.total || 0;           // 后端返回的total总条数
  } catch (error) {
    console.error('获取农业知识列表失败：', error);
    knowledgeList.value = [];
    total.value = 0;
  }
};

// 新增：搜索处理函数（重置页码并重新获取数据）
const handleSearch = () => {
  pageNum.value = 1;  // 搜索时重置到第一页
  searchKeyword.value = searchKeyword.value.trim();  // 去除关键字前后空格
  fetchKnowledgeList();
};

const toDetail = (id: number) => {
  console.log('要查找的知识详情的id是', id)
  router.push(`/knowledge/${id}`);
};

const prevPage = () => {
  if (pageNum.value > 1) {
    pageNum.value--;
    fetchKnowledgeList();
  }
};

const nextPage = () => {
  if (pageNum.value < totalPages.value) {
    pageNum.value++;
    fetchKnowledgeList();
  }
};
// 新增：初始化时获取用户信息
onMounted(() => {
  // 从 localStorage 获取登录用户信息（和项目登录逻辑保持一致）
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      userInfo.value = JSON.parse(userStr);
    }
  } catch (err) {
    console.error('解析用户信息失败：', err);
    userInfo.value = null;
  }
  // 原有逻辑
  fetchKnowledgeList();
});
</script>

<template>
  <div>
    <!-- 核心修改：根据角色动态渲染 Header -->
    <ExpertHeader v-if="isExpert" />
    <SiteHeader v-else />
    <div class="knowledge-home">
      <h1>农业知识列表</h1>
      <!-- 新增搜索框 -->
      <div class="search-container">
        <input
          type="text"
          v-model="searchKeyword"
          placeholder="请输入关键词搜索..."
          @keyup.enter="handleSearch"
        >
        <button @click="handleSearch">搜索</button>
      </div>
      <div class="knowledge-card-list">
        <div
          v-for="item in knowledgeList"
          :key="item.knowledgeId"
          class="knowledge-card"
          @click="toDetail(item.knowledgeId)"
        >
          <h3 class="card-title">{{ item.title }}</h3>
          <p class="card-content">{{ item.content.substring(0, 100) }}...</p>
          <div class="card-meta">
            <span>发布者：{{ item.ownName }}</span>
            <span>发布时间：{{item.createTime }}</span>
          </div>
        </div>
      </div>
<!--      <div class="empty-tip" v-if="0 === 0">
        暂无农业知识数据~
      </div>-->
      <div class="pagination" v-if="total > 0">
        <button @click="prevPage" :disabled="pageNum <= 1">上一页</button>
        <span>{{ pageNum }} / {{ totalPages }}</span>
        <button @click="nextPage" :disabled="pageNum >= totalPages">下一页</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.knowledge-home {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}
.knowledge-home h1 {
  color: #2E7D32;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}
.knowledge-card-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}
.knowledge-card {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s;
}
.knowledge-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}
.card-title {
  font-size: 18px;
  margin-bottom: 8px;
}
.card-content {
  color: #666;
  line-height: 1.5;
  margin-bottom: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
.card-meta {
  display: flex;
  justify-content: space-between;
  color: #999;
  font-size: 14px;
}
.empty-tip {
  text-align: center;
  padding: 40px 0;
  color: #999;
}
.pagination {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 20px;
}
.pagination button {
  padding: 6px 12px;
  border: 1px solid #2E7D32;
  background: #fff;
  color: #2E7D32;
  border-radius: 4px;
  cursor: pointer;
}
.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.pagination button:hover:not(:disabled) {
  background: #2E7D32;
  color: #fff;
}
/* 新增搜索框样式 */
.search-container {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  max-width: 600px;
}

.search-container input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.search-container button {
  padding: 8px 16px;
  background: #2E7D32;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.search-container button:hover {
  background: #1B5E20;
}
</style>
