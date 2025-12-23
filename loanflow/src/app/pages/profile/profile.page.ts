import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem, IonLabel, IonButton, IonText } from '@ionic/angular/standalone';
import { AuthService } from '@app/core/services/auth.service';
import { TenantService } from '@app/core/services/tenant.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonText
  ],
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage implements OnInit {
  currentUser = signal<any>(null);
  loadingTenant = signal<boolean>(false);

  constructor(
    private authService: AuthService,
    private tenantService: TenantService
  ) {}

  ngOnInit(): void {
    this.currentUser.set(this.authService.getCurrentUser());
    this.authService.currentUser$.subscribe((user) => this.currentUser.set(user));

    this.loadTenantNameIfMissing();
  }

  private loadTenantNameIfMissing(): void {
    const user = this.authService.getCurrentUser() as any;
    const alreadyHasName = !!(user?.tenant?.name || user?.tenantName || user?.tenant_name);
    if (alreadyHasName) return;

    const rawId = user?.tenant?.id || user?.tenantId || user?.tenant_id;
    const tenantId = Number(rawId);
    if (!tenantId || Number.isNaN(tenantId)) return;

    this.loadingTenant.set(true);
    this.tenantService.getTenantById(tenantId).subscribe({
      next: (res) => {
        const tenant = res?.data;
        if (tenant?.id && tenant?.name) {
          this.authService.updateCurrentUser({
            tenant: {
              id: String(tenant.id),
              name: tenant.name,
            },
          } as any);
        }
        this.loadingTenant.set(false);
      },
      error: () => {
        this.loadingTenant.set(false);
      },
    });
  }

  tenantName(): string {
    const user = this.currentUser();
    const name = user?.tenant?.name || user?.tenantName || user?.tenant_name;
    if (name) {
      return String(name);
    }

    // If only an ID exists, don't show it as the tenant "name"
    const id = user?.tenant?.id || user?.tenantId || user?.tenant_id;
    return id ? 'Tenant not loaded' : '';
  }

  editProfile(): void {
    // TODO: Implement profile edit
  }

  changePassword(): void {
    // TODO: Implement password change
  }
}
