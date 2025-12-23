/**
 * Money-loan cash overrides
 * Allows authorized users to temporarily bypass after-midnight overdue blocks.
 */

exports.up = async function up(knex) {
  const hasTable = await knex.schema.hasTable('money_loan_cash_overrides');
  if (hasTable) return;

  await knex.schema.createTable('money_loan_cash_overrides', (table) => {
    table.bigIncrements('id').primary();

    table.integer('tenant_id').notNullable().index();
    table.integer('collector_id').notNullable().index();

    // The cash day (YYYY-MM-DD) being overridden (typically yesterday)
    table.date('for_date').notNullable().index();

    table.integer('created_by').notNullable().index();
    table.text('reason').notNullable();

    // What the override permits
    table.boolean('allow_issue_float').notNullable().defaultTo(true);
    table.boolean('allow_disbursement').notNullable().defaultTo(true);

    // Expiry control
    table.timestamp('expires_at').notNullable().index();

    // Soft revoke
    table.timestamp('revoked_at').nullable();
    table.integer('revoked_by').nullable();
    table.text('revoke_reason').nullable();

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['tenant_id', 'collector_id', 'for_date', 'expires_at']);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('money_loan_cash_overrides');
};
