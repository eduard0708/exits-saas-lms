import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton } from '@ionic/angular/standalone';
import { ThemeService } from '../../core/services/theme.service';
import { DevInfoComponent } from './dev-info.component';
import { AuthService } from '../../core/services/auth.service';

/**
 * Shared header utilities component
 * Displays dev info and theme toggle buttons consistently across all pages
 */
@Component({
  selector: 'app-header-utils',
  standalone: true,
  imports: [CommonModule, IonButton, DevInfoComponent],
  template: `
    <!-- Dev Info (Development Only) -->
    <app-dev-info (devIconClicked)="onDevIconClicked()" />
    
    <!-- Theme Toggle -->
    <ion-button (click)="themeService.toggleTheme()" class="header-btn">
      <span 
        slot="icon-only" 
        class="emoji-icon"
      >{{ themeService.isDark() ? '☀️' : '🌙' }}</span>
    </ion-button>

    <!-- Logout (optional) -->
    @if (showLogout) {
      <ion-button (click)="logout()" class="header-btn logout-btn">
        <span  slot="icon-only" class="emoji-icon">🚪</span>
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
    
    .emoji-icon {
      font-size: 20px;
    }
  `]
})
export class HeaderUtilsComponent {
  @Input() showLogout = true;
  @Output() devIconClicked = new EventEmitter<void>();
  
  public themeService = inject(ThemeService);
  private authService = inject(AuthService);

  onDevIconClicked(): void {
    this.devIconClicked.emit();
  }

  logout(): void {
    this.authService.logout();
  }
}
