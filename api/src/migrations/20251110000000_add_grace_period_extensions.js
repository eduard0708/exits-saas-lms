/**
 * Migration: Add Grace Period Extension Support
 * 
 * Purpose: Allow collectors to extend grace periods for individual installments
 * when they cannot collect due to:
 * - Rainy weather preventing travel
 * - Holidays/weekends
 * - Customer emergency situations
 * - Collector illness/emergency
 * 
 * Key Design Decisions:
 * 1. Extensions are per-installment, not per-loan
 *    - Weekly loans: Each week is independent, extending week 1 doesn't affect week 2
 *    - Monthly loans: Each month is independent
 * 2. Grace periods are additive to the product's default grace period
 *    - Product has 2 days grace
 *    - Collector adds 3 days extension
 *    - Total grace = 5 days
 * 3. Extensions are logged for audit trail
 * 4. Multiple extensions allowed per installment (in extreme cases)
 */

exports.up = async function(knex) {
  console.log('📅 Adding grace period extension support...');

  // 1. Create grace_period_extensions table
  await knex.schema.createTable('money_loan_grace_extensions', table => {
    table.increments('id').primary();
    table.integer('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.integer('loan_id').notNullable().references('id').inTable('money_loan_loans').onDelete('CASCADE');
    table.integer('installment_id').notNullable().references('id').inTable('money_loan_repayment_schedules').onDelete('CASCADE');
    table.integer('customer_id').notNullable().references('id').inTable('customers').onDelete('CASCADE');
    
    // Extension details
    table.integer('original_grace_days').notNullable().comment('Product default grace period');
    table.integer('extension_days').notNullable().comment('Additional days granted');
    table.integer('total_grace_days').notNullable().comment('Original + Extension');
    table.date('new_penalty_start_date').notNullable().comment('Date when penalties would start after extension');
    
    // Reason for extension
    table.enum('reason_category', [
      'weather',           // Rain, typhoon, flood preventing collection
      'holiday',           // National/local holiday, weekend
      'customer_emergency', // Customer hospitalized, family emergency
      'collector_emergency', // Collector illness, personal emergency
      'infrastructure',    // Road closed, transportation issues
      'company_policy',    // Company-wide grace extension (e.g., Christmas season)
      'goodwill',          // Customer relationship building
      'other'
    ]).notNullable();
    
    table.text('detailed_reason').notNullable().comment('Specific explanation from collector');
    table.jsonb('metadata').comment('Additional context: weather report, photo evidence, etc.');
    
    // Authorization
    table.integer('granted_by').notNullable().references('id').inTable('users').comment('Collector who granted extension');
    table.timestamp('granted_at').defaultTo(knex.fn.now());
    
    // Approval workflow (optional - if company requires manager approval)
    table.enum('approval_status', ['auto_approved', 'pending', 'approved', 'rejected']).defaultTo('auto_approved');
    table.integer('approved_by').references('id').inTable('users').comment('Manager who approved (if required)');
    table.timestamp('approved_at');
    table.text('approval_notes');
    
    // Impact tracking
    table.boolean('payment_made_within_extension').defaultTo(false).comment('Did customer pay during extended grace?');
    table.date('actual_payment_date').comment('When payment was actually made');
    
    // Audit
    table.timestamps(true, true);
    
    // Indexes for performance
    table.index(['tenant_id', 'loan_id'], 'idx_grace_extensions_loan');
    table.index(['installment_id'], 'idx_grace_extensions_installment');
    table.index(['customer_id'], 'idx_grace_extensions_customer');
    table.index(['granted_by', 'granted_at'], 'idx_grace_extensions_collector');
    table.index(['reason_category'], 'idx_grace_extensions_reason');
    table.index(['approval_status'], 'idx_grace_extensions_approval');
  });

  console.log('✓ Created money_loan_grace_extensions table');

  // 2. Add grace extension tracking to repayment schedules
  const hasGraceExtension = await knex.schema.hasColumn('money_loan_repayment_schedules', 'grace_period_extended');
  
  if (!hasGraceExtension) {
    await knex.schema.alterTable('money_loan_repayment_schedules', table => {
      // Quick lookup fields (denormalized for performance)
      table.boolean('grace_period_extended').defaultTo(false).comment('Has collector extended grace for this installment?');
      table.integer('extended_grace_days').defaultTo(0).comment('Total additional days granted');
      table.integer('total_grace_days').comment('Original + extended grace days');
      table.date('extended_penalty_start_date').comment('New date when penalties would apply');
      table.text('extension_reason_summary').comment('Brief reason for extension');
      
      // Add index for quick filtering
      table.index(['grace_period_extended'], 'idx_schedules_grace_extended');
    });
    console.log('✓ Added grace extension fields to money_loan_repayment_schedules');
  } else {
    console.log('ℹ️ Grace extension fields already exist in money_loan_repayment_schedules');
  }

  // 3. Add collector permission settings to track who can extend grace
  const hasPermissionSettings = await knex.schema.hasTable('money_loan_collector_permissions');
  
  if (!hasPermissionSettings) {
    await knex.schema.createTable('money_loan_collector_permissions', table => {
      table.increments('id').primary();
      table.integer('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.integer('collector_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      
      // Grace extension permissions
      table.boolean('can_extend_grace').defaultTo(true).comment('Can collector extend grace periods?');
      table.integer('max_extension_days').defaultTo(7).comment('Maximum days collector can extend without approval');
      table.boolean('requires_approval').defaultTo(false).comment('Does extension need manager approval?');
      table.integer('max_extensions_per_loan').defaultTo(3).comment('Max times grace can be extended per loan');
      
      // Other permissions can be added here in future
      table.boolean('can_waive_penalties').defaultTo(false);
      table.decimal('max_waiver_amount', 15, 2).comment('Max penalty amount can waive without approval');
      
      table.timestamps(true, true);
      
      table.unique(['tenant_id', 'collector_id'], 'uk_collector_permissions');
      table.index(['tenant_id', 'collector_id'], 'idx_collector_permissions');
    });
    console.log('✓ Created money_loan_collector_permissions table');
  } else {
    console.log('ℹ️ Collector permissions table already exists');
  }

  // 4. Create view for easy grace extension reporting
  await knex.raw(`
    CREATE OR REPLACE VIEW v_grace_extensions_summary AS
    SELECT 
      ge.tenant_id,
      ge.loan_id,
      ml.loan_number,
      CONCAT(c.first_name, ' ', c.last_name) as customer_name,
      CONCAT(u.first_name, ' ', u.last_name) as collector_name,
      COUNT(ge.id) as total_extensions,
      SUM(ge.extension_days) as total_days_extended,
      MAX(ge.granted_at) as last_extension_date,
      COUNT(CASE WHEN ge.payment_made_within_extension THEN 1 END) as successful_extensions,
      ARRAY_AGG(DISTINCT ge.reason_category) as reason_categories
    FROM money_loan_grace_extensions ge
    JOIN money_loan_loans ml ON ge.loan_id = ml.id
    JOIN customers c ON ge.customer_id = c.id
    JOIN users u ON ge.granted_by = u.id
    GROUP BY ge.tenant_id, ge.loan_id, ml.loan_number, c.first_name, c.last_name, u.first_name, u.last_name
  `);

  console.log('✓ Created v_grace_extensions_summary view');

  console.log('✅ Grace period extension support added successfully!');
  console.log('');
  console.log('📋 Key Features:');
  console.log('   • Per-installment grace extensions (weekly/monthly independent)');
  console.log('   • Multiple reason categories with detailed logging');
  console.log('   • Optional approval workflow for large extensions');
  console.log('   • Collector permission controls');
  console.log('   • Audit trail and impact tracking');
  console.log('   • Reporting view for analysis');
  console.log('');
  console.log('💡 Usage:');
  console.log('   - Collector extends grace: Insert into money_loan_grace_extensions');
  console.log('   - Update installment: Set grace_period_extended=true in repayment_schedules');
  console.log('   - Penalty calculation: Use extended_penalty_start_date instead of original due_date');
};

exports.down = async function(knex) {
  console.log('🔄 Rolling back grace period extension support...');
  
  // Drop view
  await knex.raw('DROP VIEW IF EXISTS v_grace_extensions_summary');
  console.log('✓ Dropped v_grace_extensions_summary view');
  
  // Drop tables
  await knex.schema.dropTableIfExists('money_loan_collector_permissions');
  console.log('✓ Dropped money_loan_collector_permissions table');
  
  // Remove fields from repayment schedules
  const hasGraceExtension = await knex.schema.hasColumn('money_loan_repayment_schedules', 'grace_period_extended');
  if (hasGraceExtension) {
    await knex.schema.alterTable('money_loan_repayment_schedules', table => {
      table.dropColumn('grace_period_extended');
      table.dropColumn('extended_grace_days');
      table.dropColumn('total_grace_days');
      table.dropColumn('extended_penalty_start_date');
      table.dropColumn('extension_reason_summary');
    });
    console.log('✓ Removed grace extension fields from money_loan_repayment_schedules');
  }
  
  await knex.schema.dropTableIfExists('money_loan_grace_extensions');
  console.log('✓ Dropped money_loan_grace_extensions table');
  
  console.log('✅ Grace period extension support rolled back');
};
