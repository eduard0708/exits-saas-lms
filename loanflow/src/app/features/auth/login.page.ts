import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonContent, IonCard, IonCardContent, IonButton, IonSpinner, ToastController, AlertController } from '@ionic/angular/standalone';
import { AuthService, User } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { HeaderUtilsComponent } from '../../shared/components/header-utils.component';

interface TestUser {
  email: string;
  password: string;
  name: string;
  role: string;
  initials: string;
  type: 'customer' | 'employee';
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonCard,
    IonCardContent,
    IonButton,
    IonSpinner,
    HeaderUtilsComponent,
  ],
  template: `
    <ion-content class="login-content">
      <div class="floating-dev-info">
        <app-header-utils />
      </div>

      <div class="login-container">
        <!-- Floating Blobs -->
        <div class="blob blob-primary"></div>
        <div class="blob blob-secondary"></div>
        <div class="blob blob-tertiary"></div>

        <!-- Logo -->
        <div class="hero-section">
          <div class="logo-circle">
            <span class="logo-icon">💰</span>
          </div>
          <h1 class="welcome-text">Welcome Back</h1>
          <p class="welcome-subtext">Sign in to continue to LoanFlow</p>
        </div>

        <!-- Login Card -->
        <ion-card class="login-card">
          <ion-card-content class="card-content">
            <!-- Toggle -->
            <div class="login-type-toggle">
              <button
                type="button"
                class="toggle-btn"
                [class.active]="!loginAsEmployee()"
                (click)="setLoginMode(false)"
                [attr.aria-pressed]="!loginAsEmployee()"
              >
                <span class="toggle-icon">👤</span>
                <span>Customer</span>
              </button>
              <button
                type="button"
                class="toggle-btn"
                [class.active]="loginAsEmployee()"
                (click)="setLoginMode(true)"
                [attr.aria-pressed]="loginAsEmployee()"
              >
                <span class="toggle-icon">💼</span>
                <span>Employee</span>
              </button>
            </div>

            <form (ngSubmit)="onSubmit()" #loginForm="ngForm" class="form">
              <!-- Email -->
              <div class="input-group">
                <label class="input-label">
                  <span class="label-icon">✉️</span>
                  {{ loginAsEmployee() ? 'Email' : 'Email or Phone' }}
                </label>
                <div class="input-wrapper">
                  <span class="input-icon">✉️</span>
                  <input
                    type="{{ loginAsEmployee() ? 'email' : 'text' }}"
                    class="custom-input"
                    [placeholder]="loginAsEmployee() ? 'employee@company.com' : 'email@domain.com or +639...'"
                    [(ngModel)]="email"
                    name="email"
                    required
                    autocomplete="username"
                    #emailInput="ngModel"
                  />
                </div>
              </div>

              <!-- Password -->
              <div class="input-group">
                <label class="input-label">
                  <span class="label-icon">🔒</span>
                  Password
                </label>
                <div class="input-wrapper">
                  <span class="input-icon">🔒</span>
                  <input
                    [type]="showPassword() ? 'text' : 'password'"
                    class="custom-input"
                    placeholder="Enter your password"
                    [(ngModel)]="password"
                    name="password"
                    required
                    autocomplete="current-password"
                  />
                  <button
                    type="button"
                    class="password-toggle"
                    (click)="togglePassword()"
                    [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                  >
                    <span class="toggle-eye">{{ showPassword() ? '🙈' : '👁️' }}</span>
                  </button>
                </div>
              </div>

              <!-- Submit -->
              <ion-button
                expand="block"
                size="large"
                [disabled]="loading() || !loginForm.valid"
                class="login-button"
                (click)="onSubmit()"
              >
                <ion-spinner name="crescent" *ngIf="loading()"></ion-spinner>
                <span *ngIf="!loading()" class="button-content">
                  <span class="button-icon">🔐</span>
                  <span>Sign In</span>
                </span>
                <span *ngIf="loading()">Signing in...</span>
              </ion-button>
            </form>

            <div class="register-link">
              <span>Don't have an account?</span>
              <a [routerLink]="['/register']" class="link-action">Sign Up</a>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Dev Quick Login -->
        @if (isDevMode()) {
          <div class="divider">
            <span class="divider-text">Quick Login (Dev Only)</span>
          </div>

          <div class="quick-login-grid">
            @for (user of testUsers; track user.email) {
              <div
                class="quick-login-card"
                [class.customer-card]="user.type === 'customer'"
                [class.employee-card]="user.type === 'employee'"
                (click)="quickLogin(user)"
                role="button"
                tabindex="0"
                (keydown.enter)="quickLogin(user)"
                [attr.aria-label]="'Login as ' + user.name"
              >
                <div class="quick-card-content">
                  <div class="user-avatar" [class.customer-avatar]="user.type === 'customer'" [class.employee-avatar]="user.type === 'employee'">
                    {{ user.initials }}
                  </div>
                  <div class="user-info">
                    <p class="user-name">{{ user.name }}</p>
                    <p class="user-role">{{ user.role }}</p>
                  </div>
                  <span class="card-arrow">➡️</span>
                </div>
              </div>
            }
          </div>
        }

        <!-- Footer -->
        <div class="login-footer">
          <p class="footer-text">© {{ year }} LoanFlow. All rights reserved.</p>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    :host { display: block; }

    /* Background & Blobs */
    .login-content {
      --background: linear-gradient(165deg,
        rgba(var(--ion-color-primary-rgb), 0.08),
        rgba(var(--ion-color-secondary-rgb), 0.06),
        var(--ion-background-color));
      position: relative;
      overflow: hidden;
    }

    .blob {
      position: absolute;
      border-radius: 9999px;
      filter: blur(100px);
      pointer-events: none;
      z-index: 0;
      animation: float 8s ease-in-out infinite;
      opacity: 0.6;
    }
    .blob-primary { width: 28rem; height: 28rem; background: linear-gradient(135deg, rgba(var(--ion-color-primary-rgb), 0.3), rgba(var(--ion-color-tertiary-rgb), 0.2)); top: -8rem; left: -8rem; }
    .blob-secondary { width: 26rem; height: 26rem; background: linear-gradient(135deg, rgba(var(--ion-color-secondary-rgb), 0.25), rgba(var(--ion-color-success-rgb), 0.15)); bottom: -8rem; right: -8rem; animation-delay: -4s; }
    .blob-tertiary { width: 24rem; height: 24rem; background: linear-gradient(135deg, rgba(var(--ion-color-tertiary-rgb), 0.2), rgba(var(--ion-color-primary-rgb), 0.15)); top: 50%; left: 50%; transform: translate(-50%, -50%); animation-delay: -2s; }

    @keyframes float {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(30px, -30px) scale(1.05); }
      66% { transform: translate(-20px, 20px) scale(0.95); }
    }

    .login-container { position: relative; z-index: 1; max-width: 480px; margin: 0 auto; padding: 1rem; display: flex; flex-direction: column; min-height: 100dvh; }

    .floating-dev-info { position: fixed; top: 16px; left: 16px; z-index: 1000; }

    /* Hero */
    .hero-section { text-align: center; margin: 3rem 0 2.5rem; }
    .logo-circle { 
      width: 120px; 
      height: 120px; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      border-radius: 30px; 
      margin: 0 auto 1.5rem; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      box-shadow: 0 20px 60px rgba(102, 126, 234, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
      animation: float 4s ease-in-out infinite;
      backdrop-filter: blur(10px);
      position: relative;
      overflow: hidden;
    }
    .logo-circle::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
      animation: shimmer 3s infinite;
    }
    @keyframes shimmer {
      0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
      100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
    }
    .logo-icon { 
      font-size: 64px;
      line-height: 1;
      filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
      animation: bounce 2s ease-in-out infinite;
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    .welcome-text { 
      font-size: 2rem; 
      font-weight: 700; 
      margin: 0 0 0.5rem; 
      background: linear-gradient(135deg, #667eea, #764ba2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .welcome-subtext { 
      font-size: 0.95rem; 
      color: var(--ion-color-medium); 
      margin: 0; 
      font-weight: 400;
    }

    /* Card */
    .login-card {
      backdrop-filter: blur(20px);
      background: rgba(var(--ion-background-color-rgb, 255, 255, 255), 0.7);
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
      border-radius: 24px;
    }

    /* Toggle */
    .login-type-toggle { 
      display: flex; 
      gap: 0.5rem; 
      margin-bottom: 2rem; 
      padding: 0.4rem; 
      background: rgba(148, 163, 184, 0.08);
      backdrop-filter: blur(10px);
      border-radius: 16px; 
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
    }
    .toggle-btn { 
      flex: 1; 
      padding: 1rem; 
      border: none; 
      background: transparent; 
      color: var(--ion-color-medium); 
      font-weight: 600; 
      font-size: 0.95rem;
      border-radius: 12px; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      gap: 0.65rem; 
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      position: relative;
    }
    .toggle-icon { 
      font-size: 24px;
      line-height: 1;
      transition: transform 0.3s;
    }
    .toggle-btn.active { 
      background: linear-gradient(135deg, #667eea, #764ba2); 
      color: white; 
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2) inset;
      transform: scale(1.02);
    }
    .toggle-btn.active .toggle-icon { transform: scale(1.1); }
    .toggle-btn:hover:not(.active) { 
      background: rgba(102, 126, 234, 0.1); 
      transform: translateY(-2px);
    }

    /* Inputs */
    .input-group { margin-bottom: 1.75rem; }
    .input-label { 
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem; 
      font-weight: 600; 
      margin-bottom: 0.65rem;
      color: var(--ion-text-color);
    }
    .label-icon { 
      font-size: 20px;
      line-height: 1;
      filter: grayscale(0.2);
    }
    .input-wrapper { position: relative; }
    .input-icon { 
      position: absolute; 
      left: 1.1rem; 
      top: 50%; 
      transform: translateY(-50%); 
      font-size: 22px;
      line-height: 1;
      opacity: 0.7;
      transition: all 0.3s;
    }
    .custom-input { 
      width: 100%; 
      padding: 1rem 1rem 1rem 3.25rem; 
      border: 2px solid rgba(148, 163, 184, 0.15); 
      border-radius: 14px; 
      background: rgba(var(--ion-background-color-rgb, 255, 255, 255), 0.6);
      backdrop-filter: blur(10px);
      font-size: 1rem; 
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }
    .custom-input:focus { 
      outline: none; 
      border-color: #667eea; 
      background: rgba(var(--ion-background-color-rgb, 255, 255, 255), 0.9);
      box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.12), 0 8px 24px rgba(102, 126, 234, 0.15);
      transform: translateY(-2px);
    }
    .input-wrapper:focus-within .input-icon { 
      opacity: 1;
      transform: translateY(-50%) scale(1.15);
      filter: grayscale(0);
    }

    .password-toggle { 
      position: absolute; 
      right: 1rem; 
      top: 50%; 
      transform: translateY(-50%); 
      background: rgba(148, 163, 184, 0.1);
      border: none; 
      cursor: pointer; 
      padding: 0.5rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s;
    }
    .password-toggle:hover { 
      background: rgba(102, 126, 234, 0.15);
      transform: translateY(-50%) scale(1.1);
    }
    .password-toggle ion-icon { 
      font-size: 20px;
      color: var(--ion-color-medium);
      transition: color 0.3s;
    }
    .toggle-eye {
      font-size: 22px;
      line-height: 1;
      transition: transform 0.3s;
    }
    .password-toggle:hover .toggle-eye { 
      transform: scale(1.2);
    }

    /* Button */
    .login-button { 
      --border-radius: 14px; 
      --background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      --box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
      margin-top: 1rem; 
      height: 58px; 
      font-weight: 600;
      font-size: 1.05rem;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }
    .login-button::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      transition: left 0.5s;
    }
    .login-button:hover { 
      --box-shadow: 0 12px 32px rgba(102, 126, 234, 0.5);
      transform: translateY(-3px) scale(1.02);
    }
    .login-button:hover::before { left: 100%; }
    .login-button:active { transform: translateY(-1px) scale(0.98); }
    .button-content {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      justify-content: center;
    }
    .button-icon {
      font-size: 20px;
      line-height: 1;
      animation: shake 0.5s ease-in-out infinite;
    }
    @keyframes shake {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(-5deg); }
      75% { transform: rotate(5deg); }
    }
    .login-button:hover .button-icon {
      animation: shake 0.3s ease-in-out infinite;
    }

    /* Register */
    .register-link { 
      text-align: center; 
      margin-top: 2rem; 
      padding-top: 1.5rem; 
      border-top: 1px solid rgba(148, 163, 184, 0.15); 
      font-size: 0.95rem;
      color: var(--ion-color-medium);
    }
    .link-action { 
      color: #667eea; 
      font-weight: 600; 
      text-decoration: none; 
      margin-left: 0.35rem; 
      position: relative;
      transition: color 0.3s;
    }
    .link-action::after { 
      content: ''; 
      position: absolute; 
      bottom: -2px; 
      left: 0; 
      width: 0; 
      height: 2px; 
      background: linear-gradient(135deg, #667eea, #764ba2); 
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .link-action:hover { color: #764ba2; }
    .link-action:hover::after { width: 100%; }

    /* Quick Login */
    .divider { text-align: center; margin: 2rem 0 1.5rem; position: relative; }
    .divider::before { content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: var(--ion-border-color); }
    .divider-text { background: var(--ion-background-color); padding: 0 1rem; font-size: 0.875rem; color: var(--ion-color-medium); font-weight: 500; position: relative; }

    .quick-login-grid { display: flex; gap: 0.75rem; overflow-x: auto; padding-bottom: 0.5rem; scroll-snap-type: x mandatory; }
    .quick-login-grid::-webkit-scrollbar { height: 6px; }
    .quick-login-grid::-webkit-scrollbar-thumb { background: rgba(var(--ion-color-medium-rgb), 0.3); border-radius: 3px; }

    .quick-login-card { 
      min-width: 280px; 
      padding: 1.25rem; 
      border-radius: 16px; 
      cursor: pointer; 
      border: 2px solid transparent; 
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      scroll-snap-align: start;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .quick-login-card:hover { 
      transform: translateY(-4px) scale(1.02); 
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
    }
    .customer-card { 
      border-color: rgba(45, 211, 111, 0.3);
      background: linear-gradient(135deg, rgba(45, 211, 111, 0.08), rgba(45, 211, 111, 0.04));
    }
    .employee-card { 
      border-color: rgba(102, 126, 234, 0.3);
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.08), rgba(102, 126, 234, 0.04));
    }
    .customer-card:hover { 
      background: linear-gradient(135deg, rgba(45, 211, 111, 0.15), rgba(45, 211, 111, 0.08));
      border-color: rgba(45, 211, 111, 0.5);
    }
    .employee-card:hover { 
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(102, 126, 234, 0.08));
      border-color: rgba(102, 126, 234, 0.5);
    }

    .quick-card-content { display: flex; align-items: center; gap: 1.25rem; }
    .user-avatar { 
      width: 52px; 
      height: 52px; 
      border-radius: 50%; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      color: white; 
      font-weight: 700;
      font-size: 1.1rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: transform 0.3s;
    }
    .quick-login-card:hover .user-avatar { transform: scale(1.1) rotate(5deg); }
    .customer-avatar { background: linear-gradient(135deg, #2dd36f, #1ab759); }
    .employee-avatar { background: linear-gradient(135deg, #667eea, #764ba2); }
    .user-info { flex: 1; }
    .user-name { margin: 0; font-weight: 600; font-size: 1rem; }
    .user-role { margin: 0.25rem 0 0; font-size: 0.85rem; color: var(--ion-color-medium); }
    .card-arrow { 
      font-size: 24px;
      line-height: 1;
      opacity: 0.6;
      transition: all 0.3s;
    }
    .quick-login-card:hover .card-arrow { 
      transform: translateX(8px) scale(1.2);
      opacity: 1;
    }

    /* Footer */
    .login-footer { margin-top: auto; text-align: center; padding: 1.5rem 0; }
    .footer-text { font-size: 0.8rem; color: var(--ion-color-medium); }

    /* Dark Mode */
    .dark .login-content { 
      --background: linear-gradient(170deg, rgba(var(--ion-color-primary-rgb), 0.2), rgba(var(--ion-color-secondary-rgb), 0.15), rgba(15, 23, 42, 0.95)); 
    }
    .dark .custom-input { 
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.12);
    }
    .dark .custom-input:focus {
      background: rgba(255, 255, 255, 0.12);
    }
    .dark .login-card {
      background: rgba(30, 41, 59, 0.6);
      border-color: rgba(255, 255, 255, 0.1);
    }
    .dark .logo-circle {
      box-shadow: 0 20px 60px rgba(102, 126, 234, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.15) inset;
    }
  `],
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  public theme = inject(ThemeService);

  // Reactive state
  email = signal('');
  password = signal('');
  loading = signal(false);
  loginAsEmployee = signal(false);
  showPassword = signal(false);
  year = new Date().getFullYear();

  isDevMode = signal(this.isDev());

  testUsers: TestUser[] = [
    { email: 'customer1@acme.com', password: 'Admin@123', name: 'Maria Santos', role: 'Customer (ACME)', initials: 'MS', type: 'customer' },
    { email: 'customer1@techstart.com', password: 'Admin@123', name: 'Juan Dela Cruz', role: 'Customer (TechStart)', initials: 'JD', type: 'customer' },
    { email: 'employee1@acme.com', password: 'Admin@123', name: 'Employee1 ACME', role: 'Loan Officer', initials: 'E1', type: 'employee' },
    { email: 'employee1@techstart.com', password: 'Admin@123', name: 'Employee1 TechStart', role: 'Loan Officer', initials: 'E1', type: 'employee' },
  ];

  constructor() {
    effect(() => {
      if (this.loginAsEmployee()) {
        this.email.set('');
        this.password.set('');
      }
    });
  }

  setLoginMode(isEmployee: boolean) {
    this.loginAsEmployee.set(isEmployee);
  }

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  async onSubmit() {
    const email = this.email().trim();
    const password = this.password();
    if (!email || !password) return;

    this.loading.set(true);
    try {
      const login = this.loginAsEmployee()
        ? this.auth.loginAsStaff(email, password)
        : this.auth.loginAsCustomer(email, password);

      await login.toPromise();
      const user = this.auth.currentUser();
      const role = user?.role?.toLowerCase();

      if (role === 'customer' && user?.profileComplete === false) {
        await this.router.navigate(['/customer/profile']);
        setTimeout(() => this.showProfileAlert(), 500);
        return;
      }

      const route = ['collector', 'employee'].includes(role!) ? '/collector/dashboard' : '/customer/dashboard';
      await this.router.navigate([route]);
    } catch (err: any) {
      this.showToast(err?.message || 'Invalid credentials', 'danger');
    } finally {
      this.loading.set(false);
    }
  }

  quickLogin(user: TestUser) {
    // Remove focus to prevent aria-hidden accessibility warning
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this.email.set(user.email);
    this.password.set(user.password);
    this.loginAsEmployee.set(user.type === 'employee');
    this.onSubmit();
  }

  private async showProfileAlert() {
    const alert = await this.alertCtrl.create({
      header: 'Complete Your Profile',
      message: 'Name and phone are required.',
      buttons: ['OK'],
      backdropDismiss: false,
    });
    await alert.present();
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ message, color, duration: 3000, position: 'top' });
    await toast.present();
  }

  private isDev(): boolean {
    return location.hostname === 'localhost' || !!(window as any).__env?.production === false;
  }
}
