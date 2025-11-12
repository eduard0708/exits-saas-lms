import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface CollectorReport {
  collectorId: number;
  collectorName: string;
  openingBalance: number;
  collections: number;
  disbursements: number;
  closingBalance: number;
  targetCollection: number;
  achievementRate: number;
  customersVisited: number;
  status: 'active' | 'handover-pending' | 'handover-completed';
}

interface TimeFilter {
  label: string;
  value: 'today' | 'week' | 'month' | 'custom';
}

@Component({
  selector: 'app-collector-reports',
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
          💼 Collector Reports
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          Monitor collector performance and cash flow
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
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500">
              @for (filter of timeFilters; track filter.value) {
                <option [value]="filter.value">{{ filter.label }}</option>
              }
            </select>
          </div>

          <!-- Search -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Collector
            </label>
            <input type="text" [(ngModel)]="searchTerm" (input)="applyFilters()"
                   placeholder="Name or ID..."
                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500">
          </div>

          <!-- Status Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select [(ngModel)]="statusFilter" (change)="applyFilters()"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="handover-pending">Handover Pending</option>
              <option value="handover-completed">Handover Completed</option>
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
                     class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                To Date
              </label>
              <input type="date" [(ngModel)]="customEndDate" (change)="applyFilters()"
                     class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500">
            </div>
          </div>
        }
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div class="text-green-600 dark:text-green-400 text-sm font-medium mb-1">Total Collections</div>
          <div class="text-2xl font-bold text-green-900 dark:text-green-300">{{ formatCurrency(summary().totalCollections) }}</div>
        </div>
        <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div class="text-blue-600 dark:text-blue-400 text-sm font-medium mb-1">Total Disbursements</div>
          <div class="text-2xl font-bold text-blue-900 dark:text-blue-300">{{ formatCurrency(summary().totalDisbursements) }}</div>
        </div>
        <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <div class="text-purple-600 dark:text-purple-400 text-sm font-medium mb-1">Cash in Hand</div>
          <div class="text-2xl font-bold text-purple-900 dark:text-purple-300">{{ formatCurrency(summary().totalCashInHand) }}</div>
        </div>
        <div class="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
          <div class="text-orange-600 dark:text-orange-400 text-sm font-medium mb-1">Avg Achievement</div>
          <div class="text-2xl font-bold text-orange-900 dark:text-orange-300">{{ summary().avgAchievement }}%</div>
        </div>
        <div class="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-4 border border-teal-200 dark:border-teal-800">
          <div class="text-teal-600 dark:text-teal-400 text-sm font-medium mb-1">Active Collectors</div>
          <div class="text-2xl font-bold text-teal-900 dark:text-teal-300">{{ summary().activeCollectors }}</div>
        </div>
      </div>

      <!-- Performance Chart Placeholder -->
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">Collection Trend</h3>
        <div class="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <div class="text-center text-gray-500 dark:text-gray-400">
            <svg class="w-16 h-16 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            <p>Chart visualization will appear here</p>
          </div>
        </div>
      </div>

      <!-- Collector Table -->
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Collector
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Opening Balance
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Collections
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Disbursements
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Closing Balance
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Achievement
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Visits
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
                    No collector reports found
                  </td>
                </tr>
              }
              @for (report of filteredReports(); track report.collectorId) {
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900 dark:text-white">
                      {{ report.collectorName }}
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                      ID: {{ report.collectorId }}
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                    {{ formatCurrency(report.openingBalance) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-medium">
                    +{{ formatCurrency(report.collections) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400 font-medium">
                    -{{ formatCurrency(report.disbursements) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-purple-600 dark:text-purple-400 font-medium">
                    {{ formatCurrency(report.closingBalance) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center gap-2">
                      <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div [style.width.%]="report.achievementRate"
                             [class]="getAchievementBarClass(report.achievementRate)"
                             class="h-2 rounded-full transition-all">
                        </div>
                      </div>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">
                        {{ report.achievementRate }}%
                      </span>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {{ report.customersVisited }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span [class]="getStatusClass(report.status)">
                      {{ getStatusLabel(report.status) }}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div class="text-sm text-gray-600 dark:text-gray-400">
            Showing {{ filteredReports().length }} of {{ reports().length }} collectors
          </div>
          <div class="flex gap-2">
            <button class="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
              Previous
            </button>
            <button class="px-3 py-1 bg-green-600 text-white rounded text-sm">
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
export class CollectorReportsComponent implements OnInit {
  searchTerm = signal('');
  selectedPeriod = signal<'today' | 'week' | 'month' | 'custom'>('today');
  statusFilter = signal<'all' | 'active' | 'handover-pending' | 'handover-completed'>('all');
  customStartDate = signal('');
  customEndDate = signal('');

  timeFilters: TimeFilter[] = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'Custom Range', value: 'custom' }
  ];

  reports = signal<CollectorReport[]>([
    {
      collectorId: 2001,
      collectorName: 'Mike Torres',
      openingBalance: 10000,
      collections: 15000,
      disbursements: 8000,
      closingBalance: 17000,
      targetCollection: 12000,
      achievementRate: 125,
      customersVisited: 18,
      status: 'active'
    },
    {
      collectorId: 2002,
      collectorName: 'Anna Cruz',
      openingBalance: 10000,
      collections: 12500,
      disbursements: 7000,
      closingBalance: 15500,
      targetCollection: 12000,
      achievementRate: 104,
      customersVisited: 15,
      status: 'handover-pending'
    },
    {
      collectorId: 2003,
      collectorName: 'Ben Ramos',
      openingBalance: 10000,
      collections: 9800,
      disbursements: 6500,
      closingBalance: 13300,
      targetCollection: 12000,
      achievementRate: 82,
      customersVisited: 12,
      status: 'active'
    },
    {
      collectorId: 2004,
      collectorName: 'Linda Santos',
      openingBalance: 10000,
      collections: 14200,
      disbursements: 5500,
      closingBalance: 18700,
      targetCollection: 12000,
      achievementRate: 118,
      customersVisited: 20,
      status: 'handover-completed'
    },
    {
      collectorId: 2005,
      collectorName: 'Rico Mendoza',
      openingBalance: 10000,
      collections: 11000,
      disbursements: 9000,
      closingBalance: 12000,
      targetCollection: 12000,
      achievementRate: 92,
      customersVisited: 14,
      status: 'active'
    }
  ]);

  filteredReports = computed(() => {
    let filtered = this.reports();

    // Search filter
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(r =>
        r.collectorName.toLowerCase().includes(term) ||
        r.collectorId.toString().includes(term)
      );
    }

    // Status filter
    if (this.statusFilter() !== 'all') {
      filtered = filtered.filter(r => r.status === this.statusFilter());
    }

    return filtered;
  });

  summary = computed(() => {
    const reports = this.filteredReports();
    const totalCollections = reports.reduce((sum, r) => sum + r.collections, 0);
    const totalDisbursements = reports.reduce((sum, r) => sum + r.disbursements, 0);
    const totalCashInHand = reports.reduce((sum, r) => sum + r.closingBalance, 0);
    const avgAchievement = reports.length > 0
      ? Math.round(reports.reduce((sum, r) => sum + r.achievementRate, 0) / reports.length)
      : 0;
    const activeCollectors = reports.filter(r => r.status === 'active').length;

    return { totalCollections, totalDisbursements, totalCashInHand, avgAchievement, activeCollectors };
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
    alert('Exporting Collector Reports to PDF...');
    // TODO: Implement PDF export
  }

  exportExcel(): void {
    alert('Exporting Collector Reports to Excel...');
    // TODO: Implement Excel export
  }

  formatCurrency(amount: number): string {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  getAchievementBarClass(rate: number): string {
    if (rate >= 100) return 'bg-green-500';
    if (rate >= 80) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      active: 'px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      'handover-pending': 'px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      'handover-completed': 'px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
    };
    return classes[status] || '';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      active: 'Active',
      'handover-pending': 'Handover Pending',
      'handover-completed': 'Handover Completed'
    };
    return labels[status] || status;
  }
}
