/**
 * 认证调试工具
 * 在浏览器控制台使用: window.authDebug
 */

export const authDebug = {
  // 检查localStorage中的认证信息
  checkStorage() {
    console.log('=== Auth Storage ===');
    console.log('Token:', localStorage.getItem('web3_auth_token'));
    console.log('User:', localStorage.getItem('web3_auth_user'));
    console.log('Wallet:', localStorage.getItem('web3_wallet_address'));
  },

  // 清除所有认证信息
  clearAll() {
    console.log('=== Clearing All Auth Data ===');
    localStorage.removeItem('web3_auth_token');
    localStorage.removeItem('web3_auth_user');
    localStorage.removeItem('web3_wallet_address');
    console.log('✅ Cleared. Reload page to test fresh login.');
  },

  // 检查token是否有效
  checkToken() {
    const token = localStorage.getItem('web3_auth_token');
    if (!token) {
      console.log('❌ No token found');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      const isValid = payload.exp > now;
      
      console.log('=== Token Info ===');
      console.log('Valid:', isValid);
      console.log('Expires:', new Date(payload.exp * 1000).toLocaleString());
      console.log('Time until expiry:', Math.floor((payload.exp - now) / 60), 'minutes');
      console.log('Payload:', payload);
    } catch (error) {
      console.error('❌ Failed to parse token:', error);
    }
  },

  // 模拟token过期
  expireToken() {
    const token = localStorage.getItem('web3_auth_token');
    if (!token) {
      console.log('❌ No token found');
      return;
    }

    try {
      const parts = token.split('.');
      const payload = JSON.parse(atob(parts[1]));
      payload.exp = Math.floor(Date.now() / 1000) - 1; // 设置为已过期
      
      const newToken = parts[0] + '.' + btoa(JSON.stringify(payload)) + '.' + parts[2];
      localStorage.setItem('web3_auth_token', newToken);
      
      console.log('✅ Token expired. Reload page to test token refresh.');
    } catch (error) {
      console.error('❌ Failed to expire token:', error);
    }
  },

  // 显示帮助
  help() {
    console.log(`
=== Auth Debug Commands ===

authDebug.checkStorage()  - 检查localStorage中的认证信息
authDebug.clearAll()       - 清除所有认证信息
authDebug.checkToken()     - 检查token是否有效
authDebug.expireToken()    - 模拟token过期
authDebug.help()           - 显示此帮助信息

=== 测试场景 ===

1. 测试首次登录:
   authDebug.clearAll()
   然后刷新页面并连接钱包

2. 测试token刷新:
   authDebug.expireToken()
   然后刷新页面

3. 检查当前状态:
   authDebug.checkStorage()
   authDebug.checkToken()
    `);
  }
};

// 在开发环境下暴露到window对象
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).authDebug = authDebug;
  console.log('🔧 Auth debug tools loaded. Type "authDebug.help()" for commands.');
}
