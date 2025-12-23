<template>
  <div class="layout-container">
    <!-- 左侧导航栏（保持现有） -->
    <BankHeader class="sidebar" />

    <!-- 右侧主内容区域 -->
    <div class="main-content">
      <div class="header-wrapper">
        <h2>融资信息列表</h2>
        <button @click="fetchFinanceList" class="refresh-btn">刷新列表</button>
      </div>

      <div class="finance-container">
        <!-- 加载状态 -->
        <div v-if="loading" class="loading">加载中...</div>

        <!-- 错误提示 -->
        <div v-else-if="errorMsg" class="error">{{ errorMsg }}</div>

        <!-- 融资信息列表 -->
        <div v-else class="finance-list">
          <!-- 修复：去掉未使用的index变量 -->
          <div class="finance-card" v-for="finance in financeList" :key="finance.financeId">
            <div class="finance-info">
              <h3>{{ finance.realName }} 的融资信息</h3>
              <p><i class="iconfont icon-id"></i> 融资编号：{{ finance.financeId }}</p>
              <!-- 修复：确认字段名与后端一致（ownName对应数据库第三列） -->
              <p><i class="iconfont icon-user"></i> 用户名：{{ finance.ownName }}</p>
              <p><i class="iconfont icon-bank"></i> 银行ID：{{ finance.bankId }}</p>
              <p><i class="iconfont icon-money"></i> 融资金额：{{ finance.money }} 元</p>
              <p><i class="iconfont icon-rate"></i> 利率：{{ finance.rate }}</p>
              <p><i class="iconfont icon-repayment"></i> 还款期限：{{ finance.repayment }} 月</p>
              <p><i class="iconfont icon-date"></i> 创建时间：{{ formatDateTime(finance.createTime) }}</p>
              <p><i class="iconfont icon-operator"></i> 操作人：{{ finance.bankUserName }}</p>
            </div>
          </div>

          <!-- 无数据提示 -->
          <div v-if="financeList.length === 0" class="no-data">暂无融资信息</div>
        </div>
      </div>
    </div>
  </div>
</template>

<!-- 修复：添加lang属性（根据项目实际使用js/ts） -->
<script setup lang="ts">
import BankHeader from '@/components/BankHeader.vue';
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
// 修复：确保api路径正确
import request from '../utils/request'; // 假设项目用request封装axios
import { getCurrentUserName } from '@/utils/userHelper'; // 确保该工具类存在

// 状态管理
const financeList = ref([]);
const loading = ref(false);
const errorMsg = ref('');

// 页面加载时获取融资列表
onMounted(() => {
  fetchFinanceList();
});

// 修改api调用方法
const financeApi = {
  // 新增：根据银行ID查询融资信息
  getFinanceByBankId: (bankId: number) => {
    return request.get('/api/finance/list-by-bank-id', {
      params: { bankId }
    });
  }
};

// 修改获取融资信息列表方法
const fetchFinanceList = async () => {
  const userName = getCurrentUserName();
  if (!userName) {
    ElMessage.warning('未获取到当前用户信息，请重新登录');
    errorMsg.value = '未获取到当前用户信息';
    return;
  }

  loading.value = true;
  errorMsg.value = '';
  try {
    // 第一步：先获取银行ID
    const bankRes = await request.get('/api/bank/get-id-by-user', {
      params: { userName }
    });

    if (bankRes.code !== 200 || !bankRes.data) {
      errorMsg.value = '获取银行信息失败';
      return;
    }

    const bankId = bankRes.data;

    // 第二步：用银行ID查询融资信息
    const res = await financeApi.getFinanceByBankId(bankId);
    if (res.code === 200) {
      financeList.value = res.data;
    } else {
      errorMsg.value = res.msg || '获取融资信息失败';
    }
  } catch (err: never) {
    console.error('请求失败：', err);
    errorMsg.value = err.message || '网络异常，获取融资信息失败';
  } finally {
    loading.value = false;
  }
};

// 格式化日期时间
const formatDateTime = (dateTime: string) => {
  if (!dateTime) return '';
  return dateTime; // 如需格式化可补充：new Date(dateTime).toLocaleString()
};
</script>

<style scoped>
.layout-container {
  display: flex;
  min-height: 100vh;
  width: 100%;
}

.sidebar {
  width: 220px;
  min-width: 220px;
  background-color: #f5f7fa;
  border-right: 1px solid #e5e9f2;
  height: 100vh;
  position: sticky;
  top: 0;
}

.main-content {
  flex: 1;
  padding: 20px;
  background-color: #fff;
  overflow-x: hidden;
}

.header-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto 30px;
  width: 100%;
}

h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 22px;
  font-weight: 600;
}

.refresh-btn {
  padding: 8px 16px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.refresh-btn:hover {
  background-color: #2980b9;
}

.finance-container {
  max-width: 1200px;
  margin: 0 auto;
}

.loading, .error, .no-data {
  text-align: center;
  padding: 50px;
  font-size: 18px;
  color: #666;
}

.error {
  color: #e74c3c;
}

.finance-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.finance-card {
  border: 1px solid #e0e6ed;
  border-radius: 10px;
  padding: 20px;
  transition: all 0.3s ease;
  background-color: #fff;
}

.finance-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.finance-info h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 18px;
  font-weight: 600;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f2f5;
}

.finance-info p {
  margin: 8px 0;
  color: #4a5568;
  font-size: 14px;
  line-height: 1.5;
}

.finance-info i {
  margin-right: 8px;
  color: #3498db;
}
</style>
