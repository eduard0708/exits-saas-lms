# 💰 Loan Penalty Calculator & Documentation

## 🎯 Overview
This document explains how loan penalties are calculated in the ExITS LMS system with **fair, capped penalties** to protect customers.

---

## 📋 Current System Settings

| Setting | Value | Description |
|---------|-------|-------------|
| **Grace Period** | 3-4 days | No penalty during this period |
| **Daily Penalty Rate** | **1%** | Applied per day after grace period |
| **Maximum Cap** | **20%** | Penalty never exceeds 20% of outstanding amount |
| **Applies To** | Outstanding amount only | Only unpaid portion incurs penalty |

### Product-Specific Settings

| Product | Grace Period | Penalty Rate | Max Cap |
|---------|--------------|--------------|---------|
| Personal Loan | 3 days | 1% / day | 20% |
| Business Loan | 3 days | 1% / day | 20% |
| Quick Cash Loan | 4 days | 1% / day | 20% |

---

## 🧮 Penalty Calculation Formula

### Basic Formula
```
IF days_late > grace_period THEN
  days_over_grace = days_late - grace_period
  raw_penalty = outstanding_amount × (penalty_rate / 100) × days_over_grace
  max_penalty = outstanding_amount × (cap_percent / 100)
  final_penalty = MIN(raw_penalty, max_penalty)
ELSE
  final_penalty = 0
END IF
```

### In Simple Terms
1. **Check grace period**: If within grace period → No penalty
2. **Calculate days over grace**: Subtract grace period from total days late
3. **Calculate raw penalty**: Outstanding × 1% × days over grace
4. **Apply cap**: Never exceed 20% of outstanding amount
5. **Final penalty**: Lower of raw penalty or cap

---

## 📊 Penalty Calculator Examples

### Example 1: Short Delay (Within Grace Period)
```
Installment Amount: ₱1,000
Paid: ₱0
Outstanding: ₱1,000
Days Late: 3 days
Grace Period: 4 days

Calculation:
✅ Within grace period (3 ≤ 4)
💰 Penalty: ₱0.00

Total Due: ₱1,000 + ₱0 = ₱1,000
```

### Example 2: Just Over Grace Period
```
Installment Amount: ₱1,000
Paid: ₱0
Outstanding: ₱1,000
Days Late: 10 days
Grace Period: 4 days

Calculation:
Days over grace: 10 - 4 = 6 days
Raw penalty: ₱1,000 × 1% × 6 = ₱60.00
Maximum cap: ₱1,000 × 20% = ₱200.00
💰 Final Penalty: ₱60.00 (under cap)

Total Due: ₱1,000 + ₱60 = ₱1,060
```

### Example 3: Moderate Delay
```
Installment Amount: ₱5,000
Paid: ₱0
Outstanding: ₱5,000
Days Late: 20 days
Grace Period: 4 days

Calculation:
Days over grace: 20 - 4 = 16 days
Raw penalty: ₱5,000 × 1% × 16 = ₱800.00
Maximum cap: ₱5,000 × 20% = ₱1,000.00
💰 Final Penalty: ₱800.00 (under cap)

Total Due: ₱5,000 + ₱800 = ₱5,800
```

### Example 4: Long Delay (Cap Applied)
```
Installment Amount: ₱1,000
Paid: ₱0
Outstanding: ₱1,000
Days Late: 30 days
Grace Period: 4 days

Calculation:
Days over grace: 30 - 4 = 26 days
Raw penalty: ₱1,000 × 1% × 26 = ₱260.00
Maximum cap: ₱1,000 × 20% = ₱200.00
💰 Final Penalty: ₱200.00 ⚠️ CAPPED!

Total Due: ₱1,000 + ₱200 = ₱1,200

Note: Without cap, penalty would be ₱260 (26% of principal)
Cap saves customer ₱60!
```

### Example 5: Very Long Delay (Cap Protection)
```
Installment Amount: ₱10,000
Paid: ₱0
Outstanding: ₱10,000
Days Late: 100 days
Grace Period: 4 days

Calculation:
Days over grace: 100 - 4 = 96 days
Raw penalty: ₱10,000 × 1% × 96 = ₱9,600.00 ❌
Maximum cap: ₱10,000 × 20% = ₱2,000.00 ✅
💰 Final Penalty: ₱2,000.00 ⚠️ CAPPED!

Total Due: ₱10,000 + ₱2,000 = ₱12,000

Note: Without cap, penalty would be ₱9,600 (96% of principal!)
Cap saves customer ₱7,600! 🎉
```

### Example 6: Partial Payment
```
Installment Amount: ₱1,000
Paid: ₱400
Outstanding: ₱600
Days Late: 15 days
Grace Period: 4 days

Calculation:
Days over grace: 15 - 4 = 11 days
Raw penalty: ₱600 × 1% × 11 = ₱66.00
Maximum cap: ₱600 × 20% = ₱120.00
💰 Final Penalty: ₱66.00 (under cap)

Total Due: ₱600 + ₱66 = ₱666
Already Paid: ₱400
Grand Total Remaining: ₱666
```

---

## 📈 Penalty Growth Chart

| Days Late | Days Over Grace (4) | Outstanding ₱1,000 | Penalty | % of Outstanding | Capped? |
|-----------|---------------------|-------------------|---------|------------------|---------|
| 1-4 | 0 | ₱1,000 | ₱0 | 0% | - |
| 5 | 1 | ₱1,000 | ₱10 | 1% | No |
| 10 | 6 | ₱1,000 | ₱60 | 6% | No |
| 15 | 11 | ₱1,000 | ₱110 | 11% | No |
| 20 | 16 | ₱1,000 | ₱160 | 16% | No |
| 24 | 20 | ₱1,000 | **₱200** | **20%** | **YES** |
| 30 | 26 | ₱1,000 | **₱200** | **20%** | **YES** |
| 50 | 46 | ₱1,000 | **₱200** | **20%** | **YES** |
| 100 | 96 | ₱1,000 | **₱200** | **20%** | **YES** |

**Key Insight:** Penalty reaches maximum at **24 days late** (20 days over 4-day grace period). After that, no additional penalty accrues! 🛡️

---

## 🧪 Interactive Calculator

### Quick Reference Table: ₱5,000 Outstanding

| Scenario | Days Late | Grace Left | Days Over | Raw Penalty | Cap | Final Penalty | Total Due |
|----------|-----------|------------|-----------|-------------|-----|---------------|-----------|
| **On Time** | 0 | 4 | 0 | ₱0 | ₱1,000 | **₱0** | **₱5,000** |
| **Grace Period** | 3 | 1 | 0 | ₱0 | ₱1,000 | **₱0** | **₱5,000** |
| **Just Late** | 5 | 0 | 1 | ₱50 | ₱1,000 | **₱50** | **₱5,050** |
| **1 Week Late** | 11 | 0 | 7 | ₱350 | ₱1,000 | **₱350** | **₱5,350** |
| **2 Weeks Late** | 18 | 0 | 14 | ₱700 | ₱1,000 | **₱700** | **₱5,700** |
| **3 Weeks Late** | 25 | 0 | 21 | ₱1,050 | ₱1,000 | **₱1,000** ⚠️ | **₱6,000** |
| **1 Month Late** | 34 | 0 | 30 | ₱1,500 | ₱1,000 | **₱1,000** ⚠️ | **₱6,000** |
| **2 Months Late** | 64 | 0 | 60 | ₱3,000 | ₱1,000 | **₱1,000** ⚠️ | **₱6,000** |

---

## 💡 Important Notes

### ✅ Fair Features
1. **Grace Period**: No penalty for first 3-4 days
2. **20% Cap**: Penalty never exceeds 20% of outstanding
3. **Outstanding Only**: Only unpaid amount incurs penalty
4. **Transparent**: Clear calculation shown to customer

### 🛡️ Customer Protection
- **Without cap at 1% daily**: 100 days late = 100% penalty!
- **With 20% cap**: 100 days late = Only 20% penalty maximum
- **Cap saves customers**: Up to 80% reduction in worst cases

### 📝 Business Logic
```typescript
// Code implementation (money-loan.service.ts)
calculatePenaltyWithCap(
  outstandingAmount: number,
  daysOverGrace: number,
  dailyPenaltyRate: number = 1,
  capPercent: number = 20
): number {
  if (outstandingAmount <= 0 || daysOverGrace <= 0) return 0;
  
  const rawPenalty = outstandingAmount * (dailyPenaltyRate / 100) * daysOverGrace;
  const maxPenalty = outstandingAmount * (capPercent / 100);
  const cappedPenalty = Math.min(rawPenalty, maxPenalty);
  
  return Math.round(cappedPenalty * 100) / 100; // Round to 2 decimals
}
```

---

## 🎯 Recommended Penalty Settings

### Current (Implemented) ⭐
- **Daily Rate**: 1%
- **Cap**: 20%
- **Grace**: 3-4 days
- **Assessment**: ✅ Fair & Industry-standard

### Alternative Options

#### Option A: More Lenient
- **Daily Rate**: 0.5%
- **Cap**: 15%
- **Grace**: 5 days
- **Best For**: Customer retention focus

#### Option B: Strict (Not Recommended)
- **Daily Rate**: 2%
- **Cap**: 25%
- **Grace**: 2 days
- **Best For**: Short-term/high-risk loans

#### Option C: Tiered (Advanced)
- **Days 1-10**: 0.5% per day
- **Days 11-20**: 1% per day
- **Days 21+**: 2% per day
- **Cap**: 20%
- **Best For**: Progressive discouragement

---

## 📞 Customer Communication Examples

### SMS/Email Template
```
Dear [Customer Name],

Your payment of ₱[Amount] for Loan #[Number] is now [X] days overdue.

Current Status:
• Outstanding: ₱[Outstanding]
• Grace Period: [Grace] days (consumed)
• Days Over Grace: [DaysOver] days
• Penalty: ₱[Penalty] ([Percent]% of outstanding)

Total Amount Due: ₱[Total]

Note: Penalty is capped at 20% of outstanding amount.

Please pay as soon as possible to avoid further charges.

Thank you,
ExITS Lending Team
```

### Customer Service Script
```
"Your payment is [X] days late. We have a [Y]-day grace period 
where no penalty applies. Since you're [Z] days past the grace 
period, a penalty of 1% per day applies to your outstanding amount.

However, to protect our customers, we cap penalties at 20% of 
the outstanding amount, so you'll never pay more than [Cap Amount] 
in penalties, regardless of how late the payment becomes.

Your current penalty is [Current Penalty], and your total due 
including the outstanding amount is [Total Due]."
```

---

## 🔧 Technical Implementation

### Where Penalties Are Calculated

1. **generateRepaymentSchedule()** - Line ~1770
   - Calculates penalty for each installment
   - Returns schedule with penalty amounts

2. **getCollectorRoute()** - Line ~2580
   - Calculates total penalties per loan
   - Used in collector route view

3. **calculatePenaltyWithCap()** - Line ~1365
   - Core penalty calculation logic
   - Enforces 20% cap

### Database Schema
```sql
-- Products table stores penalty settings
money_loan_products:
  - grace_period_days (INTEGER)
  - late_payment_penalty_percent (DECIMAL)

-- Installments store calculated penalties
money_loan_repayment_schedules:
  - penalty_amount (DECIMAL)
  - days_late (INTEGER)
  - status (VARCHAR: 'overdue', 'partially_paid', etc.)
```

---

## ✅ Testing Checklist

- [ ] Grace period works (no penalty within grace)
- [ ] Penalty calculation is accurate (1% daily)
- [ ] Cap is enforced (never exceeds 20%)
- [ ] Partial payments reduce penalty base
- [ ] Multiple overdue installments calculated correctly
- [ ] Frontend displays penalties correctly
- [ ] Penalty summary shows total
- [ ] Pay Penalty Only button works
- [ ] Waiver request includes penalty amount

---

## 📊 Business Impact

### Without Cap (Hypothetical)
- 30 days late: 30% penalty ❌
- 60 days late: 60% penalty ❌
- 90 days late: 90% penalty ❌
- Customer complaints: HIGH 📈

### With 20% Cap (Current System)
- 30 days late: 20% penalty (capped) ✅
- 60 days late: 20% penalty (capped) ✅
- 90 days late: 20% penalty (capped) ✅
- Customer complaints: LOW 📉
- Fair to customers: YES ✅
- Covers admin costs: YES ✅
- Industry compliant: YES ✅

---

**Last Updated**: November 9, 2025  
**System Version**: 1.0  
**Penalty Calculator**: Active with 20% Cap Protection ✅
