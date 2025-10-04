-- 添加权限管理和审计日志功能
-- Migration 003: Add Permissions and Audit Logs

-- 1. 为users表添加角色和测试用户标记
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_test_user BOOLEAN DEFAULT FALSE;

-- 添加角色检查约束
ALTER TABLE users ADD CONSTRAINT check_user_role 
  CHECK (role IN ('user', 'admin', 'test'));

-- 创建角色索引
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_test_user ON users(is_test_user);

-- 2. 为workflows表添加created_by字段（如果使用owner_id则跳过）
-- workflows表已经有owner_id字段，我们将其作为created_by使用
-- 添加索引优化查询
CREATE INDEX IF NOT EXISTS idx_workflows_owner_id_status ON workflows(owner_id, status);

-- 3. 创建审计日志表
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 添加审计日志索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- 添加审计日志约束
ALTER TABLE audit_logs ADD CONSTRAINT check_audit_action 
  CHECK (action IN ('create', 'read', 'update', 'delete', 'execute', 'share', 'unshare'));

ALTER TABLE audit_logs ADD CONSTRAINT check_audit_resource_type 
  CHECK (resource_type IN ('workflow', 'execution', 'agent', 'user', 'template'));

-- 4. 标记测试用户
-- 将特定的测试用户ID标记为测试用户
UPDATE users 
SET is_test_user = TRUE, role = 'test'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 5. 创建审计日志记录函数
CREATE OR REPLACE FUNCTION log_audit_action(
  p_user_id UUID,
  p_action VARCHAR(50),
  p_resource_type VARCHAR(50),
  p_resource_id UUID,
  p_details JSONB DEFAULT '{}',
  p_ip_address VARCHAR(45) DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    details,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_details,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- 6. 创建权限检查函数
CREATE OR REPLACE FUNCTION check_workflow_permission(
  p_user_id UUID,
  p_workflow_id UUID,
  p_action VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role VARCHAR(20);
  v_workflow_owner_id UUID;
BEGIN
  -- 获取用户角色
  SELECT role INTO v_user_role FROM users WHERE id = p_user_id;
  
  -- 管理员拥有所有权限
  IF v_user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- 获取工作流所有者
  SELECT owner_id INTO v_workflow_owner_id FROM workflows WHERE id = p_workflow_id;
  
  -- 检查是否为所有者
  IF v_workflow_owner_id = p_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- 其他情况拒绝
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建获取用户工作流的函数（支持权限过滤）
CREATE OR REPLACE FUNCTION get_user_workflows(
  p_user_id UUID,
  p_include_test_data BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  description TEXT,
  version VARCHAR(20),
  status VARCHAR(20),
  definition JSONB,
  settings JSONB,
  metadata JSONB,
  owner_id UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
) AS $$
DECLARE
  v_user_role VARCHAR(20);
BEGIN
  -- 获取用户角色
  SELECT role INTO v_user_role FROM users WHERE id = p_user_id;
  
  -- 管理员可以看到所有工作流
  IF v_user_role = 'admin' THEN
    IF p_include_test_data THEN
      RETURN QUERY SELECT w.* FROM workflows w;
    ELSE
      RETURN QUERY 
        SELECT w.* FROM workflows w
        INNER JOIN users u ON w.owner_id = u.id
        WHERE u.is_test_user = FALSE;
    END IF;
  ELSE
    -- 普通用户只能看到自己的工作流
    RETURN QUERY 
      SELECT w.* FROM workflows w
      WHERE w.owner_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 8. 创建清理审计日志的函数
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(p_retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs 
  WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 9. 添加注释
COMMENT ON TABLE audit_logs IS '审计日志表，记录所有用户操作';
COMMENT ON COLUMN users.role IS '用户角色: user(普通用户), admin(管理员), test(测试用户)';
COMMENT ON COLUMN users.is_test_user IS '是否为测试用户，测试数据不会显示给普通用户';
COMMENT ON FUNCTION check_workflow_permission IS '检查用户是否有权限操作工作流';
COMMENT ON FUNCTION get_user_workflows IS '获取用户可访问的工作流列表（支持权限过滤）';
COMMENT ON FUNCTION log_audit_action IS '记录审计日志';
COMMENT ON FUNCTION cleanup_old_audit_logs IS '清理旧的审计日志';

-- 10. 验证数据完整性
DO $$
DECLARE
  v_workflows_without_owner INTEGER;
  v_users_without_role INTEGER;
BEGIN
  -- 检查没有所有者的工作流
  SELECT COUNT(*) INTO v_workflows_without_owner 
  FROM workflows WHERE owner_id IS NULL;
  
  IF v_workflows_without_owner > 0 THEN
    RAISE WARNING '发现 % 个工作流没有所有者', v_workflows_without_owner;
  END IF;
  
  -- 检查没有角色的用户
  SELECT COUNT(*) INTO v_users_without_role 
  FROM users WHERE role IS NULL;
  
  IF v_users_without_role > 0 THEN
    RAISE WARNING '发现 % 个用户没有角色', v_users_without_role;
    -- 自动修复：设置默认角色
    UPDATE users SET role = 'user' WHERE role IS NULL;
  END IF;
  
  RAISE NOTICE '数据完整性检查完成';
END $$;
