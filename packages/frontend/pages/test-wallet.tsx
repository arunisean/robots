import React, { useState } from 'react';
import Head from 'next/head';
import { useWallet } from '../src/components/WalletProvider';
import { WalletConnectButton } from '../src/components/WalletConnectButton';
import { NetworkSwitcher } from '../src/components/WalletProvider';

export default function TestWallet() {
  const { wallet, auth, user, isInitialized, error } = useWallet();
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleConnected = (address: string) => {
    addLog(`钱包已连接: ${address}`);
  };

  const handleDisconnected = () => {
    addLog('钱包已断开连接');
  };

  const handleError = (error: string) => {
    addLog(`错误: ${error}`);
  };

  const testSignMessage = async () => {
    try {
      addLog('开始签名测试...');
      const message = `测试签名消息 - ${Date.now()}`;
      const signature = await wallet.signMessage(message);
      addLog(`签名成功: ${signature.slice(0, 20)}...`);
    } catch (error: any) {
      addLog(`签名失败: ${error.message}`);
    }
  };

  const testLogin = async () => {
    try {
      addLog('开始登录测试...');
      const result = await auth.login();
      if (result.success) {
        addLog('登录成功');
      } else {
        addLog(`登录失败: ${result.error}`);
      }
    } catch (error: any) {
      addLog(`登录异常: ${error.message}`);
    }
  };

  const testLogout = async () => {
    try {
      addLog('开始登出测试...');
      await auth.logout();
      addLog('登出成功');
    } catch (error: any) {
      addLog(`登出失败: ${error.message}`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div>
      <Head>
        <title>钱包集成测试 - 多Agent自动化平台</title>
      </Head>

      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            🧪 钱包集成测试页面
          </h1>

          {/* 状态面板 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* 钱包状态 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">钱包状态</h2>
              <div className="space-y-2 text-sm">
                <div>初始化状态: {isInitialized ? '✅ 已初始化' : '⏳ 初始化中'}</div>
                <div>连接状态: {wallet.wallet.isConnected ? '✅ 已连接' : '❌ 未连接'}</div>
                <div>连接中: {wallet.wallet.isConnecting ? '⏳ 连接中' : '✅ 空闲'}</div>
                <div>钱包地址: {wallet.wallet.address || '无'}</div>
                <div>网络ID: {wallet.wallet.chainId || '无'}</div>
                <div>余额: {wallet.wallet.balance || '无'}</div>
                <div>错误: {error || wallet.wallet.error?.message || '无'}</div>
              </div>
            </div>

            {/* 认证状态 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">认证状态</h2>
              <div className="space-y-2 text-sm">
                <div>认证状态: {auth.auth.isAuthenticated ? '✅ 已认证' : '❌ 未认证'}</div>
                <div>认证中: {auth.auth.isAuthenticating ? '⏳ 认证中' : '✅ 空闲'}</div>
                <div>用户ID: {user?.id || '无'}</div>
                <div>钱包地址: {user?.walletAddress || '无'}</div>
                <div>Token: {auth.auth.token ? '✅ 有效' : '❌ 无'}</div>
                <div>过期时间: {auth.auth.expiresAt?.toLocaleString() || '无'}</div>
                <div>认证错误: {auth.auth.error?.message || '无'}</div>
              </div>
            </div>
          </div>

          {/* 控制面板 */}
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-semibold mb-4">控制面板</h2>
            <div className="flex flex-wrap gap-4 mb-4">
              <WalletConnectButton
                onConnected={handleConnected}
                onDisconnected={handleDisconnected}
                onError={handleError}
                showBalance
              />
              
              <NetworkSwitcher supportedChains={[1, 11155111]} />
              
              <button
                onClick={testSignMessage}
                disabled={!wallet.wallet.isConnected}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
              >
                测试签名
              </button>
              
              <button
                onClick={testLogin}
                disabled={!wallet.wallet.isConnected || auth.auth.isAuthenticated}
                className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700"
              >
                测试登录
              </button>
              
              <button
                onClick={testLogout}
                disabled={!auth.auth.isAuthenticated}
                className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700"
              >
                测试登出
              </button>
              
              <button
                onClick={clearLogs}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                清空日志
              </button>
            </div>
          </div>

          {/* 日志面板 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">操作日志</h2>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500">暂无日志...</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 使用说明 */}
          <div className="mt-8 bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h2 className="text-xl font-semibold text-blue-900 mb-4">使用说明</h2>
            <ol className="list-decimal list-inside space-y-2 text-blue-800">
              <li>确保浏览器已安装MetaMask或其他Web3钱包</li>
              <li>点击"连接钱包"按钮连接您的钱包</li>
              <li>连接成功后，可以测试签名功能</li>
              <li>点击"测试登录"完成Web3身份认证</li>
              <li>认证成功后，您就可以使用平台的所有功能了</li>
              <li>使用"测试登出"可以清除认证状态</li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
}