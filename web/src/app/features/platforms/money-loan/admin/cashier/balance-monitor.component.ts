import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { CashFloatApiService, formatCurrency, formatTime } from '@shared/api';
import type { CollectorCashBalance } from '@shared/models';

@Component({
  selector: 'app-balance-monitor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-center justify-between">
          <div>
            <button
              (click)="goBack()"
              class="text-gray-600 hover:text-gray-900 mb-2 flex items-center gap-2"
            >
              ← Back to Dashboard
            </button>
            <h1 class="text-3xl font-bold text-gray-900">Cash Balance Monitor</h1>
            <p class="text-gray-600 mt-1">
              Real-time view of all collectors' cash positions
            </p>
          </div>
          <div class="text-right">
            <div class="text-sm text-gray-500">Auto-refresh in</div>
            <div class="text-lg font-semibold text-green-600">
              {{ countdown }}s
            </div>
            <div class="text-xs text-gray-500 mt-1">
              Last: {{ lastUpdated }}
            </div>
          </div>
        </div>
      </div>

      <!-- Summary Stats -->
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-sm text-gray-500">Active Collectors</div>
          <div class="text-2xl font-bold text-green-600">
            {{ activeCollectors() }}
          </div>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-sm text-gray-500">Total Cash Out</div>
          <div class="text-2xl font-bold text-blue-600">
            {{ formatAmount(totalCashOut()) }}
          </div>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-sm text-gray-500">Total Collections</div>
          <div class="text-2xl font-bold text-green-600">
            {{ formatAmount(totalCollections()) }}
          </div>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-sm text-gray-500">Total Disbursements</div>
          <div class="text-2xl font-bold text-red-600">
            {{ formatAmount(totalDisbursements()) }}
          </div>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-sm text-gray-500">Pending Confirm</div>
          <div class="text-2xl font-bold text-orange-600">
            {{ pendingConfirmation() }}
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading()" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p class="mt-4 text-gray-600">Loading collector balances...</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading() && balances().length === 0" 
           class="bg-white rounded-lg shadow-lg p-12 text-center">
        <div class="text-6xl mb-4">📊</div>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">
          No Active Collectors
        </h3>
        <p class="text-gray-600">
          No collectors have been issued floats today.
        </p>
      </div>

      <!-- Balances Table -->
      <div *ngIf="!loading() && balances().length > 0" 
           class="bg-white rounded-lg shadow-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Collector
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Opening Float
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Collections
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Disbursements
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  On-Hand Cash
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Available
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Daily Cap
                </th>
                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let balance of balances()" 
                  [class.bg-yellow-50]="balance.status === 'pending_confirmation'"
                  [class.bg-green-50]="balance.status === 'active'"
                  class="hover:bg-gray-50 transition-colors">
                <!-- Status Badge -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <span *ngIf="balance.status === 'active'"
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ● Active
                  </span>
                  <span *ngIf="balance.status === 'pending_confirmation'"
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    ⏳ Pending
                  </span>
                  <span *ngIf="balance.status === 'inactive'"
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    ○ Inactive
                  </span>
                </td>

                <!-- Collector Name -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">
                    {{ balance.collector_name }}
                  </div>
                  <div class="text-xs text-gray-500">
                    ID: {{ balance.collector_id }}
                  </div>
                </td>

                <!-- Opening Float -->
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {{ formatAmount(balance.opening_float) }}
                </td>

                <!-- Collections -->
                <td class="px-6 py-4 whitespace-nowrap text-right">
                  <div class="text-sm font-semibold text-green-600">
                    +{{ formatAmount(balance.total_collections) }}
                  </div>
                </td>

                <!-- Disbursements -->
                <td class="px-6 py-4 whitespace-nowrap text-right">
                  <div class="text-sm font-semibold text-red-600">
                    -{{ formatAmount(balance.total_disbursements) }}
                  </div>
                </td>

                <!-- On-Hand Cash -->
                <td class="px-6 py-4 whitespace-nowrap text-right">
                  <div class="text-lg font-bold text-blue-600">
                    {{ formatAmount(balance.on_hand_cash) }}
                  </div>
                </td>

                <!-- Available for Disbursement -->
                <td class="px-6 py-4 whitespace-nowrap text-right">
                  <div class="text-sm font-semibold"
                       [class.text-green-600]="balance.available_for_disbursement > 0"
                       [class.text-gray-400]="balance.available_for_disbursement <= 0">
                    {{ formatAmount(balance.available_for_disbursement) }}
                  </div>
                  <div *ngIf="balance.available_for_disbursement <= 0"
                       class="text-xs text-red-500">
                    Cap reached
                  </div>
                </td>

                <!-- Daily Cap -->
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                  {{ formatAmount(balance.daily_cap) }}
                </td>

                <!-- Last Activity -->
                <td class="px-6 py-4 whitespace-nowrap text-center text-xs text-gray-500">
                  <div *ngIf="balance.last_transaction_time">
                    {{ formatTime(balance.last_transaction_time) }}
                  </div>
                  <div *ngIf="!balance.last_transaction_time" class="text-gray-400">
                    No activity
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Legend -->
      <div class="mt-6 bg-white rounded-lg shadow p-4">
        <h3 class="font-semibold text-gray-900 mb-3">📊 Understanding the Monitor</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-gray-700 mb-2"><strong>On-Hand Cash:</strong> Current physical cash the collector has</p>
            <p class="text-gray-700 mb-2"><strong>Available:</strong> Amount they can still disburse today (Daily Cap - Total Disbursements)</p>
            <p class="text-gray-700"><strong>Daily Cap:</strong> Maximum amount allowed for disbursement today</p>
          </div>
          <div>
            <div class="flex items-center gap-2 mb-2">
              <span class="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
              <span class="text-gray-700">Active - Float confirmed and operational</span>
            </div>
            <div class="flex items-center gap-2 mb-2">
              <span class="inline-block w-3 h-3 bg-yellow-500 rounded-full"></span>
              <span class="text-gray-700">Pending - Waiting for collector to confirm float</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="inline-block w-3 h-3 bg-gray-400 rounded-full"></span>
              <span class="text-gray-700">Inactive - No float today or handed over</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Auto-refresh Notice -->
      <div class="mt-4 text-center text-sm text-gray-500">
        This page automatically refreshes every 15 seconds to show real-time data
      </div>
    </div>
  `
})
export class BalanceMonitorComponent implements OnInit, OnDestroy {
  loading = signal(false);
  balances = signal<CollectorCashBalance[]>([]);
  lastUpdated = '';
  countdown = 15;
  private refreshSubscription?: Subscription;
  private countdownSubscription?: Subscription;

  constructor(
    private cashFloatApi: CashFloatApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadBalances();
    this.startAutoRefresh();
    this.startCountdown();
  }

  ngOnDestroy() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
    if (this.countdownSubscription) {
      this.countdownSubscription.unsubscribe();
    }
  }

  loadBalances() {
    this.loading.set(true);
    this.cashFloatApi.getBalanceMonitor()
      .subscribe({
        next: (data: CollectorCashBalance[]) => {
          this.balances.set(data);
          this.loading.set(false);
          this.lastUpdated = new Date().toLocaleTimeString();
          this.countdown = 15;
        },
        error: (error: any) => {
          console.error('Error loading balances:', error);
          this.loading.set(false);
        }
      });
  }

  startAutoRefresh() {
    // Refresh every 15 seconds
    this.refreshSubscription = interval(15000)
      .pipe(switchMap(() => this.cashFloatApi.getBalanceMonitor()))
      .subscribe((data) => {
        this.balances.set(data as CollectorCashBalance[]);
        this.lastUpdated = new Date().toLocaleTimeString();
        this.countdown = 15;
      });
  }

  startCountdown() {
    this.countdownSubscription = interval(1000).subscribe(() => {
      this.countdown--;
      if (this.countdown < 0) {
        this.countdown = 15;
      }
    });
  }

  activeCollectors(): number {
    return this.balances().filter(b => b.status === 'active').length;
  }

  pendingConfirmation(): number {
    return this.balances().filter(b => b.status === 'pending_confirmation').length;
  }

  totalCashOut(): number {
    return this.balances().reduce((sum, b) => sum + b.on_hand_cash, 0);
  }

  totalCollections(): number {
    return this.balances().reduce((sum, b) => sum + b.total_collections, 0);
  }

  totalDisbursements(): number {
    return this.balances().reduce((sum, b) => sum + b.total_disbursements, 0);
  }

  // Utility methods now use shared functions
  formatAmount = formatCurrency;

  goBack() {
    this.router.navigate(['/platforms/money-loan/admin/cashier']);
  }
}
