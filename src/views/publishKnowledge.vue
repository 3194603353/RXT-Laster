<script setup lang="ts">
// 1. 明确导入必要依赖（避免未使用变量）
import { ref, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import SiteHeader from '../components/SiteHeader.vue';
import type { Knowledge } from '@/utils/types.ts';
import { knowledgeApi } from '@/utils/api.ts';
import { ElMessage, ElLoading } from 'element-plus'; // 仅导入使用的组件

// 2. 类型定义（避免any，增强类型安全）
type LoadingInstance = ReturnType<typeof ElLoading.service>;
type Nullable<T> = T | null;

// 3. 路由/状态初始化（类型严格）
const router = useRouter();
const route = useRoute();
let loadingInstance: Nullable<LoadingInstance> = null;

// 4. 用户信息（空值处理 + 类型断言）
const userStr = localStorage.getItem('user');
const user = userStr ? (JSON.parse(userStr) as { userName: string }) : null;
const expertName = user?.userName;

// 5. 知识表单状态（严格类型 + 初始值）
const isEditing = ref(!!route.query.id);
const currentKnowledge = ref<Partial<Knowledge>>({
  title: '',
  content: '',
  plantName: '',
  category: '',
  picPath: ''
});

// 6. 图片上传状态（细分状态，避免混乱）
const imageFile = ref<Nullable<File>>(null);
const imagePreview = ref('');
const isUploading = ref(false);

// 7. 未登录拦截（初始化时严格校验）
onMounted(async () => {
  if (!expertName) {
    ElMessage.warning('请先登录后再进行操作！');
    await router.push({ path: '/login', query: { redirect: route.fullPath } });
    return;
  }

  // 编辑模式：加载知识数据（类型校验 + 错误处理）
  if (isEditing.value && route.query.id) {
    loadingInstance = ElLoading.service({ text: '加载知识中...' });
    try {
      const knowledgeId = String(route.query.id);
      const res = await knowledgeApi.getById(knowledgeId);

      // 接口返回格式严格校验
      if (res.data.code === 200 && res.data.data) {
        currentKnowledge.value = res.data.data as Partial<Knowledge>;
        // 回显图片（仅当路径存在时）
        if (currentKnowledge.value.picPath) {
          imagePreview.value = currentKnowledge.value.picPath;
        }
      } else {
        ElMessage.error('未找到对应的农业知识！');
        await router.push('/expert-home');
      }
    } catch (err) {
      console.error('加载知识失败:', err);
      ElMessage.error('加载知识失败，请稍后重试！');
      await router.push('/expert-home');
    } finally {
      loadingInstance?.close();
    }
  }
});

// 8. 图片选择（格式/大小校验 + 预览）
const handleImageChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (!target.files?.[0]) return;

  const file = target.files[0];
  const allowTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  const maxSize = 2 * 1024 * 1024; // 2MB

  // 严格校验
  if (!allowTypes.includes(file.type)) {
    ElMessage.warning('仅支持上传JPG/PNG格式的图片！');
    target.value = ''; // 重置选择
    return;
  }
  if (file.size > maxSize) {
    ElMessage.warning('图片大小不能超过2MB！');
    target.value = '';
    return;
  }

  // 本地预览（自动释放URL）
  imageFile.value = file;
  imagePreview.value = URL.createObjectURL(file);
  watch([imageFile, imagePreview], () => {
    if (!imageFile.value || !imagePreview.value) {
      URL.revokeObjectURL(imagePreview.value);
    }
  });
};

// 9. 图片上传（接口调用 + 状态管理）
const uploadImage = async (): Promise<string> => {
  if (!imageFile.value) return '';
  isUploading.value = true;

  try {
    const formData = new FormData();
    formData.append('file', imageFile.value);

    const res = await knowledgeApi.uploadKnowledgeImage(formData);
    if (res.data.code === 200 && res.data.data?.path) {
      return res.data.data.path;
    } else {
      ElMessage.error('图片上传失败，请检查网络后重试！');
      return '';
    }
  } catch (err) {
    console.error('图片上传接口异常:', err);
    ElMessage.error('图片上传接口异常，请联系管理员！');
    return '';
  } finally {
    isUploading.value = false;
  }
};

// 10. 移除图片（状态重置 + 内存释放）
const removeImage = () => {
  if (imagePreview.value) {
    URL.revokeObjectURL(imagePreview.value);
  }
  imageFile.value = null;
  imagePreview.value = '';
  currentKnowledge.value.picPath = '';
};

// 11. 表单提交（严格校验 + 流程控制）
const publishKnowledge = async () => {
  // 表单必填项校验
  const { title, content, plantName } = currentKnowledge.value;
  if (!title?.trim() || !content?.trim() || !plantName?.trim()) {
    ElMessage.warning('标题、内容、农作物为必填项，请补充完整！');
    return;
  }

  // 图片上传（有新图片才执行）
  if (imageFile.value) {
    const picPath = await uploadImage();
    if (!picPath) {
      return; // 图片上传失败则终止流程
    }
    currentKnowledge.value.picPath = picPath;
  }

  // 提交数据
  loadingInstance = ElLoading.service({
    text: isEditing.value ? '更新知识中...' : '发布知识中...'
  });

  try {
    const submitData = {
      ...currentKnowledge.value,
      expertName,
      title: title.trim(),
      content: content.trim(),
      plantName: plantName.trim(),
      id: isEditing.value ? String(route.query.id) : undefined
    };

    if (isEditing.value) {
      await knowledgeApi.updateKnowledge(submitData);
      ElMessage.success('农业知识更新成功！');
    } else {
      await knowledgeApi.createKnowledge({
        ...submitData,
        createTime: new Date().toISOString()
      });
      ElMessage.success('农业知识发布成功！');
    }

    await router.push('/expert-home');
  } catch (err) {
    console.error('知识操作失败:', err);
    ElMessage.error(isEditing.value ? '更新知识失败，请重试！' : '发布知识失败，请重试！');
  } finally {
    loadingInstance?.close();
  }
};

// 12. 返回操作（明确路由）
const goBack = () => {
  router.push('/expert-home');
};
</script>

<template>
  <div>
    <SiteHeader />
    <div class="publish-page">
      <div class="page-header">
        <button class="back-btn" @click="goBack">← 返回专家工作台</button>
        <h1 class="page-title">
          {{ isEditing ? '编辑农业知识' : '发布新的农业知识' }}
        </h1>
      </div>

      <div class="form-container">
        <!-- 知识标题 -->
        <div class="form-item">
          <label class="form-label">知识标题 *</label>
          <input
            v-model="currentKnowledge.title"
            placeholder="请输入知识标题（如：小麦高产种植技巧）"
            class="form-input"
            maxlength="100"
          />
        </div>

        <!-- 农作物 -->
        <div class="form-item">
          <label class="form-label">农作物 *</label>
          <input
            v-model="currentKnowledge.plantName"
            placeholder="请输入相关农作物（如：小麦、水稻）"
            class="form-input"
            maxlength="50"
          />
        </div>

        <!-- 知识分类 -->
        <div class="form-item">
          <label class="form-label">知识分类</label>
          <select v-model="currentKnowledge.category" class="form-select">
            <option value="">请选择分类</option>
            <option value="种植技术">种植技术</option>
            <option value="病虫害防治">病虫害防治</option>
            <option value="施肥技巧">施肥技巧</option>
            <option value="品种介绍">品种介绍</option>
            <option value="其他">其他</option>
          </select>
        </div>

        <!-- 知识图片 -->
        <div class="form-item">
          <label class="form-label">知识图片</label>
          <div class="image-upload-area">
            <!-- 图片预览 -->
            <div class="image-preview" v-if="imagePreview">
              <img :src="imagePreview" alt="知识图片" class="preview-img" />
              <button class="remove-img-btn" @click="removeImage" :disabled="isUploading">×</button>
            </div>
            <!-- 上传按钮 -->
            <div class="upload-btn-area" v-else>
              <label for="image-upload" class="upload-btn" :class="{ disabled: isUploading }">
                {{ isUploading ? '上传中...' : '选择图片' }}
              </label>
              <input
                id="image-upload"
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                class="hidden-input"
                @change="handleImageChange"
                :disabled="isUploading"
              />
              <p class="tip-text">支持JPG/PNG格式，大小不超过2MB</p>
            </div>
          </div>
        </div>

        <!-- 知识内容 -->
        <div class="form-item">
          <label class="form-label">知识内容 *</label>
          <textarea
            v-model="currentKnowledge.content"
            placeholder="请输入详细的农业知识内容（图文结合更佳）"
            rows="12"
            class="form-textarea"
          ></textarea>
        </div>

        <!-- 操作按钮 -->
        <div class="btn-group">
          <button class="cancel-btn" @click="goBack" :disabled="isUploading || !!loadingInstance">取消</button>
          <button
            class="submit-btn"
            @click="publishKnowledge"
            :disabled="isUploading || !!loadingInstance"
          >
            {{ isEditing ? '确认更新' : '确认发布' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 基础样式（增强可读性 + 响应式） */
.publish-page {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
  background-color: #f5f5f5;
  min-height: calc(100vh - 80px);
}

.page-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.back-btn {
  padding: 8px 16px;
  border: 1px solid #2E7D32;
  background: #fff;
  color: #2E7D32;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.back-btn:hover {
  background: #2E7D32;
  color: #fff;
}

.page-title {
  color: #333;
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  flex: 1;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.form-container {
  background: #fff;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.form-item {
  margin-bottom: 25px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-size: 14px;
  font-weight: 500;
}

.form-input, .form-select {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.form-input:focus, .form-select:focus {
  outline: none;
  border-color: #2E7D32;
}

.form-textarea {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  transition: border-color 0.3s;
  min-height: 200px;
}

.form-textarea:focus {
  outline: none;
  border-color: #2E7D32;
}

/* 图片上传样式（交互增强） */
.image-upload-area {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.image-preview {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px dashed #ddd;
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-img-btn {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.remove-img-btn:disabled {
  background: rgba(0, 0, 0, 0.2);
  cursor: not-allowed;
}

.upload-btn-area {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.upload-btn {
  display: inline-block;
  padding: 10px 20px;
  border: 1px dashed #2E7D32;
  color: #2E7D32;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.upload-btn.disabled {
  border-color: #ccc;
  color: #ccc;
  cursor: not-allowed;
}

.upload-btn:not(.disabled):hover {
  background: #2E7D32;
  color: #fff;
}

.hidden-input {
  display: none;
}

.tip-text {
  color: #999;
  font-size: 12px;
  margin: 0;
}

/* 按钮组样式 */
.btn-group {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  margin-top: 30px;
  flex-wrap: wrap;
}

.cancel-btn {
  padding: 10px 20px;
  border: 1px solid #ddd;
  background: #fff;
  color: #666;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.cancel-btn:disabled {
  background: #f5f5f5;
  color: #ccc;
  cursor: not-allowed;
}

.cancel-btn:not(:disabled):hover {
  border-color: #bbb;
  color: #333;
}

.submit-btn {
  padding: 10px 20px;
  background: #2E7D32;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
}

.submit-btn:disabled {
  background: #9CCC65;
  cursor: not-allowed;
}

.submit-btn:not(:disabled):hover {
  background: #1B5E20;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .publish-page {
    padding: 10px;
  }
  .form-container {
    padding: 20px;
  }
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  .image-upload-area {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
