/**
 * Migration: Create Cash Float Management Tables
 * Purpose: Track cash float issuance, collector balances, and handovers
 * Date: 2025-11-11
 */

exports.up = async function(knex) {
  // 1. money_loan_cash_floats - Records all float transactions (issuance and handovers)
  await knex.schema.createTable('money_loan_cash_floats', table => {
    table.increments('id').primary();
    table.integer('tenant_id').unsigned().notNullable();
    table.integer('collector_id').unsigned().notNullable().comment('User ID of collector');
    table.integer('cashier_id').unsigned().notNullable().comment('User ID of cashier/manager');
    table.decimal('amount', 15, 2).notNullable();
    table.enum('type', ['issuance', 'handover']).notNullable();
    table.enum('status', ['pending', 'confirmed', 'rejected']).notNullable().defaultTo('pending');
    
    // Float issuance details
    table.decimal('daily_cap', 15, 2).nullable().comment('Max disbursement allowed for the day');
    table.date('float_date').notNullable().comment('Date for which float is issued');
    
    // Handover details (for end-of-day)
    table.decimal('starting_float', 15, 2).nullable().comment('Float amount at start of day');
    table.decimal('collections', 15, 2).nullable().comment('Total collections during day');
    table.decimal('disbursements', 15, 2).nullable().comment('Total disbursements during day');
    table.decimal('expected_handover', 15, 2).nullable().comment('Calculated amount to return');
    table.decimal('actual_handover', 15, 2).nullable().comment('Actual amount handed over');
    table.decimal('variance', 15, 2).nullable().comment('Difference (actual - expected)');
    
    // Confirmation tracking
    table.timestamp('collector_confirmed_at').nullable();
    table.timestamp('cashier_confirmed_at').nullable();
    
    // GPS tracking
    table.decimal('issuance_latitude', 10, 8).nullable();
    table.decimal('issuance_longitude', 11, 8).nullable();
    table.decimal('handover_latitude', 10, 8).nullable();
    table.decimal('handover_longitude', 11, 8).nullable();
    
    table.text('notes').nullable();
    table.timestamps(true, true);
    
    // Indexes
    table.index(['tenant_id', 'collector_id', 'float_date']);
    table.index(['tenant_id', 'type', 'status']);
    table.index('float_date');
    
    // Foreign keys
    table.foreign('tenant_id').references('tenants.id').onDelete('CASCADE');
    table.foreign('collector_id').references('users.id').onDelete('CASCADE');
    table.foreign('cashier_id').references('users.id').onDelete('CASCADE');
  });

  // 2. money_loan_collector_cash_balances - Current cash balance per collector
  await knex.schema.createTable('money_loan_collector_cash_balances', table => {
    table.increments('id').primary();
    table.integer('tenant_id').unsigned().notNullable();
    table.integer('collector_id').unsigned().notNullable();
    table.date('balance_date').notNullable().comment('Date for which balance is tracked');
    
    // Balance tracking
    table.decimal('opening_float', 15, 2).notNullable().defaultTo(0).comment('Float received from cashier');
    table.decimal('total_collections', 15, 2).notNullable().defaultTo(0).comment('Sum of all collections');
    table.decimal('total_disbursements', 15, 2).notNullable().defaultTo(0).comment('Sum of all disbursements');
    table.decimal('current_balance', 15, 2).notNullable().defaultTo(0).comment('Current on-hand cash');
    table.decimal('daily_cap', 15, 2).notNullable().defaultTo(0).comment('Max disbursement allowed');
    table.decimal('available_for_disbursement', 15, 2).notNullable().defaultTo(0).comment('Min(current_balance, daily_cap - disbursed)');
    
    // Status tracking
    table.boolean('is_float_confirmed').notNullable().defaultTo(false);
    table.boolean('is_day_closed').notNullable().defaultTo(false);
    table.timestamp('day_closed_at').nullable();
    
    // Float reference
    table.integer('float_issuance_id').unsigned().nullable().comment('Reference to cash float issuance');
    table.integer('handover_id').unsigned().nullable().comment('Reference to handover record');
    
    table.timestamps(true, true);
    
    // Unique constraint - one balance record per collector per day
    table.unique(['tenant_id', 'collector_id', 'balance_date']);
    
    // Indexes
    table.index(['tenant_id', 'balance_date']);
    table.index(['collector_id', 'is_day_closed']);
    
    // Foreign keys
    table.foreign('tenant_id').references('tenants.id').onDelete('CASCADE');
    table.foreign('collector_id').references('users.id').onDelete('CASCADE');
    table.foreign('float_issuance_id').references('money_loan_cash_floats.id').onDelete('SET NULL');
    table.foreign('handover_id').references('money_loan_cash_floats.id').onDelete('SET NULL');
  });

  // 3. money_loan_cash_transactions - Detailed log of every cash movement
  await knex.schema.createTable('money_loan_cash_transactions', table => {
    table.increments('id').primary();
    table.integer('tenant_id').unsigned().notNullable();
    table.integer('collector_id').unsigned().notNullable();
    table.date('transaction_date').notNullable();
    
    table.enum('transaction_type', [
      'float_received',
      'collection',
      'disbursement',
      'handover',
      'adjustment'
    ]).notNullable();
    
    table.decimal('amount', 15, 2).notNullable();
    table.decimal('balance_before', 15, 2).notNullable();
    table.decimal('balance_after', 15, 2).notNullable();
    
    // Reference IDs
    table.integer('loan_id').unsigned().nullable().comment('For disbursements/collections');
    table.integer('payment_id').unsigned().nullable().comment('For collections');
    table.integer('float_id').unsigned().nullable().comment('For float/handover transactions');
    
    // GPS tracking
    table.decimal('latitude', 10, 8).nullable();
    table.decimal('longitude', 11, 8).nullable();
    
    // Offline support
    table.string('local_transaction_id').nullable().comment('Client-side ID for offline transactions');
    table.boolean('is_synced').notNullable().defaultTo(true);
    
    table.text('notes').nullable();
    table.timestamps(true, true);
    
    // Indexes
    table.index(['tenant_id', 'collector_id', 'transaction_date']);
    table.index(['transaction_type', 'transaction_date']);
    table.index('loan_id');
    table.index('payment_id');
    table.index(['is_synced', 'created_at']);
    
    // Foreign keys
    table.foreign('tenant_id').references('tenants.id').onDelete('CASCADE');
    table.foreign('collector_id').references('users.id').onDelete('CASCADE');
    table.foreign('loan_id').references('money_loan_loans.id').onDelete('SET NULL');
    table.foreign('payment_id').references('money_loan_payments.id').onDelete('SET NULL');
    table.foreign('float_id').references('money_loan_cash_floats.id').onDelete('SET NULL');
  });

  console.log('✅ Cash float management tables created successfully');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('money_loan_cash_transactions');
  await knex.schema.dropTableIfExists('money_loan_collector_cash_balances');
  await knex.schema.dropTableIfExists('money_loan_cash_floats');
  console.log('✅ Cash float management tables dropped');
};
