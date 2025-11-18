/**
 * Grant money-loan:collector:operate permission to Collector role
 * This allows collectors to access cash float operations
 */

exports.seed = async function (knex) {
  console.log('\n🔐 Granting collector operate permission...');

  try {
    // Get all Collector roles across all tenants
    const collectorRoles = await knex('roles')
      .where({ name: 'Collector' })
      .select('id', 'name', 'tenant_id');

    if (collectorRoles.length === 0) {
      console.log('   ⚠️  No Collector roles found');
      return;
    }

    // Get the money-loan:collector:operate permission
    const operatePermission = await knex('permissions')
      .where({ permission_key: 'money-loan:collector:operate' })
      .first();

    if (!operatePermission) {
      console.log('   ❌ money-loan:collector:operate permission not found');
      return;
    }

    console.log(`   ✓ Found permission: ${operatePermission.permission_key} (ID: ${operatePermission.id})`);

    // Grant permission to each Collector role
    for (const role of collectorRoles) {
      // Check if permission is already assigned
      const existing = await knex('role_permissions')
        .where({
          role_id: role.id,
          permission_id: operatePermission.id
        })
        .first();

      if (existing) {
        console.log(`   ℹ️  Permission already assigned to Collector role (ID: ${role.id}, Tenant: ${role.tenant_id})`);
        continue;
      }

      // Assign the permission
      await knex('role_permissions').insert({
        role_id: role.id,
        permission_id: operatePermission.id,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      });

      console.log(`   ✅ Granted operate permission to Collector role (ID: ${role.id}, Tenant: ${role.tenant_id})`);
    }

    console.log('\n✅ Collector operate permission setup complete!');

  } catch (error) {
    console.error('❌ Error granting collector operate permission:', error);
    throw error;
  }
};
