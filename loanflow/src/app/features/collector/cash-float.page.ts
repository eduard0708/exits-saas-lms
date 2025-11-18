import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonSpinner, IonBadge, IonButton } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { 
  CashFloatApiService, 
  formatCurrency, 
  formatDate as sharedFormatDate, 
  formatTime as sharedFormatTime 
} from '@shared/api';
import type { PendingFloat, CollectorCashBalance, CashFloat } from '@shared/models';
import { StatCardComponent, StatusBadgeComponent, SharedButtonComponent } from '@shared/ui';
import { AuthService } from '@app/core/services/auth.service';

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
    IonSpinner,
    IonBadge,
    IonButton,
    StatCardComponent,
    StatusBadgeComponent,
    SharedButtonComponent,
  ],
})
export class CashFloatPage implements OnInit {
  pendingFloats = signal<PendingFloat[]>([]);
  currentBalance = signal<CollectorCashBalance | null>(null);
  loading = signal(false);
  confirming = signal(false);
  currentLocation = signal<{latitude: number, longitude: number} | null>(null);

  constructor(
    private cashFloatApi: CashFloatApiService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadPendingFloats();
    this.loadCurrentBalance();
    this.getCurrentLocation();
  }

  async loadPendingFloats() {
    this.loading.set(true);
    try {
      // Backend filters pending floats for current collector based on auth token
      const response: any = await this.cashFloatApi.getPendingConfirmations().toPromise();
      const floats = response.data || response || [];
      
      console.log('🔍 Raw pending floats response:', floats);
      
      // Map API response to PendingFloat format
      const pendingFloats: PendingFloat[] = floats.map((float: any) => {
        const mapped = {
          id: float.id,
          amount: parseFloat(float.amount) || 0,
          dailyCap: parseFloat(float.daily_cap) || 0,
          floatDate: float.float_date,
          cashierFirstName: float.cashier_first_name || '',
          cashierLastName: float.cashier_last_name || '',
          createdAt: float.created_at,
          issuanceLatitude: float.issuance_latitude,
          issuanceLongitude: float.issuance_longitude,
          notes: float.notes
        };
        console.log('📦 Mapped float:', mapped);
        return mapped;
      });
      this.pendingFloats.set(pendingFloats);
    } catch (error) {
      console.error('Error loading pending floats:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async loadCurrentBalance() {
    try {
      const userId = this.authService.getCurrentUserId();
      if (!userId) {
        console.error('No user ID found');
        return;
      }
      const response: any = await this.cashFloatApi.getCurrentBalance(parseInt(userId)).toPromise();
      const balance = response.data || response;
      
      // Map API response to CollectorCashBalance format
      if (balance) {
        this.currentBalance.set({
          collectorId: balance.collector_id || balance.collectorId,
          collectorName: balance.collector_name || '',
          balanceDate: balance.balance_date,
          onHandCash: balance.current_balance || balance.onHandCash || 0,
          openingFloat: balance.opening_float || balance.openingFloat || 0,
          totalCollections: balance.total_collections || balance.totalCollections || 0,
          totalDisbursements: balance.total_disbursements || balance.totalDisbursements || 0,
          dailyCap: balance.daily_cap || balance.dailyCap || 0,
          availableForDisbursement: balance.available_for_disbursement || balance.availableForDisbursement || 0,
          floatConfirmed: balance.is_float_confirmed || balance.floatConfirmed || false,
          status: balance.is_day_closed ? 'inactive' : (balance.is_float_confirmed ? 'active' : 'pending_confirmation')
        });
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
      const location = this.currentLocation() ? {
        lat: this.currentLocation()!.latitude,
        lng: this.currentLocation()!.longitude
      } : undefined;

      const response = await this.cashFloatApi.confirmFloatReceipt(floatData.id, location).toPromise();
      
      if (response?.success) {
        alert(`✅ Float of ₱${formatCurrency(floatData.amount)} confirmed successfully!`);
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

  // Utility methods now use shared functions
  formatAmount = formatCurrency;
  formatDate = sharedFormatDate;
  formatTime = sharedFormatTime;

  getCashierName(float: PendingFloat): string {
    return `${float.cashierFirstName} ${float.cashierLastName}`.trim();
  }

  goToCashHistory() {
    this.router.navigate(['/collector/cash-history']);
  }
}
