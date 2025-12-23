<script setup lang="ts">
import SiteHeader from '../components/SiteHeader.vue'
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import api from '../utils/api'

const router = useRouter()

// 状态管理
const state = reactive({
  currentStep: 1, // 1: 输入邮箱, 2: 输入验证码, 3: 重置密码
  email: '',
  verificationCode: '',
  newPassword: '',
  confirmPassword: '',
  loading: false,
  countdown: 0,
  timer: null as any
})

// 验证邮箱格式
const validateEmail = (email: string) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

// 发送验证码
const sendVerificationCode = async () => {
  if (!state.email) {
    alert('请输入邮箱')
    return
  }
  if (!validateEmail(state.email)) {
    alert('请输入有效的邮箱格式')
    return
  }

  state.loading = true
  try {
    const res = await api.post('/api/users/send-verification-code', {
      email: state.email,
      type: 'reset_password' // 用于区分是注册还是重置密码
    })

    if (res?.data && res.data.code === 200) {
      alert('验证码发送成功，请查收邮箱')
      startCountdown()
      state.currentStep = 2
    } else {
      alert(res?.data?.msg || '发送失败，请稍后重试')
    }
  } catch (err) {
    console.error(err)
    alert('发送请求失败，请检查网络连接')
  } finally {
    state.loading = false
  }
}

// 开始倒计时
const startCountdown = () => {
  state.countdown = 60
  if (state.timer) {
    clearInterval(state.timer)
  }
  state.timer = setInterval(() => {
    if (state.countdown > 0) {
      state.countdown--
    } else {
      clearInterval(state.timer)
      state.timer = null
    }
  }, 1000)
}

// 验证验证码
const verifyCode = async () => {
  if (!state.verificationCode) {
    alert('请输入验证码')
    return
  }

  state.loading = true
  try {
    const res = await api.post('/api/users/verify-code', {
      email: state.email,
      code: state.verificationCode,
      type: 'reset_password'
    })

    if (res?.data && res.data.code === 200) {
      state.currentStep = 3
    } else {
      alert(res?.data?.msg || '验证码错误或已过期，请重新获取')
    }
  } catch (err) {
    console.error(err)
    alert('验证请求失败，请检查网络连接')
  } finally {
    state.loading = false
  }
}

// 重置密码
const resetPassword = async () => {
  if (!state.newPassword) {
    alert('请输入新密码')
    return
  }
  if (state.newPassword.length < 6) {
    alert('密码长度不能少于6位')
    return
  }
  if (state.newPassword !== state.confirmPassword) {
    alert('两次输入的密码不一致')
    return
  }

  state.loading = true
  try {
    const res = await api.post('/api/users/reset-password', {
      email: state.email,
      code: state.verificationCode,
      newPassword: state.newPassword
    })

    if (res?.data && res.data.code === 200) {
      alert('密码重置成功，请使用新密码登录')
      router.push('/login')
    } else {
      alert(res?.data?.msg || '密码重置失败，请稍后重试')
    }
  } catch (err) {
    console.error(err)
    alert('重置请求失败，请检查网络连接')
  } finally {
    state.loading = false
  }
}

// 返回上一步
const goBack = () => {
  if (state.currentStep > 1) {
    state.currentStep--
  } else {
    router.push('/login')
  }
}
</script>

<template>
  <div class="page-root">
    <SiteHeader />
    <main class="forgot-password-main">
      <div class="forgot-password-card">
        <h2>忘记密码</h2>

        <!-- 步骤指示器 -->
        <div class="steps">
          <div :class="['step', { active: state.currentStep >= 1 }]">1. 输入邮箱</div>
          <div class="step-divider"></div>
          <div :class="['step', { active: state.currentStep >= 2 }]">2. 验证身份</div>
          <div class="step-divider"></div>
          <div :class="['step', { active: state.currentStep >= 3 }]">3. 重置密码</div>
        </div>

        <!-- 步骤1：输入邮箱 -->
        <div v-if="state.currentStep === 1" class="step-content">
          <label class="field">
            <div class="label">邮箱地址</div>
            <input
              v-model="state.email"
              type="email"
              placeholder="请输入注册时使用的邮箱"
              :disabled="state.loading"
            />
          </label>

          <div class="buttons">
            <button class="secondary" @click="router.push('/login')" :disabled="state.loading">
              返回登录
            </button>
            <button class="primary" @click="sendVerificationCode" :disabled="state.loading">
              {{ state.loading ? '发送中...' : '发送验证码' }}
            </button>
          </div>
        </div>

        <!-- 步骤2：输入验证码 -->
        <div v-if="state.currentStep === 2" class="step-content">
          <label class="field">
            <div class="label">验证码</div>
            <div class="code-input-container">
              <input
                v-model="state.verificationCode"
                type="text"
                placeholder="请输入邮箱收到的验证码"
                :disabled="state.loading"
              />
              <button
                class="send-code-btn"
                @click="sendVerificationCode"
                :disabled="state.loading || state.countdown > 0"
              >
                {{ state.countdown > 0 ? `${state.countdown}s后重试` : '重新发送' }}
              </button>
            </div>
          </label>

          <div class="buttons">
            <button class="secondary" @click="goBack" :disabled="state.loading">
              返回上一步
            </button>
            <button class="primary" @click="verifyCode" :disabled="state.loading">
              {{ state.loading ? '验证中...' : '验证' }}
            </button>
          </div>
        </div>

        <!-- 步骤3：重置密码 -->
        <div v-if="state.currentStep === 3" class="step-content">
          <label class="field">
            <div class="label">新密码</div>
            <input
              v-model="state.newPassword"
              type="password"
              placeholder="请输入新密码（至少6位）"
              :disabled="state.loading"
            />
          </label>

          <label class="field">
            <div class="label">确认密码</div>
            <input
              v-model="state.confirmPassword"
              type="password"
              placeholder="请再次输入新密码"
              :disabled="state.loading"
            />
          </label>

          <div class="buttons">
            <button class="secondary" @click="goBack" :disabled="state.loading">
              返回上一步
            </button>
            <button class="primary" @click="resetPassword" :disabled="state.loading">
              {{ state.loading ? '重置中...' : '重置密码' }}
            </button>
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

.forgot-password-main {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 40px 24px;
}

.forgot-password-card {
  width: 420px;
  background: white;
  padding: 32px;
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
  text-align: left;
  margin-top: 24px;
}

.forgot-password-card h2 {
  text-align: center;
  margin: 0 0 24px;
}

.steps {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32px;
}

.step {
  font-size: 14px;
  color: #999;
  padding: 8px 16px;
  border-radius: 16px;
  transition: all 0.3s;
}

.step.active {
  color: #36a24a;
  font-weight: bold;
  background-color: #e8f5e8;
}

.step-divider {
  width: 40px;
  height: 1px;
  background-color: #e6e6e6;
  margin: 0 8px;
}

.step-content {
  margin-top: 24px;
}

.field {
  display: block;
  margin-bottom: 16px;
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
  font-size: 14px;
}

.code-input-container {
  display: flex;
  gap: 12px;
}

.code-input-container input {
  flex: 1;
}

.send-code-btn {
  padding: 12px 20px;
  background-color: #f0f0f0;
  color: #666;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
  min-width: 120px;
}

.send-code-btn:hover:not(:disabled) {
  background-color: #e0e0e0;
}

.send-code-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.buttons {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.primary {
  flex: 1;
  background: #36a24a;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.primary:hover:not(:disabled) {
  background: #2d8c3d;
}

.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.secondary {
  flex: 1;
  background: #f0f0f0;
  color: #666;
  border: 1px solid #e6e6e6;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.secondary:hover:not(:disabled) {
  background: #e0e0e0;
}

.secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
