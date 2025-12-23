<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import SiteHeader from '../components/SiteHeader.vue'
import api from '@/utils/api'
import { useRouter } from 'vue-router'
import { assetImageUrl } from '@/utils/asset'
import { ElMessageBox, ElMessage } from 'element-plus'

// 数据类型定义
type Product = {
  productId: number
  title: string
  price: number
  stockQuantity: number
  content: string
  picture: string
  ownName: string
  type: number
  createTime: string
}

type User = {
  userName: string
  nickName: string
  phone: string
  realName: string
  createTime: string
}

type Knowledge = {
  knowledgeId: number
  title: string
  content: string
  picPath: string
  ownName: string
  createTime: string
}

type Order = {
  orderId: number
  total: number
  orderStatus: number
  createTime: string
  updateTime: string
}

// 状态管理
const router = useRouter()
const activeTab = ref('overview')
const loading = ref(false)
const statistics = ref({
  totalUsers: 0,
  totalProducts: 0,
  totalDemands: 0,
  totalKnowledge: 0,
  totalOrders: 0
})

// 用户数据
const users = ref<User[]>([])
const userKeyword = ref('')

// 产品数据
const products = ref<Product[]>([])
const productKeyword = ref('')
const productType = ref<number | null>(null)

// 知识数据
const knowledgeItems = ref<Knowledge[]>([])
const knowledgeKeyword = ref('')

// 订单数据
const orders = ref<Order[]>([])
const orderStatus = ref<number | null>(null)

// 错误提示
const error = ref<string | null>(null)

// 计算属性
const filteredUsers = computed(() => {
  return users.value.filter(user => {
    const k = userKeyword.value.trim().toLowerCase()
    if (!k) return true
    return (
      (user.userName || '').toLowerCase().includes(k) ||
      (user.nickName || '').toLowerCase().includes(k) ||
      (user.realName || '').toLowerCase().includes(k)
    )
  })
})

const filteredProducts = computed(() => {
  let result = products.value
  if (productType.value !== null) {
    result = result.filter(p => p.type === productType.value)
  }
  const k = productKeyword.value.trim().toLowerCase()
  if (k) {
    result = result.filter(p =>
      (p.title || '').toLowerCase().includes(k) ||
      (p.content || '').toLowerCase().includes(k) ||
      (p.ownName || '').toLowerCase().includes(k)
    )
  }
  return result
})

const filteredKnowledge = computed(() => {
  return knowledgeItems.value.filter(item => {
    const k = knowledgeKeyword.value.trim().toLowerCase()
    if (!k) return true
    return (
      (item.title || '').toLowerCase().includes(k) ||
      (item.content || '').toLowerCase().includes(k)
    )
  })
})

const filteredOrders = computed(() => {
  let result = orders.value
  if (orderStatus.value !== null) {
    result = result.filter(o => o.orderStatus === orderStatus.value)
  }
  return result
})

// 辅助函数
function img(name?: string) { return assetImageUrl(name) }
function formatDate(dateStr?: string) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('zh-CN')
}

function getStatusText(status: number) {
  const statusMap: {[key: number]: string} = {
    0: '待付款',
    1: '待发货',
    2: '待收货',
    3: '已完成',
    4: '已取消',
    11: '待付款(需)',
    12: '待发货(需)',
    13: '待收货(需)',
    14: '已完成(需)',
    15: '已取消(需)'
  }
  return statusMap[status] || '未知'
}

function getTypeText(type: number) {
  return type === 0 ? '需求' : '货源'
}

// 加载数据
async function loadStatistics() {
  try {
    const res = await api.get('/api/admin/statistics')
    if (res.data?.code === 200) {
      statistics.value = res.data.data
    }
  } catch (e) {
    console.error('加载统计数据失败', e)
  }
}

async function loadUsers() {
  try {
    const res = await api.get('/api/admin/users')
    if (res.data?.code === 200) {
      users.value = res.data.data || []
    }
  } catch (e) {
    console.error('加载用户数据失败', e)
  }
}

async function loadProducts() {
  try {
    const res = await api.get('/api/products')
    if (res.data?.code === 200) {
      products.value = res.data.data || []
    }
  } catch (e) {
    console.error('加载产品数据失败', e)
  }
}

async function loadKnowledge() {
  try {
    const res = await api.get('/api/admin/knowledge')
    if (res.data?.code === 200) {
      knowledgeItems.value = res.data.data || []
    }
  } catch (e) {
    console.error('加载知识数据失败', e)
  }
}

async function loadOrders() {
  try {
    const res = await api.get('/api/admin/orders')
    if (res.data?.code === 200) {
      orders.value = res.data.data || []
    }
  } catch (e) {
    console.error('加载订单数据失败', e)
  }
}

// 数据操作
async function deleteUser(userName: string) {
  try {
    await ElMessageBox.confirm(
      '确定删除该用户吗？此操作不可撤销。',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    const res = await api.delete(`/api/admin/users/${userName}`)
    if (res.data?.code === 200) {
      users.value = users.value.filter(u => u.userName !== userName)
      ElMessage.success('删除成功')
    } else {
      ElMessage.error(res.data?.msg || '删除失败')
    }
  } catch (e) {
    if (e !== 'cancel') {
      console.error(e)
      ElMessage.error('操作失败')
    }
  }
}

async function deleteProduct(productId: number) {
  try {
    await ElMessageBox.confirm(
      '确定删除该产品吗？此操作不可撤销。',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    const res = await api.delete(`/api/products/${productId}`)
    if (res.data?.code === 200) {
      products.value = products.value.filter(p => p.productId !== productId)
      ElMessage.success('删除成功')
    } else {
      ElMessage.error(res.data?.msg || '删除失败')
    }
  } catch (e) {
    if (e !== 'cancel') {
      console.error(e)
      ElMessage.error('操作失败')
    }
  }
}

async function deleteKnowledge(knowledgeId: number) {
  try {
    await ElMessageBox.confirm(
      '确定删除该知识文章吗？此操作不可撤销。',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    const res = await api.delete(`/api/admin/knowledge/${knowledgeId}`)
    if (res.data?.code === 200) {
      knowledgeItems.value = knowledgeItems.value.filter(k => k.knowledgeId !== knowledgeId)
      ElMessage.success('删除成功')
    } else {
      ElMessage.error(res.data?.msg || '删除失败')
    }
  } catch (e) {
    if (e !== 'cancel') {
      console.error(e)
      ElMessage.error('操作失败')
    }
  }
}

async function updateOrderStatus(orderId: number, newStatus: number) {
  try {
    const res = await api.put(`/api/admin/orders/${orderId}/status`, { status: newStatus })
    if (res.data?.code === 200) {
      const order = orders.value.find(o => o.orderId === orderId)
      if (order) {
        order.orderStatus = newStatus
      }
      ElMessage.success('更新成功')
    } else {
      ElMessage.error(res.data?.msg || '更新失败')
    }
  } catch (e) {
    ElMessage.error('网络错误')
  }
}

// 切换标签时加载对应数据
function handleTabChange(tab: string) {
  activeTab.value = tab
  switch (tab) {
    case 'users':
      if (users.value.length === 0) loadUsers()
      break
    case 'products':
      if (products.value.length === 0) loadProducts()
      break
    case 'knowledge':
      if (knowledgeItems.value.length === 0) loadKnowledge()
      break
    case 'orders':
      if (orders.value.length === 0) loadOrders()
      break
  }
}

// 初始化
onMounted(async () => {
  loading.value = true
  try {
    // 先验证管理员权限
    const meRes = await api.get('/api/users/me')
    if (meRes.data?.code !== 200) {
      error.value = '未登录或无权限访问'
      await router.push('/login')
      return
    }

    // 加载概览数据
    await loadStatistics()
  } catch (e) {
    error.value = '加载失败，请重试'
    console.error('初始化失败', e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="admin-page">
    <SiteHeader/>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-else-if="loading" class="loading">
      加载中...
    </div>

    <div v-else class="admin-container">
      <h1 class="page-title">系统管理中心</h1>

      <!-- 标签页导航 -->
      <div class="tabs">
        <button
          v-for="tab in ['overview', 'users', 'products', 'knowledge', 'orders']"
          :key="tab"
          class="tab-button"
          :class="{ active: activeTab === tab }"
          @click="handleTabChange(tab)"
        >
          {{ tab === 'overview' ? '数据概览' :
          tab === 'users' ? '用户管理' :
            tab === 'products' ? '产品管理' :
              tab === 'knowledge' ? '知识管理' : '订单管理' }}
        </button>
      </div>

      <!-- 概览页面 -->
      <div v-if="activeTab === 'overview'" class="overview">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">{{ statistics.totalUsers }}</div>
            <div class="stat-label">总用户数</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ statistics.totalProducts }}</div>
            <div class="stat-label">总货源数</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ statistics.totalDemands }}</div>
            <div class="stat-label">总需求数</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ statistics.totalKnowledge }}</div>
            <div class="stat-label">知识文章数</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ statistics.totalOrders }}</div>
            <div class="stat-label">订单总数</div>
          </div>
        </div>

        <div class="quick-links">
          <h3>快速管理</h3>
          <div class="links-grid">
            <button class="link-button" @click="handleTabChange('users')">
              <span class="link-icon">👥</span>
              <span>用户管理</span>
            </button>
            <button class="link-button" @click="handleTabChange('products')">
              <span class="link-icon">📦</span>
              <span>产品管理</span>
            </button>
            <button class="link-button" @click="handleTabChange('knowledge')">
              <span class="link-icon">📚</span>
              <span>知识管理</span>
            </button>
            <button class="link-button" @click="handleTabChange('orders')">
              <span class="link-icon">📋</span>
              <span>订单管理</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 用户管理 -->
      <div v-else-if="activeTab === 'users'" class="management-section">
        <div class="section-header">
          <h2>用户管理</h2>
          <div class="search-bar">
            <input
              v-model="userKeyword"
              placeholder="搜索用户名、昵称或真实姓名..."
              class="search-input"
            />
          </div>
        </div>

        <div class="data-table-container">
          <table class="data-table">
            <thead>
            <tr>
              <th>用户名</th>
              <th>昵称</th>
              <th>真实姓名</th>
              <th>联系电话</th>
              <th>注册时间</th>
              <th>操作</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="user in filteredUsers" :key="user.userName">
              <td>{{ user.userName }}</td>
              <td>{{ user.nickName || '-' }}</td>
              <td>{{ user.realName || '-' }}</td>
              <td>{{ user.phone || '-' }}</td>
              <td>{{ formatDate(user.createTime) }}</td>
              <td>
                <button class="btn danger" @click="deleteUser(user.userName)">删除</button>
              </td>
            </tr>
            </tbody>
          </table>
          <div v-if="filteredUsers.length === 0" class="empty-state">
            暂无用户数据
          </div>
        </div>
      </div>

      <!-- 产品管理 -->
      <div v-else-if="activeTab === 'products'" class="management-section">
        <div class="section-header">
          <h2>产品管理</h2>
          <div class="search-filter">
            <input
              v-model="productKeyword"
              placeholder="搜索产品标题、内容或所属用户..."
              class="search-input"
            />
            <select v-model="productType" class="filter-select">
              <option :value="null">全部类型</option>
              <option :value="0">需求</option>
              <option :value="1">货源</option>
            </select>
          </div>
        </div>

        <div class="products-grid">
          <div
            v-for="product in filteredProducts"
            :key="product.productId"
            class="product-card"
          >
            <div class="product-thumb">
              <img :src="img(product.picture)" :alt="product.title" />
              <span class="type-badge">{{ getTypeText(product.type) }}</span>
            </div>
            <div class="product-info">
              <h3 class="product-title">{{ product.title }}</h3>
              <p class="product-owner">发布者: {{ product.ownName }}</p>
              <p class="product-date">发布时间: {{ formatDate(product.createTime) }}</p>
              <p class="product-price" v-if="product.price">
                ¥{{ Number(product.price).toFixed(2) }}/kg
              </p>
              <p class="product-stock" v-if="product.stockQuantity !== undefined">
                库存: {{ product.stockQuantity }}kg
              </p>
              <div class="product-actions">
                <button class="btn danger" @click="deleteProduct(product.productId)">
                  删除
                </button>
              </div>
            </div>
          </div>
          <div v-if="filteredProducts.length === 0" class="empty-state">
            暂无产品数据
          </div>
        </div>
      </div>

      <!-- 知识管理 -->
      <div v-else-if="activeTab === 'knowledge'" class="management-section">
        <div class="section-header">
          <h2>知识管理</h2>
          <div class="search-bar">
            <input
              v-model="knowledgeKeyword"
              placeholder="搜索知识标题或内容..."
              class="search-input"
            />
          </div>
        </div>

        <div class="knowledge-list">
          <div
            v-for="item in filteredKnowledge"
            :key="item.knowledgeId"
            class="knowledge-item"
          >
            <div class="knowledge-header">
              <h3 class="knowledge-title">{{ item.title }}</h3>
              <span class="knowledge-date">{{ formatDate(item.createTime) }}</span>
            </div>
            <div class="knowledge-content">
              {{ item.content.length > 100 ? item.content.substring(0, 100) + '...' : item.content }}
            </div>
            <div class="knowledge-owner">作者: {{ item.ownName }}</div>
            <div class="knowledge-actions">
              <button class="btn danger" @click="deleteKnowledge(item.knowledgeId)">
                删除
              </button>
            </div>
          </div>
          <div v-if="filteredKnowledge.length === 0" class="empty-state">
            暂无知识文章
          </div>
        </div>
      </div>

      <!-- 订单管理 -->
      <div v-else-if="activeTab === 'orders'" class="management-section">
        <div class="section-header">
          <h2>订单管理</h2>
          <div class="filter-bar">
            <select v-model="orderStatus" class="filter-select">
              <option :value="null">全部状态</option>
              <option :value="0">待付款</option>
              <option :value="1">待发货</option>
              <option :value="2">待收货</option>
              <option :value="3">已完成</option>
              <option :value="4">已取消</option>
              <option :value="11">待付款(需)</option>
              <option :value="12">待发货(需)</option>
              <option :value="13">待收货(需)</option>
              <option :value="14">已完成(需)</option>
              <option :value="15">已取消(需)</option>
            </select>
          </div>
        </div>

        <div class="data-table-container">
          <table class="data-table">
            <thead>
            <tr>
              <th>订单ID</th>
              <th>订单金额</th>
              <th>订单状态</th>
              <th>创建时间</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="order in filteredOrders" :key="order.orderId">
              <td>{{ order.orderId }}</td>
              <td>¥{{ Number(order.total).toFixed(2) }}</td>
              <td>
                  <span class="status-badge" :class="`status-${order.orderStatus}`">
                    {{ getStatusText(order.orderStatus) }}
                  </span>
              </td>
              <td>{{ formatDate(order.createTime) }}</td>
              <td>{{ formatDate(order.updateTime) }}</td>
              <td>
                <select
                  :value="order.orderStatus"
                  @change="(e) => updateOrderStatus(order.orderId, Number((e.target as HTMLSelectElement).value))"
                  class="status-select"
                >
                  <template v-if="order.orderStatus < 10">
                    <option :value="0">待付款</option>
                    <option :value="1">待发货</option>
                    <option :value="2">待收货</option>
                    <option :value="3">已完成</option>
                    <option :value="4">已取消</option>
                  </template>
                  <template v-else>
                    <option :value="11">待付款(需)</option>
                    <option :value="12">待发货(需)</option>
                    <option :value="13">待收货(需)</option>
                    <option :value="14">已完成(需)</option>
                    <option :value="15">已取消(需)</option>
                  </template>
                </select>
              </td>
            </tr>
            </tbody>
          </table>
          <div v-if="filteredOrders.length === 0" class="empty-state">
            暂无订单数据
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-page {
  background: #f5f5f5;
  min-height: 100vh;
}

.page-title {
  margin: 0;
  padding: 24px;
  font-size: 28px;
  color: #333;
  text-align: center;
  background: #fff;
  border-bottom: 1px solid #eee;
}

.tabs {
  display: flex;
  background: #fff;
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
  overflow-x: auto;
}

.tab-button {
  padding: 16px 24px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 16px;
  color: #666;
  border-bottom: 3px solid transparent;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.tab-button:hover {
  color: #36a24a;
}

.tab-button.active {
  color: #36a24a;
  border-bottom-color: #36a24a;
  font-weight: 600;
}

.error-message {
  padding: 24px;
  color: #c0392b;
  text-align: center;
  background: #fff;
}

.loading {
  padding: 48px;
  text-align: center;
  color: #666;
  background: #fff;
}

.admin-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px 48px;
}

/* 概览样式 */
.overview {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.stat-card {
  background: #fff;
  padding: 24px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-number {
  font-size: 36px;
  font-weight: bold;
  color: #36a24a;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 16px;
  color: #666;
}

.quick-links {
  background: #fff;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.quick-links h3 {
  margin: 0 0 20px;
  font-size: 18px;
  color: #333;
}

.links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.link-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: #f8f8f8;
  border: 1px solid #eee;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.link-button:hover {
  background: #36a24a;
  color: #fff;
  border-color: #36a24a;
}

.link-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

/* 管理页面通用样式 */
.management-section {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.section-header h2 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.search-bar, .filter-bar, .search-filter {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  min-width: 200px;
}

.filter-select {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background: #fff;
}

/* 表格样式 */
.data-table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  background: #f8f8f8;
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #333;
  border-bottom: 2px solid #eee;
}

.data-table td {
  padding: 12px;
  border-bottom: 1px solid #eee;
}

.data-table tr:hover {
  background: #fafafa;
}

/* 按钮样式 */
.btn {
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease;
}

.btn.danger {
  background: #e74c3c;
  color: #fff;
}

.btn.danger:hover {
  background: #c0392b;
}

/* 空状态 */
.empty-state {
  padding: 48px 24px;
  text-align: center;
  color: #777;
}

/* 产品卡片样式 */
.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.product-card {
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
  transition: box-shadow 0.3s ease;
}

.product-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.product-thumb {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.product-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.type-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  background: #36a24a;
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.product-info {
  padding: 16px;
}

.product-title {
  margin: 0 0 8px;
  font-size: 16px;
  color: #333;
}

.product-owner, .product-date, .product-price, .product-stock {
  margin: 6px 0;
  font-size: 14px;
  color: #666;
}

.product-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}

/* 知识文章样式 */
.knowledge-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.knowledge-item {
  padding: 20px;
  border: 1px solid #eee;
  border-radius: 8px;
}

.knowledge-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.knowledge-title {
  font-size: 18px;
  color: #333;
  flex: 1;
  margin: 0 16px 0 0;
}

.knowledge-date {
  font-size: 14px;
  color: #999;
  white-space: nowrap;
}

.knowledge-content {
  color: #666;
  line-height: 1.6;
  margin-bottom: 12px;
}

.knowledge-owner {
  font-size: 14px;
  color: #999;
  margin-bottom: 12px;
}

.knowledge-actions {
  display: flex;
  gap: 8px;
}

/* 订单状态样式 */
.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}
.status-select {
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: #fff;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .section-header {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    min-width: auto;
    width: 100%;
  }

  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  }

  .stat-number {
    font-size: 28px;
  }

  .products-grid {
    grid-template-columns: 1fr;
  }

  .knowledge-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .knowledge-date {
    margin-top: 8px;
  }
}
</style>
