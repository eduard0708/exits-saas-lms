import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonButton, IonRefresher, IonRefresherContent, IonSkeletonText, ToastController, ModalController } from '@ionic/angular/standalone';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { CustomerTopBarComponent } from '../../shared/components/customer-top-bar.component';

interface LoanProduct {
  id: number;
  name: string;
  description: string;
  minAmount: number;
  maxAmount: number;
  interestRate: number;
  minTerm: number;  // Now stores days, not months
  maxTerm: number;  // Now stores days, not months
  processingFee: number;
  platformFee?: number;
  paymentFrequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  requirements: string[];
  features: string[];
  loanTermType?: string;  // 'fixed' or 'flexible' (lowercase from DB)
  fixedTermDays?: number;
  interestType?: string;
  deductPlatformFeeInAdvance?: boolean;
  deductProcessingFeeInAdvance?: boolean;
  deductInterestInAdvance?: boolean;
  availabilityType?: 'all' | 'selected';
  selectedCustomerIds?: number[];
}

@Component({
  selector: 'app-apply-loan',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonButton,
    IonRefresher,
    IonRefresherContent,
    IonSkeletonText,
    CustomerTopBarComponent
  ],
  template: `
    <ion-content [fullscreen]="true" class="main-content">
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <app-customer-top-bar
        icon="card-outline"
        title="Apply for Loan"
        subtitle="Choose your loan product"
      />

      <div class="products-container">
        <!-- Header Section -->
        <div class="header-section">
          <h2 class="page-title">Choose Your Loan</h2>
          <p class="page-subtitle">Select a loan product that best fits your needs</p>
        </div>

        <!-- Loading State -->
        @if (loading()) {
          <div class="products-loading">
            @for (i of [1,2,3]; track i) {
              <div class="product-skeleton">
                <ion-skeleton-text animated class="skeleton-title"></ion-skeleton-text>
                <ion-skeleton-text animated class="skeleton-text"></ion-skeleton-text>
                <ion-skeleton-text animated class="skeleton-text"></ion-skeleton-text>
                <ion-skeleton-text animated class="skeleton-button"></ion-skeleton-text>
              </div>
            }
          </div>
        }
        
        <!-- Empty State -->
        @else if (products().length === 0) {
          <div class="empty-state">
            <div class="empty-icon-wrapper">
              <span  class="emoji-icon empty-icon">⭐</span>
            </div>
            <h3 class="empty-title">No loan products available</h3>
            <p class="empty-message">
              We currently don't have any loan products available for your account. Please contact your lender for more information or check back later.
            </p>
            <div class="empty-hint">
              <span  class="emoji-icon hint-icon">🔄</span>
              <span>Pull down to refresh or tap the button below</span>
            </div>
            <div class="empty-actions">
              <ion-button
                size="small"
                class="empty-refresh"
                (click)="refreshProducts()"
                [disabled]="loading()"
              >
                <span  slot="start" class="emoji-icon">🔄</span>
                Refresh products
              </ion-button>
              <button type="button" class="empty-secondary" (click)="goToDashboard()">
                Back to dashboard
              </button>
            </div>
          </div>
        }
        
        <!-- Products List -->
        @else {
          <div class="products-list">
            @for (product of products(); track product.id) {
              <div class="product-card" [class.card-disabled]="isProductPending(product.id)">
                @if (isProductPending(product.id)) {
                  <div class="pending-overlay">
                    <span  class="emoji-icon overlay-icon">⏳</span>
                    <span class="overlay-text">Application Pending</span>
                  </div>
                }
                <div class="product-headline">
                  <div class="headline-main">
                    <span  class="emoji-icon product-emoji">💼</span>
                    <div class="product-title-section">
                      <h3 class="product-name">{{ product.name }}</h3>
                      <p class="product-description">{{ product.description }}</p>
                    </div>
                  </div>
                  <span class="product-type-chip">
                    {{ product.loanTermType === 'fixed' ? 'Fixed Term' : 'Flexible Term' }}
                  </span>
                </div>

                <div class="product-info">
                  <div class="info-item">
                    <span  class="emoji-icon info-emoji">💰</span>
                    <span class="info-text">₱{{ formatCurrency(product.minAmount) }} - ₱{{ formatCurrency(product.maxAmount) }}</span>
                  </div>
                  <div class="info-item">
                    <span  class="emoji-icon info-emoji">📈</span>
                    <span class="info-text">{{ product.interestRate }}% monthly ({{ product.interestType || 'flat' }})</span>
                  </div>
                  <div class="info-item">
                    <span  class="emoji-icon info-emoji">⏰</span>
                    <span class="info-text">
                      @if (product.loanTermType === 'fixed') {
                        {{ Math.round((product.fixedTermDays || 90) / 30) }} month term
                      } @else {
                        {{ Math.round(product.minTerm / 30) }}-{{ Math.round(product.maxTerm / 30) }} months
                      }
                    </span>
                  </div>
                  @if (product.paymentFrequency) {
                    <div class="info-item">
                      <span  class="emoji-icon info-emoji">📅</span>
                      <span class="info-text">{{ formatFrequency(product.paymentFrequency) }} payments</span>
                    </div>
                  }
                  @if (product.processingFee > 0) {
                    <div class="info-item">
                      <span  class="emoji-icon info-emoji">⚙️</span>
                      <span class="info-text">Processing fee {{ product.processingFee }}%</span>
                    </div>
                  }
                  @if (product.platformFee && product.platformFee > 0) {
                    <div class="info-item">
                      <span  class="emoji-icon info-emoji">🛡️</span>
                      <span class="info-text">Platform fee ₱{{ formatCurrency(product.platformFee) }}/mo</span>
                    </div>
                  }
                </div>

                @if (product.features && product.features.length > 0) {
                  <div class="features-section">
                    <p class="features-title">Highlights</p>
                    <ul class="features-list">
                      @for (feature of product.features.slice(0, 3); track feature) {
                        <li class="feature-item">
                          <span  class="emoji-icon feature-bullet">✔️</span>
                          <span class="feature-text">{{ feature }}</span>
                        </li>
                      }
                    </ul>
                  </div>
                }

                <div class="product-footer">
                  @if (isProductPending(product.id)) {
                    <div class="application-status">
                      <div class="status-header">
                        <span  class="emoji-icon status-icon">📋</span>
                        <span class="status-title">Your Application</span>
                      </div>
                      <div class="status-details">
                        <div class="status-row">
                          <span class="status-label">Status:</span>
                          <span class="status-badge">{{ getApplicationStatus(product.id) }}</span>
                        </div>
                        @if (getApplicationAmount(product.id)) {
                          <div class="status-row">
                            <span class="status-label">Amount:</span>
                            <span class="status-value">₱{{ formatCurrency(getApplicationAmount(product.id)) }}</span>
                          </div>
                        }
                        @if (getApplicationDate(product.id)) {
                          <div class="status-row">
                            <span class="status-label">Submitted:</span>
                            <span class="status-value">{{ formatDate(getApplicationDate(product.id)) }}</span>
                          </div>
                        }
                      </div>
                    </div>
                  } @else {
                    <button class="apply-btn" (click)="applyForProduct(product)">
                      <span>Apply Now</span>
                      <span  class="emoji-icon btn-emoji">🚀</span>
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    /* ===== EMPTY STATE ===== */
    .empty-state {
      position: relative;
      overflow: hidden;
      margin-top: 2.5rem;
      padding: 2.5rem 2rem;
      border-radius: 22px;
      background: linear-gradient(145deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.08) 45%, var(--ion-card-background) 100%);
      border: 1px solid rgba(99, 102, 241, 0.15);
      box-shadow: 0 18px 36px rgba(99, 102, 241, 0.12);
      text-align: center;
      animation: fadeInUp 0.5s ease-out;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .empty-state::before,
    .empty-state::after {
      content: '';
      position: absolute;
      border-radius: 50%;
      opacity: 0.5;
      filter: blur(0);
    }

    .empty-state::before {
      width: 200px;
      height: 200px;
      top: -80px;
      right: -50px;
      background: rgba(139, 92, 246, 0.15);
      animation: float 6s ease-in-out infinite;
    }

    .empty-state::after {
      width: 160px;
      height: 160px;
      bottom: -70px;
      left: -40px;
      background: rgba(99, 102, 241, 0.12);
      animation: float 8s ease-in-out infinite reverse;
    }

    @keyframes float {
      0%, 100% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-20px);
      }
    }

    .empty-hero {
      position: relative;
      z-index: 1;
      width: 80px;
      height: 80px;
      margin: 0 auto 1.5rem;
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15));
      box-shadow: 0 15px 30px rgba(99, 102, 241, 0.2);
      backdrop-filter: blur(14px);
      animation: scaleIn 0.6s ease-out 0.2s both;
    }

    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: scale(0.8);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .empty-emoji {
      font-size: 2.2rem;
      line-height: 1;
    }

    .empty-title {
      position: relative;
      z-index: 1;
      margin-bottom: 0.75rem;
      font-size: 1.35rem;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.01em;
    }

    .empty-message {
      position: relative;
      z-index: 1;
      margin: 0 auto 1.75rem;
      max-width: 22rem;
      font-size: 0.95rem;
      line-height: 1.55;
      color: #475569;
    }

    .empty-hint {
      position: relative;
      z-index: 1;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.85rem;
      border-radius: 999px;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
      color: var(--ion-text-color);
      font-size: 0.85rem;
      font-weight: 600;
      box-shadow: 0 10px 20px rgba(99, 102, 241, 0.12);
      margin-bottom: 1.75rem;
      animation: fadeInUp 0.6s ease-out 0.4s both;
    }

    .emoji-icon-inline {
      font-size: 1rem;
      line-height: 1;
      display: inline-block;
    }

    .empty-actions {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      align-items: center;
    }

    .empty-refresh {
      --background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      --background-activated: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      --border-radius: 999px;
      --padding-start: 1.35rem;
      --padding-end: 1.35rem;
      --box-shadow: 0 15px 28px rgba(99, 102, 241, 0.3);
      font-weight: 600;
      letter-spacing: 0.02em;
      animation: fadeInUp 0.6s ease-out 0.6s both;
      transition: all 0.3s ease;
    }

    .empty-refresh:hover {
      --box-shadow: 0 20px 35px rgba(99, 102, 241, 0.4);
      transform: translateY(-2px);
    }

    .empty-secondary {
      background: none;
      border: none;
      color: #6366f1;
      font-weight: 600;
      font-size: 0.9rem;
      text-decoration: underline;
      cursor: pointer;
      animation: fadeInUp 0.6s ease-out 0.7s both;
      transition: all 0.2s ease;
    }

    .empty-secondary:hover {
      color: #4f46e5;
    }

    .empty-secondary:active {
      opacity: 0.7;
      transform: scale(0.98);
    }

    .app-title {
      font-size: 1rem;
      font-weight: 700;
      color: white;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
      letter-spacing: -0.02em;
    }

    /* ===== MAIN CONTENT ===== */
    .main-content {
      --background: linear-gradient(160deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.04)), var(--ion-background-color);
    }

    .products-container {
      padding: 0 1rem 1rem 1rem;
      padding-top: calc(84px + env(safe-area-inset-top) + 0.85rem);
      padding-bottom: calc(60px + env(safe-area-inset-bottom) + 0.85rem);
      max-width: 600px;
      margin: 0 auto;
    }

    /* ===== HEADER SECTION ===== */
    .header-section {
      margin-bottom: 1.5rem;
      text-align: center;
    }

    .page-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--ion-text-color);
      margin: 0 0 0.5rem 0;
    }

    .page-subtitle {
      font-size: 0.95rem;
      color: var(--ion-color-medium);
      margin: 0;
    }

    /* ===== PENDING BANNER ===== */
    .pending-banner {
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
      color: white;
      border-radius: 12px;
      padding: 1rem 1.25rem;
      margin-bottom: 1.5rem;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
    }

    .banner-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
      margin-top: 0.1rem;
    }

    .banner-content {
      flex: 1;
    }

    .banner-title {
      font-size: 0.95rem;
      font-weight: 700;
      margin: 0 0 0.25rem 0;
      color: white;
    }

    .banner-text {
      font-size: 0.85rem;
      margin: 0;
      opacity: 0.95;
      line-height: 1.4;
    }

    /* ===== LOADING STATE ===== */
    .products-loading {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .product-skeleton {
      background: var(--ion-card-background);
      border-radius: 18px;
      padding: 1.5rem;
      border: 1px solid var(--ion-border-color, #e5e7eb);
    }

    .skeleton-title {
      width: 60%;
      height: 24px;
      border-radius: 4px;
      margin-bottom: 1rem;
    }

    .skeleton-text {
      width: 100%;
      height: 16px;
      border-radius: 4px;
      margin-bottom: 0.75rem;
    }

    .skeleton-button {
      width: 120px;
      height: 44px;
      border-radius: 12px;
      margin-top: 1rem;
    }

    /* ===== EMPTY STATE ===== */
    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
    }

    .empty-icon-wrapper {
      width: 100px;
      height: 100px;
      background: var(--ion-color-light);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
    }

    .empty-icon {
      font-size: 3rem;
      color: var(--ion-color-medium);
    }

    .empty-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--ion-text-color);
      margin: 0 0 0.5rem 0;
    }

    .empty-subtitle {
      font-size: 0.9375rem;
      color: var(--ion-color-medium);
      margin: 0;
    }

    /* ===== PRODUCTS LIST ===== */
    .products-list {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      max-width: 100%;
    }

    .product-card {
      background: var(--ion-card-background);
      border: 1px solid rgba(99, 102, 241, 0.1);
      border-radius: 14px;
      padding: 1.25rem 1.5rem;
      box-shadow: 0 6px 18px rgba(99, 102, 241, 0.06);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      width: 100%;
      animation: slideInUp 0.4s ease-out both;
    }

    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .product-card:hover {
      box-shadow: 0 12px 28px rgba(99, 102, 241, 0.15);
      transform: translateY(-4px);
      border-color: rgba(99, 102, 241, 0.2);
    }

    .product-card.card-disabled {
      opacity: 0.7;
      pointer-events: none;
      background: var(--ion-color-light);
      border-color: var(--ion-color-medium);
    }

    .product-card.card-disabled:hover {
      transform: none;
      box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
    }

    .pending-overlay {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
      color: white;
      padding: 0.4rem 0.75rem;
      border-radius: 999px;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.75rem;
      font-weight: 700;
      box-shadow: 0 4px 12px rgba(251, 191, 36, 0.35);
      z-index: 10;
    }

    .overlay-icon {
      font-size: 1rem;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.7;
        transform: scale(1.1);
      }
    }

    .overlay-text {
      font-size: 0.72rem;
      letter-spacing: 0.02em;
    }

    .product-headline {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .headline-main {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex: 1;
      min-width: 0;
    }

    .product-emoji {
      font-size: 2rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15));
      color: #6366f1;
      transition: all 0.3s ease;
    }

    .product-card:hover .product-emoji {
      transform: scale(1.1) rotate(5deg);
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(139, 92, 246, 0.25));
    }

    .product-title-section {
      flex: 1;
      min-width: 0;
    }

    .product-name {
      margin: 0 0 0.2rem 0;
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--ion-text-color);
    }

    .product-description {
      margin: 0;
      font-size: 0.82rem;
      color: var(--ion-color-medium);
      line-height: 1.4;
    }

    .product-type-chip {
      padding: 0.3rem 0.65rem;
      border-radius: 999px;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15));
      color: #6366f1;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      white-space: nowrap;
      transition: all 0.3s ease;
    }

    .product-card:hover .product-type-chip {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(139, 92, 246, 0.25));
      transform: scale(1.05);
    }

    .product-info {
      margin-top: 1rem;
      margin-left: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: var(--ion-text-color);
    }

    .info-emoji {
      font-size: 1.1rem;
      flex-shrink: 0;
      color: #6366f1;
      transition: transform 0.2s ease;
    }

    .info-item:hover .info-emoji {
      transform: scale(1.2);
    }

    .info-text {
      flex: 1;
    }

    .features-section {
      margin-top: 0.85rem;
    }

    .features-title {
      margin: 0 0 0.45rem 0;
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: rgba(var(--ion-text-color-rgb, 15, 23, 42), 0.65);
    }

    .features-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .feature-item {
      display: flex;
      align-items: flex-start;
      gap: 0.35rem;
    }

    .feature-bullet {
      font-size: 0.9rem;
      line-height: 1.2;
      color: #10b981;
      transition: transform 0.2s ease;
    }

    .feature-item:hover .feature-bullet {
      transform: scale(1.2);
    }

    .feature-text {
      font-size: 0.8rem;
      color: var(--ion-text-color);
      line-height: 1.35;
    }

    .product-footer {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--ion-border-color, #e5e7eb);
    }

    .apply-btn {
      width: 100%;
      height: 46px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 0.96rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }

    .apply-btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      transition: left 0.5s ease;
    }

    .apply-btn:hover::before {
      left: 100%;
    }

    .apply-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 24px rgba(99, 102, 241, 0.4);
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
    }

    .apply-btn:active {
      transform: translateY(0) scale(0.98);
    }

    .apply-btn.disabled {
      background: linear-gradient(135deg, #9ca3af, #6b7280);
      cursor: not-allowed;
      opacity: 0.7;
    }

    .apply-btn.disabled:hover {
      transform: none;
      box-shadow: none;
    }

    .btn-emoji {
      font-size: 1.1rem;
      transition: transform 0.3s ease;
    }

    .apply-btn:hover .btn-emoji {
      transform: translateX(4px);
    }

    /* ===== APPLICATION STATUS ===== */
    .application-status {
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(245, 158, 11, 0.08));
      border: 1px solid rgba(251, 191, 36, 0.25);
      border-radius: 12px;
      padding: 1rem;
      animation: fadeIn 0.4s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .status-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid rgba(251, 191, 36, 0.2);
    }

    .status-icon {
      font-size: 1.25rem;
      color: #f59e0b;
      animation: pulse 2s ease-in-out infinite;
    }

    .status-title {
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--ion-text-color);
    }

    .status-details {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .status-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.85rem;
    }

    .status-label {
      color: var(--ion-color-medium);
      font-weight: 500;
    }

    .status-badge {
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
      color: white;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      box-shadow: 0 2px 6px rgba(251, 191, 36, 0.3);
    }

    .status-value {
      color: var(--ion-text-color);
      font-weight: 600;
    }

    /* ===== DARK MODE ===== */
    body.dark .product-card,
    .dark .product-card,
    body.dark .product-skeleton,
    .dark .product-skeleton {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.1);
    }

    body.dark .empty-icon-wrapper,
    .dark .empty-icon-wrapper {
      background: rgba(255, 255, 255, 0.1);
    }

    body.dark .product-type-chip,
    .dark .product-type-chip {
      background: rgba(99, 102, 241, 0.22);
      color: rgba(196, 181, 253, 0.95);
    }

    body.dark .highlight-chip,
    .dark .highlight-chip {
      background: rgba(148, 163, 184, 0.18);
    }

    body.dark .meta-item,
    .dark .meta-item {
      color: rgba(226, 232, 240, 0.75);
    }

    body.dark .features-title,
    .dark .features-title {
      color: rgba(226, 232, 240, 0.65);
    }

    body.dark .product-footer,
    .dark .product-footer {
      border-top-color: rgba(255, 255, 255, 0.12);
    }

    body.dark .empty-state,
    .dark .empty-state {
      background: linear-gradient(145deg, rgba(59, 130, 246, 0.25) 0%, rgba(99, 102, 241, 0.18) 50%, rgba(17, 24, 39, 0.9) 100%);
      border-color: rgba(148, 163, 184, 0.25);
      box-shadow: 0 20px 40px rgba(2, 6, 23, 0.5);
    }

    body.dark .empty-title,
    .dark .empty-title {
      color: rgba(248, 250, 252, 0.95);
    }

    body.dark .empty-message,
    .dark .empty-message {
      color: rgba(226, 232, 240, 0.75);
    }

    body.dark .empty-hint,
    .dark .empty-hint {
      background: rgba(30, 64, 175, 0.55);
      color: rgba(226, 232, 240, 0.9);
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.6);
    }

    body.dark .empty-secondary,
    .dark .empty-secondary {
      color: rgba(191, 219, 254, 0.95);
    }

    body.dark .product-card.card-disabled,
    .dark .product-card.card-disabled {
      background: rgba(255, 255, 255, 0.02);
      border-color: rgba(255, 255, 255, 0.08);
    }

    body.dark .application-status,
    .dark .application-status {
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.12), rgba(245, 158, 11, 0.12));
      border-color: rgba(251, 191, 36, 0.4);
    }

    body.dark .status-header,
    .dark .status-header {
      border-bottom-color: rgba(251, 191, 36, 0.25);
    }
  `]
})
export class ApplyLoanPage implements OnInit {
  loading = signal(false);
  products = signal<LoanProduct[]>([]);
  hasPendingApplication = signal(false);
  pendingProductIds = signal<number[]>([]);
  pendingApplicationsMap = signal<Map<number, any>>(new Map()); // Store full application details
  Math = Math; // Expose Math to template

  constructor(
    private apiService: ApiService,
    public authService: AuthService,
    private router: Router,
    private location: Location,
    public themeService: ThemeService,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.loadLoanProducts();
    this.checkPendingApplications();
  }

  ionViewWillEnter() {
    // Reload products and pending applications when returning to this page
    // This ensures fresh data if admin changed product availability
    console.log('🔄 ionViewWillEnter - Reloading products and applications');
    console.log('📍 Current route:', this.router.url);
    this.loadLoanProducts();
    this.checkPendingApplications();
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  async loadLoanProducts() {
    this.loading.set(true);
    try {
      // Get current user's tenant ID
      const user = this.authService.currentUser();
      const tenantId = user?.tenant?.id;
      
      // Get current customer ID
      const customerStr = localStorage.getItem('customer');
      let customerId = 0;
      if (customerStr) {
        try {
          const customer = JSON.parse(customerStr);
          customerId = customer.id || 0;
        } catch (e) {
          console.error('Error parsing customer data:', e);
        }
      }
      
      console.log('🏢 Loading products for tenant:', tenantId);
      console.log('👤 Current customer ID:', customerId);
      
      const productsData = await this.apiService.getLoanProducts(tenantId, customerId).toPromise();
      
      console.log('📦 Raw products from API (already filtered by backend):', productsData);
      
      if (productsData && Array.isArray(productsData)) {
        console.log('📦 Total products available for this customer:', productsData.length);
        // Backend already filtered products based on customer ID and availability
        // Just map the data to our format
        const mappedProducts = productsData.map((product: any) => {
            // API now returns camelCase fields - use them directly like web version
            console.log('🔍 Mapping product:', product);
            
            const mapped = {
              id: Number(product.id),  // Ensure ID is a number
              name: product.name || 'Loan Product',
              description: product.description || '',
              minAmount: Number(product.minAmount) || 0,
              maxAmount: Number(product.maxAmount) || 0,
              interestRate: Number(product.interestRate) || 0,
              minTerm: Number(product.minTermDays) || 30,  // Store as days, convert in template
              maxTerm: Number(product.maxTermDays) || 360, // Store as days, convert in template
              processingFee: Number(product.processingFeePercent) || 0,
              platformFee: Number(product.platformFee) || 0,
              paymentFrequency: product.paymentFrequency || 'monthly',
              requirements: product.requirements || [],
              features: product.features || [],
              loanTermType: product.loanTermType || 'flexible',
              fixedTermDays: Number(product.fixedTermDays) || 90,
              interestType: this.normalizeInterestType(product),
              deductPlatformFeeInAdvance: product.deductPlatformFeeInAdvance ?? true,
              deductProcessingFeeInAdvance: product.deductProcessingFeeInAdvance ?? true,
              deductInterestInAdvance: product.deductInterestInAdvance ?? false,
              availabilityType: product.availabilityType || 'all',
              selectedCustomerIds: product.selectedCustomerIds || []
            };
            
            console.log('✅ Mapped product:', mapped);
            console.log('🔍 Product ID type:', typeof mapped.id, 'Value:', mapped.id);
            return mapped;
          });
        this.products.set(mappedProducts);
        console.log('📊 Total products loaded:', mappedProducts.length);
        console.log('📊 Product IDs:', mappedProducts.map(p => p.id));
        console.log('📊 Products available to customer:', mappedProducts.map(p => p.name));
        
        // Show message if no products available
        if (mappedProducts.length === 0 && productsData.length > 0) {
          console.log('⚠️ No products available for this customer (all products are assigned to other customers)');
        }
      }
    } catch (error) {
      console.error('Failed to load loan products:', error);
      const toast = await this.toastController.create({
        message: 'Failed to load loan products',
        duration: 3000,
        position: 'bottom',
        color: 'danger'
      });
      await toast.present();
    } finally {
      this.loading.set(false);
    }
  }

  formatCurrency(amount: number): string {
    return amount.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  formatFrequency(frequency: string): string {
    const freqMap: { [key: string]: string } = {
      'daily': 'Daily',
      'weekly': 'Weekly',
      'biweekly': 'Bi-Weekly',
      'monthly': 'Monthly'
    };
    return freqMap[frequency] || frequency;
  }

  async applyForProduct(product: LoanProduct) {
    // Check if this specific product has a pending application
    if (this.isProductPending(product.id)) {
      const toast = await this.toastController.create({
        message: 'You already have a pending application for this product. Please wait for it to be processed.',
        duration: 4000,
        position: 'bottom',
        color: 'warning'
      });
      await toast.present();
      return;
    }

    // Navigate to loan application form with product data passed via state
    this.router.navigate(['/customer/apply-loan/form'], { 
      state: { product: product }
    });
  }

  isProductPending(productId: number): boolean {
    const pending = this.pendingProductIds();
    const isPending = pending.includes(Number(productId));
    console.log(`🔍 isProductPending(${productId}) - Pending IDs:`, pending, '- Result:', isPending);
    return isPending;
  }

  getApplicationStatus(productId: number): string {
    const app = this.pendingApplicationsMap().get(Number(productId));
    if (!app) return '';
    
    const status = app.status || '';
    switch(status.toLowerCase()) {
      case 'submitted':
        return 'Pending Approval';
      case 'approved':
        return 'Approved - Awaiting Disbursement';
      case 'pending':
        return 'Pending Approval';
      case 'active':
        return 'Active Loan - Being Repaid';
      case 'disbursed':
        return 'Disbursed';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  }

  getApplicationAmount(productId: number): number {
    const app = this.pendingApplicationsMap().get(Number(productId));
    if (!app) return 0;
    
    // Try different field names (application vs loan)
    return app.amount || app.requested_amount || app.requestedAmount || 
           app.principal_amount || app.principalAmount || 0;
  }

  getApplicationDate(productId: number): string {
    const app = this.pendingApplicationsMap().get(Number(productId));
    if (!app) return '';
    
    // Try different field names
    return app.created_at || app.createdAt || app.application_date || app.applicationDate || '';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      
      // Format as MMM DD, YYYY
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch (e) {
      console.error('Error formatting date:', e);
      return '';
    }
  }

  async checkPendingApplications() {
    try {
      const user = this.authService.currentUser();
      const tenantId = user?.tenant?.id;
      
      // Get customer ID from the stored customer object
      const customerStr = localStorage.getItem('customer');
      let customerId = 0;
      if (customerStr) {
        try {
          const customer = JSON.parse(customerStr);
          customerId = customer.id || 0;
        } catch (e) {
          console.error('Error parsing customer data:', e);
        }
      }

      console.log('🔍 Checking pending - tenantId:', tenantId, 'customerId:', customerId);

      if (!tenantId || !customerId) {
        console.warn('⚠️ Missing tenant or customer ID for pending check');
        return;
      }

      // Get full applications data
      console.log('🔍 Making API call to getPendingApplications...');
      const response = await this.apiService.getPendingApplications(String(tenantId), customerId).toPromise();
      console.log('🔍 API Response - Full response:', response);
      const applications = response?.data || [];
      
      console.log('🔍 API Response - Applications:', applications);
      console.log('🔍 API Response - Applications count:', applications.length);
      console.log('🔍 API Response - Raw data:', JSON.stringify(applications, null, 2));
      
      // Build map of productId -> application/loan
      // ONLY include applications/loans that should block new applications:
      // - Applications: submitted, approved (waiting for disbursement)
      // - Loans: active (currently being repaid), disbursed (money transferred)
      // EXCLUDE: completed, rejected
      const appMap = new Map<number, any>();
      const pendingIds: number[] = [];
      
      applications.forEach((app: any) => {
        // Handle both loans and applications - they use different field names
        const productId = app.loan_product_id || app.loanProductId || app.product_id;
        let status = (app.status || '').toLowerCase();
        
        // Fix: If status is 'approved' but loan has been disbursed, update status
        if (status === 'approved' && (app.disbursement_date || app.disbursementDate || app.disbursed_at || app.disbursedAt)) {
          status = 'disbursed';
          app.status = 'disbursed'; // Update the app object
        }
        
        console.log('🔍 Processing app/loan:', {
          id: app.id,
          loanNumber: app.loan_number || app.loanNumber,
          productId,
          status: app.status,
          amount: app.amount || app.principal_amount || app.principalAmount,
          disbursementDate: app.disbursement_date || app.disbursementDate,
          rawApp: app
        });
        
        // Only include if status blocks new applications
        // submitted/approved = pending application
        // active/disbursed = loan is active or disbursed (blocks new applications)
        const shouldBlock = ['submitted', 'approved', 'active', 'disbursed', 'pending'].includes(status);
        
        console.log(`🔍 Product ${productId}, Status: ${status}, Should Block: ${shouldBlock}`);
        
        if (productId && shouldBlock) {
          appMap.set(Number(productId), app);
          pendingIds.push(Number(productId));
          console.log(`✅ Product ${productId} is BLOCKED by ${status} application/loan`);
        } else if (productId) {
          console.log(`⏭️ Product ${productId} is AVAILABLE (status: ${status})`);
        }
      });
      
      console.log('📋 Final Pending Product IDs:', pendingIds);
      console.log('📋 Applications Map:', appMap);
      
      this.pendingApplicationsMap.set(appMap);
      this.pendingProductIds.set(pendingIds);
      this.hasPendingApplication.set(pendingIds.length > 0);
      
      console.log('📋 Pending product IDs:', pendingIds);
      console.log('📋 Applications map:', appMap);
    } catch (error) {
      console.error('Error checking pending applications:', error);
      this.pendingProductIds.set([]);
      this.pendingApplicationsMap.set(new Map());
      this.hasPendingApplication.set(false);
    }
  }

  goBack() {
    // Prefer Ionic stack navigation when available, otherwise fall back to dashboard
    if (typeof window !== 'undefined' && window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigate(['/customer/dashboard']);
  }

  async refreshProducts() {
    if (this.loading()) {
      return;
    }

    await Promise.all([
      this.loadLoanProducts(),
      this.checkPendingApplications()
    ]);
  }

  goToDashboard() {
    this.router.navigate(['/customer/dashboard']);
  }

  async handleRefresh(event: any) {
    await Promise.all([
      this.loadLoanProducts(),
      this.checkPendingApplications()
    ]);
    event.target.complete();
  }

  private normalizeInterestType(product: any): string {
    const candidate = product?.interestType || product?.interestComputation || product?.interestMethod;
    return (candidate ? String(candidate) : 'flat').toLowerCase();
  }
}
