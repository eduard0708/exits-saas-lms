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
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { cashOutline, checkmarkCircle, warningOutline, calculatorOutline, locationOutline } from 'ionicons/icons';
import { CashFloatApiService, formatCurrency } from '@shared/api';
import type { CollectorCashBalance } from '@shared/models';

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
    IonBadge,
    IonAlert,
  ],
})
export class CashHandoverPage implements OnInit {
  Math = Math; // Expose Math to template
  balance = signal<CollectorCashBalance | null>(null);
  actualHandover = signal<number>(0);
  loading = signal(false);
  submitting = signal(false);
  showConfirmAlert = signal(false);
  currentLocation = signal<{latitude: number, longitude: number} | null>(null);

  alertButtons = [
    { text: 'Cancel', role: 'cancel', handler: () => this.cancelHandover() },
    { text: 'Proceed Anyway', role: 'confirm', handler: () => this.submitHandover() }
  ];

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
    private cashFloatApi: CashFloatApiService,
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
      // TODO: Pass actual collector ID from auth service
      const data = await this.cashFloatApi.getCurrentBalance(0).toPromise();
      this.balance.set(data || null);
      // Pre-fill with expected amount
      this.actualHandover.set(this.expectedHandover());
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

    // Note: isDayClosed is not in CollectorCashBalance - check status instead
    if (bal.status === 'inactive') {
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
      const handoverData = {
        collectorId: this.balance()?.collectorId || 0,
        actualAmount: this.actualHandover(),
        notes: this.hasVariance() ? `Variance: ₱${formatCurrency(this.variance())}` : undefined,
        handoverLatitude: this.currentLocation()?.latitude,
        handoverLongitude: this.currentLocation()?.longitude
      };

      const response = await this.cashFloatApi.initiateHandover(handoverData).toPromise();
      
      if (response) {
        alert(`✅ Handover initiated successfully!\n\nAmount: ₱${formatCurrency(this.actualHandover())}\nVariance: ₱${formatCurrency(this.variance())}\n\nPlease hand over the cash to the cashier for confirmation.`);
        this.router.navigate(['/collector/dashboard']);
      }
    } catch (error: any) {
      console.error('Error initiating handover:', error);
      alert(error.error?.message || 'Failed to initiate handover. Please try again.');
    } finally {
      this.submitting.set(false);
    }
  }

  // Utility methods now use shared functions
  formatAmount = formatCurrency;

  setExpectedAmount() {
    this.actualHandover.set(this.expectedHandover());
  }

  cancelHandover() {
    this.showConfirmAlert.set(false);
  }
}
