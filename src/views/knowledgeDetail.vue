<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ElMessage,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElSelect,
  ElOption,
  ElMessageBox,
} from 'element-plus'
import SiteHeader from '@/components/SiteHeader.vue'
import type { Knowledge, Discuss } from '@/utils/types'
import { knowledgeApi, discussApi } from '@/utils/api'
import ExpertHeader from '@/components/expertHeader.vue' // 确保已导入

const route = useRoute()
const router = useRouter()

// 路由参数处理：优化校验逻辑
const knowledgeId = Number(route.params.id)
if (isNaN(knowledgeId) || knowledgeId <= 0) {
  console.error('知识ID无效，当前路由参数：', route.params.id)
  ElMessage.error('无效的知识ID')
  router.push('/knowledge').catch(err => console.error('路由跳转失败：', err))
}

// 新增评论加载状态（可选，优化体验）
const discussLoading = ref(false)
const activeDiscussId = ref<number | null>(null);

// 核心数据
const knowledgeDetail = ref<Knowledge>()
const discussList = ref<Discuss[]>([])
const allDiscussList = ref<Discuss[]>([]) // 存储原始评论列表（用于排序）
const discussContent = ref('')
const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
const currentUserName = currentUser.userName || ''
const tabType = ref<'all' | 'my'>('all') // 默认显示全部评论

// 用户信息：补充初始化逻辑（核心！之前未赋值）
const userInfo = ref<any>(localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null);

// 计算属性：判断是否为专家角色
const isExpert = computed(() => {
  // 未登录/无角色 默认展示普通 Header
  if (!userInfo.value) return false;
  // 匹配后端返回的角色值（注意大小写，和实际返回一致）
  return (userInfo.value.role || '').toLowerCase() === 'expert';
});

// 评论排序相关
const sortType = ref<'desc' | 'asc'>('desc') // 默认按创建时间降序
const sortOptions = [
  { label: '最新评论', value: 'desc' },
  { label: '最早评论', value: 'asc' },
]

// 我的评论管理
const myDiscussList = computed(() => {
  return allDiscussList.value.filter((item) => item.ownName === currentUserName)
})
// 新增：我的评论的排序计算属性
const sortedMyDiscussList = computed(() => {
  const myList = [...myDiscussList.value] // 基于我的评论列表排序
  return myList.sort((a, b) => {
    const timeA = new Date(a.createTime).getTime()
    const timeB = new Date(b.createTime).getTime()
    return sortType.value === 'desc' ? timeB - timeA : timeA - timeB
  })
})
const editDialogVisible = ref(false)
const currentEditDiscuss = ref<Discuss>({
  discussId: 0,
  knowledgeId: knowledgeId,
  ownName: currentUserName,
  content: '',
  createTime: '',
})

// 计算属性：排序后的评论列表
const sortedDiscussList = computed(() => {
  const list = [...allDiscussList.value]
  return list.sort((a, b) => {
    const timeA = new Date(a.createTime).getTime()
    const timeB = new Date(b.createTime).getTime()
    return sortType.value === 'desc' ? timeB - timeA : timeA - timeB
  })
})

// 获取知识详情
const fetchKnowledgeDetail = async () => {
  try {
    const res = await knowledgeApi.getDetail(knowledgeId)
    knowledgeDetail.value = res.data || {}
  } catch (error) {
    ElMessage.error('获取知识详情失败')
    console.error('知识详情接口错误：', error)
    knowledgeDetail.value = {} // 异常时赋值空对象，避免页面一直加载
  }
}

// 监听标签切换：仅更新列表，无提示
watch(tabType, () => {
  updateDiscussList()
})

// 获取讨论列表
async function fetchDiscussList() {
  discussLoading.value = true
  try {
    const res = await discussApi.getDiscussList(knowledgeId, 1, 100)
    const records = res.data?.records || []
    allDiscussList.value = records
    updateDiscussList() // 仅更新列表，不弹提示
  } catch (error) {
    ElMessage.error('获取评论列表失败')
    console.error('评论接口错误：', error)
    allDiscussList.value = []
    discussList.value = []
  } finally {
    discussLoading.value = false
  }
}

// 新增：纯更新列表（无提示）
const updateDiscussList = () => {
  if (tabType.value === 'all') {
    discussList.value = sortedDiscussList.value
  } else {
    discussList.value = sortedMyDiscussList.value
  }
}

// 修改：仅切换排序下拉框时调用（带提示）
const handleSortChange = () => {
  updateDiscussList() // 先更新列表
  // 仅当列表有数据时才显示提示
  if (discussList.value.length > 0) {
    ElMessage.success(`已按${sortType.value === 'desc' ? '最新' : '最早'}排序`)
  }
}

// 发布讨论
const postDiscuss = async () => {
  if (!discussContent.value.trim()) {
    ElMessage.warning('请输入评论内容')
    return
  }
  if (!currentUserName) {
    ElMessage.warning('请先登录后再发布评论')
    return
  }
  // 发布讨论时的时间格式化函数修改
  const formatTime = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    // 日期和时间之间用 'T' 分隔（ISO标准格式）
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  try {
    await discussApi.postDiscuss({
      knowledgeId,
      ownName: currentUserName,
      content: discussContent.value,
      createTime: formatTime(new Date())
    });
    ElMessage.success('评论发布成功');
    discussContent.value = '';
    await fetchDiscussList();
  } catch (error) {
    ElMessage.error('发布评论失败')
    console.error(error)
  }
}

// 打开编辑评论弹窗
const openEditDialog = (discuss: Discuss) => {
  currentEditDiscuss.value = { ...discuss }
  editDialogVisible.value = true
}

// 保存编辑的评论
const saveEditDiscuss = async () => {
  if (!currentEditDiscuss.value.content.trim()) {
    ElMessage.warning('评论内容不能为空')
    return
  }

  try {
    await discussApi.updateDiscuss({
      discussId: currentEditDiscuss.value.discussId,
      content: currentEditDiscuss.value.content,
    })
    ElMessage.success('评论修改成功')
    editDialogVisible.value = false
    await fetchDiscussList()
  } catch (error) {
    ElMessage.error('修改评论失败')
    console.error(error)
  }
}

// 删除评论
const handleDeleteDiscuss = async (discussId: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这条评论吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await discussApi.deleteDiscuss(discussId)
    ElMessage.success('评论删除成功')
    await fetchDiscussList()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除评论失败')
      console.error(error)
    }
  }
}

// 初始化
onMounted(() => {
  // 并行请求，提升效率
  Promise.all([
    fetchKnowledgeDetail(),
    fetchDiscussList()
  ]).catch(error => {
    console.error('初始化数据失败：', error)
  })
  // 未登录提示
  if (!currentUserName) {
    ElMessage.info('登录后可发布和管理您的评论')
  }

  // 监听路由变化（可选，防止参数变化导致页面异常）
  watch(() => route.params.id, (newId) => {
    const newKnowledgeId = Number(newId)
    if (!isNaN(newKnowledgeId) && newKnowledgeId !== knowledgeId) {
      location.reload() // 简单粗暴：参数变化时刷新页面
      // 或调用 fetchKnowledgeDetail() + fetchDiscussList() 重新加载数据
    }
  })
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    // 若点击的不是评论项/操作按钮，关闭侧滑
    if (!target.closest('.discuss-item-wrapper')) {
      activeDiscussId.value = null;
    }
  });
});
</script>

<template>
  <div class="knowledge-detail-page">
    <!-- 核心：根据角色动态渲染 Header（专家显示ExpertHeader，普通用户显示SiteHeader） -->
    <component :is="isExpert ? ExpertHeader : SiteHeader" />

    <!-- 返回按钮 -->
    <div class="back-btn-container">
      <button class="back-btn" @click="router.back()">← 返回</button>
    </div>

    <!-- 知识详情 -->
    <div class="knowledge-detail" v-if="knowledgeDetail">
      <h1 class="knowledge-title">{{ knowledgeDetail.title }}</h1>

      <div class="detail-meta">
        <div class="meta-info">
          <span class="meta-item">发布者：{{ knowledgeDetail.ownName }}</span>
          <span class="meta-item">发布时间：{{ knowledgeDetail.createTime }}</span>
        </div>
        <div class="meta-img" v-if="knowledgeDetail.picPath">
          <img :src="knowledgeDetail.picPath" class="knowledge-img" alt="知识图片" />
        </div>
      </div>

      <div class="detail-content" v-html="knowledgeDetail.content"></div>

      <!-- 评论区 -->
      <div class="discuss-section">
        <div class="discuss-header">
          <h2 class="discuss-title">评论区</h2>

          <!-- 评论排序 -->
          <div class="sort-container">
            <span class="sort-label">排序：</span>
            <ElSelect
              v-model="sortType"
              @change="handleSortChange"
              size="small"
              class="sort-select"
            >
              <ElOption
                v-for="option in sortOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </ElSelect>
          </div>
        </div>

        <!-- 我的评论 Tab -->
        <div class="discuss-tabs" v-if="currentUserName">
          <button class="tab-btn" :class="{ active: tabType === 'all' }" @click="tabType = 'all'">
            全部评论 ({{ allDiscussList.length }})
          </button>
          <button class="tab-btn" :class="{ active: tabType === 'my' }" @click="tabType = 'my'">
            我的评论 ({{ myDiscussList.length }})
          </button>
        </div>

        <div class="discuss-list">
          <!-- 评论加载中 -->
          <div class="loading" v-if="discussLoading">
            <div class="loading-spinner"></div>
            <p>评论加载中...</p>
          </div>
          <!-- 评论空状态 -->
          <div class="empty-discuss" v-else-if="discussList.length === 0">
            <div class="empty-icon">💬</div>
            <p>暂无评论，快来发表你的看法吧~</p>
          </div>

          <!-- 全部评论 -->
          <!-- 外层容器：控制溢出隐藏 + 点击事件 -->
          <div
            class="discuss-item-wrapper"
            v-for="item in discussList"
            :key="item.discussId"
            @click="item.ownName === currentUserName ? (activeDiscussId = item.discussId) : null"
          >
          <!-- 评论内容区：可滑动 -->
          <div class="discuss-item" :class="{ active: activeDiscussId === item.discussId && item.ownName === currentUserName}">
            <div class="discuss-header">
              <span class="discuss-owner">{{ item.ownName }}</span>
              <span class="discuss-time">
        {{ item.updateTime || item.createTime }}
        <span v-if="item.updateTime" style="font-size:11px;color:#ccc;">(已编辑)</span>
      </span>
            </div>
            <div class="discuss-content">{{ item.content }}</div>
          </div>

          <!-- 操作按钮区：初始隐藏在右侧 -->
          <div class="discuss-actions" v-if="item.ownName === currentUserName">
            <button class="action-btn edit-btn" @click.stop="openEditDialog(item)">编辑</button>
            <button class="action-btn delete-btn" @click.stop="handleDeleteDiscuss(item.discussId)">删除</button>
          </div>
        </div>
      </div>

        <!-- 发布评论 -->
        <div class="discuss-post" v-if="currentUserName">
          <textarea
            v-model="discussContent"
            placeholder="请输入你的讨论..."
            rows="3"
            class="discuss-textarea"
            :disabled="!currentUserName"
          ></textarea>
          <button class="post-btn" @click="postDiscuss" :disabled="!discussContent.trim()">
            发布评论
          </button>
        </div>

        <!-- 未登录提示 -->
        <div class="login-tip" v-else>
          <p>请<a @click="router.push('/login')" class="login-link">登录</a>后发布评论</p>
        </div>
      </div>
    </div>

    <!-- 加载中 -->
    <div class="loading" v-else>
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 编辑评论弹窗 -->
    <ElDialog title="编辑我的评论" v-model="editDialogVisible" width="500px" destroy-on-close>
      <ElForm :model="currentEditDiscuss" label-width="0px">
        <ElFormItem prop="content">
          <ElInput
            v-model="currentEditDiscuss.content"
            type="textarea"
            rows="4"
            placeholder="请修改你的评论内容..."
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <button class="dialog-btn cancel-btn" @click="editDialogVisible = false">取消</button>
        <button class="dialog-btn confirm-btn" @click="saveEditDiscuss">保存修改</button>
      </template>
    </ElDialog>
  </div>

</template>

<style scoped>
.knowledge-detail-page {
  min-height: 100vh;
  background-color: #f8f9fa;
  padding-bottom: 50px;
}
/* 评论项外层容器：控制溢出 + 定位 */
.discuss-item-wrapper {
  position: relative;
  overflow: hidden;  /* 隐藏超出部分 */
  margin-bottom: 8px;
  border-bottom: 1px solid #f1f3f5;
}

/* 评论内容区：默认占满容器 + 过渡动画 */
.discuss-item {
  position: relative;
  z-index: 1;
  background: #fff;
  padding: 16px;
  transition: transform 0.3s ease;  /* 侧滑过渡 */
}
/* 激活时：内容区左滑，露出操作按钮 */
.discuss-item.active {
  transform: translateX(-120px);  /* 左滑距离 = 操作按钮总宽度 */
}

/* 操作按钮区：固定在右侧 + 初始隐藏 */
.discuss-actions {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 0;
  height: 100%;
  display: flex;
}

/* 操作按钮：调整样式（和你现有按钮一致） */
.action-btn {
  width: 60px;  /* 每个按钮宽度，总宽度120px对应上面的translateX */
  height: 100%;
  border: none;
  color: #fff;
  cursor: pointer;
  font-size: 12px;
}
.edit-btn {
  background-color: #1976d2;
}
.delete-btn {
  background-color: #f44336;
}
/* 返回按钮 */
.back-btn-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 20px 0;
}

.back-btn {
  padding: 8px 16px;
  background-color: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  color: #2e7d32;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.back-btn:hover {
  background-color: #f0f7f2;
  border-color: #2e7d32;
}

/* 知识详情 */
.knowledge-detail {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.knowledge-title {
  color: #2e7d32;
  margin-bottom: 20px;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.4;
}

.detail-meta {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  color: #6c757d;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #eee;
}

.meta-info {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.meta-item {
  font-size: 14px;
}

.knowledge-img {
  max-width: 120px;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.detail-content {
  line-height: 1.8;
  color: #343a40;
  margin-bottom: 40px;
  font-size: 16px;
}

/* 评论区 */
.discuss-section {
  margin-top: 40px;
}

.discuss-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.discuss-title {
  font-size: 20px;
  color: #2e7d32;
  font-weight: 600;
  margin: 0;
}

.sort-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-label {
  font-size: 14px;
  color: #6c757d;
}

.sort-select {
  width: 120px;
}

/* 评论 Tab */
.discuss-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.tab-btn {
  padding: 6px 16px;
  background: transparent;
  border: none;
  font-size: 14px;
  color: #6c757d;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab-btn.active {
  color: #2e7d32;
  border-bottom-color: #2e7d32;
  font-weight: 500;
}

.tab-btn:hover {
  color: #2e7d32;
}

/* 评论列表 */
.discuss-list {
  margin-bottom: 30px;
}

.empty-discuss {
  text-align: center;
  padding: 60px 20px;
  color: #6c757d;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  color: #dee2e6;
}

.discuss-item {
  border-bottom: 1px solid #f1f3f5;
  padding: 16px 0;
  transition: background-color 0.2s;
}

.discuss-item:hover {
  background-color: #f8f9fa;
  border-radius: 0px;
  padding: 16px 12px;
  margin: 0;
}

.discuss-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.discuss-owner {
  font-weight: 600;
  color: #212529;
  font-size: 15px;
}

.discuss-time {
  color: #adb5bd;
  font-size: 13px;
}

.discuss-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.edit-btn {
  background-color: #e9f5ff;
  color: #1976d2;
}

.edit-btn:hover {
  background-color: #d1e7ff;
}

.delete-btn {
  background-color: #ffebee;
  color: #d32f2f;
}

.delete-btn:hover {
  background-color: #ffcdd2;
}

.discuss-content {
  line-height: 1.6;
  color: #495057;
  font-size: 14px;
  padding: 4px 0;
}

/* 发布评论 */
.discuss-post {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-top: 20px;
}

.discuss-textarea {
  width: 100%;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
  resize: vertical;
  font-size: 14px;
  transition: border-color 0.2s;
}

.discuss-textarea:focus {
  outline: none;
  border-color: #2e7d32;
  box-shadow: 0 0 0 3px rgba(46, 125, 50, 0.1);
}

.post-btn {
  padding: 10px 20px;
  background: #2e7d32;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.post-btn:disabled {
  background-color: #9ccc65;
  cursor: not-allowed;
}

.post-btn:hover:not(:disabled) {
  background-color: #1b5e20;
}

/* 未登录提示 */
.login-tip {
  text-align: center;
  padding: 20px;
  color: #6c757d;
  font-size: 14px;
}

.login-link {
  color: #2e7d32;
  cursor: pointer;
  text-decoration: underline;
}

/* 加载中 */
.loading {
  text-align: center;
  padding: 80px 0;
  color: #2e7d32;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #2e7d32;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 弹窗样式 */
:deep(.el-dialog) {
  border-radius: 8px;
}

:deep(.el-dialog__header) {
  border-bottom: 1px solid #eee;
  padding-bottom: 12px;
}

:deep(.el-dialog__title) {
  font-size: 16px;
  font-weight: 600;
  color: #212529;
}

:deep(.el-dialog__body) {
  padding: 20px;
}

.dialog-btn {
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  border: none;
  font-size: 14px;
  margin-right: 8px;
}

.cancel-btn {
  background-color: #f8f9fa;
  color: #6c757d;
}

.cancel-btn:hover {
  background-color: #e9ecef;
}

.confirm-btn {
  background-color: #2e7d32;
  color: #fff;
}

.confirm-btn:hover {
  background-color: #1b5e20;
}
</style>
