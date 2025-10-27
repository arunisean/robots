# 认证流程测试指南

## 修复内容

### 1. useAuth Hook
- ✅ 完全禁用自动登出逻辑
- ✅ 添加 `loginInProgressRef` 防止重复登录
- ✅ 如果已经有登录在进行中，返回同一个Promise
- ✅ 如果已经认证，直接返回成功

### 2. WalletConnectButton
- ✅ 添加 `loginAttempted` 状态防止重复登录
- ✅ 只在未尝试过登录时才触发自动登录
- ✅ 登录失败后重置状态允许重试

### 3. WalletProvider
- ✅ 已经移除了自动登录逻辑
- ✅ 只负责网络检查和状态监听

## 测试步骤

### 测试1: 首次连接和登录
1. 打开浏览器，清除所有localStorage
2. 访问应用首页
3. 点击 "Connect Wallet"
4. 选择MetaMask
5. 批准连接
6. **预期**: 只弹出一次签名请求
7. 签名后应该成功登录

### 测试2: 刷新页面保持登录
1. 在已登录状态下刷新页面
2. **预期**: 
   - 不弹出签名请求
   - 自动恢复登录状态
   - 不会自动登出

### 测试3: 切换页面
1. 在已登录状态下访问不同页面（Dashboard, Strategies等）
2. **预期**:
   - 保持登录状态
   - 不弹出签名请求
   - 不会自动登出

### 测试4: 手动断开钱包
1. 在已登录状态下，从MetaMask断开连接
2. **预期**:
   - 应用显示未连接状态
   - 不会自动尝试重新连接
   - 不会弹出签名请求

### 测试5: 重新连接
1. 断开后重新点击 "Connect Wallet"
2. **预期**:
   - 只弹出一次签名请求
   - 成功登录

## 调试日志

查看浏览器控制台，应该看到以下日志：

```
🔐 Login function called
- isAuthenticating: false
- wallet.isConnected: true
- wallet.address: 0x...
- effective address: 0x...
🔐 Setting auth state to authenticating...
🔐 Starting full login flow with address: 0x...
🔐 Getting nonce for address: 0x...
🔐 Nonce received, requesting signature...
🔐 Signature received, submitting authentication...
```

**不应该看到**:
- 重复的 "Login function called"
- "Login already in progress"（除非真的有重复调用）
- "Wallet disconnected while authenticated, logging out"

## 如果还有问题

检查以下内容：

1. **localStorage中的token**
   ```javascript
   localStorage.getItem('web3_auth_token')
   localStorage.getItem('web3_auth_user')
   ```

2. **authService状态**
   ```javascript
   // 在控制台
   authService.isAuthenticated()
   authService.getToken()
   authService.getCurrentUser()
   ```

3. **清除所有状态重新测试**
   ```javascript
   localStorage.clear()
   location.reload()
   ```
