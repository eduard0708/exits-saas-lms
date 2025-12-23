import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonRefresher, IonRefresherContent, IonSkeletonText, ToastController, ViewWillEnter, IonButton } from '@ionic/angular/standalone';
import {
  CollectorService,
  CollectorDailySummary,
  CollectorLimits,
  AssignedCustomer,
} from '../../core/services/collector.service';
import { AuthService } from '../../core/services/auth.service';
import { CollectorTopBarComponent } from '../../shared/components/collector-top-bar.component';
import { CashBalanceWidgetComponent } from './widgets/cash-balance-widget.component';
import { CashFloatApiService } from '@shared/api';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-collector-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonSkeletonText,
    IonButton,
    CollectorTopBarComponent,
    CashBalanceWidgetComponent,
  ],
  template: `
    <ion-content [fullscreen]="true" class="main-content">
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content pullingIcon="refresh-outline"></ion-refresher-content>
      </ion-refresher>

      <app-collector-top-bar
        icon="shield-outline"
        title="Collector HQ"
      >
        <ion-button topbar-right fill="clear" class="icon-button" size="small" (click)="navigateTo('/collector/profile')">
          <span slot="icon-only" class="emoji-icon">👤</span>
        </ion-button>
      </app-collector-top-bar>

      <div class="dashboard-container">
        @if (handoverOverdue() && !overdueHasOverride()) {
          <div class="status-banner pending">
            <div class="status-icon">🚫</div>
            <div class="status-text">
              <div class="status-title">Overdue Handover Required</div>
              <div class="status-sub">Yesterday ({{ overdueDate() }}) is not closed. Disbursements are locked until you handover or cashier applies an override.</div>
            </div>
            <button class="status-action" type="button" (click)="navigateTo('/collector/cash-handover')">Handover</button>
          </div>
        }
        @if (handoverPending()) {
          <div class="status-banner pending">
            <div class="status-icon">⏳</div>
            <div class="status-text">
              <div class="status-title">Handover Pending Confirmation</div>
              <div class="status-sub">Cashier needs to confirm your handover. Actions are temporarily locked.</div>
            </div>
            <button class="status-action" type="button" (click)="viewPendingHandover()">View</button>
          </div>
        } @else if (handoverConfirmed()) {
          <div class="status-banner confirmed">
            <div class="status-icon">✅</div>
            <div class="status-text">
              <div class="status-title">Day Closed</div>
              <div class="status-sub">Your handover is confirmed. New actions are locked until tomorrow.</div>
            </div>
          </div>
        }
        @if (loading()) {
          <div class="loading-skeletons">
            <ion-skeleton-text animated style="height: 180px;"></ion-skeleton-text>
            <ion-skeleton-text animated style="height: 140px;"></ion-skeleton-text>
            <ion-skeleton-text animated style="height: 140px;"></ion-skeleton-text>
          </div>
        } @else if (!summary()) {
          <div class="empty-state">
            <div class="empty-icon">🛰️</div>
            <h2>No dashboard data yet</h2>
            <p>Pull to refresh or tap below to sync your assignments.</p>
            <button type="button" class="empty-action" (click)="loadDashboard(true)">
              <span  class="emoji-icon">🔄</span>
              <span>Refresh dashboard</span>
            </button>
          </div>
        } @else {
          <div class="dashboard-content">
            <!-- Daily Summary -->
            <div class="summary-pills">
              <div class="summary-pill">
                <span  class="emoji-icon">👛</span>
                <div class="pill-content">
                  <span class="pill-value">₱{{ summary()!.collectedToday.toLocaleString() }}</span>
                  <span class="pill-label">Collected today</span>
                </div>
              </div>
              <div class="summary-pill">
                <span  class="emoji-icon">👥</span>
                <div class="pill-content">
                  <span class="pill-value">{{ summary()?.totalCustomers ?? 0 }}</span>
                  <span class="pill-label">Assigned</span>
                </div>
              </div>
              <div class="summary-pill">
                <span  class="emoji-icon">📍</span>
                <div class="pill-content">
                  <span class="pill-value">{{ summary()!.visitsPlanned }}</span>
                  <span class="pill-label">Visits</span>
                </div>
              </div>
            </div>

            <!-- Cash Balance Widget -->
            <app-cash-balance-widget></app-cash-balance-widget>

            <div class="progress-card">
              <div class="card-title">📈 Daily Progress</div>

              <div class="progress-item">
                <div class="progress-header">
                  <span class="progress-label">Collections</span>
                  <span class="progress-value collected">
                    ₱{{ summary()!.collectedToday.toLocaleString() }} / ₱{{ summary()!.collectionTarget.toLocaleString() }}
                  </span>
                </div>
                <div class="progress-subtext">
                  <span class="percentage">{{ collectionPercentage() }}% of goal</span>
                  <span>Target ₱{{ summary()!.collectionTarget.toLocaleString() }}</span>
                </div>
                <div class="progress-bar">
                  <div
                    class="progress-fill"
                    [class.complete]="collectionPercentage() >= 100"
                    [style.width.%]="Math.min(collectionPercentage(), 100)">
                  </div>
                </div>
              </div>

              <div class="progress-item">
                <div class="progress-header">
                  <span class="progress-label">Visits Completed</span>
                  <span class="progress-value visits">
                    {{ summary()!.visitsCompleted }} / {{ summary()!.visitsPlanned }}
                  </span>
                </div>
                <div class="progress-subtext">
                  <span class="percentage">{{ visitPercentage() }}% complete</span>
                  <span>{{ Math.max(summary()!.visitsPlanned - summary()!.visitsCompleted, 0) }} remaining</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill visits" [style.width.%]="visitPercentage()"></div>
                </div>
              </div>
            </div>

            <!-- Quick Stats Grid -->
            <div class="stats-grid">
              <div class="stat-card" (click)="openCustomerList()">
                <div class="stat-icon customers">👥</div>
                <div class="stat-value">{{ summary()!.totalCustomers }}</div>
                <div class="stat-label">Customers</div>
              </div>

              <div class="stat-card">
                <div class="stat-icon active">💰</div>
                <div class="stat-value">{{ summary()!.activeLoans }}</div>
                <div class="stat-label">Active Loans</div>
              </div>

              <div class="stat-card">
                <div class="stat-icon overdue">⚠️</div>
                <div class="stat-value">{{ summary()!.overdueLoans }}</div>
                <div class="stat-label">Overdue</div>
              </div>

              <div class="stat-card">
                <div class="stat-icon outstanding">📊</div>
                <div class="stat-value">₱{{ (summary()!.totalOutstanding / 1000).toFixed(0) }}k</div>
                <div class="stat-label">Outstanding</div>
              </div>
            </div>

            <!-- Pending Actions -->
            <div class="actions-card">
              <div class="card-header">
                <span class="card-title">⚡ Pending Actions</span>
                <div class="badge-count">{{ totalPendingActions() }}</div>
              </div>

              @if (floatPending()) {
                <div class="policy-banner" (click)="navigateTo('/collector/cash-float')">
                  <div class="policy-icon">💵</div>
                  <div class="policy-text">
                    <div class="policy-title">Float decision required</div>
                    <div class="policy-sub">You have {{ pendingFloatCount() }} pending float(s). Accept or reject to unlock disbursements.</div>
                  </div>
                  <div class="policy-cta">Resolve ›</div>
                </div>
              }
              
              <div class="actions-list">
                <div class="action-item applications" (click)="navigateIfAllowed('/collector/applications')" [class.locked]="actionsLocked()">
                  <div class="action-info">
                    <div class="action-icon">📄</div>
                    <div>
                      <div class="action-title">Applications</div>
                      <div class="action-subtitle">Pending approval</div>
                    </div>
                  </div>
                  <div class="action-right">
                    <div class="action-badge">{{ summary()!.pendingApplications }}</div>
                    <span  class="emoji-icon chevron-icon">›</span>
                  </div>
                </div>

                <div class="action-item disbursements" (click)="navigateIfAllowed('/collector/disbursements')" [class.locked]="disbursementLocked()">
                  <div class="action-info">
                    <div class="action-icon">💳</div>
                    <div>
                      <div class="action-title">Disbursements</div>
                      <div class="action-subtitle">{{ floatPending() ? 'Locked until float is accepted/rejected' : 'Ready to disburse' }}</div>
                    </div>
                  </div>
                  <div class="action-right">
                    <div class="action-badge">{{ summary()!.pendingDisbursements }}</div>
                    <span  class="emoji-icon chevron-icon">›</span>
                  </div>
                </div>

                <div class="action-item waivers" (click)="navigateIfAllowed('/collector/waivers')" [class.locked]="actionsLocked()">
                  <div class="action-info">
                    <div class="action-icon">⏰</div>
                    <div>
                      <div class="action-title">Penalty Waivers</div>
                      <div class="action-subtitle">Pending approval</div>
                    </div>
                  </div>
                  <div class="action-right">
                    <div class="action-badge">{{ summary()!.pendingWaivers }}</div>
                    <span  class="emoji-icon chevron-icon">›</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Collector Limits -->
            @if (limits()) {
              <div class="limits-card">
                <div class="card-title">🎯 Your Limits</div>
                
                <div class="limits-list">
                  <div class="limit-item">
                    <span class="limit-label">Max Approval Amount</span>
                    <span class="limit-value">₱{{ limits()!.maxApprovalAmount.toLocaleString() }}</span>
                  </div>
                  <div class="limit-divider"></div>
                  
                  <div class="limit-item">
                    <span class="limit-label">Max Approvals/Day</span>
                    <span class="limit-value">{{ limits()!.maxApprovalPerDay }}</span>
                  </div>
                  <div class="limit-divider"></div>
                  
                  <div class="limit-item">
                    <span class="limit-label">Max Disbursement</span>
                    <span class="limit-value">₱{{ limits()!.maxDisbursementAmount.toLocaleString() }}</span>
                  </div>
                  <div class="limit-divider"></div>
                  
                  <div class="limit-item">
                    <span class="limit-label">Max Penalty Waiver</span>
                    <span class="limit-value">₱{{ limits()!.maxPenaltyWaiverAmount.toLocaleString() }} ({{ limits()!.maxPenaltyWaiverPercent }}%)</span>
                  </div>
                </div>
              </div>
            }

            <!-- Quick Actions -->
            <div class="quick-actions">
              <button class="action-btn primary" (click)="navigateIfAllowed('/collector/visits')" [disabled]="actionsLocked()">
                <span  class="emoji-icon">📍</span>
                <span>Start Visit</span>
              </button>
              <button class="action-btn success" (click)="navigateIfAllowed('/collector/route')" [disabled]="actionsLocked()">
                <span  class="emoji-icon">👥</span>
                <span>My Customers</span>
              </button>
              <button class="action-btn" (click)="navigateTo('/collector/history')">
                <span  class="emoji-icon">🗂️</span>
                <span>History</span>
              </button>
            </div>

            <!-- End of Day Action -->
            <div class="end-of-day-card">
              <div class="card-header">
                <div class="card-icon">🏦</div>
                <div>
                  <div class="card-title">End of Day</div>
                  <div class="card-subtitle">Close day & handover cash to cashier</div>
                </div>
              </div>
              <button 
                class="action-btn handover" 
                (click)="navigateIfAllowed('/collector/cash-handover')"
                [disabled]="actionsLocked() || !canHandover()">
                <span class="emoji-icon">💰</span>
                <span>{{ getHandoverButtonText() }}</span>
              </button>
              @if (summary()?.collectedToday && summary()!.collectedToday > 0) {
                <div class="handover-summary">
                  <div class="summary-row">
                    <span class="label">Cash to handover:</span>
                    <span class="value">₱{{ summary()!.collectedToday.toLocaleString() }}</span>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </div>

      <!-- Customers Modal -->
      @if (showCustomersModal()) {
        <div class="modal-backdrop" (click)="closeCustomerList()">
          <div class="modal-container" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-block">
                <span class="modal-eyebrow">Assigned Customers</span>
                <div class="modal-heading">
                  <h2>All Customers</h2>
                  <span class="modal-count">{{ filteredCustomers().length }}</span>
                </div>
                <p class="modal-subtitle">
                  Review and prioritize your visits with a live view of everyone on your list.
                </p>
              </div>
              <button class="close-btn" (click)="closeCustomerList()">
                <span  class="emoji-icon">✖️</span>
              </button>
            </div>

            <div class="modal-toolbar">
              <div class="search-field">
                <span  class="emoji-icon search-leading">🔍</span>
                <input
                  type="search"
                  class="search-input"
                  placeholder="Search by name, phone, or ID..."
                  [value]="customerSearch()"
                  (input)="onCustomerSearch($event)"
                />
                @if (customerSearch()) {
                  <button class="search-clear" (click)="clearCustomerSearch()">
                    <span  class="emoji-icon">✖️</span>
                  </button>
                }
              </div>

              <div class="filter-chips">
                <button
                  type="button"
                  class="filter-chip"
                  [class.active]="customerFilter() === 'all'"
                  (click)="setCustomerFilter('all')"
                >
                  All <span>{{ customerStats().total }}</span>
                </button>
                <button
                  type="button"
                  class="filter-chip"
                  [class.active]="customerFilter() === 'active'"
                  (click)="setCustomerFilter('active')"
                >
                  Active <span>{{ customerStats().active }}</span>
                </button>
                <button
                  type="button"
                  class="filter-chip"
                  [class.active]="customerFilter() === 'overdue'"
                  (click)="setCustomerFilter('overdue')"
                >
                  Overdue <span>{{ customerStats().overdue }}</span>
                </button>
                <button
                  type="button"
                  class="filter-chip"
                  [class.active]="customerFilter() === 'clear'"
                  (click)="setCustomerFilter('clear')"
                >
                  Cleared <span>{{ customerStats().clear }}</span>
                </button>
              </div>
            </div>

            <div class="modal-body">
              @if (customersLoading()) {
                <div class="modal-loading">
                  <ion-skeleton-text animated style="height: 1.1rem; width: 90%;"></ion-skeleton-text>
                  <ion-skeleton-text animated style="height: 1.1rem; width: 75%;"></ion-skeleton-text>
                  <ion-skeleton-text animated style="height: 1.1rem; width: 65%;"></ion-skeleton-text>
                </div>
              } @else if (filteredCustomers().length === 0) {
                <div class="modal-empty">
                  <div class="empty-bubble">✨</div>
                  <h3>No customers match your filters</h3>
                  <p>Try clearing the search or switching filters to see more people.</p>
                  <button type="button" class="empty-reset" (click)="setCustomerFilter('all'); clearCustomerSearch()">
                    Reset filters
                  </button>
                </div>
              } @else {
                <div class="customer-list">
                  @for (customer of filteredCustomers(); track customer.id; let idx = $index) {
                    <div class="customer-card" [style.animationDelay.ms]="idx * 60">
                      <div class="card-top">
                        <div class="avatar-circle">{{ getCustomerInitials(customer) }}</div>
                        <div class="card-main">
                          <div class="name-row">
                            <span class="customer-name">{{ customer.firstName }} {{ customer.lastName }}</span>
                            <span class="status-chip" [attr.data-status]="getCustomerStatus(customer)">
                              {{ getCustomerStatusLabel(customer) }}
                            </span>
                          </div>
                          <div class="meta-row">
                            <span>ID {{ customer.idNumber || 'N/A' }}</span>
                            <span class="meta-dot"></span>
                            <span>{{ customer.activeLoans }} loan{{ customer.activeLoans === 1 ? '' : 's' }}</span>
                          </div>
                        </div>
                      </div>

                      <div class="card-stats">
                        <div class="stat-pill">
                          <span class="stat-label">Outstanding</span>
                          <span class="stat-value">₱{{ formatCurrency(customer.totalOutstanding) }}</span>
                        </div>
                        <div class="stat-pill">
                          <span class="stat-label">Overdue</span>
                          <span class="stat-value overdue">₱{{ formatCurrency(customer.overdueAmount) }}</span>
                        </div>
                        <div class="stat-pill">
                          <span class="stat-label">Last Payment</span>
                          <span class="stat-value">{{ formatShortDate(customer.lastPaymentDate) }}</span>
                        </div>
                      </div>

                      <div class="card-footer">
                        <div class="contact-row">
                          <span  class="emoji-icon">📞</span>
                          <span>{{ customer.phoneNumber || 'No phone on file' }}</span>
                        </div>
                        <div class="assigned-pill">
                          Assigned {{ formatRelativeDate(customer.assignedDate) }}
                        </div>
                      </div>

                      @if (customer.address) {
                        <div class="address-row">
                          <span  class="emoji-icon">📍</span>
                          <span>{{ customer.address }}</span>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>

            <div class="modal-footer">
              <button class="modal-action" (click)="navigateTo('/collector/route')">
                Review route
                <span  class="emoji-icon">➡️</span>
              </button>
            </div>
          </div>
        </div>
      }
    </ion-content>
  `,
  styles: [`
    /* Main Content */
    .main-content {
      --background: #f8fafc;
    }

    /* Dashboard Container */
    .dashboard-container {
      padding-top: calc(84px + env(safe-area-inset-top) + 0.85rem);
      padding-bottom: calc(72px + env(safe-area-inset-bottom) + 0.85rem);
      padding-left: 0.85rem;
      padding-right: 0.85rem;
    }

    /* Summary Pills */
    .summary-pills {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.65rem;
      margin-bottom: 1rem;
    }

    .summary-pill {
      background: white;
      border-radius: 14px;
      padding: 0.9rem 0.75rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
      border: 1px solid rgba(148, 163, 184, 0.12);
      transition: all 0.2s ease;
    }

    .summary-pill ion-icon {
      font-size: 1.5rem;
      color: #3b82f6;
    }

    .pill-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.15rem;
    }

    .pill-value {
      font-size: 1.1rem;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.02em;
    }

    .pill-label {
      font-size: 0.65rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .loading-skeletons {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .empty-state {
      background: var(--ion-card-background, white);
      border-radius: 16px;
      padding: 2.5rem 1.5rem;
      text-align: center;
      box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
      border: 1px solid rgba(148, 163, 184, 0.18);
      display: flex;
      flex-direction: column;
      gap: 1rem;
      align-items: center;
    }

    .empty-icon {
      font-size: 2.5rem;
    }

    .empty-state h2 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--ion-text-color, #1f2937);
    }

    .empty-state p {
      margin: 0;
      font-size: 0.85rem;
      color: var(--ion-color-medium, #64748b);
    }

    .empty-action {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.6rem 1rem;
      border-radius: 999px;
      border: none;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: white;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 16px 28px rgba(37, 99, 235, 0.35);
    }

    .empty-action ion-icon {
      font-size: 1rem;
    }

    .empty-action:active {
      transform: translateY(1px);
    }

    .dashboard-content {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .progress-card {
      background: var(--ion-card-background, white);
      border-radius: 14px;
      padding: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
      border: 1px solid var(--ion-border-color, rgba(0, 0, 0, 0.04));
    }

    .card-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--ion-text-color, #1f2937);
      margin-bottom: 0.85rem;
    }

    .progress-item {
      margin-bottom: 1rem;
    }

    .progress-item:last-child {
      margin-bottom: 0;
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .progress-label {
      font-size: 0.8rem;
      color: var(--ion-color-medium, #64748b);
      font-weight: 500;
    }

    .progress-value {
      font-size: 1rem;
      font-weight: 700;
    }

    .progress-value.collected {
      color: #10b981;
    }

    .progress-value.visits {
      color: #3b82f6;
    }

    .progress-subtext {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--ion-color-medium, #6b7280);
      margin-bottom: 0.5rem;
    }

    .percentage {
      font-weight: 600;
      color: var(--ion-text-color, #1f2937);
    }

    .progress-bar {
      width: 100%;
      height: 6px;
      background: var(--ion-color-light, #e5e7eb);
      border-radius: 10px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
      border-radius: 10px;
      transition: width 0.3s ease;
    }

    .progress-fill.complete {
      background: linear-gradient(90deg, #10b981 0%, #059669 100%);
    }

    .progress-fill.visits {
      background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }

    .stat-card {
      background: var(--ion-card-background, white);
      border-radius: 14px;
      padding: 1rem;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
      border: 1px solid var(--ion-border-color, rgba(0, 0, 0, 0.04));
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .stat-card:active {
      transform: scale(0.98);
    }

    .stat-icon {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--ion-text-color, #1f2937);
      margin-bottom: 0.25rem;
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--ion-color-medium, #6b7280);
      font-weight: 500;
    }

    .actions-card {
      background: var(--ion-card-background, white);
      border-radius: 14px;
      padding: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
      border: 1px solid var(--ion-border-color, rgba(0, 0, 0, 0.04));
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.85rem;
    }

    .badge-count {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
      padding: 0.25rem 0.65rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .actions-list {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .action-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.85rem;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .action-item.locked {
      opacity: 0.6;
      pointer-events: none;
    }

    .policy-banner {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0.65rem;
      align-items: center;
      padding: 0.75rem;
      border-radius: 12px;
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border: 1px solid rgba(59, 130, 246, 0.25);
      margin-bottom: 0.65rem;
      cursor: pointer;
    }
    .policy-icon { font-size: 1.2rem; }
    .policy-title { font-weight: 800; font-size: 0.9rem; color: #0f172a; }
    .policy-sub { font-size: 0.78rem; color: #334155; }
    .policy-cta { font-weight: 800; color: #1d4ed8; }

    .action-item.applications {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    }

    .action-item.applications:active {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
    }

    .action-item.disbursements {
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
    }

    .action-item.disbursements:active {
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
    }

    .action-item.waivers {
      background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
    }

    .action-item.waivers:active {
      background: linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%);
    }

    .action-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .action-icon {
      font-size: 1.75rem;
    }

    .action-title {
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--ion-text-color, #1f2937);
    }

    .action-subtitle {
      font-size: 0.7rem;
      color: var(--ion-color-medium, #6b7280);
      margin-top: 0.15rem;
    }

    .action-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .action-badge {
      background: var(--ion-card-background, white);
      color: var(--ion-text-color, #1f2937);
      padding: 0.25rem 0.65rem;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 700;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    .chevron-icon {
      font-size: 1.1rem;
      color: var(--ion-color-medium, #9ca3af);
    }

    .limits-card {
      background: var(--ion-card-background, white);
      border-radius: 14px;
      padding: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
      border: 1px solid var(--ion-border-color, rgba(0, 0, 0, 0.04));
    }

    .limits-list {
      display: flex;
      flex-direction: column;
    }

    .limit-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.65rem 0;
    }

    .limit-label {
      font-size: 0.8rem;
      color: var(--ion-color-medium, #64748b);
      font-weight: 500;
    }

    .limit-value {
      font-size: 0.85rem;
      color: var(--ion-text-color, #1f2937);
      font-weight: 700;
    }

    .limit-divider {
      height: 1px;
      background: var(--ion-border-color, #e5e7eb);
    }

    .quick-actions {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }

    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.85rem;
      border: none;
      border-radius: 10px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
    }

    .action-btn ion-icon {
      font-size: 1.1rem;
    }

    .action-btn.primary {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
    }

    .action-btn.primary:active,
    .action-btn.success:active {
      transform: scale(0.98);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    .action-btn.success {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
    }

    .action-btn.handover {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
      width: 100%;
      margin-top: 0.75rem;
      padding: 1rem;
    }

    .action-btn.handover:disabled {
      background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
      opacity: 0.6;
      cursor: not-allowed;
    }

    .quick-actions .action-btn[disabled] {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .end-of-day-card {
      background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
      border: 2px solid #fbbf24;
      border-radius: 14px;
      padding: 1rem;
      margin-top: 1rem;
      box-shadow: 0 4px 12px rgba(251, 191, 36, 0.15);
    }

    /* Status Banner */
    .status-banner {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 0.65rem;
      border-radius: 12px;
      padding: 0.75rem;
      margin-bottom: 0.75rem;
      border: 1px solid rgba(0,0,0,0.06);
    }
    .status-banner .status-icon {
      font-size: 1.25rem;
    }
    .status-banner .status-title {
      font-weight: 800;
      font-size: 0.95rem;
    }
    .status-banner .status-sub {
      font-size: 0.8rem;
      color: #475569;
    }
    .status-banner .status-action {
      border: none;
      border-radius: 999px;
      padding: 0.45rem 0.85rem;
      font-weight: 700;
      cursor: pointer;
    }
    .status-banner.pending {
      background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
      border-color: #fdba74;
    }
    .status-banner.pending .status-action {
      background: #f59e0b;
      color: white;
    }
    .status-banner.confirmed {
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      border-color: #6ee7b7;
    }
    .status-banner.confirmed .status-action {
      background: #10b981;
      color: white;
    }

    .end-of-day-card .card-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }

    .end-of-day-card .card-icon {
      font-size: 2rem;
      line-height: 1;
    }

    .end-of-day-card .card-title {
      font-size: 1rem;
      font-weight: 700;
      color: #78350f;
    }

    .end-of-day-card .card-subtitle {
      font-size: 0.75rem;
      color: #92400e;
      margin-top: 0.15rem;
    }

    .end-of-day-card .handover-summary {
      background: rgba(255, 255, 255, 0.6);
      border-radius: 8px;
      padding: 0.75rem;
      margin-top: 0.75rem;
    }

    .end-of-day-card .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .end-of-day-card .summary-row .label {
      font-size: 0.8rem;
      color: #78350f;
      font-weight: 500;
    }

    .end-of-day-card .summary-row .value {
      font-size: 1.1rem;
      color: #78350f;
      font-weight: 700;
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(8px);
      animation: backdropFade 0.25s ease forwards;
      z-index: 200;
    }

    .modal-container {
      width: 100%;
      max-width: 560px;
      background: linear-gradient(160deg, #ffffff 0%, #f8fbff 100%);
      border-radius: 20px;
      border: 1px solid rgba(37, 99, 235, 0.12);
      box-shadow: 0 25px 60px rgba(15, 23, 42, 0.28);
      display: flex;
      flex-direction: column;
      max-height: calc(100vh - 3rem);
      overflow: hidden;
      animation: modalScale 0.28s ease forwards;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.05rem 1.25rem;
      background: rgba(248, 250, 252, 0.9);
      border-bottom: 1px solid rgba(15, 23, 42, 0.08);
      gap: 1rem;
    }

    .modal-title-block {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .modal-eyebrow {
      font-size: 0.7rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      font-weight: 700;
      color: #2563eb;
    }

    .modal-heading {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .modal-heading h2 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: #0f172a;
    }

    .modal-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgba(37, 99, 235, 0.12);
      color: #1d4ed8;
      padding: 0.15rem 0.55rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .modal-subtitle {
      margin: 0;
      font-size: 0.85rem;
      color: #475569;
      line-height: 1.4;
    }

    .close-btn {
      border: none;
      background: rgba(148, 163, 184, 0.18);
      border-radius: 999px;
      width: 38px;
      height: 38px;
      display: grid;
      place-items: center;
      font-size: 1rem;
      color: #475569;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .close-btn:active {
      background: rgba(148, 163, 184, 0.28);
    }

    .modal-toolbar {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 0.85rem 1.25rem;
      background: rgba(248, 250, 252, 0.95);
      border-bottom: 1px solid rgba(15, 23, 42, 0.08);
    }

    .search-field {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: white;
      border: 1px solid rgba(148, 163, 184, 0.35);
      border-radius: 999px;
      padding: 0.35rem 0.75rem;
    }

    .search-leading {
      font-size: 1rem;
      color: #2563eb;
    }

    .search-input {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 0.85rem;
      color: #1f2937;
    }

    .search-input:focus {
      outline: none;
    }

    .search-clear {
      border: none;
      background: rgba(148, 163, 184, 0.18);
      border-radius: 999px;
      width: 28px;
      height: 28px;
      display: grid;
      place-items: center;
      cursor: pointer;
      color: #475569;
    }

    .filter-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .filter-chip {
      border: 1px solid rgba(148, 163, 184, 0.35);
      background: rgba(248, 250, 252, 0.9);
      color: #1e293b;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 999px;
      padding: 0.3rem 0.8rem;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .filter-chip span {
      background: rgba(37, 99, 235, 0.12);
      color: #1d4ed8;
      border-radius: 999px;
      padding: 0.15rem 0.5rem;
      font-size: 0.7rem;
      font-weight: 700;
    }

    .filter-chip.active {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: white;
      border-color: transparent;
    }

    .filter-chip.active span {
      background: rgba(255, 255, 255, 0.25);
      color: white;
    }

    .modal-body {
      padding: 1rem 1.25rem 1.5rem;
      overflow-y: auto;
      max-height: calc(75vh - 160px);
      display: flex;
      flex-direction: column;
      gap: 1rem;
      background: linear-gradient(180deg, rgba(248, 250, 252, 0.95) 0%, rgba(255, 255, 255, 0.98) 100%);
    }

    .modal-loading {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .modal-empty {
      background: rgba(248, 250, 252, 0.9);
      border: 1px dashed rgba(148, 163, 184, 0.45);
      border-radius: 16px;
      padding: 1.75rem 1.5rem;
      text-align: center;
      color: #475569;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .empty-bubble {
      font-size: 2.2rem;
    }

    .empty-reset {
      align-self: center;
      border: none;
      background: rgba(37, 99, 235, 0.15);
      color: #1d4ed8;
      font-weight: 600;
      padding: 0.45rem 1rem;
      border-radius: 999px;
      cursor: pointer;
    }

    .customer-list {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .customer-card {
      background: white;
      border-radius: 18px;
      border: 1px solid rgba(15, 23, 42, 0.06);
      padding: 1rem;
      box-shadow: 0 20px 32px rgba(15, 23, 42, 0.08);
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
      opacity: 0;
      transform: translateY(12px);
      animation: cardEnter 0.35s ease forwards;
    }

    .card-top {
      display: flex;
      gap: 0.85rem;
    }

    .avatar-circle {
      width: 44px;
      height: 44px;
      border-radius: 14px;
      background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
      color: white;
      font-weight: 700;
      display: grid;
      place-items: center;
      font-size: 1rem;
      letter-spacing: 0.06em;
    }

    .card-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .name-row {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      align-items: center;
    }

    .customer-name {
      font-size: 1.05rem;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.01em;
    }

    .status-chip {
      padding: 0.3rem 0.75rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      background: rgba(148, 163, 184, 0.2);
      color: #1e293b;
    }

    .status-chip[data-status="overdue"] {
      background: rgba(248, 113, 113, 0.18);
      color: #b91c1c;
    }

    .status-chip[data-status="active"] {
      background: rgba(134, 239, 172, 0.2);
      color: #15803d;
    }

    .status-chip[data-status="clear"] {
      background: rgba(147, 197, 253, 0.18);
      color: #1d4ed8;
    }

    .meta-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
      color: #64748b;
      flex-wrap: wrap;
    }

    .meta-dot {
      width: 4px;
      height: 4px;
      background: rgba(148, 163, 184, 0.6);
      border-radius: 999px;
      display: inline-block;
    }

    .card-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 0.75rem;
    }

    .stat-pill {
      background: rgba(248, 250, 252, 0.85);
      border: 1px solid rgba(148, 163, 184, 0.25);
      border-radius: 14px;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .stat-label {
      font-size: 0.75rem;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .stat-value {
      font-size: 0.95rem;
      font-weight: 700;
      color: #0f172a;
    }

    .stat-value.overdue {
      color: #b91c1c;
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .contact-row {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.85rem;
      color: #1e293b;
    }

    .contact-row ion-icon {
      color: #2563eb;
      font-size: 1rem;
    }

    .assigned-pill {
      background: rgba(37, 99, 235, 0.12);
      color: #1d4ed8;
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .address-row {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.8rem;
      color: #475569;
      border-top: 1px solid rgba(148, 163, 184, 0.2);
      padding-top: 0.75rem;
    }

    .address-row ion-icon {
      color: #2563eb;
      font-size: 0.95rem;
    }

    .modal-footer {
      padding: 1.2rem 1.75rem 1.5rem;
      background: rgba(248, 250, 252, 0.85);
      border-top: 1px solid rgba(148, 163, 184, 0.2);
    }

    .modal-action {
      width: 100%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.85rem 1rem;
      border-radius: 14px;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      border: none;
      color: white;
      font-weight: 700;
      font-size: 0.95rem;
      cursor: pointer;
      box-shadow: 0 18px 32px rgba(37, 99, 235, 0.35);
      transition: transform 0.2s ease;
    }

    .modal-action ion-icon {
      font-size: 1.05rem;
    }

    .modal-action:active {
      transform: translateY(1px);
    }

    @keyframes backdropFade {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes modalScale {
      from {
        opacity: 0;
        transform: translateY(12px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes cardEnter {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    body.dark .modal-container,
    .dark .modal-container {
      background: linear-gradient(160deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 64, 175, 0.35) 35%, rgba(15, 23, 42, 0.95) 70%);
      border-color: rgba(59, 130, 246, 0.25);
    }

    body.dark .modal-header,
    .dark .modal-header {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.22), rgba(99, 102, 241, 0.18));
    }

    body.dark .modal-subtitle,
    .dark .modal-subtitle {
      color: rgba(226, 232, 240, 0.8);
    }

    body.dark .close-btn,
    .dark .close-btn {
      background: rgba(15, 23, 42, 0.85);
      color: rgba(226, 232, 240, 0.75);
    }

    body.dark .modal-toolbar,
    .dark .modal-toolbar {
      background: rgba(15, 23, 42, 0.65);
      border-bottom-color: rgba(37, 99, 235, 0.25);
    }

    body.dark .search-field,
    .dark .search-field {
      background: rgba(15, 23, 42, 0.85);
      border-color: rgba(59, 130, 246, 0.2);
    }

    body.dark .search-input,
    .dark .search-input {
      color: rgba(226, 232, 240, 0.95);
    }

    body.dark .filter-chip,
    .dark .filter-chip {
      background: rgba(15, 23, 42, 0.65);
      border-color: rgba(59, 130, 246, 0.3);
      color: rgba(191, 219, 254, 0.85);
    }

    body.dark .filter-chip span,
    .dark .filter-chip span {
      background: rgba(37, 99, 235, 0.3);
      color: rgba(191, 219, 254, 0.9);
    }

    body.dark .modal-body,
    .dark .modal-body {
      background: rgba(15, 23, 42, 0.4);
    }

    body.dark .modal-empty,
    .dark .modal-empty {
      background: rgba(30, 41, 59, 0.75);
      border-color: rgba(59, 130, 246, 0.35);
      color: rgba(226, 232, 240, 0.75);
    }

    body.dark .customer-card,
    .dark .customer-card {
      background: rgba(15, 23, 42, 0.85);
      border-color: rgba(37, 99, 235, 0.2);
      box-shadow: 0 24px 40px rgba(2, 6, 23, 0.6);
    }

    body.dark .customer-name,
    .dark .customer-name {
      color: rgba(248, 250, 252, 0.95);
    }

    body.dark .stat-pill,
    .dark .stat-pill {
      background: rgba(30, 41, 59, 0.8);
      border-color: rgba(59, 130, 246, 0.25);
    }

    body.dark .stat-value,
    .dark .stat-value {
      color: rgba(248, 250, 252, 0.92);
    }

    body.dark .contact-row,
    .dark .contact-row {
      color: rgba(226, 232, 240, 0.85);
    }

    body.dark .assigned-pill,
    .dark .assigned-pill {
      background: rgba(37, 99, 235, 0.35);
      color: rgba(191, 219, 254, 0.95);
    }

    body.dark .address-row,
    .dark .address-row {
      color: rgba(203, 213, 225, 0.75);
      border-top-color: rgba(59, 130, 246, 0.25);
    }

    body.dark .modal-footer,
    .dark .modal-footer {
      background: rgba(15, 23, 42, 0.65);
      border-top-color: rgba(59, 130, 246, 0.25);
    }
  `],
})
export class CollectorDashboardPage implements OnInit, ViewWillEnter {
  private collectorService = inject(CollectorService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastController = inject(ToastController);
  private cashFloatApi = inject(CashFloatApiService);
  private http = inject(HttpClient);
  private statusInterval: any;

  Math = Math;
  loading = signal(true);
  summary = signal<CollectorDailySummary | null>(null);
  limits = signal<CollectorLimits | null>(null);
  currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  collectorId = signal<number>(0);
  showCustomersModal = signal(false);
  customersLoading = signal(false);
  customers = signal<AssignedCustomer[]>([]);
  customerSearch = signal('');
  customerFilter = signal<'all' | 'active' | 'overdue' | 'clear'>('all');

  // Handover status
  handoverPending = signal(false);
  handoverConfirmed = signal(false);
  pendingHandover = signal<any | null>(null);

  // After-midnight overdue (yesterday not closed)
  handoverOverdue = signal(false);
  overdueDate = signal('');
  overdueHasOverride = signal(false);

  // Float decision status (Policy A)
  floatPending = signal(false);
  pendingFloatCount = signal(0);

  customerStats = computed(() => {
    const list = this.customers();

    let overdue = 0;
    let active = 0;
    let clear = 0;

    list.forEach((customer) => {
      const outstanding = Number(customer.totalOutstanding ?? 0);
      const overdueAmount = Number(customer.overdueAmount ?? 0);

      if (overdueAmount > 0) {
        overdue += 1;
      } else if (outstanding > 0) {
        active += 1;
      } else {
        clear += 1;
      }
    });

    return {
      total: list.length,
      overdue,
      active,
      clear,
    };
  });

  filteredCustomers = computed(() => {
    const query = this.customerSearch().trim().toLowerCase();
    const filter = this.customerFilter();

    let list = [...this.customers()];

    if (query) {
      list = list.filter((customer) => {
        const name = `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.toLowerCase();
        const phone = (customer.phoneNumber ?? '').toLowerCase();
        const idNumber = (customer.idNumber ?? '').toLowerCase();
        return (
          name.includes(query) ||
          phone.includes(query) ||
          idNumber.includes(query)
        );
      });
    }

    if (filter !== 'all') {
      list = list.filter((customer) => this.getCustomerStatus(customer) === filter);
    }

    list.sort((a, b) => {
      const overdueDiff = (b.overdueAmount ?? 0) - (a.overdueAmount ?? 0);
      if (overdueDiff !== 0) {
        return overdueDiff;
      }

      const outstandingDiff = (b.totalOutstanding ?? 0) - (a.totalOutstanding ?? 0);
      if (outstandingDiff !== 0) {
        return outstandingDiff;
      }

      return (b.activeLoans ?? 0) - (a.activeLoans ?? 0);
    });

    return list;
  });

  constructor() {}

  ngOnInit() {
    const user = this.authService.currentUser();
    if (user) {
      this.collectorId.set(Number(user.id));
    }
  }

  async ionViewWillEnter(): Promise<void> {
    const user = this.authService.currentUser();
    if (user && this.collectorId() !== Number(user.id)) {
      this.collectorId.set(Number(user.id));
    }

    if (!this.collectorId()) {
      return;
    }

    await this.loadDashboard(!this.summary());
    await this.loadHandoverStatus();
    await this.loadFloatStatus();
    await this.loadOverdueStatus();
    this.startStatusPolling();
  }

  async loadDashboard(showSkeleton = false) {
    if (!this.collectorId()) {
      return;
    }

    if (showSkeleton || (!this.summary() && !this.loading())) {
      this.loading.set(true);
    }
    try {
      const [summaryData, limitsData] = await Promise.all([
        this.collectorService.getDailySummary(this.collectorId()).toPromise(),
        this.collectorService.getLimits(this.collectorId()).toPromise(),
      ]);

      this.summary.set(summaryData!);
      this.limits.set(limitsData!);
    } catch (error: any) {
      await this.showToast(error.error?.message || 'Failed to load dashboard', 'danger');
    } finally {
      this.loading.set(false);
    }
  }

  async handleRefresh(event: any) {
    await this.loadDashboard();
    await this.loadHandoverStatus();
    await this.loadFloatStatus();
    await this.loadOverdueStatus();
    event.target.complete();
  }

  async loadOverdueStatus() {
    try {
      const resp: any = await this.http
        .get(`/api/money-loan/cash/collector/${this.collectorId()}/overdue`)
        .toPromise();
      const data = resp?.data;
      this.handoverOverdue.set(!!data?.isOverdue);
      this.overdueDate.set(data?.date || '');
      this.overdueHasOverride.set(!!data?.activeOverride);
    } catch {
      this.handoverOverdue.set(false);
      this.overdueHasOverride.set(false);
      this.overdueDate.set('');
    }
  }

  async loadHandoverStatus() {
    try {
      // Check day closed state via balance endpoint
      const balanceResp: any = await this.http.get('/api/money-loan/cash/balance').toPromise();
      const isClosed = !!(balanceResp && balanceResp.success && balanceResp.data && balanceResp.data.isDayClosed);
      this.handoverConfirmed.set(isClosed);

      // Check pending handovers for this collector
      const list = await this.cashFloatApi.getPendingHandovers().toPromise();
      const myPending = (list || []).find((h: any) => Number(h.collector_id) === this.collectorId());
      this.handoverPending.set(!isClosed && !!myPending);
      this.pendingHandover.set(myPending || null);
    } catch (err) {
      // Fail safe: don't block UI if status fetch fails
      this.handoverPending.set(false);
      // handoverConfirmed remains as last known (default false)
    }
  }

  async loadFloatStatus() {
    try {
      const response: any = await this.http.get('/api/money-loan/cash/pending-floats').toPromise();
      const list = (response && response.success && response.data) ? response.data : (response || []);
      const count = Array.isArray(list) ? list.length : 0;
      this.pendingFloatCount.set(count);
      this.floatPending.set(count > 0);
    } catch {
      // fail open; don't block UI if endpoint fails
      this.pendingFloatCount.set(0);
      this.floatPending.set(false);
    }
  }

  startStatusPolling() {
    this.stopStatusPolling();
    this.statusInterval = setInterval(() => {
      this.loadHandoverStatus();
      this.loadFloatStatus();
      this.loadOverdueStatus();
    }, 30000);
  }

  stopStatusPolling() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
  }

  async loadCustomers() {
    if (!this.collectorId()) {
      return;
    }

    this.customersLoading.set(true);
    try {
      const data = await this.collectorService.getAssignedCustomers(this.collectorId()).toPromise();
      this.customers.set(data || []);
    } catch (error: any) {
      this.customers.set([]);
      await this.showToast(error.error?.message || 'Failed to load customers', 'danger');
    } finally {
      this.customersLoading.set(false);
    }
  }

  async openCustomerList() {
    this.showCustomersModal.set(true);
    this.customerSearch.set('');
    this.customerFilter.set('all');
    await this.loadCustomers();
  }

  closeCustomerList() {
    this.showCustomersModal.set(false);
  }

  onCustomerSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.customerSearch.set(target.value ?? '');
  }

  clearCustomerSearch() {
    this.customerSearch.set('');
  }

  setCustomerFilter(filter: 'all' | 'active' | 'overdue' | 'clear') {
    this.customerFilter.set(filter);
  }

  getCustomerInitials(customer: AssignedCustomer): string {
    const first = (customer.firstName ?? '').trim();
    const last = (customer.lastName ?? '').trim();
    const firstInitial = first ? first.charAt(0).toUpperCase() : '';
    const lastInitial = last ? last.charAt(0).toUpperCase() : '';
    return (firstInitial + lastInitial || 'C').slice(0, 2);
  }

  getCustomerStatus(customer: AssignedCustomer): 'active' | 'overdue' | 'clear' {
    const overdueAmount = Number(customer.overdueAmount ?? 0);
    const outstanding = Number(customer.totalOutstanding ?? 0);

    if (overdueAmount > 0) {
      return 'overdue';
    }

    if (outstanding > 0) {
      return 'active';
    }

    return 'clear';
  }

  getCustomerStatusLabel(customer: AssignedCustomer): string {
    const status = this.getCustomerStatus(customer);
    if (status === 'overdue') {
      return 'Overdue';
    }
    if (status === 'active') {
      return 'Active';
    }
    return 'Cleared';
  }

  formatCurrency(amount: number | null | undefined): string {
    const value = Number(amount ?? 0);
    return value.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  formatShortDate(dateStr?: string): string {
    if (!dateStr) {
      return '—';
    }

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatRelativeDate(dateStr?: string): string {
    if (!dateStr) {
      return 'N/A';
    }

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      return 'N/A';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return 'Today';
    }

    if (diffDays === 1) {
      return '1 day ago';
    }

    if (diffDays < 30) {
      return `${diffDays} days ago`;
    }

    const diffMonths = Math.round(diffDays / 30);
    if (diffMonths === 1) {
      return '1 month ago';
    }

    if (diffMonths < 12) {
      return `${diffMonths} months ago`;
    }

    const diffYears = Math.round(diffMonths / 12);
    return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
  }

  collectionPercentage(): number {
    if (!this.summary() || this.summary()!.collectionTarget === 0) return 0;
    return Math.round((this.summary()!.collectedToday / this.summary()!.collectionTarget) * 100);
  }

  visitPercentage(): number {
    if (!this.summary() || this.summary()!.visitsPlanned === 0) return 0;
    return Math.round((this.summary()!.visitsCompleted / this.summary()!.visitsPlanned) * 100);
  }

  totalPendingActions(): number {
    if (!this.summary()) return 0;
    return this.summary()!.pendingApplications + 
           this.summary()!.pendingDisbursements + 
           this.summary()!.pendingWaivers;
  }

  canHandover(): boolean {
    // Collector can handover if there's a summary (day is active)
    // In a real implementation, you might check isDayClosed status from the API
    return !!this.summary();
  }

  actionsLocked(): boolean {
    return this.handoverPending() || this.handoverConfirmed() || (this.handoverOverdue() && !this.overdueHasOverride());
  }

  disbursementLocked(): boolean {
    // Policy A: must accept/reject float before disbursing
    return this.actionsLocked() || this.floatPending();
  }

  getHandoverButtonText(): string {
    if (this.handoverPending()) return 'Awaiting Cashier Confirmation';
    if (this.handoverConfirmed() || !this.canHandover()) return 'Day Already Closed';
    return 'Handover Cash';
  }

  navigateIfAllowed(path: string) {
    if (this.actionsLocked()) {
      this.showToast('Action unavailable during pending/closed handover', 'warning');
      return;
    }
    if (path === '/collector/disbursements' && this.floatPending()) {
      this.showToast('Accept or reject your float before disbursing', 'warning');
      this.router.navigate(['/collector/cash-float']);
      return;
    }
    this.navigateTo(path);
  }

  viewPendingHandover() {
    const item = this.pendingHandover();
    if (item && item.id) {
      this.router.navigate([`/collector/history/${item.id}`], { state: { item } });
    } else {
      this.router.navigate(['/collector/history']);
    }
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }

  async showToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  ngOnDestroy() {
    this.stopStatusPolling();
  }
}
