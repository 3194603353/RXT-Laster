<template>
  <div class="guide-source">
    <div class="search-box">
      <input v-model="searchKeys" placeholder="搜索问答...">
      <button @click="searchQuestions">搜索</button>
    </div>
    <div class="question-list">
      <div class="question-item" v-for="item in questionList" :key="item.id" @click="handleDetail(item.id)">
        <h3>{{ item.title }}</h3>
        <p class="info">提问者：{{ item.inquirer }} | 专家：{{ item.expertName }}</p>
      </div>
    </div>
    <pagination :page-num="pageNum" :total="total" @page-change="getQuestions"></pagination>
  </div>
</template>

<script>
import OrderApi from '@/api/order';
import Pagination from './Pagination.vue';

export default {
  components: { Pagination },
  data() {
    return {
      searchKeys: '',
      questionList: [],
      pageNum: 1,
      total: 0
    };
  },
  mounted() {
    this.getQuestions();
  },
  methods: {
    async getQuestions() {
      const res = await OrderApi.selectQuestions({
        keys: this.searchKeys,
        pageNum: this.pageNum
      });
      if (res.data.success) {
        this.questionList = res.data.data.list;
        this.total = res.data.data.total;
      }
    },
    searchQuestions() {
      this.pageNum = 1;
      this.getQuestions();
    },
    handleDetail(id) {
      this.$router.push(`/guide/${id}`);
    },
    pageChange(pageNum) {
      this.pageNum = pageNum;
      this.getQuestions();
    }
  }
};
</script>

<style scoped>
.guide-source {
  padding: 20px;
}
.search-box {
  margin-bottom: 20px;
  display: flex;
}
input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px 0 0 4px;
}
button {
  background: #2E7D32;
  color: #fff;
  border: none;
  padding: 0 20px;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
}
.question-item {
  border: 1px solid #eee;
  padding: 15px;
  margin-bottom: 15px;
  cursor: pointer;
}
.info {
  color: #999;
  margin-top: 10px;
  font-size: 14px;
}
</style>
