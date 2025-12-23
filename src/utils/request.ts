// src/utils/request.ts
import axios from 'axios'; // 必须正确安装axios（npm install axios）
import { ElMessage } from 'element-plus'; // 导入Element Plus提示组件（已在项目中使用）

// 1. 创建axios实例（核心配置，未修改）
const service = axios.create({
  baseURL: 'http://localhost:8082', // 后端地址+端口（必须正确，否则请求发不出去）
  timeout: 5000, // 超时时间
  headers: {
    'Content-Type': 'application/json'
  }
});

// 2. 请求拦截器（未修改，保持原有Token携带逻辑）
service.interceptors.request.use(
  config => {
    // 若有token，添加到请求头（根据实际需求）
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    // 请求发出前的错误（极少发生）
    console.error('请求拦截器错误:', error);
    ElMessage.error('请求初始化失败，请刷新页面重试'); // 补充友好提示
    return Promise.reject(error);
  }
);

/// 3. 响应拦截器（修改错误分支判断顺序）
service.interceptors.response.use(
  response => {
    const res = response.data;
    if (res.code !== 200) {
      ElMessage.warning(res.msg || '后端处理失败');
      return Promise.reject(new Error(res.msg || '后端返回错误'));
    }
    return res;
  },
  error => {
    let errorMsg = '未知错误';
    if (error === undefined) {
      errorMsg = '请求未发出，可能是axios配置错误';
    } else if (error.response) {
      // 优先判断：有响应但状态码异常（401、404、500等）
      const status = error.response.status;
      errorMsg = `后端错误（${status}）: ${error.response.data?.msg || error.response.statusText || '接口异常'}`;

      // 401 Token失效/未授权特殊处理
      if (status === 401) {
        errorMsg = '登录已过期或未授权，请重新登录';
        localStorage.removeItem('auth_token');
        window.location.href = '/login'; // 跳转登录页
      }
    } else if (error.request) {
      // 其次判断：有请求但无响应（后端未启动、网络不通）
      errorMsg = '后端无响应，请检查后端是否启动或地址是否正确';
    } else {
      // 其他错误（请求被取消等）
      errorMsg = error.message || '请求失败';
    }

    ElMessage.error(errorMsg);
    console.error('接口错误:', errorMsg);
    return Promise.reject(new Error(errorMsg));
  }
);

export default service;
