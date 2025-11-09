// Quick script to update penalty rate from 10% to 1%
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'exits_lms',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function updatePenaltyRate() {
  try {
    console.log('🔄 Updating penalty rate from 10% to 1%...');
    
    // Check current values
    const current = await pool.query(
      'SELECT id, name, late_payment_penalty_percent FROM money_loan_products'
    );
    
    console.log('\n📋 Current penalty rates:');
    current.rows.forEach(row => {
      console.log(`   - ${row.name}: ${row.late_payment_penalty_percent}%`);
    });
    
    // Update ALL products to 1% (not just 10%)
    const result = await pool.query(
      'UPDATE money_loan_products SET late_payment_penalty_percent = 1.0 WHERE late_payment_penalty_percent > 1.0'
    );
    
    console.log(`\n✅ Updated ${result.rowCount} product(s) to 1% penalty rate`);
    
    // Verify update
    const updated = await pool.query(
      'SELECT id, name, late_payment_penalty_percent FROM money_loan_products'
    );
    
    console.log('\n📋 Updated penalty rates:');
    updated.rows.forEach(row => {
      console.log(`   - ${row.name}: ${row.late_payment_penalty_percent}%`);
    });
    
    console.log('\n🎉 Penalty rate updated successfully!');
    console.log('📌 New settings:');
    console.log('   - Grace Period: 4 days (no penalty)');
    console.log('   - Daily Rate: 1% per day after grace');
    console.log('   - Maximum Cap: 20% of outstanding amount');
    console.log('   - Fair & Industry-standard ✅');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating penalty rate:', error.message);
    await pool.end();
    process.exit(1);
  }
}

updatePenaltyRate();
