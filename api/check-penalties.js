// Check which loan products and their penalty rates
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'exits_lms',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function checkLoanPenalties() {
  try {
    console.log('🔍 Checking loan penalties...\n');
    
    // Get all products
    const products = await pool.query(`
      SELECT id, name, late_payment_penalty_percent, grace_period_days 
      FROM money_loan_products 
      ORDER BY id
    `);
    
    console.log('📋 All Loan Products:');
    products.rows.forEach(p => {
      console.log(`   ${p.id}. ${p.name}`);
      console.log(`      Grace: ${p.grace_period_days} days`);
      console.log(`      Penalty: ${p.late_payment_penalty_percent}% per day`);
      console.log('');
    });
    
    // Get active loans and their products
    const loans = await pool.query(`
      SELECT 
        mll.id as loan_id,
        mll.loan_number,
        mll.status,
        mll.loan_product_id,
        mlp.name as product_name,
        mlp.late_payment_penalty_percent,
        mlp.grace_period_days,
        c.first_name,
        c.last_name
      FROM money_loan_loans mll
      LEFT JOIN money_loan_products mlp ON mll.loan_product_id = mlp.id
      LEFT JOIN customers c ON mll.customer_id = c.id
      WHERE mll.status IN ('active', 'overdue')
      ORDER BY mll.id DESC
      LIMIT 10
    `);
    
    console.log('💼 Active/Overdue Loans (last 10):');
    loans.rows.forEach(loan => {
      console.log(`   Loan #${loan.loan_number} - ${loan.first_name} ${loan.last_name}`);
      console.log(`      Product: ${loan.product_name}`);
      console.log(`      Grace: ${loan.grace_period_days} days`);
      console.log(`      Penalty: ${loan.late_payment_penalty_percent}% per day`);
      console.log(`      Status: ${loan.status}`);
      console.log('');
    });
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkLoanPenalties();
