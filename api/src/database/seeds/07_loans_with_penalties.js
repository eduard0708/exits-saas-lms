/**
 * Seed: Loans with Penalties for Testing
 * Creates 3 active loans with overdue installments and penalties
 * Customer: customer1@acme.com
 * Employee/Collector: employee1@acme.com
 */

exports.seed = async function(knex) {
  console.log('\n💰 Creating test loans with penalties...\n');

  try {
    // Get ACME tenant
    const acmeTenant = await knex('tenants').where('subdomain', 'acme').first();
    if (!acmeTenant) {
      console.log('⏭️ ACME tenant not found, skipping');
      return;
    }

    const tenantId = acmeTenant.id;
    console.log(`✓ Found tenant: ${acmeTenant.company_name} (ID: ${tenantId})`);

    // Get customer1@acme.com
    const customer = await knex('customers')
      .where({ tenant_id: tenantId, email: 'customer1@acme.com' })
      .first();

    if (!customer) {
      console.log('⏭️ customer1@acme.com not found, skipping');
      return;
    }
    console.log(`✓ Found customer: ${customer.first_name} ${customer.last_name} (ID: ${customer.id})`);

    // Get employee1@acme.com
    const employee = await knex('users')
      .where({ tenant_id: tenantId, email: 'employee1@acme.com' })
      .first();

    if (!employee) {
      console.log('⏭️ employee1@acme.com not found, skipping');
      return;
    }
    console.log(`✓ Found employee/collector: ${employee.firstName} ${employee.lastName} (ID: ${employee.id})`);

    // Get loan products
    const personalLoan = await knex('money_loan_products')
      .where({ tenant_id: tenantId, product_code: 'PERSONAL-001' })
      .first();

    const quickLoan = await knex('money_loan_products')
      .where({ tenant_id: tenantId, product_code: 'QUICK-001' })
      .first();

    if (!personalLoan || !quickLoan) {
      console.log('⏭️ Required loan products not found, skipping');
      return;
    }
    console.log(`✓ Found loan products: Personal Loan & Quick Cash Loan`);

    // Clean up existing test loans for this customer
    const existingLoans = await knex('money_loan_loans')
      .where({ tenant_id: tenantId, customer_id: customer.id })
      .whereIn('loan_number', ['LOAN-TEST-001', 'LOAN-TEST-002', 'LOAN-TEST-003']);

    if (existingLoans.length > 0) {
      const loanIds = existingLoans.map(l => l.id);
      await knex('money_loan_collection_activities').whereIn('loan_id', loanIds).del();
      await knex('money_loan_payments').whereIn('loan_id', loanIds).del();
      await knex('money_loan_repayment_schedules').whereIn('loan_id', loanIds).del();
      await knex('money_loan_loans').whereIn('id', loanIds).del();
      console.log(`✓ Cleaned up ${existingLoans.length} existing test loans`);
    }

    const today = new Date();
    const loans = [];

    // ==================== LOAN 1: Recently Overdue (3 days) ====================
    console.log('\n📋 Creating Loan 1: Recently overdue with small penalty...');
    const loan1 = {
      tenant_id: tenantId,
      loan_number: 'LOAN-TEST-001',
      customer_id: customer.id,
      loan_product_id: personalLoan.id,
      principal_amount: 50000,
      interest_rate: 1.00,
      interest_type: 'flat',
      term_days: 180,
      total_interest: 50000 * 0.01 * 6, // 6 months
      processing_fee: 50000 * 0.02, // 2%
      total_amount: 50000 + (50000 * 0.01 * 6) + (50000 * 0.02) + 50,
      outstanding_balance: 50000 + (50000 * 0.01 * 6) + (50000 * 0.02) + 50,
      monthly_payment: (50000 + (50000 * 0.01 * 6) + (50000 * 0.02) + 50) / 6,
      status: 'active',
      disbursement_date: new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      disbursement_method: 'bank_transfer',
      approved_by: employee.id,
      disbursed_by: employee.id,
    };

    const [insertedLoan1] = await knex('money_loan_loans').insert(loan1).returning('*');
    loans.push(insertedLoan1);
    console.log(`✓ Created loan: ${loan1.loan_number} (ID: ${insertedLoan1.id})`);

    // Create repayment schedule for Loan 1 (6 monthly installments)
    const monthlyPayment1 = loan1.total_amount_due / 6;
    const loan1Schedules = [];

    for (let i = 1; i <= 6; i++) {
      const dueDate = new Date(loan1.disbursement_date);
      dueDate.setMonth(dueDate.getMonth() + i);
      
      const isOverdue = i === 1; // First installment is overdue
      const daysOverdue = isOverdue ? 3 : 0;
      const penaltyAmount = isOverdue ? (monthlyPayment1 * 0.05 * Math.floor(daysOverdue / 7)) : 0; // 5% per week

      loan1Schedules.push({
        tenant_id: tenantId,
        loan_id: insertedLoan1.id,
        installment_number: i,
        due_date: new Date(today.getTime() - (i === 1 ? 3 * 24 * 60 * 60 * 1000 : -((i - 1) * 30 - 60) * 24 * 60 * 60 * 1000)),
        principal_amount: 50000 / 6,
        interest_amount: loan1.total_interest / 6,
        total_amount: monthlyPayment1,
        amount_paid: 0,
        outstanding_amount: monthlyPayment1,
        penalty_amount: penaltyAmount,
        status: isOverdue ? 'overdue' : 'pending',
        days_overdue: daysOverdue,
      });
    }

    await knex('money_loan_repayment_schedules').insert(loan1Schedules);
    console.log(`✓ Created 6 installments (1 overdue with ₱${loan1Schedules[0].penalty_amount.toFixed(2)} penalty)`);

    // ==================== LOAN 2: Very Overdue (15 days) ====================
    console.log('\n📋 Creating Loan 2: Very overdue with high penalty...');
    const loan2 = {
      tenant_id: tenantId,
      loan_number: 'LOAN-TEST-002',
      customer_id: customer.id,
      loan_product_id: quickLoan.id,
      principal_amount: 20000,
      interest_rate: 5.00,
      interest_type: 'flat',
      term_days: 30,
      total_interest: 20000 * 0.05, // 5% flat
      processing_fee: 20000 * 0.01, // 1%
      total_amount: 20000 + (20000 * 0.05) + (20000 * 0.01) + 25,
      outstanding_balance: 20000 + (20000 * 0.05) + (20000 * 0.01) + 25,
      status: 'active',
      disbursement_date: new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
      disbursement_method: 'cash',
      approved_by: employee.id,
      disbursed_by: employee.id,
    };

    const [insertedLoan2] = await knex('money_loan_loans').insert(loan2).returning('*');
    loans.push(insertedLoan2);
    console.log(`✓ Created loan: ${loan2.loan_number} (ID: ${insertedLoan2.id})`);

    // Create repayment schedule for Loan 2 (30 daily installments)
    const dailyPayment2 = loan2.total_amount_due / 30;
    const loan2Schedules = [];

    for (let i = 1; i <= 30; i++) {
      const dueDate = new Date(loan2.disbursement_date);
      dueDate.setDate(dueDate.getDate() + i);
      
      const daysSinceDisbursement = Math.floor((today - loan2.disbursement_date) / (24 * 60 * 60 * 1000));
      const isOverdue = i <= daysSinceDisbursement && i <= 15; // First 15 installments are overdue
      const isPaid = i <= 10; // First 10 are paid
      const daysOverdue = isOverdue && !isPaid ? Math.min(daysSinceDisbursement - i, 15) : 0;
      const weeksOverdue = Math.floor(daysOverdue / 7);
      const penaltyAmount = isOverdue && !isPaid ? (dailyPayment2 * 0.10 * weeksOverdue) : 0; // 10% per week

      loan2Schedules.push({
        tenant_id: tenantId,
        loan_id: insertedLoan2.id,
        installment_number: i,
        due_date: new Date(loan2.disbursement_date.getTime() + i * 24 * 60 * 60 * 1000),
        principal_amount: 20000 / 30,
        interest_amount: loan2.total_interest / 30,
        total_amount: dailyPayment2,
        amount_paid: isPaid ? dailyPayment2 : 0,
        outstanding_amount: isPaid ? 0 : dailyPayment2,
        penalty_amount: penaltyAmount,
        status: isPaid ? 'paid' : (isOverdue ? 'overdue' : 'pending'),
        paid_date: isPaid ? new Date(dueDate.getTime() + 24 * 60 * 60 * 1000) : null,
        days_overdue: daysOverdue,
      });
    }

    await knex('money_loan_repayment_schedules').insert(loan2Schedules);
    const overdueCount2 = loan2Schedules.filter(s => s.status === 'overdue').length;
    const totalPenalty2 = loan2Schedules.reduce((sum, s) => sum + parseFloat(s.penalty_amount), 0);
    console.log(`✓ Created 30 installments (10 paid, ${overdueCount2} overdue with ₱${totalPenalty2.toFixed(2)} total penalties)`);

    // Add payment records for paid installments (use the array data directly)
    const paidSchedules2 = loan2Schedules.filter(s => s.status === 'paid');

    for (const schedule of paidSchedules2) {
      await knex('money_loan_payments').insert({
        tenant_id: tenantId,
        payment_reference: `PAY-${loan2.loan_number}-${schedule.installment_number}`,
        loan_id: insertedLoan2.id,
        customer_id: customer.id,
        amount: parseFloat(schedule.total_amount),
        principal_amount: parseFloat(schedule.principal_amount),
        interest_amount: parseFloat(schedule.interest_amount),
        penalty_amount: 0,
        payment_method: 'cash',
        payment_date: schedule.paid_date || new Date(),
        status: 'completed',
        received_by: employee.id,
        notes: `Payment for installment ${schedule.installment_number}`,
      });
    }
    console.log(`✓ Created ${paidSchedules2.length} payment records`);

    // ==================== LOAN 3: Multiple Overdue Installments ====================
    console.log('\n📋 Creating Loan 3: Multiple overdue installments...');
    const loan3 = {
      tenant_id: tenantId,
      loan_number: 'LOAN-TEST-003',
      customer_id: customer.id,
      loan_product_id: personalLoan.id,
      principal_amount: 30000,
      interest_rate: 1.00,
      interest_type: 'flat',
      term_days: 180,
      total_interest: 30000 * 0.01 * 6, // 6 months
      processing_fee: 30000 * 0.02, // 2%
      total_amount: 30000 + (30000 * 0.01 * 6) + (30000 * 0.02) + 50,
      outstanding_balance: 30000 + (30000 * 0.01 * 6) + (30000 * 0.02) + 50,
      monthly_payment: (30000 + (30000 * 0.01 * 6) + (30000 * 0.02) + 50) / 6,
      status: 'active',
      disbursement_date: new Date(today.getTime() - 120 * 24 * 60 * 60 * 1000), // 120 days ago (4 months)
      disbursement_method: 'bank_transfer',
      approved_by: employee.id,
      disbursed_by: employee.id,
    };

    const [insertedLoan3] = await knex('money_loan_loans').insert(loan3).returning('*');
    loans.push(insertedLoan3);
    console.log(`✓ Created loan: ${loan3.loan_number} (ID: ${insertedLoan3.id})`);

    // Create repayment schedule for Loan 3 (6 monthly installments)
    const monthlyPayment3 = loan3.total_amount_due / 6;
    const loan3Schedules = [];

    for (let i = 1; i <= 6; i++) {
      const dueDate = new Date(loan3.disbursement_date);
      dueDate.setMonth(dueDate.getMonth() + i);
      
      const monthsSinceDisbursement = Math.floor((today - loan3.disbursement_date) / (30 * 24 * 60 * 60 * 1000));
      const isOverdue = i <= monthsSinceDisbursement && (i === 2 || i === 3); // 2nd and 3rd installments are overdue
      const isPaid = i === 1; // First installment paid
      const daysOverdue = isOverdue ? Math.min((monthsSinceDisbursement - i) * 30 + 7, 35) : 0;
      const weeksOverdue = Math.floor(daysOverdue / 7);
      const penaltyAmount = isOverdue ? (monthlyPayment3 * 0.05 * weeksOverdue) : 0; // 5% per week

      loan3Schedules.push({
        tenant_id: tenantId,
        loan_id: insertedLoan3.id,
        installment_number: i,
        due_date: new Date(loan3.disbursement_date.getTime() + (i * 30) * 24 * 60 * 60 * 1000),
        principal_amount: 30000 / 6,
        interest_amount: loan3.total_interest / 6,
        total_amount: monthlyPayment3,
        amount_paid: isPaid ? monthlyPayment3 : 0,
        outstanding_amount: isPaid ? 0 : monthlyPayment3,
        penalty_amount: penaltyAmount,
        status: isPaid ? 'paid' : (isOverdue ? 'overdue' : 'pending'),
        paid_date: isPaid ? dueDate : null,
        days_overdue: daysOverdue,
      });
    }

    await knex('money_loan_repayment_schedules').insert(loan3Schedules);
    const overdueCount3 = loan3Schedules.filter(s => s.status === 'overdue').length;
    const totalPenalty3 = loan3Schedules.reduce((sum, s) => sum + parseFloat(s.penalty_amount), 0);
    console.log(`✓ Created 6 installments (1 paid, ${overdueCount3} overdue with ₱${totalPenalty3.toFixed(2)} total penalties)`);

    // Add payment record for paid installment
    const paidSchedule3 = loan3Schedules.find(s => s.status === 'paid');
    if (paidSchedule3) {
      await knex('money_loan_payments').insert({
        tenant_id: tenantId,
        payment_reference: `PAY-${loan3.loan_number}-1`,
        loan_id: insertedLoan3.id,
        customer_id: customer.id,
        amount: parseFloat(paidSchedule3.total_amount),
        principal_amount: parseFloat(paidSchedule3.principal_amount),
        interest_amount: parseFloat(paidSchedule3.interest_amount),
        penalty_amount: 0,
        payment_method: 'bank_transfer',
        payment_date: paidSchedule3.paid_date || paidSchedule3.due_date || new Date(),
        status: 'completed',
        received_by: employee.id,
        notes: 'Payment for installment 1',
      });
      console.log(`✓ Created 1 payment record`);
    }

    // ==================== SUMMARY ====================
    console.log('\n✅ Test loans with penalties created successfully!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`   Customer: ${customer.first_name} ${customer.last_name} (${customer.email})`);
    console.log(`   Collector: ${employee.firstName} ${employee.lastName} (${employee.email})`);
    console.log(`   Total Loans: ${loans.length}`);
    console.log('');
    console.log(`   Loan 1 (${loan1.loan_number}):`);
    console.log(`      Amount: ₱${parseFloat(loan1.principal_amount).toLocaleString()}`);
    console.log(`      Status: 1 installment overdue (3 days)`);
    console.log(`      Penalty: ₱${loan1Schedules[0].penalty_amount.toFixed(2)}`);
    console.log('');
    console.log(`   Loan 2 (${loan2.loan_number}):`);
    console.log(`      Amount: ₱${parseFloat(loan2.principal_amount).toLocaleString()}`);
    console.log(`      Status: ${overdueCount2} installments overdue (10 paid)`);
    console.log(`      Total Penalties: ₱${totalPenalty2.toFixed(2)}`);
    console.log('');
    console.log(`   Loan 3 (${loan3.loan_number}):`);
    console.log(`      Amount: ₱${parseFloat(loan3.principal_amount).toLocaleString()}`);
    console.log(`      Status: ${overdueCount3} installments overdue (1 paid)`);
    console.log(`      Total Penalties: ₱${totalPenalty3.toFixed(2)}`);
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    console.error(error);
    throw error;
  }
};
