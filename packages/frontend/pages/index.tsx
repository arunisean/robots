import React from 'react';
import Head from 'next/head';
import { WalletConnectButton } from '../src/components/WalletConnectButton';
import { WalletStatus, AuthGuard } from '../src/components/WalletProvider';

export default function Home() {
  return (
    <div>
      <Head>
        <title>多Agent自动化平台</title>
        <meta name="description" content="基于Web3身份认证的去中心化Agent编排系统" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gray-50">
        {/* 顶部状态栏 */}
        <div className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-bold text-gray-900">
                  🤖 多Agent自动化平台
                </h1>
                <WalletStatus showDetails />
              </div>
              <WalletConnectButton 
                showBalance 
                onConnected={(address) => console.log('钱包已连接:', address)}
                onError={(error) => console.error('钱包错误:', error)}
              />
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              基于Web3身份认证的去中心化Agent编排系统
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              连接您的Web3钱包，开始使用强大的Agent自动化功能
            </p>
            
            {/* Agent功能介绍 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-4">📊</div>
                <h3 className="text-lg font-semibold mb-2">Work Agents</h3>
                <p className="text-gray-600">数据采集和抓取</p>
                <ul className="text-sm text-gray-500 mt-2 text-left">
                  <li>• 网页内容抓取</li>
                  <li>• RSS数据收集</li>
                  <li>• API数据获取</li>
                </ul>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-4">⚙️</div>
                <h3 className="text-lg font-semibold mb-2">Process Agents</h3>
                <p className="text-gray-600">数据处理和转换</p>
                <ul className="text-sm text-gray-500 mt-2 text-left">
                  <li>• 文本处理分析</li>
                  <li>• AI内容生成</li>
                  <li>• 数据格式转换</li>
                </ul>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-4">📤</div>
                <h3 className="text-lg font-semibold mb-2">Publish Agents</h3>
                <p className="text-gray-600">内容发布和分发</p>
                <ul className="text-sm text-gray-500 mt-2 text-left">
                  <li>• 社交媒体发布</li>
                  <li>• 网站内容更新</li>
                  <li>• 多平台分发</li>
                </ul>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-4">🔍</div>
                <h3 className="text-lg font-semibold mb-2">Validate Agents</h3>
                <p className="text-gray-600">质量验证和监控</p>
                <ul className="text-sm text-gray-500 mt-2 text-left">
                  <li>• 性能监控</li>
                  <li>• 质量评估</li>
                  <li>• 安全检查</li>
                </ul>
              </div>
            </div>

            {/* 认证后的功能区域 */}
            <AuthGuard 
              requireWallet={true} 
              requireAuth={true}
              fallback={
                <div className="mt-12 p-8 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="text-xl font-semibold text-blue-900 mb-4">
                    开始使用多Agent自动化平台
                  </h3>
                  <p className="text-blue-700 mb-6">
                    请连接您的Web3钱包并完成身份认证，即可访问所有Agent功能
                  </p>
                  <div className="flex justify-center space-x-4">
                    <WalletConnectButton size="lg" />
                    <a
                      href="#"
                      className="inline-flex items-center px-6 py-3 text-lg font-medium text-blue-600 bg-white border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      查看文档
                    </a>
                  </div>
                </div>
              }
            >
              <div className="mt-12 p-8 bg-green-50 rounded-lg border border-green-200">
                <h3 className="text-xl font-semibold text-green-900 mb-4">
                  🎉 欢迎使用多Agent自动化平台！
                </h3>
                <p className="text-green-700 mb-6">
                  您已成功连接钱包并完成身份认证，现在可以开始创建和管理您的Agent了。
                </p>
                <div className="flex justify-center space-x-4">
                  <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">
                    创建第一个Agent
                  </button>
                  <button className="bg-white hover:bg-green-50 text-green-600 border border-green-600 font-bold py-3 px-6 rounded-lg transition-colors">
                    浏览Agent市场
                  </button>
                </div>
              </div>
            </AuthGuard>

            {/* 特性介绍 */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">去中心化身份</h3>
                <p className="text-gray-600">基于Web3钱包的安全身份认证，无需传统账号密码</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">自动化工作流</h3>
                <p className="text-gray-600">可视化编排Agent工作流，实现复杂的自动化任务</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Agent市场</h3>
                <p className="text-gray-600">丰富的预制Agent模板，快速部署各种自动化功能</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}