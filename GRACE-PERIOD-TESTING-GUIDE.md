# Grace Period & Penalty - Testing Guide

## 🎯 Quick Testing Checklist

### Prerequisites
1. ✅ Backend API running
2. ✅ Mobile app compiled and running
3. ✅ Collector user logged in
4. ✅ At least one overdue loan assigned to collector

### Test Scenarios

## 📱 Scenario 1: Loan Within Grace Period

### Setup
Create/find a loan with:
- Status: Overdue
- Days overdue: 2-3 days
- Grace period: 5 days
- Expected penalty: ₱0

### Test Steps
1. **Open Mobile App** → Login as collector
2. **Navigate to Route HQ** (`/collector/route`)
3. **Find the overdue customer card**

### ✅ Expected Results
```
Customer Card should show:
┌─────────────────────────────────────┐
│ Status Badge: "Missed" (orange/red)│
│                                     │
│ Grace Period Alert:                 │
│ ⏰ Within Grace Period             │
│ Days Overdue: 2 day(s)             │
│ Grace Remaining: 3 day(s)          │
│ ✓ No penalty yet. 5 day grace.     │
└─────────────────────────────────────┘
```

4. **Click on the customer card** to expand installments
5. **Click on an overdue installment** to open payment modal

### ✅ Payment Modal Should Show
```
┌─────────────────────────────────────┐
│ 💰 Record Payment                   │
├─────────────────────────────────────┤
│ Customer: John Doe                  │
│ Installment: #3                     │
│ Amount Due: ₱5,000.00              │
│                                     │
│ [Green Background]                  │
│ Days Overdue: 2 day(s)             │
│ Grace Remaining: 3 day(s)          │
│ ✓ No penalty yet - 5 day grace     │
└─────────────────────────────────────┘
```

---

## 📱 Scenario 2: Loan Beyond Grace Period (Penalties Apply)

### Setup
Create/find a loan with:
- Status: Overdue
- Days overdue: 8 days
- Grace period: 5 days
- Penalty rate: 2% per day
- Expected penalty: ~₱300 (for ₱5,000 loan)

### Test Steps
1. **Open Mobile App** → Route HQ
2. **Find the overdue customer with expired grace**

### ✅ Expected Results
```
Customer Card should show:
┌─────────────────────────────────────┐
│ Status Badge: "Missed" (red)        │
│                                     │
│ Grace Period Alert (RED):           │
│ ⚠️ Grace Period Expired            │
│ Days Overdue: 8 day(s)             │
│ Total Penalties: ₱300.00           │
│ ⓘ Penalty: 2%/day after 5 day      │
│   grace period                      │
└─────────────────────────────────────┘
```

3. **Click to open payment modal**

### ✅ Payment Modal Should Show
```
┌─────────────────────────────────────┐
│ 💰 Record Payment                   │
├─────────────────────────────────────┤
│ Customer: John Doe                  │
│ Installment: #3                     │
│ Amount Due: ₱5,000.00              │
│                                     │
│ [Red Background]                    │
│ Days Overdue: 8 day(s)             │
│ Total Penalties: ₱300.00           │
│ ⚠️ Penalty: 2%/day after 5 day     │
│    grace period                     │
└─────────────────────────────────────┘
```

---

## 📱 Scenario 3: Record Payment (No Penalty)

### Test Steps
1. Open payment modal for loan within grace period
2. Select payment method: "Cash"
3. Keep full payment amount: ₱5,000.00
4. Tap "Record ₱5,000.00"

### ✅ Expected Results
- Success toast: "Full payment ₱5,000.00 recorded!"
- Modal closes
- Customer card updates
- Status changes to "Collected" or "Visited"

---

## 📱 Scenario 4: Record Payment (With Penalty)

### Test Steps
1. Open payment modal for loan beyond grace period
2. Note penalty amount: ₱300.00
3. Record installment payment: ₱5,000.00
4. (Note: Penalties tracked separately in schedule)

### ✅ Expected Results
- Payment recorded successfully
- System tracks payment against installment
- Penalty remains in schedule for next payment
- Customer card refreshes with updated balance

---

## 🔍 Visual Testing Checklist

### Color Coding
- [ ] Green alert for "Within Grace Period"
- [ ] Green text for "Grace Remaining"
- [ ] Red alert for "Grace Period Expired"
- [ ] Red text for "Total Penalties"
- [ ] Orange/Yellow text for "Days Overdue"

### Icons
- [ ] ⏰ (time icon) for grace period active
- [ ] ⚠️ (alert icon) for grace period expired
- [ ] ✓ (checkmark) for grace period notes
- [ ] ⓘ (info icon) for penalty notes

### Layout
- [ ] Grace period alert visible in customer card
- [ ] Alert expands properly when card is clicked
- [ ] Payment modal shows grace/penalty info
- [ ] All text is readable and properly aligned
- [ ] Mobile responsive (no overflow)

---

## 🐛 Debugging Console Logs

When testing, open Chrome DevTools (mobile) and check console for:

```javascript
// When loading route
📡 Fetching route data for collector ID: X
✅ API Response received
📋 Route data length: X
🔍 Mapped loan: { 
  gracePeriodDays: 5,
  latePenaltyPercent: 2,
  daysOverdue: 8,
  gracePeriodRemaining: 0,
  gracePeriodConsumed: true,
  totalPenalties: 300
}

// When clicking customer card
📡 Fetching loan details for loan ID: X
✅ Loan details API response

// When recording payment
💰 Recording payment: {...}
📤 Payment payload: {...}
✅ Payment recorded
```

---

## ❌ Common Issues & Solutions

### Issue 1: Grace period not showing
**Symptom:** No grace period alert visible
**Check:**
1. Is loan status "missed"?
2. Are days overdue > 0?
3. Check console for mapped loan data
4. Verify backend returns grace period fields

**Solution:** Backend should return grace_period_days from product

### Issue 2: Wrong penalty calculation
**Symptom:** Penalty amount doesn't match expected
**Check:**
1. Verify penalty rate in product settings
2. Check days overdue calculation
3. Formula: (Outstanding × Rate/100) × (Days - Grace Days)

**Debug:**
```sql
-- Check product settings
SELECT name, grace_period_days, late_payment_penalty_percent 
FROM money_loan_products 
WHERE id = ?;

-- Check loan status
SELECT * FROM money_loan_loans WHERE id = ?;

-- Check repayment schedule
SELECT * FROM money_loan_repayment_schedules WHERE loan_id = ?;
```

### Issue 3: Data not loading
**Symptom:** Empty route or loading forever
**Check:**
1. Is collector assigned to any customers?
2. Check API response in Network tab
3. Verify collector ID is correct
4. Check auth token validity

**Solution:** Assign customers to collector in web admin

---

## 📊 Test Data Creation Script

If you need to create test data, use this SQL:

```sql
-- Create overdue loan within grace period
UPDATE money_loan_repayment_schedules 
SET due_date = DATE_SUB(NOW(), INTERVAL 2 DAY),
    status = 'pending'
WHERE loan_id = ? AND installment_number = ?;

-- Create overdue loan beyond grace period
UPDATE money_loan_repayment_schedules 
SET due_date = DATE_SUB(NOW(), INTERVAL 8 DAY),
    status = 'overdue'
WHERE loan_id = ? AND installment_number = ?;

-- Set product grace period
UPDATE money_loan_products 
SET grace_period_days = 5,
    late_payment_penalty_percent = 2
WHERE id = ?;
```

---

## ✅ Final Verification

Before marking complete, verify:

1. [ ] Grace period displays correctly in route list
2. [ ] Grace period displays correctly in payment modal
3. [ ] Color coding is correct (green/red/orange)
4. [ ] Icons display properly
5. [ ] Penalty calculation is accurate
6. [ ] Payment recording works with penalties
7. [ ] Mobile responsive (test on phone/tablet)
8. [ ] Dark mode works (if applicable)
9. [ ] Console logs show correct data
10. [ ] No console errors

---

## 📞 Support

If issues persist:
1. Check `COLLECTOR-GRACE-PERIOD-PENALTY-GUIDE.md` for detailed documentation
2. Review backend logs for API errors
3. Verify database schema matches expected fields
4. Test backend endpoints directly with Postman

**Happy Testing! 🎉**
