/**
 * Cash Float Management Permissions
 * Permissions for the 10K cash cycle system (cashier and collector operations)
 * 
 * Permission Naming Convention: money-loan:cash:{action}
 */

const cashFloatPermissions = [
  // ============================================
  // CASHIER PERMISSIONS
  // ============================================
  {
    permission_key: 'money-loan:cash:issue',
    resource: 'money-loan:cash',
    action: 'issue',
    description: 'Issue cash float to collectors (morning operation)',
    space: 'tenant'
  },
  {
    permission_key: 'money-loan:cash:receive',
    resource: 'money-loan:cash',
    action: 'receive',
    description: 'Confirm handover receipt from collectors (end-of-day)',
    space: 'tenant'
  },
  {
    permission_key: 'money-loan:cash:read',
    resource: 'money-loan:cash',
    action: 'read',
    description: 'View cash float history, pending confirmations, and balance monitor',
    space: 'tenant'
  },
  {
    permission_key: 'money-loan:cash:manage',
    resource: 'money-loan:cash',
    action: 'manage',
    description: 'Full cash management access (issue, receive, monitor, history)',
    space: 'tenant'
  },

  // ============================================
  // COLLECTOR PERMISSIONS
  // ============================================
  {
    permission_key: 'money-loan:collector:operate',
    resource: 'money-loan:collector',
    action: 'operate',
    description: 'Collector operations (confirm float, record transactions, handover)',
    space: 'tenant'
  },
];

exports.seed = async function (knex) {
  console.log('\n🔐 Seeding Cash Float Management Permissions...');

  try {
    // Check if permissions already exist
    const existingPermissions = await knex('permissions')
      .whereIn('permission_key', cashFloatPermissions.map(p => p.permission_key));

    const existingKeys = existingPermissions.map(p => p.permission_key);
    const newPermissions = cashFloatPermissions.filter(
      p => !existingKeys.includes(p.permission_key)
    );

    if (newPermissions.length === 0) {
      console.log('✅ All cash float permissions already exist');
      return;
    }

    // Insert new permissions
    for (const perm of newPermissions) {
      await knex('permissions').insert(perm);
      console.log(`   ✅ Created: ${perm.permission_key}`);
    }

    console.log(`\n✅ Successfully created ${newPermissions.length} cash float permissions`);

    // ============================================
    // AUTO-ASSIGN TO RELEVANT ROLES
    // ============================================
    console.log('\n📋 Auto-assigning permissions to roles...');

    // Get all tenants
    const tenants = await knex('tenants').select('id');

    for (const tenant of tenants) {
      // Find Cashier role
      const cashierRole = await knex('roles')
        .where({ tenant_id: tenant.id, name: 'Cashier' })
        .orWhere({ tenant_id: tenant.id, name: 'cashier' })
        .first();

      if (cashierRole) {
        const cashierPerms = await knex('permissions')
          .whereIn('permission_key', [
            'money-loan:cash:issue',
            'money-loan:cash:receive',
            'money-loan:cash:read',
            'money-loan:cash:manage',
            'money-loan:collector-management:read'
          ]);

        // Remove existing cash permissions for this role
        await knex('role_permissions')
          .where('role_id', cashierRole.id)
          .whereIn('permission_id', cashierPerms.map(p => p.id))
          .del();

        // Insert new permissions
        const rolePermissions = cashierPerms.map(perm => ({
          role_id: cashierRole.id,
          permission_id: perm.id
        }));

        await knex('role_permissions').insert(rolePermissions);
        console.log(`   ✅ Cashier role (tenant ${tenant.id}): ${cashierPerms.length} permissions`);
      }

      // Find Collector role
      const collectorRole = await knex('roles')
        .where({ tenant_id: tenant.id, name: 'Collector' })
        .orWhere({ tenant_id: tenant.id, name: 'collector' })
        .first();

      if (collectorRole) {
        const collectorPerm = await knex('permissions')
          .where('permission_key', 'money-loan:collector')
          .first();

        if (collectorPerm) {
          // Remove existing
          await knex('role_permissions')
            .where({ role_id: collectorRole.id, permission_id: collectorPerm.id })
            .del();

          // Insert
          await knex('role_permissions').insert({
            role_id: collectorRole.id,
            permission_id: collectorPerm.id
          });

          console.log(`   ✅ Collector role (tenant ${tenant.id}): 1 permission`);
        }
      }

      // Find Admin/Manager roles and give full cash:manage permission
      const adminRoles = await knex('roles')
        .where('tenant_id', tenant.id)
        .where(function() {
          this.where('name', 'like', '%admin%')
            .orWhere('name', 'like', '%manager%')
            .orWhere('name', 'Employee'); // Employee gets all permissions typically
        });

      for (const adminRole of adminRoles) {
        const managePerm = await knex('permissions')
          .where('permission_key', 'money-loan:cash:manage')
          .first();

        if (managePerm) {
          // Check if already assigned
          const existing = await knex('role_permissions')
            .where({ role_id: adminRole.id, permission_id: managePerm.id })
            .first();

          if (!existing) {
            await knex('role_permissions').insert({
              role_id: adminRole.id,
              permission_id: managePerm.id
            });
            console.log(`   ✅ ${adminRole.name} role (tenant ${tenant.id}): cash:manage permission`);
          }
        }
      }
    }

    console.log('\n✅ Cash Float Management Permissions setup complete!');

  } catch (error) {
    console.error('❌ Error seeding cash float permissions:', error);
    throw error;
  }
};
