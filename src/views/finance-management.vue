<template>
  <div class="layout-container">
    <SiteHeader />

    <div class="main-content">
      <div class="header-wrapper">
        <h2>我的融资申请管理</h2>
        <button @click="fetchFinanceList" class="refresh-btn">刷新列表</button>
      </div>

      <div class="finance-container">
        <!-- 加载状态 -->
        <div v-if="loading" class="loading">加载中...</div>

        <!-- 错误提示 -->
        <div v-else-if="errorMsg" class="error">{{ errorMsg }}</div>

        <!-- 融资信息列表 -->
        <div v-else class="finance-list">
          <div class="finance-card" v-for="finance in financeList" :key="finance.id">
            <div class="finance-status" :class="finance.status === '已融资' ? 'status-financed' : 'status-pending'">
              {{ finance.status }}
            </div>
            <div class="finance-info">
              <h3>{{ finance.realName }} 的融资申请</h3>
              <p><i class="iconfont icon-id"></i> 申请编号：{{ finance.id }}</p>
              <p><i class="iconfont icon-user"></i> 用户名：{{ finance.userName }}</p>
              <p><i class="iconfont icon-money"></i> 申请金额：{{ formatAmount(finance.amount) }}</p>
              <p><i class="iconfont icon-application"></i> 资金用途：{{ finance.application }}</p>
              <p><i class="iconfont icon-item"></i> 项目类型：{{ finance.item }}</p>
              <p><i class="iconfont icon-area"></i> 项目面积：{{ finance.area || '未填写' }} 亩</p>
              <p><i class="iconfont icon-repayment"></i> 还款方式：{{ finance.repayment }}</p>
              <p><i class="iconfont icon-period"></i> 还款期限：{{ finance.repaymentPeriod }} 月</p>
              <p><i class="iconfont icon-date"></i> 申请时间：{{ formatDateTime(finance.createTime) }}</p>
              <p><i class="iconfont icon-phone"></i> 联系电话：{{ finance.phone }}</p>
              <p><i class="iconfont icon-address"></i> 地址：{{ finance.address }}</p>

              <!-- 只有未融资的申请可以删除 -->
              <button
                v-if="finance.status === '未融资'"
                @click="handleDelete(finance.id)"
                class="delete-btn"
              >
                删除申请
              </button>
            </div>
          </div>

          <!-- 无数据提示 -->
          <div v-if="financeList.length === 0" class="no-data">暂无融资申请记录</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import SiteHeader from '../components/SiteHeader.vue';
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';
import { getCurrentUserName } from '@/utils/userHelper';

// 新增：定义融资申请数据的接口类型（对应后端返回字段）
interface FinanceIntention {
  id: number;
  userName: string;
  realName: string;
  address: string;
  amount: number;
  application: string;
  item: string;
  area: number;
  repaymentPeriod: number;
  phone: string;
  repayment: string;
  createTime: string;
  updateTime: string;
  status: '已融资' | '未融资'; // 限制状态只能是这两个值
}

// 修正：为状态变量指定明确类型（替换原any类型）
const financeList = ref<FinanceIntention[]>([]); // 明确为FinanceIntention数组
const loading = ref(false);
const errorMsg = ref('');

// 页面加载时获取融资列表
onMounted(() => {
  fetchFinanceList();
});

// 获取融资申请列表
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
    const res = await axios.get('/api/finance-intention/list-by-user', {
      params: { userName }
    });

    if (res.data.code === 200) {
      // 修正：将数据断言为明确类型
      financeList.value = res.data.data as FinanceIntention[];
    } else {
      errorMsg.value = res.data.msg || '获取融资申请列表失败';
    }
  } catch (err: unknown) { // 修正：替换any为AxiosError类型
    console.error('请求失败：', err);
    const errorMessage = err instanceof Error ? err.message : '网络异常，获取融资申请列表失败';
    errorMsg.value = errorMessage;
  } finally {
    loading.value = false;
  }
};

// 删除融资申请
const handleDelete = async (id: number) => {
  try {
    // 弹窗确认：点击「确认」进入 then，点击「取消」触发 reject 并被 catch 捕获
    await ElMessageBox.confirm('确定要删除这条数据吗？', '删除提示', {
      type: 'warning',
      confirmButtonText: '确认',
      cancelButtonText: '取消'
    });

    // 只有点击「确认」才会执行到这里：调用删除接口
    const response = await axios.delete(`/api/finance-intention/delete/${id}`);
    if (response.data.code === 200) {
      ElMessage.success('删除成功！');
      // 刷新列表（根据你的列表刷新逻辑补充）
      // 比如：getFinanceList();
    } else {
      ElMessage.error(response.data.msg || '删除失败');
    }
  } catch (error) {
    // 捕获「取消弹窗」或「接口请求失败」的异常
    // 点击取消时，error 是 'cancel'，可以忽略不提示；接口失败则提示错误
    if (error !== 'cancel') {
      console.error('删除失败', error);
      ElMessage.error('删除失败，请重试');
    }
  }
};

// 格式化金额
const formatAmount = (amount: number) => {
  return amount ? amount.toLocaleString() + ' 元' : '0 元';
};

// 格式化日期时间
const formatDateTime = (dateTime: string) => {
  if (!dateTime) return '';
  return new Date(dateTime).toLocaleString();
};
</script>

<style scoped>
.layout-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
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
  position: relative;
}

.finance-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.finance-status {
  position: absolute;
  top: 15px;
  right: 15px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.status-financed {
  background-color: #e6f7ed;
  color: #00875a;
}

.status-pending {
  background-color: #fff7e6;
  color: #fa8c16;
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

.delete-btn {
  margin-top: 15px;
  padding: 6px 12px;
  background-color: #ff4d4f;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.delete-btn:hover {
  background-color: #d93025;
}
</style>
