import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Collector {
  id: number;
  firstName: string;
  lastName: string;
}

interface CashFloat {
  id: number;
  collectorId: number;
  collectorName: string;
  amount: number;
  dailyCap: number;
  floatDate: string;
  status: string;
  createdAt: string;
  notes?: string;
}

@Component({
  selector: 'app-cash-float-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-4 md:p-6 space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">💵 Cash Float Management</h1>
          <p class="text-sm text-gray-600 dark:text-gray-400">Issue daily floats and manage handovers</p>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-gray-600 dark:text-gray-400">Pending Confirmations</p>
              <p class="text-2xl font-bold text-yellow-600">{{ pendingFloats().length }}</p>
            </div>
            <div class="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <span class="text-2xl">⏳</span>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-gray-600 dark:text-gray-400">Pending Handovers</p>
              <p class="text-2xl font-bold text-orange-600">{{ pendingHandovers().length }}</p>
            </div>
            <div class="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <span class="text-2xl">🏦</span>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-gray-600 dark:text-gray-400">Active Collectors</p>
              <p class="text-2xl font-bold text-green-600">{{ activeCollectors() }}</p>
            </div>
            <div class="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-between">
              <span class="text-2xl">✅</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="border-b border-gray-200 dark:border-gray-700">
        <div class="flex gap-4">
          <button
            (click)="activeTab.set('issue')"
            [class.border-blue-500]="activeTab() === 'issue'"
            [class.text-blue-600]="activeTab() === 'issue'"
            [class.text-gray-600]="activeTab() !== 'issue'"
            class="px-4 py-2 font-medium border-b-2 border-transparent hover:text-blue-600 transition-colors">
            Issue Float
          </button>
          <button
            (click)="activeTab.set('pending')"
            [class.border-blue-500]="activeTab() === 'pending'"
            [class.text-blue-600]="activeTab() === 'pending'"
            [class.text-gray-600]="activeTab() !== 'pending'"
            class="px-4 py-2 font-medium border-b-2 border-transparent hover:text-blue-600 transition-colors">
            Pending ({{ pendingFloats().length }})
          </button>
          <button
            (click)="activeTab.set('handovers')"
            [class.border-blue-500]="activeTab() === 'handovers'"
            [class.text-blue-600]="activeTab() === 'handovers'"
            [class.text-gray-600]="activeTab() !== 'handovers'"
            class="px-4 py-2 font-medium border-b-2 border-transparent hover:text-blue-600 transition-colors">
            Handovers ({{ pendingHandovers().length }})
          </button>
          <button
            (click)="activeTab.set('active')"
            [class.border-blue-500]="activeTab() === 'active'"
            [class.text-blue-600]="activeTab() === 'active'"
            [class.text-gray-600]="activeTab() !== 'active'"
            class="px-4 py-2 font-medium border-b-2 border-transparent hover:text-blue-600 transition-colors">
            Active Collectors
          </button>
        </div>
      </div>

      <!-- Issue Float Tab -->
      @if (activeTab() === 'issue') {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 class="text-lg font-semibold mb-4">Issue New Float</h3>
            <form (ngSubmit)="issueFloat()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Collector *
                </label>
                <select [(ngModel)]="form.collectorId" name="collector" required
                        class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                               dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Collector</option>
                  @for (collector of collectors(); track collector.id) {
                    <option [value]="collector.id">
                      {{ collector.firstName }} {{ collector.lastName }}
                    </option>
                  }
                </select>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Float Amount *
                  </label>
                  <div class="relative">
                    <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₱</span>
                    <input type="number" [(ngModel)]="form.amount" name="amount" required min="0" step="100"
                           class="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                  dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                           placeholder="50000">
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Daily Cap *
                  </label>
                  <div class="relative">
                    <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₱</span>
                    <input type="number" [(ngModel)]="form.dailyCap" name="dailyCap" required min="0" step="100"
                           class="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                  dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                           placeholder="50000">
                  </div>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea [(ngModel)]="form.notes" name="notes" rows="3"
                          class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                          placeholder="Additional notes..."></textarea>
              </div>

              <button type="submit" [disabled]="issuing()"
                      class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white
                             rounded-lg px-6 py-3 font-medium transition-colors">
                @if (issuing()) {
                  <span>Issuing Float...</span>
                } @else {
                  <span>💰 Issue Float</span>
                }
              </button>
            </form>
          </div>

          <div class="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900
                      rounded-lg p-6 border border-blue-200 dark:border-gray-700">
            <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">💡 Quick Tips</h3>
            <ul class="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <li class="flex items-start gap-2">
                <span class="text-blue-600 mt-1">✓</span>
                <span><strong>Float Amount:</strong> Total cash given to collector at start of day</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-blue-600 mt-1">✓</span>
                <span><strong>Daily Cap:</strong> Maximum amount collector can disburse today</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-blue-600 mt-1">✓</span>
                <span><strong>Confirmation:</strong> Collector must confirm receipt in mobile app</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-blue-600 mt-1">✓</span>
                <span><strong>Handover:</strong> Collector returns cash at end of day for verification</span>
              </li>
            </ul>
          </div>
        </div>
      }

      <!-- Pending Confirmations Tab -->
      @if (activeTab() === 'pending') {
        <div>
          @if (loading()) {
            <div class="text-center py-12">
              <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p class="mt-4 text-gray-600 dark:text-gray-400">Loading pending floats...</p>
            </div>
          } @else if (pendingFloats().length === 0) {
            <div class="text-center py-12">
              <span class="text-6xl">✅</span>
              <h3 class="mt-4 text-xl font-semibold text-gray-900 dark:text-white">All Caught Up!</h3>
              <p class="mt-2 text-gray-600 dark:text-gray-400">No pending float confirmations</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (float of pendingFloats(); track float.id) {
                <div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div class="flex justify-between items-start mb-3">
                    <div>
                      <h3 class="font-semibold text-gray-900 dark:text-white">{{ float.collectorName }}</h3>
                      <p class="text-xs text-gray-500">Issued {{ formatTime(float.createdAt) }}</p>
                    </div>
                    <span class="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">
                      Pending
                    </span>
                  </div>
                  <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                      <span class="text-gray-600 dark:text-gray-400">Float Amount:</span>
                      <span class="font-semibold text-blue-600">₱{{ formatAmount(float.amount) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-600 dark:text-gray-400">Daily Cap:</span>
                      <span class="font-medium">₱{{ formatAmount(float.dailyCap) }}</span>
                    </div>
                    @if (float.notes) {
                      <div class="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p class="text-xs text-gray-500 italic">{{ float.notes }}</p>
                      </div>
                    }
                  </div>
                  <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 text-xs text-gray-500">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span>Waiting for collector confirmation</span>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- Pending Handovers Tab -->
      @if (activeTab() === 'handovers') {
        <div>
          @if (loading()) {
            <div class="text-center py-12">
              <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p class="mt-4 text-gray-600 dark:text-gray-400">Loading pending handovers...</p>
            </div>
          } @else if (pendingHandovers().length === 0) {
            <div class="text-center py-12">
              <span class="text-6xl">🏦</span>
              <h3 class="mt-4 text-xl font-semibold text-gray-900 dark:text-white">No Pending Handovers</h3>
              <p class="mt-2 text-gray-600 dark:text-gray-400">All collectors have completed their handovers</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              @for (handover of pendingHandovers(); track handover.id) {
                <div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div class="flex justify-between items-start mb-3">
                    <div>
                      <h3 class="font-semibold text-gray-900 dark:text-white">{{ handover.collectorName }}</h3>
                      <p class="text-xs text-gray-500">End of Day • {{ formatTime(handover.createdAt) }}</p>
                    </div>
                    <span class="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-medium">
                      Pending
                    </span>
                  </div>
                  <div class="space-y-2 text-sm mb-4">
                    <div class="flex justify-between">
                      <span class="text-gray-600">Expected:</span>
                      <span class="font-medium">₱{{ formatAmount(handover.amount) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-600">Actual:</span>
                      <span class="font-semibold text-green-600">₱{{ formatAmount(handover.amount) }}</span>
                    </div>
                    @if (handover.notes) {
                      <div class="pt-2 border-t border-gray-200">
                        <p class="text-xs text-gray-500">📝 {{ handover.notes }}</p>
                      </div>
                    }
                  </div>
                  <div class="flex gap-2">
                    <button (click)="rejectHandover(handover.id)"
                            class="flex-1 bg-red-600 hover:bg-red-700 text-white rounded px-4 py-2 text-sm font-medium">
                      ✕ Reject
                    </button>
                    <button (click)="confirmHandover(handover.id)"
                            class="flex-1 bg-green-600 hover:bg-green-700 text-white rounded px-4 py-2 text-sm font-medium">
                      ✓ Confirm
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- Active Collectors Tab -->
      @if (activeTab() === 'active') {
        <div>
          @if (loading()) {
            <div class="text-center py-12">
              <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p class="mt-4 text-gray-600 dark:text-gray-400">Loading collector balances...</p>
            </div>
          } @else if (collectorBalances().length === 0) {
            <div class="text-center py-12">
              <span class="text-6xl">👥</span>
              <h3 class="mt-4 text-xl font-semibold text-gray-900 dark:text-white">No Active Collectors</h3>
              <p class="mt-2 text-gray-600 dark:text-gray-400">Issue floats to get started</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (balance of collectorBalances(); track balance.collectorId) {
                <div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div class="flex justify-between items-start mb-3">
                    <h3 class="font-semibold text-gray-900 dark:text-white">{{ balance.collectorName }}</h3>
                    @if (balance.isFloatConfirmed) {
                      <span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                        Active
                      </span>
                    } @else {
                      <span class="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">
                        Pending
                      </span>
                    }
                  </div>

                  <div class="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-4 text-white mb-3">
                    <p class="text-xs opacity-90 mb-1">On-Hand Cash</p>
                    <p class="text-2xl font-bold">₱{{ formatAmount(balance.currentBalance) }}</p>
                  </div>

                  <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                      <span class="text-gray-600">Opening:</span>
                      <span class="font-medium">₱{{ formatAmount(balance.openingFloat) }}</span>
                    </div>
                    <div class="flex justify-between text-green-600">
                      <span>Collections:</span>
                      <span class="font-medium">+₱{{ formatAmount(balance.totalCollections) }}</span>
                    </div>
                    <div class="flex justify-between text-red-600">
                      <span>Disbursed:</span>
                      <span class="font-medium">-₱{{ formatAmount(balance.totalDisbursements) }}</span>
                    </div>
                    <div class="pt-2 border-t border-gray-200 flex justify-between items-center">
                      <span class="text-xs text-gray-500">Available:</span>
                      <span class="font-semibold text-green-600">₱{{ formatAmount(balance.availableForDisbursement) }}</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `
})
export class CashFloatManagementComponent implements OnInit {
  activeTab = signal('issue');
  loading = signal(false);
  issuing = signal(false);
  collectors = signal<Collector[]>([]);
  pendingFloats = signal<CashFloat[]>([]);
  pendingHandovers = signal<CashFloat[]>([]);
  collectorBalances = signal<any[]>([]);

  form = {
    collectorId: '',
    amount: 0,
    dailyCap: 0,
    floatDate: new Date().toISOString().split('T')[0],
    notes: ''
  };

  activeCollectors = () => this.collectorBalances().filter(b => b.isFloatConfirmed).length;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadCollectors();
    this.loadPendingFloats();
    this.loadPendingHandovers();
    this.loadCollectorBalances();
  }

  async loadCollectors() {
    try {
      const response: any = await this.http.get('/api/collectors').toPromise();
      this.collectors.set(response.data || []);
    } catch (error) {
      console.error('Error loading collectors:', error);
    }
  }

  async loadPendingFloats() {
    this.loading.set(true);
    try {
      const response: any = await this.http.get('/api/money-loan/cash/all-pending-floats').toPromise();
      this.pendingFloats.set(response.data || []);
    } catch (error) {
      console.error('Error loading pending floats:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async loadPendingHandovers() {
    try {
      const response: any = await this.http.get('/api/money-loan/cash/pending-handovers').toPromise();
      this.pendingHandovers.set(response.data || []);
    } catch (error) {
      console.error('Error loading pending handovers:', error);
    }
  }

  async loadCollectorBalances() {
    try {
      const response: any = await this.http.get('/api/money-loan/cash/all-balances').toPromise();
      this.collectorBalances.set(response.data || []);
    } catch (error) {
      console.error('Error loading balances:', error);
    }
  }

  async issueFloat() {
    if (!this.form.collectorId || !this.form.amount || !this.form.dailyCap) {
      alert('Please fill in all required fields');
      return;
    }

    this.issuing.set(true);
    try {
      await this.http.post('/api/money-loan/cash/issue-float', this.form).toPromise();
      alert(`Float of ₱${this.formatAmount(this.form.amount)} issued successfully!`);
      this.form = {
        collectorId: '',
        amount: 0,
        dailyCap: 0,
        floatDate: new Date().toISOString().split('T')[0],
        notes: ''
      };
      await Promise.all([this.loadPendingFloats(), this.loadCollectorBalances()]);
    } catch (error: any) {
      alert(error.error?.message || 'Failed to issue float');
    } finally {
      this.issuing.set(false);
    }
  }

  async confirmHandover(id: number) {
    if (!confirm('Confirm receipt of this handover?')) return;
    try {
      await this.http.post('/api/money-loan/cash/confirm-handover', { handoverId: id }).toPromise();
      alert('Handover confirmed successfully!');
      await Promise.all([this.loadPendingHandovers(), this.loadCollectorBalances()]);
    } catch (error: any) {
      alert(error.error?.message || 'Failed to confirm handover');
    }
  }

  async rejectHandover(id: number) {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    alert('Rejection feature will be implemented in API');
  }

  formatAmount(amount: number): string {
    return amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
