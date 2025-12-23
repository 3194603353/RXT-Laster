/**
 * 从本地存储获取当前登录用户的userName（兼容多种存储格式）
 */
export const getCurrentUserName = (): string | null => {
  // 优先读取 localStorage.user 中的 userName
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.userName && user.userName.trim()) {
        console.log('提取到的 userName:', user.userName);
        return user.userName.trim();
      }
    } catch (e) {
      console.error('解析 localStorage.user 失败:', e);
    }
  }

  // 补充读取 userInfo（若存在）
  const userInfoStr = localStorage.getItem('userInfo');
  if (userInfoStr) {
    try {
      const userInfo = JSON.parse(userInfoStr);
      if (userInfo.userName && userInfo.userName.trim()) {
        console.log('从 userInfo 提取到的 userName:', userInfo.userName);
        return userInfo.userName.trim();
      }
    } catch (e) {
      console.error('解析 localStorage.userInfo 失败:', e);
    }
  }

  console.warn('未提取到有效的 userName');
  return null;
};
