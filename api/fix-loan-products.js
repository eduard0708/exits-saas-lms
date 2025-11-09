// Fix loans that have NULL or missing product associations
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'exits_lms',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function fixLoanProducts() {
  try {
    console.log('🔧 Checking and fixing loan product associations...\n');
    
    // Check loans without product IDs or with products missing penalty settings
    const problematicLoans = await pool.query(`
      SELECT 
        mll.id,
        mll.loan_number,
        mll.loan_product_id,
        mlp.name as product_name,
        mlp.grace_period_days,
        mlp.late_payment_penalty_percent
      FROM money_loan_loans mll
      LEFT JOIN money_loan_products mlp ON mll.loan_product_id = mlp.id
      WHERE mll.status IN ('active', 'overdue')
      ORDER BY mll.id
    `);
    
    console.log(`📋 Found ${problematicLoans.rows.length} active/overdue loans:\n`);
    
    let loansNeedingFix = [];
    
    problematicLoans.rows.forEach(loan => {
      const hasProduct = loan.loan_product_id !== null;
      const hasGracePeriod = loan.grace_period_days !== null;
      const hasPenalty = loan.late_payment_penalty_percent !== null;
      
      console.log(`Loan #${loan.loan_number} (ID: ${loan.id})`);
      console.log(`   Product: ${loan.product_name || 'NONE'} (ID: ${loan.loan_product_id || 'NULL'})`);
      console.log(`   Grace Period: ${loan.grace_period_days ?? 'NULL'} days`);
      console.log(`   Penalty Rate: ${loan.late_payment_penalty_percent ?? 'NULL'}%`);
      
      if (!hasProduct || !hasGracePeriod || !hasPenalty) {
        console.log(`   ⚠️ NEEDS FIX`);
        loansNeedingFix.push(loan.id);
      } else {
        console.log(`   ✅ OK`);
      }
      console.log('');
    });
    
    if (loansNeedingFix.length > 0) {
      console.log(`\n🔧 ${loansNeedingFix.length} loan(s) need fixing.\n`);
      
      // Get a default product with proper settings
      const defaultProduct = await pool.query(`
        SELECT id, name, grace_period_days, late_payment_penalty_percent 
        FROM money_loan_products 
        WHERE grace_period_days IS NOT NULL 
          AND late_payment_penalty_percent IS NOT NULL
        ORDER BY id
        LIMIT 1
      `);
      
      if (defaultProduct.rows.length === 0) {
        console.log('❌ No valid product found to use as default!');
        console.log('   Please ensure products table has grace_period_days and late_payment_penalty_percent set.');
      } else {
        const product = defaultProduct.rows[0];
        console.log(`Using default product: ${product.name}`);
        console.log(`   Grace Period: ${product.grace_period_days} days`);
        console.log(`   Penalty Rate: ${product.late_payment_penalty_percent}%\n`);
        
        // Update loans
        const updateResult = await pool.query(`
          UPDATE money_loan_loans 
          SET loan_product_id = $1
          WHERE id = ANY($2::int[])
            AND (loan_product_id IS NULL OR loan_product_id NOT IN (
              SELECT id FROM money_loan_products 
              WHERE grace_period_days IS NOT NULL 
                AND late_payment_penalty_percent IS NOT NULL
            ))
        `, [product.id, loansNeedingFix]);
        
        console.log(`✅ Updated ${updateResult.rowCount} loan(s) to use product: ${product.name}\n`);
      }
    } else {
      console.log('\n✅ All loans have valid product associations!\n');
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

fixLoanProducts();
