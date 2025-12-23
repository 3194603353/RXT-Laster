<template>
  <div class="knowledge-container">
    <div class="knowledge-item" v-for="item in knowledgeList" :key="item.knowledge_id" @click="handleDetail(item.id)">
      <h3>{{ item.title }}</h3>
      <p class="content">{{ item.content.substring(0, 100) }}...</p>
      <p class="author">作者：{{ item.publisherName }}</p>
    </div>
    <pagination :page-num="pageNum" :total="total" @page-change="getKnowledges"></pagination>
  </div>
</template>

<script lang="ts">
import KnowledgeApi from '@/utils/api';
import Pagination from './Pagination.vue';

export default {
  components: { Pagination },
  data() {
    return {
      knowledgeList: [],
      pageNum: 1,
      total: 0
    };
  },
  mounted() {
    this.getKnowledges();
  },
  methods: {
    async getKnowledges() {
      const res = await KnowledgeApi.selectKnowledgesPage(this.pageNum);
      if (res.data.success) {
        this.knowledgeList = res.data.data.list;
        this.total = res.data.data.total;
      }
    },
    handleDetail(id) {
      this.$router.push(`/knowledge/${id}`);
    },
    pageChange(pageNum) {
      this.pageNum = pageNum;
      this.getKnowledges();
    }
  }
};
</script>

<style scoped>
.knowledge-container {
  padding: 20px;
}
.knowledge-item {
  border: 1px solid #eee;
  padding: 15px;
  margin-bottom: 15px;
  cursor: pointer;
}
.content {
  color: #666;
  margin: 10px 0;
}
.author {
  color: #999;
  font-size: 14px;
}
</style>
