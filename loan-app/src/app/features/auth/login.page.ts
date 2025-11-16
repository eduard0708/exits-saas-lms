import { Component, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import {
  IonContent,
  IonSpinner,
  ToastController,
  AlertController,
} from '@ionic/angular/standalone';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService, User } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { HeaderUtilsComponent } from '../../shared/components/header-utils.component';
import { FormInputComponent } from '../../components/form-input/form-input.component';
import { BalancedCardComponent } from '../../components/balanced-card/balanced-card.component';
import { GlassCardComponent } from '../../components/glass-card/glass-card.component';
import { FabComponent } from '../../components/fab/fab.component';

interface TestUser {
  email: string;
  password: string;
  name: string;
  role: string;
  initials: string;
  bgClass: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonSpinner,
    HeaderUtilsComponent,
    FormInputComponent,
    BalancedCardComponent,
    GlassCardComponent,
    FabComponent,
    LucideAngularModule,
  ],
  template: `
    <ion-content class="min-h-full bg-gradient-to-br from-base-200 via-base-100 to-base-300/50">
      <!-- Animated background elements -->
      <div class="pointer-events-none fixed inset-0 overflow-hidden">
        <div class="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl animate-pulse"></div>
        <div class="absolute top-1/2 -left-32 h-80 w-80 rounded-full bg-accent/10 blur-3xl animate-pulse" style="animation-delay: 1s;"></div>
        <div class="absolute bottom-20 right-20 h-64 w-64 rounded-full bg-secondary/10 blur-3xl animate-pulse" style="animation-delay: 2s;"></div>
      </div>

      <div class="absolute top-4 left-4 z-20">
        <app-header-utils [showLogout]="false" />
      </div>

      <div class="relative mx-auto flex min-h-full w-full max-w-md flex-col items-stretch px-4 pb-10 pt-20 sm:px-6">
        <!-- Welcome Header -->
        <div class="mb-8 text-center">
          <div class="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/30">
            <lucide-icon name="landmark" class="h-8 w-8 text-primary-content"></lucide-icon>
          </div>
          <h1 class="mb-2 text-3xl font-bold tracking-tight text-base-content">Welcome Back</h1>
          <p class="text-sm text-base-content/60">Sign in to continue to LoanFlow</p>
        </div>

        <!-- Login Form -->
        <app-glass-card class="mb-6 bg-base-100/90 backdrop-blur-xl">
          <!-- Account Type Selector -->
          <div class="mb-6">
            <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-base-content/50">Select Account Type</p>
            <div class="grid grid-cols-2 gap-3">
              <button
                type="button"
                class="group relative overflow-hidden rounded-2xl border-2 p-4 transition-all duration-200"
                [class.border-primary]="!loginAsEmployee()"
                [class.bg-primary/5]="!loginAsEmployee()"
                [class.border-base-300]="loginAsEmployee()"
                [class.hover:border-primary/50]="loginAsEmployee()"
                (click)="setLoginMode(false)"
                [attr.aria-pressed]="!loginAsEmployee()"
              >
                <div class="relative z-10 flex flex-col items-center gap-2">
                  <div class="flex h-12 w-12 items-center justify-center rounded-xl transition-colors"
                       [class.bg-primary]="!loginAsEmployee()"
                       [class.text-primary-content]="!loginAsEmployee()"
                       [class.bg-base-200]="loginAsEmployee()"
                       [class.text-base-content/70]="loginAsEmployee()">
                    <lucide-icon name="user" class="h-6 w-6"></lucide-icon>
                  </div>
                  <span class="text-sm font-semibold transition-colors"
                        [class.text-primary]="!loginAsEmployee()"
                        [class.text-base-content]="loginAsEmployee()">Customer</span>
                </div>
              </button>
              <button
                type="button"
                class="group relative overflow-hidden rounded-2xl border-2 p-4 transition-all duration-200"
                [class.border-primary]="loginAsEmployee()"
                [class.bg-primary/5]="loginAsEmployee()"
                [class.border-base-300]="!loginAsEmployee()"
                [class.hover:border-primary/50]="!loginAsEmployee()"
                (click)="setLoginMode(true)"
                [attr.aria-pressed]="loginAsEmployee()"
              >
                <div class="relative z-10 flex flex-col items-center gap-2">
                  <div class="flex h-12 w-12 items-center justify-center rounded-xl transition-colors"
                       [class.bg-primary]="loginAsEmployee()"
                       [class.text-primary-content]="loginAsEmployee()"
                       [class.bg-base-200]="!loginAsEmployee()"
                       [class.text-base-content/70]="!loginAsEmployee()">
                    <lucide-icon name="briefcase" class="h-6 w-6"></lucide-icon>
                  </div>
                  <span class="text-sm font-semibold transition-colors"
                        [class.text-primary]="loginAsEmployee()"
                        [class.text-base-content]="!loginAsEmployee()">Employee</span>
                </div>
              </button>
            </div>
          </div>

          <!-- Login Form -->
          <form (ngSubmit)="onSubmit()" #loginForm="ngForm" class="space-y-5">
            <app-form-input
              name="email"
              [label]="loginAsEmployee() ? 'Email Address' : 'Email or Phone'"
              [type]="loginAsEmployee() ? 'email' : 'text'"
              icon="mail"
              [autocomplete]="loginAsEmployee() ? 'email' : 'username'"
              [inputmode]="loginAsEmployee() ? 'email' : 'text'"
              [(ngModel)]="email"
              [required]="true"
              [placeholder]="loginAsEmployee() ? 'employee@company.com' : 'email@domain.com or +639...'"
            ></app-form-input>

            <div class="relative">
              <app-form-input
                name="password"
                label="Password"
                [type]="showPassword() ? 'text' : 'password'"
                icon="lock"
                autocomplete="current-password"
                [(ngModel)]="password"
                [required]="true"
                [placeholder]="'Enter your password'"
              ></app-form-input>
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-base-content/60 transition-all hover:bg-base-200/50 hover:text-base-content focus:outline-none focus:ring-2 focus:ring-primary/50"
                (click)="togglePassword()"
                [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
              >
                <lucide-icon [name]="showPassword() ? 'eye-off' : 'eye'" class="h-5 w-5"></lucide-icon>
              </button>
            </div>

            <div class="flex items-center justify-between text-sm">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" class="checkbox checkbox-primary checkbox-sm" />
                <span class="text-base-content/70">Remember me</span>
              </label>
              <a [routerLink]="['/forgot-password']" class="font-medium text-primary hover:text-primary/80 transition-colors">Forgot password?</a>
            </div>

            <button
              type="submit"
              class="btn btn-primary btn-lg w-full h-14 text-base font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-200"
              [disabled]="loading() || !loginForm.valid"
              [attr.aria-busy]="loading()"
            >
              <ion-spinner name="crescent" *ngIf="loading()" class="h-5 w-5"></ion-spinner>
              <span *ngIf="!loading()" class="flex items-center gap-2">
                <lucide-icon name="log-in" class="h-5 w-5"></lucide-icon>
                Sign In
              </span>
            </button>
          </form>

          <!-- Register Link -->
          <div class="mt-6 text-center">
            <p class="text-sm text-base-content/70">
              Don't have an account?
              <a [routerLink]="['/register']" class="ml-1 font-semibold text-primary hover:text-primary/80 transition-colors">Create Account</a>
            </p>
          </div>
        </app-glass-card>

        <!-- Dev Shortcuts (Only in dev) -->
        @if (isDevMode()) {
          <app-glass-card class="mb-6 bg-base-100/90 backdrop-blur-xl">
            <div class="mb-4 flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
                <lucide-icon name="zap" class="h-5 w-5 text-warning"></lucide-icon>
              </div>
              <div>
                <p class="text-sm font-semibold text-base-content">Quick Login</p>
                <p class="text-xs text-base-content/60">Developer test accounts</p>
              </div>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              @for (user of testUsers; track user.email) {
                <button
                  type="button"
                  class="group relative overflow-hidden rounded-2xl border-2 border-base-300/50 bg-base-100 p-4 text-left transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  (click)="quickLogin(user)"
                  [attr.aria-label]="'Login as ' + user.name"
                >
                  <div class="flex items-center gap-3">
                    <div [class]="user.bgClass + ' flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold text-white shadow-md'">
                      {{ user.initials }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-semibold text-base-content truncate">{{ user.name }}</p>
                      <p class="text-xs text-base-content/60 truncate">{{ user.role }}</p>
                    </div>
                    <lucide-icon name="arrow-right" class="h-5 w-5 flex-shrink-0 text-base-content/40 transition-all duration-200 group-hover:translate-x-1 group-hover:text-primary"></lucide-icon>
                  </div>
                </button>
              }
            </div>
          </app-glass-card>
        }

        <!-- Footer -->
        <div class="mt-auto pt-8 pb-4">
          <div class="flex flex-col items-center gap-4 text-center">
            <div class="flex items-center gap-6 text-xs text-base-content/50">
              <div class="flex items-center gap-2">
                <lucide-icon name="shield-check" class="h-4 w-4"></lucide-icon>
                <span>Secure</span>
              </div>
              <div class="flex items-center gap-2">
                <lucide-icon name="zap" class="h-4 w-4"></lucide-icon>
                <span>Fast</span>
              </div>
              <div class="flex items-center gap-2">
                <lucide-icon name="smartphone" class="h-4 w-4"></lucide-icon>
                <span>Optimized</span>
              </div>
            </div>
            <p class="text-xs text-base-content/40">© {{ currentYear }} LoanFlow. All rights reserved.</p>
          </div>
        </div>
      </div>

      <app-fab (clickFab)="openSupport()"></app-fab>
    </ion-content>
  `,
  styles: [``],
})
export class LoginPage {
  private authService = inject(AuthService);
  private router = inject(Router);
  private alertController = inject(AlertController);
  public themeService = inject(ThemeService);

  // Signals for reactivity
  email = signal('');
  password = signal('');
  loading = signal(false);
  loginAsEmployee = signal(false);
  showPassword = signal(false);

  currentYear = new Date().getFullYear();

  // Computed
  isDevMode = signal(this.isDevelopmentEnvironment());

  // Test users (only in dev)
  testUsers: TestUser[] = [
    {
      email: 'customer1@acme.com',
      password: 'Admin@123',
      name: 'Maria Santos',
      role: 'Customer (ACME)',
      initials: 'MS',
      bgClass: 'bg-emerald-500',
    },
    {
      email: 'customer1@techstart.com',
      password: 'Admin@123',
      name: 'Juan Dela Cruz',
      role: 'Customer (TechStart)',
      initials: 'JD',
      bgClass: 'bg-emerald-500',
    },
    {
      email: 'employee1@acme.com',
      password: 'Admin@123',
      name: 'Employee1 ACME',
      role: 'Loan Officer',
      initials: 'E1',
      bgClass: 'bg-primary',
    },
    {
      email: 'employee1@techstart.com',
      password: 'Admin@123',
      name: 'Employee1 TechStart',
      role: 'Loan Officer',
      initials: 'E1',
      bgClass: 'bg-primary',
    },
  ];

  constructor() {
    // Reset form on mode change
    effect(() => {
      if (this.loginAsEmployee()) {
        this.email.set('');
        this.password.set('');
      }
    });
  }

  setLoginMode(employee: boolean): void {
    this.loginAsEmployee.set(employee);
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  async onSubmit(): Promise<void> {
    const email = this.email().trim();
    const password = this.password();

    if (!email || !password) return;

    this.loading.set(true);
    try {
      const loginPromise = this.loginAsEmployee()
        ? this.authService.loginAsStaff(email, password).toPromise()
        : this.authService.loginAsCustomer(email, password).toPromise();

      await loginPromise;

      const user = this.authService.currentUser();
      const role = user?.role?.toLowerCase();

      // Profile completion check
      if (role === 'customer' && user?.profileComplete === false) {
        await this.router.navigate(['/customer/profile']);
        setTimeout(() => this.showProfileAlert(), 500);
        return;
      }

      // Navigate by role
      const route = ['collector', 'employee'].includes(role!)
        ? '/collector/dashboard'
        : '/customer/dashboard';

      await this.router.navigate([route]);
    } catch (error: any) {
      console.error('Login failed:', error);
      this.showErrorToast(error?.message || 'Invalid credentials. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  quickLogin(user: TestUser): void {
    this.email.set(user.email);
    this.password.set(user.password);
    this.loginAsEmployee.set(
      user.role.toLowerCase().includes('employee') ||
      user.role.toLowerCase().includes('loan') ||
      user.email.includes('employee')
    );
    this.onSubmit();
  }

  openSupport(): void {
    // Open Intercom, Crisp, or in-app chat
    console.log('Opening support...');
  }

  private async showProfileAlert(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Complete Your Profile',
      message: 'Your name and phone number are required. Please update them to continue.',
      buttons: [{ text: 'OK', role: 'confirm' }],
      backdropDismiss: false,
    });
    await alert.present();
  }

  private async showErrorToast(message: string): Promise<void> {
    const toast = await inject(ToastController).create({
      message,
      duration: 3000,
      position: 'top',
      color: 'danger',
      buttons: [{ icon: 'close', role: 'cancel' }],
    });
    await toast.present();
  }

  private isDevelopmentEnvironment(): boolean {
    const nodeEnv = ((window as any).__env?.NODE_ENV ?? '').toString().toLowerCase();
    return nodeEnv === 'development' ||
      location.hostname === 'localhost' ||
      location.port === '4200';
  }
}