# 工作流所有权和权限管理实现任务

- [x] 1. 数据库Schema更新和迁移
  - 为users表添加role和is_test_user字段
  - 创建audit_logs表用于记录操作日志
  - 创建必要的索引优化查询性能
  - 编写数据迁移脚本标记现有测试用户
  - _Requirements: 1.1, 1.2, 5.1, 5.2, 10.1_

- [x] 2. 实现Permission Service核心逻辑
  - [x] 2.1 创建PermissionService类和接口定义
    - 定义UserRole枚举（user/admin/test）
    - 定义Permission接口和权限规则
    - 实现基础的权限检查方法
    - _Requirements: 2.1, 2.2, 4.1_
  
  - [x] 2.2 实现所有权验证方法
    - 实现canAccessWorkflow检查用户是否可以访问工作流
    - 实现canModifyWorkflow检查用户是否可以修改工作流
    - 实现canDeleteWorkflow检查用户是否可以删除工作流
    - 实现canExecuteWorkflow检查用户是否可以执行工作流
    - _Requirements: 2.2, 2.3, 2.4, 2.5_
  
  - [x] 2.3 实现角色检查方法
    - 实现isAdmin检查用户是否为管理员
    - 实现isTestUser检查用户是否为测试用户
    - 实现getUserRole获取用户角色
    - _Requirements: 4.1, 4.2, 5.1_
  
  - [ ]* 2.4 编写PermissionService单元测试
    - 测试所有者权限验证
    - 测试管理员权限验证
    - 测试非所有者权限拒绝
    - 测试角色检查功能
    - _Requirements: 2.1, 2.2, 4.1_

- [x] 3. 实现Audit Service审计日志
  - [x] 3.1 创建AuditService类和接口
    - 定义AuditLogEntry和AuditLog接口
    - 实现logAction方法记录操作
    - 实现getAuditLogs查询日志
    - 实现getResourceHistory获取资源历史
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [x] 3.2 集成审计日志到工作流操作
    - 在创建工作流时记录日志
    - 在修改工作流时记录日志和变更内容
    - 在删除工作流时记录日志
    - 在管理员操作时特别标记
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [ ]* 3.3 编写AuditService单元测试
    - 测试日志记录功能
    - 测试日志查询功能
    - 测试日志过滤功能
    - _Requirements: 8.1, 8.5_

- [x] 4. 增强User Service
  - [x] 4.1 添加角色管理方法
    - 实现getUserById通过ID查询用户
    - 实现setUserRole设置用户角色
    - 实现isAdmin检查管理员权限
    - 实现getAdminUsers获取所有管理员
    - _Requirements: 1.1, 1.2, 4.1, 4.2_
  
  - [x] 4.2 更新User接口和类型定义
    - 在User接口中添加role字段
    - 在User接口中添加isTestUser字段
    - 更新createUser方法支持角色设置
    - _Requirements: 1.1, 5.1_
  
  - [ ]* 4.3 编写UserService单元测试
    - 测试角色设置功能
    - 测试管理员检查功能
    - 测试用户查询功能
    - _Requirements: 1.1, 4.1_

- [x] 5. 实现权限中间件
  - [x] 5.1 创建authMiddleware认证中间件
    - 验证JWT token有效性
    - 从token中提取用户ID
    - 将用户信息附加到request对象
    - 处理token过期和无效情况
    - _Requirements: 6.1, 6.6, 9.4, 9.5_
  
  - [x] 5.2 创建permissionMiddleware权限中间件
    - 接收资源类型和操作类型参数
    - 调用PermissionService检查权限
    - 返回403错误当权限不足时
    - 记录权限检查失败的日志
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 6.2, 6.3, 6.4_
  
  - [ ]* 5.3 编写中间件集成测试
    - 测试认证中间件token验证
    - 测试权限中间件权限检查
    - 测试错误处理流程
    - _Requirements: 6.1, 6.2, 9.1, 9.2, 9.3_

- [x] 6. 更新Workflow Service
  - [x] 6.1 修改listWorkflows支持权限过滤
    - 添加createdBy过滤参数
    - 添加excludeTestData过滤参数
    - 管理员可以查看所有工作流
    - 普通用户只能查看自己的工作流
    - _Requirements: 2.2, 4.2, 4.3, 5.1, 5.2_
  
  - [x] 6.2 实现deleteWorkflow方法
    - 验证工作流存在性
    - 检查工作流是否正在执行
    - 删除工作流及相关数据
    - 返回删除结果
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 6.3 更新updateWorkflow添加权限验证
    - 在更新前验证用户权限
    - 记录更新操作到审计日志
    - 处理权限不足的情况
    - _Requirements: 2.3, 8.2_
  
  - [ ]* 6.4 编写WorkflowService集成测试
    - 测试权限过滤功能
    - 测试删除工作流功能
    - 测试管理员和普通用户的不同行为
    - _Requirements: 2.2, 3.1, 4.2_

- [x] 7. 更新API路由
  - [x] 7.1 添加DELETE /api/workflows/:id路由
    - 添加authMiddleware认证
    - 添加permissionMiddleware权限检查
    - 调用workflowService.deleteWorkflow
    - 记录审计日志
    - 返回成功或错误响应
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 7.2 更新GET /api/workflows路由
    - 添加authMiddleware认证
    - 根据用户角色过滤工作流
    - 管理员可以看到所有工作流
    - 普通用户只看自己的工作流
    - _Requirements: 2.2, 4.2, 4.3, 5.1, 5.2_
  
  - [x] 7.3 更新PUT /api/workflows/:id路由
    - 添加permissionMiddleware权限检查
    - 记录更新操作到审计日志
    - 返回更新后的工作流
    - _Requirements: 2.3, 8.2_
  
  - [x] 7.4 限制或移除公共API端点
    - 移除POST /api/public/workflows创建端点
    - 移除PUT /api/public/workflows/:id更新端点
    - 移除DELETE /api/public/workflows/:id删除端点
    - 保留GET端点但添加速率限制
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [ ]* 7.5 编写API路由集成测试
    - 测试DELETE路由权限验证
    - 测试GET路由数据过滤
    - 测试PUT路由权限验证
    - 测试公共API限制
    - _Requirements: 3.1, 6.1, 6.2_

- [x] 8. 更新前端API客户端
  - [x] 8.1 添加delete方法到WorkflowAPI
    - 实现DELETE请求
    - 处理权限错误
    - 返回成功或抛出错误
    - _Requirements: 3.1, 3.5, 9.1, 9.2, 9.3_
  
  - [x] 8.2 更新list方法支持权限过滤
    - 自动根据用户角色过滤
    - 处理管理员和普通用户的不同响应
    - _Requirements: 2.2, 4.2_
  
  - [x] 8.3 添加错误处理和用户提示
    - 处理401未认证错误
    - 处理403权限不足错误
    - 显示友好的错误消息
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 9. 实现前端权限上下文
  - [ ] 9.1 创建usePermissions Hook
    - 实现canDelete检查删除权限
    - 实现canEdit检查编辑权限
    - 实现canExecute检查执行权限
    - 提供isAdmin和currentUserId
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 4.1_
  
  - [ ] 9.2 创建PermissionGuard组件
    - 根据权限显示或隐藏UI元素
    - 支持多种权限检查模式
    - 提供fallback UI
    - _Requirements: 2.2, 2.3, 2.4_

- [ ] 10. 更新工作流列表页面
  - [ ] 10.1 添加删除按钮和确认对话框
    - 只对有权限的工作流显示删除按钮
    - 点击删除时显示确认对话框
    - 调用API删除工作流
    - 更新列表移除已删除的工作流
    - _Requirements: 3.1, 3.2, 3.5_
  
  - [ ] 10.2 添加所有者信息显示（管理员）
    - 管理员可以看到工作流所有者
    - 显示所有者的钱包地址
    - 标记管理员操作的工作流
    - _Requirements: 4.3, 4.4_
  
  - [ ] 10.3 优化权限错误提示
    - 显示清晰的权限错误消息
    - 提供解决方案建议
    - 区分不同类型的权限错误
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 11. 更新工作流创建页面
  - [ ] 11.1 确保创建时记录正确的用户ID
    - 从认证上下文获取用户ID
    - 在API请求中包含用户ID
    - 验证用户已认证
    - _Requirements: 1.1, 1.2, 2.1, 9.5_
  
  - [ ] 11.2 添加权限检查和错误处理
    - 检查用户是否已登录
    - 处理创建失败的情况
    - 显示友好的错误消息
    - _Requirements: 6.1, 9.4, 9.5_

- [x] 12. 数据库迁移和测试数据处理
  - [x] 12.1 执行数据库迁移脚本
    - 添加role和is_test_user字段
    - 创建audit_logs表
    - 创建必要的索引
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [x] 12.2 标记和隔离测试数据
    - 标记测试用户（id: 00000000-0000-0000-0000-000000000001）
    - 更新测试用户的role为'test'
    - 设置is_test_user为true
    - _Requirements: 5.1, 5.2, 5.3, 10.1_
  
  - [x] 12.3 设置管理员账户
    - 创建或指定管理员账户
    - 设置管理员的role为'admin'
    - 验证管理员权限
    - _Requirements: 4.1, 4.2, 10.1_
  
  - [x] 12.4 验证数据完整性
    - 检查所有工作流都有有效的created_by
    - 检查所有用户都有有效的role
    - 生成迁移报告
    - _Requirements: 10.4, 10.5_

- [ ] 13. 端到端测试
  - [ ]* 13.1 测试完整的权限流程
    - 测试用户创建工作流
    - 测试用户删除自己的工作流
    - 测试用户无法删除他人的工作流
    - 测试管理员可以删除任何工作流
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 4.2_
  
  - [ ]* 13.2 测试数据隔离
    - 测试普通用户只看到自己的工作流
    - 测试管理员可以看到所有工作流
    - 测试测试数据不显示给普通用户
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ]* 13.3 测试审计日志
    - 测试操作被正确记录
    - 测试管理员操作被特别标记
    - 测试日志查询功能
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 14. 文档和部署
  - [ ] 14.1 更新API文档
    - 记录新的DELETE端点
    - 记录权限要求
    - 记录错误响应格式
    - _Requirements: 3.1, 6.1, 9.1_
  
  - [ ] 14.2 更新用户文档
    - 说明权限系统工作原理
    - 说明如何删除工作流
    - 说明管理员功能
    - _Requirements: 2.1, 3.1, 4.1_
  
  - [ ] 14.3 创建部署检查清单
    - 列出所有迁移步骤
    - 列出验证步骤
    - 列出回滚计划
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
