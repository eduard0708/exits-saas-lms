import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonList, IonItem, IonLabel, IonButton, IonListHeader, IonItemSliding, IonItemOptions, IonItemOption, IonCard, IonCardContent, IonText } from '@ionic/angular/standalone';
import { NotificationService } from '@app/core/services/notification.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
  IonList,
  IonItem,
  IonLabel,
    IonButton,
    IonListHeader,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonCard,
    IonCardContent,
    IonText
  ],
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
})
export class NotificationsPage implements OnInit {
  notifications$: Observable<any[]>;
  unreadCount$: Observable<number>;

  constructor(private notificationService: NotificationService) {
    this.notifications$ = this.notificationService.notifications$;
    this.unreadCount$ = this.notificationService.unreadCount$;}

  ngOnInit(): void {}

  markAsRead(notificationId: string): void {
    this.notificationService.markAsRead(notificationId);
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  deleteNotification(notificationId: string): void {
    this.notificationService.deleteNotification(notificationId);
  }

  clearAll(): void {
    this.notificationService.clearNotifications();
  }
}
