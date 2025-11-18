import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CashFloatApiService, formatCurrency } from '@shared/api';
import { StatCardComponent, SharedButtonComponent } from '@shared/ui';
import type { CashierStats } from '@shared/models';

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
    </div>
  `
})
export class CashierDashboardComponent implements OnInit {
  loading = signal(false);
  stats = signal<DashboardStats | null>(null);

  constructor(
    private cashFloatApi: CashFloatApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadStats();
    // Refresh stats every 30 seconds
    setInterval(() => this.loadStats(), 30000);
  }

  async loadStats() {
    this.loading.set(true);
    try {
      const response: any = await this.cashFloatApi.getCashierStats().toPromise();
      const data = response.data || response;

      // Map API response to component format
      this.stats.set({
        pendingFloats: 0, // TODO: Add this to API
        pendingHandovers: data.pending_handovers || 0,
        totalCashOut: data.total_float_issued || 0,
        activeCollectors: data.active_collectors || 0,
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

  navigate(path: string) {
    this.router.navigate([path]);
  }

  formatAmount(amount: number | undefined): string {
    if (amount === undefined || amount === null) return '0.00';
    return amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
