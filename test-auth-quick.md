# 快速测试认证修复

## 关键修复点

1. ✅ **删除了重复文件** - 这是导致两次签名的主要原因
2. ✅ **修复refresh token请求** - 添加了空body
3. ✅ **修复状态恢复逻辑** - 不再在token过期时清理状态
4. ✅ **WalletConnectButton从context获取auth** - 避免创建多个实例

## 快速测试步骤

### 1. 清理并重启
```bash
# 在浏览器控制台
authDebug.clearAll()

# 刷新页面
```

### 2. 测试首次登录
1. 点击 "Connect Wallet"
2. 选择MetaMask
3. 批准连接
4. **预期**: 只弹出一次签名请求 ✅
5. 签名后成功登录

### 3. 测试页面刷新
1. 刷新页面
2. **预期**: 
   - 自动恢复登录状态 ✅
   - 不弹出签名请求 ✅
   - 控制台显示: `🔐 Auth restored from storage`

### 4. 测试页面切换
1. 点击导航栏的 "Strategies"
2. 再点击 "Dashboard"
3. **预期**:
   - 保持登录状态 ✅
   - 不弹出签名请求 ✅

## 预期的控制台日志

### 首次登录
```
🔐 Login function called
- isAuthenticating: false
- wallet.isConnected: true
- wallet.address: 0x...
🔐 Setting auth state to authenticating...
🔐 Starting full login flow with address: 0x...
🔐 Getting nonce for address: 0x...
🔐 Nonce received, requesting signature...
🔐 Signature received, submitting authentication...
🔐 Auto login result: {success: true, ...}
```

### 页面刷新
```
🔐 Auth restored from storage: {user: "0x...", tokenValid: true}
🔐 Auth state: {isAuthenticated: true, walletConnected: true, walletAddress: "0x..."}
```

## 如果还有问题

1. **确认没有旧的构建缓存**
   ```bash
   # 停止前端服务器
   # 删除 .next 目录
   rm -rf packages/frontend/.next
   # 重新启动
   npm run dev
   ```

2. **检查是否还有重复文件**
   ```bash
   # 应该不存在这些文件
   ls packages/frontend/components/WalletConnectButton.tsx  # 应该报错
   ls packages/frontend/hooks/useAuth.ts  # 应该报错
   ```

3. **使用调试工具**
   ```javascript
   authDebug.checkStorage()  // 检查存储的数据
   authDebug.checkToken()    // 检查token状态
   ```

## 成功标志

- ✅ 只弹出一次签名请求
- ✅ 页面刷新后保持登录
- ✅ 切换页面保持登录
- ✅ 控制台没有refresh token错误
- ✅ 控制台没有重复的登录日志
