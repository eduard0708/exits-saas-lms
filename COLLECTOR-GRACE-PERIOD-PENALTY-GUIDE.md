# Collector Grace Period & Penalty Collection Guide

## Overview
The collector mobile app now displays grace period status and penalty information for overdue loans, helping collectors understand payment obligations and collect penalties when applicable.

## Grace Period & Penalty Flow

### 1. **Grace Period Active (Within Grace Days)**
When a loan payment is overdue but still within the grace period:

**Display in Route List:**
```
┌─────────────────────────────────────┐
│ ⏰ Within Grace Period             │
├─────────────────────────────────────┤
│ Days Overdue: 2 day(s)             │
│ Grace Remaining: 3 day(s)          │
│ ✓ No penalty yet. 5 day grace.     │
└─────────────────────────────────────┘
```

**Key Points:**
- Loan is overdue but no penalty is charged yet
- Grace period countdown is shown
- Customer can pay without penalty
- Status: Shows as "Missed" in UI

### 2. **Grace Period Expired (Beyond Grace Days)**
When a loan payment exceeds the grace period:

**Display in Route List:**
```
┌─────────────────────────────────────┐
│ ⚠️ Grace Period Expired            │
├─────────────────────────────────────┤
│ Days Overdue: 8 day(s)             │
│ Total Penalties: ₱150.00           │
│ ⓘ Penalty: 2%/day after 5 day      │
│   grace period                      │
└─────────────────────────────────────┘
```

**Key Points:**
- Penalties are accumulating daily
- Total penalty amount is displayed
- Penalty rate and grace period info shown
- Status: Shows as "Missed" with red indicators

### 3. **Payment Modal - Grace Period Info**
When collector opens payment modal, grace period status is shown:

**Within Grace Period:**
```
┌─────────────────────────────────────┐
│ Customer: John Doe                  │
│ Installment: #3                     │
│ Amount Due: ₱5,000.00              │
│                                     │
│ Days Overdue: 2 day(s)             │
│ Grace Remaining: 3 day(s)          │
│ ✓ No penalty yet - 5 day grace     │
└─────────────────────────────────────┘
```

**After Grace Period:**
```
┌─────────────────────────────────────┐
│ Customer: John Doe                  │
│ Installment: #3                     │
│ Amount Due: ₱5,000.00              │
│                                     │
│ Days Overdue: 8 day(s)             │
│ Total Penalties: ₱150.00           │
│ ⚠️ Penalty: 2%/day after 5 day     │
│    grace period                     │
└─────────────────────────────────────┘
```

## How Penalties Are Calculated

### Formula
```
Daily Penalty = Outstanding Amount × (Penalty Rate / 100)
Total Penalty = Daily Penalty × (Days Overdue - Grace Period Days)
```

### Example
**Loan Details:**
- Outstanding Amount: ₱5,000
- Penalty Rate: 2% per day
- Grace Period: 5 days
- Days Overdue: 8 days

**Calculation:**
```
Days Subject to Penalty = 8 - 5 = 3 days
Daily Penalty = ₱5,000 × 0.02 = ₱100
Total Penalty = ₱100 × 3 days = ₱300
```

## How Collectors Collect Penalties

### Step-by-Step Process

#### 1. **View Customer with Penalty**
- Navigate to Route HQ
- Look for customers with "Grace Period Expired" alert
- Red badges indicate penalty is applicable

#### 2. **Check Penalty Details**
- Click on customer card to expand details
- Review:
  - Days overdue
  - Grace period consumed status
  - Total penalties accumulated

#### 3. **Record Payment with Penalty**
- Tap "Visit" or click on installment row
- Payment modal opens showing:
  - Outstanding installment amount
  - Penalty information (if applicable)
  - Grace period status

#### 4. **Choose Payment Type**

**Option A: Full Payment (Installment + Penalty)**
```
Payment Method: Cash
Amount: ₱5,300.00 (auto-calculated)
  - Installment: ₱5,000.00
  - Penalty: ₱300.00
```

**Option B: Partial Payment**
```
Payment Method: Cash
Amount: ₱3,000.00 (manual entry)
Remaining: ₱2,300.00
  - Outstanding Installment: ₱2,000.00
  - Remaining Penalty: ₱300.00
```

#### 5. **Submit Payment**
- System records payment against installment
- Penalties are tracked separately in the schedule
- Balance updates automatically

## Important Notes for Collectors

### ✅ **DO:**
1. **Inform customers about penalties** when they are in grace period
2. **Explain daily penalty rate** before it starts accumulating
3. **Encourage payment** within grace period to avoid penalties
4. **Record accurate payment amounts** including penalties
5. **Use proper payment methods** (Cash, GCash, Cheque)

### ❌ **DON'T:**
1. **Don't waive penalties** without proper authorization
2. **Don't collect less than the total due** without marking as partial payment
3. **Don't promise grace period extensions** without approval
4. **Don't accept payment** without proper receipt/reference

## Payment Scenarios

### Scenario 1: Payment Within Grace Period
**Customer Status:**
- Days Overdue: 3
- Grace Period: 5 days
- Grace Remaining: 2 days
- Penalty: ₱0.00

**Collector Action:**
1. Inform customer they have 2 days before penalty
2. Record full installment payment: ₱5,000
3. No penalty collected
4. Status updates to "Collected"

### Scenario 2: Payment After Grace Period
**Customer Status:**
- Days Overdue: 8
- Grace Period: 5 days (expired)
- Penalty: ₱300.00

**Collector Action:**
1. Inform customer about ₱300 penalty
2. Calculate total due: ₱5,300 (₱5,000 + ₱300)
3. Record payment:
   - If full: ₱5,300
   - If partial: Amount paid (e.g., ₱3,000)
4. Remaining balance shows in system

### Scenario 3: Partial Payment with Penalty
**Customer Status:**
- Installment Due: ₱5,000
- Penalty: ₱300
- Total: ₱5,300

**Customer Pays: ₱4,000**

**System Allocation:**
1. First applies to installment: ₱4,000
2. Installment remaining: ₱1,000
3. Penalty remaining: ₱300
4. Next payment required: ₱1,300

## Technical Implementation

### Data Flow
```
1. Backend calculates:
   - Days overdue
   - Grace period remaining
   - Penalty amount
   
2. API returns to mobile:
   - gracePeriodDays: number
   - latePenaltyPercent: number
   - daysOverdue: number
   - gracePeriodRemaining: number
   - gracePeriodConsumed: boolean
   - totalPenalties: number

3. Mobile displays:
   - Grace period status
   - Penalty amount
   - Visual indicators (colors, icons)

4. Payment submission:
   - Collector enters amount
   - System records against installment
   - Penalties tracked in schedule
```

### API Endpoints Used
- `GET /api/money-loan/collectors/:id/route` - Get route with grace period data
- `GET /api/money-loan/loans/:id` - Get loan details
- `GET /api/money-loan/loans/:id/schedule` - Get repayment schedule
- `POST /api/money-loan/loans/:id/payments` - Record payment

## Troubleshooting

### Issue: Penalty not showing
**Solution:**
1. Check if loan is overdue
2. Verify grace period days in product settings
3. Ensure days overdue > grace period days

### Issue: Wrong penalty amount
**Solution:**
1. Check penalty rate in product settings
2. Verify days overdue calculation
3. Refresh loan details cache

### Issue: Cannot collect penalty
**Solution:**
1. Ensure installment status is "overdue" or "pending"
2. Check collector permissions
3. Verify payment method is valid

## FAQ

**Q: Can I waive penalties for customers?**
A: No, only authorized administrators can waive penalties through the web dashboard.

**Q: What if customer pays only installment, not penalty?**
A: Record as partial payment. System tracks both installment and penalty balances separately.

**Q: How do I know if penalty is included in payment?**
A: Payment modal shows total amount due including penalties. Review before submitting.

**Q: Can grace period be extended?**
A: Not from mobile app. Must request through supervisor/admin via web dashboard.

**Q: What happens if customer pays during grace period?**
A: No penalty charged. Full installment amount only.

## Color Coding Guide

- 🟢 **Green**: Within grace period, no penalty
- 🟡 **Yellow/Orange**: Payment overdue but in grace
- 🔴 **Red**: Grace period expired, penalties apply
- ⚪ **Gray**: Loan current, no issues

---

**Last Updated:** November 9, 2025
**Version:** 1.0
**Module:** Collector Mobile App - Route HQ
