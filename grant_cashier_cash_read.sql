-- Grant money-loan:cash:read permission to all cashier roles

DO $$
DECLARE
    v_permission_id INT;
    v_role_record RECORD;
BEGIN
    -- Get the permission ID
    SELECT id INTO v_permission_id
    FROM permissions
    WHERE permission_key = 'money-loan:cash:read';

    IF v_permission_id IS NOT NULL THEN
        -- Grant to all cashier roles
        FOR v_role_record IN 
            SELECT id, name, tenant_id
            FROM roles
            WHERE LOWER(name) LIKE '%cashier%'
              AND space = 'tenant'
        LOOP
            INSERT INTO role_permissions (role_id, permission_id, created_at)
            VALUES (v_role_record.id, v_permission_id, NOW())
            ON CONFLICT DO NOTHING;
            
            RAISE NOTICE 'Granted money-loan:cash:read to role: % (ID: %)', v_role_record.name, v_role_record.id;
        END LOOP;
    ELSE
        RAISE NOTICE 'Permission money-loan:cash:read not found';
    END IF;
END $$;

-- Verify all cashier cash permissions
SELECT 
    r.name as role_name,
    r.tenant_id,
    p.permission_key
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE LOWER(r.name) LIKE '%cashier%'
  AND p.permission_key LIKE 'money-loan:cash:%'
ORDER BY r.tenant_id, r.name, p.permission_key;
