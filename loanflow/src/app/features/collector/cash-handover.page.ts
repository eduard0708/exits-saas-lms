import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonInput, IonItem, IonLabel, IonNote, IonSpinner, IonText, IonBadge, IonAlert } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
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
    
    // Type-safe property access (API returns camelCase)
    const openingFloat = Number(bal.openingFloat || 0);
    const totalCollections = Number(bal.totalCollections || 0);
    const totalDisbursements = Number(bal.totalDisbursements || 0);
    
    return openingFloat + totalCollections - totalDisbursements;
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
    private cashFloatApi: CashFloatApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadBalance();
    this.getCurrentLocation();
  }

  async loadBalance() {
    this.loading.set(true);
    try {
      // Use the same endpoint as the cash balance widget - gets current collector's balance
      const response: any = await this.http.get('/api/money-loan/cash/balance').toPromise();
      
      console.log('💰 Handover - Raw balance response:', response);
      
      // Handle wrapped response with success flag
      if (response?.success && response?.data) {
        this.balance.set(response.data);
      } else {
        // Handle direct response
        this.balance.set(response || null);
      }
      
      console.log('💰 Handover - Parsed balance:', this.balance());
      console.log('💰 Handover - Expected amount:', this.expectedHandover());
      
      // Pre-fill with expected amount after balance is loaded
      setTimeout(() => {
        this.actualHandover.set(this.expectedHandover());
      }, 100);
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
      const bal = this.balance();
      const collectorId = bal?.collectorId || 0;
      
      const handoverData = {
        collector_id: Number(collectorId),
        actual_amount: Number(this.actualHandover()),
        notes: this.hasVariance() ? `Variance: ${formatCurrency(this.variance())}` : undefined,
        handover_latitude: this.currentLocation()?.latitude,
        handover_longitude: this.currentLocation()?.longitude
      };

      console.log('📤 Submitting handover:', handoverData);

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

  // Utility methods
  // Format with currency symbol (₱)
  formatAmount(amount: number): string {
    return formatCurrency(amount);
  }

  // Format without currency symbol (for use with manual ₱ in template)
  formatNumber(amount: number): string {
    return amount.toLocaleString('en-PH', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }

  // Helper methods to safely access balance properties
  getOpeningFloat(): number {
    const bal = this.balance();
    return Number(bal?.openingFloat || 0);
  }

  getTotalCollections(): number {
    const bal = this.balance();
    return Number(bal?.totalCollections || 0);
  }

  getTotalDisbursements(): number {
    const bal = this.balance();
    return Number(bal?.totalDisbursements || 0);
  }

  setExpectedAmount() {
    this.actualHandover.set(this.expectedHandover());
  }

  cancelHandover() {
    this.showConfirmAlert.set(false);
  }
}
