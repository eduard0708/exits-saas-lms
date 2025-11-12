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
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { cashOutline, checkmarkCircle, warningOutline, timeOutline, locationOutline } from 'ionicons/icons';
import { 
  CashFloatApiService, 
  formatCurrency, 
  formatDate as sharedFormatDate, 
  formatTime as sharedFormatTime 
} from '@shared/api';
import type { PendingFloat, CollectorCashBalance, CashFloat } from '@shared/models';

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
  currentBalance = signal<CollectorCashBalance | null>(null);
  loading = signal(false);
  confirming = signal(false);
  currentLocation = signal<{latitude: number, longitude: number} | null>(null);

  constructor(
    private cashFloatApi: CashFloatApiService,
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
      // Note: Backend should infer collector ID from auth token
      // If collector ID is needed, inject AuthService and pass collector ID
      const data = await this.cashFloatApi.getPendingConfirmations().toPromise();
      // Map CashFloat to PendingFloat format
      const pendingFloats: PendingFloat[] = (data || []).map((float: CashFloat) => ({
        id: float.id!,
        amount: float.floatAmount!,
        dailyCap: float.dailyCap!,
        floatDate: float.floatDate!,
        cashierFirstName: float.collectorName?.split(' ')[0] || '',
        cashierLastName: float.collectorName?.split(' ')[1] || '',
        createdAt: float.issuedAt!,
        notes: float.notes
      }));
      this.pendingFloats.set(pendingFloats);
    } catch (error) {
      console.error('Error loading pending floats:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async loadCurrentBalance() {
    try {
      // TODO: Pass actual collector ID from auth
      // For now, using 0 as placeholder - backend should use auth token
      const data = await this.cashFloatApi.getCurrentBalance(0).toPromise();
      this.currentBalance.set(data || null);
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
}
