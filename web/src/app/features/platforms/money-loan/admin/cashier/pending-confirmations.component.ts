import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { CashFloatApiService, formatCurrency, formatDate, formatTime } from '@shared/api';
import type { CashFloat } from '@shared/models';

interface PendingFloat {
  id: number;
  collector_id: number;
  collector_name: string;
  float_date: string;
  float_amount: number;
  daily_cap: number;
  issued_at: string;
  status: string;
  notes?: string;
  time_elapsed: string;
}

@Component({
  selector: 'app-pending-confirmations',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-4">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button (click)="goBack()"
                  class="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </button>
          <div>
            <h1 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span class="text-2xl">⏳</span> Pending Confirmations
            </h1>
            <p class="text-xs text-gray-600 dark:text-gray-400">
              Floats waiting for collector confirmation
            </p>
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs text-gray-500 dark:text-gray-400">Last updated</div>
          <div class="text-sm font-semibold text-gray-900 dark:text-white">
            {{ lastUpdated }}
          </div>
        </div>
      </div>

      <!-- Stats Bar -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div class="text-xs text-gray-500 dark:text-gray-400">Total Pending</div>
          <div class="text-xl font-bold text-orange-600">
            {{ pendingFloats().length }}
          </div>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div class="text-xs text-gray-500 dark:text-gray-400">Total Amount</div>
          <div class="text-xl font-bold text-blue-600">
            {{ formatAmount(totalPendingAmount()) }}
          </div>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div class="text-xs text-gray-500 dark:text-gray-400">Oldest Pending</div>
          <div class="text-xl font-bold text-red-600">
            {{ oldestPending() }}
          </div>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div class="text-xs text-gray-500 dark:text-gray-400">Auto-refresh</div>
          <div class="text-xl font-bold text-green-600">
            30s
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading()" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-3 text-sm text-gray-600 dark:text-gray-400">Loading pending confirmations...</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading() && pendingFloats().length === 0"
           class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div class="text-5xl mb-3">✅</div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          All Floats Confirmed!
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          There are no floats waiting for collector confirmation at this time.
        </p>
        <button
          (click)="goBack()"
          class="bg-blue-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>

      <!-- Pending Floats Grid -->
      <div *ngIf="!loading() && pendingFloats().length > 0"
           class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div *ngFor="let float of pendingFloats()"
             class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
          <!-- Status Badge -->
          <div class="bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 border-b border-orange-100 dark:border-orange-800">
            <div class="flex items-center justify-between">
              <span class="text-orange-800 dark:text-orange-300 font-semibold text-xs">
                ⏳ PENDING CONFIRMATION
              </span>
              <span class="text-xs text-orange-600 dark:text-orange-400">
                {{ float.time_elapsed }}
              </span>
            </div>
          </div>

          <!-- Float Details -->
          <div class="p-3">
            <div class="mb-3">
              <h3 class="text-base font-bold text-gray-900 dark:text-white mb-0.5">
                {{ float.collector_name }}
              </h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Collector ID: {{ float.collector_id }}
              </p>
            </div>

            <div class="space-y-2 mb-4">
              <div class="flex justify-between">
                <span class="text-gray-600">Float Amount:</span>
                <span class="font-semibold text-gray-900">
                  {{ formatAmount(float.float_amount) }}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Daily Cap:</span>
                <span class="font-semibold text-gray-900">
                  {{ formatAmount(float.daily_cap) }}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Float Date:</span>
                <span class="font-semibold text-gray-900">
                  {{ formatDate(float.float_date) }}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Issued At:</span>
                <span class="font-semibold text-gray-900">
                  {{ formatTime(float.issued_at) }}
                </span>
              </div>
            </div>

            <div *ngIf="float.notes"
                 class="bg-gray-50 rounded-lg p-3 mb-4">
              <p class="text-sm text-gray-600">
                <span class="font-semibold">Notes:</span> {{ float.notes }}
              </p>
            </div>

            <!-- Alert if overdue -->
            <div *ngIf="isOverdue(float.issued_at)"
                 class="bg-red-50 border border-red-200 rounded-lg p-3">
              <div class="flex items-start gap-2">
                <span class="text-red-600">⚠️</span>
                <p class="text-sm text-red-800">
                  This float has been pending for over 1 hour. Consider contacting the collector.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Instructions -->
      <div class="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 class="font-semibold text-blue-900 mb-2">💡 What happens next?</h3>
        <ul class="text-sm text-blue-800 space-y-1">
          <li>• Collectors will confirm receipt of their float using the mobile app</li>
          <li>• Once confirmed, floats will disappear from this list automatically</li>
          <li>• If a float remains unconfirmed for over 1 hour, contact the collector</li>
          <li>• This page refreshes automatically every 30 seconds</li>
        </ul>
      </div>
    </div>
  `
})
export class PendingConfirmationsComponent implements OnInit, OnDestroy {
  loading = signal(false);
  pendingFloats = signal<PendingFloat[]>([]);
  lastUpdated = '';
  private refreshSubscription?: Subscription;

  constructor(
    private cashFloatApi: CashFloatApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadPendingFloats();
    this.startAutoRefresh();
  }

  ngOnDestroy() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadPendingFloats() {
    this.loading.set(true);
    this.cashFloatApi.getPendingConfirmations()
      .subscribe({
        next: (response: any) => {
          this.pendingFloats.set(response.data || []);
          this.loading.set(false);
          this.lastUpdated = new Date().toLocaleTimeString();
        },
        error: (error: any) => {
          console.error('Error loading pending confirmations:', error);
          this.pendingFloats.set([]);
          this.loading.set(false);
        }
      });
  }

  startAutoRefresh() {
    // Refresh every 30 seconds
    this.refreshSubscription = interval(30000)
      .pipe(switchMap(() => this.cashFloatApi.getPendingConfirmations()))
      .subscribe({
        next: (response: any) => {
          this.pendingFloats.set(response.data || []);
          this.lastUpdated = new Date().toLocaleTimeString();
        }
      });
  }

  totalPendingAmount(): number {
    const floats = this.pendingFloats();
    if (!Array.isArray(floats)) return 0;
    return floats.reduce((sum, f) => sum + f.float_amount, 0);
  }

  oldestPending(): string {
    const floats = this.pendingFloats();
    if (!Array.isArray(floats) || floats.length === 0) return 'N/A';
    const oldest = floats[0];
    return oldest?.time_elapsed || 'N/A';
  }

  isOverdue(issuedAt: string): boolean {
    const issued = new Date(issuedAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - issued.getTime()) / (1000 * 60 * 60);
    return hoursDiff > 1;
  }

  // Use shared utility functions
  formatAmount = formatCurrency;
  formatDate = formatDate;
  formatTime = formatTime;

  goBack() {
    this.router.navigate(['/platforms/money-loan/dashboard/cashier']);
  }
}
