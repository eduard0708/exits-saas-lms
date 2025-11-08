# Loan Application Form - UI Visual Guide

## Updated Payment Summary Section

### Before
```
Payment Summary
├── Loan Amount: ₱50,000
├── Processing Fee (3%): -₱1,500
├── Platform Fee (per month): -₱200
└── Net Received: ₱48,300
```

### After (with deduction indicators)
```
Payment Summary
├── Loan Amount: ₱50,000
├── Processing Fee (3%) [DEDUCTED]: -₱1,500
├── Platform Fee (per month) [DEDUCTED]: -₱200
├── Interest (5%) [DEDUCTED]: -₱2,500      ← NEW: Only shown if deducted upfront
└── Net Received: ₱45,800                   ← Reflects all upfront deductions
```

## Visual Elements

### 1. Deducted Badge
```
┌─────────────────────────────────────────────┐
│ Processing Fee (3%) ┌──────────┐           │
│                      │ DEDUCTED │  -₱1,500  │
│                      └──────────┘           │
└─────────────────────────────────────────────┘
```
**Style:**
- Background: `rgba(255, 255, 255, 0.15)`
- Border: `1px solid rgba(255, 255, 255, 0.25)`
- Text: White, 0.65rem, uppercase, bold
- Padding: 0.1rem × 0.4rem
- Border radius: 6px

### 2. Interest Upfront Badge
```
┌─────────────────────────────────────────────┐
│ Interest Rate                                │
│ 5% (Flat)                                    │
├─────────────────────────────────────────────┤
│ Total Interest ┌────────┐                   │
│                 │ UPFRONT │       ₱2,500     │
│                 └────────┘                   │
└─────────────────────────────────────────────┘
```
**Style:**
- Background: `rgba(251, 191, 36, 0.2)` (amber/warning)
- Border: `1px solid rgba(245, 158, 11, 0.4)`
- Text: `rgba(254, 243, 199, 1)` (golden yellow)
- Padding: 0.1rem × 0.35rem
- Border radius: 4px
- Font: 0.6rem, uppercase, bold

## Layout Structure

### Payment Summary Card (Gradient Background: Indigo → Violet)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  💎 Payment Summary                          ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                              ┃
┃  ┌────────────────────────────────────────┐ ┃
┃  │ Loan Amount              ₱50,000       │ ┃
┃  │ Processing Fee (3%)                    │ ┃
┃  │   [DEDUCTED]            -₱1,500        │ ┃
┃  │ Platform Fee (per month)               │ ┃
┃  │   [DEDUCTED]              -₱200        │ ┃
┃  │ Interest (5%)                          │ ┃
┃  │   [DEDUCTED]            -₱2,500        │ ┃
┃  └────────────────────────────────────────┘ ┃
┃                                              ┃
┃  ┌────────────────────────────────────────┐ ┃
┃  │ 💰 Net Received                        │ ┃
┃  │    Amount disbursed after fees         │ ┃
┃  │                            ₱45,800     │ ┃
┃  └────────────────────────────────────────┘ ┃
┃                                              ┃
┃  ┌──────────────┬─────────────────────────┐ ┃
┃  │ Interest Rate│ Total Interest [UPFRONT]│ ┃
┃  │ 5% (Flat)    │          ₱2,500         │ ┃
┃  └──────────────┴─────────────────────────┘ ┃
┃                                              ┃
┃  ┌──────────────┬─────────────────────────┐ ┃
┃  │ Total        │ Weekly                  │ ┃
┃  │ Repayment    │ Payment                 │ ┃
┃  │ ₱55,000      │ ₱1,375                  │ ┃
┃  └──────────────┴─────────────────────────┘ ┃
┃                                              ┃
┃  40 weekly payments • 10 months              ┃
┃                                              ┃
┃  ┌────────────────────────────────────────┐ ┃
┃  │ ℹ️  Fees marked as "Deducted" will be  │ ┃
┃  │     taken from the loan amount before  │ ┃
┃  │     disbursement. Net Received shows   │ ┃
┃  │     what you'll actually get.          │ ┃
┃  └────────────────────────────────────────┘ ┃
┃                                              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## Conditional Rendering Logic

### Processing Fee Display
```typescript
@if (product()!.processingFee > 0 && product()!.deductProcessingFeeInAdvance) {
  <div class="summary-line negative">
    <span class="summary-label">
      Processing Fee ({{ product()!.processingFee }}%) 
      <span class="deduct-badge">Deducted</span>
    </span>
    <span class="summary-value">-₱{{ formatCurrency(getProcessingFeeAmount()) }}</span>
  </div>
}
```

### Platform Fee Display
```typescript
@if (hasPlatformFee() && product()!.deductPlatformFeeInAdvance) {
  <div class="summary-line negative">
    <span class="summary-label">
      Platform Fee (per month) 
      <span class="deduct-badge">Deducted</span>
    </span>
    <span class="summary-value">-₱{{ formatCurrency(getPlatformFee()) }}</span>
  </div>
}
```

### Interest Display (NEW)
```typescript
@if (getTotalInterest() > 0 && product()!.deductInterestInAdvance) {
  <div class="summary-line negative">
    <span class="summary-label">
      Interest ({{ product()!.interestRate }}%) 
      <span class="deduct-badge">Deducted</span>
    </span>
    <span class="summary-value">-₱{{ formatCurrency(getTotalInterest()) }}</span>
  </div>
}
```

### Interest Badge in Details
```typescript
<p class="interest-label">
  Total Interest 
  @if (product()!.deductInterestInAdvance) {
    <span class="interest-badge">Upfront</span>
  }
</p>
```

## Color Palette

### Gradient Background (Card)
- Start: `#6366f1` (Indigo-600)
- End: `#8b5cf6` (Violet-600)

### Badge Colors
- **Deducted Badge**: White semi-transparent overlay
  - Background: `rgba(255, 255, 255, 0.15)`
  - Border: `rgba(255, 255, 255, 0.25)`
  - Text: `rgba(255, 255, 255, 0.95)`

- **Upfront Badge**: Amber/Warning tone
  - Background: `rgba(251, 191, 36, 0.2)`
  - Border: `rgba(245, 158, 11, 0.4)`
  - Text: `rgba(254, 243, 199, 1)`

### Text Colors (on gradient)
- Primary Text: `rgba(255, 255, 255, 1)`
- Secondary Text: `rgba(255, 255, 255, 0.8)`
- Negative Values: `#fca5a5` (Red-300)

## Responsive Behavior

### Mobile (< 380px)
- Badges wrap to next line if needed
- Font sizes remain unchanged (per requirement)
- Padding adjusts for smaller screens
- Badges maintain readability

### Tablet/Desktop
- Same layout, more spacious
- Badges stay inline with labels
- Enhanced hover effects visible

## Animation Effects

### Badge Entrance
- Fade in with parent container
- Part of `slideInUp` animation sequence
- Delay: 0.5s-0.6s (staggered)

### Hover Effects
- Summary lines translate right 3px on hover
- Badges inherit parent hover state
- Smooth cubic-bezier easing: `(0.4, 0, 0.2, 1)`

## Accessibility

### Screen Readers
- Badges provide contextual information
- "Deducted" clearly indicates fee is upfront
- "Upfront" clarifies interest deduction timing

### Color Contrast
- White badges on gradient: High contrast
- Amber badge: Sufficient contrast with golden text
- All text meets WCAG AA standards

## Testing Scenarios

### Scenario 1: All Fees Deducted
- Processing Fee: ✓ Deducted upfront
- Platform Fee: ✓ Deducted upfront
- Interest: ✓ Deducted upfront
- **Result**: Three badges shown, very low net proceeds

### Scenario 2: Default Configuration
- Processing Fee: ✓ Deducted upfront
- Platform Fee: ✓ Deducted upfront
- Interest: ✗ Added to repayment
- **Result**: Two badges shown, standard net proceeds

### Scenario 3: No Upfront Deductions
- Processing Fee: ✗ Added to repayment
- Platform Fee: ✗ Added to repayment
- Interest: ✗ Added to repayment
- **Result**: No badges shown, net proceeds = loan amount

### Scenario 4: Interest Only Deducted
- Processing Fee: ✗ Added to repayment
- Platform Fee: ✗ Added to repayment
- Interest: ✓ Deducted upfront
- **Result**: One badge (interest), moderate net proceeds

---

**Visual Style**: Modern, gradient-based, with clear indicators
**User Experience**: Transparent, informative, no surprises
**Consistency**: Matches overall indigo/violet theme
