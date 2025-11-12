require('dotenv').config();
const knex = require('knex')({
  client: 'postgresql',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'exits_saas_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin'
  }
});

async function checkPermissions() {
  try {
    console.log('\n🔍 Checking Cash Float Permissions...\n');

    const permissions = await knex('permissions')
      .select('permission_key', 'description', 'action', 'resource')
      .where('permission_key', 'like', 'money-loan:cash%')
      .orWhere('permission_key', '=', 'money-loan:collector')
      .orderBy('permission_key');

    if (permissions.length === 0) {
      console.log('❌ No cash float permissions found!\n');
    } else {
      console.log(`✅ Found ${permissions.length} permissions:\n`);
      permissions.forEach(p => {
        console.log(`   ${p.permission_key}`);
        console.log(`   └─ ${p.description}\n`);
      });
    }

    // Check role assignments
    console.log('\n👥 Checking Role Assignments...\n');

    const rolePerms = await knex('role_permissions as rp')
      .select(
        'r.name as role_name',
        'r.tenant_id',
        'p.permission_key'
      )
      .join('roles as r', 'rp.role_id', 'r.id')
      .join('permissions as p', 'rp.permission_id', 'p.id')
      .where('p.permission_key', 'like', 'money-loan:cash%')
      .orWhere('p.permission_key', '=', 'money-loan:collector')
      .orderBy('r.name');

    if (rolePerms.length === 0) {
      console.log('⚠️  No roles have cash permissions assigned yet!\n');
    } else {
      const grouped = {};
      rolePerms.forEach(rp => {
        const key = `${rp.role_name} (tenant ${rp.tenant_id})`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(rp.permission_key);
      });

      Object.keys(grouped).forEach(role => {
        console.log(`   ${role}:`);
        grouped[role].forEach(perm => {
          console.log(`      ✓ ${perm}`);
        });
        console.log('');
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await knex.destroy();
  }
}

checkPermissions();
