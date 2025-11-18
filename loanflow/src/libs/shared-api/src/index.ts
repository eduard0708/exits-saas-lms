/**
 * Shared API Services
 * Used by both web and loanflow apps
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  CashFloat,
  CashHandover,
  CollectorCashBalance,
  CashierStats,
  CollectorStats,
  GraceExtension,
  ApiResponse
} from '@shared/models';

@Injectable({
  providedIn: 'root'
})
export class CashFloatApiService {
  private readonly baseUrl = '/api/money-loan/cash';

  constructor(private http: HttpClient) {}

  // Cashier endpoints
  getCashierStats(): Observable<CashierStats> {
    return this.http.get<CashierStats>(`${this.baseUrl}/cashier-stats`);
  }

  issueFloat(data: Partial<CashFloat>): Observable<ApiResponse<CashFloat>> {
    return this.http.post<ApiResponse<CashFloat>>(`${this.baseUrl}/issue-float`, data);
  }

  getPendingConfirmations(): Observable<CashFloat[]> {
    return this.http.get<CashFloat[]>(`${this.baseUrl}/pending-confirmations`);
  }

  getPendingHandovers(): Observable<CashHandover[]> {
    return this.http.get<CashHandover[]>(`${this.baseUrl}/pending-handovers`);
  }

  confirmHandover(id: number, confirmed: boolean, reason?: string): Observable<ApiResponse<CashHandover>> {
    return this.http.post<ApiResponse<CashHandover>>(`${this.baseUrl}/confirm-handover/${id}`, {
      confirmed,
      rejection_reason: reason
    });
  }

  getBalanceMonitor(): Observable<CollectorCashBalance[]> {
    return this.http.get<CollectorCashBalance[]>(`${this.baseUrl}/balance-monitor`);
  }

  getFloatHistory(fromDate: string, toDate: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/float-history`, {
      params: { from_date: fromDate, to_date: toDate }
    });
  }

  // Collector endpoints
  getCollectorStats(collectorId: number): Observable<CollectorStats> {
    return this.http.get<CollectorStats>(`${this.baseUrl}/collector/${collectorId}/stats`);
  }

  getCurrentBalance(collectorId: number): Observable<CollectorCashBalance> {
    return this.http.get<CollectorCashBalance>(`${this.baseUrl}/collector/${collectorId}/balance`);
  }

  confirmFloatReceipt(floatId: number, location?: { lat: number; lng: number }): Observable<ApiResponse<CashFloat>> {
    const payload: any = {
      floatId: Number(floatId)
    };
    
    if (location) {
      payload.latitude = Number(location.lat);
      payload.longitude = Number(location.lng);
    }
    
    return this.http.post<ApiResponse<CashFloat>>(`${this.baseUrl}/confirm-float`, payload);
  }

  initiateHandover(data: Partial<CashHandover>): Observable<ApiResponse<CashHandover>> {
    return this.http.post<ApiResponse<CashHandover>>(`${this.baseUrl}/initiate-handover`, data);
  }
}

@Injectable({
  providedIn: 'root'
})
export class GraceExtensionApiService {
  private readonly baseUrl = '/api/money-loan/grace-extensions';

  constructor(private http: HttpClient) {}

  createExtension(data: Partial<GraceExtension>): Observable<ApiResponse<GraceExtension>> {
    return this.http.post<ApiResponse<GraceExtension>>(this.baseUrl, data);
  }

  getExtensionsByLoan(loanId: number): Observable<GraceExtension[]> {
    return this.http.get<GraceExtension[]>(`${this.baseUrl}/loan/${loanId}`);
  }

  getExtensionsByCollector(collectorId: number): Observable<GraceExtension[]> {
    return this.http.get<GraceExtension[]>(`${this.baseUrl}/collector/${collectorId}`);
  }

  approveExtension(id: number, notes?: string): Observable<ApiResponse<GraceExtension>> {
    return this.http.post<ApiResponse<GraceExtension>>(`${this.baseUrl}/${id}/approve`, { notes });
  }

  rejectExtension(id: number, reason: string): Observable<ApiResponse<GraceExtension>> {
    return this.http.post<ApiResponse<GraceExtension>>(`${this.baseUrl}/${id}/reject`, { reason });
  }
}

// Utility functions
export function formatCurrency(amount: number, currency = 'PHP'): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit'
  });
}
