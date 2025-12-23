<template>
  <div :class="$attrs.class">
  <div class="left-nav">
    <!-- 银行Header区域 -->
    <div class="brand">
      <span class="brand-name">融销通</span>
      <span class="brand-sub">农产品购销一体化平台</span>
    </div>
    <div class="bank-header">
      <!-- 银行图标（可替换为SVG或Font Awesome图标） -->
      <div class="bank-icon">
        <div class="bank-icon-building"></div>
      </div>
      <div class="bank-info">

        <!-- 动态渲染银行名称（从三表联查获取） -->
        <h3>{{ bankName }}</h3>
        <p>账号:{{ userName }}</p>
        <p>金融服务专区</p>
      </div>
    </div>

    <!-- 导航菜单列表 -->
    <ul class="nav-menu">
      <li>
        <router-link to="/financing-application" active-class="active">
          <i class="icon-application"></i>
          <span>融资信息列表</span>
        </router-link>
      </li>
      <li>
        <router-link to="/bank-user-match" active-class="active">
          <i class="icon-match"></i>
          <span>智能匹配农户</span>
        </router-link>
      </li>
    </ul>
  </div>

  <button class="logout-btn" @click="handleLogout">登出</button>
  </div>
</template>

<style scoped>
.left-nav {
  width: 220px;
  background: #fff;
  border-right: 1px solid #eee;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  padding-top: 20px;
  box-sizing: border-box;
}

/* 品牌区域样式 */
.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 10px;
}

.brand-name {
  color: #36a24a;
  font-weight: 800;
  font-size: 30px;
  text-align: center;
  align-items: center;
}

.brand-sub {
  color: #666;
  align-items: center;
  font-size: 10px;
}

/* 银行Header样式 */
.bank-header {
  display: flex;
  align-items: center;
  padding: 0 20px;
  margin-bottom: 20px;
}

/* 银行图标容器 */
.bank-icon {
  width: 40px;
  height: 40px;
  background: #2f5496;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  margin-right: 10px;
  position: relative;
}

/* 纯CSS绘制简约银行建筑图标 */
.bank-icon-building {
  width: 24px;
  height: 20px;
  position: relative;
}

/* 银行顶部三角形 */
.bank-icon-building::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 8px solid #fff;
}

/* 银行主体矩形 */
.bank-icon-building::after {
  content: '';
  position: absolute;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 14px;
  background: #fff;
  border-radius: 2px;
}

/* 银行门（小矩形） */
.bank-icon-building span {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 8px;
  height: 6px;
  background: #2f5496;
  border-radius: 1px;
  display: block;
}

.bank-info h3 {
  font-size: 16px;
  font-weight: bold;
  margin: 0;
}

.bank-info p {
  font-size: 12px;
  color: #666;
  margin: 0;
}

/* 导航菜单样式 */
.nav-menu {
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-menu li a {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  text-decoration: none;
  color: #333;
  border-radius: 4px;
  transition: all 0.2s;
}

.nav-menu li a.active {
  background: #e6f7ff;
  color: #007bff;
}

.nav-menu li a i {
  width: 24px;
  text-align: center;
  margin-right: 10px;
}

.nav-menu li a span {
  font-size: 14px;
}

/* 登出按钮样式 */
.logout-btn {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 6px 12px;
  background-color: #67b366;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.logout-btn:hover {
  background-color: #e45151;
}
</style>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import axios from 'axios';
// 从工具文件导入，替换组件内部定义
import { getCurrentUserName } from '@/utils/userHelper.ts';

const router = useRouter();
const bankName = ref('加载中...');
const userName = getCurrentUserName();
// 移除原来的 getCurrentUserName 函数定义（已移到工具文件）

// fetchBankName、handleLogout 逻辑保持不变（直接使用导入的 getCurrentUserName）
const fetchBankName = async () => {
  const userName = getCurrentUserName(); // 直接使用工具函数
  console.log('前端传递给后端的 userName:', userName);
  if (!userName) {
    ElMessage.warning('未获取到当前用户信息，请重新登录');
    bankName.value = '未知银行';
    return;
  }

  try {
    const res = await axios.get('/api/bank/get-name-by-user', {
      params: { userName },
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`
      }
    });
    console.log('后端返回的银行名称响应:', res.data);
    if (res.data.code === 200) {
      bankName.value = res.data.data || '未知银行';
    } else {
      ElMessage.warning(res.data.msg || '查询银行信息失败');
      bankName.value = '未知银行';
    }
  } catch (error) {
    ElMessage.error('网络异常，银行名称查询失败');
    console.error('fetchBankName 错误:', error);
    bankName.value = '未知银行';
  }
};

onMounted(() => {
  fetchBankName();
});

const handleLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('userInfo');
  localStorage.removeItem('user');
  localStorage.removeItem('auth_token');
  router.push('/login');
  ElMessage.success('已成功登出，角色信息已清空');
};
</script>
