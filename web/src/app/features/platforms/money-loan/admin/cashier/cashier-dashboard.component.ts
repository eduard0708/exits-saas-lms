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
    <div class="p-4 md:p-6 space-y-6">
      <!-- Header -->
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">💰 Cashier Dashboard</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400">Cash float management and monitoring</p>
      </div>

      <!-- Quick Actions -->
      <div class="flex flex-wrap gap-3">
        <shared-button
          variant="primary"
          size="lg"
          class="gap-2"
          (click)="navigate('/platforms/money-loan/admin/cashier/issue-float')">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Issue Float
        </shared-button>
        <shared-button
          variant="warning"
          size="lg"
          class="gap-2"
          (click)="navigate('/platforms/money-loan/admin/cashier/pending-handovers')">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          <span>Pending Handovers</span>
          @if (stats()?.pendingHandovers) {
            <span class="bg-white text-amber-600 text-xs px-2 py-0.5 rounded-full font-bold">
              {{ stats()!.pendingHandovers }}
            </span>
          }
        </shared-button>
        <shared-button
          variant="info"
          size="lg"
          class="gap-2"
          (click)="navigate('/platforms/money-loan/admin/cashier/balance-monitor')">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          Monitor Balances
        </shared-button>
      </div>

      <!-- Stats Grid -->
      @if (loading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          @for (i of [1,2,3,4]; track i) {
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 animate-pulse">
              <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
              <div class="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
          }
        </div>
      } @else if (stats()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="h-full cursor-pointer" (click)="navigate('/platforms/money-loan/admin/cashier/pending-confirmations')">
            <shared-stat-card
              title="Pending Confirmations"
              [value]="stats()!.pendingFloats"
              subtitle="Waiting for collector"
              variant="warning">
              <span icon class="text-xl">⏳</span>
            </shared-stat-card>
          </div>

          <div class="h-full cursor-pointer" (click)="navigate('/platforms/money-loan/admin/cashier/pending-handovers')">
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

          <div class="h-full cursor-pointer" (click)="navigate('/platforms/money-loan/admin/cashier/balance-monitor')">
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
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 
                      rounded-lg p-6 border border-blue-200 dark:border-gray-700">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">📅 Today's Activity</h3>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-700 dark:text-gray-300">Floats Issued:</span>
                <span class="text-lg font-bold text-blue-600">{{ stats()!.todayFloatsIssued }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-700 dark:text-gray-300">Handovers Completed:</span>
                <span class="text-lg font-bold text-green-600">{{ stats()!.todayHandovers }}</span>
              </div>
            </div>
          </div>

          <div class="bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-800 dark:to-gray-900 
                      rounded-lg p-6 border border-purple-200 dark:border-gray-700">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">💡 Quick Tips</h3>
            <ul class="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li class="flex items-start gap-2">
                <span class="text-purple-600">•</span>
                <span>Issue floats early to avoid delays</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-purple-600">•</span>
                <span>Verify handover amounts carefully</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-purple-600">•</span>
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
      const response = await this.cashFloatApi.getCashierStats().toPromise();
      this.stats.set(response as any);
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

  formatAmount(amount: number): string {
    return amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
