# Setup & Seeding - Quick Reference

## TL;DR

**✅ All migrations and seeds execute automatically during `setup.ps1`**

---

## Setup Commands

### Fresh Installation (Recommended)
```powershell
# Drops database and starts fresh
psql -U postgres -c "DROP DATABASE IF EXISTS exits_saas_db"
.\setup.ps1
```

### Re-seed Existing Database
```powershell
# Keeps existing data, re-runs seeds
.\setup.ps1 -ForceSeed
```

---

## What Gets Created

### Automatic (No Manual Steps)
- ✅ All database tables (migrations)
- ✅ Tenants: ACME, TechStart
- ✅ Users: admin, employee1 (collector), customers
- ✅ **Collector role** (system-protected, name cannot be changed)
- ✅ **21 permissions** assigned to Collector role
- ✅ **Grace extension permission** (`money-loan:collector:grace-extension`)
- ✅ **5 customers** assigned to collector
- ✅ **3 loan products** (Personal, Quick Cash, Business)
- ✅ **8 loans** for all 5 customers (with overdue installments)

### Result
- Collector can log in: `employee1@acme.com` / `password`
- Route displays all 5 customers with loans
- Grace extension page ready to use

---

## Seed Execution Order

| File | Creates | Depends On |
|------|---------|------------|
| `01_initial_data.js` | Tenants, users, **Collector role**, customers | None |
| `05_money_loan_seed.js` | Loan products | Tenants |
| `07_loans_with_penalties.js` | **8 loans for 5 customers** | Loan products |

---

## Verification

### Check Customers Have Loans
```sql
SELECT c.first_name, c.last_name, COUNT(l.id) as loans
FROM customers c 
JOIN money_loan_loans l ON c.id = l.customer_id 
WHERE c.assigned_employee_id = 37
GROUP BY c.id, c.first_name, c.last_name;
```

**Expected**: 5 rows (all customers have loans)

---

## Common Issues

| Issue | Solution |
|-------|----------|
| Seeds don't run | Use `-ForceSeed` or drop database first |
| No customers in route | Run seed 07: `npx knex seed:run --specific=07_loans_with_penalties.js` |
| Loan products missing | Run seed 05: `npx knex seed:run --specific=05_money_loan_seed.js` |

---

## Files Changed

### Seed Files
- **`07_loans_with_penalties.js`** - Rewritten to create loans for ALL customers

### Migrations
- `20251111065225_add_is_system_role_to_roles.ts` - System role protection
- `20251111065803_add_collector_grace_extension_permission.ts` - Grace extension permission

### Backend
- `01_initial_data.js` - Creates Collector role with 21 permissions

---

## Status: ✅ Complete

**All seeds and migrations execute during setup.ps1**  
**No manual steps required**  
**5 customers with 8 loans created automatically**

See `SETUP-VERIFICATION-COMPLETE.md` for full details.
