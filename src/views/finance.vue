<template>
  <div>
    <SiteHeader />
    <div class="finance-container">
      <h1>融资意向申请</h1>
      <form class="finance-form" @submit.prevent="handleSubmit">

        <div class="form-group">
          <label for="realName">真实姓名 <span class="required">*</span></label>
          <input
            type="text"
            id="realName"
            v-model="form.realName"
            required
            placeholder="请输入真实姓名"
          >
        </div>

        <div class="form-group">
          <label for="address">联系地址 <span class="required">*</span></label>
          <input
            type="text"
            id="address"
            v-model="form.address"
            required
            placeholder="请输入联系地址"
          >
        </div>

        <div class="form-group">
          <label for="amount">申请金额(元) <span class="required">*</span></label>
          <input
            type="number"
            id="amount"
            v-model="form.amount"
            required
            min="0"
            placeholder="请输入申请金额"
          >
        </div>

        <div class="form-group">
          <label for="application">资金用途 <span class="required">*</span></label>
          <textarea
            id="application"
            v-model="form.application"
            required
            rows="3"
            placeholder="请描述资金用途"
          ></textarea>
        </div>

        <div class="form-group">
          <label for="item">项目类型 <span class="required">*</span></label>
          <select id="item" v-model="form.item" required>
            <option value="">请选择项目类型</option>
            <option value="农业种植">农业种植</option>
            <option value="畜牧养殖">畜牧养殖</option>
            <option value="农产品加工">农产品加工</option>
            <option value="农业合作社">农业合作社</option>
            <option value="其他">其他</option>
          </select>
        </div>

        <div class="form-group">
          <label for="repaymentPeriod">还款期限(月) <span class="required">*</span></label>
          <input
            type="number"
            id="repaymentPeriod"
            v-model="form.repaymentPeriod"
            required
            min="1"
            placeholder="请输入还款期限"
          >
        </div>

        <div class="form-group">
          <label for="area">项目面积(亩) </label>
          <input
            type="number"
            id="area"
            v-model="form.area"
            min="0"
            placeholder="请输入项目面积（非必填）"
          >
        </div>

        <div class="form-group">
          <label for="phone">联系电话 <span class="required">*</span></label>
          <input
            type="tel"
            id="phone"
            v-model="form.phone"
            required
            placeholder="请输入联系电话"
          >
        </div>

        <div class="form-group">
          <label for="repayment">还款方式 <span class="required">*</span></label>
          <input
            type="text"
            id="repayment"
            v-model="form.repayment"
            required
            placeholder="请输入还款方式（如：等额本息、高利贷等）"
          >
        </div>

        <div class="form-actions">
          <button type="submit" class="submit-btn">提交申请</button>
          <button type="reset" class="reset-btn">重置表单</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import SiteHeader from '../components/SiteHeader.vue';
import axios from 'axios';
import { ElMessage } from 'element-plus'; // 假设使用element-plus的消息提示

// 表单数据模型
const form = ref({
  userName: '',
  realName: '',
  address: '',
  amount: 0,
  application: '',
  item: '',
  repaymentPeriod: 0,
  area: 0,
  phone: '',
  repayment: ''
});

// 提交表单处理
const handleSubmit = async () => {
  try {
    const response = await axios.post('/api/finance-intention/create', form.value);
    if (response.data.code === 200) {
      ElMessage.success('融资意向申请提交成功！');
      // 重置表单
      form.value = {
        userName: '',
        realName: '',
        address: '',
        amount: 0,
        application: '',
        item: '',
        repaymentPeriod: 0,
        area: 0,
        phone: '',
        repayment: ''
      };
    } else {
      ElMessage.error(response.data.msg || '提交失败，请重试');
    }
  } catch (error) {
    console.error('提交失败', error);
    ElMessage.error('网络异常，请稍后再试');
  }
};
</script>

<style scoped>
.finance-container {
  max-width: 800px;
  margin: 40px auto;
  padding: 0 20px;
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
}

.finance-form {
  background: #fff;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  color: #666;
  font-weight: 500;
}

.required {
  color: #ff4d4f;
}

input, textarea, select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: #36a24a;
  box-shadow: 0 0 0 2px rgba(54, 162, 74, 0.2);
}

textarea {
  resize: vertical;
}

.form-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 30px;
}

.submit-btn {
  padding: 10px 24px;
  background-color: #36a24a;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.submit-btn:hover {
  background-color: #2d8c3c;
}

.reset-btn {
  padding: 10px 24px;
  background-color: #fff;
  color: #666;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.reset-btn:hover {
  background-color: #f5f5f5;
}
</style>
