import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonRadioGroup,
  IonRadio,
  IonButton,
  IonTextarea,
  IonInput,
  IonCheckbox,
  IonDatetime,
  IonIcon,
  IonNote,
  ToastController,
  AlertController,
  LoadingController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBack, 
  calendarOutline, 
  peopleOutline, 
  personOutline,
  timeOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  informationCircleOutline
} from 'ionicons/icons';
import { CollectorService } from '../../core/services/collector.service';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

interface Customer {
  customerId: number;
  customerName: string;
  loanId: number;
  loanNumber: string;
  outstandingBalance: number;
  selected?: boolean;
}

@Component({
  selector: 'app-grace-extension',
  templateUrl: './grace-extension.page.html',
  styleUrls: ['./grace-extension.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonRadioGroup,
    IonRadio,
    IonButton,
    IonTextarea,
    IonInput,
    IonCheckbox,
    IonDatetime,
    IonIcon,
    IonNote
  ]
})
export class GraceExtensionPage implements OnInit {
  // Signals
  customers = signal<Customer[]>([]);
  filteredCustomers = signal<Customer[]>([]);
  
  // Form data
  extensionMode: 'all' | 'select' | 'date' = 'all';
  dateMode: 'single' | 'range' = 'single';
  singleDate: string = new Date().toISOString();
  startDate: string = new Date().toISOString();
  endDate: string = new Date().toISOString();
  reason: string = 'weather';
  detailedReason: string = '';
  extensionDays: number = 1;
  
  reasonOptions = [
    { value: 'weather', label: 'Heavy rain/flood/typhoon' },
    { value: 'holiday', label: 'Holiday/weekend' },
    { value: 'customer_emergency', label: 'Customer emergency' },
    { value: 'collector_emergency', label: 'Collector emergency/sick' },
    { value: 'infrastructure', label: 'Road closed/infrastructure issue' },
    { value: 'goodwill', label: 'Goodwill gesture' },
    { value: 'other', label: 'Other reason' }
  ];

  constructor(
    private router: Router,
    private collectorService: CollectorService,
    private apiService: ApiService,
    private authService: AuthService,
    private toastController: ToastController,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) {
    addIcons({
      arrowBack,
      calendarOutline,
      peopleOutline,
      personOutline,
      timeOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      informationCircleOutline
    });
  }

  async ngOnInit() {
    await this.loadCustomers();
  }

  async loadCustomers() {
    const loading = await this.loadingController.create({
      message: 'Loading customers...'
    });
    await loading.present();

    try {
      const user = this.authService.getCurrentUser();
      const collectorId = user?.id;
      
      if (!collectorId) {
        throw new Error('Collector ID not found');
      }

      const routeData: any = await this.apiService.getCollectorRoute(collectorId).toPromise();
      
      // Extract route array - handle different response formats
      let routeArray: any[] = [];
      if (Array.isArray(routeData)) {
        routeArray = routeData;
      } else if (routeData.data && Array.isArray(routeData.data)) {
        routeArray = routeData.data;
      } else if (routeData.route && Array.isArray(routeData.route)) {
        routeArray = routeData.route;
      } else if (routeData.data?.route && Array.isArray(routeData.data.route)) {
        routeArray = routeData.data.route;
      } else {
        console.error('Unexpected route data format:', routeData);
        throw new Error('Invalid route data format');
      }
      
      const customerList: Customer[] = routeArray.map((loan: any) => ({
        customerId: loan.customerId,
        customerName: loan.customerName,
        loanId: loan.loanId,
        loanNumber: loan.loanNumber,
        outstandingBalance: loan.outstandingBalance || 0,
        selected: false
      })).filter((c: Customer) => 
        // Include all customers with outstanding balance OR with active loans
        c.outstandingBalance > 0 || c.loanId
      );

      this.customers.set(customerList);
      this.filteredCustomers.set(customerList);
    } catch (error) {
      console.error('Error loading customers:', error);
      const toast = await this.toastController.create({
        message: 'Failed to load customers',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }

  onExtensionModeChange() {
    // Reset selections when mode changes
    if (this.extensionMode !== 'select') {
      this.customers().forEach(c => c.selected = false);
    }
  }

  toggleCustomerSelection(customer: Customer) {
    customer.selected = !customer.selected;
  }

  selectAllCustomers() {
    const allSelected = this.customers().every(c => c.selected);
    this.customers().forEach(c => c.selected = !allSelected);
  }

  getSelectedCount(): number {
    return this.customers().filter(c => c.selected).length;
  }

  async submitExtension() {
    // Validation
    if (!this.detailedReason || this.detailedReason.trim().length < 10) {
      const toast = await this.toastController.create({
        message: 'Please provide detailed reason (minimum 10 characters)',
        duration: 3000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    if (this.extensionMode === 'select' && this.getSelectedCount() === 0) {
      const toast = await this.toastController.create({
        message: 'Please select at least one customer',
        duration: 3000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    if (this.extensionDays < 1 || this.extensionDays > 7) {
      const toast = await this.toastController.create({
        message: 'Extension days must be between 1 and 7',
        duration: 3000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    // Confirm action
    const alert = await this.alertController.create({
      header: 'Confirm Grace Extension',
      message: this.getConfirmationMessage(),
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Confirm',
          handler: () => this.processExtension()
        }
      ]
    });
    await alert.present();
  }

  getConfirmationMessage(): string {
    let message = '';
    
    if (this.extensionMode === 'all') {
      message = `Extend grace period for ALL ${this.customers().length} customers`;
    } else if (this.extensionMode === 'select') {
      message = `Extend grace period for ${this.getSelectedCount()} selected customer(s)`;
    } else {
      if (this.dateMode === 'single') {
        message = `Extend grace period for customers with due date on ${new Date(this.singleDate).toLocaleDateString()}`;
      } else {
        message = `Extend grace period for customers with due dates from ${new Date(this.startDate).toLocaleDateString()} to ${new Date(this.endDate).toLocaleDateString()}`;
      }
    }

    message += `\n\nExtension: ${this.extensionDays} day(s)`;
    message += `\nReason: ${this.getReasonLabel(this.reason)}`;
    
    return message;
  }

  async processExtension() {
    const loading = await this.loadingController.create({
      message: 'Processing grace extensions...'
    });
    await loading.present();

    try {
      let loanIds: number[] = [];

      if (this.extensionMode === 'all') {
        loanIds = this.customers().map(c => c.loanId);
      } else if (this.extensionMode === 'select') {
        loanIds = this.customers().filter(c => c.selected).map(c => c.loanId);
      } else {
        // Date-based: will be handled by backend
        loanIds = this.customers().map(c => c.loanId);
      }

      const payload = {
        loanIds,
        extensionDays: this.extensionDays,
        reason: this.reason,
        detailedReason: this.detailedReason,
        mode: this.extensionMode,
        dateFilter: this.extensionMode === 'date' ? {
          mode: this.dateMode,
          singleDate: this.dateMode === 'single' ? this.singleDate : undefined,
          startDate: this.dateMode === 'range' ? this.startDate : undefined,
          endDate: this.dateMode === 'range' ? this.endDate : undefined
        } : undefined
      };

      await this.apiService.post('money-loan/grace-extensions/bulk', payload).toPromise();

      await loading.dismiss();

      const toast = await this.toastController.create({
        message: 'Grace extension applied successfully',
        duration: 3000,
        color: 'success'
      });
      await toast.present();

      // Navigate back to route page
      this.router.navigate(['/collector/route']);
    } catch (error) {
      await loading.dismiss();
      console.error('Error processing extension:', error);
      
      const toast = await this.toastController.create({
        message: 'Failed to process grace extension',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  getReasonLabel(reasonValue: string): string {
    return this.reasonOptions.find(r => r.value === reasonValue)?.label || reasonValue;
  }

  formatCurrency(value: number): string {
    return value?.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00';
  }
}
