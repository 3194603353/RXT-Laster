<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import api from '../utils/api'
import SiteHeader from "@/components/SiteHeader.vue"

interface Address {
  id: number
  ownName: string
  consignee: string
  phone: string
  addressDetail: string
  isDefault: number
}

const loading = ref(false)
const addresses = ref<Address[]>([])
const error = ref('')
const addingAddress = ref(false)
const newAddress = reactive<{
  consignee: string
  phone: string
  addressDetail: string
  isDefault: number
}>({
  consignee: '',
  phone: '',
  addressDetail: '',
  isDefault: 0
})

// 加载用户地址列表
function loadAddresses() {
  loading.value = true
  error.value = ''
  api.get('/api/users/addresses')
    .then(r => {
      if (r.data?.code === 200) {
        addresses.value = r.data.data || []
      } else if (r.data?.code === 401) {
        // handled by interceptor
        location.href = '/login'
      } else {
        error.value = r.data?.msg || '加载地址失败'
      }
    })
    .catch(() => {
      error.value = '请求失败'
    })
    .finally(() => {
      loading.value = false
    })
}

// 添加新地址
function addNewAddress() {
  if (!newAddress.consignee || !newAddress.phone || !newAddress.addressDetail) {
    error.value = '请填写完整的地址信息'
    return
  }

  addingAddress.value = true
  error.value = ''
  api.post('/api/users/addresses', newAddress)
    .then(r => {
      if (r.data?.code === 200) {
        loadAddresses() // 重新加载地址列表
        // 重置表单
        newAddress.consignee = ''
        newAddress.phone = ''
        newAddress.addressDetail = ''
        newAddress.isDefault = 0
      } else {
        error.value = r.data?.msg || '添加地址失败'
      }
    })
    .catch(() => {
      error.value = '请求失败'
    })
    .finally(() => {
      addingAddress.value = false
    })
}

// 删除地址
function deleteAddress(id: number) {
  if (confirm('确定要删除这个地址吗？')) {
    loading.value = true
    error.value = ''
    api.delete(`/api/users/addresses/${id}`)
      .then(r => {
        if (r.data?.code === 200) {
          loadAddresses() // 重新加载地址列表
        } else {
          error.value = r.data?.msg || '删除地址失败'
        }
      })
      .catch(() => {
        error.value = '请求失败'
      })
      .finally(() => {
        loading.value = false
      })
  }
}

// 设置默认地址
function setDefaultAddress(id: number) {
  loading.value = true
  error.value = ''
  api.put(`/api/users/addresses/${id}/default`)
    .then(r => {
      if (r.data?.code === 200) {
        loadAddresses() // 重新加载地址列表
      } else {
        error.value = r.data?.msg || '设置默认地址失败'
      }
    })
    .catch(() => {
      error.value = '请求失败'
    })
    .finally(() => {
      loading.value = false
    })
}

// 页面加载时获取地址列表
onMounted(loadAddresses)
</script>

<template>
  <div class="delivery-address-page">
    <SiteHeader />
    <div class="content">
      <div class="container">
        <h1 class="page-title">收货地址管理</h1>

        <!-- 地址列表 -->
        <div class="address-section">
          <h2 class="section-title">我的收货地址</h2>
          <div v-if="loading" class="loading">加载中...</div>
          <div v-else class="address-list">
            <div v-if="addresses.length === 0" class="no-address">暂无收货地址，请添加</div>
            <div v-else class="address-item" v-for="addr in addresses" :key="addr.id">
              <div class="address-info">
                <div class="address-header">
                  <span class="consignee">{{ addr.consignee }}</span>
                  <span class="phone">{{ addr.phone }}</span>
                  <span v-if="addr.isDefault === 1" class="default-tag">默认</span>
                </div>
                <div class="address-detail">{{ addr.addressDetail }}</div>
              </div>
              <div class="address-actions">
                <button v-if="addr.isDefault !== 1" class="small-btn" @click="setDefaultAddress(addr.id)">设为默认</button>
                <button class="small-btn danger-btn" @click="deleteAddress(addr.id)">删除</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 添加新地址 -->
        <div class="add-address-section">
          <h2 class="section-title">添加新地址</h2>
          <div class="address-form">
            <div class="form-row">
              <label>收货人</label>
              <input v-model="newAddress.consignee" type="text" placeholder="请输入收货人姓名" />
            </div>
            <div class="form-row">
              <label>手机号</label>
              <input v-model="newAddress.phone" type="tel" placeholder="请输入手机号" />
            </div>
            <div class="form-row">
              <label>详细地址</label>
              <textarea v-model="newAddress.addressDetail" rows="3" placeholder="请输入详细地址"></textarea>
            </div>
            <div class="form-row checkbox-row">
              <label>
                <input v-model="newAddress.isDefault" type="checkbox" :true-value="1" :false-value="0" />
                设为默认地址
              </label>
            </div>
            <button class="submit-btn" @click="addNewAddress" :disabled="addingAddress">
              {{ addingAddress ? '添加中...' : '添加地址' }}
            </button>
          </div>
        </div>

        <!-- 错误信息 -->
        <div v-if="error" class="error-message">{{ error }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.delivery-address-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.content {
  padding: 24px 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
}

.page-title {
  font-size: 24px;
  color: #333;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}

.section-title {
  font-size: 18px;
  color: #333;
  margin-bottom: 16px;
}

.address-section {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.address-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.address-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  border: 1px solid #eee;
  border-radius: 8px;
  background: #fff;
  transition: box-shadow 0.2s;
}

.address-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.address-info {
  flex: 1;
}

.address-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.consignee {
  font-weight: 600;
  color: #333;
  font-size: 16px;
}

.phone {
  color: #666;
  font-size: 14px;
}

.default-tag {
  background: #ff6700;
  color: #fff;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
}

.address-detail {
  color: #555;
  line-height: 1.6;
  font-size: 14px;
}

.address-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-left: 16px;
}

.small-btn {
  padding: 6px 16px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fff;
  color: #666;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.small-btn:hover {
  border-color: #36a24a;
  color: #36a24a;
}

.danger-btn:hover {
  border-color: #d9534f;
  color: #d9534f;
}

.no-address {
  text-align: center;
  padding: 40px;
  color: #999;
  font-size: 14px;
}

.add-address-section {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.address-form {
  max-width: 600px;
}

.form-row {
  margin-bottom: 16px;
}

.form-row label {
  display: block;
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-row input[type="text"],
.form-row input[type="tel"],
.form-row textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.form-row input:focus,
.form-row textarea:focus {
  outline: none;
  border-color: #36a24a;
}

.form-row textarea {
  resize: vertical;
  min-height: 80px;
}

.checkbox-row label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  cursor: pointer;
  font-weight: normal;
}

.checkbox-row input[type="checkbox"] {
  margin: 0;
  cursor: pointer;
}

.submit-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 6px;
  background: #36a24a;
  color: #fff;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: background 0.2s;
}

.submit-btn:hover:not(:disabled) {
  background: #2d8f3f;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  margin-top: 16px;
  padding: 12px;
  background: #fdf2f0;
  border: 1px solid #fee;
  border-radius: 6px;
  color: #d9534f;
  font-size: 14px;
  text-align: center;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .address-item {
    flex-direction: column;
  }

  .address-actions {
    flex-direction: row;
    justify-content: flex-end;
    margin-left: 0;
    margin-top: 12px;
  }

  .address-header {
    flex-wrap: wrap;
  }

  .container {
    padding: 0 12px;
  }

  .page-title {
    font-size: 20px;
  }

  .section-title {
    font-size: 16px;
  }
}
</style>
