import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface CashierDailyBook {
  date: Date;
  openingBalance: number;
  floatsIssued: number;
  handoversReceived: number;
  bankDeposits: number;
  closingBalance: number;
  variance: number;
  status: 'balanced' | 'variance-pending' | 'reconciled';
}

interface TimeFilter {
  label: string;
  value: 'today' | 'week' | 'month' | 'custom';
}

@Component({
  selector: 'app-cashier-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-6">
        <button (click)="goBack()" class="text-blue-600 dark:text-blue-400 hover:underline mb-2 flex items-center gap-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          Back to Reports
        </button>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          💵 Cashier Reports
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          Daily book keeping and reconciliation records
        </p>
      </div>

      <!-- Filters -->
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Time Period -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Time Period
            </label>
            <select [(ngModel)]="selectedPeriod" (change)="applyFilters()"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500">
              @for (filter of timeFilters; track filter.value) {
                <option [value]="filter.value">{{ filter.label }}</option>
              }
            </select>
          </div>

          <!-- Status Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select [(ngModel)]="statusFilter" (change)="applyFilters()"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500">
              <option value="all">All Status</option>
              <option value="balanced">Balanced</option>
              <option value="variance-pending">Variance Pending</option>
              <option value="reconciled">Reconciled</option>
            </select>
          </div>

          <!-- View Mode -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              View Mode
            </label>
            <select [(ngModel)]="viewMode" (change)="applyFilters()"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500">
              <option value="daily">Daily Book</option>
              <option value="weekly">Weekly Deposits</option>
              <option value="monthly">Monthly Summary</option>
            </select>
          </div>

          <!-- Export -->
          <div class="flex items-end gap-2">
            <button (click)="exportPDF()"
                    class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
              <span>📄</span> PDF
            </button>
            <button (click)="exportExcel()"
                    class="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
              <span>📊</span> Excel
            </button>
          </div>
        </div>

        <!-- Custom Date Range (if selected) -->
        @if (selectedPeriod === 'custom') {
          <div class="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                From Date
              </label>
              <input type="date" [(ngModel)]="customStartDate" (change)="applyFilters()"
                     class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                To Date
              </label>
              <input type="date" [(ngModel)]="customEndDate" (change)="applyFilters()"
                     class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500">
            </div>
          </div>
        }
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div class="text-blue-600 dark:text-blue-400 text-sm font-medium mb-1">Total Floats Issued</div>
          <div class="text-2xl font-bold text-blue-900 dark:text-blue-300">{{ formatCurrency(summary().totalFloatsIssued) }}</div>
        </div>
        <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div class="text-green-600 dark:text-green-400 text-sm font-medium mb-1">Total Handovers</div>
          <div class="text-2xl font-bold text-green-900 dark:text-green-300">{{ formatCurrency(summary().totalHandovers) }}</div>
        </div>
        <div class="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
          <div class="text-orange-600 dark:text-orange-400 text-sm font-medium mb-1">Bank Deposits</div>
          <div class="text-2xl font-bold text-orange-900 dark:text-orange-300">{{ formatCurrency(summary().totalDeposits) }}</div>
        </div>
        <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <div class="text-purple-600 dark:text-purple-400 text-sm font-medium mb-1">Current Balance</div>
          <div class="text-2xl font-bold text-purple-900 dark:text-purple-300">{{ formatCurrency(summary().currentBalance) }}</div>
        </div>
        <div [class]="summary().totalVariance === 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'"
             class="rounded-lg p-4 border">
          <div [class]="summary().totalVariance === 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'"
               class="text-sm font-medium mb-1">Total Variance</div>
          <div [class]="summary().totalVariance === 0 ? 'text-green-900 dark:text-green-300' : 'text-red-900 dark:text-red-300'"
               class="text-2xl font-bold">{{ formatCurrency(Math.abs(summary().totalVariance)) }}</div>
        </div>
      </div>

      <!-- Cash Flow Chart Placeholder -->
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">Cash Flow Analysis</h3>
        <div class="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <div class="text-center text-gray-500 dark:text-gray-400">
            <svg class="w-16 h-16 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>
            </svg>
            <p>Cash flow visualization will appear here</p>
          </div>
        </div>
      </div>

      <!-- Daily Book Table -->
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">
            {{ viewMode === 'daily' ? 'Daily Book' : viewMode === 'weekly' ? 'Weekly Deposits' : 'Monthly Summary' }}
          </h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Opening Balance
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Floats Issued
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Handovers Received
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Bank Deposits
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Closing Balance
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Variance
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              @if (filteredReports().length === 0) {
                <tr>
                  <td colspan="8" class="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No cashier reports found
                  </td>
                </tr>
              }
              @for (report of filteredReports(); track report.date) {
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {{ formatDate(report.date) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                    {{ formatCurrency(report.openingBalance) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400 font-medium">
                    -{{ formatCurrency(report.floatsIssued) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-medium">
                    +{{ formatCurrency(report.handoversReceived) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-orange-600 dark:text-orange-400 font-medium">
                    -{{ formatCurrency(report.bankDeposits) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-purple-600 dark:text-purple-400 font-medium">
                    {{ formatCurrency(report.closingBalance) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    @if (report.variance === 0) {
                      <span class="text-green-600 dark:text-green-400">✓ Balanced</span>
                    } @else if (report.variance > 0) {
                      <span class="text-red-600 dark:text-red-400">+{{ formatCurrency(report.variance) }}</span>
                    } @else {
                      <span class="text-orange-600 dark:text-orange-400">{{ formatCurrency(report.variance) }}</span>
                    }
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span [class]="getStatusClass(report.status)">
                      {{ getStatusLabel(report.status) }}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
            <tfoot class="bg-gray-50 dark:bg-gray-900 border-t-2 border-gray-300 dark:border-gray-600">
              <tr class="font-bold">
                <td class="px-6 py-4 text-sm text-gray-900 dark:text-white">
                  TOTALS
                </td>
                <td class="px-6 py-4 text-sm text-gray-900 dark:text-white">
                  {{ formatCurrency(summary().totalFloatsIssued) }}
                </td>
                <td class="px-6 py-4 text-sm text-blue-600 dark:text-blue-400">
                  -{{ formatCurrency(summary().totalFloatsIssued) }}
                </td>
                <td class="px-6 py-4 text-sm text-green-600 dark:text-green-400">
                  +{{ formatCurrency(summary().totalHandovers) }}
                </td>
                <td class="px-6 py-4 text-sm text-orange-600 dark:text-orange-400">
                  -{{ formatCurrency(summary().totalDeposits) }}
                </td>
                <td class="px-6 py-4 text-sm text-purple-600 dark:text-purple-400">
                  {{ formatCurrency(summary().currentBalance) }}
                </td>
                <td class="px-6 py-4 text-sm" [class]="summary().totalVariance === 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                  {{ formatCurrency(summary().totalVariance) }}
                </td>
                <td class="px-6 py-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Pagination -->
        <div class="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div class="text-sm text-gray-600 dark:text-gray-400">
            Showing {{ filteredReports().length }} of {{ reports().length }} records
          </div>
          <div class="flex gap-2">
            <button class="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
              Previous
            </button>
            <button class="px-3 py-1 bg-purple-600 text-white rounded text-sm">
              1
            </button>
            <button class="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class CashierReportsComponent implements OnInit {
  selectedPeriod = signal<'today' | 'week' | 'month' | 'custom'>('week');
  statusFilter = signal<'all' | 'balanced' | 'variance-pending' | 'reconciled'>('all');
  viewMode = signal<'daily' | 'weekly' | 'monthly'>('daily');
  customStartDate = signal('');
  customEndDate = signal('');

  timeFilters: TimeFilter[] = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'Custom Range', value: 'custom' }
  ];

  reports = signal<CashierDailyBook[]>([
    {
      date: new Date('2025-01-10'),
      openingBalance: 50000,
      floatsIssued: 50000,
      handoversReceived: 85200,
      bankDeposits: 60000,
      closingBalance: 25200,
      variance: 0,
      status: 'balanced'
    },
    {
      date: new Date('2025-01-09'),
      openingBalance: 45000,
      floatsIssued: 48000,
      handoversReceived: 78500,
      bankDeposits: 55000,
      closingBalance: 20500,
      variance: 500,
      status: 'variance-pending'
    },
    {
      date: new Date('2025-01-08'),
      openingBalance: 48000,
      floatsIssued: 52000,
      handoversReceived: 82300,
      bankDeposits: 58000,
      closingBalance: 20300,
      variance: 0,
      status: 'reconciled'
    },
    {
      date: new Date('2025-01-07'),
      openingBalance: 46000,
      floatsIssued: 50000,
      handoversReceived: 80000,
      bankDeposits: 56000,
      closingBalance: 20000,
      variance: 0,
      status: 'balanced'
    },
    {
      date: new Date('2025-01-06'),
      openingBalance: 47000,
      floatsIssued: 49000,
      handoversReceived: 76500,
      bankDeposits: 54000,
      closingBalance: 20500,
      variance: -200,
      status: 'variance-pending'
    }
  ]);

  filteredReports = computed(() => {
    let filtered = this.reports();

    // Status filter
    if (this.statusFilter() !== 'all') {
      filtered = filtered.filter(r => r.status === this.statusFilter());
    }

    return filtered;
  });

  summary = computed(() => {
    const reports = this.filteredReports();
    const totalFloatsIssued = reports.reduce((sum, r) => sum + r.floatsIssued, 0);
    const totalHandovers = reports.reduce((sum, r) => sum + r.handoversReceived, 0);
    const totalDeposits = reports.reduce((sum, r) => sum + r.bankDeposits, 0);
    const currentBalance = reports.length > 0 ? reports[0].closingBalance : 0;
    const totalVariance = reports.reduce((sum, r) => sum + r.variance, 0);

    return { totalFloatsIssued, totalHandovers, totalDeposits, currentBalance, totalVariance };
  });

  constructor(private router: Router) {}

  ngOnInit(): void {
    // TODO: Load actual data from API
  }

  applyFilters(): void {
    // Trigger computed signal recalculation
  }

  goBack(): void {
    this.router.navigate(['/platforms/money-loan/admin/cashier/reports']);
  }

  exportPDF(): void {
    alert('Exporting Cashier Reports to PDF...');
    // TODO: Implement PDF export
  }

  exportExcel(): void {
    alert('Exporting Cashier Reports to Excel...');
    // TODO: Implement Excel export
  }

  formatCurrency(amount: number): string {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    });
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      balanced: 'px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      'variance-pending': 'px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      reconciled: 'px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
    };
    return classes[status] || '';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      balanced: 'Balanced',
      'variance-pending': 'Variance Pending',
      reconciled: 'Reconciled'
    };
    return labels[status] || status;
  }
}
