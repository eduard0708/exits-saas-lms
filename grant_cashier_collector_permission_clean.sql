-- Grant money-loan:collector-management:read permission to all cashier roles
-- This script is safe to run multiple times (idempotent)

DO $$
DECLARE
    v_permission_id INT;
    v_role_record RECORD;
    v_existing_count INT;
    v_granted_count INT := 0;
BEGIN
    -- Step 1: Ensure the permission exists in the permissions table
    SELECT id INTO v_permission_id
    FROM permissions
    WHERE permission_key = 'money-loan:collector-management:read';

    IF v_permission_id IS NULL THEN
        -- Create the permission if it doesn't exist
        INSERT INTO permissions (permission_key, resource, action, description, created_at, updated_at)
        VALUES (
            'money-loan:collector-management:read',
            'money-loan:collector-management',
            'read',
            'Read access to collector management for cashiers',
            NOW(),
            NOW()
        )
        RETURNING id INTO v_permission_id;
        
        RAISE NOTICE 'Created permission: money-loan:collector-management:read (ID: %)', v_permission_id;
    ELSE
        RAISE NOTICE 'Permission already exists: money-loan:collector-management:read (ID: %)', v_permission_id;
    END IF;

    -- Step 2: Find all cashier roles and grant the permission
    FOR v_role_record IN 
        SELECT id, name, tenant_id, space
        FROM roles
        WHERE LOWER(name) LIKE '%cashier%'
          AND space = 'tenant'
    LOOP
        -- Check if the role already has this permission
        SELECT COUNT(*) INTO v_existing_count
        FROM role_permissions
        WHERE role_id = v_role_record.id
          AND permission_id = v_permission_id;

        IF v_existing_count = 0 THEN
            -- Grant the permission
            INSERT INTO role_permissions (role_id, permission_id, created_at)
            VALUES (v_role_record.id, v_permission_id, NOW());
            
            v_granted_count := v_granted_count + 1;
            RAISE NOTICE 'Granted permission to role: % (ID: %, Tenant: %)', 
                v_role_record.name, v_role_record.id, v_role_record.tenant_id;
        ELSE
            RAISE NOTICE 'Role already has permission: % (ID: %)', 
                v_role_record.name, v_role_record.id;
        END IF;
    END LOOP;

    -- Summary
    RAISE NOTICE '---';
    RAISE NOTICE 'Grant complete. Permissions granted to % cashier role(s)', v_granted_count;
END $$;

-- Verify the grants
SELECT 
    r.id as role_id,
    r.name as role_name,
    r.tenant_id,
    p.permission_key
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE LOWER(r.name) LIKE '%cashier%'
  AND p.permission_key = 'money-loan:collector-management:read'
ORDER BY r.tenant_id, r.name;
