<script setup lang="ts">
import { onMounted, ref, computed, nextTick } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import SiteHeader from '../components/SiteHeader.vue'
import api from '@/utils/api'
import { assetImageUrl } from '@/utils/asset'

type Product = {
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

const router = useRouter()

const loading = ref(false)
const error = ref<string | null>(null)
const products = ref<Product[]>([])
const keyword = ref('')

const filtered = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  if (!k) return products.value
  return products.value.filter(p =>
    (p.title || '').toLowerCase().includes(k) ||
    (p.content || '').toLowerCase().includes(k)
  )
})

function getImageUrl(name?: string) {
  return assetImageUrl(name)
}

function goDetail(id: number) {
  router.push({ name: 'product-detail', params: { id } })
}

function displayTitle(p: Product) {
  const prefix = p.type === 1 ? '[供] ' : '[需] '
  return prefix + (p.title || '')
}

async function loadProducts() {
  loading.value = true
  error.value = null
  try {
    // RESTful
    const res = await api.get('/api/products')
    if (res.data && res.data.code === 200) {
      products.value = res.data.data || []
    } else {
      throw new Error(res.data?.msg || '获取商品失败')
    }
  } catch (e: any) {
    error.value = e.message || '网络错误'
  } finally {
    loading.value = false
  }
}

// 状态恢复与保存逻辑
onMounted(async () => {
  const stateStr = sessionStorage.getItem('HOME_STATE')
  if (stateStr) {
    try {
      const state = JSON.parse(stateStr)
      keyword.value = state.keyword || ''
      await loadProducts()
      nextTick(() => {
        window.scrollTo(0, state.scrollTop || 0)
      })
    } catch (e) {
      console.error('恢复状态失败', e)
      loadProducts()
    }
  } else {
    loadProducts()
  }
})

onBeforeRouteLeave((to, from, next) => {
  if (to.name === 'product-detail') {
    const state = {
      keyword: keyword.value,
      scrollTop: window.scrollY
    }
    sessionStorage.setItem('HOME_STATE', JSON.stringify(state))
  } else {
    sessionStorage.removeItem('HOME_STATE')
  }
  next()
})
</script>

<template>
  <div class="home">
    <SiteHeader />

    <section class="search-bar">
      <input
        v-model="keyword"
        type="text"
        class="search-input"
        placeholder="搜索农产品…"
      />
      <button class="search-btn">搜索</button>
    </section>

    <section class="section-title">推荐商品</section>

    <div v-if="loading" class="state">加载中…</div>
    <div v-else-if="error" class="state error">{{ error }}</div>

    <div v-else class="grid">
      <article
        v-for="p in filtered"
        :key="p.productId"
        class="card"
        tabindex="0"
        @click="goDetail(p.productId)"
        @keypress.enter="goDetail(p.productId)"
      >
        <div class="thumb">
          <img :src="getImageUrl(p.picture)" :alt="p.title" @error="($event.target as HTMLImageElement).src='/favicon.ico'" />
          <span class="badge" v-if="p.type===1">货源</span>
          <span class="badge danger" v-else>需求</span>
        </div>
        <div class="meta">
          <h3 class="title" :title="displayTitle(p)">{{ displayTitle(p) }}</h3>
          <p class="desc">{{ p.content }}</p>
          <div class="bottom">
            <span class="price">¥{{ Number(p.price).toFixed(2) }}</span>
          </div>
        </div>
      </article>
    </div>
  </div>

</template>

<style scoped>
.home { background: #fff; }
.search-bar {
  display: flex;
  gap: 10px;
  padding: 16px 24px;
  border-bottom: 1px solid #eee;
}
.search-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #e3e3e3;
  border-radius: 6px;
}
.search-btn {
  background: #36a24a;
  color: #fff;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
}

.section-title {
  font-weight: 700;
  margin: 18px 24px 6px;
}

.state { padding: 24px; color: #666; }
.state.error { color: #c0392b; }

.grid {
  padding: 12px 24px 32px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
@media (max-width: 1200px) { .grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 900px)  { .grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px)  { .grid { grid-template-columns: 1fr; } }

.card {
  background: #fff;
  border: 1px solid #eee;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: transform .08s ease, box-shadow .12s ease;
}
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.06);
}
.thumb { position: relative; aspect-ratio: 16/10; overflow: hidden; }
.thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.badge {
  position: absolute; left: 10px; top: 10px;
  background: #36a24a; color: #fff; font-size: 12px;
  border-radius: 4px; padding: 2px 6px;
}
.badge.danger { background: #f67a3c; }
.meta { padding: 12px; }
.title { font-size: 16px; margin: 0 0 6px; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.desc { color: #6b7280; font-size: 13px; height: 38px; overflow: hidden; }
.bottom { display: flex; justify-content: flex-start; align-items: center; margin-top: 10px; gap: 10px; }
.price { color: #2eaf3b; font-weight: 700; }
</style>
