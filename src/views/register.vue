<script setup lang="ts">
import SiteHeader from '../components/SiteHeader.vue'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../utils/api'

const router = useRouter()
// userType removed per requirements
const email = ref('')
const password = ref('')
const confirm = ref('')
const code = ref('')
const agree = ref(false)
const showPassword = ref(false)
const countdown = ref(0)
const timer = ref<number | null>(null)
const isSending = ref(false)

// 发送验证码
async function sendVerificationCode() {
  if (isSending.value || countdown.value > 0) return

  if (!email.value) {
    alert('请输入邮箱')
    return
  }

  // 简单的邮箱格式验证
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.value)) {
    alert('请输入有效的邮箱地址')
    return
  }

  try {
    isSending.value = true
    const res = await api.post('/api/users/send-code', {
      email: email.value
    })
    if (res.data && res.data.code === 200) {
      alert('验证码已发送，请查收')
      startCountdown()
    } else {
      alert(res.data?.msg || '发送失败')
    }
  } catch (err) {
    console.error(err)
    alert('发送验证码请求失败')
  } finally {
    isSending.value = false
  }
}

// 倒计时功能
function startCountdown() {
  countdown.value = 60
  if (timer.value) {
    clearInterval(timer.value)
  }
  timer.value = window.setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      if (timer.value) {
        clearInterval(timer.value)
      }
    }
  }, 1000)
}

// 组件卸载时清理定时器
import { onUnmounted } from 'vue'
onUnmounted(() => {
  if (timer.value) {
    clearInterval(timer.value)
  }
})

async function submit() {
  if (!email.value) {
    alert('请输入邮箱')
    return
  }
  if (!code.value) {
    alert('请输入验证码')
    return
  }
  if (!password.value || password.value.length < 6) {
    alert('请输入6-20位密码')
    return
  }
  if (password.value !== confirm.value) {
    alert('两次密码不一致')
    return
  }
  if (!agree.value) {
    alert('请同意协议')
    return
  }
  try {
    const res = await api.post('/api/users/register', {
      email: email.value,
      password: password.value,
      nickName: '',
      realName: '',
      code: code.value
    })
    if (res.data && res.data.code === 200) {
      alert('注册成功，请登录')
      router.push('/login')
    } else {
      alert(res.data?.msg || '注册失败')
    }
  } catch (err) {
    console.error(err)
    alert('注册请求失败')
  }
}
</script>

<template>
  <div class="page-root">
    <SiteHeader />
    <main class="login-main">
      <div class="login-card">
        <h2>账户注册</h2>

        <label class="field">
          <div class="label">邮箱</div>
          <input type="email" v-model="email" maxlength="50" placeholder="请输入邮箱" />
        </label>

        <label class="field">
          <div class="label">设置密码</div>
          <div class="pw-input">
            <input
              :type="showPassword ? 'text' : 'password'"
              v-model="password"
              maxlength="20"
              placeholder="设置6-20位密码"
            />
            <button type="button" class="pw-toggle" @click="showPassword = !showPassword">
              {{ showPassword ? '隐藏' : '显示' }}
            </button>
          </div>
        </label>

        <label class="field">
          <div class="label">确认密码</div>
          <input v-model="confirm" type="password" maxlength="20" placeholder="再次输入密码" />
        </label>

        <label class="field">
          <div class="label">验证码</div>
          <div class="code-input">
            <input v-model="code" type="text" maxlength="6" placeholder="请输入验证码" />
            <button type="button"
              class="code-btn"
              @click="sendVerificationCode"
              :disabled="countdown > 0 || isSending"
            >
              {{ countdown > 0 ? `${countdown}秒后重发` : (isSending ? '发送中...' : '获取验证码') }}
            </button>
          </div>
        </label>

        <label class="row agreement"
          ><input type="checkbox" v-model="agree" /> 我已阅读并同意
          <a href="#">《用户服务协议》</a> 和 <a href="#">《隐私政策》</a>
        </label>

        <button class="primary" @click="submit">注册账号</button>

        <div class="extra">已有账号？ <router-link to="/login">立即登录</router-link></div>

        <div class="social">
          <div class="other">其他注册方式</div>
          <div class="icons">
            <span class="icon">微信</span>
            <span class="icon">微博</span>
            <span class="icon">其它</span>
          </div>
        </div>
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
/* header moved to App.vue */
.login-main {
  flex: 1;
  display: flex;
  align-items: flex-start; /* keep content starting below header */
  justify-content: center; /* center horizontally */
  padding: 40px 24px; /* add top padding so card sits below header */
}
.login-card {
  width: 420px;
  background: white;
  padding: 32px;
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
  text-align: left;
  margin-top: 24px; /* space from top/header */
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

.code-input {
          display: flex;
          gap: 8px;
        }
        .code-input input {
          flex: 1;
        }
        .code-btn {
          padding: 0 16px;
          background: #36a24a;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }
        .code-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

.pw-input {
  display: flex;
  align-items: center;
}
.pw-input input {
  flex: 1;
}
.pw-toggle {
  margin-left: 8px;
  background: transparent;
  border: none;
  color: #888;
  cursor: pointer;
}
.agreement a {
  color: #36a24a;
  text-decoration: none;
  margin: 0 4px;
}
.social {
  margin-top: 18px;
  text-align: center;
}
.social .other {
  color: #999;
  margin-bottom: 8px;
}
.social .icons {
  display: flex;
  gap: 12px;
  justify-content: center;
}
.social .icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #f2f2f2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #666;
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
</style>
