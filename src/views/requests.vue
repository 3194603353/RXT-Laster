<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import SiteHeader from '../components/SiteHeader.vue'
import api from '@/utils/api'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import { assetImageUrl, uploadAsset } from '@/utils/asset'

type Product = {
  productId: number
  title: string
  price: number
  stockQuantity: number
  content: string
  picture: string
  ownName: string
  type: number
}

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const error = ref<string | null>(null)
const products = ref<Product[]>([])
const keyword = ref('')
const isManage = computed(() => (route.query.manage === '1'))

function currentUserName(): string | null {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    const obj = JSON.parse(raw)
    return obj.userName || obj.user_name || obj.username || null
  } catch { return null }
}

const filtered = computed(() => {
  const base = products.value.filter(p => p.type === 0)
  const me = currentUserName()

  let managed = base
  if (isManage.value) {
    managed = base.filter(p => me ? p.ownName === me : false)
  } else {
    // 不显示当前用户的需求
    managed = base.filter(p => me ? p.ownName !== me : true)
  }

  return managed.filter(p => {
    const k = keyword.value.trim().toLowerCase()
    if (!k) return true
    return (p.title || '').toLowerCase().includes(k) || (p.content || '').toLowerCase().includes(k)
  })
})

function img(name?: string){ return assetImageUrl(name) }
function goDetail(id: number){ router.push({ name: 'product-detail', params: { id } }) }
function displayTitle(p: Product){ return '[需] ' + (p.title || '') }

// manage actions
const showForm = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const form = ref<{ productId?: number; title: string; price: string; stockQuantity: string; content: string; picture: string }>(
  { title: '', price: '', stockQuantity: '', content: '', picture: '' }
)
const uploading = ref(false)
const uploadError = ref<string | null>(null)
const formErrors = computed(() => {
  const errs: { [k: string]: string } = {}
  const title = form.value.title?.trim()
  const priceNum = Number(form.value.price)
  const stockNum = Number(form.value.stockQuantity)
  const content = form.value.content?.trim()
  const picture = form.value.picture?.trim()

  if (!title) errs.title = '标题为必填项'
  if (!Number.isFinite(priceNum) || priceNum <= 0) errs.price = '价格需为大于0的数字'
  if (!Number.isFinite(stockNum) || stockNum <= 0 || !Number.isInteger(stockNum)) errs.stockQuantity = '数量需为大于0的整数'
  if (!content) errs.content = '需求说明为必填项'
  if (!picture) errs.picture = '请上传需求图片'

  return errs
})

const isFormValid = computed(() => Object.keys(formErrors.value).length === 0)

function openCreate(){
  formMode.value = 'create'
  showForm.value = true
  form.value = { title: '', price: '', stockQuantity: '', content: '', picture: '' }
}
function openEdit(p: Product){
  formMode.value = 'edit'
  showForm.value = true
  form.value = {
    productId: p.productId,
    title: p.title || '',
    price: String(p.price ?? ''),
    stockQuantity: String(p.stockQuantity ?? ''),
    content: p.content || '',
    picture: p.picture || '',
  }
}
async function handleUpload(e: Event){
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploading.value = true
  uploadError.value = null
  try {
    const { fileName } = await uploadAsset('image', file)
    form.value.picture = fileName
  } catch (err) {
    uploadError.value = (err as Error)?.message || '上传失败'
  } finally { uploading.value = false }
}

async function doDelete(p: Product){
  if (!confirm('确定删除该需求吗？')) return
  try {
    const res = await api.delete(`/api/products/${p.productId}`)
    if (res.data?.code === 200) {
      products.value = products.value.filter(x => x.productId !== p.productId)
    } else {
      alert(res.data?.msg || '删除失败')
    }
  } catch { alert('网络错误') }
}

async function submitForm(){
  const me = currentUserName()
  if (!me) { alert('未登录或用户信息缺失'); return }
  if (!isFormValid.value) { alert('请完整填写所有必填项并确保数值有效'); return }
  const payload = {
    title: form.value.title,
    price: Number(form.value.price || 0),
    stockQuantity: Number(form.value.stockQuantity || 0),
    content: form.value.content,
    picture: form.value.picture,
    ownName: me,
    type: 0,
  }
  try {
    if (formMode.value === 'create'){
      const res = await api.post('/api/products', payload)
      if (res.data?.code === 200){
        showForm.value = false
        await load()
      } else alert(res.data?.msg || '发布失败')
    } else {
      const id = form.value.productId
      const res = await api.put(`/api/products/${id}`, payload)
      if (res.data?.code === 200){
        showForm.value = false
        await load()
      } else alert(res.data?.msg || '更新失败')
    }
  } catch { alert('网络错误') }
}

async function load(){
  loading.value = true
  error.value = null
  try {
    const res = await api.get('/api/products')
    if (res.data?.code === 200) {
      products.value = res.data.data || []
    } else throw new Error(res.data?.msg || '加载失败')
  } catch(e: unknown){
    error.value = (e as Error).message || '网络错误'
  } finally { loading.value = false }
}

// 状态恢复与保存逻辑
onMounted(async () => {
  const stateStr = sessionStorage.getItem('REQUESTS_STATE')
  if (stateStr) {
    try {
      const state = JSON.parse(stateStr)
      keyword.value = state.keyword || ''
      await load()
      nextTick(() => {
        window.scrollTo(0, state.scrollTop || 0)
      })
    } catch (e) {
      console.error('恢复状态失败', e)
      load()
    }
  } else {
    load()
  }
})

onBeforeRouteLeave((to, from, next) => {
  if (to.name === 'product-detail') {
    const state = {
      keyword: keyword.value,
      scrollTop: window.scrollY
    }
    sessionStorage.setItem('REQUESTS_STATE', JSON.stringify(state))
  } else {
    sessionStorage.removeItem('REQUESTS_STATE')
  }
  next()
})
</script>

<template>
  <div class="page">
    <SiteHeader :extra-nav-link="{ label: '我的需求管理', to: { name: 'requests', query: { manage: '1' } } }" />
    <section class="search-bar">
      <input v-model="keyword" class="search-input" placeholder="搜索需求…" />
    </section>
    <section class="section-title">{{ isManage ? '我的求购需求列表' : '求购需求列表' }}</section>
    <div v-if="isManage" class="manage-toolbar">
      <button class="btn" @click="openCreate">发布需求</button>
    </div>
    <div v-if="loading" class="state">加载中…</div>
    <div v-else-if="error" class="state error">{{ error }}</div>
    <div v-else class="grid">
      <article v-for="p in filtered" :key="p.productId" class="card" :class="{ 'no-pointer': isManage }" @click="!isManage && goDetail(p.productId)">
        <div class="thumb">
          <img :src="img(p.picture)" :alt="p.title" @error="($event.target as HTMLImageElement).src='/favicon.ico'" />
          <span class="badge danger">需求</span>
        </div>
        <div class="meta">
          <h3 class="title" :title="displayTitle(p)">{{ displayTitle(p) }}</h3>
          <p class="desc">{{ p.content }}</p>
          <div class="bottom"><span class="price">{{ isManage ? '预计需支付' : '预计收款' }} ¥{{ Number(p.price).toFixed(2) }}</span></div>
          <div v-if="isManage" class="manage-actions" @click.stop>
            <button class="link" @click="openEdit(p)">编辑</button>
            <button class="link danger" @click="doDelete(p)">删除</button>
          </div>
        </div>
      </article>
      <div v-if="!filtered.length" class="empty">暂无需求</div>
    </div>

    <div v-if="showForm" class="modal-backdrop" @click.self="showForm=false">
      <div class="modal">
        <h3>{{ formMode === 'create' ? '发布需求' : '编辑需求' }}</h3>
        <div class="form">
          <label>标题
            <input v-model="form.title" placeholder="如：求购水蜜桃" />
            <small v-if="formErrors.title" class="error">{{ formErrors.title }}</small>
          </label>
          <label>预计价格（¥/kg）
            <input v-model="form.price" type="number" min="0" step="0.01" />
            <small v-if="formErrors.price" class="error">{{ formErrors.price }}</small>
          </label>
          <label>预计数量（kg）
            <input v-model="form.stockQuantity" type="number" min="0" step="1" />
            <small v-if="formErrors.stockQuantity" class="error">{{ formErrors.stockQuantity }}</small>
          </label>
          <label>需求说明
            <textarea v-model="form.content" rows="4" />
            <small v-if="formErrors.content" class="error">{{ formErrors.content }}</small>
          </label>
          <label>需求图片
            <input type="file" accept="image/*" @change="handleUpload" />
            <small v-if="uploading">正在上传…</small>
            <small v-else-if="uploadError" class="error">{{ uploadError }}</small>
            <div v-if="form.picture" class="preview">
              <img :src="img(form.picture)" alt="预览" />
            </div>
            <small v-if="formErrors.picture" class="error">{{ formErrors.picture }}</small>
          </label>
        </div>
        <div class="modal-actions">
          <button class="btn" :disabled="!isFormValid" @click="submitForm">提交</button>
          <button class="btn ghost" @click="showForm=false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { background:#fff; }
.search-bar { display:flex; padding:16px 24px; gap:10px; border-bottom:1px solid #eee; }
.search-input { flex:1; padding:10px 12px; border:1px solid #ddd; border-radius:6px; }
.section-title { font-weight:700; margin:18px 24px 6px; }
.manage-toolbar { margin:0 24px 10px; }
.btn { background:#36a24a; color:#fff; border:none; padding:8px 14px; border-radius:6px; cursor:pointer; }
.btn:hover { background:#2f923f; }
.btn.ghost { background:#fff; color:#36a24a; border:1px solid #36a24a; }
.state { padding:24px; color:#666; }
.state.error { color:#c0392b; }
.grid { padding:12px 24px 40px; display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
@media (max-width:1200px){ .grid{ grid-template-columns:repeat(3,1fr);} }
@media (max-width:900px){ .grid{ grid-template-columns:repeat(2,1fr);} }
@media (max-width:600px){ .grid{ grid-template-columns:1fr;} }
.card { background:#fff; border:1px solid #eee; border-radius:10px; overflow:hidden; cursor:pointer; transition:.12s box-shadow,.08s transform; }
.card.no-pointer { cursor: default; }
.card:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,.06); }
.card.no-pointer:hover { transform: none; box-shadow: none; }
.thumb { position:relative; aspect-ratio:16/10; overflow:hidden; }
.thumb img { width:100%; height:100%; object-fit:cover; }
.badge { position:absolute; left:10px; top:10px; background:#36a24a; color:#fff; font-size:12px; padding:2px 6px; border-radius:4px; }
.badge.danger { background:#f67a3c; }
.meta { padding:12px; }
.title { font-size:15px; margin:0 0 6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.desc { color:#6b7280; font-size:13px; height:38px; overflow:hidden; }
.bottom { margin-top:8px; }
.price { color:#d35400; font-weight:600; font-size:14px; }
.manage-actions { display:flex; gap:16px; margin-top:8px; }
.link { background:none; border:none; color:#36a24a; cursor:pointer; padding:0; }
.link.danger { color:#c0392b; }
.empty { grid-column:1/-1; text-align:center; padding:40px 0; color:#777; }

.modal-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.35); display:flex; align-items:center; justify-content:center; }
.modal { background:#fff; width:520px; max-width:92vw; border-radius:10px; box-shadow:0 12px 32px rgba(0,0,0,.2); }
.modal h3 { margin:0; padding:14px 16px; border-bottom:1px solid #eee; }
.form { display:flex; flex-direction:column; gap:10px; padding:14px 16px; }
.form label { display:flex; flex-direction:column; gap:6px; font-size:13px; color:#555; }
.form input, .form textarea { padding:8px 10px; border:1px solid #ddd; border-radius:6px; font-size:14px; }
.form .error { color:#c0392b; }
.preview { margin-top:8px; border:1px solid #eee; border-radius:8px; overflow:hidden; width:100%; max-height:200px; }
.preview img { width:100%; height:100%; object-fit:cover; }
.modal-actions { display:flex; gap:10px; padding:12px 16px 16px; justify-content:flex-end; }
</style>
