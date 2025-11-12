import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface CustomerTransaction {
  id: number;
  date: string;
  type: 'disbursement' | 'collection' | 'penalty' | 'waiver';
  loanNumber: string;
  debit: number;
  credit: number;
  balance: number;
  collectorName: string;
  notes?: string;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
  totalLoans: number;
  outstanding: number;
}

@Component({
  selector: 'app-customer-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            🗃️ Customer Ledger
          </h1>
          <p class="text-sm text-gray-600 dark:text-gray-400">View customer transaction history</p>
        </div>
        @if (selectedCustomer()) {
          <button (click)="exportPDF()"
                  class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/>
            </svg>
            Export PDF
          </button>
        }
      </div>

      <!-- Search Section -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Customer
            </label>
            <input type="text"
                   [(ngModel)]="searchTerm"
                   (input)="searchCustomers()"
                   placeholder="Enter name or ID..."
                   class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              From Date
            </label>
            <input type="date"
                   [(ngModel)]="dateRange.from"
                   (change)="loadTransactions()"
                   class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              To Date
            </label>
            <input type="date"
                   [(ngModel)]="dateRange.to"
                   (change)="loadTransactions()"
                   class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
          </div>
        </div>

        <!-- Customer Search Results -->
        @if (searchResults().length > 0 && !selectedCustomer()) {
          <div class="mt-4 border border-gray-200 dark:border-gray-700 rounded-lg max-h-60 overflow-y-auto">
            @for (customer of searchResults(); track customer.id) {
              <div (click)="selectCustomer(customer)"
                   class="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="font-semibold text-gray-900 dark:text-white">{{ customer.name }}</div>
                    <div class="text-sm text-gray-500">ID: #{{ customer.id }} • {{ customer.phone }}</div>
                  </div>
                  <div class="text-right">
                    <div class="text-sm text-gray-500">{{ customer.totalLoans }} loans</div>
                    <div class="text-sm font-semibold" [class.text-red-600]="customer.outstanding > 0">
                      ₱{{ customer.outstanding.toLocaleString() }}
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Selected Customer Info -->
      @if (selectedCustomer()) {
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-gray-600 dark:text-gray-400">Viewing ledger for:</div>
              <div class="text-xl font-bold text-gray-900 dark:text-white">{{ selectedCustomer()!.name }}</div>
              <div class="text-sm text-gray-600 dark:text-gray-400">ID: #{{ selectedCustomer()!.id }} • {{ selectedCustomer()!.phone }}</div>
            </div>
            <button (click)="clearSelection()"
                    class="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300">
              Clear
            </button>
          </div>
        </div>

        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div class="text-sm text-gray-600 dark:text-gray-400">Total Disbursed</div>
            <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
              ₱{{ summary().totalDisbursed.toLocaleString() }}
            </div>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div class="text-sm text-gray-600 dark:text-gray-400">Total Collected</div>
            <div class="text-2xl font-bold text-green-600 dark:text-green-400">
              ₱{{ summary().totalCollected.toLocaleString() }}
            </div>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div class="text-sm text-gray-600 dark:text-gray-400">Penalties</div>
            <div class="text-2xl font-bold text-orange-600 dark:text-orange-400">
              ₱{{ summary().totalPenalties.toLocaleString() }}
            </div>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div class="text-sm text-gray-600 dark:text-gray-400">Outstanding Balance</div>
            <div class="text-2xl font-bold" [class.text-red-600]="summary().outstanding > 0" [class.text-green-600]="summary().outstanding === 0">
              ₱{{ summary().outstanding.toLocaleString() }}
            </div>
          </div>
        </div>

        <!-- Transaction History Table -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Transaction History</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">{{ transactions().length }} transactions found</p>
          </div>

          @if (loading()) {
            <div class="p-12 text-center">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p class="text-gray-600 dark:text-gray-400">Loading transactions...</p>
            </div>
          } @else if (transactions().length === 0) {
            <div class="p-12 text-center">
              <div class="text-6xl mb-4">📭</div>
              <p class="text-gray-600 dark:text-gray-400">No transactions found for selected period</p>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Loan #</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Debit</th>
                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Credit</th>
                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Collector</th>
                  </tr>
                </thead>
                <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  @for (txn of transactions(); track txn.id) {
                    <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {{ formatDate(txn.date) }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">
                        {{ txn.loanNumber }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 py-1 text-xs rounded-full"
                              [ngClass]="{
                                'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300': txn.type === 'disbursement',
                                'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300': txn.type === 'collection',
                                'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300': txn.type === 'penalty',
                                'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300': txn.type === 'waiver'
                              }">
                          {{ txn.type }}
                        </span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-red-600 dark:text-red-400">
                        {{ txn.debit > 0 ? '₱' + txn.debit.toLocaleString() : '-' }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-600 dark:text-green-400">
                        {{ txn.credit > 0 ? '₱' + txn.credit.toLocaleString() : '-' }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-white">
                        ₱{{ txn.balance.toLocaleString() }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {{ txn.collectorName }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class CustomerLedgerComponent implements OnInit {
  private http = HttpClient;

  searchTerm = '';
  dateRange = {
    from: '',
    to: ''
  };

  searchResults = signal<Customer[]>([]);
  selectedCustomer = signal<Customer | null>(null);
  transactions = signal<CustomerTransaction[]>([]);
  loading = signal(false);

  summary = computed(() => {
    const txns = this.transactions();
    return {
      totalDisbursed: txns.filter(t => t.type === 'disbursement').reduce((sum, t) => sum + t.debit, 0),
      totalCollected: txns.filter(t => t.type === 'collection').reduce((sum, t) => sum + t.credit, 0),
      totalPenalties: txns.filter(t => t.type === 'penalty').reduce((sum, t) => sum + t.debit, 0),
      outstanding: txns.length > 0 ? txns[txns.length - 1].balance : 0
    };
  });

  ngOnInit() {
    // Set default date range to last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    this.dateRange.to = today.toISOString().split('T')[0];
    this.dateRange.from = thirtyDaysAgo.toISOString().split('T')[0];
  }

  searchCustomers() {
    if (!this.searchTerm || this.searchTerm.length < 2) {
      this.searchResults.set([]);
      return;
    }

    // TODO: Implement actual API call
    // Mock data for now
    setTimeout(() => {
      this.searchResults.set([
        {
          id: 1,
          name: 'Juan Dela Cruz',
          phone: '09171234567',
          totalLoans: 3,
          outstanding: 15000
        },
        {
          id: 2,
          name: 'Maria Santos',
          phone: '09181234567',
          totalLoans: 1,
          outstanding: 0
        }
      ]);
    }, 300);
  }

  selectCustomer(customer: Customer) {
    this.selectedCustomer.set(customer);
    this.searchResults.set([]);
    this.loadTransactions();
  }

  clearSelection() {
    this.selectedCustomer.set(null);
    this.transactions.set([]);
    this.searchTerm = '';
  }

  loadTransactions() {
    if (!this.selectedCustomer()) return;

    this.loading.set(true);

    // TODO: Implement actual API call
    // Mock data for now
    setTimeout(() => {
      this.transactions.set([
        {
          id: 1,
          date: '2025-04-01',
          type: 'disbursement',
          loanNumber: 'LN-2025-001',
          debit: 50000,
          credit: 0,
          balance: 50000,
          collectorName: 'Juan Reyes'
        },
        {
          id: 2,
          date: '2025-04-05',
          type: 'collection',
          loanNumber: 'LN-2025-001',
          debit: 0,
          credit: 5000,
          balance: 45000,
          collectorName: 'Juan Reyes'
        },
        {
          id: 3,
          date: '2025-04-10',
          type: 'penalty',
          loanNumber: 'LN-2025-001',
          debit: 500,
          credit: 0,
          balance: 45500,
          collectorName: 'Juan Reyes'
        }
      ]);
      this.loading.set(false);
    }, 800);
  }

  exportPDF() {
    if (!this.selectedCustomer()) return;

    // TODO: Implement PDF export
    alert('PDF export functionality will be implemented using jsPDF or similar library');
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
