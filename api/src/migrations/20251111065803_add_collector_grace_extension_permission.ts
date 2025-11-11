import type { Knex } from "knex";

/**
 * Migration: Add collector grace extension permission
 * 
 * Purpose: Adds the permission for collectors to extend grace periods for customers.
 * This permission allows collectors to handle scenarios where they cannot collect
 * on scheduled days or need to provide extensions for special circumstances.
 */
export async function up(knex: Knex): Promise<void> {
  // Check if permission already exists (to avoid duplicates)
  const existingPermission = await knex('permissions')
    .where('permission_key', 'money-loan:collector:grace-extension')
    .first();

  if (!existingPermission) {
    // Insert the grace extension permission
    await knex('permissions').insert({
      permission_key: 'money-loan:collector:grace-extension',
      resource: 'money-loan',
      action: 'collector:grace-extension',
      description: 'Allow collector to extend grace periods for customers',
      space: 'tenant',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    });
    
    console.log('✅ Added money-loan:collector:grace-extension permission');
  } else {
    // Update space if it was set incorrectly
    if (existingPermission.space !== 'tenant') {
      await knex('permissions')
        .where('permission_key', 'money-loan:collector:grace-extension')
        .update({ space: 'tenant', updated_at: knex.fn.now() });
      
      console.log('✅ Updated money-loan:collector:grace-extension permission space to tenant');
    } else {
      console.log('ℹ️  Permission already exists with correct configuration');
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // Remove the permission
  await knex('permissions')
    .where('permission_key', 'money-loan:collector:grace-extension')
    .del();
  
  console.log('✅ Removed money-loan:collector:grace-extension permission');
}

