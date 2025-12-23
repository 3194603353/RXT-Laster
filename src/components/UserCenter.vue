<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import api from '../utils/api'
import { assetAvatarUrl, uploadAsset } from '../utils/asset'

interface UserProfile {
  userName: string
  nickName: string
  phone: string
  identityNum: string
  address: string
  avatar: string
  realName: string
  role: string
  integral: number
  credit: number
  createTime: string
  updateTime: string
}

const loading = ref(false)
const editing = ref(false)
const saving = ref(false)
const error = ref('')
const profile = reactive<Partial<UserProfile>>({})

// 头像相关：预览与选择的文件名（仅保存文件名）
const avatarPreview = ref<string | null>(null)
const selectedAvatarFileName = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

function buildAvatarPath(name?: string | null) {
  return assetAvatarUrl(name)
}

const currentAvatarUrl = computed(() => avatarPreview.value || buildAvatarPath(profile.avatar))
const defaultAvatarUrl = assetAvatarUrl('default.jpg')

function load() {
  loading.value = true
  error.value = ''
  api.get('/api/users/me')
    .then(r => {
      if (r.data?.code === 200) {
        Object.assign(profile, r.data.data || {})
        try { localStorage.setItem('user', JSON.stringify(r.data.data)) } catch {}
      } else if (r.data?.code === 401) {
        // handled by interceptor
      } else {
        error.value = r.data?.msg || '加载失败'
      }
    })
    .catch(() => (error.value = '请求失败'))
    .finally(() => (loading.value = false))
}

function save() {
  saving.value = true
  error.value = ''
  api.put('/api/users/me', {
    nickName: profile.nickName,
    phone: profile.phone,
    identityNum: profile.identityNum,
    address: profile.address,
    // 仅提交文件名；如果未更换，则沿用已有值
    avatar: selectedAvatarFileName.value || profile.avatar,
    realName: profile.realName,
  })
    .then(r => {
      if (r.data?.code === 200) {
        Object.assign(profile, r.data.data || {})
        editing.value = false
        avatarPreview.value = null
        selectedAvatarFileName.value = null
      } else {
        error.value = r.data?.msg || '保存失败'
      }
    })
    .catch(() => (error.value = '请求失败'))
    .finally(() => (saving.value = false))
}

function logout() {
  try {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
  } catch {}
  location.href = '/login'
}

onMounted(load)

function triggerPickAvatar() {
  fileInputRef.value?.click()
}

function onPickAvatar(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files && input.files[0]
  if (!file) return
  // 先本地预览
  try { avatarPreview.value = URL.createObjectURL(file) } catch {}
  // 立即上传到云端，成功后保存返回的文件名
  uploadAsset('avatar', file)
    .then(({ fileName }) => {
      selectedAvatarFileName.value = fileName
    })
    .catch((e: unknown) => {
      selectedAvatarFileName.value = null
      const msg = e instanceof Error ? e.message : (typeof e === 'string' ? e : '头像上传失败，请稍后再试')
      error.value = msg
    })
}
</script>

<template>
  <div class="user-center">
    <div class="summary" @click="editing = !editing" :title="editing ? '收起' : '展开个人信息'">
      <img :src="currentAvatarUrl" class="avatar" alt="avatar" @error="($event.target as HTMLImageElement).src=defaultAvatarUrl" />
      <div class="name">{{ profile.nickName || profile.realName || profile.userName }}</div>
      <span class="toggle">{{ editing ? '▲' : '▼' }}</span>
    </div>
    <div v-if="editing" class="panel">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else>
        <div class="avatar-block">
          <img :src="currentAvatarUrl" class="avatar-large" alt="avatar" @error="($event.target as HTMLImageElement).src=defaultAvatarUrl" />
          <div class="avatar-actions">
            <button class="outline" type="button" @click.stop="triggerPickAvatar">更换头像</button>
            <input ref="fileInputRef" type="file" accept="image/*" class="hidden-input" @change="onPickAvatar" />
            <small v-if="selectedAvatarFileName" class="filename">已选择：{{ selectedAvatarFileName }}</small>
          </div>
        </div>
        <div class="field"><label>邮箱</label><div class="readonly">{{ profile.userName }}</div></div>
        <div class="field"><label>昵称</label><input v-model="profile.nickName" /></div>
        <div class="field"><label>真实姓名</label><input v-model="profile.realName" /></div>
        <div class="field"><label>手机号</label><input v-model="profile.phone" /></div>
        <div class="field"><label>身份证号</label><input v-model="profile.identityNum" /></div>
        <div class="field"><label>地址</label><input v-model="profile.address" /></div>
        <div class="meta-row">
      <span>角色: {{ profile.role }}</span>
      <span>积分: {{ profile.integral }}</span>
      <span>信誉: {{ profile.credit }}</span>
    </div>
        <div class="actions">
          <button @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存修改' }}</button>
          <button class="outline" @click="editing = false">取消</button>
          <button class="danger" @click="logout">退出登录</button>
        </div>
        <div v-if="error" class="error">{{ error }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-center { position: relative; }
.summary { display:flex; align-items:center; gap:8px; cursor:pointer; padding:4px 8px; border-radius:6px; background:#f5f5f5; }
.summary:hover { background:#e9e9e9; }
.avatar { width:32px; height:32px; border-radius:50%; object-fit:cover; }
.avatar-large { width:80px; height:80px; border-radius:50%; object-fit:cover; border:1px solid #eee; }
.name { font-weight:600; color:#333; }
.toggle { font-size:12px; color:#666; }
.panel { position:absolute; right:0; top:42px; width:320px; background:#fff; border:1px solid #ddd; border-radius:8px; box-shadow:0 6px 18px rgba(0,0,0,.08); padding:12px; z-index:20; }
.loading { text-align:center; padding:12px; color:#666; }
.field { display:flex; flex-direction:column; margin-bottom:8px; }
.field label { font-size:12px; color:#666; margin-bottom:4px; }
.field input { padding:6px 8px; border:1px solid #ccc; border-radius:4px; font-size:14px; }
.readonly { padding:6px 8px; background:#fafafa; border:1px solid #eee; border-radius:4px; font-size:13px; color:#555; }
.meta-row { display:flex; gap:12px; font-size:12px; color:#555; margin:8px 0 4px; flex-wrap:wrap; }
.actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:4px; }
.actions button { flex:1; padding:8px; border:none; border-radius:6px; background:#36a24a; color:#fff; cursor:pointer; font-size:13px; }
.actions button.outline { background:#fff; border:1px solid #36a24a; color:#36a24a; }
.actions button.danger { background:#d9534f; }
.actions button:disabled { opacity:.6; cursor:not-allowed; }
.error { margin-top:6px; color:#d9534f; font-size:12px; }
.avatar-block { display:flex; align-items:center; gap:12px; margin-bottom:10px; }
.avatar-actions { display:flex; flex-direction:column; gap:6px; }
.hidden-input { display:none; }
.tip { color:#888; font-size:12px; }
.filename { color:#555; font-size:12px; }
</style>
