-- Grant cashier role the permission to view collectors
-- Run this in your PostgreSQL database

-- Step 1: Find the permission ID
DO $$
DECLARE
    v_permission_id INTEGER;
    v_cashier_role_id INTEGER;
    v_existing_count INTEGER;
BEGIN
    -- Get the permission ID for money-loan:collector-management:read
    SELECT id INTO v_permission_id 
    FROM permissions 
    WHERE permission_key = 'money-loan:collector-management:read'
    LIMIT 1;
    
    IF v_permission_id IS NULL THEN
        RAISE NOTICE '❌ Permission "money-loan:collector-management:read" not found. Creating it...';
        
        INSERT INTO permissions (permission_key, resource, action, description, space)
        VALUES (
            'money-loan:collector-management:read',
            'money-loan-collector-management',
            'read',
            'View collectors list and basic info',
            'tenant'
        )
        RETURNING id INTO v_permission_id;
        
        RAISE NOTICE '✅ Created permission with ID: %', v_permission_id;
    ELSE
        RAISE NOTICE '✅ Found permission ID: %', v_permission_id;
    END IF;
    
    -- Loop through all cashier roles across all tenants
    FOR v_cashier_role_id IN 
        SELECT id FROM roles 
        WHERE LOWER(name) IN ('cashier', 'cash manager')
    LOOP
        -- Check if permission already assigned
        SELECT COUNT(*) INTO v_existing_count
        FROM role_permissions
        WHERE role_id = v_cashier_role_id 
        AND permission_id = v_permission_id;
        
        IF v_existing_count = 0 THEN
            -- Grant the permission
            INSERT INTO role_permissions (role_id, permission_id)
            VALUES (v_cashier_role_id, v_permission_id);
            
            RAISE NOTICE '✅ Granted permission to role ID: %', v_cashier_role_id;
        ELSE
            RAISE NOTICE 'ℹ️  Permission already granted to role ID: %', v_cashier_role_id;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Complete! Cashier roles now have collector-management:read permission';
END $$;

-- Verify the grants
SELECT 
    r.id as role_id,
    r.name as role_name,
    r.tenant_id,
    p.permission_key
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE p.permission_key = 'money-loan:collector-management:read'
  AND LOWER(r.name) IN ('cashier', 'cash manager')
ORDER BY r.tenant_id, r.name;
