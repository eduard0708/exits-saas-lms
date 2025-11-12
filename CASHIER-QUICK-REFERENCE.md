# Cashier System - Quick Reference

## Access Points

### Web Admin Panel
Navigate to: **Money Loan** → **Cashier** (in sidebar)

### Submenu Items:
1. 📊 **Dashboard** - Overview with stats and quick actions
2. ➕ **Issue Float** - Give cash to collectors
3. ⏳ **Pending Confirmations** - Track unconfirmed floats
4. 🔄 **Pending Handovers** - Process end-of-day returns
5. 📊 **Balance Monitor** - Real-time collector balances (15s refresh)
6. 📜 **History** - Transaction log with export

---

## URL Routes

```
/platforms/money-loan/admin/cashier                          → Dashboard
/platforms/money-loan/admin/cashier/issue-float              → Issue Float Form
/platforms/money-loan/admin/cashier/pending-confirmations    → Pending List
/platforms/money-loan/admin/cashier/pending-handovers        → Handover List
/platforms/money-loan/admin/cashier/balance-monitor          → Real-time Monitor
/platforms/money-loan/admin/cashier/history                  → Transaction History
```

---

## Daily Workflow

### Morning (7:00 AM - 9:00 AM)
1. Open **Issue Float** page
2. Select collector from dropdown
3. Enter float amount and daily cap
4. Add notes (optional)
5. Click "Issue Cash Float"
6. Hand physical cash to collector
7. Monitor **Pending Confirmations** page
8. Follow up if not confirmed within 1 hour

### Throughout Day (9:00 AM - 5:00 PM)
- Keep **Balance Monitor** open (auto-refreshes every 15s)
- Watch collections and disbursements in real-time
- Check "Available for disbursement" column
- Alert collectors approaching daily cap

### End of Day (5:00 PM - 6:00 PM)
1. Open **Pending Handovers** page
2. Review each handover:
   - Check variance (should be ₱0)
   - Read collector notes
   - Verify cash physically
3. Click "✓ Confirm Receipt" if correct
4. Click "✗ Reject" if discrepancy (provide reason)

### Weekly/Monthly
- Use **History** page for reports
- Filter by date range
- Export to CSV for accounting
- Review variances and patterns

---

## Key Features

### Auto-Refresh
- Dashboard: 30 seconds
- Pending pages: 30 seconds
- Balance Monitor: 15 seconds (with countdown timer)

### Status Indicators
- 🟢 **Green** - Confirmed, Active, Exact match
- 🟡 **Yellow** - Pending, Variance detected
- 🔴 **Red** - Overdue (>1 hour), Rejected, Shortage

### Alerts
- ⚠️ Float pending over 1 hour
- ⚠️ Variance in handover amount
- 🔴 Daily cap reached

---

## Troubleshooting

### "Collector hasn't confirmed float after 1 hour"
- Call/message collector
- Verify they received the cash
- Check if they have app access
- Ask them to open loanflow app → Collector Dashboard → Cash Float

### "Handover has variance"
- Review transaction breakdown
- Check collector's notes
- Physically count cash
- If correct: Confirm anyway (variance logged)
- If incorrect: Reject with detailed reason

### "Can't see Cashier menu"
- Check user permissions
- Need: `money_loan:cash:manage`
- Contact system admin

---

## Permission

**Required**: `money_loan:cash:manage`

Users without this permission will not see the Cashier menu.

---

## Mobile Collector App

Collectors use the **loanflow** mobile app:

1. **Morning**: Collector Dashboard → Tap "Cash Float" widget → Confirm receipt
2. **During day**: Widget shows real-time balance and available cash
3. **End of day**: Collector Dashboard → "Cash Handover" → Enter actual amount → Submit

---

## Backend Dependencies

Requires these API endpoints to be functional:
- `/api/money-loan/cash/cashier-stats`
- `/api/users?role=collector`
- `/api/money-loan/cash/issue-float`
- `/api/money-loan/cash/pending-confirmations`
- `/api/money-loan/cash/pending-handovers`
- `/api/money-loan/cash/confirm-handover/:id`
- `/api/money-loan/cash/balance-monitor`
- `/api/money-loan/cash/float-history`

If pages show loading forever, check backend API is running.

---

## Tips

✅ Issue floats before collectors leave office
✅ Set realistic daily caps based on expected disbursements
✅ Follow up on unconfirmed floats within 1 hour
✅ Keep Balance Monitor open during business hours
✅ Process handovers same day (don't leave pending overnight)
✅ Export history weekly for backup
✅ Review variances monthly for patterns

---

## Support

For issues:
1. Check permission: `money_loan:cash:manage`
2. Verify backend API is running
3. Check browser console for errors (F12)
4. Contact system administrator

---

**Ready to use!** 🎉
