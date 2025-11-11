/**
 * Seed: Loans with Penalties for Testing
 * Creates loans for all customers assigned to collector
 * Customers: All customers assigned to employee1@acme.com
 * Employee/Collector: employee1@acme.com
 */

// Helper function to create a loan with repayment schedule
async function createLoanForCustomer(knex, params) {
  const { tenantId, customer, employee, product, loanNum, isOverdue, today } = params;
  
  const loanNumber = `LOAN-TEST-${String(loanNum).padStart(3, '0')}`;
  const principalAmounts = [50000, 20000, 30000, 15000, 25000, 40000];
  const principal = principalAmounts[loanNum % principalAmounts.length];
  
  // Determine loan term based on product code
  const isDailyLoan = product.product_code === 'QUICK-001';
  const termDays = isDailyLoan ? 30 : 180; // 30 days or 6 months
  const installments = isDailyLoan ? 30 : 6;
  const daysAgo = isDailyLoan ? 45 : (60 + (loanNum * 15)); // Stagger disbursement dates
  
  // Calculate loan amounts
  const interestRate = isDailyLoan ? 5.00 : 1.00;
  const totalInterest = isDailyLoan ? (principal * 0.05) : (principal * 0.01 * (termDays / 30));
  const processingFee = principal * (isDailyLoan ? 0.01 : 0.02);
  const documentFee = isDailyLoan ? 25 : 50;
  const totalAmount = principal + totalInterest + processingFee + documentFee;
  
  const loan = {
    tenant_id: tenantId,
    loan_number: loanNumber,
    customer_id: customer.id,
    loan_product_id: product.id,
    principal_amount: principal,
    interest_rate: interestRate,
    interest_type: 'flat',
    term_days: termDays,
    total_interest: totalInterest,
    processing_fee: processingFee,
    total_amount: totalAmount,
    outstanding_balance: totalAmount,
    status: 'active',
    disbursement_date: new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000),
    disbursement_method: loanNum % 2 === 0 ? 'bank_transfer' : 'cash',
    approved_by: employee.id,
    disbursed_by: employee.id,
  };

  const [insertedLoan] = await knex('money_loan_loans').insert(loan).returning('*');
  
  // Create repayment schedule
  const paymentAmount = totalAmount / installments;
  const schedules = [];
  const daysSinceDisbursement = Math.floor((today - loan.disbursement_date) / (24 * 60 * 60 * 1000));
  
  // Determine how many installments are overdue and paid
  const installmentsPassed = isDailyLoan 
    ? Math.min(daysSinceDisbursement, installments)
    : Math.min(Math.floor(daysSinceDisbursement / 30), installments);
  
  const numPaid = isOverdue ? Math.floor(installmentsPassed * 0.6) : installmentsPassed; // 60% paid if overdue
  const numOverdue = isOverdue ? (installmentsPassed - numPaid) : 0;
  
  for (let i = 1; i <= installments; i++) {
    const daysFromDisbursement = isDailyLoan ? i : (i * 30);
    const dueDate = new Date(loan.disbursement_date.getTime() + daysFromDisbursement * 24 * 60 * 60 * 1000);
    
    const isPaid = i <= numPaid;
    const isInstallmentOverdue = !isPaid && i <= installmentsPassed;
    
    let daysOverdue = 0;
    if (isInstallmentOverdue) {
      if (isDailyLoan) {
        daysOverdue = Math.min(daysSinceDisbursement - i, 30);
      } else {
        const monthsOverdue = Math.floor(daysSinceDisbursement / 30) - i + 1;
        daysOverdue = Math.min(monthsOverdue * 30, 60);
      }
    }
    
    const weeksOverdue = Math.floor(daysOverdue / 7);
    const penaltyRate = isDailyLoan ? 0.10 : 0.05; // 10% for daily, 5% for monthly
    const penaltyAmount = isInstallmentOverdue ? (paymentAmount * penaltyRate * weeksOverdue) : 0;

    schedules.push({
      tenant_id: tenantId,
      loan_id: insertedLoan.id,
      installment_number: i,
      due_date: dueDate,
      principal_amount: principal / installments,
      interest_amount: totalInterest / installments,
      total_amount: paymentAmount,
      amount_paid: isPaid ? paymentAmount : 0,
      outstanding_amount: isPaid ? 0 : paymentAmount,
      penalty_amount: penaltyAmount,
      status: isPaid ? 'paid' : (isInstallmentOverdue ? 'overdue' : 'pending'),
      paid_date: isPaid ? new Date(dueDate.getTime() + 24 * 60 * 60 * 1000) : null,
      days_overdue: daysOverdue,
    });
  }

  await knex('money_loan_repayment_schedules').insert(schedules);
  
  // Create payment records for paid installments
  const paidSchedules = schedules.filter(s => s.status === 'paid');
  if (paidSchedules.length > 0) {
    const payments = paidSchedules.map(schedule => ({
      tenant_id: tenantId,
      payment_reference: `PAY-${loanNumber}-${schedule.installment_number}`,
      loan_id: insertedLoan.id,
      customer_id: customer.id,
      amount: parseFloat(schedule.total_amount),
      principal_amount: parseFloat(schedule.principal_amount),
      interest_amount: parseFloat(schedule.interest_amount),
      penalty_amount: 0,
      payment_method: loan.disbursement_method,
      payment_date: schedule.paid_date || new Date(),
      status: 'completed',
      received_by: employee.id,
      notes: `Payment for installment ${schedule.installment_number}`,
    }));
    
    await knex('money_loan_payments').insert(payments);
  }
  
  const overdueCount = schedules.filter(s => s.status === 'overdue').length;
  const totalPenalty = schedules.reduce((sum, s) => sum + parseFloat(s.penalty_amount), 0);
  
  console.log(`  ✓ ${loanNumber}: ₱${principal.toLocaleString()}, ${installments} installments (${paidSchedules.length} paid, ${overdueCount} overdue, ₱${totalPenalty.toFixed(2)} penalties)`);
  
  return insertedLoan;
}

exports.seed = async function(knex) {
  console.log('\n💰 Creating test loans with penalties for all assigned customers...\n');

  try {
    // Get ACME tenant
    const acmeTenant = await knex('tenants').where('subdomain', 'acme').first();
    if (!acmeTenant) {
      console.log('⏭️ ACME tenant not found, skipping');
      return;
    }

    const tenantId = acmeTenant.id;
    console.log(`✓ Found tenant: ${acmeTenant.company_name} (ID: ${tenantId})`);

    // Get employee1@acme.com (collector)
    const employee = await knex('users')
      .where({ tenant_id: tenantId, email: 'employee1@acme.com' })
      .first();

    if (!employee) {
      console.log('⏭️ employee1@acme.com not found, skipping');
      return;
    }
    console.log(`✓ Found employee/collector: ${employee.firstName} ${employee.lastName} (ID: ${employee.id})`);

    // Get all customers assigned to this collector
    const customers = await knex('customers')
      .where({ tenant_id: tenantId, assigned_employee_id: employee.id })
      .orderBy('id');

    if (customers.length === 0) {
      console.log('⏭️ No customers assigned to collector, skipping');
      return;
    }
    console.log(`✓ Found ${customers.length} customers assigned to collector`);

    // Get loan products
    const loanProducts = await knex('money_loan_products')
      .where({ tenant_id: tenantId })
      .whereIn('product_code', ['PERSONAL-001', 'QUICK-001', 'BUSINESS-001']);

    if (loanProducts.length === 0) {
      console.log('⏭️ Required loan products not found, skipping');
      return;
    }
    console.log(`✓ Found ${loanProducts.length} loan products`);

    // Clean up existing test loans for all assigned customers
    const customerIds = customers.map(c => c.id);
    const existingLoans = await knex('money_loan_loans')
      .where({ tenant_id: tenantId })
      .whereIn('customer_id', customerIds)
      .where('loan_number', 'like', 'LOAN-TEST-%');

    if (existingLoans.length > 0) {
      const loanIds = existingLoans.map(l => l.id);
      await knex('money_loan_collection_activities').whereIn('loan_id', loanIds).del();
      await knex('money_loan_payments').whereIn('loan_id', loanIds).del();
      await knex('money_loan_repayment_schedules').whereIn('loan_id', loanIds).del();
      await knex('money_loan_loans').whereIn('id', loanIds).del();
      console.log(`✓ Cleaned up ${existingLoans.length} existing test loans`);
    }

    const today = new Date();
    let totalLoansCreated = 0;

    // Create loans for each customer
    for (let customerIndex = 0; customerIndex < customers.length; customerIndex++) {
      const customer = customers[customerIndex];
      const customerNum = customerIndex + 1;
      
      console.log(`\n👤 ${customer.first_name} ${customer.last_name} (Customer ${customerNum}):`);
      
      // Each customer gets 1-2 loans with varying statuses
      const numLoans = customerIndex % 2 === 0 ? 2 : 1; // Alternate between 1 and 2 loans
      
      for (let loanIndex = 0; loanIndex < numLoans; loanIndex++) {
        const loanNum = totalLoansCreated + 1;
        const product = loanProducts[loanNum % loanProducts.length];
        const isOverdue = customerIndex < 3; // First 3 customers have overdue loans
        
        await createLoanForCustomer(knex, {
          tenantId,
          customer,
          employee,
          product,
          loanNum,
          isOverdue,
          today
        });
        
        totalLoansCreated++;
      }
    }

    console.log(`\n✅ Successfully created ${totalLoansCreated} loans for ${customers.length} customers`);
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error creating test loans:', error);
    throw error;
  }
};
