/**
 * Create Cashier Role for Cash Float Management
 * This seed creates the Cashier role and assigns appropriate permissions
 */

exports.seed = async function (knex) {
  console.log('\n💰 Seeding Cashier Role...');

  try {
    // Get all tenants
    const tenants = await knex('tenants').select('id', 'name');

    for (const tenant of tenants) {
      // Check if Cashier role already exists
      const existingRole = await knex('roles')
        .where({ tenant_id: tenant.id, name: 'Cashier' })
        .first();

      if (existingRole) {
        console.log(`   ℹ️  Cashier role already exists for tenant ${tenant.name} (ID: ${tenant.id})`);
        continue;
      }

      // Create Cashier role
      const [cashierRole] = await knex('roles').insert({
        tenant_id: tenant.id,
        name: 'Cashier',
        description: 'Cash float management and monitoring',
        space: 'tenant',
        is_system_role: true, // Protected role
        status: 'active'
      }).returning(['id', 'name', 'tenant_id']);

      console.log(`   ✅ Created Cashier role for tenant ${tenant.name} (ID: ${tenant.id})`);

      // Get cash-related permissions
      const cashPermissions = await knex('permissions')
        .whereIn('permission_key', [
          'money-loan:cash:issue',
          'money-loan:cash:receive',
          'money-loan:cash:read',
          'money-loan:cash:manage'
        ]);

      if (cashPermissions.length > 0) {
        // Assign permissions to Cashier role
        const rolePermissions = cashPermissions.map(perm => ({
          role_id: cashierRole.id,
          permission_id: perm.id
        }));

        await knex('role_permissions').insert(rolePermissions);
        console.log(`   ✅ Assigned ${cashPermissions.length} permissions to Cashier role`);
      }
    }

    console.log('\n✅ Cashier role setup complete!');

  } catch (error) {
    console.error('❌ Error seeding Cashier role:', error);
    throw error;
  }
};
