# Cash Float Management - Web Interface Implementation Guide

## Overview
The cashier web interface for issuing and managing cash floats needs to be created in the web admin panel.

## Location
**Path:** `web/src/app/features/platforms/money-loan/admin/cash-float-management.component.ts`

## Features Needed

### 1. Issue Float Tab
- **Select Collector** dropdown (list all collectors)
- **Float Date** picker (default: today)
- **Float Amount** input (₱)
- **Daily Disbursement Cap** input (₱)
- **Notes** textarea (optional)
- **Issue Float** button

### 2. Pending Confirmations Tab
- Grid/list of pending floats waiting for collector confirmation
- Shows: Collector name, amount, daily cap, time issued
- Status: "Waiting for collector"

### 3. Pending Handovers Tab
- Grid/list of end-of-day handovers waiting for cashier confirmation
- Shows: Collector name, expected amount, actual amount, variance
- **Confirm Receipt** button
- **Reject** button (with reason)

### 4. Active Collectors Tab
- Real-time view of all collectors' current cash balances
- Shows: Name, on-hand cash, opening float, collections, disbursements
- Daily cap and available for disbursement

## API Endpoints to Use

### Cashier Operations
```typescript
// Issue float
POST /api/money-loan/cash/issue-float
Body: {
  collectorId: number,
  amount: number,
  dailyCap: number,
  floatDate?: string,
  latitude?: number,
  longitude?: number,
  notes?: string
}

// Confirm handover
POST /api/money-loan/cash/confirm-handover
Body: {
  handoverId: number,
  actualAmount: number,
  latitude?: number,
  longitude?: number,
  notes?: string
}

// Get all pending floats
GET /api/money-loan/cash/all-pending-floats

// Get all pending handovers
GET /api/money-loan/cash/pending-handovers

// Get all collector balances
GET /api/money-loan/cash/all-balances

// Get collectors list
GET /api/users?role=collector
```

## UI Style Guide
- **Use Tailwind CSS** (same as other admin pages)
- **Tabs**: Use simple button tabs with active state
- **Cards**: `bg-white dark:bg-gray-800 rounded-lg p-4 border`
- **Buttons**: `bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2`
- **Forms**: Standard inputs with labels
- **Status Badges**: 
  - Pending: `bg-yellow-100 text-yellow-800`
  - Confirmed: `bg-green-100 text-green-800`
  - Rejected: `bg-red-100 text-red-800`

## Quick Implementation

I've created a starter file at:
`web/src/app/features/platforms/money-loan/admin/cash-float-management.component.ts`

**Next Steps:**

1. **Delete the current file** (has Material imports that don't exist)

2. **Create a simple Tailwind version** based on `customers-list.component.ts` pattern:
   - Copy structure from existing admin components
   - Use Tailwind classes only
   - Remove all Material references
   - Use native HTML `<select>`, `<input>`, `<button>`

3. **Add to routing** in `money-loan-routing.module.ts`:
```typescript
{
  path: 'cash-float',
  loadComponent: () => import('./admin/cash-float-management.component')
    .then(m => m.CashFloatManagementComponent)
}
```

4. **Add navigation link** in the admin sidebar/menu

## Example Simple Implementation

```typescript
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-cash-float-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-4 md:p-6 space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">💵 Cash Float Management</h1>
          <p class="text-sm text-gray-600 dark:text-gray-400">Issue floats and manage handovers</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="border-b border-gray-200 dark:border-gray-700">
        <div class="flex gap-4">
          <button
            (click)="activeTab.set('issue')"
            [class]="activeTab() === 'issue' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'"
            class="px-4 py-2 font-medium">
            Issue Float
          </button>
          <button
            (click)="activeTab.set('pending')"
            [class]="activeTab() === 'pending' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'"
            class="px-4 py-2 font-medium">
            Pending ({{ pendingFloats().length }})
          </button>
          <button
            (click)="activeTab.set('handovers')"
            [class]="activeTab() === 'handovers' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'"
            class="px-4 py-2 font-medium">
            Handovers ({{ pendingHandovers().length }})
          </button>
        </div>
      </div>

      <!-- Issue Float Tab -->
      @if (activeTab() === 'issue') {
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <form (ngSubmit)="issueFloat()" class="space-y-4 max-w-md">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Collector</label>
              <select [(ngModel)]="form.collectorId" name="collector"
                      class="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                <option value="">Select Collector</option>
                @for (collector of collectors(); track collector.id) {
                  <option [value]="collector.id">{{ collector.firstName }} {{ collector.lastName }}</option>
                }
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Float Amount</label>
              <input type="number" [(ngModel)]="form.amount" name="amount"
                     class="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                     placeholder="50000">
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Daily Cap</label>
              <input type="number" [(ngModel)]="form.dailyCap" name="cap"
                     class="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                     placeholder="50000">
            </div>

            <button type="submit"
                    class="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-3 font-medium">
              Issue Float
            </button>
          </form>
        </div>
      }

      <!-- Pending Tab -->
      @if (activeTab() === 'pending') {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (float of pendingFloats(); track float.id) {
            <div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div class="flex justify-between items-start mb-3">
                <h3 class="font-semibold">{{ float.collectorName }}</h3>
                <span class="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">Pending</span>
              </div>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">Amount:</span>
                  <span class="font-semibold">₱{{ formatAmount(float.amount) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Daily Cap:</span>
                  <span>₱{{ formatAmount(float.dailyCap) }}</span>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Handovers Tab -->
      @if (activeTab() === 'handovers') {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          @for (handover of pendingHandovers(); track handover.id) {
            <div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h3 class="font-semibold mb-3">{{ handover.collectorName }}</h3>
              <div class="space-y-2 text-sm mb-4">
                <div class="flex justify-between">
                  <span>Expected:</span>
                  <span>₱{{ formatAmount(handover.amount) }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Actual:</span>
                  <span>₱{{ formatAmount(handover.amount) }}</span>
                </div>
              </div>
              <button (click)="confirmHandover(handover.id)"
                      class="w-full bg-green-600 hover:bg-green-700 text-white rounded px-4 py-2">
                Confirm Receipt
              </button>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class CashFloatManagementComponent implements OnInit {
  activeTab = signal('issue');
  collectors = signal<any[]>([]);
  pendingFloats = signal<any[]>([]);
  pendingHandovers = signal<any[]>([]);

  form = {
    collectorId: '',
    amount: 0,
    dailyCap: 0,
    floatDate: new Date().toISOString().split('T')[0]
  };

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadCollectors();
    this.loadPendingFloats();
    this.loadPendingHandovers();
  }

  async loadCollectors() {
    const response: any = await this.http.get('/api/users?role=collector').toPromise();
    this.collectors.set(response.data || []);
  }

  async loadPendingFloats() {
    const response: any = await this.http.get('/api/money-loan/cash/all-pending-floats').toPromise();
    this.pendingFloats.set(response.data || []);
  }

  async loadPendingHandovers() {
    const response: any = await this.http.get('/api/money-loan/cash/pending-handovers').toPromise();
    this.pendingHandovers.set(response.data || []);
  }

  async issueFloat() {
    await this.http.post('/api/money-loan/cash/issue-float', this.form).toPromise();
    alert('Float issued successfully!');
    await this.loadPendingFloats();
  }

  async confirmHandover(id: number) {
    await this.http.post('/api/money-loan/cash/confirm-handover', { handoverId: id }).toPromise();
    alert('Handover confirmed!');
    await this.loadPendingHandovers();
  }

  formatAmount(amount: number): string {
    return amount.toLocaleString('en-PH', { minimumFractionDigits: 2 });
  }
}
```

This is a simplified version using only Tailwind CSS that matches your existing admin UI style!
