import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, 
  IonContent, IonItem, IonLabel, IonToggle, IonSelect, IonSelectOption,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonText 
} from '@ionic/angular/standalone';
import { SettingsService } from '@app/core/services/settings.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
  IonContent,
    IonItem,
    IonLabel,
    IonToggle,
    IonSelect,
    IonSelectOption,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonText
  ],
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {
  settings$: Observable<any>;

  constructor(private settingsService: SettingsService) {
    this.settings$ = this.settingsService.settings$;
  }

  ngOnInit(): void {}

  toggleTheme(): void {
    this.settingsService.toggleTheme();
  }

  toggleNotifications(): void {
    this.settingsService.toggleNotifications();
  }

  toggleOfflineMode(): void {
    this.settingsService.toggleOfflineMode();
  }

  toggleBiometricAuth(): void {
    this.settingsService.toggleBiometricAuth();
  }

  changeLanguage(event: Event): void {
    const value = (event as CustomEvent<{ value: string }>).detail?.value;
    if (typeof value === 'string') {
      this.settingsService.updateSetting('language', value);
    }
  }

  changeTimezone(event: Event): void {
    const value = (event as CustomEvent<{ value: string }>).detail?.value;
    if (typeof value === 'string') {
      this.settingsService.updateSetting('timezone', value);
    }
  }
}
