import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonBadge,
  IonText,
  IonSpinner,
} from '@ionic/angular/standalone';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { cashOutline, alertCircleOutline, checkmarkCircleOutline } from 'ionicons/icons';

interface CashBalance {
  collectorId: number;
  balanceDate: string;
  openingFloat: number;
  totalCollections: number;
  totalDisbursements: number;
  currentBalance: number;
  dailyCap: number;
  availableForDisbursement: number;
  isFloatConfirmed: boolean;
  isDayClosed: boolean;
}

@Component({
  selector: 'app-cash-balance-widget',
  templateUrl: './cash-balance-widget.component.html',
  styleUrls: ['./cash-balance-widget.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonBadge,
    IonText,
    IonSpinner,
  ],
})
export class CashBalanceWidgetComponent implements OnInit {
  balance = signal<CashBalance | null>(null);
  loading = signal(false);
  pendingFloatsCount = signal(0);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    addIcons({ cashOutline, alertCircleOutline, checkmarkCircleOutline });
  }

  ngOnInit() {
    this.loadBalance();
    this.checkPendingFloats();
  }

  async loadBalance() {
    this.loading.set(true);
    try {
      const response: any = await this.http.get('/api/money-loan/cash/balance').toPromise();
      if (response.success) {
        this.balance.set(response.data);
      }
    } catch (error) {
      console.error('Error loading cash balance:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async checkPendingFloats() {
    try {
      const response: any = await this.http.get('/api/money-loan/cash/pending-floats').toPromise();
      if (response.success && response.data) {
        this.pendingFloatsCount.set(response.data.length);
      }
    } catch (error) {
      console.error('Error checking pending floats:', error);
    }
  }

  formatAmount(amount: number): string {
    return amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  navigateToFloatPage() {
    this.router.navigate(['/collector/cash-float']);
  }

  get balancePercentage(): number {
    const balance = this.balance();
    if (!balance || balance.openingFloat === 0) return 0;
    return (balance.currentBalance / balance.openingFloat) * 100;
  }

  balanceStatusColor(): string {
    const percentage = this.balancePercentage;
    if (percentage >= 75) return 'success';
    if (percentage >= 40) return 'warning';
    return 'danger';
  }
}
