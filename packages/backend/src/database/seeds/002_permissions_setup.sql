-- Permissions and Audit Setup Seed Data
-- This file sets up initial permissions, roles, and audit logs

-- 1. 更新测试用户的角色和标记
UPDATE users 
SET 
  role = 'test',
  is_test_user = TRUE
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 2. 创建一个管理员用户（示例）
-- 注意：在生产环境中，应该通过安全的方式设置管理员
INSERT INTO users (id, wallet_address, role, is_test_user, preferences, profile) VALUES
(
  '00000000-0000-0000-0000-000000000002',
  '0xADMIN1234567890123456789012345678901234',
  'admin',
  FALSE,
  '{
    "theme": "dark",
    "notifications": {
      "email": true,
      "browser": true
    },
    "language": "en"
  }',
  '{
    "displayName": "Admin User",
    "bio": "Platform administrator",
    "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=admin"
  }'
)
ON CONFLICT (wallet_address) DO UPDATE SET
  role = 'admin',
  is_test_user = FALSE;

-- 3. 创建一些示例审计日志
INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, created_at) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  'create',
  'workflow',
  '10000000-0000-0000-0000-000000000001',
  '{
    "workflowName": "Tech News to Twitter",
    "version": "1.0.0"
  }',
  '127.0.0.1',
  NOW() - INTERVAL '1 day'
),
(
  '00000000-0000-0000-0000-000000000001',
  'execute',
  'workflow',
  '10000000-0000-0000-0000-000000000001',
  '{
    "executionId": "20000000-0000-0000-0000-000000000001",
    "triggerType": "manual"
  }',
  '127.0.0.1',
  NOW() - INTERVAL '2 hours'
),
(
  '00000000-0000-0000-0000-000000000001',
  'execute',
  'workflow',
  '10000000-0000-0000-0000-000000000001',
  '{
    "executionId": "20000000-0000-0000-0000-000000000002",
    "triggerType": "manual"
  }',
  '127.0.0.1',
  NOW() - INTERVAL '1 hour'
),
(
  '00000000-0000-0000-0000-000000000001',
  'execute',
  'workflow',
  '10000000-0000-0000-0000-000000000001',
  '{
    "executionId": "20000000-0000-0000-0000-000000000003",
    "triggerType": "manual",
    "status": "failed"
  }',
  '127.0.0.1',
  NOW() - INTERVAL '30 minutes'
),
(
  '00000000-0000-0000-0000-000000000001',
  'create',
  'workflow',
  '10000000-0000-0000-0000-000000000002',
  '{
    "workflowName": "RSS to Website",
    "version": "1.0.0"
  }',
  '127.0.0.1',
  NOW() - INTERVAL '12 hours'
);

-- 4. 验证数据
DO $$
DECLARE
  v_test_user_count INTEGER;
  v_admin_user_count INTEGER;
  v_workflows_with_owner INTEGER;
  v_audit_log_count INTEGER;
BEGIN
  -- 检查测试用户
  SELECT COUNT(*) INTO v_test_user_count 
  FROM users WHERE is_test_user = TRUE;
  
  RAISE NOTICE '测试用户数量: %', v_test_user_count;
  
  -- 检查管理员用户
  SELECT COUNT(*) INTO v_admin_user_count 
  FROM users WHERE role = 'admin';
  
  RAISE NOTICE '管理员用户数量: %', v_admin_user_count;
  
  -- 检查工作流所有者
  SELECT COUNT(*) INTO v_workflows_with_owner 
  FROM workflows WHERE owner_id IS NOT NULL;
  
  RAISE NOTICE '有所有者的工作流数量: %', v_workflows_with_owner;
  
  -- 检查审计日志
  SELECT COUNT(*) INTO v_audit_log_count 
  FROM audit_logs;
  
  RAISE NOTICE '审计日志数量: %', v_audit_log_count;
  
  -- 警告：如果没有管理员
  IF v_admin_user_count = 0 THEN
    RAISE WARNING '警告：系统中没有管理员用户！';
  END IF;
END $$;

-- 5. 添加一些注释说明
COMMENT ON TABLE users IS '用户表 - 包含角色和测试用户标记';
COMMENT ON TABLE audit_logs IS '审计日志表 - 记录所有用户操作';

-- 6. 显示权限设置摘要
SELECT 
  '权限设置完成' as status,
  (SELECT COUNT(*) FROM users WHERE role = 'admin') as admin_count,
  (SELECT COUNT(*) FROM users WHERE role = 'user') as user_count,
  (SELECT COUNT(*) FROM users WHERE role = 'test') as test_count,
  (SELECT COUNT(*) FROM audit_logs) as audit_log_count;
