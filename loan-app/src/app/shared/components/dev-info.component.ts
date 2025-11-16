import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, ToastController } from '@ionic/angular/standalone';
import { LucideAngularModule } from 'lucide-angular';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

/**
 * Development info component that displays current route and component information.
 * Shows as an icon that displays info in a toast when clicked.
 * Only for development environment.
 */
@Component({
  selector: 'app-dev-info',
  standalone: true,
  imports: [CommonModule, IonButton, LucideAngularModule],
  template: `
    <ion-button 
      fill="clear" 
      size="small"
      (click)="showInfo()"
      class="dev-info-button"
    >
      <lucide-icon slot="icon-only" name="code" class="w-5 h-5"></lucide-icon>
    </ion-button>
  `,
  styles: [`
    .dev-info-button {
      --background-hover: rgba(255, 255, 255, 0.15);
      --border-radius: 50%;
      --padding-start: 8px;
      --padding-end: 8px;
      position: relative;
      margin: 0;
    }
    
    lucide-icon {
      width: 20px;
      height: 20px;
    }
  `]
})
export class DevInfoComponent {
  @Output() devIconClicked = new EventEmitter<void>();
  
  constructor(
    private router: Router,
    private location: Location,
    private toastController: ToastController
  ) {}

  async showInfo() {
    this.devIconClicked.emit();
    
    const currentUrl = this.router.url;
    const urlSegments = currentUrl.split('/').filter(s => s);
    const moduleName = urlSegments[0] || 'root';
    const componentName = urlSegments[urlSegments.length - 1] || 'unknown';
    const message = [
      'DEV INFO',
      'Platform: Loanflow Mobile',
      `Route: ${currentUrl}`,
      `Module: ${moduleName}`,
      `Component: ${componentName}`
    ].join('\n');

    const toast = await this.toastController.create({
      message: message,
      duration: 5000,
      position: 'top',
      color: 'primary',
      cssClass: 'dev-info-toast',
      buttons: [
        {
          text: 'Close',
          role: 'cancel'
        }
      ]
    });

    await toast.present();
  }
}
