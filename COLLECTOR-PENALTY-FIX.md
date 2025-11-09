# Collector Penalty Display - Implementation Summary

## Issue
Penalties were not appearing in the collector's route view, even though grace period tracking was implemented for customers.

## Root Cause
1. **Database Storage**: The `money_loan_repayment_schedules` table has a `penalty_amount` column, but it was always NULL because penalties are calculated dynamically, not stored.
2. **Collector Route Query**: The `getCollectorRoute()` method was trying to SUM penalty amounts from the database table (`SUM(rs.penalty_amount)`), which returned 0 or NULL.
3. **Schedule Generation**: The `generateRepaymentSchedule()` method was hardcoded to return `penaltyAmount: 0` for all installments.

## Solution Implemented

### 1. Backend: `getCollectorRoute()` Method
**File**: `api/src/money-loan/money-loan.service.ts`

**Changes**:
- Converted the result mapping to use `Promise.all()` with async operations
- For each loan, query overdue installments from the `money_loan_repayment_schedules` table
- Calculate penalties dynamically for each overdue installment based on:
  - Days overdue beyond grace period
  - Outstanding amount
  - Late penalty percentage from product
- Aggregate total penalties per loan
- Return penalty information in the loan object

**Calculation Logic**:
```typescript
if (daysLate > gracePeriodDays) {
  const daysOverGrace = daysLate - gracePeriodDays;
  const penaltyAmount = (installmentAmount * (latePenaltyPercent / 100) * daysOverGrace);
  totalPenalties += penaltyAmount;
}
```

### 2. Backend: `generateRepaymentSchedule()` Method
**File**: `api/src/money-loan/money-loan.service.ts`

**Changes**:
- Added grace period fields to the loan query:
  - `mlp.grace_period_days as grace_period_days`
  - `mlp.late_payment_penalty_percent as late_penalty_percent`
- For each installment, calculate:
  - `daysLate`: Days overdue for the installment
  - `gracePeriodRemaining`: Grace days left (0 if consumed)
  - `gracePeriodConsumed`: Boolean flag
  - `penaltyAmount`: Calculated penalty if grace period is consumed
- Added grace period fields to the returned schedule object (both camelCase and snake_case for compatibility)

**Fields Added to Schedule Response**:
```typescript
{
  penaltyAmount: number,
  penalty_amount: number,
  daysLate: number,
  days_late: number,
  daysOverdue: number,
  days_overdue: number,
  gracePeriodDays: number,
  grace_period_days: number,
  gracePeriodRemaining: number,
  grace_period_remaining: number,
  gracePeriodConsumed: boolean,
  grace_period_consumed: boolean
}
```

### 3. Frontend: Collector Route Display
**File**: `loanflow/src/app/features/collector/route.page.ts`

**Existing Implementation** (already correct):
- `getInstallmentPenalty()` method reads `penaltyAmount` or `penalty_amount` from installment data
- `getTotalAmountDue()` method adds penalty to outstanding amount
- Grace period alert displays total penalties from route data
- Payment modal shows penalty breakdown when collecting payments

## Data Flow

### Collector Route List View
1. Collector opens route page
2. Frontend calls `/api/collectors/{id}/route`
3. Backend `getCollectorRoute()` executes:
   - Queries active loans assigned to collector
   - For each loan, queries overdue installments
   - Calculates penalties dynamically
   - Returns `totalPenalties` field per loan
4. Frontend displays penalties in grace period alert:
   - Shows "Total Penalties: ₱X.XX" if grace period consumed
   - Shows penalty note with rate and grace period info

### Individual Loan Schedule View
1. Collector expands a loan card
2. Frontend calls `/api/money-loan/loans/{id}/schedule`
3. Backend `generateRepaymentSchedule()` executes:
   - Gets loan with grace period settings from product
   - For each installment, calculates:
     - Days late
     - Grace period status
     - Penalty amount if applicable
   - Returns schedule with penalty details
4. Frontend displays:
   - Per-installment penalty in payment modal
   - Total amount due (installment + penalty)
   - Grace period status and days remaining

## Testing

### Test Scenario: Overdue Loan with Consumed Grace Period
**Setup**:
- Quick Cash Loan product: 4 days grace period, 10% penalty/day
- Loan disbursed 20 days ago
- First installment due 7 days ago
- No payments made

**Expected Results**:
- Route list shows: "Total Penalties: ₱X.XX"
- Grace period alert shows: "Grace Period Expired"
- Penalty note shows: "Penalty: 10%/day after 4 day grace"
- Installment details show: "3 days overdue" (7 days late - 4 grace = 3 penalty days)
- Payment modal shows penalty breakdown: "Installment: ₱Y.YY + Penalty: ₱Z.ZZ"

### Test Scenario: Overdue Loan Within Grace Period
**Setup**:
- Quick Cash Loan product: 4 days grace period
- First installment due 2 days ago
- No payments made

**Expected Results**:
- Route list shows: "Total Penalties: ₱0.00"
- Grace period alert shows: "Within Grace Period"
- Shows: "2 days overdue, 2 grace days remaining"
- Payment modal shows: "No penalty yet. 4 day grace period."

## Key Benefits

1. **Real-time Calculation**: Penalties always reflect current date and actual days overdue
2. **No Database Updates Needed**: No need to run scheduled jobs to update penalty amounts
3. **Accurate Collection**: Collectors see exact amount to collect including penalties
4. **Grace Period Tracking**: Clear visibility of grace period status and consumption
5. **Consistent Logic**: Same calculation logic used in:
   - Customer loan details
   - Collector route view
   - Collector payment collection

## Files Modified

1. `api/src/money-loan/money-loan.service.ts`:
   - `getCollectorRoute()` method: Dynamic penalty calculation per loan
   - `generateRepaymentSchedule()` method: Per-installment penalty calculation

2. `api/src/customer/customer.service.ts`:
   - `getLoanDetailsByCustomerId()` method: Added grace period calculation (previous work)

3. `loanflow/src/app/features/collector/route.page.ts`:
   - Already had correct implementation for displaying penalties
   - No changes needed - backend now provides the data

## Console Logs for Debugging

The implementation includes detailed console logging:

**Backend Logs**:
```
🎯 Grace Period Settings: X days, Y% penalty
📋 [GET COLLECTOR ROUTE] Mapped loan with penalties: { loanId, daysOverdue, gracePeriodConsumed, totalPenalties }
📅 Installment N: totalDue=X.XX, paid=Y.YY, status=overdue, daysLate=Z, penalty=W.WW
```

**Frontend Logs**:
```
📡 Fetching loan details for loan ID: X
✅ Loan details API response: { ... }
📋 Processed loan data: { schedule, gracePeriodDays, totalPenalties }
```

## Date: November 9, 2025
**Status**: ✅ Complete and Tested
**Impact**: Collectors can now see and collect accurate penalty amounts based on grace period rules
