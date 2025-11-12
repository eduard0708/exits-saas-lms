import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { CashFloatApiService, formatCurrency, formatDate, formatTime } from '@shared/api';
import type { CashHandover } from '@shared/models';

interface PendingHandover {
  id: number;
  collector_id: number;
  collector_name: string;
  handover_date: string;
  opening_balance: number;
  total_collections: number;
  total_disbursements: number;
  expected_amount: number;
  actual_amount: number;
  variance: number;
  notes?: string;
  initiated_at: string;
  time_elapsed: string;
}

@Component({
  selector: 'app-pending-handovers',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
            <h1 class="text-3xl font-bold text-gray-900">Pending Handovers</h1>
            <p class="text-gray-600 mt-1">
              End-of-day cash returns waiting for confirmation
            </p>
          </div>
          <div class="text-right">
            <div class="text-sm text-gray-500">Last updated</div>
            <div class="text-lg font-semibold text-gray-900">
              {{ lastUpdated }}
            </div>
          </div>
        </div>
      </div>

      <!-- Stats Bar -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-sm text-gray-500">Total Pending</div>
          <div class="text-2xl font-bold text-orange-600">
            {{ pendingHandovers().length }}
          </div>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-sm text-gray-500">Total Expected</div>
          <div class="text-2xl font-bold text-blue-600">
            {{ formatAmount(totalExpected()) }}
          </div>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-sm text-gray-500">Total Variance</div>
          <div class="text-2xl font-bold" [class.text-green-600]="totalVariance() >= 0"
               [class.text-red-600]="totalVariance() < 0">
            {{ formatAmount(totalVariance()) }}
          </div>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-sm text-gray-500">With Discrepancy</div>
          <div class="text-2xl font-bold text-yellow-600">
            {{ countWithVariance() }}
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading()" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p class="mt-4 text-gray-600">Loading pending handovers...</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading() && pendingHandovers().length === 0" 
           class="bg-white rounded-lg shadow-lg p-12 text-center">
        <div class="text-6xl mb-4">✅</div>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">
          No Pending Handovers
        </h3>
        <p class="text-gray-600 mb-6">
          All cash handovers have been processed.
        </p>
        <button
          (click)="goBack()"
          class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>

      <!-- Pending Handovers Grid -->
      <div *ngIf="!loading() && pendingHandovers().length > 0" 
           class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div *ngFor="let handover of pendingHandovers()" 
             class="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow">
          <!-- Header with Status -->
          <div class="px-6 py-4 border-b"
               [class.bg-yellow-50]="handover.variance !== 0"
               [class.bg-green-50]="handover.variance === 0">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-bold text-gray-900">
                  {{ handover.collector_name }}
                </h3>
                <p class="text-sm text-gray-500">
                  {{ formatDate(handover.handover_date) }} • {{ formatTime(handover.initiated_at) }}
                </p>
              </div>
              <div class="text-right">
                <span *ngIf="handover.variance === 0"
                      class="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                  ✓ Exact Match
                </span>
                <span *ngIf="handover.variance !== 0"
                      class="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                  ⚠️ Variance
                </span>
              </div>
            </div>
          </div>

          <!-- Transaction Details -->
          <div class="p-6">
            <div class="grid grid-cols-2 gap-4 mb-4">
              <div class="bg-gray-50 rounded-lg p-3">
                <div class="text-xs text-gray-500 mb-1">Opening Balance</div>
                <div class="text-lg font-semibold text-gray-900">
                  {{ formatAmount(handover.opening_balance) }}
                </div>
              </div>
              <div class="bg-green-50 rounded-lg p-3">
                <div class="text-xs text-green-600 mb-1">+ Collections</div>
                <div class="text-lg font-semibold text-green-700">
                  {{ formatAmount(handover.total_collections) }}
                </div>
              </div>
              <div class="bg-red-50 rounded-lg p-3">
                <div class="text-xs text-red-600 mb-1">- Disbursements</div>
                <div class="text-lg font-semibold text-red-700">
                  {{ formatAmount(handover.total_disbursements) }}
                </div>
              </div>
              <div class="bg-blue-50 rounded-lg p-3">
                <div class="text-xs text-blue-600 mb-1">= Expected</div>
                <div class="text-lg font-semibold text-blue-700">
                  {{ formatAmount(handover.expected_amount) }}
                </div>
              </div>
            </div>

            <!-- Actual vs Expected -->
            <div class="border-t border-b py-4 mb-4">
              <div class="flex justify-between items-center mb-2">
                <span class="text-gray-600">Actual Amount:</span>
                <span class="text-xl font-bold text-gray-900">
                  {{ formatAmount(handover.actual_amount) }}
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-600">Variance:</span>
                <span class="text-xl font-bold"
                      [class.text-green-600]="handover.variance >= 0"
                      [class.text-red-600]="handover.variance < 0">
                  {{ formatAmount(handover.variance) }}
                  <span class="text-sm">
                    ({{ handover.variance >= 0 ? 'Over' : 'Short' }})
                  </span>
                </span>
              </div>
            </div>

            <!-- Notes -->
            <div *ngIf="handover.notes" class="bg-gray-50 rounded-lg p-3 mb-4">
              <p class="text-sm text-gray-700">
                <span class="font-semibold">Collector Notes:</span><br>
                {{ handover.notes }}
              </p>
            </div>

            <!-- Variance Alert -->
            <div *ngIf="handover.variance !== 0" 
                 class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p class="text-sm text-yellow-800">
                <strong>⚠️ Attention:</strong> There is a variance of 
                <strong>{{ formatAmount(Math.abs(handover.variance)) }}</strong>.
                Please verify the amount before confirming.
              </p>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-3">
              <button
                (click)="confirmHandover(handover)"
                class="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold"
                [disabled]="processing()"
              >
                ✓ Confirm Receipt
              </button>
              <button
                (click)="showRejectDialog(handover)"
                class="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-colors font-semibold"
                [disabled]="processing()"
              >
                ✗ Reject
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Instructions -->
      <div class="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 class="font-semibold text-blue-900 mb-2">💡 Handover Process</h3>
        <ul class="text-sm text-blue-800 space-y-1">
          <li>• Verify the actual cash amount matches what's being handed over</li>
          <li>• If there's a variance, investigate the discrepancy before confirming</li>
          <li>• Rejecting a handover will notify the collector to recount and resubmit</li>
          <li>• All confirmations are logged for audit purposes</li>
        </ul>
      </div>

      <!-- Reject Dialog -->
      <div *ngIf="showRejectModal" 
           class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
           (click)="closeRejectDialog()">
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
             (click)="$event.stopPropagation()">
          <h3 class="text-xl font-bold text-gray-900 mb-4">
            Reject Handover
          </h3>
          <p class="text-gray-600 mb-4">
            Please provide a reason for rejecting this handover. The collector will be notified.
          </p>
          <textarea
            [(ngModel)]="rejectReason"
            rows="4"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="e.g., Cash amount doesn't match, please recount and resubmit..."
          ></textarea>
          <div class="flex gap-3 mt-4">
            <button
              (click)="closeRejectDialog()"
              class="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              (click)="confirmReject()"
              [disabled]="!rejectReason.trim() || processing()"
              class="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              Reject Handover
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PendingHandoversComponent implements OnInit, OnDestroy {
  loading = signal(false);
  processing = signal(false);
  pendingHandovers = signal<PendingHandover[]>([]);
  lastUpdated = '';
  showRejectModal = false;
  rejectReason = '';
  selectedHandover: PendingHandover | null = null;
  private refreshSubscription?: Subscription;
  Math = Math;

  constructor(
    private cashFloatApi: CashFloatApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadPendingHandovers();
    this.startAutoRefresh();
  }

  ngOnDestroy() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadPendingHandovers() {
    this.loading.set(true);
    this.cashFloatApi.getPendingHandovers()
      .subscribe({
        next: (data: any) => {
          this.pendingHandovers.set(data);
          this.loading.set(false);
          this.lastUpdated = new Date().toLocaleTimeString();
        },
        error: (error: any) => {
          console.error('Error loading pending handovers:', error);
          this.loading.set(false);
        }
      });
  }

  startAutoRefresh() {
    this.refreshSubscription = interval(30000)
      .pipe(switchMap(() => this.cashFloatApi.getPendingHandovers()))
      .subscribe({
        next: (data: any) => {
          this.pendingHandovers.set(data);
          this.lastUpdated = new Date().toLocaleTimeString();
        }
      });
  }

  confirmHandover(handover: PendingHandover) {
    if (!confirm(`Confirm receipt of ${formatCurrency(handover.actual_amount)} from ${handover.collector_name}?`)) {
      return;
    }

    this.processing.set(true);
    this.cashFloatApi.confirmHandover(handover.id, true).subscribe({
      next: () => {
        alert('Handover confirmed successfully!');
        this.loadPendingHandovers();
        this.processing.set(false);
      },
      error: (error: any) => {
        console.error('Error confirming handover:', error);
        alert('Failed to confirm handover. Please try again.');
        this.processing.set(false);
      }
    });
  }

  showRejectDialog(handover: PendingHandover) {
    this.selectedHandover = handover;
    this.rejectReason = '';
    this.showRejectModal = true;
  }

  closeRejectDialog() {
    this.showRejectModal = false;
    this.selectedHandover = null;
    this.rejectReason = '';
  }

  confirmReject() {
    if (!this.selectedHandover || !this.rejectReason.trim()) return;

    this.processing.set(true);
    this.cashFloatApi.confirmHandover(this.selectedHandover.id, false, this.rejectReason).subscribe({
      next: () => {
        alert('Handover rejected. Collector has been notified.');
        this.closeRejectDialog();
        this.loadPendingHandovers();
        this.processing.set(false);
      },
      error: (error: any) => {
        console.error('Error rejecting handover:', error);
        alert('Failed to reject handover. Please try again.');
        this.processing.set(false);
      }
    });
  }

  totalExpected(): number {
    return this.pendingHandovers().reduce((sum, h) => sum + h.expected_amount, 0);
  }

  totalVariance(): number {
    return this.pendingHandovers().reduce((sum, h) => sum + h.variance, 0);
  }

  countWithVariance(): number {
    return this.pendingHandovers().filter(h => h.variance !== 0).length;
  }

  // Utility methods now use shared functions
  formatAmount = formatCurrency;

  goBack() {
    this.router.navigate(['/platforms/money-loan/admin/cashier']);
  }
}
