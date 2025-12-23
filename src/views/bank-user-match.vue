<template>
  <!-- 外层布局容器：左侧导航 + 右侧主内容 -->
  <div class="layout-container">
    <!-- 左侧导航栏组件 -->
    <BankHeader class="sidebar" />

    <!-- 右侧主内容区域 -->
    <div class="main-content">
      <!-- 搜索区域：关键词搜索 + 多维度范围选择器 -->
      <div class="search-container">
        <div class="search-wrapper">
          <!-- 关键词搜索框（支持：姓名/账号/产品类型/地址） -->
          <el-input
            v-model="searchForm.keyword"
            placeholder="输入农户姓名/账号/产品类型/地址搜索"
            class="search-input"
            @keyup.enter="handleSearch"
            clearable
          >
            <template #prefix>
              <span style="margin-right: 8px; color: #999; font-size: 16px;">🔍</span>
            </template>
          </el-input>

          <!-- 多维度范围选择器组 -->
          <div class="search-filters">
            <!-- 1. 农场大小范围（亩） -->
            <div class="filter-item">
              <label class="filter-label">农场大小：</label>
              <el-input-number
                v-model="searchForm.minArea"
                :min="0"
                placeholder="最小"
                class="range-input"
                @change="handleRangeChange('area')"
              />
              <span class="range-separator">-</span>
              <el-input-number
                v-model="searchForm.maxArea"
                :min="searchForm.minArea || 0"
                placeholder="最大"
                class="range-input"
                @change="handleRangeChange('area')"
              />
              <span class="unit">亩</span>
            </div>

            <!-- 2. 还款期限范围（月） -->
            <div class="filter-item">
              <label class="filter-label">还款期限：</label>
              <el-input-number
                v-model="searchForm.minPeriod"
                :min="0"
                placeholder="最小"
                class="range-input"
                @change="handleRangeChange('period')"
              />
              <span class="range-separator">-</span>
              <el-input-number
                v-model="searchForm.maxPeriod"
                :min="searchForm.minPeriod || 0"
                placeholder="最大"
                class="range-input"
                @change="handleRangeChange('period')"
              />
              <span class="unit">月</span>
            </div>

            <!-- 3. 融资金额范围（元） -->
            <div class="filter-item">
              <label class="filter-label">融资金额：</label>
              <el-input-number
                v-model="searchForm.minAmount"
                :min="0"
                placeholder="最小"
                class="range-input"
                @change="handleRangeChange('amount')"
              />
              <span class="range-separator">-</span>
              <el-input-number
                v-model="searchForm.maxAmount"
                :min="searchForm.minAmount || 0"
                placeholder="最大"
                class="range-input"
                @change="handleRangeChange('amount')"
              />
              <span class="unit">元</span>
            </div>

            <!-- 操作按钮组 -->
            <div class="btn-group">
              <el-button type="primary" @click="handleSearch" class="search-btn">
                搜索
              </el-button>
              <el-button type="default" @click="resetSearch" class="reset-btn">
                重置
              </el-button>
            </div>
          </div>
        </div>

        <!-- 搜索结果区域（与智能匹配完全分离） -->
        <div
          v-if="hasSearchCondition || searchResultList.length > 0"
          class="search-result-section"
        >
          <div class="section-header">
            <h3>搜索结果</h3>
            <span class="result-count">{{ searchResultList.length }} 条匹配数据</span>
          </div>

          <!-- 搜索加载状态 -->
          <div v-if="searchLoading" class="loading">搜索中...</div>

          <!-- 搜索空状态 -->
          <div v-else-if="searchResultList.length === 0 && !searchLoading" class="no-data">
            未找到符合条件的农户，请调整搜索条件重试
          </div>

          <!-- 搜索结果列表 -->
          <div v-else class="bank-user-list">
            <div class="bank-user-card" v-for="(user, index) in searchResultList" :key="`search-${index}`">
              <div class="user-avatar">
                <img :src="user.avatar || defaultAvatar" alt="用户头像">
              </div>
              <div class="user-info">
                <h3>{{ user.realName || '未知用户' }}</h3>
                <p><i class="iconfont icon-username"></i> 账号：{{ user.userName }}</p>
                <p><i class="iconfont icon-phone"></i> 电话：{{ user.phone || '未填写' }}</p>
                <p><i class="iconfont icon-amount"></i> 融资金额：{{ formatAmount(user.amount) }}</p>
                <p><i class="iconfont icon-address"></i> 地址：{{ user.address || '未填写' }}</p>
                <p><i class="iconfont icon-integral"></i> 产品：{{ user.item || '未填写' }}</p>
                <p><i class="iconfont icon-application"></i> 类型：{{ user.application || '未填写' }}</p>
                <p><i class="iconfont icon-area"></i> 农场大小（亩）：{{ user.area || '未填写' }}</p>
                <p><i class="iconfont icon-repayment"></i> 还款方式：{{ user.repayment || '未填写' }}</p>
                <p><i class="iconfont icon-period"></i> 还款期限（月）：{{ user.repaymentPeriod || '未填写' }}</p>
                <button @click="openFinanceDialog(user)" class="finance-btn">融资</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 原有：标题和按钮区域 -->
      <div class="header-wrapper">
        <h2>智能匹配农户</h2>
        <button @click="fetchRandomBankUsers" class="refresh-btn">重新匹配农户</button>
      </div>

      <!-- 原有：智能匹配农户区域 -->
      <div class="bank-user-container">
        <!-- 加载状态 -->
        <div v-if="loading" class="loading">加载中...</div>

        <!-- 错误提示 -->
        <div v-else-if="errorMsg" class="error">{{ errorMsg }}</div>

        <!-- 智能匹配用户列表 -->
        <div v-else class="bank-user-list">
          <div class="bank-user-card" v-for="(user, index) in bankUserList" :key="`match-${index}`">
            <div class="user-avatar">
              <img :src="user.avatar || defaultAvatar" alt="用户头像">
            </div>
            <div class="user-info">
              <h3>{{ user.realName || '未知用户' }}</h3>
              <p><i class="iconfont icon-username"></i> 账号：{{ user.userName }}</p>
              <p><i class="iconfont icon-phone"></i> 电话：{{ user.phone || '未填写' }}</p>
              <p><i class="iconfont icon-amount"></i> 融资金额：{{ formatAmount(user.amount) }}</p>
              <p><i class="iconfont icon-address"></i> 地址：{{ user.address || '未填写' }}</p>
              <p><i class="iconfont icon-integral"></i> 产品：{{ user.item || '未填写' }}</p>
              <p><i class="iconfont icon-application"></i> 类型：{{ user.application || '未填写' }}</p>
              <p><i class="iconfont icon-area"></i> 农场大小（亩）：{{ user.area || '未填写' }}</p>
              <p><i class="iconfont icon-repayment"></i> 还款方式：{{ user.repayment || '未填写' }}</p>
              <p><i class="iconfont icon-period"></i> 还款期限（月）：{{ user.repaymentPeriod || '未填写' }}</p>
              <button @click="openFinanceDialog(user)" class="finance-btn">融资</button>
            </div>
          </div>

          <!-- 无数据提示 -->
          <div v-if="bankUserList.length === 0" class="no-data">暂无符合条件的银行用户</div>
        </div>
      </div>

      <!-- 融资确认弹窗 -->
      <el-dialog
        title="确认融资"
        v-model="isFinanceDialogOpen"
        width="460px"
        :before-close="handleDialogClose"
        append-to-body
        :show-close="false"
      >
        <div class="dialog-content-custom">
          <div class="dialog-row">
            <span class="dialog-label">农户姓名：</span>
            <span class="dialog-value highlight">{{ currentUser.realName || '未知' }}</span>
          </div>
          <div class="dialog-row">
            <span class="dialog-label">账号：</span>
            <span class="dialog-value">{{ currentUser.userName || '未知' }}</span>
          </div>
          <div class="dialog-row">
            <span class="dialog-label">融资金额：</span>
            <span class="dialog-value highlight">{{ formatAmount(currentUser.amount) || '0 元' }}</span>
          </div>
          <div class="dialog-row">
            <span class="dialog-label">产品类型：</span>
            <span class="dialog-value">{{ currentUser.item || '未填写' }}</span>
          </div>
          <div class="dialog-row">
            <span class="dialog-label">农场大小：</span>
            <span class="dialog-value">{{ currentUser.area || '未填写' }} 亩</span>
          </div>
          <div class="dialog-row">
            <span class="dialog-label">还款期限：</span>
            <span class="dialog-value">{{ currentUser.repaymentPeriod || '未填写' }} 月</span>
          </div>

          <div class="warning-box">
            <div class="warning-title">风险提示</div>
            <div class="warning-text">确认要为该农户办理融资业务吗？请仔细核对信息，操作不可撤销。</div>
          </div>
        </div>
        <template #footer>
          <el-button @click="isFinanceDialogOpen = false">取消</el-button>
          <el-button type="primary" @click="handleSubmitFinance" :loading="submitLoading">确认融资</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import BankHeader from '@/components/BankHeader.vue';
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElInput, ElInputNumber, ElButton, ElDialog } from 'element-plus';
import { bankUserApi, financeApi } from '../utils/api.js';

// 接口导入
const { getRandom10BankUsers, searchFarmers } = bankUserApi;
const { getBankIdByUserName, submitFinance: financeApiSubmit } = financeApi;

// 工具函数导入
import { getCurrentUserName } from '@/utils/userHelper.ts';

// ======================== 基础状态管理 ========================
// 头像默认路径（请根据你的项目实际路径调整）
const defaultAvatar = '../image/61b36db4996a9c78bd967b7e06d289a8a33a7e764547e-ornw5J.png';

// 智能匹配相关状态
const bankUserList = ref([]);
const loading = ref(false);
const errorMsg = ref('');

// 融资弹窗相关状态
const isFinanceDialogOpen = ref(false);
const currentUser = reactive({});
const submitLoading = ref(false);
const currentBankId = ref(null);

// 搜索相关状态（关键词 + 多范围条件）
const searchForm = reactive({
  keyword: '',          // 关键词：姓名/账号/产品类型/地址
  minArea: undefined,   // 农场大小最小（亩）
  maxArea: undefined,   // 农场大小最大（亩）
  minPeriod: undefined, // 还款期限最小（月）
  maxPeriod: undefined, // 还款期限最大（月）
  minAmount: undefined, // 融资金额最小（元）
  maxAmount: undefined  // 融资金额最大（元）
});
const searchResultList = ref([]); // 搜索结果列表
const searchLoading = ref(false); // 搜索加载状态

// 计算属性：是否有搜索条件（用于控制结果区域显示）
const hasSearchCondition = computed(() => {
  return searchForm.keyword.trim() !== ''
    || searchForm.minArea !== undefined
    || searchForm.maxArea !== undefined
    || searchForm.minPeriod !== undefined
    || searchForm.maxPeriod !== undefined
    || searchForm.minAmount !== undefined
    || searchForm.maxAmount !== undefined;
});

// ======================== 工具函数 ========================
/**
 * 金额格式化（添加千分位）
 * @param {number} amount - 金额
 * @returns {string} 格式化后的金额
 */
const formatAmount = (amount) => {
  if (!amount || isNaN(amount)) return '0 元';
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' 元';
};

/**
 * 范围输入合法性校验（避免最小值大于最大值）
 * @param {string} type - 范围类型（area/period/amount）
 */
const handleRangeChange = (type) => {
  const minKey = `min${type.charAt(0).toUpperCase() + type.slice(1)}`;
  const maxKey = `max${type.charAt(0).toUpperCase() + type.slice(1)}`;

  if (searchForm[minKey] !== undefined && searchForm[maxKey] !== undefined) {
    if (searchForm[minKey] > searchForm[maxKey]) {
      ElMessage.warning(`请确保${type === 'area' ? '农场大小' : type === 'period' ? '还款期限' : '融资金额'}最小值不大于最大值`);
      // 自动交换最小值和最大值（优化体验）
      [searchForm[minKey], searchForm[maxKey]] = [searchForm[maxKey], searchForm[minKey]];
    }
  }
};

// ======================== 核心业务逻辑 ========================
// 页面加载初始化
onMounted(() => {
  fetchRandomBankUsers();
  fetchCurrentBankId();
});

// 获取智能匹配农户列表
const fetchRandomBankUsers = async () => {
  loading.value = true;
  errorMsg.value = '';
  try {
    const res = await getRandom10BankUsers();
    bankUserList.value = res.data || [];
  } catch (err) {
    errorMsg.value = (err && err.msg) || '获取银行用户数据失败，请重试';
  } finally {
    loading.value = false;
  }
};

// 获取当前银行ID
const fetchCurrentBankId = async () => {
  const userName = getCurrentUserName();
  if (!userName) {
    ElMessage.warning('未获取到当前用户信息，无法获取银行ID');
    return;
  }
  try {
    const res = await getBankIdByUserName(userName);
    currentBankId.value = res.data;
    console.log('当前银行ID:', currentBankId.value);
  } catch (err) {
    ElMessage.error('获取银行信息失败：' + (err.msg || err.message));
    console.error('获取bankId失败:', err);
  }
};

// 多维度搜索逻辑
const handleSearch = async () => {
  // 基础校验：是否有搜索条件
  if (!hasSearchCondition.value) {
    ElMessage.warning('请输入关键词或选择搜索条件');
    return;
  }

  searchLoading.value = true;
  try {
    // 构造请求参数（过滤undefined/null/空字符串，减少无效参数传递）
    const requestParams = {};
    Object.entries(searchForm).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        requestParams[key] = value;
      }
    });

    // 调用搜索接口
    const res = await searchFarmers(requestParams);
    searchResultList.value = res.data || [];

    // 结果反馈
    if (searchResultList.value.length === 0) {
      ElMessage.info('未找到符合条件的农户');
    } else {
      ElMessage.success(`找到 ${searchResultList.value.length} 条匹配结果`);
    }
  } catch (err) {
    ElMessage.error('搜索失败：' + (err.msg || '网络异常'));
    searchResultList.value = [];
    console.error('搜索报错：', err);
  } finally {
    searchLoading.value = false;
  }
};

// 重置搜索条件（关键修复：设为 null/空字符串，触发组件清空）
const resetSearch = () => {
  // 关键词设为 空字符串（ElInput 识别空字符串并清空）
  searchForm.keyword = '';
  // 范围条件设为 null（ElInputNumber 识别 null 并清空）
  searchForm.minArea = null;
  searchForm.maxArea = null;
  searchForm.minPeriod = null;
  searchForm.maxPeriod = null;
  searchForm.minAmount = null;
  searchForm.maxAmount = null;

  // 清空搜索结果
  searchResultList.value = [];
  ElMessage.success('搜索条件已重置');
};

// 打开融资弹窗
const openFinanceDialog = (user) => {
  Object.assign(currentUser, user);
  isFinanceDialogOpen.value = true;
};

// 关闭融资弹窗（清空数据）
const handleDialogClose = () => {
  Object.keys(currentUser).forEach(key => {
    delete currentUser[key];
  });
  isFinanceDialogOpen.value = false;
};

// 提交融资申请
const handleSubmitFinance = async () => {
  if (!currentBankId.value) {
    ElMessage.warning('银行信息未获取，请刷新页面重试');
    return;
  }
  if (!currentUser.userName) {
    ElMessage.warning('农户信息不完整');
    return;
  }

  submitLoading.value = true;
  try {
    const financeData = {
      bankId: currentBankId.value,
      ownName: currentUser.userName,
      realName: currentUser.realName,
      money: currentUser.amount,
      repayment: parseInt(currentUser.repayment) || 0,
      bankUserName: getCurrentUserName()
    };

    const res = await financeApiSubmit(financeData);
    if (res.code === 200) {
      ElMessage.success('融资业务办理成功！');
      isFinanceDialogOpen.value = false;
      fetchRandomBankUsers(); // 刷新智能匹配列表
      if (hasSearchCondition.value) {
        handleSearch(); // 刷新搜索结果列表（如有搜索条件）
      }
    } else {
      ElMessage.error('办理失败：' + res.msg);
    }
  } catch (err) {
    ElMessage.error('网络异常，融资办理失败：' + (err.msg || err.message));
    console.error('提交融资失败:', err);
  } finally {
    submitLoading.value = false;
  }
};
</script>

<style scoped>
/* ======================== 搜索区域样式 ======================== */
.search-container {
  max-width: 1200px;
  margin: 0 auto 30px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.search-wrapper {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.search-input {
  flex: 1;
  min-width: 200px;
  height: 42px;
}

/* 多维度选择器组样式 - 优化间距和输入框宽度 */
.search-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 24px; /* 增大组件间距，避免拥挤 */
  flex: 2;
  min-width: 500px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 10px; /* 输入框/分隔符/单位之间的间距 */
  flex-wrap: nowrap;
}

.filter-label {
  font-size: 14px;
  color: #666;
  white-space: nowrap;
  font-weight: 500; /* 标签加粗，更醒目 */
}

/* 范围输入框优化：加宽至140px，足够显示长数字（如100000） */
.range-input {
  width: 140px;
  height: 42px;
  font-size: 14px;
}

.range-separator {
  color: #999;
  font-size: 16px;
  font-weight: 500;
}

.unit {
  font-size: 14px;
  color: #666;
  white-space: nowrap;
  margin-left: 4px;
}

/* 按钮组样式 */
.btn-group {
  display: flex;
  gap: 10px;
  margin-left: auto;
}

.search-btn {
  padding: 10px 24px;
  height: 42px;
  font-size: 14px;
}

.reset-btn {
  padding: 10px 24px;
  height: 42px;
  font-size: 14px;
}

/* 搜索结果区域样式 */
.search-result-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  font-size: 18px;
  color: #2c3e50;
  margin: 0;
  font-weight: 600;
}

.result-count {
  font-size: 14px;
  color: #666;
}

/* ======================== 原有样式 ======================== */
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

.bank-user-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0;
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

.bank-user-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 16px;
  margin-bottom: 30px;
}

.bank-user-card {
  border: 1px solid #e0e6ed;
  border-radius: 10px;
  padding: 20px;
  display: flex;
  align-items: flex-start;
  transition: all 0.3s ease;
  background-color: #fff;
}

.bank-user-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.user-avatar {
  margin-right: 20px;
}

.user-avatar img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #f0f2f5;
}

.user-info h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 18px;
  font-weight: 600;
}

.user-info p {
  margin: 8px 0;
  color: #4a5568;
  font-size: 14px;
  line-height: 1.5;
}

.user-info i {
  margin-right: 8px;
  color: #3498db;
}

.refresh-btn {
  padding: 12px 36px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.refresh-btn:hover {
  background-color: #2980b9;
}

.refresh-btn:active {
  transform: scale(0.98);
}

.finance-btn {
  margin-top: 15px;
  padding: 8px 24px;
  background-color: #27ae60;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.finance-btn:hover {
  background-color: #219653;
}

/* ======================== 响应式适配 ======================== */
@media (max-width: 1200px) {
  .search-filters {
    min-width: 300px;
  }
}

@media (max-width: 768px) {
  .search-wrapper {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    width: 100%;
    min-width: auto;
  }

  .search-filters {
    width: 100%;
    min-width: auto;
    gap: 12px;
  }

  .btn-group {
    margin-left: 0;
    width: 100%;
    justify-content: flex-end;
  }

  /* 移动端输入框宽度自适应 */
  .range-input {
    width: 100%;
    min-width: 80px;
  }
}
</style>

<!-- 优化后的全局弹窗样式 -->
<style>
.el-dialog {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  margin: 0 !important;
  background-color: #ffffff !important;
  border-radius: 12px !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12) !important;
  padding: 8px !important;
}

.el-dialog__title {
  font-size: 18px !important;
  font-weight: 700 !important;
  color: #2c3e50 !important;
  padding: 16px 24px !important;
  border-bottom: 1px solid #f5f5f5 !important;
}

.dialog-content-custom {
  padding: 24px !important;
  line-height: 2 !important;
}

.dialog-row {
  display: flex !important;
  margin-bottom: 18px !important;
  align-items: center !important;
}

.dialog-label {
  width: 95px !important;
  font-size: 14px !important;
  color: #333333 !important;
  font-weight: 600 !important;
  text-align: right !important;
  margin-right: 20px !important;
}

.dialog-value {
  font-size: 14px !important;
  color: #555555 !important;
  flex: 1 !important;
}

.dialog-value.highlight {
  color: #27ae60 !important;
  font-weight: 600 !important;
  font-size: 15px !important;
}

.warning-box {
  margin-top: 22px !important;
  padding: 18px !important;
  background-color: #fff5f5 !important;
  border: 1px solid #ffeeee !important;
  border-radius: 8px !important;
}

.warning-title {
  color: #e74c3c !important;
  font-weight: 600 !important;
  font-size: 14px !important;
  margin-bottom: 6px !important;
  display: flex !important;
  align-items: center !important;
}

.warning-title::before {
  content: "⚠️" !important;
  margin-right: 8px !important;
  font-size: 16px !important;
}

.warning-text {
  color: #666666 !important;
  font-size: 13px !important;
  line-height: 1.7 !important;
}

.el-dialog__footer {
  padding: 16px 24px !important;
  border-top: 1px solid #ffffff !important;
  display: flex !important;
  justify-content: flex-end !important;
  gap: 12px !important;
}

.el-dialog__footer .el-button--default {
  padding: 10px 24px !important;
  border-radius: 8px !important;
  font-size: 14px !important;
  background-color: #f5f5f5 !important;
  border: 1px solid #e0e0e0 !important;
  color: #333333 !important;
  transition: all 0.3s ease !important;
}

.el-dialog__footer .el-button--default:hover {
  background-color: #f0f0f0 !important;
  border-color: #d0d0d0 !important;
  color: #000000 !important;
}

.el-dialog__footer .el-button--primary {
  padding: 10px 28px !important;
  border-radius: 8px !important;
  font-size: 14px !important;
  background-color: #54ca87 !important;
  border-color: #60d18e !important;
  color: #ffffff !important;
  transition: all 0.3s ease !important;
}

.el-dialog__footer .el-button--primary:hover {
  background-color: #50ca84 !important;
  border-color: #6eda9c !important;
}

/* 修复Element Plus输入框和数字输入框样式对齐 */
.el-input__wrapper, .el-input-number__wrapper {
  border-radius: 6px !important;
  font-size: 14px !important;
}

.el-input-number__decrease, .el-input-number__increase {
  border-radius: 0 !important;
}

/* 优化范围输入框聚焦样式 */
.el-input-number__wrapper:focus-within {
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2) !important;
  border-color: #3498db !important;
}
</style>
