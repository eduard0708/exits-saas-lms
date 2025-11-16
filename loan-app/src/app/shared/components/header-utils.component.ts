import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton } from '@ionic/angular/standalone';
import { LucideAngularModule } from 'lucide-angular';
import { DevInfoComponent } from './dev-info.component';
import { AuthService } from '../../core/services/auth.service';
import { ThemeSwitcherComponent } from '../../components/theme-switcher/theme-switcher.component';

/**
 * Shared header utilities component
 * Displays dev info and theme toggle buttons consistently across all pages
 */
@Component({
  selector: 'app-header-utils',
  standalone: true,
  imports: [CommonModule, IonButton, DevInfoComponent, LucideAngularModule, ThemeSwitcherComponent],
  template: `
    <app-dev-info (devIconClicked)="onDevIconClicked()" />
    <app-theme-switcher class="header-theme-switcher" />
    @if (showLogout) {
      <ion-button (click)="logout()" class="header-btn logout-btn">
        <lucide-icon name="log-out" slot="icon-only" class="w-5 h-5"></lucide-icon>
      </ion-button>
    }
  `,
  styles: [`
    :host {
      display: contents;
    }

    .header-btn {
      --background-hover: rgba(255, 255, 255, 0.15);
      --border-radius: 50%;
      --padding-start: 8px;
      --padding-end: 8px;
      position: relative;
      margin: 0;
    }
    
    .header-theme-switcher {
      display: inline-flex;
      margin-right: 0.25rem;
    }

    lucide-icon {
      width: 20px;
      height: 20px;
    }
  `]
})
export class HeaderUtilsComponent {
  @Input() showLogout = true;
  @Output() devIconClicked = new EventEmitter<void>();
  private authService = inject(AuthService);

  onDevIconClicked(): void {
    this.devIconClicked.emit();
  }

  logout(): void {
    this.authService.logout();
  }
}
