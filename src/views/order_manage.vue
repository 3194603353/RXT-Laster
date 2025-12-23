<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import SiteHeader from '@/components/SiteHeader.vue'
import api from '@/utils/api'
import { assetImageUrl } from '@/utils/asset'
import { getCurrentUserName } from '../utils/userHelper'
import { ElMessage, ElMessageBox } from 'element-plus'

interface Address {
  id: number
  consignee: string
  phone: string
  addressDetail: string
  isDefault: number
}

interface OrderItem {
  productName: string
  productImage: string
  unitPrice: number
  count: number
  content: string
}

interface Order {
  orderId: number
  total: number
  orderStatus: number
  createTime: string
  sellerName: string
  ownName: string
  addressId?: number
  address?: Address
  items: OrderItem[]
}

const activeTab = ref('all')
const orderType = ref('buy') // buy, sell, demand
const loading = ref(false)
const orders = ref<Order[]>([])
const currentUser = ref(getCurrentUserName())

// 地址管理相关
const showAddressDialog = ref(false)
const addressList = ref<Address[]>([])
const currentEditingOrderId = ref<number | null>(null)
const selectedAddressId = ref<number | null>(null)
const addressLoading = ref(false)

const statusMap: Record<number, string> = {
  0: '待付款',
  1: '待发货',
  2: '待收货',
  3: '已完成',
  4: '已取消',
  11: '待付款', // 需求订单：待付款
  12: '待发货',
  13: '待收货',
  14: '已完成',
  15: '已取消'
}

const statusTabs = [
  { label: '全部', name: 'all', value: -1 },
  { label: '待付款', name: 'unpaid', value: 0 },
  { label: '待发货', name: 'unshipped', value: 1 },
  { label: '待收货', name: 'unreceived', value: 2 },
  { label: '已完成', name: 'completed', value: 3 },
  { label: '已取消', name: 'cancelled', value: 4 }
]

// 检查是否有需要填写地址的需求订单
const pendingAddressCount = computed(() => {
  if (orderType.value !== 'demand') return 0
  return orders.value.filter(o =>
    o.orderStatus === 11 &&
    !o.address &&
    o.ownName === currentUser.value
  ).length
})

function getImageUrl(name?: string) {
  return assetImageUrl(name)
}

async function loadOrders(tabName?: string) {
  loading.value = true
  try {
    // 使用传入的tabName或当前activeTab.value获取目标标签
    const targetTab = tabName
      ? statusTabs.find(t => t.name === tabName)
      : statusTabs.find(t => t.name === activeTab.value)

    let status = targetTab ? targetTab.value : -1

    // 需求订单状态映射
    if (orderType.value === 'demand' && status !== -1) {
      status += 11
    }

    const params = {
      type: orderType.value
    }

    // 当status !== -1时才传递status参数，避免后端API处理-1时的潜在问题
    if (status !== -1) {
      params.status = status
    }

    const res = await api.get('/api/orders', {
      params
    })
    if (res.data.code === 200) {
      orders.value = res.data.data || []
    } else {
      ElMessage.error(res.data.msg || '加载订单失败')
    }
  } catch {
    ElMessage.error('网络错误')
  } finally {
    loading.value = false
  }
}

async function loadAddresses() {
  if (addressList.value.length > 0) return
  addressLoading.value = true
  try {
    const res = await api.get('/api/users/addresses')
    if (res.data.code === 200) {
      addressList.value = res.data.data || []
    }
  } catch {
    ElMessage.error('加载地址失败')
  } finally {
    addressLoading.value = false
  }
}

function openAddressDialog(order: Order) {
  currentEditingOrderId.value = order.orderId
  selectedAddressId.value = order.addressId || null
  showAddressDialog.value = true
  loadAddresses()
}

async function confirmAddress() {
  if (!selectedAddressId.value || !currentEditingOrderId.value) {
    ElMessage.warning('请选择一个地址')
    return
  }

  try {
    const res = await api.put(`/api/orders/${currentEditingOrderId.value}/address`, selectedAddressId.value, {
        headers: { 'Content-Type': 'application/json' }
    })
    if (res.data.code === 200) {
      ElMessage.success('地址更新成功')
      showAddressDialog.value = false
      loadOrders()
    } else {
      ElMessage.error(res.data.msg || '更新失败')
    }
  } catch {
    ElMessage.error('网络错误')
  }
}

async function updateStatus(orderId: number, status: number, confirmMsg?: string) {
  if (confirmMsg) {
    try {
      await ElMessageBox.confirm(confirmMsg, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
    } catch {
      return
    }
  }

  try {
    const res = await api.put(`/api/orders/${orderId}/status`, status, {
        headers: { 'Content-Type': 'application/json' }
    })
    if (res.data.code === 200) {
      ElMessage.success('操作成功')
      loadOrders()
    } else {
      ElMessage.error(res.data.msg || '操作失败')
    }
  } catch {
    ElMessage.error('操作失败')
  }
}

function handleTabClick(tab: any) {
  // 明确传递当前点击的标签名称，避免使用可能未更新的activeTab.value
  loadOrders(tab.props.name)
}

function handleTypeChange() {
  activeTab.value = 'all'
  // 明确传递'all'标签，确保加载全部订单
  loadOrders('all')
}

function switchType(type: string) {
  if (orderType.value === type) return
  orderType.value = type
  handleTypeChange()
}

onMounted(() => loadOrders('all'))
</script><template>
  <div class="order-page">
    <SiteHeader />
    <div class="container">
      <h1 class="page-title">我的订单</h1>

      <el-alert
        v-if="pendingAddressCount > 0"
        :title="`您有 ${pendingAddressCount} 个需求订单需要填写收货地址，请尽快处理`"
        type="warning"
        show-icon
        style="margin-bottom: 20px;"
      />

      <div class="main-tabs">
        <div
          class="tab-item"
          :class="{ active: orderType === 'buy' }"
          @click="switchType('buy')"
        >
          我买到的
        </div>
        <div
          class="tab-item"
          :class="{ active: orderType === 'sell' }"
          @click="switchType('sell')"
        >
          我卖出的
        </div>
        <div
          class="tab-item"
          :class="{ active: orderType === 'demand' }"
          @click="switchType('demand')"
        >
          需求订单
        </div>
      </div>

      <el-tabs v-model="activeTab" @tab-click="(tab) => handleTabClick(tab)">
        <el-tab-pane v-for="tab in statusTabs" :key="tab.name" :label="tab.label" :name="tab.name" />
      </el-tabs>

      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="orders.length === 0" class="empty">暂无订单</div>

      <div v-else class="order-list">
        <div v-for="order in orders" :key="order.orderId" class="order-card">
          <div class="card-header">
            <span class="time">{{ order.createTime }}</span>
            <span class="order-id">订单号：{{ order.orderId }}</span>
            <span class="seller" v-if="orderType === 'buy'">卖家：{{ order.sellerName }}</span>
            <span class="seller" v-else>买家：{{ order.ownName }}</span>
            <span class="status">{{ statusMap[order.orderStatus] }}</span>
          </div>

          <div class="address-row" :class="{ warning: !order.address }">
            <span class="label">收货地址：</span>

            <!-- 有地址的情况 -->
            <template v-if="order.address">
              <span class="val">
                {{ order.address.consignee }}
                {{ order.address.phone }}
                {{ order.address.addressDetail }}
              </span>
              <!-- 修改地址按钮 -->
              <el-button
                v-if="(orderType === 'buy' && order.orderStatus < 2) || (orderType === 'demand' && order.orderStatus < 12 && order.ownName === currentUser)"
                type="primary" link size="small"
                @click="openAddressDialog(order)"
              >
                修改
              </el-button>
            </template>

            <!-- 无地址的情况 -->
            <template v-else>
              <span class="val text-danger" v-if="orderType === 'demand' && order.ownName === currentUser && order.orderStatus === 11">
                未填写 (请尽快填写以便卖家发货)
              </span>
              <span class="val text-muted" v-else>
                未填写
              </span>

              <!-- 填写地址按钮 -->
              <el-button
                v-if="orderType === 'demand' && order.ownName === currentUser && order.orderStatus === 11"
                type="primary" size="small"
                @click="openAddressDialog(order)"
              >
                填写地址
              </el-button>
            </template>
          </div>

          <div class="card-body">
            <div v-for="(item, idx) in order.items" :key="idx" class="order-item">
              <img :src="getImageUrl(item.productImage)" class="thumb" />
              <div class="info">
                <div class="name">{{ item.productName }}</div>
                <div class="desc">{{ item.content }}</div>
              </div>
              <div class="price-col">
                <div class="price">¥{{ item.unitPrice }}</div>
                <div class="count">x{{ item.count }}</div>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <div class="total">
              总价: <span class="amount">¥{{ order.total }}</span>
            </div>
            <div class="actions">
              <!-- 购买单操作 -->
              <template v-if="orderType === 'buy'">
                <el-button v-if="order.orderStatus === 0" type="primary" size="small" @click="updateStatus(order.orderId, 1, '确定支付吗？')">立即付款</el-button>
                <el-button v-if="order.orderStatus === 0" size="small" @click="updateStatus(order.orderId, 4, '确定取消订单吗？')">取消订单</el-button>
                <el-button v-if="order.orderStatus === 2" type="success" size="small" @click="updateStatus(order.orderId, 3, '确认已收到货吗？')">确认收货</el-button>
              </template>

              <!-- 销售单操作 -->
              <template v-if="orderType === 'sell'">
                <el-button v-if="order.orderStatus === 1" type="primary" size="small" @click="updateStatus(order.orderId, 2, '确定发货吗？')">立即发货</el-button>
              </template>

              <!-- 需求订单操作 -->
              <template v-if="orderType === 'demand'">
                <el-button v-if="order.orderStatus === 11" type="primary" size="small" @click="updateStatus(order.orderId, 12, '确定支付吗？')">立即付款</el-button>
                <el-button v-if="order.orderStatus === 11" size="small" @click="updateStatus(order.orderId, 15, '确定取消订单吗？')">取消订单</el-button>
                <el-button v-if="order.orderStatus === 13" type="success" size="small" @click="updateStatus(order.orderId, 14, '确认已收到货吗？')">确认收货</el-button>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="showAddressDialog" title="选择收货地址" width="500px">
      <div v-if="addressLoading" class="loading">加载中...</div>
      <div v-else-if="addressList.length === 0" class="empty-addr">
        暂无地址，请先去个人中心添加
      </div>
      <div v-else class="address-list">
          <div
            v-for="addr in addressList"
            :key="addr.id"
            class="address-item"
            :class="{ selected: selectedAddressId === addr.id }"
            @click="selectedAddressId = addr.id"
          >
            <div class="addr-header">
              <span class="name">{{ addr.consignee }}</span>
              <span class="phone">{{ addr.phone }}</span>
              <span v-if="addr.isDefault" class="tag">默认</span>
            </div>
            <div class="addr-detail">{{ addr.addressDetail }}</div>
          </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddressDialog = false">取消</el-button>
          <el-button type="primary" @click="confirmAddress">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.order-page {
  min-height: 100vh;
  background: #f5f7fa;
}
.container {
  max-width: 1000px;
  margin: 20px auto;
  padding: 0 20px;
  background: #fff;
  min-height: 600px;
  border-radius: 8px;
  padding-bottom: 40px;
}
.page-title {
  padding: 20px 0;
  font-size: 24px;
  color: #333;
}
.main-tabs {
  display: inline-flex;
  background: #f0f2f5;
  padding: 4px;
  border-radius: 8px;
  margin-bottom: 20px;
}
.tab-item {
  padding: 8px 24px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  border-radius: 6px;
  transition: all 0.3s;
  user-select: none;
}
.tab-item:hover {
  color: #333;
}
.tab-item.active {
  background: #fff;
  color: #2e923f;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.loading, .empty {
  text-align: center;
  padding: 40px;
  color: #999;
}
.order-card {
  border: 1px solid #eee;
  margin-bottom: 20px;
  border-radius: 4px;
}
.card-header {
  background: #f9f9f9;
  padding: 10px 20px;
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #666;
  border-bottom: 1px solid #eee;
}
.seller {
  color: #333;
  font-weight: 500;
}
.status {
  color: #f56c6c;
  font-weight: bold;
}
.card-body {
  padding: 20px;
}
.order-item {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
}
.thumb {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #eee;
}
.info {
  flex: 1;
}
.name {
  font-size: 14px;
  color: #333;
  margin-bottom: 6px;
}
.desc {
  font-size: 12px;
  color: #999;
}
.price-col {
  text-align: right;
}
.price {
  font-weight: bold;
  color: #333;
}
.count {
  color: #999;
  font-size: 12px;
}
.card-footer {
  padding: 10px 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.amount {
  color: #f56c6c;
  font-size: 18px;
  font-weight: bold;
}
.actions {
  display: flex;
  gap: 10px;
}
.address-row {
  padding: 10px 20px;
  background: #fff;
  border-bottom: 1px solid #f5f5f5;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.address-row.warning {
  background: #fdf6ec;
}
.address-row .label {
  color: #999;
}
.address-row .val {
  color: #333;
  flex: 1;
}
.text-danger {
  color: #f56c6c;
}
.text-muted {
  color: #999;
  font-style: italic;
}
.address-list {
  max-height: 300px;
  overflow-y: auto;
}
.address-item {
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 4px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.2s;
}
.address-item:hover {
  border-color: #409eff;
}
.address-item.selected {
  border-color: #409eff;
  background: #ecf5ff;
}
.addr-header {
  display: flex;
  gap: 10px;
  margin-bottom: 4px;
  font-weight: bold;
}
.tag {
  font-size: 12px;
  background: #f0f9eb;
  color: #67c23a;
  padding: 0 4px;
  border-radius: 2px;
}
.addr-detail {
  font-size: 13px;
  color: #666;
}
.empty-addr {
  text-align: center;
  padding: 20px;
  color: #999;
}
</style>
