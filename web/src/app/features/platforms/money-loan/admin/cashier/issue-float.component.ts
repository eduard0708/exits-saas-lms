import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CashFloatApiService } from '@shared/api';
import type { CashFloat } from '@shared/models';

interface Collector {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

@Component({
  selector: 'app-issue-float',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-4 md:p-6 space-y-6">
      <!-- Header -->
      <div class="flex items-center gap-4">
        <button (click)="goBack()"
                class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
        </button>
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">💰 Issue Float</h1>
          <p class="text-sm text-gray-600 dark:text-gray-400">Give starting cash to collector</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Form -->
        <div class="lg:col-span-2">
          <div class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <form (ngSubmit)="submitFloat()" class="space-y-6">
              <!-- Collector Selection -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Collector *
                </label>
                <select [(ngModel)]="form.collectorId" name="collector" required
                        class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                               dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">-- Choose Collector --</option>
                  @for (collector of collectors(); track collector.id) {
                    <option [value]="collector.id">
                      {{ collector.firstName }} {{ collector.lastName }} ({{ collector.email }})
                    </option>
                  }
                </select>
                @if (collectors().length === 0 && !loading()) {
                  <p class="mt-2 text-sm text-red-600">No collectors available</p>
                }
              </div>

              <!-- Date -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Float Date *
                </label>
                <input type="date" [(ngModel)]="form.floatDate" name="date" required
                       class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                              dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500">
              </div>

              <!-- Amount and Daily Cap -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Float Amount *
                  </label>
                  <div class="relative">
                    <span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">₱</span>
                    <input type="number" [(ngModel)]="form.amount" name="amount" required min="0" step="100"
                           class="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                                  dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 text-lg font-semibold"
                           placeholder="50,000.00">
                  </div>
                  <p class="mt-1 text-xs text-gray-500">Total cash given to collector</p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Daily Disbursement Cap *
                  </label>
                  <div class="relative">
                    <span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">₱</span>
                    <input type="number" [(ngModel)]="form.dailyCap" name="dailyCap" required min="0" step="100"
                           class="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                                  dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 text-lg font-semibold"
                           placeholder="50,000.00">
                  </div>
                  <p class="mt-1 text-xs text-gray-500">Max loans they can disburse today</p>
                </div>
              </div>

              <!-- Notes -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea [(ngModel)]="form.notes" name="notes" rows="3"
                          class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                                 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                          placeholder="Any special instructions or notes..."></textarea>
              </div>

              <!-- Submit Button -->
              <div class="flex gap-3">
                <button type="button" (click)="goBack()"
                        class="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 
                               text-gray-800 dark:text-white rounded-lg px-6 py-3 font-medium transition-colors">
                  Cancel
                </button>
                <button type="submit" [disabled]="issuing() || !isFormValid()"
                        class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white 
                               rounded-lg px-6 py-3 font-medium transition-colors flex items-center justify-center gap-2">
                  @if (issuing()) {
                    <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Issuing...</span>
                  } @else {
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                    </svg>
                    <span>Issue Float</span>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Instructions -->
        <div class="space-y-4">
          <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
            <h3 class="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-4">📋 Instructions</h3>
            <ol class="space-y-3 text-sm text-blue-800 dark:text-blue-300">
              <li class="flex items-start gap-2">
                <span class="font-bold">1.</span>
                <span>Count the exact cash amount you're giving</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="font-bold">2.</span>
                <span>Enter the amount in the form</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="font-bold">3.</span>
                <span>Set the daily disbursement cap (usually same as float)</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="font-bold">4.</span>
                <span>Click "Issue Float" - collector will be notified</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="font-bold">5.</span>
                <span>Collector must confirm receipt in their mobile app</span>
              </li>
            </ol>
          </div>

          <div class="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6 border border-yellow-200 dark:border-yellow-800">
            <h3 class="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-3">⚠️ Important</h3>
            <ul class="space-y-2 text-sm text-yellow-800 dark:text-yellow-300">
              <li class="flex items-start gap-2">
                <span>•</span>
                <span>Do NOT give cash until you've submitted this form</span>
              </li>
              <li class="flex items-start gap-2">
                <span>•</span>
                <span>Keep a record of the transaction number</span>
              </li>
              <li class="flex items-start gap-2">
                <span>•</span>
                <span>Collector must count and confirm before leaving</span>
              </li>
            </ul>
          </div>

          @if (form.amount > 0 && form.dailyCap > 0) {
            <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
              <h3 class="text-lg font-semibold text-green-900 dark:text-green-200 mb-3">✓ Summary</h3>
              <div class="space-y-2 text-sm text-green-800 dark:text-green-300">
                <div class="flex justify-between">
                  <span>Float Amount:</span>
                  <span class="font-bold">₱{{ formatAmount(form.amount) }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Daily Cap:</span>
                  <span class="font-bold">₱{{ formatAmount(form.dailyCap) }}</span>
                </div>
                @if (form.amount !== form.dailyCap) {
                  <div class="pt-2 border-t border-green-300 dark:border-green-700 text-xs">
                    <span class="text-yellow-600">⚠️ Float and cap are different</span>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class IssueFloatComponent implements OnInit {
  loading = signal(false);
  issuing = signal(false);
  collectors = signal<Collector[]>([]);

  form = {
    collectorId: '',
    amount: 0,
    dailyCap: 0,
    floatDate: new Date().toISOString().split('T')[0],
    notes: ''
  };

  constructor(
    private cashFloatApi: CashFloatApiService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadCollectors();
  }

  async loadCollectors() {
    this.loading.set(true);
    try {
      const response: any = await this.http.get('/api/users?role=collector').toPromise();
      this.collectors.set(response.data || []);
    } catch (error) {
      console.error('Error loading collectors:', error);
      alert('Failed to load collectors');
    } finally {
      this.loading.set(false);
    }
  }

  isFormValid(): boolean {
    return !!(this.form.collectorId && this.form.amount > 0 && this.form.dailyCap > 0);
  }

  async submitFloat() {
    if (!this.isFormValid()) {
      alert('Please fill in all required fields');
      return;
    }

    if (!confirm(`Issue float of ₱${this.formatAmount(this.form.amount)} to collector?`)) {
      return;
    }

    this.issuing.set(true);
    try {
      const response = await this.cashFloatApi.issueFloat(this.form).toPromise();
      
      if (response?.success) {
        alert(`✓ Float issued successfully!\n\nAmount: ₱${this.formatAmount(this.form.amount)}\n\nCollector will be notified to confirm receipt.`);
        this.router.navigate(['/platforms/money-loan/admin/cashier/pending-confirmations']);
      }
    } catch (error: any) {
      console.error('Error issuing float:', error);
      alert(error.error?.message || 'Failed to issue float. Please try again.');
    } finally {
      this.issuing.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/platforms/money-loan/admin/cashier']);
  }

  formatAmount(amount: number): string {
    return amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
