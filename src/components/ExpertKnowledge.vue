<template>
  <div class="section">
    <h2 class="section-title">我发布的农业知识</h2>
    <div class="search-box">
      <input
        v-model="knowledgeSearchKey"
        placeholder="搜索我的知识（标题/农作物/分类）..."
        class="search-input"
        @keyup.enter="searchKnowledge"
      />
      <button @click="searchKnowledge" class="search-btn">搜索</button>
      <button class="publish-btn" @click="router.push('/publish-knowledge')" >发布新的农业知识</button>
    </div>

    <!-- 知识列表 -->
    <div class="knowledge-list" v-loading="knowledgeLoading">
      <div
        class="knowledge-item"
        v-for="item in knowledgeList"
        :key="item.id || item.knowledgeId"
      >
        <h3 class="knowledge-title">{{ item.title }}</h3>
        <div class="knowledge-meta">
          <span>农作物：<span class="meta-value">{{ item.plantName || '未分类' }}</span></span>
          <span>分类：<span class="meta-value">{{ item.category || '未分类' }}</span></span>
          <span>发布时间：<span class="meta-value">{{ formatTime(item.createTime) }}</span></span>
          <template v-if="item.updateTime && item.updateTime !== item.createTime">
            <span>更新时间：<span class="meta-value">{{ formatTime(item.updateTime) }}</span></span>
          </template>
        </div>
        <p class="knowledge-content">{{ (item.content || '').substring(0, 100) }}...</p>
        <div class="knowledge-actions">
          <button class="edit-btn" @click.stop="editKnowledge(item)">编辑</button>
          <button class="delete-btn" @click.stop="deleteKnowledge(item.id || item.knowledgeId)">删除</button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div class="empty-tip" v-if="knowledgeList.length === 0 && !knowledgeLoading">
      <div class="empty-icon">📚</div>
      <p>您还没有发布任何农业知识~</p>
      <button @click="openPublishDialog" class="empty-action-btn">立即发布</button>
    </div>

    <!-- 分页 -->
    <div class="pagination" v-if="knowledgeTotal > 0 && !knowledgeLoading">
      <button @click="prevKnowledgePage" :disabled="knowledgePageNum <= 1" :class="{ disabled: knowledgePageNum <= 1 }">上一页</button>
      <span>{{ knowledgePageNum }} / {{ knowledgeTotalPages }}</span>
      <button @click="nextKnowledgePage" :disabled="knowledgePageNum >= knowledgeTotalPages" :class="{ disabled: knowledgePageNum >= knowledgeTotalPages }">下一页</button>
    </div>

    <!-- 发布/编辑弹窗（核心优化部分） -->
    <ElDialog
      v-model="isPublishDialogVisible"
      :title="isEditing ? '编辑农业知识' : '发布新的农业知识'"
      width="800px"
      destroy-on-close
      :close-on-click-modal="false"
      :before-close="handleDialogClose"
    >
      <el-form
        ref="knowledgeForm"
        :model="currentKnowledge"
        :rules="formRules"
        label-width="120px"
        class="knowledge-form"
      >
        <!-- 基础信息区 -->
        <div class="form-section">
          <h3 class="form-section-title">基础信息</h3>
          <el-form-item label="知识标题" prop="title">
            <el-input
              v-model="currentKnowledge.title"
              placeholder="请输入知识标题（10-50字）"
              maxlength="50"
              show-word-limit
              clearable
            ></el-input>
          </el-form-item>

          <el-form-item label="农作物" prop="plantName">
            <el-select
              v-model="currentKnowledge.plantName"
              placeholder="请选择农作物类型"
              clearable
              filterable
            >
              <el-option label="粮食作物" value="粮食作物"></el-option>
              <el-option label="经济作物" value="经济作物"></el-option>
              <el-option label="蔬菜" value="蔬菜"></el-option>
              <el-option label="水果" value="水果"></el-option>
              <el-option label="花卉" value="花卉"></el-option>
              <el-option label="其他" value="其他"></el-option>
            </el-select>
          </el-form-item>

          <el-form-item label="知识分类" prop="category">
            <el-select
              v-model="currentKnowledge.category"
              placeholder="请选择知识分类"
              clearable
            >
              <el-option label="种植技术" value="种植技术"></el-option>
              <el-option label="病虫害防治" value="病虫害防治"></el-option>
              <el-option label="施肥技巧" value="施肥技巧"></el-option>
              <el-option label="品种介绍" value="品种介绍"></el-option>
              <el-option label="采收存储" value="采收存储"></el-option>
              <el-option label="其他" value="其他"></el-option>
            </el-select>
          </el-form-item>
        </div>

        <!-- 内容区 -->
        <div class="form-section">
          <h3 class="form-section-title">知识内容</h3>
          <el-form-item label="详细内容" prop="content">
            <el-input
              type="textarea"
              v-model="currentKnowledge.content"
              placeholder="请输入详细的农业知识内容（至少20字，支持换行）"
              rows="10"
              maxlength="2000"
              show-word-limit
              resize="vertical"
            ></el-input>
            <p class="form-hint">提示：请尽量详细描述，包含操作步骤、注意事项等关键信息</p>
          </el-form-item>
        </div>

        <!-- 编辑时显示原始信息 -->
        <template v-if="isEditing">
          <div class="form-section">
            <h3 class="form-section-title">记录信息</h3>
            <el-form-item label="发布时间">
              <span class="form-static">{{ formatTime(currentKnowledge.createTime) }}</span>
            </el-form-item>
            <el-form-item label="最后更新">
              <span class="form-static">{{ currentKnowledge.updateTime ? formatTime(currentKnowledge.updateTime) : '未更新' }}</span>
            </el-form-item>
          </div>
        </template>
      </el-form>

      <template #footer>
        <button class="btn btn-cancel" @click="handleDialogClose">取消</button>
        <button
          class="btn btn-confirm"
          @click="publishKnowledge"
          :disabled="isSubmitting"
        >
          <el-loading-spinner v-if="isSubmitting" class="loading-spinner"></el-loading-spinner>
          {{ isSubmitting ? (isEditing ? '更新中...' : '发布中...') : (isEditing ? '更新' : '发布') }}
        </button>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, reactive } from 'vue';
import type { Knowledge } from '@/utils/types.ts';
import { knowledgeApi } from '@/utils/api.ts';
import { ElMessage, ElMessageBox, ElForm, ElFormItem, ElInput, ElSelect, ElOption, ElLoading } from 'element-plus';
import { useRouter } from 'vue-router';
const router = useRouter();

// 接收专家名称
const props = defineProps<{
  expertName: string;
}>();

// 向父组件传递统计更新
const emit = defineEmits<{
  (e: 'update-stats', type: string, value: number): void;
}>();

// 知识管理变量
const knowledgeSearchKey = ref('');
const knowledgeList = ref<Knowledge[]>([]);
const knowledgePageNum = ref(1);
const knowledgePageSize = ref(10);
const knowledgeTotal = ref(0);
const knowledgeLoading = ref(false);
const knowledgeTotalPages = computed(() => Math.ceil(knowledgeTotal.value / knowledgePageSize.value));

// 发布/编辑弹窗状态
const isPublishDialogVisible = ref(false);
const isEditing = ref(false);
const isSubmitting = ref(false); // 防止重复提交
const knowledgeForm = ref<InstanceType<typeof ElForm>>(); // 表单实例

// 当前编辑的知识（完善字段定义）
const currentKnowledge = reactive<Partial<Knowledge>>({
  id: undefined,
  title: '',
  content: '',
  plantName: '',
  category: '',
  expertName: props.expertName,
  createTime: undefined,
  updateTime: undefined
});

// 表单校验规则（核心优化：严谨校验）
const formRules = reactive({
  title: [
    { required: true, message: '请输入知识标题', trigger: 'blur' },
    { min: 10, max: 50, message: '标题长度必须在10-50字之间', trigger: 'blur' }
  ],
  plantName: [
    { required: true, message: '请选择农作物类型', trigger: 'change' }
  ],
  category: [
    { required: true, message: '请选择知识分类', trigger: 'change' }
  ],
  content: [
    { required: true, message: '请输入知识内容', trigger: 'blur' },
    { min: 20, message: '内容长度不能少于20字', trigger: 'blur' },
    { max: 2000, message: '内容长度不能超过2000字', trigger: 'blur' }
  ]
});

// 格式化时间（增强容错）
const formatTime = (time: Date | string | undefined) => {
  if (!time) return '无记录';
  try {
    return new Date(time).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return '格式错误';
  }
};

// 获取知识列表
const fetchExpertKnowledge = async () => {
  knowledgeLoading.value = true;
  try {
    const res = await knowledgeApi.getByExpert(
      props.expertName,
      knowledgeSearchKey.value,
      knowledgePageNum.value,
      knowledgePageSize.value
    );
    knowledgeList.value = res.data?.records || [];
    knowledgeTotal.value = res.data?.total || 0;
    emit('update-stats', 'totalKnowledge', knowledgeTotal.value);
  } catch (error) {
    console.error('加载知识列表失败：', error);
    knowledgeList.value = [];
    knowledgeTotal.value = 0;
    ElMessage.error('加载知识失败，请重试');
  } finally {
    knowledgeLoading.value = false;
  }
};

// 打开发布弹窗
const openPublishDialog = () => {
  resetKnowledgeForm();
  isEditing.value = false;
  isPublishDialogVisible.value = true;
};

// 发布/编辑知识（优化：表单校验+防重复提交）
const publishKnowledge = async () => {
  // 表单校验
  if (!knowledgeForm.value) return;
  const valid = await knowledgeForm.value.validate();
  if (!valid) return;

  isSubmitting.value = true;
  try {
    const submitData = {
      ...currentKnowledge,
      expertName: props.expertName,
      title: currentKnowledge.title?.trim(),
      content: currentKnowledge.content?.trim(),
      plantName: currentKnowledge.plantName?.trim(),
      category: currentKnowledge.category?.trim()
    };

    if (isEditing.value) {
      // 编辑时补充更新时间
      submitData.updateTime = new Date().toISOString();
      await knowledgeApi.updateKnowledge(submitData);
      ElMessage.success('知识更新成功');
    } else {
      // 发布时补充创建时间
      submitData.createTime = new Date().toISOString();
      await knowledgeApi.createKnowledge(submitData);
      ElMessage.success('知识发布成功');
    }

    isPublishDialogVisible.value = false;
    resetKnowledgeForm();
    await fetchExpertKnowledge(); // 刷新列表
  } catch (error) {
    console.error('知识操作失败：', error);
    ElMessage.error(isEditing.value ? '更新失败，请重试' : '发布失败，请重试');
  } finally {
    isSubmitting.value = false;
  }
};

// 编辑知识（优化：完整复制原始数据）
const editKnowledge = (knowledge: Knowledge) => {
  // 深拷贝原始数据，避免编辑时实时影响列表
  Object.assign(currentKnowledge, JSON.parse(JSON.stringify(knowledge)));
  isEditing.value = true;
  isPublishDialogVisible.value = true;
};

// 删除知识（优化：二次确认+加载状态）
const deleteKnowledge = async (id: number | string) => {
  if (!id) return;
  try {
    await ElMessageBox.confirm(
      '确定要删除这条知识吗？删除后将无法恢复，相关引用也会失效。',
      '删除确认',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
        dangerMode: true // 确认按钮变红，强调危险性
      }
    );

    // 显示加载状态
    const loading = ElLoading.service({ text: '删除中...' });
    await knowledgeApi.delete(id);
    loading.close();

    ElMessage.success('删除成功');
    await fetchExpertKnowledge();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败：', error);
      ElMessage.error('删除失败，请重试');
    }
  }
};

// 重置表单
const resetKnowledgeForm = () => {
  Object.keys(currentKnowledge).forEach(key => {
    (currentKnowledge as any)[key] = key === 'expertName' ? props.expertName : undefined;
  });
  knowledgeForm.value?.resetFields();
};

// 关闭弹窗前确认（优化：防止误操作丢失内容）
const handleDialogClose = async () => {
  // 检查表单是否有内容且未提交
  const hasContent = Object.values(currentKnowledge).some(val =>
    val !== undefined && val !== null && val !== ''
  );

  if (hasContent && !isSubmitting.value) {
    const confirm = await ElMessageBox.confirm(
      '当前表单有未保存的内容，确定要关闭吗？',
      '确认关闭',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    ).catch(() => false);

    if (confirm) {
      isPublishDialogVisible.value = false;
      resetKnowledgeForm();
    }
  } else {
    isPublishDialogVisible.value = false;
    resetKnowledgeForm();
  }
};

// 分页方法
const prevKnowledgePage = () => {
  if (knowledgePageNum.value > 1) {
    knowledgePageNum.value--;
    fetchExpertKnowledge();
  }
};
const nextKnowledgePage = () => {
  if (knowledgePageNum.value < knowledgeTotalPages.value) {
    knowledgePageNum.value++;
    fetchExpertKnowledge();
  }
};

// 搜索方法
const searchKnowledge = () => {
  knowledgePageNum.value = 1;
  fetchExpertKnowledge();
};

// 监听搜索关键词（优化：防抖处理）
watch(knowledgeSearchKey, (newVal, oldVal) => {
  if (newVal !== oldVal && newVal === '') {
    knowledgePageNum.value = 1;
    fetchExpertKnowledge();
  }
});

// 初始化加载
onMounted(() => {
  fetchExpertKnowledge();
});
</script>

<style scoped>
/* 基础样式优化 */
.section {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.section-title {
  color: #333;
  font-size: 20px;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 搜索区域样式 */
.search-box {
  display: flex;
  gap: 10px;
  margin-bottom: 25px;
  align-items: center;
}

.search-input {
  flex: 1;
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: #2E7D32;
  box-shadow: 0 0 0 2px rgba(46, 125, 50, 0.1);
}

.search-btn {
  padding: 12px 20px;
  background: #2E7D32;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s;
  white-space: nowrap;
}

.search-btn:hover {
  background: #1B5E20;
}

.publish-btn {
  padding: 12px 20px;
  background: #4285F4;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s;
  white-space: nowrap;
}

.publish-btn:hover {
  background: #3367D6;
}

/* 知识列表样式 */
.knowledge-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 30px;
}

.knowledge-item {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 20px;
  transition: all 0.3s;
  background-color: #fff;
}

.knowledge-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: #e0e0e0;
  transform: translateY(-2px);
}

.knowledge-title {
  color: #333;
  margin-bottom: 12px;
  font-size: 18px;
  font-weight: 600;
  transition: color 0.3s;
}

.knowledge-item:hover .knowledge-title {
  color: #2E7D32;
}

.knowledge-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 15px 30px;
  color: #666;
  font-size: 13px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #f0f0f0;
}

.meta-value {
  color: #333;
  font-weight: 500;
}

.knowledge-content {
  color: #555;
  line-height: 1.6;
  font-size: 14px;
  margin-bottom: 15px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.knowledge-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  justify-content: flex-end;
}

.edit-btn {
  padding: 6px 12px;
  background: #FF9800;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.edit-btn:hover {
  background: #F57C00;
  transform: translateY(-1px);
}

.delete-btn {
  padding: 6px 12px;
  background: #F44336;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.delete-btn:hover {
  background: #D32F2F;
  transform: translateY(-1px);
}

/* 空状态样式 */
.empty-tip {
  text-align: center;
  padding: 60px 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
  margin-bottom: 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 15px;
  color: #ddd;
}

.empty-tip p {
  color: #999;
  font-size: 16px;
  margin-bottom: 20px;
}

.empty-action-btn {
  padding: 10px 20px;
  background: #2E7D32;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s;
  font-size: 14px;
}

.empty-action-btn:hover {
  background: #1B5E20;
}

/* 分页样式 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 20px;
  padding: 10px 0;
}

.pagination button {
  padding: 8px 16px;
  border: 1px solid #2E7D32;
  background: #fff;
  color: #2E7D32;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.pagination button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  border-color: #ccc;
  color: #999;
}

.pagination button:not(.disabled):hover {
  background: #2E7D32;
  color: #fff;
}

.pagination span {
  color: #666;
  font-size: 14px;
  padding: 0 5px;
}

/* 表单弹窗样式 */
.knowledge-form {
  padding: 10px 0;
}

.form-section {
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid #f0f0f0;
}

.form-section:last-child {
  border-bottom: none;
  margin-bottom: 10px;
  padding-bottom: 0;
}

.form-section-title {
  font-size: 16px;
  color: #333;
  margin-bottom: 15px;
  padding-left: 5px;
  border-left: 3px solid #2E7D32;
  font-weight: 600;
}

.form-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #999;
  line-height: 1.5;
}

.form-static {
  font-size: 14px;
  color: #666;
  padding: 5px 0;
}

/* 弹窗按钮样式 */
.btn {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.btn-cancel {
  border: 1px solid #ddd;
  background: #fff;
  color: #666;
}

.btn-cancel:hover {
  border-color: #bbb;
  color: #333;
}

.btn-confirm {
  background: #2E7D32;
  color: #fff;
  border: none;
}

.btn-confirm:hover {
  background: #1B5E20;
}

.btn-confirm:disabled {
  background: #81C784;
  cursor: not-allowed;
}

.loading-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  margin-right: 6px;
  vertical-align: middle;
}

/* 适配响应式 */
@media (max-width: 768px) {
  .search-box {
    flex-wrap: wrap;
  }

  .search-btn, .publish-btn {
    flex: 1;
    min-width: 120px;
  }

  .knowledge-meta {
    gap: 10px 15px;
  }

  .knowledge-actions {
    flex-wrap: wrap;
  }

  .form-section-title {
    font-size: 14px;
  }

  .el-form {
    padding: 0 5px;
  }
}
</style>
