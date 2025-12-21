# 🏦 End of Day Handover Guide

## Overview
The End of Day (EOD) handover process allows collectors to reconcile their cash with the cashier at the close of business. This ensures accurate cash management and accountability.

---

## 🔄 Complete Handover Flow

### **Step 1: Collector Initiates Handover (Mobile)**
📱 **Platform:** Loanflow Mobile  
📍 **Route:** `/collector/dashboard` or `/collector/cash-handover`

#### From Dashboard:
1. Collector opens the **Collector HQ** dashboard
2. Scrolls to the **"End of Day"** card (prominent yellow/amber card)
3. Reviews the **"Cash to handover"** amount displayed
4. Taps **"Handover Cash"** button
5. Redirected to `/collector/cash-handover` page

#### Direct Navigation:
- Navigate directly to `/collector/cash-handover`

---

### **Step 2: Cash Count & Reconciliation (Mobile)**

On the **Cash Handover** page, the collector:

1. **Reviews Today's Summary:**
   - Opening Float: ₱X,XXX.XX
   - Collections: +₱X,XXX.XX
   - Disbursements: -₱X,XXX.XX
   - **Expected Handover:** ₱X,XXX.XX (auto-calculated)

2. **Counts Physical Cash:**
   - Manually counts all cash on hand
   - Enters the **actual amount** in the input field
   - Can tap "Use Expected Amount" if cash matches exactly

3. **Variance Check:**
   - System automatically calculates variance
   - Shows color-coded indicator:
     - ✅ **Green:** No variance (exact match)
     - ⚠️ **Yellow:** Over (excess cash)
     - 🔴 **Red:** Short (missing cash)
   - If variance exists, confirmation alert appears

4. **Location Capture:**
   - System automatically captures GPS coordinates
   - Ensures handover happens at authorized location

5. **Submit Handover:**
   - Taps **"Initiate Handover"** button
   - If variance exists, must confirm to proceed
   - System creates handover record with status: `pending_cashier_confirmation`
   - Collector receives confirmation message
   - Returns to dashboard

---

### **Step 3: Cashier Confirms Handover (Web)**
🖥️ **Platform:** Web Dashboard  
📍 **Route:** `/platforms/money-loan/dashboard/cashier/pending-handovers`

#### From Cashier Dashboard:
1. Cashier sees **"Pending Handovers"** stat card with count
2. Clicks on **"Pending Handovers"** card or badge
3. Navigated to Pending Handovers page

#### On Pending Handovers Page:
1. **Review Handover Details:**
   - Collector name and ID
   - Handover date/time
   - Expected vs Actual amounts
   - Variance (if any)
   - Location data
   - Notes (if variance exists)

2. **Physical Cash Count:**
   - Cashier physically counts the cash received
   - Verifies against the amount submitted by collector

3. **Confirm or Reject:**
   - ✅ **Confirm:** If cash matches actual amount submitted
     - Status changes to: `confirmed`
     - Collector's float is closed
     - Cash is recorded in cashier's system
   - ❌ **Reject:** If there's a discrepancy
     - Must provide reason for rejection
     - Status changes to: `rejected`
     - Collector is notified to re-submit

4. **Post-Confirmation:**
   - Handover removed from pending list
   - Dashboard stats updated
   - Collector's day is officially closed (`isDayClosed = true`)
   - Collector can no longer make transactions for that day

---

## 💡 Key Features

### **Collector Dashboard Integration**
- **End of Day Card:** Prominent yellow/amber card with handover button
- **Cash Preview:** Shows expected handover amount
- **Status Check:** Button is disabled if day is already closed
- **Quick Access:** One-tap navigation to handover page

### **Variance Handling**
- **Auto-calculation:** System calculates expected vs actual variance
- **Tolerance:** 1 centavo tolerance (₱0.01) for rounding
- **Alerts:** Warning for any variance outside tolerance
- **Notes:** Automatic variance note added to handover record

### **Location Tracking**
- GPS coordinates captured during handover initiation
- Ensures physical presence at handover location
- Security and audit trail

### **Real-time Updates**
- Dashboard auto-refreshes every 30 seconds
- Collectors see updated balances immediately
- Cashier sees new handovers in real-time

---

## 📊 Dashboard Views

### **Collector Dashboard (Mobile)**
```
┌─────────────────────────────────────┐
│  💰 Cashier HQ                      │
├─────────────────────────────────────┤
│                                     │
│  📈 Daily Progress                  │
│  Collections: ₱10,000 / ₱15,000     │
│  Visits: 8 / 10                     │
│                                     │
│  💰 Cash Balance Widget             │
│  On Hand: ₱25,000                   │
│  Available: ₱15,000                 │
│                                     │
│  🏦 End of Day                      │
│  ┌─────────────────────────────┐   │
│  │ Close day & handover cash   │   │
│  │                             │   │
│  │ Cash to handover: ₱25,000   │   │
│  │                             │   │
│  │  [💰 Handover Cash]         │   │
│  └─────────────────────────────┘   │
│                                     │
│  📍 Start Visit  |  👥 My Customers │
└─────────────────────────────────────┘
```

### **Cashier Dashboard (Web)**
```
┌─────────────────────────────────────┐
│  💰 Cashier Dashboard               │
├─────────────────────────────────────┤
│                                     │
│  ⏳ Pending         🏦 Pending      │
│  Confirmations      Handovers       │
│       2                 3           │
│                                     │
│  👥 All Collectors Table            │
│  ┌─────────────────────────────┐   │
│  │ Name    │ Status  │ On Hand │   │
│  ├─────────┼─────────┼─────────┤   │
│  │ John D. │ Active  │ ₱25,000 │   │
│  │ Jane S. │ Pending │ ₱18,500 │   │
│  │ Mike R. │ Active  │ ₱30,000 │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## 🔐 Security & Validation

### **Business Rules**
- ✅ Collector can only initiate one handover per day
- ✅ Cannot handover if day is already closed
- ✅ Cannot make transactions after day is closed
- ✅ Must have confirmed float before handover
- ✅ Cashier must physically verify cash before confirming

### **Audit Trail**
Every handover records:
- Collector ID and name
- Handover timestamp
- GPS coordinates
- Expected vs Actual amounts
- Variance and notes
- Cashier ID who confirmed
- Confirmation timestamp
- Status history

---

## 🛠️ Technical Implementation

### **API Endpoints**

#### Collector (Mobile):
- `GET /api/money-loan/cash/balance` - Get current cash balance
- `POST /api/money-loan/cash/initiate-handover` - Submit handover

#### Cashier (Web):
- `GET /api/money-loan/cash/pending-handovers` - List pending handovers
- `POST /api/money-loan/cash/confirm-handover/:id` - Confirm/reject handover

### **Data Flow**
```
Collector Mobile → API → Database → API → Cashier Web
     ↓                                         ↓
  Handover                                Confirmation
  Initiated                               Processing
     ↓                                         ↓
  Status:                                 Status:
  pending_cashier_confirmation            confirmed/rejected
```

---

## 📱 User Experience

### **Collector Experience**
1. **Morning:** Receive and confirm float from cashier
2. **Throughout Day:** Make collections and disbursements
3. **End of Day:** 
   - Review cash balance on dashboard
   - Tap "Handover Cash" button
   - Count physical cash
   - Submit handover
   - Wait for cashier confirmation
4. **Post-Handover:** Cannot make new transactions, day is closed

### **Cashier Experience**
1. **Throughout Day:** Monitor collector balances in real-time
2. **End of Day:**
   - See pending handovers badge
   - Review each handover submission
   - Count physical cash received
   - Confirm or reject handovers
3. **Post-Confirmation:** Update records, reconcile totals

---

## 🎯 Best Practices

### **For Collectors:**
- ✅ Count cash carefully before submitting
- ✅ Ensure you're at the office location for GPS capture
- ✅ Submit handover as soon as your day ends
- ✅ Keep physical cash secure until confirmed
- ✅ If variance exists, note the reason

### **For Cashiers:**
- ✅ Verify cash count thoroughly
- ✅ Review variance reasons before confirming
- ✅ Confirm handovers promptly
- ✅ If rejecting, provide clear reason
- ✅ Keep audit trail for all transactions

---

## 🚀 Quick Reference

| Action | Platform | Route | Who |
|--------|----------|-------|-----|
| Initiate Handover | Mobile | `/collector/cash-handover` | Collector |
| View Pending | Web | `/platforms/money-loan/dashboard/cashier/pending-handovers` | Cashier |
| Confirm Handover | Web | `/platforms/money-loan/dashboard/cashier/pending-handovers` | Cashier |
| Monitor Balances | Web | `/platforms/money-loan/dashboard/cashier/balance-monitor` | Cashier |

---

## 📞 Support

If you encounter issues:
1. Check your internet connection
2. Verify GPS is enabled (for collectors)
3. Ensure you have proper permissions
4. Contact system administrator if problem persists

---

**Last Updated:** December 21, 2025  
**Version:** 1.0
