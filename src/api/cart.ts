// src/api/cart.ts
import api from '../utils/api'

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000
});

// 请求拦截器：添加Token
api.interceptors.request.use(config => {
  const user = localStorage.getItem('user');
  if (user) {
    const { token } = JSON.parse(user); // 假设user中包含token字段
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;
// 打印基础URL配置
console.log('当前API基础URL:', api.defaults.baseURL);

/**
 * 添加商品到购物车
 */
export const addToCart = (productId: number, count: number) => {
  const url = '/api/cart';
  const data = { productId, count };

  console.log('🛒 添加购物车请求:', {
    url: api.defaults.baseURL + url,
    method: 'POST',
    data: data
  });

  return api.post(url, data)
    .then(response => {
      // 统一响应格式处理
      if (!response.data) {
        return { data: { code: -1, msg: '响应格式错误' } };
      }
      console.log('✅ 添加购物车成功:', response.data);
      return response;
    })
    .catch(error => {
      console.error('❌ 添加购物车失败详情:', {
        status: error.response?.status, //  HTTP状态码
        responseData: error.response?.data, // 后端返回的错误信息
        requestData: data // 请求参数
      });
      throw error;
    });
}

/**
 * 获取购物车列表
 */
export const getCartList = () => {
  const url = '/api/cart';
  console.log('🛒 获取购物车列表:', api.defaults.baseURL + url);

  return api.get(url)
    .then(response => {
      console.log('✅ 获取购物车成功:', response);
      return response;
    })
    .catch(error => {
      console.error('❌ 获取购物车失败:', {
        url: api.defaults.baseURL + url,
        error: error.message,
        response: error.response
      });
      throw error;
    });
}

// 其他函数保持不变...
export const updateCartCount = (shoppingId: number, count: number) => {
  return api.put(`/api/cart/${shoppingId}/count`, { count })
}

export const updateCartSelected = (shoppingId: number, selected: boolean) => {
  return api.put(`/api/cart/${shoppingId}/selected`, { selected })
}

export const deleteCartItem = (shoppingId: number) => {
  return api.delete(`/api/cart/${shoppingId}`)
}

export const clearCart = () => {
  return api.delete('/api/cart')
}
