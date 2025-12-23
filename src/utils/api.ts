import type {ApiResponse, PageResponse, Knowledge, Discuss, Expert, Question} from './types';
import axios from 'axios'
import request from '../utils/request';
const base = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8082'
axios.defaults.baseURL = base
axios.defaults.withCredentials = true
// 创建 Axios 实例（统一配置基础路径、超时等）
const service = axios.create({
  baseURL: 'http://101.37.83.215:8082', // 关键：指向后端服务地址
  timeout: 5000,
});
export default axios

// ------------------------- 农业知识模块接口 -------------------------
export const knowledgeApi = {
  // 获取知识列表（分页）
  getPageList: (pageNum: number, pageSize: number, keyWords: string) => {
    return request.get<ApiResponse<PageResponse<Knowledge>>>('/api/knowledge/page', {
      params: { pageNum, pageSize, keyWords },
    });
  },
  // 获取专家知识列表（分页）
  getByExpert: (expertName: string, keyWords: string, pageNum: number, pageSize: number) => {
    return request.get<ApiResponse<PageResponse<Knowledge>>>('/api/knowledge/forExpert', {
      params: { expertName, keyWords, pageNum, pageSize },
    });
  },
  // 获取单条知识详情
  getDetail: (knowledgeId: number) => {
    return request.get<ApiResponse<Knowledge>>(`/api/knowledge/${knowledgeId}`);
  },
  delete: (id: number) => {
    return request.delete<ApiResponse<null>>(`/api/knowledge/delete/${id}`);
  },

  //更新 knowledge
  updateKnowledge: (data: { knowledgeId: number; title: string; content: string }) => {
    return request.put<ApiResponse<null>>('/api/knowledge/update', data);
  },

  // 创建知识
  createKnowledge: (data: { title: string; content: string ,pic_path: string }) => {
    return request.post<ApiResponse<null>>('/api/knowledge/create', data);
  },

  // 新增：图片上传接口（核心）
  uploadKnowledgeImage: (formData: FormData) =>
    axios.post('/api/upload/knowledge-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'  // 必须设置，告知后端传输的是表单数据
      },
      onUploadProgress: (progressEvent) => {
        // 可选：监听上传进度（用于显示进度条）
        const percent = Math.round((progressEvent.loaded / (progressEvent.total || 1)) * 100);
        console.log(`上传进度：${percent}%`);
      }
    })
};
// ------------------------- 专家模块接口-------------------------

export const expertApi = {
  // 获取专家列表（分页）
  getExpertPage: (searchKeys: string, pageNum: number, pageSize: number) => {
    return request.get<ApiResponse<PageResponse<Expert>>>(`/api/expert/page`, {
      params: { searchKeys, pageNum, pageSize },
    });
  },
  getExpertByUsername: (username: string) => {
    return request.get<ApiResponse<Expert>>(`/api/expert/${username}`);
  },
  getExpertDetail: (username: string) => {
    return request.get<ApiResponse<Expert>>(`/api/expert/detail/${username}`);
  },
};
// ------------------------- 问答模块接口-------------------------
export const questionApi = {
  // 获取问题列表（分页）
  getQuestionPage: (keys: string, pageNum: number, pageSize: number) => {
    return request.get<ApiResponse<PageResponse<Question>>>('/api/question/page', {
      params: {keys, pageNum, pageSize },
    });
  },
  // 获取专家已处理的问题列表（分页）
  getExpertAssignedPage: (expertName: string, keyword: string, pageNum: number, pageSize: number) => {
    return request.get<ApiResponse<PageResponse<Question>>>('/api/question/expert/list', {
      params: { expertName, keyword, pageNum, pageSize },
    });
  },
  // 发布问题
  postQuestion: (data: Pick<Question, 'expertName' | 'questioner' | 'phone' | 'plantName' | 'title' | 'question'>) => {
    return request.post<ApiResponse<null>>('/api/question/add', data);
  },

  // 获取问题详情
  getQuestionDetail: (questionId: number) => {
    return request.get<ApiResponse<Question>>(`/api/question/${questionId}`);
  },

  // 普通用户查自己的提问
  getSelfQuestionPage: (username: string, keyword?: string, pageNum: number, pageSize: number) => {
    return request.get<ApiResponse<PageResponse<Question>>>('/api/question/user/list', {
      params: { username, keyword, pageNum, pageSize },
    });
  },
  //提问者更改提问内容
  updateQuestion: (data: { questionId: number; title: string; plantName: string; question: string }) => {
    return request.put<ApiResponse<null>>('/api/question/update', data);
  },
  // 专家回答向自己提问的问题（按你的格式补充）
  answerQuestion: (fullQuestion: Question )=> {
    return request.post<ApiResponse<null>>('/api/question/expert/answer', fullQuestion);
  },

  updateAnswer: (data: { params: { questionId: number; answer: string } }) => {
    return request.put<ApiResponse<null>>('/api/question/expert/updateAnswer', data);
  },
  // 删除提问
  deleteQuestion: (questionId: number) => request.delete(`/api/question/delete/${questionId}`),

  // 通用更新问题状态（用户取消/专家拒绝等）
  updateQuestionStatus: (params: { questionId: number; statusType: string }) => {
    return request({
      url: '/api/question/update-status', // 对应后端接口路径
      method: 'PUT', // 后端用 @PutMapping，这里必须匹配
      data: params, // PUT请求用data传参（JSON体）
    });
  },
};

// 线下预约接口
export const appointmentApi = {
  // 提交预约申请
  addAppointment: (data: any) => request.post('/api/appointment/add', data),

  //获取某条预约记录
  getAppointmentDetail: (appointId: number) => request.get(`/api/appointment/detail/${appointId}`),

  // 获取我的预约记录（分页）
  getSelfAppointmentPage: (userName: string, status: string, pageNum: number, pageSize: number) =>
    request.get(`/api/appointment/self/${userName}`, {
      params: { status, pageNum, pageSize }
    }),

  // 取消预约（更新状态）
  updateAppointmentStatus: (appointId: number, status: string) => {
    return request({
      url: `api/appointment/updateStatus/${appointId}`,
      method: 'post',
      params: { status } // 关键：传递status参数（GET/POST的query参数）
      // 若后端要求用body传递，改为：
      // data: { status }
    });
  },

  // 获取专家预约记录（分页）
  getExpertAppointmentPage: (params: {
    expertUsername: string;
    searchKeys?: string;
    status?: string;
    pageNum: number;
    pageSize: number;
  }) => {
    return request.get(`/api/appointment/expert/${params.expertUsername}`, {
      params: {
        searchKeys: params.searchKeys,
        status: params.status,
        pageNum: params.pageNum,
        pageSize: params.pageSize
      }
    });
  },

  replyAppointment: (appointId: number, data: { replyContent: string; expertName: string }) =>
    request.post(`/api/appointment/reply/${appointId}`, data)
};
// ------------------------- 讨论模块接口 -------------------------
export const discussApi = {
  // 获取知识的讨论列表
  getDiscussList: (knowledgeId: number,pageNum: number, pageSize: number) => {
    return request.get<ApiResponse<PageResponse<Discuss>>>(`/api/discuss/${knowledgeId}`,{
      params: {pageNum, pageSize }}
    );
  },

  // 发布讨论
  postDiscuss: (data: { knowledgeId: number; ownName:string,content: string }) => {
    return request.post<ApiResponse<null>>('/api/discuss/createDiscuss', data);
  },
  // 修改讨论
  updateDiscuss: (data: { discussId: number; content: string }) => {
    return request.put<ApiResponse<null>>('/api/discuss/update', data);
  },
  // 删除讨论
  deleteDiscuss: (id: number) => {
    return request.delete<ApiResponse<null>>(`/api/discuss/delete/${id}`);

  },
};
// （可选）全局请求拦截器（如需携带 Token 等认证信息）
service.interceptors.request.use(
  (config) => {
    // 示例：从本地存储获取 Token 并添加到请求头
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
// 请求拦截：自动附加 Authorization: Bearer <token>
axios.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers = config.headers || {}
      ;(config.headers as any)['Authorization'] = `Bearer ${token}`
    }
  } catch {}
  return config
})

// 响应拦截：捕获未授权并跳转登录
axios.interceptors.response.use(
  (resp) => {
    const data = resp?.data
    if (data && typeof data === 'object' && data.code === 401) {
      try { localStorage.removeItem('auth_token') } catch {}
      // 简单跳转到登录页
      if (location.pathname !== '/login') location.href = '/login'
    }
    return resp
  },
  (error) => {
    const status = error?.response?.status
    if (status === 401) {
      try { localStorage.removeItem('auth_token') } catch {}
      if (location.pathname !== '/login') location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// 银行用户相关接口
export const bankUserApi = {
  getRandom10BankUsers: () => {
    return request.get('/api/bank/user/random10');
  },
  searchFarmers: (params) => request({
    url: '/api/bank/searchFarmers',  // 与后端 @GetMapping 路径一致
    method: 'get',
    params: params  // params 会自动拼接为 URL 参数（?keyword=xxx）
  }),
};

// 融资相关接口
export const financeApi = {
  // 根据用户名获取银行ID（三表联查）
  getBankIdByUserName: (userName: string) => {
    return request.get('/api/bank/get-id-by-user', {
      params: { userName }
    });
  },
  // 提交融资申请（写入tb_finance）
  submitFinance: (financeData: any) => {
    return request.post('/api/finance/submit', financeData);
  }
};
