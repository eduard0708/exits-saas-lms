# Fair Penalty Computation System

## Current Implementation (Quick Cash Loan Example)
- **Grace Period**: 4 days
- **Penalty Rate**: 10% per day after grace period
- **Calculation**: `Penalty = Outstanding Amount × (10% / 100) × Days Over Grace`
- **Issue**: Can accumulate indefinitely, potentially exceeding principal

## Proposed Improvements

### 1. Penalty Computation Options

#### Option A: Fixed Daily Penalty (Recommended for Fairness)
```
Penalty = Outstanding Amount × Daily Rate × Days Over Grace
Maximum Cap = Outstanding Amount × Max Penalty Percentage
```

**Example**:
- Outstanding: ₱1,000
- Daily Rate: 1% (more reasonable than 10%)
- Days Late: 10 days (6 days over 4-day grace)
- Penalty: ₱1,000 × 1% × 6 = ₱60
- Max Cap: 20% of ₱1,000 = ₱200 (never exceed)

#### Option B: One-Time Penalty
```
Penalty = Outstanding Amount × Fixed Percentage (applied once when grace expires)
```

**Example**:
- Outstanding: ₱1,000
- Fixed Penalty: 5%
- Penalty: ₱50 (one-time, doesn't increase daily)

#### Option C: Tiered Penalty System
```
Days 1-4: Grace period (0%)
Days 5-10: Light penalty (1% per day)
Days 11-20: Medium penalty (2% per day)
Days 21+: Heavy penalty (3% per day)
Max Cap: 30% of outstanding
```

#### Option D: Weekly Compounding
```
Penalty = Outstanding Amount × Weekly Rate × Number of Weeks Late
```

**Example**:
- Outstanding: ₱1,000
- Weekly Rate: 5%
- 2 weeks late: ₱1,000 × 5% × 2 = ₱100

### 2. Database Schema Updates

Add these fields to `money_loan_products` table:

```sql
ALTER TABLE money_loan_products ADD COLUMN IF NOT EXISTS penalty_type VARCHAR(20) DEFAULT 'daily_fixed';
-- Values: 'daily_fixed', 'one_time', 'tiered', 'weekly', 'none'

ALTER TABLE money_loan_products ADD COLUMN IF NOT EXISTS penalty_cap_percent DECIMAL(5,2) DEFAULT 20.00;
-- Maximum penalty as % of outstanding (e.g., 20% = never exceed 20% of outstanding)

ALTER TABLE money_loan_products ADD COLUMN IF NOT EXISTS penalty_tier_1_days INTEGER DEFAULT 10;
ALTER TABLE money_loan_products ADD COLUMN IF NOT EXISTS penalty_tier_1_rate DECIMAL(5,2) DEFAULT 1.00;

ALTER TABLE money_loan_products ADD COLUMN IF NOT EXISTS penalty_tier_2_days INTEGER DEFAULT 20;
ALTER TABLE money_loan_products ADD COLUMN IF NOT EXISTS penalty_tier_2_rate DECIMAL(5,2) DEFAULT 2.00;

ALTER TABLE money_loan_products ADD COLUMN IF NOT EXISTS penalty_tier_3_rate DECIMAL(5,2) DEFAULT 3.00;

ALTER TABLE money_loan_products ADD COLUMN IF NOT EXISTS penalty_applies_to VARCHAR(20) DEFAULT 'outstanding';
-- Values: 'outstanding' (only unpaid amount), 'full_installment' (entire installment amount)

ALTER TABLE money_loan_products ADD COLUMN IF NOT EXISTS penalty_compounds BOOLEAN DEFAULT FALSE;
-- TRUE: penalty on penalty, FALSE: penalty only on principal
```

### 3. Fair Penalty Examples

#### Microfinance Industry Standards (Philippines)
- **Grace Period**: 3-7 days
- **Daily Penalty**: 0.5% - 2% per day
- **Maximum Cap**: 10% - 25% of principal
- **Best Practice**: 1% daily, capped at 20%

#### Recommended Settings for Different Loan Types

**Quick Cash (7-30 days)**
- Grace: 3 days
- Daily Rate: 1%
- Max Cap: 15%
- Type: daily_fixed

**Short-Term (1-3 months)**
- Grace: 5 days
- Daily Rate: 0.5%
- Max Cap: 20%
- Type: daily_fixed

**Long-Term (6-12 months)**
- Grace: 7 days
- Daily Rate: 0.3%
- Max Cap: 25%
- Type: daily_fixed or weekly at 3%

### 4. Implementation Example

```typescript
calculatePenalty(
  outstandingAmount: number,
  daysLate: number,
  gracePeriodDays: number,
  penaltyType: string,
  dailyRate: number,
  capPercent: number
): number {
  // No penalty within grace period
  if (daysLate <= gracePeriodDays) return 0;
  
  const daysOverGrace = daysLate - gracePeriodDays;
  let penalty = 0;
  
  switch (penaltyType) {
    case 'daily_fixed':
      penalty = outstandingAmount * (dailyRate / 100) * daysOverGrace;
      break;
      
    case 'one_time':
      penalty = outstandingAmount * (dailyRate / 100);
      break;
      
    case 'weekly':
      const weeksLate = Math.ceil(daysOverGrace / 7);
      penalty = outstandingAmount * (dailyRate / 100) * weeksLate;
      break;
      
    case 'tiered':
      // Calculate based on tiers (implementation detail)
      penalty = this.calculateTieredPenalty(outstandingAmount, daysOverGrace, tierRates);
      break;
  }
  
  // Apply cap
  const maxPenalty = outstandingAmount * (capPercent / 100);
  return Math.min(penalty, maxPenalty);
}
```

### 5. UI Configuration

Add to Product Management page:
- [ ] Penalty Type dropdown
- [ ] Daily/Weekly Rate input
- [ ] Maximum Penalty Cap (%)
- [ ] Grace Period (days)
- [ ] Penalty Preview Calculator

### 6. Customer Communication

Display clearly:
```
Grace Period: 4 days
After Grace: 1% per day on unpaid amount
Maximum Penalty: 20% of unpaid amount
Example: ₱1,000 unpaid for 10 days extra = ₱100 penalty (capped at ₱200)
```

## Recommendation

**Start with Option A (Fixed Daily with Cap):**
- Grace Period: 4 days
- Daily Rate: **1%** (reduced from 10%)
- Maximum Cap: **20%** of outstanding
- Applies to: Outstanding amount only

This is:
✅ Fair to customers
✅ Predictable
✅ Industry-standard
✅ Protected by cap
✅ Easy to explain

Would you like me to implement this system?
