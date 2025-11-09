import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonCard,
  IonCardContent,
  IonButton,
  IonSpinner,
  IonIcon,
  ToastController,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cashOutline,
  personOutline,
  briefcaseOutline,
  mailOutline,
  lockClosedOutline,
  eyeOutline,
  eyeOffOutline,
  logInOutline,
  arrowForwardOutline
} from 'ionicons/icons';
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
    IonIcon,
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
            <ion-icon name="cash-outline" class="logo-icon"></ion-icon>
          </div>
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
                <ion-icon name="person-outline" class="toggle-icon"></ion-icon>
                Customer
              </button>
              <button
                type="button"
                class="toggle-btn"
                [class.active]="loginAsEmployee()"
                (click)="setLoginMode(true)"
                [attr.aria-pressed]="loginAsEmployee()"
              >
                <ion-icon name="briefcase-outline" class="toggle-icon"></ion-icon>
                Employee
              </button>
            </div>

            <form (ngSubmit)="onSubmit()" #loginForm="ngForm" class="form">
              <!-- Email -->
              <div class="input-group">
                <label class="input-label">
                  {{ loginAsEmployee() ? 'Email' : 'Email or Phone' }}
                </label>
                <div class="input-wrapper">
                  <ion-icon name="mail-outline" class="input-icon"></ion-icon>
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
                <label class="input-label">Password</label>
                <div class="input-wrapper">
                  <ion-icon name="lock-closed-outline" class="input-icon"></ion-icon>
                  <input
                    [type]="showPassword() ? 'text' : 'password'"
                    class="custom-input"
                    placeholder="Enter password"
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
                    <ion-icon [name]="showPassword() ? 'eye-off-outline' : 'eye-outline'"></ion-icon>
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
                <ion-icon name="log-in-outline" *ngIf="!loading()"></ion-icon>
                <span *ngIf="!loading()">Sign In</span>
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
                  <ion-icon name="arrow-forward-outline" class="card-arrow"></ion-icon>
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
        rgba(var(--ion-color-primary-rgb), 0.16),
        rgba(var(--ion-color-secondary-rgb), 0.12),
        var(--ion-background-color));
      position: relative;
      overflow: hidden;
    }

    .blob {
      position: absolute;
      border-radius: 9999px;
      filter: blur(80px);
      pointer-events: none;
      z-index: 0;
      animation: float 6s ease-in-out infinite;
    }
    .blob-primary { width: 24rem; height: 24rem; background: rgba(var(--ion-color-primary-rgb), 0.18); top: -6rem; left: -6rem; }
    .blob-secondary { width: 24rem; height: 24rem; background: rgba(var(--ion-color-tertiary-rgb), 0.18); bottom: -6rem; right: -6rem; animation-delay: -3s; }
    .blob-tertiary { width: 24rem; height: 24rem; background: rgba(var(--ion-color-secondary-rgb), 0.12); top: 50%; left: 50%; transform: translate(-50%, -50%); animation-delay: -1.5s; }

    @keyframes float {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-20px) rotate(5deg); }
    }

    .login-container { position: relative; z-index: 1; max-width: 480px; margin: 0 auto; padding: 1rem; display: flex; flex-direction: column; min-height: 100dvh; }

    .floating-dev-info { position: fixed; top: 16px; left: 16px; z-index: 1000; }

    /* Hero */
    .hero-section { text-align: center; margin: 2rem 0; }
    .logo-circle { width: 100px; height: 100px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 50%; margin: 0 auto 1.5rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3); animation: float 3s ease-in-out infinite; }
    .logo-icon { width: 48px; height: 48px; color: white; }

    /* Toggle */
    .login-type-toggle { display: flex; gap: 0.5rem; margin-bottom: 2rem; padding: 0.35rem; background: rgba(148, 163, 184, 0.12); border-radius: 14px; }
    .toggle-btn { flex: 1; padding: 0.85rem; border: none; background: transparent; color: var(--ion-color-medium); font-weight: 600; border-radius: 11px; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: all 0.3s; }
    .toggle-icon { width: 20px; height: 20px; }
    .toggle-btn.active { background: linear-gradient(135deg, #667eea, #764ba2); color: white; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.35); }
    .toggle-btn:hover:not(.active) { background: rgba(102, 126, 234, 0.08); }

    /* Inputs */
    .input-group { margin-bottom: 1.5rem; }
    .input-label { display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; }
    .input-wrapper { position: relative; }
    .input-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); width: 20px; height: 20px; color: var(--ion-color-medium); }
    .custom-input { width: 100%; padding: 0.85rem 1rem 0.85rem 3rem; border: 2px solid rgba(148, 163, 184, 0.2); border-radius: 12px; background: var(--ion-item-background); font-size: 1rem; transition: all 0.3s; }
    .custom-input:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.12); }

    .password-toggle { position: absolute; right: 1rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 0.5rem; }
    .password-toggle ion-icon { width: 20px; height: 20px; color: var(--ion-color-medium); }

    /* Button */
    .login-button { --border-radius: 12px; --background: linear-gradient(135deg, #667eea, #764ba2); margin-top: 0.75rem; height: 56px; font-weight: 600; }
    .login-button:hover { --box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4); transform: translateY(-2px); }

    /* Register */
    .register-link { text-align: center; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid rgba(148, 163, 184, 0.2); font-size: 0.9rem; }
    .link-action { color: #667eea; font-weight: 600; text-decoration: none; margin-left: 0.25rem; position: relative; }
    .link-action::after { content: ''; position: absolute; bottom: -2px; left: 0; width: 0; height: 2px; background: linear-gradient(135deg, #667eea, #764ba2); transition: width 0.3s; }
    .link-action:hover::after { width: 100%; }

    /* Quick Login */
    .divider { text-align: center; margin: 2rem 0 1.5rem; position: relative; }
    .divider::before { content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: var(--ion-border-color); }
    .divider-text { background: var(--ion-background-color); padding: 0 1rem; font-size: 0.875rem; color: var(--ion-color-medium); font-weight: 500; }

    .quick-login-grid { display: flex; gap: 0.75rem; overflow-x: auto; padding-bottom: 0.5rem; scroll-snap-type: x mandatory; }
    .quick-login-grid::-webkit-scrollbar { height: 6px; }
    .quick-login-grid::-webkit-scrollbar-thumb { background: rgba(var(--ion-color-medium-rgb), 0.3); border-radius: 3px; }

    .quick-login-card { min-width: 280px; padding: 1rem; border-radius: 12px; cursor: pointer; border: 2px solid transparent; transition: all 0.3s; scroll-snap-align: start; }
    .quick-login-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1); }
    .customer-card { border-color: var(--ion-color-success); background: rgba(45, 211, 111, 0.05); }
    .employee-card { border-color: var(--ion-color-primary); background: rgba(56, 128, 255, 0.05); }
    .customer-card:hover { background: rgba(45, 211, 111, 0.1); }
    .employee-card:hover { background: rgba(56, 128, 255, 0.1); }

    .quick-card-content { display: flex; align-items: center; gap: 1rem; }
    .user-avatar { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; }
    .customer-avatar { background: linear-gradient(135deg, #2dd36f, #1ab759); }
    .employee-avatar { background: linear-gradient(135deg, #3880ff, #2563eb); }
    .card-arrow { width: 20px; height: 20px; color: var(--ion-color-medium); transition: transform 0.3s; }
    .quick-login-card:hover .card-arrow { transform: translateX(4px); }

    /* Footer */
    .login-footer { margin-top: auto; text-align: center; padding: 1.5rem 0; }
    .footer-text { font-size: 0.8rem; color: var(--ion-color-medium); }

    /* Dark Mode */
    .dark .login-content { --background: linear-gradient(170deg, rgba(var(--ion-color-primary-rgb), 0.32), rgba(var(--ion-color-secondary-rgb), 0.28), rgba(15, 23, 42, 0.85)); }
    .dark .custom-input { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.12); }
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
    addIcons({
      cashOutline,
      personOutline,
      briefcaseOutline,
      mailOutline,
      lockClosedOutline,
      eyeOutline,
      eyeOffOutline,
      logInOutline,
      arrowForwardOutline
    });
    
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