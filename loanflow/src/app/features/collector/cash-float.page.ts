import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonSpinner,
  IonText,
  IonChip,
  IonBadge,
} from '@ionic/angular/standalone';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { cashOutline, checkmarkCircle, warningOutline, timeOutline, locationOutline } from 'ionicons/icons';

interface PendingFloat {
  id: number;
  amount: number;
  dailyCap: number;
  floatDate: string;
  cashierFirstName: string;
  cashierLastName: string;
  createdAt: string;
  issuanceLatitude?: number;
  issuanceLongitude?: number;
  notes?: string;
}

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
  selector: 'app-cash-float',
  templateUrl: './cash-float.page.html',
  styleUrls: ['./cash-float.page.scss'],
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
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonSpinner,
    IonText,
    IonChip,
    IonBadge,
  ],
})
export class CashFloatPage implements OnInit {
  pendingFloats = signal<PendingFloat[]>([]);
  currentBalance = signal<CashBalance | null>(null);
  loading = signal(false);
  confirming = signal(false);
  currentLocation = signal<{latitude: number, longitude: number} | null>(null);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    addIcons({ cashOutline, checkmarkCircle, warningOutline, timeOutline, locationOutline });
  }

  ngOnInit() {
    this.loadPendingFloats();
    this.loadCurrentBalance();
    this.getCurrentLocation();
  }

  async loadPendingFloats() {
    this.loading.set(true);
    try {
      const response: any = await this.http.get('/api/money-loan/cash/pending-floats').toPromise();
      if (response.success) {
        this.pendingFloats.set(response.data || []);
      }
    } catch (error) {
      console.error('Error loading pending floats:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async loadCurrentBalance() {
    try {
      const response: any = await this.http.get('/api/money-loan/cash/balance').toPromise();
      if (response.success) {
        this.currentBalance.set(response.data);
      }
    } catch (error) {
      console.error('Error loading balance:', error);
    }
  }

  async getCurrentLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.currentLocation.set({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }

  async confirmFloat(floatData: PendingFloat) {
    this.confirming.set(true);
    try {
      const payload: any = {
        floatId: floatData.id,
      };

      if (this.currentLocation()) {
        payload.latitude = this.currentLocation()!.latitude;
        payload.longitude = this.currentLocation()!.longitude;
      }

      const response: any = await this.http.post('/api/money-loan/cash/confirm-float', payload).toPromise();
      
      if (response.success) {
        alert(`✅ Float of ₱${this.formatAmount(floatData.amount)} confirmed successfully!`);
        await this.loadPendingFloats();
        await this.loadCurrentBalance();
        this.router.navigate(['/collector/dashboard']);
      }
    } catch (error: any) {
      console.error('Error confirming float:', error);
      alert(error.error?.message || 'Failed to confirm float. Please try again.');
    } finally {
      this.confirming.set(false);
    }
  }

  formatAmount(amount: number): string {
    return amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getCashierName(float: PendingFloat): string {
    return `${float.cashierFirstName} ${float.cashierLastName}`.trim();
  }
}
