import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonBadge, IonButton } from '@ionic/angular/standalone';
import { formatCurrency, CashFloatApiService } from '@shared/api';

@Component({
  selector: 'app-collector-history-detail',
  standalone: true,
  imports: [CommonModule, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonBadge, IonButton],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/collector/history"></ion-back-button>
        </ion-buttons>
        <ion-title>Handover Detail</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div *ngIf="loading()" class="empty">
        <p>Loading...</p>
      </div>
      <div *ngIf="!loading() && !item" class="empty">
        <p>Record not found.</p>
        <ion-button (click)="goBack()" fill="outline">Back</ion-button>
      </div>

      <div *ngIf="item" class="detail">
        <div class="header-row">
          <div class="date">{{ formatDate(item.handover_date || item.initiated_at) }}</div>
          <ion-badge [color]="badgeColor(item.status)">{{ item.status || 'pending' }}</ion-badge>
        </div>
        <div class="grid">
          <div class="row"><span>Opening Float</span><strong>{{ money(item.opening_balance) }}</strong></div>
          <div class="row"><span>Collections</span><strong>{{ money(item.total_collections) }}</strong></div>
          <div class="row"><span>Disbursements</span><strong>{{ money(item.total_disbursements) }}</strong></div>
          <div class="row"><span>Expected Amount</span><strong>{{ money(item.expected_amount) }}</strong></div>
          <div class="row" [class.pos]="(item.variance||0) >= 0" [class.neg]="(item.variance||0) < 0"><span>Variance</span><strong>{{ money(item.variance) }}</strong></div>
          <div class="row"><span>Actual Amount</span><strong>{{ money(item.actual_amount) }}</strong></div>
          <div class="row"><span>Initiated</span><strong>{{ formatDateTime(item.initiated_at) }}</strong></div>
          <div class="row"><span>Confirmed</span><strong>{{ formatDateTime(item.confirmed_at) }}</strong></div>
        </div>
        <div *ngIf="item.notes" class="notes">
          <div class="title">Notes</div>
          <div class="body">{{ item.notes }}</div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .empty { text-align:center; padding: 24px 0; }
    .detail { display: grid; gap: 16px; }
    .header-row { display:flex; align-items:center; justify-content: space-between; }
    .date { font-weight: 700; font-size: 16px; }
    .grid { display:grid; gap:8px; }
    .row { display:flex; justify-content: space-between; font-size:14px; }
    .row strong { font-weight: 800; }
    .row.pos { color:#166534; }
    .row.neg { color:#991b1b; }
    .notes { background:#f8fafc; border-radius:8px; padding:10px; }
    .notes .title { font-weight:700; margin-bottom:6px; }
  `]
})
export class CollectorHistoryDetailPage implements OnInit {
  item: any;
  loading = signal(false);
  private api = inject(CashFloatApiService);

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    const nav = this.router.getCurrentNavigation();
    this.item = nav?.extras?.state?.['item'];
    if (!this.item) {
      // Attempt to read from history state if reloaded
      this.item = history.state?.['item'];
    }

    if (!this.item) {
      const idParam = this.route.snapshot.paramMap.get('id');
      const id = idParam ? Number(idParam) : NaN;
      if (!isNaN(id)) {
        this.fetchById(id);
      }
    }
  }

  goBack() { this.router.navigate(['/collector/history']); }

  money(val: number|undefined|null) { return formatCurrency(Number(val||0)); }

  formatDate(dateStr?: string) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? String(dateStr) : d.toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' });
  }

  formatDateTime(dateStr?: string) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? String(dateStr) : d.toLocaleString('en-PH', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
  }

  badgeColor(status?: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'confirmed') return 'success';
    if (s === 'rejected') return 'danger';
    return 'warning';
  }

  async fetchById(id: number) {
    this.loading.set(true);
    try {
      const to = new Date();
      const from = new Date();
      from.setDate(to.getDate() - 60);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      const rows = await this.api.getFloatHistory(fmt(from), fmt(to)).toPromise();
      const found = (rows || []).find((r: any) => Number(r.id) === Number(id));
      if (found) {
        this.item = found;
      }
    } catch (e) {
      // ignore, UI will show not found
    } finally {
      this.loading.set(false);
    }
  }
}
