<script setup lang="ts" >
import SiteHeader from '../components/SiteHeader.vue'
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '../utils/api'

const router = useRouter()
const route = useRoute()
const username = ref('')
const password = ref('')
const remember = ref(false)
const needLoginTip = ref(false)

const loading = ref(false)

onMounted(() => {
  // 检查URL参数是否包含needLogin，如果有则显示登录提示
  if (route.query.needLogin === 'true') {
    needLoginTip.value = true
  }
})

function submit() {
  if (!username.value || !password.value) {
    alert('请输入用户名和密码')
    return
  }
  loading.value = true
  ;(async () => {
    try {

      const res = await api.post('/api/users/login', {
        email: username.value,
        password: password.value,

      })
      console.log(username.value)
      console.log(res.data)
      if (res?.data && res.data.code === 200) {
        // 保存Token与用户信息
        try {
          const token = res.data?.data?.token
          const user = res.data?.data?.user
          if (token) localStorage.setItem('auth_token', token)
          if (user) localStorage.setItem('user', JSON.stringify(user))
          localStorage.setItem('currentUserName', user.userName); // 在前端单独存储用户名          const role = (user?.role || '').toLowerCase()
          let target = '/home'
          if (role === 'admin') target = '/admin-home'
          else if (role === 'expert') target = '/expert-home'
          else if (role === 'bankuser') target = '/bank-user-home'
          await router.push(target)
        } catch { await router.push('/home') }
      } else {
        alert(res?.data?.msg || '登录失败')
      }
    } catch (err) {
      console.error(err)
      alert('登录请求失败')
    } finally {
      loading.value = false
    }
  })()
}
</script>

<template>
  <div class="page-root">
    <SiteHeader />
    <main class="login-main">
      <div class="login-card">
        <h2>账户登录</h2>

        <!-- 登录提示信息 -->
        <div v-if="needLoginTip" class="login-tip">
          请登录后查看
        </div>

        <label class="field">
          <div class="label">手机号/邮箱</div>
          <input v-model="username" placeholder="请输入手机号或邮箱" />
        </label>

        <label class="field">
          <div class="label">密码 <a class="forgot" href="/forgot-password">忘记密码?</a></div>
          <input v-model="password" type="password" placeholder="请输入密码" />
        </label>

        <label class="row"> <input type="checkbox" v-model="remember" /> 记住我 30天 </label>

        <button class="primary" @click="submit">登录</button>
  <div v-if="loading" style="text-align:center;margin-top:8px;color:#666">登录中...</div>

        <div class="extra">还没有账号？<router-link to="/register">立即注册</router-link></div>

        <div class="other-login">其他登录方式</div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.page-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f7f8f8;
}
/* header is rendered per-view via <SiteHeader /> */
.login-main {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 40px 24px;
}
.login-card {
  width: 420px;
  background: white;
  padding: 32px;
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
  text-align: left;
  margin-top: 24px;
}

.login-card h2 {
  text-align: center;
  margin: 0 0 18px;
}
.field {
  display: block;
  margin-bottom: 12px;
}
.field .label {
  font-size: 14px;
  color: #666;
  margin-bottom: 6px;
}
.field input {
  width: 100%;
  padding: 12px;
  border: 1px solid #e6e6e6;
  border-radius: 6px;
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
}
.primary {
  width: 100%;
  background: #36a24a;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  margin-top: 12px;
  cursor: pointer;
}
.extra {
  text-align: center;
  margin-top: 12px;
  color: #666;
}
.other-login {
  margin-top: 18px;
  text-align: center;
  color: #999;
}
.forgot {
  float: right;
  font-size: 13px;
  color: #36a24a;
  text-decoration: none;
}

.login-tip {
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
  color: #856404;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 16px;
  text-align: center;
  font-size: 14px;
}
</style>
