import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface CustomerReport {
  customerId: number;
  customerName: string;
  loanAmount: number;
  paidAmount: number;
  balance: number;
  lastPayment: Date;
  status: 'current' | 'overdue' | 'paid';
}

interface TimeFilter {
  label: string;
  value: 'today' | 'week' | 'month' | 'custom';
}

@Component({
  selector: 'app-customer-reports',
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
          🗂️ Customer Reports
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          View customer payment history and balances
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
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
              @for (filter of timeFilters; track filter.value) {
                <option [value]="filter.value">{{ filter.label }}</option>
              }
            </select>
          </div>

          <!-- Search -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Customer
            </label>
            <input type="text" [(ngModel)]="searchTerm" (input)="applyFilters()"
                   placeholder="Name or ID..."
                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
          </div>

          <!-- Status Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select [(ngModel)]="statusFilter" (change)="applyFilters()"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
              <option value="all">All Status</option>
              <option value="current">Current</option>
              <option value="overdue">Overdue</option>
              <option value="paid">Paid Off</option>
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
                     class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                To Date
              </label>
              <input type="date" [(ngModel)]="customEndDate" (change)="applyFilters()"
                     class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
            </div>
          </div>
        }
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div class="text-blue-600 dark:text-blue-400 text-sm font-medium mb-1">Total Customers</div>
          <div class="text-2xl font-bold text-blue-900 dark:text-blue-300">{{ summary().totalCustomers }}</div>
        </div>
        <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div class="text-green-600 dark:text-green-400 text-sm font-medium mb-1">Total Payments</div>
          <div class="text-2xl font-bold text-green-900 dark:text-green-300">{{ formatCurrency(summary().totalPaid) }}</div>
        </div>
        <div class="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
          <div class="text-orange-600 dark:text-orange-400 text-sm font-medium mb-1">Outstanding Balance</div>
          <div class="text-2xl font-bold text-orange-900 dark:text-orange-300">{{ formatCurrency(summary().totalBalance) }}</div>
        </div>
        <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <div class="text-purple-600 dark:text-purple-400 text-sm font-medium mb-1">Collection Rate</div>
          <div class="text-2xl font-bold text-purple-900 dark:text-purple-300">{{ summary().collectionRate }}%</div>
        </div>
      </div>

      <!-- Customer Table -->
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Customer
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Loan Amount
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Paid Amount
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Balance
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Payment
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              @if (filteredReports().length === 0) {
                <tr>
                  <td colspan="7" class="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No customer reports found
                  </td>
                </tr>
              }
              @for (report of filteredReports(); track report.customerId) {
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900 dark:text-white">
                      {{ report.customerName }}
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                      ID: {{ report.customerId }}
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                    {{ formatCurrency(report.loanAmount) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-medium">
                    {{ formatCurrency(report.paidAmount) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-orange-600 dark:text-orange-400 font-medium">
                    {{ formatCurrency(report.balance) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {{ formatDate(report.lastPayment) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span [class]="getStatusClass(report.status)">
                      {{ getStatusLabel(report.status) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <button (click)="viewDetails(report.customerId)"
                            class="text-blue-600 dark:text-blue-400 hover:underline">
                      View Details
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div class="text-sm text-gray-600 dark:text-gray-400">
            Showing {{ filteredReports().length }} of {{ reports().length }} customers
          </div>
          <div class="flex gap-2">
            <button class="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
              Previous
            </button>
            <button class="px-3 py-1 bg-blue-600 text-white rounded text-sm">
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
export class CustomerReportsComponent implements OnInit {
  searchTerm = signal('');
  selectedPeriod = signal<'today' | 'week' | 'month' | 'custom'>('month');
  statusFilter = signal<'all' | 'current' | 'overdue' | 'paid'>('all');
  customStartDate = signal('');
  customEndDate = signal('');

  timeFilters: TimeFilter[] = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'Custom Range', value: 'custom' }
  ];

  reports = signal<CustomerReport[]>([
    {
      customerId: 1001,
      customerName: 'Juan Dela Cruz',
      loanAmount: 50000,
      paidAmount: 35000,
      balance: 15000,
      lastPayment: new Date('2025-01-10'),
      status: 'current'
    },
    {
      customerId: 1002,
      customerName: 'Maria Santos',
      loanAmount: 30000,
      paidAmount: 18000,
      balance: 12000,
      lastPayment: new Date('2025-01-05'),
      status: 'overdue'
    },
    {
      customerId: 1003,
      customerName: 'Pedro Reyes',
      loanAmount: 25000,
      paidAmount: 25000,
      balance: 0,
      lastPayment: new Date('2024-12-28'),
      status: 'paid'
    },
    {
      customerId: 1004,
      customerName: 'Rosa Garcia',
      loanAmount: 40000,
      paidAmount: 28000,
      balance: 12000,
      lastPayment: new Date('2025-01-08'),
      status: 'current'
    },
    {
      customerId: 1005,
      customerName: 'Carlos Lopez',
      loanAmount: 35000,
      paidAmount: 20000,
      balance: 15000,
      lastPayment: new Date('2024-12-30'),
      status: 'overdue'
    }
  ]);

  filteredReports = computed(() => {
    let filtered = this.reports();

    // Search filter
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(r =>
        r.customerName.toLowerCase().includes(term) ||
        r.customerId.toString().includes(term)
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
    const totalCustomers = reports.length;
    const totalPaid = reports.reduce((sum, r) => sum + r.paidAmount, 0);
    const totalBalance = reports.reduce((sum, r) => sum + r.balance, 0);
    const totalLoan = reports.reduce((sum, r) => sum + r.loanAmount, 0);
    const collectionRate = totalLoan > 0 ? Math.round((totalPaid / totalLoan) * 100) : 0;

    return { totalCustomers, totalPaid, totalBalance, collectionRate };
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

  viewDetails(customerId: number): void {
    alert(`View details for customer ${customerId}`);
    // TODO: Navigate to customer detail page
  }

  exportPDF(): void {
    alert('Exporting Customer Reports to PDF...');
    // TODO: Implement PDF export
  }

  exportExcel(): void {
    alert('Exporting Customer Reports to Excel...');
    // TODO: Implement Excel export
  }

  formatCurrency(amount: number): string {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      current: 'px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      overdue: 'px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
      paid: 'px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
    };
    return classes[status] || '';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      current: 'Current',
      overdue: 'Overdue',
      paid: 'Paid Off'
    };
    return labels[status] || status;
  }
}
