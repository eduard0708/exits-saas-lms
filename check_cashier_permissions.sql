-- Quick check: Does your cashier user have the required permission?
-- Replace YOUR_CASHIER_EMAIL with your actual cashier login email

SELECT 
    u.id as user_id,
    u.email,
    u.first_name,
    u.last_name,
    r.name as role_name,
    p.permission_key,
    CASE 
        WHEN p.permission_key IN ('money-loan:collector-management:read', 'tenant-users:read') 
        THEN '✅ HAS ACCESS'
        ELSE '❌ NO ACCESS'
    END as collector_access_status
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN roles r ON r.id = ur.role_id
LEFT JOIN role_permissions rp ON rp.role_id = r.id
LEFT JOIN permissions p ON p.id = rp.permission_id
WHERE u.email = 'YOUR_CASHIER_EMAIL'  -- <-- CHANGE THIS
  AND (
    p.permission_key LIKE '%collector%' 
    OR p.permission_key LIKE '%tenant-users%'
    OR p.permission_key LIKE '%cash%'
  )
ORDER BY p.permission_key;

-- If the above returns no rows with collector-management:read or tenant-users:read,
-- run the grant_cashier_collector_permission.sql script
