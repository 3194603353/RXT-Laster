<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import SiteHeader from '@/components/SiteHeader.vue'
import api from '../utils/api'
import { uploadAsset, assetImageUrl } from '../utils/asset'

const route = useRoute()
const router = useRouter()
const id = Number(route.params.id)

// 定义地址接口，与后端Address实体类匹配
type Address = {
  id: number
  ownName: string
  consignee: string
  phone: string
  addressDetail: string
  isDefault: number
};type Product = {
  productId: number
  title: string
  price: number
  stock_quantity: number
  content: string
  picture: string
  own_name: string
  type: number
  create_time?: string
  update_time?: string
}

const product = ref<Product | null>(null)
const quantity = ref(1)
const loading = ref(false)
const isAdding = ref(false)
const isPurchasing = ref(false)
const isSupplying = ref(false)
const error = ref<string | null>(null)
// 地址相关
const addresses = ref<Address[]>([])
const selectedAddressId = ref<number | null>(null)
const addressLoading = ref(false)
const addressError = ref<string | null>(null)

function getImageUrl(name?: string) {
  return assetImageUrl(name)
}

function displayTitle(p: Product) {
  const prefix = p.type === 1 ? '[供] ' : '[需] '
  return prefix + (p.title || '')
}

const isSupply = computed(() => product.value?.type === 1)
const isDemand = computed(() => product.value?.type === 0)
const unitPrice = computed(() => Number(product.value?.price ?? 0))
const totalPrice = computed(() => {
  // 总价 = 单价 * 数量（如果价格或数量非法，则返回单价）
  const q = Number(quantity.value)
  const p = unitPrice.value
  if (!isFinite(q) || !isFinite(p)) return p
  return p * (q > 0 ? q : 1)
})
// 归一化处理后仅使用
const stockQuantity = computed(() => product.value ? (product.value.stock_quantity || 1) : 1)
const maxQuantity = computed(() => stockQuantity.value > 0 ? stockQuantity.value : 1)

function canIncrease() {
  if (!product.value) return false
  if (isDemand.value) return false
  return quantity.value < maxQuantity.value
}

function canDecrease() {
  if (!product.value) return false
  if (isDemand.value) return false
  return quantity.value > 1
}

function inc() { if (canIncrease()) quantity.value++ }
function dec() { if (canDecrease()) quantity.value-- }

watch(product, (p) => {
  if (!p) return
  if (isDemand.value) {
    // 需求：数量即需求量，直接设定并只读
    quantity.value = stockQuantity.value
  } else {
    // 供给：默认 1
    quantity.value = 1
  }
})

// 当用户手动输入时进行范围钳制
watch(quantity, (q) => {
  if (isSupply.value) {
    if (q < 1) quantity.value = 1
    if (q > maxQuantity.value) quantity.value = maxQuantity.value
  }
})

// 核心：加入购物车方法
const addToCart = async () => {
  if (!product.value) {
    ElMessage.warning('商品信息未加载完成')
    return
  }

  if (quantity.value < 1) {
    ElMessage.warning('请选择有效数量')
    return
  }

  isAdding.value = true
  try {
    // 调用后端加入购物车接口
    const res = await api.post('/api/cart', {
      productId: product.value.productId, // 正确访问productId
      count: quantity.value,              // 使用quantity而不是count
      selected: true                      // 默认选中
    })

    if (res.data.code === 200) {
      ElMessage.success('加入购物车成功！')
    } else if (res.data.code === 401) {
      // 未登录处理
      ElMessageBox.confirm(
        '登录后才能加入购物车哦',
        '提示',
        {
          confirmButtonText: '去登录',
          cancelButtonText: '取消',
          type: 'info'
        }
      ).then(() => {
        // 登录后返回当前商品页
        router.push({
          path: '/login',
          query: { redirect: route.fullPath }
        })
      })
    } else {
      ElMessage.error(res.data.msg || '加入购物车失败')
    }
  } catch (error) {
    console.error('加入购物车请求失败：', error)
    ElMessage.error('网络异常，请稍后重试')
  } finally {
    isAdding.value = false
  }
}

async function purchase() {
  if (!product.value) return
  if (!selectedAddressId.value) {
    ElMessage.warning('请选择收货地址')
    return
  }

  isPurchasing.value = true
  try {
    // 1. 获取当前图片并上传作为快照
    // 注意：这里假设图片服务器允许跨域获取Blob，或者同源
    let snapshotImage = product.value.picture
    try {
      const imgUrl = assetImageUrl(product.value.picture)
      const imgRes = await fetch(imgUrl)
      if (imgRes.ok) {
        const blob = await imgRes.blob()
        const file = new File([blob], `snapshot_${Date.now()}.jpg`, { type: blob.type })
        const uploadRes = await uploadAsset('image', file)
        snapshotImage = uploadRes.fileName
      }
    } catch (e) {
      console.warn('图片快照上传失败，将使用原图文件名', e)
    }

    // 2. 提交订单
    const payload = {
      addressId: selectedAddressId.value,
      productId: product.value.productId,
      productName: product.value.title,
      productImage: snapshotImage,
      unitPrice: unitPrice.value,
      content: product.value.content,
      count: quantity.value
    }

    const res = await api.post('/api/orders', payload)
    if (res.data && res.data.code === 200) {
      ElMessage.success('下单成功，请前往订单页面支付')
      // 可以跳转到订单列表页，这里暂时刷新或留在当前页
    } else {
      let msg = res.data?.msg || '下单失败'
      if (msg.includes('库存不足')) {
        msg = '库存不足，购买失败'
      }
      ElMessage.error(msg)
    }
  } catch (err) {
    console.error(err)
    ElMessage.error('下单过程中发生错误')
  } finally {
    isPurchasing.value = false
  }
}

async function supplyForDemand() {
  if (!product.value) return

  isSupplying.value = true
  try {
    // 1. 获取当前图片并上传作为快照
    let snapshotImage = product.value.picture
    try {
      const imgUrl = assetImageUrl(product.value.picture)
      const imgRes = await fetch(imgUrl)
      if (imgRes.ok) {
        const blob = await imgRes.blob()
        const file = new File([blob], `snapshot_${Date.now()}.jpg`, { type: blob.type })
        const uploadRes = await uploadAsset('image', file)
        snapshotImage = uploadRes.fileName
      }
    } catch (e) {
      console.warn('图片快照上传失败，将使用原图文件名', e)
    }

    // 2. 提交订单 (需求订单不需要地址，由买家后续确认)
    const payload = {
      addressId: null, // 需求响应时，卖家不需要提供地址
      productId: product.value.productId,
      productName: product.value.title,
      productImage: snapshotImage,
      unitPrice: unitPrice.value,
      content: product.value.content,
      count: quantity.value
    }

    const res = await api.post('/api/orders', payload)
    if (res.data && res.data.code === 200) {
      ElMessage.success('供给订单已提交，可前往我的订单查看详情')
    } else {
      let msg = res.data?.msg || '提交失败'
      if (msg.includes('库存不足')) {
        msg = '供给失败，该需求已被满足'
      }
      ElMessage.error(msg)
    }
  } catch (err) {
    console.error(err)
    ElMessage.error('提交过程中发生错误')
  } finally {
    isSupplying.value = false
  }
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await api.get(`/api/products/${id}`)
    if (res.data?.code === 200) {
      const raw = res.data.data || {}
      // 归一化字段，避免命名不一致导致库存为 1
      const data: Product = {
        productId: raw.productId ?? raw.id ?? 0,
        title: raw.title ?? raw.name ?? '',
        price: Number(raw.price ?? raw.unitPrice ?? 0),
        stock_quantity: Number(
          raw.stock_quantity ??
          raw.stockQuantity ??
          raw.stock ??
          raw.quantity ??
          raw.amount ?? 1
        ),
        content: raw.content ?? raw.description ?? '',
        picture: raw.picture ?? raw.image ?? '',
        own_name: raw.own_name ?? raw.ownName ?? raw.ownerName ?? '',
        type: Number(raw.type ?? raw.productType ?? 1),
        create_time: raw.create_time ?? raw.createTime,
        update_time: raw.update_time ?? raw.updateTime
      }
      product.value = data
      console.log('[ProductDetail] Loaded product:', data)
    } else {
      throw new Error(res.data?.msg || '获取商品失败')
    }
  } catch (e: unknown) {
    error.value = (e as Error).message || '网络错误'
  } finally {
    loading.value = false
  }
}

// 加载用户地址
async function loadAddresses() {
  addressLoading.value = true
  addressError.value = null
  try {
    console.log('开始加载地址...')
    const res = await api.get('/api/users/addresses')
    console.log('地址API响应:', res)

    if (res && res.data && res.data.code === 200) {
      const addressList = res.data.data || []
      console.log('原始地址数据:', addressList)


      addresses.value = addressList

      console.log('处理后的地址列表:', addresses.value)

      // 自动选中默认地址，如果没有默认地址则选中第一个
      const defaultAddress = addresses.value.find(addr => addr.isDefault === 1)
      if (defaultAddress) {
        selectedAddressId.value = defaultAddress.id
        console.log('选中默认地址:', defaultAddress.id)
      } else if (addresses.value.length > 0) {
        selectedAddressId.value = addresses.value[0].id
        console.log('没有默认地址，选中第一个地址:', addresses.value[0].id)
      }
    } else {
      const errorMsg = res?.data?.msg || '获取地址失败，API返回码:' + (res?.data?.code || '未知')
      console.error('地址API错误:', errorMsg)
      throw new Error(errorMsg)
    }
  } catch (e: unknown) {
    const errorMessage = (e as Error).message || '网络错误'
    console.error('加载地址时出错:', errorMessage)
    addressError.value = errorMessage
    // 添加模拟数据以便测试
    // addresses.value = [{id: 1, ownName: 'test', consignee: '测试用户', phone: '13800138000', addressDetail: '北京市朝阳区测试街道1号', isDefault: 1}]
  } finally {
    addressLoading.value = false
  }
}

// 前往地址管理页面
function goToAddressManagement() {
  router.push('/delivery-address')
}

// 获取选中的地址
const selectedAddress = computed(() => {
  return addresses.value.find(addr => addr.id === selectedAddressId.value) || addresses.value[0] || null
})

// 下拉框状态
const isDropdownExpanded = ref(false)

// 切换下拉框显示/隐藏
function toggleAddressDropdown() {
  isDropdownExpanded.value = !isDropdownExpanded.value
}

// 选择地址
function selectAddress(id: number) {
  selectedAddressId.value = id
  isDropdownExpanded.value = false
}

// 点击外部关闭下拉框
onMounted(() => {
  load()
  loadAddresses()

  // 添加点击外部关闭下拉框的事件监听
  document.addEventListener('click', handleClickOutside)
})

// 清理事件监听
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// 处理点击外部事件
function handleClickOutside(event: MouseEvent) {
  const dropdown = document.querySelector('.address-dropdown')
  if (dropdown && !dropdown.contains(event.target as Node)) {
    isDropdownExpanded.value = false
  }
}
</script>

<template>
  <div class="detail">
    <SiteHeader />
    <div class="toolbar">
      <button class="back-btn" @click="router.back()"><span class="icon" aria-hidden="true">←</span><span>返回</span></button>
    </div>
    <div class="wrap">
      <div v-if="loading" class="state">加载中…</div>
      <div v-else-if="error" class="state error">{{ error }}</div>
      <div v-else-if="product" class="layout">
        <div class="left">
          <img class="cover" :src="getImageUrl(product.picture)" :alt="product.title" />
        </div>
        <div class="right">
          <div class="right-top">
            <h1 class="title">{{ displayTitle(product) }}</h1>
            <p class="unit-price">单价：¥{{ unitPrice.toFixed(2) }}</p>
            <p class="price">
              <span class="total-label">{{ isSupply ? '当前价格' : '预计收款' }}：¥{{ totalPrice.toFixed(2) }}</span>
            </p>
            <p class="content">{{ product.content }}</p>
          </div>

          <div class="right-middle">
            <label class="qty">
              <span>数量(kg):</span>
              <div class="qty-box">
                <button class="qty-btn" :disabled="!canDecrease()" @click="dec">-</button>
                <input
                  class="qty-input"
                  type="number"
                  :min="isSupply ? 1 : quantity"
                  :max="isSupply ? maxQuantity : quantity"
                  v-model.number="quantity"
                  :readonly="isDemand"
                />
                <button class="qty-btn" :disabled="!canIncrease()" @click="inc">+</button>
              </div>
              <span class="qty-hint" v-if="isSupply">(最大 {{ maxQuantity }} kg)</span>
            </label>

            <!-- 地址选择区域 -->
            <div class="address-section" v-if="isSupply">
              <h3 class="section-title">收货地址</h3>

              <!-- 加载状态 -->
              <div v-if="addressLoading" class="address-loading">
                <div class="loading-spinner"></div>
                <span>正在加载地址信息...</span>
              </div>

              <!-- 错误状态 -->
              <div v-else-if="addressError" class="address-error">
                <p>加载地址失败: {{ addressError }}</p>
                <p class="debug-info">请检查网络连接或稍后重试</p>
              </div>

              <!-- 无地址状态 -->
              <div v-else-if="addresses.length === 0" class="no-address">
                <p>你还没有收货地址，</p>
                <button class="action-btn" @click="goToAddressManagement">
                  前往收货地址管理页面添加
                </button>
              </div>

              <!-- 地址下拉选择器 -->
              <div v-else class="address-dropdown">
                <div class="dropdown-header" @click="toggleAddressDropdown">
                  <div class="selected-address">
                    <div v-if="selectedAddress" class="selected-address-content">
                      <div class="address-header">
                        <span class="address-name"><strong>收货人：</strong>{{ selectedAddress.consignee }}</span>
                        <span class="address-phone"><strong>电话：</strong>{{ selectedAddress.phone }}</span>
                        <span v-if="selectedAddress.isDefault === 1" class="default-tag">默认地址</span>
                      </div>
                      <div class="address-detail">
                        <strong>地址：</strong>{{ selectedAddress.addressDetail }}
                      </div>
                    </div>
                  </div>
                  <div class="dropdown-arrow" :class="{ expanded: isDropdownExpanded }">▼</div>
                </div>

                <!-- 下拉选项 -->
                <div class="dropdown-options" v-if="isDropdownExpanded">
                  <div
                    v-for="address in addresses"
                    :key="address.id"
                    class="dropdown-option"
                    :class="{ selected: selectedAddressId === address.id }"
                    @click="selectAddress(address.id)"
                  >
                    <div class="address-content">
                      <div class="address-header">
                        <span class="address-name">{{ address.consignee }}</span>
                        <span class="address-phone">{{ address.phone }}</span>
                        <span v-if="address.isDefault === 1" class="default-tag">默认</span>
                      </div>
                      <div class="address-detail">
                        {{ address.addressDetail }}
                      </div>
                    </div>
                  </div>
                  <div class="dropdown-footer">
                    <button class="add-address-btn" @click="goToAddressManagement">
                      + 添加新地址
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="right-bottom">
            <div class="buttons">
              <button
                class="add-cart-btn"
                @click="addToCart"
                :loading="isAdding"
                :disabled="isDemand || !product"
              >
                加入购物车
              </button>
              <button v-if="isSupply" class="btn secondary" @click="purchase" :disabled="isPurchasing">
                {{ isPurchasing ? '提交中...' : '立即购买' }}
              </button>
              <button v-else class="btn primary" @click="supplyForDemand" :disabled="isSupplying">
                {{ isSupplying ? '提交中...' : '我要供给' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toolbar { padding:16px 40px 0; }
.back-btn { display:inline-flex; align-items:center; gap:8px; background:linear-gradient(135deg,#f1faf3,#e2f5e6); border:1px solid #c9e8d0; color:#237a40; padding:8px 16px; border-radius:999px; font-size:14px; cursor:pointer; font-weight:600; box-shadow:0 2px 4px rgba(0,0,0,.04); transition:all .18s ease; }
.back-btn .icon { font-size:16px; line-height:1; }
.back-btn:hover { background:linear-gradient(135deg,#e7f7eb,#d7f1dd); border-color:#b4ddbd; transform:translateY(-1px); }
.back-btn:active { transform:translateY(0); }
.wrap { padding: 0 40px 40px; }
.state { padding: 24px; color: #666; }
.state.error { color: #c0392b; }
.layout { display:flex; gap:60px; align-items:stretch; width:100%; }
.left { flex:1 1 50%; max-width:50%; }
.right { flex:1 1 50%; max-width:50%; display:flex; flex-direction:column; justify-content:space-between; min-height:600px; }
.cover { width:100%; height:600px; object-fit:cover; border-radius:16px; border:1px solid #eee; }
.title { margin:0 0 12px; font-size:30px; font-weight:600; }
.price { color:#2eaf3b; font-weight:700; font-size:22px; }

.unit-price { color:#16a34a; font-size:14px; font-weight:600; margin:6px 0 4px; opacity:.9; }
.content { margin-top:16px; color:#475569; line-height:1.8; font-size:15px; }
.right-top { padding-right:40px; }
.right-middle { margin-top:10px; }
.right-bottom { display:flex; justify-content:flex-start; }
.qty { display:flex; align-items:center; gap:14px; font-size:15px; }
.qty-box { display:flex; align-items:center; gap:8px; }
.qty-btn { width:36px; height:36px; border-radius:8px; border:1px solid #d4d4d4; background:#fff; cursor:pointer; font-size:18px; }
.qty-btn:disabled { opacity:.35; cursor:not-allowed; }
.qty-input { width:70px; text-align:center; padding:6px 8px; border:1px solid #d4d4d4; border-radius:8px; font-size:16px; }
.qty-hint { color:#94a3b8; font-size:12px; }

  /* 地址选择样式 */
  .address-section {
    margin-top:32px;
    padding:20px;
    background:#fafafa;
    border-radius:12px;
    border:1px solid #e2e8f0;
    min-height: 120px;
  }
  .section-title {
    font-size:18px;
    font-weight:600;
    margin:0 0 16px 0;
    color:#1e293b;
  }

  /* 加载状态 */
  .address-loading {
    padding:30px 0;
    text-align:center;
    display:flex;
    flex-direction:column;
    align-items:center;
    gap:10px;
  }
  .loading-spinner {
    width: 30px;
    height: 30px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #2563eb;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* 错误状态 */
  .address-error {
    padding:30px 0;
    text-align:center;
    color:#ef4444;
  }
  .debug-info {
    font-size:13px;
    color:#94a3b8;
    margin-top:8px;
  }

  /* 无地址状态 */
  .no-address {
    padding:30px 0;
    text-align:center;
    color:#64748b;
  }
  .action-btn {
    margin-top:12px;
    padding:8px 16px;
    background:#2563eb;
    color:white;
    border:none;
    border-radius:6px;
    cursor:pointer;
    font-size:14px;
  }
  .action-btn:hover {
    background:#1d4ed8;
  }

  /* 地址下拉选择器样式 */
  .address-dropdown {
    position: relative;
    width: 100%;
    z-index: 100;
  }

  /* 下拉框头部 */
  .dropdown-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: #fff;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }

  .dropdown-header:hover {
    border-color: #cbd5e1;
    box-shadow: 0 2px 6px rgba(0,0,0,0.08);
  }

  .selected-address {
    flex: 1;
  }

  .selected-address-content {
    line-height: 1.5;
  }

  /* 下拉箭头 */
  .dropdown-arrow {
    margin-left: 16px;
    color: #64748b;
    font-size: 12px;
    transition: transform 0.2s ease;
  }

  .dropdown-arrow.expanded {
    transform: rotate(180deg);
  }

  /* 下拉选项 - 向上展开 */
  .dropdown-options {
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    margin-bottom: 4px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    box-shadow: 0 -4px 12px rgba(0,0,0,0.1);
    max-height: 300px;
    overflow-y: auto;
    z-index: 101;
  }

  /* 下拉选项项 */
  .dropdown-option {
    padding: 16px;
    cursor: pointer;
    border-bottom: 1px solid #f1f5f9;
    transition: background-color 0.2s ease;
  }

  .dropdown-option:last-child {
    border-bottom: none;
  }

  .dropdown-option:hover {
    background-color: #f8fafc;
  }

  .dropdown-option.selected {
    background-color: #eff6ff;
    border-left: 4px solid #2563eb;
  }

  /* 地址内容 */
  .address-content {
    line-height: 1.5;
  }

  .address-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }

  .address-name {
    font-weight: 600;
    color: #1e293b;
    font-size: 15px;
  }

  .address-phone {
    color: #64748b;
    font-size: 14px;
  }

  .default-tag {
    font-size: 12px;
    color: #2563eb;
    background: #eff6ff;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 500;
  }

  .address-detail {
    color: #475569;
    line-height: 1.6;
    font-size: 14px;
  }

  /* 下拉框底部 */
  .dropdown-footer {
    padding: 12px 16px;
    border-top: 1px solid #f1f5f9;
    background-color: #f8fafc;
  }

  .add-address-btn {
    width: 100%;
    padding: 8px 16px;
    background: none;
    color: #2563eb;
    border: 1px dashed #cbd5e1;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    text-align: center;
    transition: all 0.2s ease;
  }

  .add-address-btn:hover {
    background-color: #eff6ff;
    border-color: #94a3b8;
  }

  .buttons { display:flex; gap:28px; flex-wrap:wrap; }
.btn { background:#36a24a; color:#fff; padding:14px 30px; border:none; border-radius:12px; cursor:pointer; font-size:15px; font-weight:600; box-shadow:0 2px 6px rgba(0,0,0,0.06); letter-spacing:.5px; transition:background .18s ease, transform .18s ease; }
.btn.primary { background:#2e923f; }
.btn.secondary { background:#3fb354; }
.btn:hover { transform:translateY(-2px); }
.btn.primary:hover { background:#277f35; }
.btn.secondary:hover { background:#359b48; }
.btn:active { transform:translateY(0); }
.add-cart-btn {
  background:#ff6b00;
  color:#fff;
  padding:14px 30px;
  border:none;
  border-radius:12px;
  cursor:pointer;
  font-size:15px;
  font-weight:600;
  box-shadow:0 2px 6px rgba(0,0,0,0.06);
  letter-spacing:.5px;
  transition:background .18s ease, transform .18s ease;
}
.add-cart-btn:hover:not(:disabled) {
  background:#e05a00;
  transform:translateY(-2px);
}
.add-cart-btn:active:not(:disabled) {
  transform:translateY(0);
}
.add-cart-btn:disabled {
  background:#ccc;
  cursor:not-allowed;
  transform:none;
}
@media (max-width: 1000px){ .layout{ flex-direction:column; } .left, .right{ max-width:100%; } .cover{ height:380px; } }
</style>
