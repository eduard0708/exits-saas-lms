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
  IonCardContent,
  IonButton,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonNote,
  IonSpinner,
  IonText,
  IonBadge,
  IonAlert,
} from '@ionic/angular/standalone';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { cashOutline, checkmarkCircle, warningOutline, calculatorOutline, locationOutline } from 'ionicons/icons';

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
  selector: 'app-cash-handover',
  templateUrl: './cash-handover.page.html',
  styleUrls: ['./cash-handover.page.scss'],
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
    IonCardContent,
    IonButton,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonNote,
    IonSpinner,
    IonText,
    IonBadge,
    IonAlert,
  ],
})
export class CashHandoverPage implements OnInit {
  balance = signal<CashBalance | null>(null);
  actualHandover = signal<number>(0);
  loading = signal(false);
  submitting = signal(false);
  showConfirmAlert = signal(false);
  currentLocation = signal<{latitude: number, longitude: number} | null>(null);

  expectedHandover = computed(() => {
    const bal = this.balance();
    if (!bal) return 0;
    return bal.openingFloat + bal.totalCollections - bal.totalDisbursements;
  });

  variance = computed(() => {
    return this.actualHandover() - this.expectedHandover();
  });

  hasVariance = computed(() => {
    return Math.abs(this.variance()) > 0.01; // Allow 1 centavo tolerance
  });

  varianceColor = computed(() => {
    const v = this.variance();
    if (Math.abs(v) < 0.01) return 'success';
    return v > 0 ? 'warning' : 'danger';
  });

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    addIcons({ cashOutline, checkmarkCircle, warningOutline, calculatorOutline, locationOutline });
  }

  ngOnInit() {
    this.loadBalance();
    this.getCurrentLocation();
  }

  async loadBalance() {
    this.loading.set(true);
    try {
      const response: any = await this.http.get('/api/money-loan/cash/balance').toPromise();
      if (response.success) {
        this.balance.set(response.data);
        // Pre-fill with expected amount
        this.actualHandover.set(this.expectedHandover());
      }
    } catch (error) {
      console.error('Error loading balance:', error);
      alert('Failed to load cash balance. Please try again.');
      this.router.navigate(['/collector/dashboard']);
    } finally {
      this.loading.set(false);
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

  async initiateHandover() {
    const bal = this.balance();
    if (!bal) return;

    if (bal.isDayClosed) {
      alert('Day already closed. Cannot initiate handover again.');
      return;
    }

    if (this.actualHandover() <= 0) {
      alert('Please enter the actual handover amount.');
      return;
    }

    // Show confirmation for variance
    if (this.hasVariance()) {
      this.showConfirmAlert.set(true);
      return;
    }

    await this.submitHandover();
  }

  async submitHandover() {
    this.showConfirmAlert.set(false);
    this.submitting.set(true);

    try {
      const payload: any = {
        actualHandover: this.actualHandover(),
      };

      if (this.currentLocation()) {
        payload.latitude = this.currentLocation()!.latitude;
        payload.longitude = this.currentLocation()!.longitude;
      }

      const response: any = await this.http.post('/api/money-loan/cash/initiate-handover', payload).toPromise();
      
      if (response.success) {
        alert(`✅ Handover initiated successfully!\n\nAmount: ₱${this.formatAmount(this.actualHandover())}\nVariance: ₱${this.formatAmount(this.variance())}\n\nPlease hand over the cash to the cashier for confirmation.`);
        this.router.navigate(['/collector/dashboard']);
      }
    } catch (error: any) {
      console.error('Error initiating handover:', error);
      alert(error.error?.message || 'Failed to initiate handover. Please try again.');
    } finally {
      this.submitting.set(false);
    }
  }

  formatAmount(amount: number): string {
    return amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  setExpectedAmount() {
    this.actualHandover.set(this.expectedHandover());
  }

  cancelHandover() {
    this.showConfirmAlert.set(false);
  }
}
