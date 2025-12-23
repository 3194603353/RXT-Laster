<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import SiteHeader from '@/components/SiteHeader.vue'
import api from '@/utils/api'
import { assetImageUrl, uploadAsset } from '../utils/asset'
import { ElMessage, ElMessageBox } from "element-plus";
import axios from "axios";

const router = useRouter()

// 定义购物车项类型
interface CartItem {
  shoppingId: number
  productId: number
  productName: string
  price: number
  picture: string
  count: number
  selected: boolean
  ownName: string
}

// 定义地址接口
type Address = {
  id: number
  ownName: string
  consignee: string
  phone: string
  addressDetail: string
  isDefault: number
};

// 响应式数据
const cartList = ref<CartItem[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
// 使用 computed 处理全选逻辑，避免 watch 循环依赖
const allSelected = computed({
  get: () => cartList.value.length > 0 && cartList.value.every(item => item.selected),
  set: (val: boolean) => {
    cartList.value.forEach(item => {
      item.selected = val
    })
  }
})
// 地址相关
const addresses = ref<Address[]>([])
const selectedAddressId = ref<number | null>(null)
const isCheckingOut = ref(false)

// 获取图片URL
function getImageUrl(name?: string) {
  return assetImageUrl(name)
}

// 计算属性：选中商品的总价
const totalPrice = computed(() => {
  return cartList.value
    .filter(item => item.selected)
    .reduce((sum, item) => sum + item.price * item.count, 0)
    .toFixed(2)
})

// 计算属性：选中商品数量
const selectedCount = computed(() => {
  return cartList.value
    .filter(item => item.selected)
    .reduce((sum, item) => sum + item.count, 0)
})

// 监听全选状态 - 已移除，改用 computed
// 监听购物车项选中状态变化 - 已移除，改用 computed

// 获取购物车数据
async function fetchCartList() {
  loading.value = true
  error.value = null
  try {
    const res = await axios.get('/api/cart', { withCredentials: true })

    if (res.data.code === 200) {
      cartList.value = res.data.data || []
    } else if (res.data.code === 401) {
      // 未登录，跳转登录页
      ElMessageBox.confirm(
        '请先登录查看购物车',
        '提示',
        {
          confirmButtonText: '去登录',
          cancelButtonText: '取消',
          type: 'info'
        }
      ).then(() => {
        router.push({
          path: '/login',
          query: { redirect: '/cart' }
        })
      })
    } else {
      throw new Error(res.data.msg || '获取购物车失败')
    }
  } catch (e: unknown) {
    error.value = (e as Error).message || '网络错误'
  } finally {
    loading.value = false
  }
}

// 修改商品数量（修复后）
async function updateCount(item: CartItem, newCount: number) {
  if (newCount < 1) return  // 防止数量小于1

  try {
    // 关键修复：将count放在请求体中，而非params
    const res = await axios.put(
      `/api/cart/${item.shoppingId}/count`,
      { count: newCount },  // 请求体传递count
      { withCredentials: true }  // 移除params配置
    )

    if (res.data.code === 200) {
      item.count = newCount  // 更新本地数量
      ElMessage.success('数量更新成功')  // 增加成功提示
    } else {
      ElMessage.error(res.data.msg || '更新数量失败')
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.msg || '网络异常，更新失败')
  }
}

// 删除购物车商品
async function deleteItem(shoppingId: number, silent = false) {
  try {
    const res = await axios.delete(`/api/cart/${shoppingId}`, {
      withCredentials: true
    })

    if (res.data.code === 200) {
      cartList.value = cartList.value.filter(item => item.shoppingId !== shoppingId)
      if (!silent) ElMessage.success('删除成功')
    } else {
      if (!silent) ElMessage.error(res.data.msg || '删除失败')
    }
  } catch (error) {
    if (!silent) ElMessage.error('网络异常，删除失败')
  }
}

// 切换商品选中状态
async function toggleSelected(item: CartItem) {
  try {
    // v-model 已自动更新状态，无需手动取反
    // 如果需要后端同步：
    // await axios.patch(`/api/cart/${item.shoppingId}/selected`, {
    //   selected: item.selected
    // }, { withCredentials: true })
  } catch (error) {
    ElMessage.error('更新选中状态失败')
  }
}


// 清空购物车
async function clearCart() {
  // 使用原生confirm替代ElMessageBox.confirm
  const isConfirmed = window.confirm('确定要清空购物车吗？');

  if (isConfirmed) {
    try {
      // 注意：修正接口路径为后端实际接收的路径（根据提供的代码应为/api/cart）
      const res = await axios.delete('/api/cart', { withCredentials: true })
      if (res.data.code === 200) {
        cartList.value = [];
        allSelected.value = false; // 重置全选状态
        ElMessage.success('购物车已清空');
      } else {
        ElMessage.error(res.data.msg || '清空失败');
      }
    } catch (error: any) {
      ElMessage.error(error.response?.data?.msg || '网络异常，清空失败');
    }
  }
  // 用户取消操作时不做处理
}

// 加载用户地址
async function loadAddresses() {
  try {
    const res = await api.get('/api/users/addresses')
    if (res.data && res.data.code === 200) {
      addresses.value = res.data.data || []
      // 自动选中默认地址
      const defaultAddress = addresses.value.find(addr => addr.isDefault === 1)
      if (defaultAddress) {
        selectedAddressId.value = defaultAddress.id
      } else if (addresses.value.length > 0) {
        selectedAddressId.value = addresses.value[0].id
      }
    }
  } catch (e) {
    console.error('加载地址失败', e)
  }
}

// 结算
async function checkout() {
  if (selectedCount.value === 0) {
    ElMessage.warning('请选择要结算的商品')
    return
  }
  if (!selectedAddressId.value) {
    ElMessage.warning('请选择收货地址，如果没有请先去添加')
    return
  }

  isCheckingOut.value = true
  const selectedItems = cartList.value.filter(item => item.selected)
  let successCount = 0
  let failCount = 0

  for (const item of selectedItems) {
    try {
      // 1. 尝试获取快照
      let snapshotImage = item.picture
      try {
        const imgUrl = assetImageUrl(item.picture)
        const imgRes = await fetch(imgUrl)
        if (imgRes.ok) {
          const blob = await imgRes.blob()
          const file = new File([blob], `snapshot_${Date.now()}.jpg`, { type: blob.type })
          const uploadRes = await uploadAsset('image', file)
          snapshotImage = uploadRes.fileName
        }
      } catch (e) {
        console.warn('图片快照上传失败，将使用原图', e)
      }

      // 2. 提交订单
      const payload = {
        addressId: selectedAddressId.value,
        productId: item.productId,
        productName: item.productName,
        productImage: snapshotImage,
        unitPrice: item.price,
        content: item.productName, // 购物车项没有详细描述，暂用名称代替
        count: item.count
      }

      const res = await api.post('/api/orders', payload)
      if (res.data && res.data.code === 200) {
        successCount++
        // 下单成功后静默删除购物车项
        await deleteItem(item.shoppingId, true)
      } else {
        failCount++
        console.error(`商品 ${item.productName} 下单失败:`, res.data?.msg)
      }
    } catch (err) {
      failCount++
      console.error(`商品 ${item.productName} 下单异常:`, err)
    }
  }

  isCheckingOut.value = false
  if (successCount > 0) {
    ElMessage.success(`成功下单 ${successCount} 件商品，请前往订单页面支付`)
  }
  if (failCount > 0) {
    ElMessage.error(`${failCount} 件商品下单失败，请检查库存或重试`)
  }
}

// 前往商品详情
function goToProductDetail(productId: number) {
  router.push(`/product/${productId}`)
}

onMounted(() => {
  fetchCartList()
  loadAddresses()
})
</script>

<template>
  <div class="cart-page">
    <SiteHeader />

    <div class="cart-container">
      <div class="cart-header">
        <h2>我的购物车</h2>
        <button class="clear-btn" @click="clearCart" v-if="cartList.length">
          清空购物车
        </button>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="cart-empty state">加载中...</div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="cart-empty state error">{{ error }}</div>

      <!-- 空购物车 -->
      <div v-else-if="cartList.length === 0" class="cart-empty">
        <div class="empty-icon">🛒</div>
        <p>购物车空空如也</p>
        <button class="go-shop-btn" @click="router.push('/')">去逛逛</button>
      </div>

      <!-- 购物车列表 -->
      <div v-else class="cart-content">
        <!-- 列表头部 -->
        <div class="cart-list-header">
          <label class="select-all">
            <input type="checkbox" v-model="allSelected" />
            <span>全选</span>
          </label>
          <span class="product-col">商品</span>
          <span class="price-col">单价</span>
          <span class="quantity-col">数量</span>
          <span class="total-col">小计</span>
          <span class="action-col">操作</span>
        </div>

        <!-- 商品列表 -->
        <div class="cart-list">
          <div class="cart-item" v-for="item in cartList" :key="item.shoppingId">
            <!-- 选中框 -->
            <label class="item-select">
              <input
                type="checkbox"
                v-model="item.selected"
                @change="toggleSelected(item)"
              />
            </label>

            <!-- 商品信息 -->
            <div class="product-info" @click="goToProductDetail(item.productId)">
              <img
                :src="getImageUrl(item.picture)"
                :alt="item.productName"
                class="product-img"
              />
              <div class="product-desc">
                <h4 class="product-name">{{ item.productName }}</h4>
              </div>
            </div>

            <!-- 单价 -->
            <div class="item-price">¥{{ item.price.toFixed(2) }}</div>

            <!-- 数量控制 -->
            <div class="quantity-control">
              <button
                class="qty-btn minus"
                @click="updateCount(item, item.count - 1)"
                :disabled="item.count <= 1"
              >
                -
              </button>
              <span class="qty-value">{{ item.count }}</span>
              <button
                class="qty-btn plus"
                @click="updateCount(item, item.count + 1)"
              >
                +
              </button>
            </div>

            <!-- 小计 -->
            <div class="item-subtotal">¥{{ (item.price * item.count).toFixed(2) }}</div>

            <!-- 操作 -->
            <div class="item-action">
              <button class="delete-btn" @click="deleteItem(item.shoppingId)">删除</button>
            </div>
          </div>
        </div>

        <!-- 底部结算栏 -->
        <div class="cart-footer">
          <label class="select-all-footer">
            <input type="checkbox" v-model="allSelected" />
            <span>全选</span>
          </label>

          <!-- 地址选择 -->
          <div class="address-selector-container">
            <div v-if="addresses.length > 0" class="address-selector">
              <span class="addr-label">配送至：</span>
              <select v-model="selectedAddressId" class="addr-select">
                <option v-for="addr in addresses" :key="addr.id" :value="addr.id">
                  {{ addr.consignee }} {{ addr.phone }} {{ addr.addressDetail }}
                </option>
              </select>
            </div>
            <div v-else class="no-address-tip">
              <span @click="router.push('/delivery-address')">请先添加收货地址</span>
            </div>
          </div>

          <div class="total-info">
            <span>已选商品：{{ selectedCount }} 件</span>
            <div class="total-price">
              合计：<span class="price">¥{{ totalPrice }}</span>
            </div>
          </div>

          <button class="checkout-btn" @click="checkout" :disabled="isCheckingOut">
            {{ isCheckingOut ? '结算中...' : '去结算' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cart-page {
  min-height: 100vh;
  background-color: #f8f9fa;
}

.cart-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.cart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.cart-header h2 {
  margin: 0;
  color: #333;
}

.clear-btn {
  background: #fff;
  border: 1px solid #ddd;
  color: #666;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.clear-btn:hover {
  background: #f5f5f5;
}

.state {
  text-align: center;
  padding: 80px 20px;
  color: #999;
}

.state.error {
  color: #e64340;
}

.cart-empty {
  text-align: center;
  padding: 80px 20px;
}

.empty-icon {
  font-size: 60px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.cart-empty p {
  color: #999;
  font-size: 16px;
  margin-bottom: 30px;
}

.go-shop-btn {
  background: #ff6b00;
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
}

.go-shop-btn:hover {
  background: #e05a00;
}

.cart-content {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.cart-list-header {
  display: grid;
  grid-template-columns: 60px 1fr 120px 150px 120px 100px;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  font-weight: 600;
  color: #666;
}

.select-all {
  display: flex;
  align-items: center;
}

.cart-list {
  max-height: calc(100vh - 350px);
  overflow-y: auto;
}

.cart-item {
  display: grid;
  grid-template-columns: 60px 1fr 120px 150px 120px 100px;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #f5f5f5;
}

.item-select {
  text-align: center;
}

.product-info {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.product-img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
  margin-right: 15px;
  border: 1px solid #eee;
}

.product-name {
  margin: 0;
  font-size: 16px;
  color: #333;
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-desc {
  display: flex;
  flex-direction: column;
}

.item-price {
  color: #e64340;
  font-weight: 600;
}

.quantity-control {
  display: flex;
  align-items: center;
  justify-content: center;
}

.qty-btn {
  width: 30px;
  height: 30px;
  border: 1px solid #ddd;
  background: #fff;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qty-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.qty-value {
  padding: 0 15px;
  font-size: 14px;
}

.item-subtotal {
  color: #e64340;
  font-weight: 600;
}

.item-action {
  text-align: center;
}

.delete-btn {
  background: transparent;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 14px;
}

.delete-btn:hover {
  color: #e64340;
}

.cart-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 20px;
  background: #fafafa;
  border-top: 1px solid #eee;
  border-radius: 0 0 8px 8px;
  flex-wrap: wrap;
  gap: 15px;
}

.address-selector-container {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.address-selector {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 400px;
}

.addr-label {
  white-space: nowrap;
  margin-right: 8px;
  color: #666;
}

.addr-select {
  flex: 1;
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  max-width: 100%;
}

.no-address-tip span {
  color: #e64340;
  cursor: pointer;
  text-decoration: underline;
}

.select-all-footer {
  display: flex;
  align-items: center;
}

.total-info {
  text-align: right;
  margin-right: 20px;
}

.total-price {
  font-size: 18px;
  font-weight: 600;
  margin-top: 5px;
}

.total-price .price {
  color: #e64340;
  font-size: 20px;
}

.checkout-btn {
  background: #ff6b00;
  color: #fff;
  border: none;
  padding: 12px 30px;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.checkout-btn:hover {
  background: #e05a00;
}

.checkout-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* 响应式适配 */
@media (max-width: 992px) {
  .cart-list-header {
    grid-template-columns: 50px 1fr 80px 120px 80px 80px;
    font-size: 14px;
  }

  .cart-item {
    grid-template-columns: 50px 1fr 80px 120px 80px 80px;
    padding: 15px;
  }

  .product-img {
    width: 60px;
    height: 60px;
  }

  .product-name {
    font-size: 14px;
  }
}

@media (max-width: 768px) {
  .cart-list-header {
    display: none;
  }

  .cart-item {
    display: flex;
    flex-wrap: wrap;
    padding: 15px;
    position: relative;
  }

  .item-select {
    position: absolute;
    top: 15px;
    left: 15px;
  }

  .product-info {
    width: 100%;
    padding-left: 40px;
    margin-bottom: 10px;
  }

  .item-price {
    width: 30%;
    padding-left: 40px;
    color: #666;
  }

  .quantity-control {
    width: 40%;
    justify-content: flex-start;
  }

  .item-subtotal {
    width: 30%;
    text-align: right;
  }

  .item-action {
    position: absolute;
    top: 15px;
    right: 15px;
  }

  .cart-footer {
    flex-wrap: wrap;
    gap: 15px;
    padding: 15px;
  }

  .total-info {
    width: 100%;
    margin-right: 0;
    text-align: left;
    order: 3;
  }

  .checkout-btn {
    width: 100%;
    order: 4;
  }
}
</style>
