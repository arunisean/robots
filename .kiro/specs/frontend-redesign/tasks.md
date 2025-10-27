# Implementation Plan

- [x] 1. 设置项目依赖和配置




  - 安装React Query (@tanstack/react-query)
  - 安装recharts图表库
  - 配置TypeScript类型定义
  - _Requirements: 6.1, 6.2, 8.2_







- [x] 2. 创建类型定义和API服务层

  - [x] 2.1 创建策略相关类型定义

    - 在 `packages/frontend/src/types/strategy.ts` 创建 StrategyTemplate, StrategyInstance, Trade, PerformanceMetrics 接口


    - 导出所有类型供其他模块使用


    - _Requirements: 6.5_




  

  - [ ] 2.2 创建错误类型定义
    - 在 `packages/frontend/src/types/errors.ts` 创建 APIError, ValidationError, AuthenticationError 类
    - _Requirements: 6.3_

  


  - [ ] 2.3 实现策略模板API服务
    - 在 `packages/frontend/src/services/strategyAPI.ts` 创建 strategyTemplateAPI
    - 实现 list(), getById(), instantiate() 方法
    - 添加认证令牌和错误处理




    - _Requirements: 6.1, 6.4_


  
  - [x] 2.4 实现策略实例API服务


    - 在同一文件创建 strategyInstanceAPI


    - 实现 list(), getById(), start(), stop(), delete(), getTrades(), getMetrics() 方法
    - _Requirements: 6.2, 6.4_

- [-] 3. 创建React Query hooks






  - [ ] 3.1 创建策略模板hooks
    - 在 `packages/frontend/src/hooks/useStrategyTemplates.ts` 创建 useStrategyTemplates 和 useStrategyTemplate hooks
    - 配置缓存策略（5分钟staleTime）



    - _Requirements: 8.2_
  


  - [x] 3.2 创建策略实例hooks

    - 在 `packages/frontend/src/hooks/useStrategyInstances.ts` 创建 useStrategyInstances, useStrategyInstance hooks
    - 实现自动轮询（运行中的策略每5秒刷新）
    - 创建 useStopStrategy 和 useDeleteStrategy mutation hooks
    - _Requirements: 2.3, 8.2_

- [x] 4. 创建核心UI组件

  - [ ] 4.1 创建StrategyCard组件
    - 在 `packages/frontend/src/components/StrategyCard.tsx` 创建组件
    - 显示策略名称、描述、难度、性能指标、风险档案
    - 实现难度和风险等级的颜色编码
    - 添加"配置并启动"按钮
    - _Requirements: 1.1_
  
  - [ ] 4.2 创建StrategyConfigModal组件
    - 在 `packages/frontend/src/components/StrategyConfigModal.tsx` 创建模态框组件
    - 动态生成参数表单（基于template.parameters）
    - 实现实时参数验证（最小值、最大值、必填）
    - 显示纸上交易模式提示
    - 添加取消和启动按钮
    - _Requirements: 1.2, 1.3, 1.4, 1.5_
  
  - [ ] 4.3 创建StrategyInstanceCard组件
    - 在 `packages/frontend/src/components/StrategyInstanceCard.tsx` 创建组件
    - 显示实例名称、状态、统计数据（总交易数、胜率、总盈亏）
    - 实现状态和盈亏的颜色编码
    - 添加查看详情、停止、删除按钮
    - _Requirements: 2.1, 2.4, 2.5_
  
  - [ ] 4.4 创建PerformanceChart组件
    - 在 `packages/frontend/src/components/PerformanceChart.tsx` 创建图表组件
    - 使用recharts绘制折线图
    - 支持三种图表类型：权益曲线、盈亏曲线、交易量




    - 实现响应式设计
    - _Requirements: 2.2_
  
  - [ ] 4.5 创建TradeHistory组件
    - 在 `packages/frontend/src/components/TradeHistory.tsx` 创建表格组件
    - 显示交易记录（时间、交易对、方向、数量、价格、盈亏、状态）
    - 实现分页控制
    - _Requirements: 2.2_
  
  - [ ] 4.6 创建ErrorBoundary组件
    - 在 `packages/frontend/src/components/ErrorBoundary.tsx` 创建错误边界组件
    - 捕获组件树中的错误并显示友好的错误页面






    - 添加重新加载按钮
    - _Requirements: 6.3_



- [ ] 5. 更新导航和布局组件
  - [ ] 5.1 更新Navbar组件
    - 修改 `packages/frontend/src/components/Navbar.tsx`

    - 更新菜单项：首页、策略库、我的仪表板、帮助
    - 移除旧的工作流和agent-types链接
    - 实现当前页面高亮
    - 添加移动端汉堡菜单（响应式）

    - _Requirements: 4.1, 4.2, 4.3, 4.4, 7.4_

  
  - [ ] 5.2 更新Layout组件
    - 修改 `packages/frontend/src/components/Layout.tsx`
    - 更新页面标题和描述
    - 集成ErrorBoundary
    - _Requirements: 3.1_

- [x] 6. 创建策略库页面

  - [ ] 6.1 重构StrategiesPage
    - 修改 `packages/frontend/src/pages/strategies.tsx`

    - 使用 useStrategyTemplates hook获取数据
    - 实现策略卡片网格布局（响应式：移动1列、平板2列、桌面3列）
    - 集成StrategyCard和StrategyConfigModal组件
    - 添加加载和错误状态
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.1, 7.2, 7.3_



- [x] 7. 创建交易仪表板页面

  - [ ] 7.1 创建DashboardPage
    - 在 `packages/frontend/src/pages/dashboard.tsx` 创建新页面
    - 使用 useStrategyInstances hook获取用户的策略实例
    - 显示实例卡片网格（响应式布局）
    - 实现筛选（状态、纸上交易）
    - 添加空状态（无策略时显示）
    - _Requirements: 2.1, 2.3, 2.4, 7.1, 7.2, 7.3_
  
  - [x] 7.2 创建策略详情页面




    - 在 `packages/frontend/src/pages/dashboard/[instanceId].tsx` 创建动态路由页面
    - 使用 useStrategyInstance hook获取实例详情



    - 显示实例信息、性能指标、图表
    - 集成PerformanceChart和TradeHistory组件
    - 添加启动/停止/删除操作



    - _Requirements: 2.2, 2.3, 2.4, 2.5_



- [-] 8. 重新设计主页

  - [ ] 8.1 更新HomePage
    - 修改 `packages/frontend/pages/index.tsx`
    - 更新标题为"Web3交易自动化平台"
    - 展示3个核心功能卡片：策略模板、一键启动、风险控制
    - 根据钱包连接状态显示不同的行动号召
    - 添加平台统计数据（可用策略数、活跃用户数）
    - 移除旧的agent-types相关内容
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 9. 配置React Query Provider
  - [ ] 9.1 更新_app.tsx
    - 修改 `packages/frontend/pages/_app.tsx`
    - 添加QueryClientProvider包裹应用
    - 配置默认查询选项（staleTime, cacheTime, retry）
    - 保留WalletProvider
    - _Requirements: 8.2_

- [ ] 10. 移除旧的工作流相关代码
  - [ ] 10.1 删除工作流页面
    - 删除 `packages/frontend/src/pages/workflows/` 目录及所有文件
    - 删除 `packages/frontend/src/pages/executions/` 目录及所有文件
    - _Requirements: 5.1_
  
  - [ ] 10.2 删除agent-types页面
    - 删除 `packages/frontend/src/pages/agent-types/` 目录及所有文件
    - _Requirements: 5.2_
  
  - [ ] 10.3 删除相关组件
    - 删除 `packages/frontend/src/components/WorkflowExecutionMonitor.tsx`
    - 删除 `packages/frontend/src/components/agent-config/` 目录
    - 删除 `packages/frontend/src/components/agent-types/` 目录
    - _Requirements: 5.3, 5.4_
  
  - [ ] 10.4 清理API服务
    - 从 `packages/frontend/src/lib/api.ts` 移除 workflowAPI 和 executionAPI
    - 或者重命名文件为 `legacyAPI.ts` 并标记为废弃（如果后端仍需要）
    - _Requirements: 5.5_
  
  - [ ] 10.5 更新所有内部链接
    - 搜索并移除所有指向 /workflows 和 /agent-types 的链接
    - 更新导航菜单
    - 更新重定向规则（如有）
    - _Requirements: 5.5_

- [ ] 11. 响应式设计优化
  - [ ] 11.1 实现移动端布局
    - 确保所有页面在移动设备上使用单列布局
    - 实现汉堡菜单导航
    - 确保触摸目标至少44x44px
    - 测试模态框在移动端的全屏显示
    - _Requirements: 7.1, 7.4, 7.5_
  
  - [ ] 11.2 实现平板和桌面布局
    - 平板设备使用双列布局
    - 桌面设备使用三列布局
    - 测试所有断点的布局切换
    - _Requirements: 7.2, 7.3_

- [ ] 12. 性能优化
  - [ ] 12.1 实现代码分割
    - 使用Next.js动态导入懒加载PerformanceChart组件
    - 懒加载StrategyConfigModal组件
    - 配置loading状态
    - _Requirements: 8.1, 8.2_
  
  - [ ] 12.2 优化数据获取
    - 配置策略库页面使用SSG或ISR
    - 实现React Query缓存策略
    - 添加预取（prefetch）关键数据
    - _Requirements: 8.1, 8.2, 8.5_
  
  - [ ] 12.3 实现懒加载
    - 策略卡片列表实现虚拟滚动或分页
    - 图片使用Next.js Image组件优化
    - _Requirements: 8.3, 8.4_

- [ ]* 13. 测试
  - [ ]* 13.1 编写组件单元测试
    - 测试StrategyCard渲染和交互
    - 测试StrategyConfigModal参数验证
    - 测试StrategyInstanceCard状态显示
    - _Requirements: All_
  
  - [ ]* 13.2 编写API服务测试
    - 测试strategyTemplateAPI方法
    - 测试strategyInstanceAPI方法
    - 测试错误处理
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [ ]* 13.3 编写集成测试
    - 测试策略库页面完整流程
    - 测试仪表板页面操作
    - 测试页面导航
    - _Requirements: All_

- [ ] 14. 文档和清理
  - [ ] 14.1 更新README
    - 更新项目描述为"Web3交易自动化平台"
    - 更新功能列表
    - 更新开发指南
    - _Requirements: All_
  
  - [ ] 14.2 清理未使用的依赖
    - 检查并移除未使用的npm包
    - 更新package.json
    - _Requirements: 8.4_
  
  - [ ] 14.3 代码审查和重构
    - 检查代码质量和一致性
    - 移除console.log和调试代码
    - 优化导入语句
    - _Requirements: All_
