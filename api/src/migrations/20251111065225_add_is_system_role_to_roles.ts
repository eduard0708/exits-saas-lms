import type { Knex } from "knex";

/**
 * Migration: Add is_system_role column to roles table
 * 
 * Purpose: Protect certain roles (like Collector, Super Admin) from having their names changed.
 * System roles can still have permissions modified, but the role name itself is protected.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('roles', (table) => {
    table.boolean('is_system_role').defaultTo(false).notNullable();
    table.index('is_system_role');
  });
  
  // Mark existing Super Admin and Collector roles as system roles
  await knex('roles')
    .whereIn('name', ['Super Admin', 'Collector'])
    .update({ is_system_role: true });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('roles', (table) => {
    table.dropColumn('is_system_role');
  });
}

