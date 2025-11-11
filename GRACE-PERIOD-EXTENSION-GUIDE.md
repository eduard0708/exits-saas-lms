# Grace Period Extension System

## Overview

The grace period extension system allows collectors to add extra days to the grace period when they cannot collect payments due to external circumstances like weather, holidays, or emergencies. The system operates differently based on payment frequency to ensure fairness.

## Grace Period Behavior by Payment Frequency

### **Daily Loans - Loan-Wide Grace**

For daily payment loans, grace period is **shared across the entire loan term** (not per-installment):

```
Example: Daily loan with 2-day grace period for entire month

Day 5:  Customer misses payment → Grace: 1 day remaining (customer fault)
Day 10: Collector can't come (rain) → Grace: 1 day remaining (extension added, grace not consumed)
Day 15: Customer misses payment → Grace: 0 days remaining (customer fault)
Day 22: Collector can't come (holiday) → Grace: 0 days, NO penalty (extension added, collector didn't visit)
Day 25: Customer misses payment → Grace: 0 days, PENALTY charged (customer fault, grace exhausted)
```

**Key Points:**
- Grace is consumed only by **customer misses**, not collector unavailability
- Collector unavailability = grace extension (doesn't consume grace)
- Even with 0 grace remaining, no penalty if collector doesn't visit
- Penalties apply only when: (grace exhausted) AND (collector visited) AND (customer didn't pay)

### **Weekly/Monthly Loans - Per-Installment Grace**

For weekly and monthly loans, grace period **resets for each installment**:

```
Example: Weekly loan with 2-day grace period

Week 1: Due Jan 7 → Customer pays Jan 9 (2 days late) → Uses grace, NO penalty
Week 2: Due Jan 14 → Customer pays Jan 16 (2 days late) → Fresh 2-day grace, NO penalty  
Week 3: Due Jan 21 → Customer pays Jan 24 (3 days late) → Exceeds grace, 1 day PENALTY
Week 4: Due Jan 28 → Collector can't come (3 days) → Extension added, customer has full 2-day grace available
```

**Key Points:**
- Each installment gets **independent grace period**
- Week 1's grace usage doesn't affect Week 2
- Collector extensions apply to that specific installment only
- Extensions don't carry over to next installment

## Key Concepts

### 1. **Payment Frequency Determines Grace Scope**

- **Daily**: Grace is loan-wide, consumed across all payment days
- **Weekly/Monthly**: Grace resets per installment, independent periods

```
Weekly Loan Examples:
├─ Week 1: Due Jan 7 → Grace until Jan 9 → Collector extends 3 days → New grace until Jan 12
├─ Week 2: Due Jan 14 → Grace until Jan 16 → NO EXTENSION (independent, fresh 2-day grace)
├─ Week 3: Due Jan 21 → Grace until Jan 23 → Collector extends 2 days → New grace until Jan 25
└─ Week 4: Due Jan 28 → Grace until Jan 30 → NO EXTENSION (independent, fresh 2-day grace)
```

**Why?** For weekly/monthly loans, each installment has its own due date and circumstances. Extending Week 1 due to rain doesn't mean Week 2 will also have rain. Each installment starts with a fresh grace period.

### 2. **Collector Unavailability vs Customer Miss**

Critical distinction for penalty calculation:

**Collector Unavailability (Extension):**
- Collector can't come due to weather, holiday, emergency
- Does NOT consume customer's grace period
- No penalty even if grace exhausted (not customer's fault)
- Recorded as grace extension in system

**Customer Miss:**
- Customer doesn't pay when collector visits
- CONSUMES grace period (daily) or uses installment grace (weekly/monthly)
- Penalty applies when grace exhausted and payment still not made
- Recorded as missed payment

### 3. **Additive Grace Period**

Extensions add to the product's default grace period (or maintain it for daily):

```
Weekly/Monthly Loans (Additive):
Product Grace Period: 2 days
Collector Extension: 3 days
------------------------
Total Grace Period: 5 days for that installment

Daily Loans (Protective):
Remaining Grace: 1 day
Collector Extension: 2 days (can't come)
------------------------
Remaining Grace: Still 1 day (protected from consumption by collector unavailability)
```

### 4. **Penalty Calculation Impact**

**For Weekly/Monthly (Per-Installment):**
When grace is extended, penalties start calculating from the NEW date:

```
Without Extension:
Due Date: Jan 7
Grace Period: 2 days (until Jan 9)
Penalty Starts: Jan 10

With 3-Day Extension (Weekly/Monthly):
Due Date: Jan 7
Original Grace: 2 days
Extension: 3 days
Total Grace: 5 days (until Jan 12)
Penalty Starts: Jan 13
```

**For Daily (Loan-Wide):**
Extensions protect grace from being consumed on those days:

```
Loan Grace: 2 days total for month

Day 1-4: Paid on time → Grace: 2 days
Day 5: Customer miss → Grace: 1 day (consumed)
Day 6-9: Paid on time → Grace: 1 day
Day 10-12: Collector can't come (extension) → Grace: 1 day (protected, not consumed)
Day 13: Customer miss → Grace: 0 days (consumed)
Day 14-21: Paid on time → Grace: 0 days (exhausted)
Day 22-24: Collector can't come (extension) → Grace: 0 days, NO penalty (collector fault)
Day 25: Customer miss → Grace: 0 days, PENALTY charged (grace exhausted, customer fault)
```

## Database Schema

### Main Table: `money_loan_grace_extensions`

```sql
CREATE TABLE money_loan_grace_extensions (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  loan_id INTEGER NOT NULL,
  installment_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  
  -- Extension Details
  original_grace_days INTEGER NOT NULL,
  extension_days INTEGER NOT NULL,
  total_grace_days INTEGER NOT NULL,
  new_penalty_start_date DATE NOT NULL,
  
  -- Reason
  reason_category ENUM(
    'weather',
    'holiday', 
    'customer_emergency',
    'collector_emergency',
    'infrastructure',
    'company_policy',
    'goodwill',
    'other'
  ) NOT NULL,
  detailed_reason TEXT NOT NULL,
  metadata JSONB,
  
  -- Authorization
  granted_by INTEGER NOT NULL,
  granted_at TIMESTAMP DEFAULT NOW(),
  
  -- Approval (optional)
  approval_status ENUM('auto_approved', 'pending', 'approved', 'rejected'),
  approved_by INTEGER,
  approved_at TIMESTAMP,
  
  -- Impact Tracking
  payment_made_within_extension BOOLEAN DEFAULT FALSE,
  actual_payment_date DATE
);
```

### Supporting Fields in `money_loan_repayment_schedules`

```sql
ALTER TABLE money_loan_repayment_schedules ADD COLUMN
  grace_period_extended BOOLEAN DEFAULT FALSE,
  extended_grace_days INTEGER DEFAULT 0,
  total_grace_days INTEGER,
  extended_penalty_start_date DATE,
  extension_reason_summary TEXT;
```

### Collector Permissions: `money_loan_collector_permissions`

```sql
CREATE TABLE money_loan_collector_permissions (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  collector_id INTEGER NOT NULL,
  
  can_extend_grace BOOLEAN DEFAULT TRUE,
  max_extension_days INTEGER DEFAULT 7,
  requires_approval BOOLEAN DEFAULT FALSE,
  max_extensions_per_loan INTEGER DEFAULT 3
);
```

## Use Cases

### Case 1: Rainy Day Extension

**Scenario:** Collector cannot reach customer due to heavy rain.

```javascript
// Collector requests 2-day extension
POST /api/grace-extensions
{
  "loanId": 123,
  "installmentId": 456,
  "extensionDays": 2,
  "reasonCategory": "weather",
  "detailedReason": "Heavy rain caused flooding on customer's street, road impassable",
  "metadata": {
    "weatherReport": "link-to-weather-advisory",
    "photo": "flooded-road.jpg"
  }
}

Response:
{
  "success": true,
  "data": {
    "extensionId": 789,
    "originalGraceDays": 2,
    "extensionDays": 2,
    "totalGraceDays": 4,
    "originalPenaltyStart": "2025-01-10",
    "newPenaltyStart": "2025-01-12",
    "approvalStatus": "auto_approved"
  }
}
```

### Case 2: Holiday Extension

**Scenario:** National holiday prevents collection.

```javascript
POST /api/grace-extensions
{
  "loanId": 123,
  "installmentId": 456,
  "extensionDays": 1,
  "reasonCategory": "holiday",
  "detailedReason": "November 1 - All Saints Day, customer traveling to province",
  "metadata": {
    "holidayName": "All Saints Day",
    "isNationalHoliday": true
  }
}
```

### Case 3: Customer Emergency Extension

**Scenario:** Customer's family member hospitalized.

```javascript
POST /api/grace-extensions
{
  "loanId": 123,
  "installmentId": 456,
  "extensionDays": 5,
  "reasonCategory": "customer_emergency",
  "detailedReason": "Customer's wife hospitalized, requested extension to focus on family",
  "metadata": {
    "hospitalAdmissionProof": "medical-certificate.pdf",
    "customerCallRecording": "call-log-ref-001"
  }
}

// This requires approval since > 3 days
Response:
{
  "success": true,
  "data": {
    "extensionId": 790,
    "approvalStatus": "pending",
    "message": "Extension requires manager approval (>3 days)",
    "approvalNeededBy": "area_manager"
  }
}
```

## API Endpoints

### 1. Grant Grace Extension

```
POST /api/grace-extensions
Authorization: Bearer {collector-token}

Request Body:
{
  "loanId": number,
  "installmentId": number,
  "extensionDays": number,
  "reasonCategory": string,
  "detailedReason": string,
  "metadata": object (optional)
}

Response:
{
  "success": true,
  "data": {
    "extensionId": number,
    "originalGraceDays": number,
    "totalGraceDays": number,
    "newPenaltyStart": date,
    "approvalStatus": string
  }
}
```

### 2. Get Extension History for Loan

```
GET /api/grace-extensions/loan/:loanId
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "extensionId": 1,
      "installmentNumber": 1,
      "extensionDays": 2,
      "reasonCategory": "weather",
      "detailedReason": "Heavy rain",
      "grantedBy": "collector123",
      "grantedAt": "2025-01-08T10:30:00Z",
      "paymentMadeWithinExtension": true,
      "actualPaymentDate": "2025-01-11"
    }
  ]
}
```

### 3. Approve/Reject Extension (Manager)

```
PATCH /api/grace-extensions/:extensionId/approve
Authorization: Bearer {manager-token}

Request Body:
{
  "action": "approve" | "reject",
  "notes": "Approved due to documented emergency"
}
```

### 4. Get Collector's Extension Statistics

```
GET /api/collectors/:collectorId/grace-extensions/stats
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "totalExtensionsGranted": 15,
    "totalDaysExtended": 42,
    "successRate": 0.87, // 87% paid within extension
    "reasonBreakdown": {
      "weather": 8,
      "holiday": 4,
      "customer_emergency": 3
    },
    "averageExtensionDays": 2.8
  }
}
```

## Business Rules

### 1. **Collector Permissions**

Default permissions (can be customized per collector):
- ✅ Can extend grace: YES
- ⚠️ Max extension without approval: 3 days
- ⚠️ Requires manager approval for: > 3 days
- ⚠️ Max extensions per loan: 3 times

### 2. **Validation Rules**

```javascript
// Backend validation
if (extensionDays > collectorPermissions.maxExtensionDays) {
  approvalStatus = 'pending'; // Requires manager approval
}

if (existingExtensionsCount >= collectorPermissions.maxExtensionsPerLoan) {
  throw new Error('Maximum extensions reached for this loan');
}

if (installment.status === 'paid') {
  throw new Error('Cannot extend grace for paid installment');
}

if (installment.status === 'overdue' && daysOverdue > 30) {
  throw new Error('Installment too far overdue to extend grace');
}
```

### 3. **Penalty Calculation with Extensions**

```javascript
// Updated penalty calculation logic
function calculatePenalty(installment, loanProduct) {
  const dueDate = new Date(installment.dueDate);
  const today = new Date();
  const daysLate = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
  
  // Check if grace was extended
  let effectiveGraceDays = loanProduct.gracePeriodDays;
  
  if (installment.graceExtended) {
    effectiveGraceDays = installment.totalGraceDays;
  }
  
  // Only charge penalty if past effective grace period
  if (daysLate <= effectiveGraceDays) {
    return 0; // Within grace period (original or extended)
  }
  
  const daysOverGrace = daysLate - effectiveGraceDays;
  const penaltyRate = loanProduct.latePenaltyPercent / 100;
  const rawPenalty = installment.outstandingAmount * penaltyRate * daysOverGrace;
  const maxPenalty = installment.outstandingAmount * 0.20; // 20% cap
  
  return Math.min(rawPenalty, maxPenalty);
}
```

## Frontend Implementation

### Collector Mobile App - Extend Grace Button

```typescript
// route.page.ts
async extendGrace(loan: RouteCustomer, installment: any) {
  const alert = await this.alertController.create({
    header: 'Extend Grace Period',
    subHeader: `Installment #${installment.installmentNumber}`,
    message: `Current grace: ${loan.gracePeriodDays} days`,
    inputs: [
      {
        name: 'extensionDays',
        type: 'number',
        placeholder: 'Additional days (max 7)',
        min: 1,
        max: 7
      },
      {
        name: 'reason',
        type: 'textarea',
        placeholder: 'Reason for extension (required)'
      }
    ],
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel'
      },
      {
        text: 'Extend Grace',
        handler: async (data) => {
          if (!data.extensionDays || !data.reason) {
            const toast = await this.toastController.create({
              message: 'Please provide days and reason',
              duration: 2000,
              color: 'warning'
            });
            await toast.present();
            return false;
          }
          
          await this.submitGraceExtension(
            loan.loanId,
            installment.installmentId,
            data.extensionDays,
            data.reason
          );
          return true;
        }
      }
    ]
  });
  
  await alert.present();
}

async submitGraceExtension(loanId, installmentId, days, reason) {
  const payload = {
    loanId,
    installmentId,
    extensionDays: days,
    reasonCategory: this.determineReasonCategory(reason),
    detailedReason: reason
  };
  
  const response = await lastValueFrom(
    this.apiService.grantGraceExtension(payload)
  );
  
  if (response.data.approvalStatus === 'pending') {
    const toast = await this.toastController.create({
      message: `Extension submitted for approval (${days} days)`,
      duration: 3000,
      color: 'warning'
    });
    await toast.present();
  } else {
    const toast = await this.toastController.create({
      message: `Grace extended by ${days} days!`,
      duration: 3000,
      color: 'success'
    });
    await toast.present();
    
    // Reload loan details
    await this.loadLoanDetails(loanId);
  }
}
```

## Reporting & Analytics

### Grace Extension Report

```sql
-- Monthly grace extension report
SELECT 
  DATE_TRUNC('month', ge.granted_at) as month,
  COUNT(*) as total_extensions,
  SUM(ge.extension_days) as total_days_extended,
  AVG(ge.extension_days) as avg_days_per_extension,
  COUNT(CASE WHEN ge.payment_made_within_extension THEN 1 END) as successful_extensions,
  ROUND(
    COUNT(CASE WHEN ge.payment_made_within_extension THEN 1 END)::numeric / COUNT(*)::numeric * 100,
    2
  ) as success_rate_percent,
  ge.reason_category,
  COUNT(DISTINCT ge.collector_id) as collectors_using_feature
FROM money_loan_grace_extensions ge
WHERE ge.granted_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '6 months')
GROUP BY DATE_TRUNC('month', ge.granted_at), ge.reason_category
ORDER BY month DESC, total_extensions DESC;
```

### Collector Performance with Extensions

```sql
-- Which collectors use extensions most effectively?
SELECT 
  u.username as collector_name,
  COUNT(ge.id) as extensions_granted,
  SUM(ge.extension_days) as total_days_extended,
  COUNT(CASE WHEN ge.payment_made_within_extension THEN 1 END) as payments_received,
  ROUND(
    COUNT(CASE WHEN ge.payment_made_within_extension THEN 1 END)::numeric / COUNT(*)::numeric * 100,
    2
  ) as success_rate,
  ARRAY_AGG(DISTINCT ge.reason_category) as common_reasons
FROM money_loan_grace_extensions ge
JOIN users u ON ge.granted_by = u.id
WHERE ge.granted_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY u.id, u.username
HAVING COUNT(ge.id) > 5
ORDER BY success_rate DESC;
```

## Configuration Examples

### Tenant-Level Grace Extension Policy

```javascript
// config/grace-extension-policy.js
module.exports = {
  tenant_1: {
    enableGraceExtensions: true,
    defaultCollectorPermissions: {
      canExtendGrace: true,
      maxExtensionDays: 3,
      requiresApproval: false, // Auto-approve up to 3 days
      maxExtensionsPerLoan: 3
    },
    approvalThresholds: {
      days_4_to_7: 'area_manager',
      days_8_plus: 'branch_manager'
    },
    allowedReasons: [
      'weather',
      'holiday',
      'customer_emergency',
      'infrastructure'
    ],
    requirePhotoEvidence: ['weather', 'infrastructure']
  }
};
```

## Migration Instructions

```bash
# 1. Run the migration
cd api
npx knex migrate:latest

# 2. Verify tables created
psql -d your_database -c "SELECT COUNT(*) FROM money_loan_grace_extensions;"
psql -d your_database -c "SELECT * FROM v_grace_extensions_summary LIMIT 5;"

# 3. Set default collector permissions (optional)
node scripts/seed-collector-permissions.js

# 4. Test the feature
# - Create a test loan with overdue installment
# - Use collector account to extend grace
# - Verify penalty calculation respects extension
```

## Benefits

1. **Flexibility**: Collectors can adapt to real-world situations
2. **Customer Relations**: Shows understanding and builds trust
3. **Audit Trail**: Complete log of all extensions for compliance
4. **Performance Tracking**: Know which collectors use extensions effectively
5. **Independent Installments**: Weekly/monthly installments remain independent
6. **Controlled**: Permission system prevents abuse

## Future Enhancements

- [ ] Automatic extensions based on weather API
- [ ] Bulk extensions for area-wide events (typhoon, earthquake)
- [ ] SMS notification to customers when grace is extended
- [ ] Mobile app UI for extension requests with photo upload
- [ ] Analytics dashboard for grace extension trends
- [ ] AI-powered recommendation: "Based on weather forecast, suggest 2-day extension"
