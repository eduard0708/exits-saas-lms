# Grace Period Extension UI Implementation Guide

## Overview

This guide covers how to implement the grace period extension feature in the collector mobile app, supporting both single-customer and bulk (multiple customers) scenarios.

## Scenarios

### Scenario 1: Single Customer Extension
Collector visits customer but cannot collect (customer not home, emergency, etc.)

### Scenario 2: Bulk Extension - Same Reason
Collector cannot collect from multiple customers due to same reason (heavy rain, road closed, etc.)

### Scenario 3: Route-Wide Extension
Entire route affected by weather/holiday - extend grace for all customers scheduled today

### Scenario 4: Emergency Extension
Manager grants company-wide extension (typhoon, national emergency, etc.)

---

## UI Implementation

### 1. Single Customer Grace Extension

#### Location: `route.page.ts` - Add to Customer Card Actions

**Button Placement:**
```html
<!-- In customer card actions, after "Request Penalty Waiver" button -->
<ion-button
  fill="outline"
  size="small"
  color="primary"
  (click)="extendGracePeriod(loan, $event)"
  *ngIf="canExtendGrace(loan)">
  <ion-icon slot="start" name="time-outline"></ion-icon>
  Extend Grace
</ion-button>
```

**TypeScript Implementation:**
```typescript
// Add to route.page.ts

// Check if grace can be extended
canExtendGrace(loan: RouteCustomer): boolean {
  // Only show if loan has overdue installments or due today
  return loan.status !== 'collected' && 
         loan.outstandingBalance > 0 &&
         (loan.nextInstallment !== null || loan.daysOverdue > 0);
}

// Open grace extension modal for single customer
async extendGracePeriod(loan: RouteCustomer, event: Event) {
  event.stopPropagation(); // Prevent card expansion
  
  const details = this.getLoanDetailsFromCache(loan.loanId);
  if (!details || !details.schedule) {
    const toast = await this.toastController.create({
      message: 'Please expand loan details first',
      duration: 2000,
      color: 'warning'
    });
    await toast.present();
    return;
  }

  // Get overdue/due-today installments
  const eligibleInstallments = details.schedule.filter(inst => 
    inst.status === 'overdue' || 
    inst.status === 'pending' ||
    inst.status === 'partially_paid'
  );

  if (eligibleInstallments.length === 0) {
    const toast = await this.toastController.create({
      message: 'No installments eligible for grace extension',
      duration: 2000,
      color: 'info'
    });
    await toast.present();
    return;
  }

  // Open modal
  this.showGraceExtensionModal(loan, eligibleInstallments);
}

// Grace extension modal
async showGraceExtensionModal(loan: RouteCustomer, installments: any[]) {
  const alert = await this.alertController.create({
    header: '⏰ Extend Grace Period',
    subHeader: loan.customerName,
    message: `Current grace: ${loan.gracePeriodDays || 0} days<br>
              Eligible installments: ${installments.length}`,
    inputs: [
      {
        name: 'extensionDays',
        type: 'number',
        placeholder: 'Additional days (1-7)',
        min: 1,
        max: 7,
        value: 2
      },
      {
        name: 'reason',
        type: 'radio',
        label: '🌧️ Heavy rain/flood',
        value: 'weather',
        checked: true
      },
      {
        name: 'reason',
        type: 'radio',
        label: '🏖️ Holiday/weekend',
        value: 'holiday'
      },
      {
        name: 'reason',
        type: 'radio',
        label: '🚑 Customer emergency',
        value: 'customer_emergency'
      },
      {
        name: 'reason',
        type: 'radio',
        label: '🤒 Collector emergency',
        value: 'collector_emergency'
      },
      {
        name: 'reason',
        type: 'radio',
        label: '🚧 Road/infrastructure issue',
        value: 'infrastructure'
      },
      {
        name: 'reason',
        type: 'radio',
        label: '🤝 Goodwill gesture',
        value: 'goodwill'
      },
      {
        name: 'reason',
        type: 'radio',
        label: '📝 Other',
        value: 'other'
      },
      {
        name: 'detailedReason',
        type: 'textarea',
        placeholder: 'Detailed explanation (required)'
      }
    ],
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel'
      },
      {
        text: 'Apply to Selected',
        handler: async (data) => {
          return this.showInstallmentSelector(loan, installments, data);
        }
      },
      {
        text: 'Apply to All',
        cssClass: 'alert-button-confirm',
        handler: async (data) => {
          return this.submitGraceExtension(
            loan,
            installments,
            data.extensionDays,
            data.reason,
            data.detailedReason
          );
        }
      }
    ],
    cssClass: 'grace-extension-alert'
  });

  await alert.present();
}

// Show installment selector
async showInstallmentSelector(
  loan: RouteCustomer, 
  installments: any[], 
  extensionData: any
) {
  const alert = await this.alertController.create({
    header: 'Select Installments',
    message: 'Choose which installments to extend',
    inputs: installments.map(inst => ({
      name: `inst_${inst.installmentId}`,
      type: 'checkbox',
      label: `Installment #${inst.installmentNumber} - ₱${this.formatCurrency(inst.outstandingAmount)}`,
      value: inst.installmentId,
      checked: true // All checked by default
    })),
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel'
      },
      {
        text: 'Extend Selected',
        handler: async (selectedIds) => {
          if (!selectedIds || selectedIds.length === 0) {
            const toast = await this.toastController.create({
              message: 'Please select at least one installment',
              duration: 2000,
              color: 'warning'
            });
            await toast.present();
            return false;
          }

          const selectedInstallments = installments.filter(inst => 
            selectedIds.includes(inst.installmentId)
          );

          return this.submitGraceExtension(
            loan,
            selectedInstallments,
            extensionData.extensionDays,
            extensionData.reason,
            extensionData.detailedReason
          );
        }
      }
    ]
  });

  await alert.present();
  return false; // Keep original alert open
}

// Submit grace extension to backend
async submitGraceExtension(
  loan: RouteCustomer,
  installments: any[],
  extensionDays: number,
  reasonCategory: string,
  detailedReason: string
) {
  // Validation
  if (!extensionDays || extensionDays < 1 || extensionDays > 7) {
    const toast = await this.toastController.create({
      message: 'Extension must be between 1-7 days',
      duration: 2000,
      color: 'danger'
    });
    await toast.present();
    return false;
  }

  if (!detailedReason || detailedReason.trim().length < 10) {
    const toast = await this.toastController.create({
      message: 'Please provide detailed reason (min 10 characters)',
      duration: 2000,
      color: 'danger'
    });
    await toast.present();
    return false;
  }

  // Show loading
  const loading = await this.loadingController.create({
    message: `Extending grace for ${installments.length} installment(s)...`
  });
  await loading.present();

  try {
    // Call API for each installment
    const promises = installments.map(inst => 
      lastValueFrom(this.apiService.grantGraceExtension({
        loanId: loan.loanId,
        installmentId: inst.installmentId,
        extensionDays: parseInt(extensionDays),
        reasonCategory: reasonCategory,
        detailedReason: detailedReason.trim()
      }))
    );

    const results = await Promise.all(promises);
    
    // Check if any need approval
    const needsApproval = results.some(r => r.data?.approvalStatus === 'pending');
    
    await loading.dismiss();

    if (needsApproval) {
      const toast = await this.toastController.create({
        message: `Grace extension submitted for manager approval (${extensionDays} days)`,
        duration: 4000,
        color: 'warning',
        icon: 'hourglass-outline'
      });
      await toast.present();
    } else {
      const toast = await this.toastController.create({
        message: `✅ Grace extended by ${extensionDays} days for ${installments.length} installment(s)`,
        duration: 4000,
        color: 'success',
        icon: 'checkmark-circle-outline'
      });
      await toast.present();
    }

    // Reload loan details to show updated grace period
    await this.loadLoanDetails(loan.loanId);
    
    return true;
  } catch (error) {
    await loading.dismiss();
    console.error('Grace extension error:', error);
    
    const toast = await this.toastController.create({
      message: error.error?.message || 'Failed to extend grace period',
      duration: 3000,
      color: 'danger'
    });
    await toast.present();
    
    return false;
  }
}
```

---

### 2. Bulk Grace Extension (Multiple Customers)

#### Location: Add Floating Action Button (FAB) or Top Bar Action

**HTML Template (Add to route.page.html):**
```html
<!-- Floating Action Button for Bulk Actions -->
<ion-fab vertical="bottom" horizontal="end" slot="fixed" *ngIf="filteredCustomers().length > 0">
  <ion-fab-button color="primary">
    <ion-icon name="ellipsis-vertical"></ion-icon>
  </ion-fab-button>
  <ion-fab-list side="top">
    <ion-fab-button 
      color="tertiary"
      (click)="bulkExtendGrace()"
      title="Bulk Extend Grace">
      <ion-icon name="time-outline"></ion-icon>
    </ion-fab-button>
    <ion-fab-button 
      color="warning"
      (click)="bulkWaivePenalties()"
      title="Bulk Waive Penalties">
      <ion-icon name="cash-outline"></ion-icon>
    </ion-fab-button>
  </ion-fab-list>
</ion-fab>

<!-- OR add to top bar -->
<ion-button 
  slot="end" 
  fill="clear" 
  (click)="bulkExtendGrace()"
  *ngIf="isOnline()">
  <ion-icon slot="icon-only" name="time-outline"></ion-icon>
</ion-button>
```

**TypeScript Implementation:**
```typescript
// Bulk grace extension
async bulkExtendGrace() {
  // Step 1: Get all customers with pending collections
  const eligibleLoans = this.filteredCustomers().filter(loan => 
    loan.status !== 'collected' && 
    loan.outstandingBalance > 0
  );

  if (eligibleLoans.length === 0) {
    const toast = await this.toastController.create({
      message: 'No customers eligible for grace extension',
      duration: 2000,
      color: 'info'
    });
    await toast.present();
    return;
  }

  // Step 2: Show customer selection modal
  const alert = await this.alertController.create({
    header: '⏰ Bulk Grace Extension',
    message: `Select customers to extend grace period`,
    inputs: eligibleLoans.map(loan => ({
      name: `loan_${loan.loanId}`,
      type: 'checkbox',
      label: `${loan.customerName} - ${loan.loanNumber}`,
      value: loan.loanId,
      checked: true // All checked by default
    })),
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel'
      },
      {
        text: 'Select All',
        handler: () => {
          // Keep modal open, just check all boxes
          alert.inputs?.forEach(input => {
            if (input.type === 'checkbox') input.checked = true;
          });
          return false;
        }
      },
      {
        text: 'Continue',
        handler: async (selectedLoanIds) => {
          if (!selectedLoanIds || selectedLoanIds.length === 0) {
            const toast = await this.toastController.create({
              message: 'Please select at least one customer',
              duration: 2000,
              color: 'warning'
            });
            await toast.present();
            return false;
          }

          const selectedLoans = eligibleLoans.filter(loan => 
            selectedLoanIds.includes(loan.loanId)
          );

          await this.showBulkGraceExtensionForm(selectedLoans);
          return true;
        }
      }
    ],
    cssClass: 'bulk-selection-alert'
  });

  await alert.present();
}

// Show bulk grace extension form
async showBulkGraceExtensionForm(selectedLoans: RouteCustomer[]) {
  const alert = await this.alertController.create({
    header: '⏰ Bulk Grace Extension',
    subHeader: `${selectedLoans.length} customer(s) selected`,
    inputs: [
      {
        name: 'extensionDays',
        type: 'number',
        placeholder: 'Additional days (1-7)',
        min: 1,
        max: 7,
        value: 2
      },
      {
        type: 'radio',
        label: '🌧️ Heavy rain/flood',
        value: 'weather',
        name: 'reason',
        checked: true
      },
      {
        type: 'radio',
        label: '🏖️ Holiday/weekend',
        value: 'holiday',
        name: 'reason'
      },
      {
        type: 'radio',
        label: '🚧 Road/infrastructure issue',
        value: 'infrastructure',
        name: 'reason'
      },
      {
        type: 'radio',
        label: '🤒 Collector emergency',
        value: 'collector_emergency',
        name: 'reason'
      },
      {
        type: 'radio',
        label: '🏢 Company policy',
        value: 'company_policy',
        name: 'reason'
      },
      {
        type: 'radio',
        label: '📝 Other',
        value: 'other',
        name: 'reason'
      },
      {
        name: 'detailedReason',
        type: 'textarea',
        placeholder: 'Detailed explanation (e.g., "Heavy rain and flooding on Main St, cannot access customer area")'
      }
    ],
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel'
      },
      {
        text: `Extend for ${selectedLoans.length} Customer(s)`,
        cssClass: 'alert-button-confirm',
        handler: async (data) => {
          return this.submitBulkGraceExtension(
            selectedLoans,
            data.extensionDays,
            data.reason,
            data.detailedReason
          );
        }
      }
    ],
    cssClass: 'grace-extension-alert'
  });

  await alert.present();
}

// Submit bulk grace extension
async submitBulkGraceExtension(
  loans: RouteCustomer[],
  extensionDays: number,
  reasonCategory: string,
  detailedReason: string
) {
  // Validation
  if (!extensionDays || extensionDays < 1 || extensionDays > 7) {
    const toast = await this.toastController.create({
      message: 'Extension must be between 1-7 days',
      duration: 2000,
      color: 'danger'
    });
    await toast.present();
    return false;
  }

  if (!detailedReason || detailedReason.trim().length < 10) {
    const toast = await this.toastController.create({
      message: 'Please provide detailed reason (min 10 characters)',
      duration: 2000,
      color: 'danger'
    });
    await toast.present();
    return false;
  }

  // Show loading with progress
  const loading = await this.loadingController.create({
    message: `Processing 0 of ${loans.length} loans...`,
    spinner: 'crescent'
  });
  await loading.present();

  let successCount = 0;
  let failCount = 0;
  let approvalNeededCount = 0;

  try {
    // Process each loan
    for (let i = 0; i < loans.length; i++) {
      const loan = loans[i];
      
      // Update loading message
      loading.message = `Processing ${i + 1} of ${loans.length} loans...`;

      try {
        // Get loan details to find installments
        const details = this.getLoanDetailsFromCache(loan.loanId);
        if (!details) {
          await this.loadLoanDetails(loan.loanId);
          const freshDetails = this.getLoanDetailsFromCache(loan.loanId);
          if (!freshDetails) {
            failCount++;
            continue;
          }
        }

        const eligibleInstallments = details.schedule?.filter(inst => 
          inst.status === 'overdue' || 
          inst.status === 'pending' ||
          inst.status === 'partially_paid'
        ) || [];

        if (eligibleInstallments.length === 0) {
          failCount++;
          continue;
        }

        // Submit extension for all eligible installments
        const promises = eligibleInstallments.map(inst => 
          lastValueFrom(this.apiService.grantGraceExtension({
            loanId: loan.loanId,
            installmentId: inst.installmentId,
            extensionDays: parseInt(extensionDays),
            reasonCategory: reasonCategory,
            detailedReason: `BULK: ${detailedReason.trim()}`
          }))
        );

        const results = await Promise.all(promises);
        
        if (results.some(r => r.data?.approvalStatus === 'pending')) {
          approvalNeededCount++;
        } else {
          successCount++;
        }

        // Reload loan details
        await this.loadLoanDetails(loan.loanId);

      } catch (error) {
        console.error(`Failed to extend grace for loan ${loan.loanId}:`, error);
        failCount++;
      }
    }

    await loading.dismiss();

    // Show summary
    const message = `
      ✅ Success: ${successCount}
      ⏳ Pending Approval: ${approvalNeededCount}
      ❌ Failed: ${failCount}
    `;

    const alert = await this.alertController.create({
      header: 'Bulk Grace Extension Complete',
      message: message,
      buttons: ['OK']
    });
    await alert.present();

    // Refresh route data
    await this.loadRouteData();

    return true;
  } catch (error) {
    await loading.dismiss();
    console.error('Bulk grace extension error:', error);
    
    const toast = await this.toastController.create({
      message: 'Failed to process bulk grace extension',
      duration: 3000,
      color: 'danger'
    });
    await toast.present();
    
    return false;
  }
}
```

---

### 3. Quick "Can't Collect Today" Button

#### Location: Top bar shortcut for common scenario

**HTML:**
```html
<!-- Quick action button in top bar -->
<ion-button 
  slot="end" 
  fill="outline" 
  color="light"
  (click)="quickCantCollectToday()"
  *ngIf="filteredCustomers().length > 0">
  <ion-icon slot="start" name="rainy-outline"></ion-icon>
  Can't Collect Today
</ion-button>
```

**TypeScript:**
```typescript
// Quick "Can't collect today" action
async quickCantCollectToday() {
  const alert = await this.alertController.create({
    header: '⚠️ Cannot Collect Today',
    message: 'Select customers affected and extend their grace period',
    inputs: [
      {
        type: 'radio',
        label: '🌧️ Heavy rain/typhoon',
        value: JSON.stringify({ days: 2, reason: 'weather', detail: 'Heavy rain preventing collection' }),
        checked: true
      },
      {
        type: 'radio',
        label: '🏖️ Holiday (extend 1 day)',
        value: JSON.stringify({ days: 1, reason: 'holiday', detail: 'National/local holiday' })
      },
      {
        type: 'radio',
        label: '🚧 Road closed (extend 3 days)',
        value: JSON.stringify({ days: 3, reason: 'infrastructure', detail: 'Road closed due to construction/repair' })
      },
      {
        type: 'radio',
        label: '🤒 Collector sick (extend 2 days)',
        value: JSON.stringify({ days: 2, reason: 'collector_emergency', detail: 'Collector unable to work due to illness' })
      }
    ],
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel'
      },
      {
        text: 'Apply to All Today',
        handler: async (selectedOption) => {
          const option = JSON.parse(selectedOption);
          
          // Get all customers scheduled for today
          const todayLoans = this.filteredCustomers().filter(loan => 
            loan.status !== 'collected' && 
            loan.outstandingBalance > 0
          );

          if (todayLoans.length === 0) {
            const toast = await this.toastController.create({
              message: 'No customers to apply extension',
              duration: 2000,
              color: 'info'
            });
            await toast.present();
            return false;
          }

          return this.submitBulkGraceExtension(
            todayLoans,
            option.days,
            option.reason,
            option.detail
          );
        }
      }
    ]
  });

  await alert.present();
}
```

---

### 4. Display Grace Extension Status

#### Show extended grace in customer card

**HTML Addition to Customer Card:**
```html
<!-- Add to grace-period-alert section -->
<div class="grace-period-alert grace-extended" *ngIf="loan.graceExtended">
  <div class="alert-header">
    <ion-icon name="time"></ion-icon>
    <span class="alert-title">Grace Period Extended</span>
  </div>
  <div class="alert-body">
    <div class="alert-stat">
      <span class="stat-label">Original Grace:</span>
      <span class="stat-value">{{ loan.originalGraceDays }} days</span>
    </div>
    <div class="alert-stat">
      <span class="stat-label">Extended By:</span>
      <span class="stat-value grace">+{{ loan.extendedGraceDays }} days</span>
    </div>
    <div class="alert-stat">
      <span class="stat-label">Total Grace:</span>
      <span class="stat-value info">{{ loan.totalGraceDays }} days</span>
    </div>
    <div class="extension-reason">
      <ion-icon name="information-circle-outline"></ion-icon>
      <span>{{ loan.extensionReasonSummary }}</span>
    </div>
  </div>
</div>
```

**SCSS Styling:**
```scss
.grace-period-alert.grace-extended {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.10), rgba(99, 102, 241, 0.08));
  border-color: rgba(59, 130, 246, 0.4);

  .stat-value.grace {
    color: #3b82f6;
    font-weight: 700;
  }

  .extension-reason {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--ion-color-medium);
    margin-top: 6px;
    padding: 6px 8px;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 6px;

    ion-icon {
      font-size: 14px;
      color: #3b82f6;
    }
  }
}
```

---

## API Service Methods

**Add to `api.service.ts`:**

```typescript
// Grace Period Extension APIs

grantGraceExtension(payload: {
  loanId: number;
  installmentId: number;
  extensionDays: number;
  reasonCategory: string;
  detailedReason: string;
  metadata?: any;
}): Observable<any> {
  return this.http.post(`${this.baseUrl}/grace-extensions`, payload);
}

getGraceExtensionHistory(loanId: number): Observable<any> {
  return this.http.get(`${this.baseUrl}/grace-extensions/loan/${loanId}`);
}

getCollectorGraceExtensionStats(collectorId: number): Observable<any> {
  return this.http.get(`${this.baseUrl}/collectors/${collectorId}/grace-extensions/stats`);
}

approveGraceExtension(extensionId: number, payload: {
  action: 'approve' | 'reject';
  notes?: string;
}): Observable<any> {
  return this.http.patch(`${this.baseUrl}/grace-extensions/${extensionId}/approve`, payload);
}
```

---

## Backend API Endpoints Needed

Create these endpoints in your NestJS API:

```typescript
// grace-extensions.controller.ts

@Post('grace-extensions')
async grantExtension(@Body() dto: GraceExtensionDto) {
  // 1. Validate collector permissions
  // 2. Check if installment is eligible
  // 3. Create grace extension record
  // 4. Update repayment schedule fields
  // 5. Return approval status
}

@Get('grace-extensions/loan/:loanId')
async getExtensionHistory(@Param('loanId') loanId: number) {
  // Return all extensions for this loan
}

@Patch('grace-extensions/:extensionId/approve')
async approveExtension(
  @Param('extensionId') extensionId: number,
  @Body() dto: ApproveExtensionDto
) {
  // Manager approves/rejects extension
}

@Get('collectors/:collectorId/grace-extensions/stats')
async getCollectorStats(@Param('collectorId') collectorId: number) {
  // Return collector's extension statistics
}
```

---

## User Experience Flow

### Happy Path: Single Customer

1. Collector clicks "Extend Grace" on customer card
2. Modal shows current grace period and installments
3. Collector selects:
   - Extension days (1-7)
   - Reason category (radio buttons with emojis)
   - Detailed explanation (textarea)
4. Collector chooses "Apply to Selected" or "Apply to All"
5. If "Apply to Selected", checkboxes appear for installment selection
6. Submit → API call
7. Success toast shows: "✅ Grace extended by 2 days for 3 installment(s)"
8. Customer card updates to show extended grace period
9. Penalties recalculated using new grace date

### Bulk Flow: Weather Event

1. Morning: Heavy rain starts
2. Collector clicks "Can't Collect Today" button
3. Selects "🌧️ Heavy rain/typhoon (extend 2 days)"
4. Confirms bulk extension
5. Loading spinner shows progress: "Processing 5 of 12 loans..."
6. Summary alert: "✅ Success: 10, ⏳ Pending Approval: 2, ❌ Failed: 0"
7. All affected customers show grace extension badge
8. Collector can continue other tasks or go offline

---

## Best Practices

1. **Always Require Reason**: Never allow extension without explanation
2. **Show Current Grace**: Display original grace period for context
3. **Confirmation for Bulk**: Always confirm before bulk operations
4. **Progress Feedback**: Show loading states for bulk operations
5. **Success Summary**: Show detailed results after bulk operations
6. **Visual Indicators**: Clearly show extended grace in UI
7. **Offline Support**: Queue extensions if offline, sync when online

---

## Testing Checklist

- [ ] Single customer extension (1 installment)
- [ ] Single customer extension (multiple installments)
- [ ] Bulk extension (5+ customers)
- [ ] Quick "Can't Collect Today" action
- [ ] Extension requiring approval (>3 days)
- [ ] Extension with minimum reason length validation
- [ ] Extension with invalid days (0 or >7)
- [ ] Extension on already extended installment
- [ ] Extension on paid installment (should fail)
- [ ] Display of extended grace in customer card
- [ ] Penalty calculation respecting extended grace
- [ ] Offline extension queuing (if offline support enabled)

---

## Implementation Priority

1. **Phase 1** (Week 1): Single customer extension
2. **Phase 2** (Week 2): Bulk customer extension
3. **Phase 3** (Week 3): Quick "Can't Collect Today" button
4. **Phase 4** (Week 4): Grace extension history/stats display

Start with Phase 1 for MVP, then add bulk features based on user feedback!
