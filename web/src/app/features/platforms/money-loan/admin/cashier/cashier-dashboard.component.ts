import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CashFloatApiService, formatCurrency, formatTime } from '@shared/api';
import { StatCardComponent, SharedButtonComponent } from '@shared/ui';
import type { CashierStats, CollectorCashBalance } from '@shared/models';

interface DashboardStats {
  pendingFloats: number;
  pendingHandovers: number;
  totalCashOut: number;
  activeCollectors: number;
  todayFloatsIssued: number;
  todayHandovers: number;
}

@Component({
  selector: 'app-cashier-dashboard',
  standalone: true,
  imports: [CommonModule, StatCardComponent, SharedButtonComponent],
  template: `
    <div class="space-y-4">
      <!-- Header with Quick Actions -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span class="text-2xl">💰</span> Cashier Dashboard
          </h1>
          <p class="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Cash float management and monitoring</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <shared-button
            variant="primary"
            size="md"
            class="gap-1.5 text-sm"
            (click)="navigate('/platforms/money-loan/dashboard/cashier/issue-float')">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Issue Float
          </shared-button>
          <shared-button
            variant="warning"
            size="md"
            class="gap-1.5 text-sm"
            (click)="navigate('/platforms/money-loan/dashboard/cashier/pending-handovers')">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            <span>Handovers</span>
            @if (stats()?.pendingHandovers) {
              <span class="bg-white text-amber-600 text-xs px-1.5 py-0.5 rounded-full font-bold">
                {{ stats()!.pendingHandovers }}
              </span>
            }
          </shared-button>
          <shared-button
            variant="info"
            size="md"
            class="gap-1.5 text-sm"
            (click)="navigate('/platforms/money-loan/dashboard/cashier/balance-monitor')">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            Monitor
          </shared-button>
        </div>
      </div>

      <!-- Stats Grid -->
      @if (loading()) {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          @for (i of [1,2,3,4]; track i) {
            <div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 animate-pulse">
              <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3"></div>
              <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
          }
        </div>
      } @else if (stats()) {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="h-full cursor-pointer" (click)="navigate('/platforms/money-loan/dashboard/cashier/pending-confirmations')">
            <shared-stat-card
              title="Pending Confirmations"
              [value]="stats()!.pendingFloats"
              subtitle="Waiting for collector"
              variant="warning">
              <span icon class="text-xl">⏳</span>
            </shared-stat-card>
          </div>

          <div class="h-full cursor-pointer" (click)="navigate('/platforms/money-loan/dashboard/cashier/pending-handovers')">
            <shared-stat-card
              title="Pending Handovers"
              [value]="stats()!.pendingHandovers"
              subtitle="Need your confirmation"
              variant="danger">
              <span icon class="text-xl">🏦</span>
            </shared-stat-card>
          </div>

          <div class="h-full">
            <shared-stat-card
              title="Total Cash Out"
              [value]="formatAmount(stats()!.totalCashOut)"
              subtitle="Currently with collectors"
              variant="info">
              <span icon class="text-xl">💸</span>
            </shared-stat-card>
          </div>

          <div class="h-full cursor-pointer" (click)="navigate('/platforms/money-loan/dashboard/cashier/balance-monitor')">
            <shared-stat-card
              title="Active Collectors"
              [value]="stats()!.activeCollectors"
              subtitle="Out in the field"
              variant="success">
              <span icon class="text-xl">✅</span>
            </shared-stat-card>
          </div>
        </div>

        <!-- Today's Activity -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800
                      rounded-lg p-4 border border-blue-200 dark:border-gray-700">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-1.5">
              <span class="text-base">📅</span> Today's Activity
            </h3>
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-700 dark:text-gray-300">Floats Issued:</span>
                <span class="text-base font-bold text-blue-600">{{ stats()!.todayFloatsIssued }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-700 dark:text-gray-300">Handovers Completed:</span>
                <span class="text-base font-bold text-green-600">{{ stats()!.todayHandovers }}</span>
              </div>
            </div>
          </div>

          <div class="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-800
                      rounded-lg p-4 border border-purple-200 dark:border-gray-700">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-1.5">
              <span class="text-base">💡</span> Quick Tips
            </h3>
            <ul class="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
              <li class="flex items-start gap-1.5">
                <span class="text-purple-600 text-xs">•</span>
                <span>Issue floats early to avoid delays</span>
              </li>
              <li class="flex items-start gap-1.5">
                <span class="text-purple-600 text-xs">•</span>
                <span>Verify handover amounts carefully</span>
              </li>
              <li class="flex items-start gap-1.5">
                <span class="text-purple-600 text-xs">•</span>
                <span>Monitor collector balances throughout the day</span>
              </li>
            </ul>
          </div>
        </div>
      }

      <!-- Collectors Table (Compact Design) -->
      @if (!loading() && collectors().length > 0) {
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <!-- Table Header -->
          <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 class="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span class="text-base">👥</span> All Collectors
              </h2>
              <p class="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Real-time cash positions</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 dark:text-gray-400">
                Auto-refresh: <span class="font-semibold text-green-600">30s</span>
              </span>
              <button
                (click)="loadCollectors()"
                class="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Refresh now">
                <svg class="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Compact Table -->
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th class="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Collector
                  </th>
                  <th class="px-3 py-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th class="px-3 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Float
                  </th>
                  <th class="px-3 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Collections
                  </th>
                  <th class="px-3 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Disbursed
                  </th>
                  <th class="px-3 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    On Hand
                  </th>
                  <th class="px-3 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Available
                  </th>
                  <th class="px-3 py-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Last Activity
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                @for (collector of collectors(); track collector.collectorId || collector.collector_id) {
                  <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                      [class.bg-yellow-50]="(collector.status === 'pending_confirmation')"
                      [class.dark:bg-yellow-900/10]="(collector.status === 'pending_confirmation')"
                      (click)="viewCollectorDetails(collector)">
                    <!-- Collector Name & ID -->
                    <td class="px-3 py-2.5 whitespace-nowrap">
                      <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                          {{ getInitials(collector.collectorName || collector.collector_name) }}
                        </div>
                        <div>
                          <div class="text-sm font-medium text-gray-900 dark:text-white">
                            {{ collector.collectorName || collector.collector_name }}
                          </div>
                          <div class="text-xs text-gray-500 dark:text-gray-400">
                            #{{ collector.collectorId || collector.collector_id }}
                          </div>
                        </div>
                      </div>
                    </td>

                    <!-- Status Badge -->
                    <td class="px-3 py-2.5 whitespace-nowrap text-center">
                      @if (collector.status === 'active') {
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <span class="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400"></span>
                          Active
                        </span>
                      } @else if (collector.status === 'pending_confirmation') {
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                          <span class="w-1.5 h-1.5 rounded-full bg-yellow-600 dark:bg-yellow-400 animate-pulse"></span>
                          Pending
                        </span>
                      } @else {
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400">
                          <span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                          Inactive
                        </span>
                      }
                    </td>

                    <!-- Opening Float -->
                    <td class="px-3 py-2.5 whitespace-nowrap text-right">
                      <span class="text-sm font-medium text-gray-900 dark:text-white">
                        {{ formatAmount(collector.openingFloat || collector.opening_float) }}
                      </span>
                    </td>

                    <!-- Collections -->
                    <td class="px-3 py-2.5 whitespace-nowrap text-right">
                      <span class="text-sm font-semibold text-green-600 dark:text-green-400">
                        +{{ formatAmount(collector.totalCollections || collector.total_collections) }}
                      </span>
                    </td>

                    <!-- Disbursements -->
                    <td class="px-3 py-2.5 whitespace-nowrap text-right">
                      <span class="text-sm font-semibold text-red-600 dark:text-red-400">
                        -{{ formatAmount(collector.totalDisbursements || collector.total_disbursements) }}
                      </span>
                    </td>

                    <!-- On-Hand Cash -->
                    <td class="px-3 py-2.5 whitespace-nowrap text-right">
                      <span class="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {{ formatAmount(collector.currentBalance || collector.current_balance || collector.onHandCash || collector.on_hand_cash) }}
                      </span>
                    </td>

                    <!-- Available for Disbursement -->
                    <td class="px-3 py-2.5 whitespace-nowrap text-right">
                      <div class="flex flex-col items-end">
                        <span class="text-sm font-semibold"
                              [class.text-green-600]="(collector.availableForDisbursement || collector.available_for_disbursement) > 0"
                              [class.dark:text-green-400]="(collector.availableForDisbursement || collector.available_for_disbursement) > 0"
                              [class.text-gray-400]="(collector.availableForDisbursement || collector.available_for_disbursement) <= 0"
                              [class.dark:text-gray-500]="(collector.availableForDisbursement || collector.available_for_disbursement) <= 0">
                          {{ formatAmount(collector.availableForDisbursement || collector.available_for_disbursement) }}
                        </span>
                        @if ((collector.availableForDisbursement || collector.available_for_disbursement) <= 0) {
                          <span class="text-xs text-red-500 dark:text-red-400 font-medium">Cap reached</span>
                        }
                      </div>
                    </td>

                    <!-- Last Activity -->
                    <td class="px-3 py-2.5 whitespace-nowrap text-center">
                      @if (collector.lastTransactionTime || collector.last_transaction_time) {
                        <span class="text-xs text-gray-600 dark:text-gray-400">
                          {{ formatTime(collector.lastTransactionTime || collector.last_transaction_time) }}
                        </span>
                      } @else {
                        <span class="text-xs text-gray-400 dark:text-gray-500">No activity</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Table Footer with Summary -->
          <div class="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between text-xs">
              <span class="text-gray-600 dark:text-gray-400">
                Showing {{ collectors().length }} collector(s)
              </span>
              <div class="flex items-center gap-4">
                <span class="text-gray-600 dark:text-gray-400">
                  Total Cash Out: <span class="font-bold text-blue-600 dark:text-blue-400">{{ formatAmount(totalCashOut()) }}</span>
                </span>
                <span class="text-gray-600 dark:text-gray-400">
                  Total Collections: <span class="font-bold text-green-600 dark:text-green-400">{{ formatAmount(totalCollections()) }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Empty State for Collectors -->
      @if (!loading() && collectors().length === 0) {
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div class="text-4xl mb-3">👥</div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Collectors Yet</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            No collectors have been issued floats today.
          </p>
          <shared-button
            variant="primary"
            size="md"
            (click)="navigate('/platforms/money-loan/dashboard/cashier/issue-float')">
            Issue First Float
          </shared-button>
        </div>
      }
    </div>
  `
})
export class CashierDashboardComponent implements OnInit {
  loading = signal(false);
  stats = signal<DashboardStats | null>(null);
  collectors = signal<CollectorCashBalance[]>([]);

  constructor(
    private cashFloatApi: CashFloatApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadStats();
    this.loadCollectors();
    // Refresh both stats and collectors every 30 seconds
    setInterval(() => {
      this.loadStats();
      this.loadCollectors();
    }, 30000);
  }

  async loadStats() {
    this.loading.set(true);
    try {
      // Fetch both stats and pending confirmations in parallel
      const [statsResponse, pendingConfirmationsResponse]: [any, any] = await Promise.all([
        this.cashFloatApi.getCashierStats().toPromise(),
        this.cashFloatApi.getPendingConfirmations().toPromise()
      ]);

      const data = statsResponse.data || statsResponse;
      const pendingData = pendingConfirmationsResponse.data || pendingConfirmationsResponse;

      console.log('📊 Dashboard - Raw data:', data);
      console.log('📦 Dashboard - Pending data:', pendingData);

      // Map API response to component format - ensure numbers are parsed
      this.stats.set({
        pendingFloats: Array.isArray(pendingData) ? pendingData.length : 0,
        pendingHandovers: Number(data.pending_handovers || 0),
        totalCashOut: Number(data.total_float_issued || 0),
        activeCollectors: Number(data.active_collectors || 0),
        todayFloatsIssued: 0, // TODO: Add this to API
        todayHandovers: 0 // TODO: Add this to API
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      // Set default values if API fails
      this.stats.set({
        pendingFloats: 0,
        pendingHandovers: 0,
        totalCashOut: 0,
        activeCollectors: 0,
        todayFloatsIssued: 0,
        todayHandovers: 0
      });
    } finally {
      this.loading.set(false);
    }
  }

  loadCollectors() {
    this.cashFloatApi.getBalanceMonitor()
      .subscribe({
        next: (data: CollectorCashBalance[]) => {
          this.collectors.set(data);
        },
        error: (error: any) => {
          console.error('Error loading collectors:', error);
          this.collectors.set([]);
        }
      });
  }

  navigate(path: string) {
    this.router.navigate([path]);
  }

  viewCollectorDetails(collector: CollectorCashBalance) {
    // Navigate to balance monitor or collector details
    this.router.navigate(['/platforms/money-loan/dashboard/cashier/balance-monitor']);
  }

  getInitials(name: string | undefined): string {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  // Computed values for table footer
  totalCashOut(): number {
    return this.collectors().reduce((sum, c) =>
      sum + Number(c.onHandCash || c.on_hand_cash || 0), 0
    );
  }

  totalCollections(): number {
    return this.collectors().reduce((sum, c) =>
      sum + Number(c.totalCollections || c.total_collections || 0), 0
    );
  }

  formatAmount(amount: number | undefined): string {
    if (amount === undefined || amount === null) return '0.00';
    return amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatTime = formatTime;
}
