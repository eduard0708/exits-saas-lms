import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonMenu, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonCard, IonCardContent, IonMenuToggle, MenuController } from '@ionic/angular/standalone';
import { AuthService } from '@app/core/services/auth.service';
import { iconToEmoji } from '@shared/utils/emoji-icon.util';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [
    CommonModule,
  RouterLink,
    IonMenu,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
  IonList,
  IonItem,
    IonLabel,
    IonCard,
    IonCardContent,
    IonMenuToggle
  ],
  templateUrl: './menu.page.html',
  styleUrls: ['./menu.page.scss'],
})
export class MenuPage implements OnInit {
  currentUser = this.authService.getCurrentUser();
  protected emoji = iconToEmoji;

  menuItems = [
    { label: 'Dashboard', icon: 'home-outline', route: '/dashboard' },
    { label: 'Users', icon: 'people-outline', route: '/users' },
    { label: 'Roles', icon: 'shield-outline', route: '/roles' },
    { label: 'Tenants', icon: 'business-outline', route: '/tenants' },
    { label: 'Audit Logs', icon: 'document-text-outline', route: '/audit-logs' },
    { label: 'Profile', icon: 'person-outline', route: '/profile' },
    { label: 'Settings', icon: 'settings-outline', route: '/settings' },
  ];

  constructor(
    private menu: MenuController,
    private authService: AuthService
  ) {}

  ngOnInit(): void {}

  closeMenu(): void {
    this.menu.close('mainMenu');
  }

  logout(): void {
    this.authService.logout();
    this.menu.close('mainMenu');
  }
}
