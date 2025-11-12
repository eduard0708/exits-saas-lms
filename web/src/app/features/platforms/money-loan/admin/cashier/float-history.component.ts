import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  CashFloatApiService, 
  formatCurrency, 
  formatDate as sharedFormatDate, 
  formatTime as sharedFormatTime 
} from '@shared/api';
import type { CashFloat } from '@shared/models';

// Extended interface for history view
interface FloatHistoryItem extends Partial<CashFloat> {
  type: 'issuance' | 'handover';
  collector_name: string;
  actual_amount?: number;
  variance?: number;
}

@Component({
  selector: 'app-float-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <!-- Header -->
      <div class="mb-6">
        <button
          (click)="goBack()"
          class="text-gray-600 hover:text-gray-900 mb-2 flex items-center gap-2"
        >
          ← Back to Dashboard
        </button>
        <h1 class="text-3xl font-bold text-gray-900">Float History</h1>
        <p class="text-gray-600 mt-1">
          Complete transaction log of all cash float operations
        </p>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-lg shadow p-4 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              [(ngModel)]="filters.fromDate"
              (change)="applyFilters()"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              [(ngModel)]="filters.toDate"
              (change)="applyFilters()"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              [(ngModel)]="filters.type"
              (change)="applyFilters()"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="issuance">Float Issuance</option>
              <option value="handover">Handover</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              [(ngModel)]="filters.status"
              (change)="applyFilters()"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        <div class="flex justify-between items-center mt-4">
          <button
            (click)="resetFilters()"
            class="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Reset Filters
          </button>
          <button
            (click)="exportToCsv()"
            class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            📥 Export to CSV
          </button>
        </div>
      </div>

      <!-- Summary Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-sm text-gray-500">Total Records</div>
          <div class="text-2xl font-bold text-gray-900">
            {{ filteredHistory().length }}
          </div>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-sm text-gray-500">Total Issued</div>
          <div class="text-2xl font-bold text-blue-600">
            {{ formatAmount(totalIssued()) }}
          </div>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-sm text-gray-500">Total Returned</div>
          <div class="text-2xl font-bold text-green-600">
            {{ formatAmount(totalReturned()) }}
          </div>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-sm text-gray-500">Net Variance</div>
          <div class="text-2xl font-bold"
               [class.text-green-600]="totalVariance() >= 0"
               [class.text-red-600]="totalVariance() < 0">
            {{ formatAmount(totalVariance()) }}
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading()" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p class="mt-4 text-gray-600">Loading history...</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading() && filteredHistory().length === 0" 
           class="bg-white rounded-lg shadow-lg p-12 text-center">
        <div class="text-6xl mb-4">📋</div>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">
          No Records Found
        </h3>
        <p class="text-gray-600">
          Try adjusting your filters to see more results.
        </p>
      </div>

      <!-- History Table -->
      <div *ngIf="!loading() && filteredHistory().length > 0" 
           class="bg-white rounded-lg shadow-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date/Time
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Collector
                </th>
                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Float Amount
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actual Amount
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Variance
                </th>
                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let item of filteredHistory()" class="hover:bg-gray-50">
                <!-- Date/Time -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">
                    {{ formatDate(item.float_date) }}
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ formatTime(item.issued_at || item.confirmed_at || '') }}
                  </div>
                </td>

                <!-- Collector -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">
                    {{ item.collector_name }}
                  </div>
                  <div class="text-xs text-gray-500">
                    ID: {{ item.collector_id }}
                  </div>
                </td>

                <!-- Type -->
                <td class="px-6 py-4 whitespace-nowrap text-center">
                  <span *ngIf="item.type === 'issuance'"
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    📤 Issuance
                  </span>
                  <span *ngIf="item.type === 'handover'"
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    📥 Handover
                  </span>
                </td>

                <!-- Float Amount -->
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {{ formatAmount(item.float_amount) }}
                </td>

                <!-- Actual Amount -->
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <span *ngIf="item.actual_amount !== undefined"
                        class="font-semibold text-gray-900">
                    {{ formatAmount(item.actual_amount) }}
                  </span>
                  <span *ngIf="item.actual_amount === undefined"
                        class="text-gray-400">
                    N/A
                  </span>
                </td>

                <!-- Variance -->
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <span *ngIf="item.variance !== undefined && item.variance !== 0"
                        class="font-semibold"
                        [class.text-green-600]="item.variance > 0"
                        [class.text-red-600]="item.variance < 0">
                    {{ formatAmount(item.variance) }}
                  </span>
                  <span *ngIf="item.variance === 0"
                        class="text-green-600 font-semibold">
                    ✓ Exact
                  </span>
                  <span *ngIf="item.variance === undefined"
                        class="text-gray-400">
                    N/A
                  </span>
                </td>

                <!-- Status -->
                <td class="px-6 py-4 whitespace-nowrap text-center">
                  <span *ngIf="item.status === 'confirmed'"
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✓ Confirmed
                  </span>
                  <span *ngIf="item.status === 'pending'"
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    ⏳ Pending
                  </span>
                  <span *ngIf="item.status === 'rejected'"
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    ✗ Rejected
                  </span>
                </td>

                <!-- Notes -->
                <td class="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                  {{ item.notes || '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pagination Info -->
      <div *ngIf="!loading() && filteredHistory().length > 0"
           class="mt-4 text-center text-sm text-gray-500">
        Showing {{ filteredHistory().length }} records
      </div>
    </div>
  `
})
export class FloatHistoryComponent implements OnInit {
  loading = signal(false);
  history = signal<FloatHistoryItem[]>([]);
  filteredHistory = signal<FloatHistoryItem[]>([]);

  filters = {
    fromDate: '',
    toDate: '',
    type: '',
    status: ''
  };

  constructor(
    private cashFloatApi: CashFloatApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.setDefaultDates();
    this.loadHistory();
  }

  setDefaultDates() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    this.filters.fromDate = thirtyDaysAgo.toISOString().split('T')[0];
    this.filters.toDate = today.toISOString().split('T')[0];
  }

  loadHistory() {
    this.loading.set(true);
    this.cashFloatApi.getFloatHistory(this.filters.fromDate, this.filters.toDate)
      .subscribe({
        next: (data: FloatHistoryItem[]) => {
          this.history.set(data);
          this.applyFilters();
          this.loading.set(false);
        },
        error: (error: any) => {
          console.error('Error loading history:', error);
          this.loading.set(false);
        }
      });
  }

  applyFilters() {
    let filtered = [...this.history()];

    if (this.filters.type) {
      filtered = filtered.filter(item => item.type === this.filters.type);
    }

    if (this.filters.status) {
      filtered = filtered.filter(item => item.status === this.filters.status);
    }

    this.filteredHistory.set(filtered);
  }

  resetFilters() {
    this.setDefaultDates();
    this.filters.type = '';
    this.filters.status = '';
    this.loadHistory();
  }

  totalIssued(): number {
    return this.filteredHistory()
      .filter(item => item.type === 'issuance')
      .reduce((sum, item) => sum + (item.float_amount || 0), 0);
  }

  totalReturned(): number {
    return this.filteredHistory()
      .filter(item => item.type === 'handover' && item.actual_amount)
      .reduce((sum, item) => sum + (item.actual_amount || 0), 0);
  }

  totalVariance(): number {
    return this.filteredHistory()
      .filter(item => item.variance !== undefined)
      .reduce((sum, item) => sum + (item.variance || 0), 0);
  }

  exportToCsv() {
    const csv = this.generateCsv();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `float-history-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  generateCsv(): string {
    const headers = ['Date', 'Collector', 'Type', 'Float Amount', 'Actual Amount', 'Variance', 'Status', 'Notes'];
    const rows = this.filteredHistory().map(item => [
      this.formatDate(item.float_date || ''),
      item.collector_name,
      item.type,
      (item.float_amount || 0).toString(),
      item.actual_amount?.toString() || 'N/A',
      item.variance?.toString() || 'N/A',
      item.status || '',
      item.notes || ''
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
  }

  // Utility methods now use shared functions
  formatAmount = formatCurrency;
  formatDate = sharedFormatDate;
  formatTime = sharedFormatTime;

  goBack() {
    this.router.navigate(['/platforms/money-loan/admin/cashier']);
  }
}
