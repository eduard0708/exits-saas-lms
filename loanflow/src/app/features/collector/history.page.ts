import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonButton,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CashFloatApiService, formatCurrency } from '@shared/api';

interface HandoverHistoryItem {
  id?: number;
  handover_date?: string;
  opening_balance?: number;
  total_collections?: number;
  total_disbursements?: number;
  expected_amount?: number;
  actual_amount?: number;
  variance?: number;
  status?: string;
  notes?: string;
  confirmed_at?: string;
  initiated_at?: string;
  collector_name?: string;
}

@Component({
  selector: 'app-collector-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonBadge,
    IonButton,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/collector/dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title>History</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" (click)="refresh()">Refresh</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="ion-padding">
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="filters">
        <div class="filter-field">
          <label>From</label>
          <input type="date" [(ngModel)]="fromDate" (change)="refresh()" />
        </div>
        <div class="filter-field">
          <label>To</label>
          <input type="date" [(ngModel)]="toDate" (change)="refresh()" />
        </div>
        <div class="filter-field span-2">
          <label>Search</label>
          <input type="search" placeholder="Search notes or amounts" [(ngModel)]="searchTerm" />
        </div>
      </div>

      <div class="legend">
        <button class="pill pill-all" [class.active]="statusFilter==='all'" (click)="setStatusFilter('all')">All</button>
        <button class="pill pill-pending" [class.active]="statusFilter==='pending'" (click)="setStatusFilter('pending')">Pending</button>
        <button class="pill pill-confirmed" [class.active]="statusFilter==='confirmed'" (click)="setStatusFilter('confirmed')">Confirmed</button>
        <button class="pill pill-rejected" [class.active]="statusFilter==='rejected'" (click)="setStatusFilter('rejected')">Rejected</button>
      </div>

      <div *ngIf="loading()" class="loading-state">
        <ion-spinner></ion-spinner>
        <p>Loading history...</p>
      </div>

      <div *ngIf="!loading() && filteredItems().length === 0" class="empty-state">
        <div class="emoji">🗂️</div>
        <h3>No records found</h3>
        <p>Try expanding the date range.</p>
      </div>

      <div class="toolbar-end">
        <ion-button size="small" fill="outline" (click)="exportCsv()">Export CSV</ion-button>
      </div>

      <div *ngIf="!loading() && filteredItems().length > 0" class="list">
        <ion-card *ngFor="let item of filteredItems()" (click)="openDetail(item)" button="true">
          <ion-card-header>
            <ion-card-title>{{ formatDate(item.handover_date || item.initiated_at) }}</ion-card-title>
            <ion-card-subtitle>{{ item.collector_name || 'You' }}</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <div class="row">
              <span>Status</span>
              <span>
                <ion-badge [color]="badgeColor(item.status)">{{ item.status || 'pending' }}</ion-badge>
              </span>
            </div>
            <div class="row">
              <span>Expected</span>
              <span class="amount">{{ formatAmount(item.expected_amount) }}</span>
            </div>
            <div class="row">
              <span>Actual</span>
              <span class="amount">{{ formatAmount(item.actual_amount) }}</span>
            </div>
            <div class="row" [class.variance-pos]="(item.variance || 0) > 0" [class.variance-neg]="(item.variance || 0) < 0">
              <span>Variance</span>
              <span class="amount">{{ formatAmount(item.variance) }}</span>
            </div>
            <div class="row small">
              <span>Collections</span>
              <span>{{ formatAmount(item.total_collections) }}</span>
            </div>
            <div class="row small">
              <span>Disbursements</span>
              <span>{{ formatAmount(item.total_disbursements) }}</span>
            </div>
            <div class="row small">
              <span>Opening Float</span>
              <span>{{ formatAmount(item.opening_balance) }}</span>
            </div>
            <div *ngIf="item.notes" class="notes">
              <strong>Notes:</strong>
              <div>{{ item.notes }}</div>
            </div>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  `,
  styles: [`
    .filters {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 12px;
      align-items: end;
    }
    .filters .span-2 { grid-column: span 2; }
    .filter-field label {
      display: block;
      font-size: 12px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .filter-field input {
      width: 100%;
      padding: 8px 10px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      font-size: 14px;
    }
    .legend {
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }
    .pill {
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      border: none;
      cursor: pointer;
    }
    .pill-all { background: #e5e7eb; color: #111827; }
    .pill-pending { background: #fef3c7; color: #92400e; }
    .pill-confirmed { background: #dcfce7; color: #166534; }
    .pill-rejected { background: #fee2e2; color: #991b1b; }
    .pill.active { outline: 2px solid #2563eb; }
    .toolbar-end { display: flex; justify-content: flex-end; margin: 8px 0; }
    .loading-state, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 24px 0;
      color: #475569;
    }
    .empty-state .emoji {
      font-size: 40px;
    }
    ion-card {
      margin-bottom: 12px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      font-size: 14px;
    }
    .row.small { font-size: 13px; color: #475569; }
    .amount { font-weight: 700; }
    .variance-pos { color: #166534; }
    .variance-neg { color: #991b1b; }
    .notes {
      margin-top: 8px;
      font-size: 13px;
      color: #334155;
      background: #f8fafc;
      padding: 8px;
      border-radius: 8px;
    }
  `]
})
export class CollectorHistoryPage implements OnInit {
  items = signal<HandoverHistoryItem[]>([]);
  loading = signal(false);
  fromDate = '';
  toDate = '';
  searchTerm = '';
  statusFilter: 'all' | 'pending' | 'confirmed' | 'rejected' = 'all';

  constructor(
    private cashFloatApi: CashFloatApiService,
    private router: Router
  ) {}

  ngOnInit() {
    const today = new Date();
    const monthAgo = new Date();
    monthAgo.setDate(today.getDate() - 30);
    this.toDate = today.toISOString().slice(0, 10);
    this.fromDate = monthAgo.toISOString().slice(0, 10);
    this.refresh();
  }

  async refresh() {
    if (!this.fromDate || !this.toDate) return;
    this.loading.set(true);
    try {
      const data = await this.cashFloatApi.getFloatHistory(this.fromDate, this.toDate).toPromise();
      this.items.set(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading history', error);
      this.items.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  handleRefresh(event: any) {
    this.refresh().finally(() => event.detail.complete());
  }

  formatAmount(amount: number | undefined | null): string {
    return formatCurrency(Number(amount || 0));
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  badgeColor(status?: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'confirmed') return 'success';
    if (s === 'rejected') return 'danger';
    return 'warning';
  }

  filteredItems() {
    const term = (this.searchTerm || '').toLowerCase().trim();
    const status = this.statusFilter;
    return this.items().filter((it) => {
      const statusOk = status === 'all' ? true : (it.status || '').toLowerCase() === status;
      if (!statusOk) return false;
      if (!term) return true;
      const hay = [
        it.notes || '',
        String(it.expected_amount || ''),
        String(it.actual_amount || ''),
        String(it.total_collections || ''),
        String(it.total_disbursements || ''),
      ].join(' ').toLowerCase();
      return hay.includes(term);
    });
  }

  setStatusFilter(val: 'all' | 'pending' | 'confirmed' | 'rejected') {
    this.statusFilter = val;
  }

  openDetail(item: HandoverHistoryItem) {
    this.router.navigate(['/collector/history', String(item.id || '')], { state: { item } });
  }

  exportCsv() {
    const rows = [
      ['Date', 'Status', 'Opening', 'Collections', 'Disbursements', 'Expected', 'Actual', 'Variance', 'Notes'],
      ...this.filteredItems().map(it => [
        this.formatDate(it.handover_date || it.initiated_at),
        it.status || 'pending',
        String(it.opening_balance || 0),
        String(it.total_collections || 0),
        String(it.total_disbursements || 0),
        String(it.expected_amount || 0),
        String(it.actual_amount || 0),
        String(it.variance || 0),
        (it.notes || '').replace(/\n/g, ' ')
      ])
    ];
    const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `handover-history-${this.fromDate}_to_${this.toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
