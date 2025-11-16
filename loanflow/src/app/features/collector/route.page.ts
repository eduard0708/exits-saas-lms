// Collector Route Page - Modern Ionic 8 + Tailwind Design
import { Component, OnInit, signal, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { lastValueFrom } from 'rxjs';
import {
  IonContent,
  IonRefresher,
  IonRefresherContent,
  IonButton,
  IonIcon,
  IonBadge,
  IonSkeletonText,
  IonChip,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonItem,
  IonLabel,
  IonList,
  IonFab,
  IonFabButton,
  IonFabList,
  ToastController,
  AlertController,
  ModalController,
  ViewWillEnter
} from '@ionic/angular/standalone';
import { CurrencyMaskDirective } from '../../shared/directives/currency-mask.directive';
import { addIcons } from 'ionicons';
import {
  mapOutline,
  locationOutline,
  cashOutline,
  checkmarkCircleOutline,
  timeOutline,
  personOutline,
  callOutline,
  mailOutline,
  navigateOutline,
  listOutline,
  statsChartOutline,
  logOutOutline,
  syncOutline,
  moonOutline,
  sunnyOutline,
  alertCircleOutline,
  documentTextOutline,
  cardOutline,
  calendarOutline,
  closeOutline,
  logoGoogle,
  rainyOutline,
  ellipsisVertical,
  hourglassOutline,
  handRightOutline
} from 'ionicons/icons';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { SyncService } from '../../core/services/sync.service';
import { ThemeService } from '../../core/services/theme.service';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { CollectorTopBarComponent } from '../../shared/components/collector-top-bar.component';

// API Response interface
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface RouteCustomer {
  customerId: number;
  customerName: string;
  address: string;
  phone: string;
  email?: string;
  // Loan info
  loanId: number;
  loanNumber: string;
  productName: string;
  principalAmount: number;
  outstandingBalance: number;
  amountDue: number;
  nextInstallment: number | null;
  dueDate: string;
  status: 'not-visited' | 'visited' | 'collected' | 'missed';
  distance: string;
  // Grace period info
  gracePeriodDays?: number;
  latePenaltyPercent?: number;
  daysOverdue?: number;
  gracePeriodRemaining?: number;
  gracePeriodConsumed?: boolean;
  totalPenalties?: number;
}

interface GraceExtensionFormData {
  extensionDays: number;
  reason: string;
  detailedReason: string;
}

interface CollectionStats {
  totalAssigned: number;
  visited: number;
  collected: number;
  totalCollected: number;
  pendingVisits: number;
}

@Component({
  selector: 'app-collector-route',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonButton,
    IonIcon,
    IonBadge,
    IonSkeletonText,
    IonFab,
    IonFabButton,
    IonFabList,
    CurrencyMaskDirective,
    CollectorTopBarComponent
  ],
  templateUrl: './route.page.html',
  styleUrls: ['./route.page.scss']
})
export class CollectorRoutePage implements OnInit, ViewWillEnter {
  @ViewChild('partialAmountInput') partialAmountInput?: ElementRef<HTMLInputElement>;

  loading = signal(false);
  syncing = signal(false);
  currentUser = signal<any>(null);
  currentDate = new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  searchQuery: string = '';
  installmentFilter = signal<'pending' | 'paid' | 'all'>('pending'); // Default to pending only
  customers = signal<RouteCustomer[]>([]);
  stats = signal<CollectionStats>({
    totalAssigned: 0,
    visited: 0,
    collected: 0,
    totalCollected: 0,
    pendingVisits: 0
  });
  // Track expanded loans (one card per loan). Use an array inside a signal so UI updates.
  expandedLoanIds = signal<number[]>([]);
  // Simple in-memory cache for loan details fetched on demand
  loanDetailsCache: Record<number, any> = {};

  // Payment modal state
  showPaymentModal = signal(false);
  selectedLoan = signal<RouteCustomer | null>(null);
  selectedInstallment = signal<any>(null);
  paymentMethod: 'cash' | 'cheque' | 'gcash' | '' = 'cash'; // Default to cash
  
  // View mode toggle: 'all' | 'summary' | 'payments'
  viewMode = signal<'all' | 'summary' | 'payments'>('all');
  paymentAmount: number = 0;
  paymentReference: string = '';
  paymentNotes: string = '';
  isPartialPayment: boolean = false;
  paymentType: 'installment' | 'penalty-only' | 'penalty-partial' | 'full-with-penalty' = 'installment'; // Track payment purpose

  // Angular 16+ inject() pattern - cleaner than constructor
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  public syncService = inject(SyncService);
  private router = inject(Router);
  public themeService = inject(ThemeService);
  private confirmationService = inject(ConfirmationService);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);

  constructor() {
    addIcons({
      mapOutline,
      locationOutline,
      cashOutline,
      checkmarkCircleOutline,
      timeOutline,
      personOutline,
      callOutline,
      mailOutline,
      navigateOutline,
      listOutline,
      statsChartOutline,
      logOutOutline,
      syncOutline,
      moonOutline,
      sunnyOutline,
      alertCircleOutline,
      documentTextOutline,
      cardOutline,
      calendarOutline,
      closeOutline,
      logoGoogle,
      rainyOutline,
      ellipsisVertical,
      hourglassOutline,
      handRightOutline
    });
  }

  ngOnInit() {
    this.currentUser.set(this.authService.currentUser());
  }

  async ionViewWillEnter() {
    this.currentUser.set(this.authService.currentUser());
    // Clear cache to force fresh data load (important after loan disbursement)
    this.loanDetailsCache = {};
    await this.loadRouteData();
  }

  isExpanded(loanId: number) {
    return this.expandedLoanIds().includes(loanId);
  }

  async toggleLoanDetails(loanId: number) {
    // Toggle expansion state
    const arr = [...this.expandedLoanIds()];
    const idx = arr.indexOf(loanId);
    if (idx > -1) {
      arr.splice(idx, 1);
      this.expandedLoanIds.set(arr);
      return;
    }

    // expand and set to 'all' view mode
    this.viewMode.set('all');
    arr.push(loanId);
    this.expandedLoanIds.set(arr);

    // fetch loan details if not cached
    await this.loadLoanDetails(loanId);
  }

  /**
   * Open loan details panel with specific view mode (single click)
   */
  async openLoanWithView(loanId: number, mode: 'all' | 'summary' | 'payments') {
    // Set view mode first
    this.viewMode.set(mode);
    
    // Ensure panel is expanded (don't toggle, always open)
    const arr = [...this.expandedLoanIds()];
    if (!arr.includes(loanId)) {
      arr.push(loanId);
      this.expandedLoanIds.set(arr);
      // fetch loan details if not cached
      await this.loadLoanDetails(loanId);
    }
  }

  async loadLoanDetails(loanId: number) {
    if (!loanId) return null;
    if (this.loanDetailsCache[loanId]) return this.loanDetailsCache[loanId];
    try {
      console.log('ðŸ“¡ Fetching loan details for loan ID:', loanId);
      
      // Check if user is a collector (employee)
      const userRole = this.authService.userRole();
      
      if (userRole === 'collector') {
        // For collectors, fetch loan details and schedule separately
        const [loanRes, scheduleRes] = await Promise.all([
          lastValueFrom(this.apiService.getLoanDetails(loanId)),
          lastValueFrom(this.apiService.getLoanSchedule(loanId))
        ]);
        
        console.log('âœ… Loan details API response:', loanRes);
        console.log('âœ… Schedule API response:', scheduleRes);
        
        // Combine the responses
        const loanData = loanRes?.data || loanRes;
        const scheduleData = scheduleRes?.data || scheduleRes;
        
        const combinedData = {
          ...loanData,
          schedule: scheduleData
        };
        
        console.log('ðŸ“‹ Combined loan data:', combinedData);
        console.log('ðŸ“‹ Schedule length:', combinedData?.schedule?.length);
        
        this.loanDetailsCache[loanId] = combinedData;
        return combinedData;
      } else {
        // For customers, use the existing endpoint which includes schedule
        const res = await lastValueFrom(this.apiService.getLoanDetails(loanId));
        console.log('âœ… Loan details API response:', res);
        const data = res?.data || res;
        console.log('ðŸ“‹ Processed loan data:', data);
        console.log('ðŸ“‹ Schedule length:', data?.schedule?.length);
        this.loanDetailsCache[loanId] = data;
        return data;
      }
    } catch (err) {
      console.error('âŒ Failed to load loan details for', loanId, err);
      return null;
    }
  }

  getLoanDetailsFromCache(loanId: number) {
    return this.loanDetailsCache[loanId] || null;
  }

  getTotalRepayment(loan: RouteCustomer): number {
    const details = this.getLoanDetailsFromCache(loan.loanId);
    if (details) {
      // Try to get totalAmount from loan details (supports both snake_case and camelCase)
      const totalAmount = details.totalAmount || details.total_amount;
      if (totalAmount) {
        console.log('ðŸ’° Total Repayment from cache:', totalAmount);
        return Number(totalAmount);
      }
    }
    
    // Fallback: Calculate based on your formula
    // Principal + Interest (5%) + Service Charge (1%) + Platform Fee (50)
    const principal = loan.principalAmount;
    const interest = principal * 0.05; // 5% interest
    const serviceCharge = principal * 0.01; // 1% service charge
    const platformFee = 50; // Fixed platform fee
    const total = principal + interest + serviceCharge + platformFee;
    
    console.log('ðŸ’° Calculated Total Repayment:', {
      principal,
      interest,
      serviceCharge,
      platformFee,
      total
    });
    
    return total;
  }

  getOutstandingBalance(loan: RouteCustomer): number {
    const details = this.getLoanDetailsFromCache(loan.loanId);
    if (details && details.schedule && Array.isArray(details.schedule)) {
      // Calculate balance from schedule: sum of all outstanding amounts
      const balance = details.schedule.reduce((total: number, item: any) => {
        const outstanding = item.outstandingAmount || item.outstanding_amount || 0;
        return total + Number(outstanding);
      }, 0);
      
      console.log('ðŸ’° Outstanding Balance calculated from schedule:', balance);
      return balance;
    }
    
    if (details) {
      // Try to get outstandingBalance from loan details (supports both snake_case and camelCase)
      const balance = details.outstandingBalance ?? details.outstanding_balance;
      if (balance !== undefined && balance !== null) {
        console.log('ðŸ’° Outstanding Balance from cache:', balance);
        return Number(balance);
      }
    }
    
    // Fallback to route data
    console.log('ðŸ’° Outstanding Balance from route data:', loan.outstandingBalance);
    return loan.outstandingBalance;
  }

  getTotalInstallments(loan: RouteCustomer): number {
    const details = this.getLoanDetailsFromCache(loan.loanId);
    if (details && details.schedule && Array.isArray(details.schedule)) {
      return details.schedule.length;
    }
    return 0;
  }

  getInstallmentsPaid(loan: RouteCustomer): number {
    const details = this.getLoanDetailsFromCache(loan.loanId);
    if (details && details.schedule && Array.isArray(details.schedule)) {
      // Count installments that are fully paid or partially paid
      const paidCount = details.schedule.filter((item: any) => {
        const status = item.status;
        return status === 'paid' || status === 'partially_paid';
      }).length;
      
      console.log('ðŸ“Š Installments paid:', paidCount, 'out of', details.schedule.length);
      return paidCount;
    }
    return 0;
  }

  hasPaidInstallments(loan: RouteCustomer): boolean {
    return this.getInstallmentsPaid(loan) > 0;
  }

  getFilteredInstallments(schedule: any[]): any[] {
    if (!schedule || !Array.isArray(schedule)) {
      return [];
    }

    const filter = this.installmentFilter();
    
    if (filter === 'pending') {
      // Show pending, overdue, and partially paid installments (still need payment)
      return schedule.filter(item => 
        item.status === 'pending' || item.status === 'overdue' || item.status === 'partially_paid'
      );
    } else if (filter === 'paid') {
      // Show only fully paid installments
      return schedule.filter(item => 
        item.status === 'paid'
      );
    }
    
    // Show all installments
    return schedule;
  }

  goToVisit(customerId: number) {
    if (!customerId) return;
    this.router.navigate(['/collector/visit', customerId]);
  }

  navigateToGraceExtension() {
    this.router.navigate(['/collector/grace-extension']);
  }

  async loadRouteData() {
    this.loading.set(true);
    try {
      const collectorId = this.authService.getCurrentUserId();
      
      if (!collectorId) {
        console.error('âŒ No collector ID found in auth service');
        const toast = await this.toastController.create({
          message: 'Unable to identify collector. Please log in again.',
          duration: 3000,
          position: 'bottom',
          color: 'danger'
        });
        await toast.present();
        this.customers.set([]);
        this.calculateStats();
        return;
      }

      console.log('ðŸ“¡ Fetching route data for collector ID:', collectorId);
      const response = await lastValueFrom(this.apiService.getCollectorRoute(collectorId)) as ApiResponse<RouteCustomer[]> | RouteCustomer[];
      
      console.log('âœ… API Response received:', response);
      console.log('ðŸ“‹ Response type:', typeof response);
      console.log('ðŸ“‹ Is array:', Array.isArray(response));
      
      // Handle both wrapped ({ success: true, data: [...] }) and unwrapped ([...]) responses
      const routeData = Array.isArray(response) ? response : (response?.data || []);
      
      console.log('ðŸ“‹ Route data after unwrapping:', routeData);
      console.log('ðŸ“‹ Route data length:', routeData?.length);
      if (routeData && routeData.length > 0) {
        console.log('ðŸ“‹ First item structure:', routeData[0]);
      }
      
      if (routeData && Array.isArray(routeData) && routeData.length > 0) {
        // Map API response to our loan interface
        const mappedLoans: RouteCustomer[] = routeData.map((loan: any) => {
          console.log('ðŸ” Raw loan data from API:', loan);
          
          // Handle both snake_case and camelCase field names from API
          const loanId = loan.loanId || loan.loan_id;
          const loanNumber = loan.loanNumber || loan.loan_number;
          const customerId = loan.customerId || loan.customer_id;
          const customerName = loan.customerName || loan.customer_name;
          const productName = loan.productName || loan.product_name;
          const principalAmount = loan.principalAmount || loan.principal_amount;
          const outstandingBalance = loan.outstandingBalance || loan.outstanding_balance;
          const amountDue = loan.amountDue || loan.amount_due || loan.total_due;
          const nextInstallment = loan.nextInstallment || loan.next_installment;
          const dueDate = loan.dueDate || loan.due_date || loan.next_due_date;
          
          // Grace period and penalty information
          const gracePeriodDays = loan.gracePeriodDays || loan.grace_period_days || 0;
          const latePenaltyPercent = loan.latePenaltyPercent || loan.late_penalty_percent || 0;
          const daysOverdue = loan.daysOverdue || loan.days_overdue || 0;
          const gracePeriodRemaining = loan.gracePeriodRemaining || loan.grace_period_remaining || 0;
          const gracePeriodConsumed = loan.gracePeriodConsumed || loan.grace_period_consumed || false;
          const totalPenalties = loan.totalPenalties || loan.total_penalties || 0;
          
          console.log('ðŸ” Mapped loan:', {
            loanId,
            loanNumber,
            customerName,
            productName,
            email: loan.email,
            nextInstallment,
            gracePeriodDays,
            latePenaltyPercent,
            daysOverdue,
            gracePeriodRemaining,
            gracePeriodConsumed,
            totalPenalties
          });
          
          return {
            customerId: customerId,
            customerName: customerName || 'Unknown Customer',
            address: loan.address || loan.full_address || 'N/A',
            phone: loan.phone || 'N/A',
            email: loan.email || '',
            loanId: loanId,
            loanNumber: loanNumber || `LOAN-${loanId}`,
            productName: productName || 'Loan Product',
            principalAmount: Number(principalAmount || 0),
            outstandingBalance: Number(outstandingBalance || 0),
            amountDue: Number(amountDue || 0),
            nextInstallment: nextInstallment ? Number(nextInstallment) : null,
            dueDate: this.formatDueDate(dueDate),
            status: loan.status || 'not-visited',
            distance: 'N/A', // Distance calculation would require GPS integration
            // Grace period and penalty data
            gracePeriodDays: Number(gracePeriodDays),
            latePenaltyPercent: Number(latePenaltyPercent),
            daysOverdue: Number(daysOverdue),
            gracePeriodRemaining: Number(gracePeriodRemaining),
            gracePeriodConsumed: Boolean(gracePeriodConsumed),
            totalPenalties: Number(totalPenalties)
          };
        });
        
        console.log('ðŸ“Š Successfully mapped', mappedLoans.length, 'loans to route');
        this.customers.set(mappedLoans);
        
        // Preload loan details for all loans to show balance and installments immediately
        console.log('ðŸ”„ Preloading loan details for all loans...');
        for (const loan of mappedLoans) {
          try {
            await this.loadLoanDetails(loan.loanId);
            console.log(`âœ… Preloaded details for loan ${loan.loanId}`);
          } catch (err) {
            console.error(`âŒ Failed to preload details for loan ${loan.loanId}:`, err);
          }
        }
        console.log('âœ… All loan details preloaded');
      } else {
        console.warn('âš ï¸ No customers assigned to this collector');
        this.customers.set([]);
      }
      
      this.calculateStats();
    } catch (error: any) {
      console.error('âŒ Error loading route data:', error);
      console.error('Error details:', {
        message: error?.message,
        status: error?.status,
        error: error?.error
      });
      
      const errorMessage = error?.error?.message || error?.message || 'Failed to load route data. Please try again.';
      
      const toast = await this.toastController.create({
        message: errorMessage,
        duration: 4000,
        position: 'bottom',
        color: 'danger',
        icon: 'alert-circle-outline'
      });
      await toast.present();
      
      this.customers.set([]);
      this.calculateStats();
    } finally {
      this.loading.set(false);
    }
  }

  formatDueDate(rawDate: string | null | undefined): string {
    if (!rawDate) {
      return 'N/A';
    }

    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) {
      return 'N/A';
    }

    const today = new Date();
    const diffTime = parsed.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Show relative dates for near-term due dates
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays === -1) {
      return 'Yesterday';
    } else if (diffDays > 1 && diffDays <= 7) {
      return `In ${diffDays} days`;
    } else if (diffDays < -1 && diffDays >= -7) {
      return `${Math.abs(diffDays)} days ago`;
    }

    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: parsed.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  }

  calculateStats() {
    const customers = this.customers();
    this.stats.set({
      totalAssigned: customers.length,
      visited: customers.filter(c => c.status === 'visited' || c.status === 'collected').length,
      collected: customers.filter(c => c.status === 'collected').length,
      totalCollected: customers.filter(c => c.status === 'collected').reduce((sum, c) => sum + c.amountDue, 0),
      pendingVisits: customers.filter(c => c.status === 'not-visited').length
    });
  }

  filteredCustomers() {
    let filtered = this.customers();
    
    // Apply search filter
    if (this.searchQuery && this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(c => 
        c.customerName.toLowerCase().includes(query) ||
        c.phone.toLowerCase().includes(query) ||
        (c.email && c.email.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }

  onSearchChange() {
    // Trigger change detection
  }

  clearSearch() {
    this.searchQuery = '';
  }

  progressPercentage(): number {
    const total = this.stats().totalAssigned;
    const visited = this.stats().visited;
    return total > 0 ? Math.round((visited / total) * 100) : 0;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'collected': return 'success';
      case 'visited': return 'primary';
      case 'not-visited': return 'warning';
      case 'missed': return 'danger';
      default: return 'medium';
    }
  }

  getAlertColor(loan: RouteCustomer): string {
    // Check if loan has cached schedule data with overdue installments
    const details = this.getLoanDetailsFromCache(loan.loanId);
    if (details && details.schedule) {
      const overdueCount = this.getTotalOverdueInstallments(details.schedule);
      if (overdueCount > 0) {
        // Check if any installment has penalties (grace period consumed)
        const hasPenalties = details.schedule.some((inst: any) => 
          (inst.penaltyAmount || inst.penalty_amount || 0) > 0
        );
        if (hasPenalties) {
          return 'danger'; // Grace expired, penalties applying
        }
        return 'warning'; // Within grace period
      }
    }
    
    // Fallback to loan properties
    if (loan.gracePeriodConsumed === true) {
      return 'danger';
    } else if ((loan.daysOverdue || 0) > 0) {
      return 'warning';
    }
    return 'medium';
  }

  getAlertIcon(loan: RouteCustomer): string {
    // Check schedule data first
    const details = this.getLoanDetailsFromCache(loan.loanId);
    if (details && details.schedule) {
      const overdueCount = this.getTotalOverdueInstallments(details.schedule);
      if (overdueCount > 0) {
        const hasPenalties = details.schedule.some((inst: any) => 
          (inst.penaltyAmount || inst.penalty_amount || 0) > 0
        );
        if (hasPenalties) {
          return 'alert-circle';
        }
        return 'time-outline';
      }
    }
    
    // Fallback
    if (loan.gracePeriodConsumed === true) {
      return 'alert-circle';
    } else if ((loan.daysOverdue || 0) > 0) {
      return 'time-outline';
    }
    return 'information-circle-outline';
  }

  getAlertLabel(loan: RouteCustomer): string {
    // Check schedule data first
    const details = this.getLoanDetailsFromCache(loan.loanId);
    if (details && details.schedule) {
      const overdueCount = this.getTotalOverdueInstallments(details.schedule);
      if (overdueCount > 0) {
        const hasPenalties = details.schedule.some((inst: any) => 
          (inst.penaltyAmount || inst.penalty_amount || 0) > 0
        );
        if (hasPenalties) {
          return 'Grace Expired';
        }
        return 'Within Grace';
      }
    }
    
    // Fallback
    if (loan.gracePeriodConsumed === true) {
      return 'Grace Expired';
    } else if ((loan.daysOverdue || 0) > 0) {
      return 'Within Grace';
    }
    return 'Overdue Summary';
  }

  getStatusLabel(status: string): string {
    switch (status) {
      // Loan status
      case 'not-visited': return 'Pending';
      case 'visited': return 'Visited';
      case 'collected': return 'Collected';
      case 'missed': return 'Missed';
      // Installment status
      case 'paid': return 'Paid';
      case 'partially_paid': return 'Partial';
      case 'pending': return 'Pending';
      case 'overdue': return 'Overdue';
      default: return status;
    }
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  /**
   * Format currency with comma thousands separator and 2 decimal places
   * Example: 10000 â†’ "10,000.00"
   */
  formatCurrency(amount: number): string {
    return amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /**
   * TrackBy function for installment ngFor - improves performance
   */
  trackByInstallmentId = (index: number, item: any): number | string => {
    return item.installmentId || item.installmentNumber || index;
  };

  /**
   * Format penalty percentage for display.
   * Database stores penalty as percentage (e.g., 1.00 means 1%)
   * Just format it with 2 decimals, no conversion needed.
   */
  formatPenaltyPercent(value: number | undefined | null): string {
    const v = Number(value ?? 0);
    if (isNaN(v) || v === 0) return '0.00';
    // Database already stores as percentage, just format it
    return v.toFixed(2);
  }

  /**
   * Get the penalty amount for an installment
   */
  getInstallmentPenalty(installment: any): number {
    if (!installment) return 0;
    return Number(installment.penaltyAmount || installment.penalty_amount || 0);
  }

  /**
   * Get the total amount due (installment + penalty)
   */
  getTotalAmountDue(installment: any): number {
    if (!installment) return 0;
    const outstanding = Number(installment.outstandingAmount || installment.outstanding_amount || 0);
    const penalty = this.getInstallmentPenalty(installment);
    return outstanding + penalty;
  }

  /**
   * Calculate total penalties for all overdue installments in a schedule
   */
  getTotalPenaltiesForLoan(schedule: any[]): number {
    if (!schedule || !Array.isArray(schedule)) {
      console.log('âš ï¸ No schedule data available');
      return 0;
    }
    
    console.log('ðŸ“‹ Full schedule data:', schedule.map(item => ({
      num: item.installmentNumber || item.installment_number,
      status: item.status,
      daysLate: item.daysLate || item.days_late,
      gracePeriod: item.gracePeriodDays || item.grace_period_days,
      penaltyAmount: item.penaltyAmount || item.penalty_amount,
      amount: item.installmentAmount || item.installment_amount
    })));
    
    const totalPenalty = schedule.reduce((total, item) => {
      if (item.status === 'overdue' || item.status === 'partially_paid') {
        const penalty = Number(item.penaltyAmount || item.penalty_amount || 0);
        console.log(`ðŸ’° Penalty for installment ${item.installmentNumber || item.installment_number}: â‚±${penalty}`);
        return total + penalty;
      }
      return total;
    }, 0);
    
    console.log('ðŸ’µ Total penalties calculated:', totalPenalty);
    return totalPenalty;
  }

  /**
   * Calculate total installment amount (without penalties) for overdue installments
   */
  getTotalInstallmentAmount(schedule: any[]): number {
    if (!schedule || !Array.isArray(schedule)) return 0;
    
    return schedule.reduce((total, item) => {
      if (item.status === 'overdue' || item.status === 'partially_paid') {
        const outstanding = Number(item.outstandingAmount || item.outstanding_amount || 0);
        return total + outstanding;
      }
      return total;
    }, 0);
  }

  /**
   * Get count of overdue installments
   */
  getTotalOverdueInstallments(schedule: any[]): number {
    if (!schedule || !Array.isArray(schedule)) return 0;
    
    return schedule.filter(item => 
      item.status === 'overdue' || item.status === 'partially_paid'
    ).length;
  }

  /**
   * Get total days late across all overdue installments (sum of the worst case)
   */
  getTotalDaysLate(schedule: any[]): number {
    if (!schedule || !Array.isArray(schedule)) return 0;
    
    const overdue = schedule.filter(item => 
      item.status === 'overdue' || item.status === 'partially_paid'
    );
    
    if (overdue.length === 0) return 0;
    
    // Get the maximum days late (the oldest overdue installment)
    const maxDaysLate = Math.max(...overdue.map(item => 
      Number(item.daysLate || item.days_late || 0)
    ));
    
    console.log('ðŸ“Š Total days late:', maxDaysLate);
    console.log('ðŸ“Š Overdue installments:', overdue.map(i => ({
      num: i.installmentNumber,
      status: i.status,
      daysLate: i.daysLate || i.days_late,
      penalty: i.penaltyAmount || i.penalty_amount
    })));
    
    return maxDaysLate;
  }

  /**
   * Pay all overdue installments with penalties
   */
  async payAllWithPenalties(loan: RouteCustomer) {
    const details = this.getLoanDetailsFromCache(loan.loanId);
    if (!details || !details.schedule) {
      const toast = await this.toastController.create({
        message: 'Unable to load loan details',
        duration: 2000,
        position: 'bottom',
        color: 'danger'
      });
      await toast.present();
      return;
    }

    const totalInstallment = this.getTotalInstallmentAmount(details.schedule);
    const totalPenalty = this.getTotalPenaltiesForLoan(details.schedule);
    const grandTotal = totalInstallment + totalPenalty;
    const overdueCount = this.getTotalOverdueInstallments(details.schedule);
    
    if (grandTotal <= 0) {
      const toast = await this.toastController.create({
        message: 'No overdue amounts to pay',
        duration: 2000,
        position: 'bottom',
        color: 'warning'
      });
      await toast.present();
      return;
    }

    // Open payment modal for full payment (installments + penalties)
    this.selectedLoan.set(loan);
    this.selectedInstallment.set({
      installmentNumber: -1, // -1 indicates pay-all payment
      outstandingAmount: totalInstallment,
      penaltyAmount: totalPenalty,
      status: 'pay-all'
    } as any);
    
    // Pre-fill with grand total
    this.paymentAmount = grandTotal;
    this.paymentMethod = 'cash';
    this.paymentReference = '';
    this.paymentNotes = `Full payment: ${overdueCount} overdue installment(s) (â‚±${this.formatCurrency(totalInstallment)}) + penalties (â‚±${this.formatCurrency(totalPenalty)})`;
    this.isPartialPayment = false;
    this.paymentType = 'full-with-penalty'; // Tag as full payment with penalties
    
    this.showPaymentModal.set(true);
  }

  /**
   * Pay penalty only for a specific installment (must be full, no partial)
   */
  async payInstallmentPenaltyOnly(loan: RouteCustomer, installment: any) {
    const penaltyAmount = installment.penaltyAmount || installment.penalty_amount || 0;
    
    if (penaltyAmount <= 0) {
      const toast = await this.toastController.create({
        message: 'No penalty to pay for this installment',
        duration: 2000,
        position: 'bottom',
        color: 'warning'
      });
      await toast.present();
      return;
    }

    // Open payment modal for penalty only (no installment amount)
    this.selectedLoan.set(loan);
    this.selectedInstallment.set({
      installmentNumber: 0, // 0 indicates penalty-only payment
      outstandingAmount: penaltyAmount, // Only penalty amount, no installment
      penaltyAmount: 0, // Set to 0 so it doesn't add again in modal display
      status: 'penalty-only',
      dueDate: installment.dueDate,
      originalInstallmentNumber: installment.installmentNumber // Store for reference
    } as any);
    
    // Pre-fill with penalty amount (locked, no partial allowed)
    this.paymentAmount = penaltyAmount;
    this.paymentMethod = 'cash';
    this.paymentReference = '';
    this.paymentNotes = `Penalty payment only for Installment ${installment.installmentNumber}`;
    this.isPartialPayment = false;
    this.paymentType = 'penalty-only';
    
    this.showPaymentModal.set(true);
  }

  /**
   * Request waiver for a specific installment penalty
   */
  async waiveInstallmentPenalty(loan: RouteCustomer, installment: any) {
    const penaltyAmount = installment.penaltyAmount || installment.penalty_amount || 0;
    
    if (penaltyAmount <= 0) {
      const toast = await this.toastController.create({
        message: 'No penalty to waive for this installment',
        duration: 2000,
        position: 'bottom',
        color: 'warning'
      });
      await toast.present();
      return;
    }

    // Navigate to waivers page with prefilled data for this specific installment
    this.router.navigate(['/collector/waivers'], {
      state: {
        prefillLoan: {
          loanId: loan.loanId,
          loanNumber: loan.loanNumber,
          customerName: loan.customerName,
          installmentNumber: installment.installmentNumber,
          totalPenalty: penaltyAmount,
          overdueInstallments: 1,
          outstandingAmount: installment.outstandingAmount
        }
      }
    });
  }

  /**
   * Pay penalty only for all overdue installments
   */
  /**
   * Pay penalty only - full or partial
   */
  async payPenaltyOnly(loan: RouteCustomer) {
    const details = this.getLoanDetailsFromCache(loan.loanId);
    if (!details || !details.schedule) {
      const toast = await this.toastController.create({
        message: 'Unable to load loan details',
        duration: 2000,
        position: 'bottom',
        color: 'danger'
      });
      await toast.present();
      return;
    }

    const totalPenalty = this.getTotalPenaltiesForLoan(details.schedule);
    
    if (totalPenalty <= 0) {
      const toast = await this.toastController.create({
        message: 'No penalties to pay',
        duration: 2000,
        position: 'bottom',
        color: 'warning'
      });
      await toast.present();
      return;
    }

    // Open payment modal for penalty payment (can be partial or full)
    this.selectedLoan.set(loan);
    this.selectedInstallment.set({
      installmentNumber: 0, // 0 indicates penalty-only payment
      outstandingAmount: 0, // NO installment amount, penalty only!
      penaltyAmount: totalPenalty,
      status: 'penalty-only'
    } as any);
    
    // Pre-fill with full penalty amount (user can change for partial)
    this.paymentAmount = totalPenalty;
    this.paymentMethod = 'cash';
    this.paymentReference = '';
    this.paymentNotes = `Penalty payment for ${this.getTotalOverdueInstallments(details.schedule)} overdue installment(s)`;
    this.isPartialPayment = false;
    this.paymentType = 'penalty-only'; // Tag as penalty payment
    
    this.showPaymentModal.set(true);
  }

  /**
   * Request a penalty waiver for overdue installments
   */
  async requestPenaltyWaiver(loan: RouteCustomer) {
    const details = this.getLoanDetailsFromCache(loan.loanId);
    
    if (!details || !details.schedule) {
      const toast = await this.toastController.create({
        message: 'Unable to load loan details',
        duration: 2000,
        position: 'bottom',
        color: 'danger'
      });
      await toast.present();
      return;
    }

    // Calculate total penalties
    const totalPenalty = this.getTotalPenaltiesForLoan(details.schedule);
    const overdueCount = this.getTotalOverdueInstallments(details.schedule);
    
    // Navigate to waivers page with loan info
    this.router.navigate(['/collector/waivers'], {
      state: {
        prefillLoan: {
          loanId: loan.loanId,
          loanNumber: loan.loanNumber,
          customerName: loan.customerName,
          totalPenalty: totalPenalty,
          overdueInstallments: overdueCount,
          outstandingAmount: this.getTotalInstallmentAmount(details.schedule)
        }
      }
    });
  }

  async handleRefresh(event: any) {
    await this.loadRouteData();
    event.target.complete();
  }

  async syncNow() {
    this.syncing.set(true);
    await this.syncService.forceSyncNow();
    this.syncing.set(false);
  }

  openMap(customer: RouteCustomer) {
    // Open Google Maps with customer address
    const address = encodeURIComponent(customer.address);
    window.open(`https://maps.google.com/?q=${address}`, '_system');
  }

  async logout() {
    const confirmed = await this.confirmationService.confirmLogout();
    
    if (confirmed) {
      this.authService.logout();
      
      const toast = await this.toastController.create({
        message: 'Logged out successfully',
        duration: 2000,
        position: 'bottom',
        color: 'success',
        icon: 'checkmark-circle-outline'
      });
      await toast.present();
    }
  }

  /**
   * Open payment modal for an installment
   */
  openPaymentModal(loan: RouteCustomer, installment: any) {
    this.selectedLoan.set(loan);
    this.selectedInstallment.set(installment);
    // Calculate total amount including penalty
    const totalAmount = this.getTotalAmountDue(installment);
    this.paymentAmount = Math.round(totalAmount * 100) / 100; // Round to 2 decimal places
    this.paymentMethod = 'cash'; // Default to cash
    this.paymentReference = this.generateReference('cash'); // Auto-generate for cash
    this.paymentNotes = '';
    this.isPartialPayment = false;
    this.showPaymentModal.set(true);
  }

  /**
   * Select payment method (chip selection)
   */
  selectPaymentMethod(method: 'cash' | 'cheque' | 'gcash') {
    this.paymentMethod = method;
    if (method === 'cash') {
      this.paymentReference = this.generateReference('cash');
    } else {
      this.paymentReference = '';
    }
  }

  /**
   * Toggle between full and partial payment
   */
  togglePartialPayment() {
    this.isPartialPayment = !this.isPartialPayment;
    if (!this.isPartialPayment) {
      // Reset to full amount when switching back to full payment
      this.paymentAmount = this.selectedInstallment()?.outstandingAmount || 0;
    } else {
      // Clear amount and focus input when switching to partial payment
      this.paymentAmount = 0;
      setTimeout(() => {
        this.partialAmountInput?.nativeElement.focus();
      }, 100);
    }
  }

  /**
   * Validate payment amount
   */
  isPaymentValid(): boolean {
    if (!this.paymentMethod) return false;
    if (!this.paymentAmount || this.paymentAmount <= 0) return false;
    
    const outstandingAmount = this.selectedInstallment()?.outstandingAmount || 0;
    
    // For partial payments, amount must be less than outstanding
    if (this.isPartialPayment) {
      return this.paymentAmount > 0 && this.paymentAmount < outstandingAmount;
    }
    
    // For full payments, allow the full amount
    return this.paymentAmount > 0;
  }

  /**
   * Add quick note
   */
  addQuickNote(note: string) {
    if (this.paymentNotes) {
      this.paymentNotes += `, ${note}`;
    } else {
      this.paymentNotes = note;
    }
  }

  /**
   * Handle payment method change - auto-generate reference for cash
   */
  onPaymentMethodChange() {
    if (this.paymentMethod === 'cash') {
      this.paymentReference = this.generateReference('cash');
    } else {
      this.paymentReference = '';
    }
  }

  /**
   * Close payment modal
   */
  closePaymentModal() {
    this.showPaymentModal.set(false);
    this.selectedLoan.set(null);
    this.selectedInstallment.set(null);
    this.paymentMethod = 'cash';
    this.paymentAmount = 0;
    this.paymentReference = '';
    this.paymentNotes = '';
    this.isPartialPayment = false;
    this.paymentType = 'installment'; // Reset to default
  }

  /**
   * Generate reference number based on payment method
   */
  private generateReference(method: string): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    
    switch(method) {
      case 'cash':
        return `CASH-${timestamp}-${random}`;
      case 'cheque':
        return this.paymentReference || `CHK-${timestamp}`;
      case 'gcash':
        return this.paymentReference || `GCASH-${timestamp}`;
      default:
        return `REF-${timestamp}`;
    }
  }

  /**
   * Submit payment
   */
  async submitPayment() {
    if (!this.paymentMethod || !this.paymentAmount || this.paymentAmount <= 0) {
      const toast = await this.toastController.create({
        message: 'Please enter a valid payment amount',
        duration: 2000,
        position: 'bottom',
        color: 'warning'
      });
      await toast.present();
      return;
    }

    const outstandingAmount = this.selectedInstallment()?.outstandingAmount || 0;
    const penaltyAmount = this.selectedInstallment()?.penaltyAmount || 0;
    const totalAmount = outstandingAmount + penaltyAmount;

    // Validate payment amount (skip for pay-all which includes penalties)
    if (this.paymentType !== 'full-with-penalty' && this.paymentAmount > outstandingAmount) {
      const toast = await this.toastController.create({
        message: `Payment amount cannot exceed â‚±${this.formatCurrency(outstandingAmount)}`,
        duration: 2000,
        position: 'bottom',
        color: 'warning'
      });
      await toast.present();
      return;
    }
    
    // For pay-all, validate against total (installments + penalties)
    if (this.paymentType === 'full-with-penalty' && this.paymentAmount > totalAmount) {
      const toast = await this.toastController.create({
        message: `Payment amount cannot exceed â‚±${this.formatCurrency(totalAmount)}`,
        duration: 2000,
        position: 'bottom',
        color: 'warning'
      });
      await toast.present();
      return;
    }

    // Auto-generate reference for cash, or use provided reference
    const reference = this.paymentMethod === 'cash' 
      ? this.paymentReference // Already generated on method selection
      : this.paymentReference || this.generateReference(this.paymentMethod);

    const isPartial = this.paymentAmount < outstandingAmount;
    const remainingBalance = outstandingAmount - this.paymentAmount;

    const paymentData = {
      amount: this.paymentAmount,
      paymentMethod: this.paymentMethod,
      reference: reference,
      notes: this.paymentNotes
    };

    console.log('ðŸ’° Recording payment:', paymentData);

    try {
      // Call API to record payment
      const loanId = this.selectedLoan()?.loanId;
      if (!loanId) {
        throw new Error('Loan ID not found');
      }

      // Include loanId in payload to match DTO validation (same as web app)
      const payload = {
        loanId: loanId,
        amount: this.paymentAmount,
        paymentMethod: this.paymentMethod,
        reference: reference,
        notes: this.paymentNotes
      };

      console.log('ðŸ“¤ Payment payload:', payload);

      const response = await lastValueFrom(this.apiService.recordPayment(loanId, payload));
      console.log('âœ… Payment recorded:', response);

      // Show success toast with payment details
      const message = isPartial 
        ? `Partial payment â‚±${this.formatCurrency(this.paymentAmount)} recorded! Remaining: â‚±${this.formatCurrency(remainingBalance)}`
        : `Full payment â‚±${this.formatCurrency(this.paymentAmount)} recorded!`;

      const toast = await this.toastController.create({
        message: `${message}\nRef: ${reference}`,
        duration: 4000,
        position: 'bottom',
        color: 'success',
        icon: 'checkmark-circle-outline'
      });
      await toast.present();

      // Close modal
      this.closePaymentModal();
      
      // Clear cache and reload the specific loan details to refresh schedule and balance
      if (loanId) {
        console.log('ðŸ”„ Clearing cache and reloading loan details for loan', loanId);
        // Clear the cached loan details to force a fresh fetch
        delete this.loanDetailsCache[loanId];
        await this.loadLoanDetails(loanId);
        console.log('âœ… Loan details refreshed');
      }

    } catch (error) {
      console.error('âŒ Failed to record payment:', error);
      const toast = await this.toastController.create({
        message: 'Failed to record payment. Please try again.',
        duration: 3000,
        position: 'bottom',
        color: 'danger'
      });
      await toast.present();
    }
  }

  /**
   * ========================================
   * GRACE PERIOD EXTENSION METHODS
   * ========================================
   */

  /**
   * Check if grace can be extended for a loan
   * For daily schedules, always show the button so collector can extend when they can't come
   */
  canExtendGrace(loan: RouteCustomer): boolean {
    return loan.status !== 'collected' && 
           loan.outstandingBalance > 0;
  }

  /**
   * Open grace extension modal for single customer
   */
  async extendGracePeriod(loan: RouteCustomer, event: Event) {
    event.stopPropagation();
    
    // Auto-load loan details if not already loaded
    let details = this.getLoanDetailsFromCache(loan.loanId);
    if (!details || !details.schedule) {
      const loading = await this.toastController.create({
        message: 'Loading loan details...',
        duration: 2000
      });
      await loading.present();
      
      await this.loadLoanDetails(loan.loanId);
      details = this.getLoanDetailsFromCache(loan.loanId);
      await loading.dismiss();
      
      if (!details || !details.schedule) {
        const toast = await this.toastController.create({
          message: 'Failed to load loan details',
          duration: 2000,
          color: 'danger'
        });
        await toast.present();
        return;
      }
    }

    // Get eligible installments (overdue, pending, or partially paid)
    const eligibleInstallments = details.schedule.filter((inst: any) => 
      inst.status === 'overdue' || 
      inst.status === 'pending' ||
      inst.status === 'partially_paid'
    );

    if (eligibleInstallments.length === 0) {
      const toast = await this.toastController.create({
        message: 'No installments eligible for grace extension',
        duration: 2000,
        color: 'info'
      });
      await toast.present();
      return;
    }

    await this.showGraceExtensionModal(loan, eligibleInstallments);
  }

  /**
   * Show grace extension modal
   */
  async showGraceExtensionModal(loan: RouteCustomer, installments: any[]) {
    const alert = await this.alertController.create({
      header: 'Extend Grace Period',
      subHeader: loan.customerName,
      message: `Current grace: ${loan.gracePeriodDays || 0} days<br>Eligible installments: ${installments.length}`,
      inputs: [
        {
          name: 'extensionDays',
          type: 'number',
          placeholder: 'Additional days (1-7)',
          min: 1,
          max: 7,
          value: 2
        },
        {
          name: 'reason',
          type: 'radio',
          label: 'Heavy rain/flood',
          value: 'weather',
          checked: true
        },
        {
          name: 'reason',
          type: 'radio',
          label: 'Holiday/weekend',
          value: 'holiday'
        },
        {
          name: 'reason',
          type: 'radio',
          label: 'Customer emergency',
          value: 'customer_emergency'
        },
        {
          name: 'reason',
          type: 'radio',
          label: 'Collector emergency',
          value: 'collector_emergency'
        },
        {
          name: 'reason',
          type: 'radio',
          label: 'Road/infrastructure',
          value: 'infrastructure'
        },
        {
          name: 'reason',
          type: 'radio',
          label: 'Goodwill',
          value: 'goodwill'
        },
        {
          name: 'reason',
          type: 'radio',
          label: 'Other',
          value: 'other'
        },
        {
          name: 'detailedReason',
          type: 'textarea',
          placeholder: 'Detailed explanation (required, min 10 chars)'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Select Installments',
          handler: async (data: GraceExtensionFormData) => {
            if (!this.validateGraceExtensionInput(data)) {
              return false;
            }
            await this.showInstallmentSelector(loan, installments, data);
            return false;
          }
        },
        {
          text: 'Apply to All',
          cssClass: 'alert-button-confirm',
          handler: async (data: GraceExtensionFormData) => {
            if (!this.validateGraceExtensionInput(data)) {
              return false;
            }
            return this.submitGraceExtension(loan, installments, data.extensionDays, data.reason, data.detailedReason);
          }
        }
      ],
      cssClass: 'grace-extension-alert'
    });

    await alert.present();
  }

  /**
   * Validate grace extension input
   */
  validateGraceExtensionInput(data: GraceExtensionFormData): boolean {
    if (!data.extensionDays || data.extensionDays < 1 || data.extensionDays > 7) {
      this.toastController.create({
        message: 'Extension must be between 1-7 days',
        duration: 2000,
        color: 'danger'
      }).then(toast => toast.present());
      return false;
    }

    if (!data.detailedReason || data.detailedReason.trim().length < 10) {
      this.toastController.create({
        message: 'Please provide detailed reason (min 10 characters)',
        duration: 2000,
        color: 'danger'
      }).then(toast => toast.present());
      return false;
    }

    return true;
  }

  /**
   * Show installment selector
   */
  async showInstallmentSelector(loan: RouteCustomer, installments: any[], extensionData: GraceExtensionFormData) {
    const alert = await this.alertController.create({
      header: 'Select Installments',
      message: 'Choose which installments to extend',
      inputs: installments.map(inst => ({
        name: `inst_${inst.installmentId}`,
        type: 'checkbox',
        label: `#${inst.installmentNumber} - ₱${this.formatCurrency(inst.outstandingAmount || inst.outstanding_amount)}`,
        value: inst.installmentId || inst.id,
        checked: true
      })),
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Extend Selected',
          handler: async (selectedIds: string[] | undefined) => {
            if (!selectedIds || selectedIds.length === 0) {
              const toast = await this.toastController.create({
                message: 'Please select at least one installment',
                duration: 2000,
                color: 'warning'
              });
              await toast.present();
              return false;
            }

            const selectedInstallments = installments.filter(inst => 
              selectedIds.includes(inst.installmentId || inst.id)
            );

            return this.submitGraceExtension(
              loan,
              selectedInstallments,
              extensionData.extensionDays,
              extensionData.reason,
              extensionData.detailedReason
            );
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Submit grace extension to backend
   */
  async submitGraceExtension(
    loan: RouteCustomer,
    installments: any[],
    extensionDays: number,
    reasonCategory: string,
    detailedReason: string
  ) {
    const loading = await this.toastController.create({
      message: `Extending grace for ${installments.length} installment(s)...`,
      duration: 0
    });
    await loading.present();

    try {
      const promises = installments.map(inst => 
        lastValueFrom(this.apiService.grantGraceExtension({
          loanId: loan.loanId,
          installmentId: inst.installmentId || inst.id,
          extensionDays: parseInt(extensionDays.toString()),
          reasonCategory: reasonCategory,
          detailedReason: detailedReason.trim()
        }))
      );

      const results = await Promise.all(promises);
      await loading.dismiss();

      const needsApproval = results.some(r => r.data?.approvalStatus === 'pending');
      
      if (needsApproval) {
        const toast = await this.toastController.create({
          message: `Grace extension submitted for manager approval (${extensionDays} days)`,
          duration: 4000,
          color: 'warning',
          icon: 'hourglass-outline'
        });
        await toast.present();
      } else {
        const toast = await this.toastController.create({
          message: `Grace extended by ${extensionDays} days for ${installments.length} installment(s)`,
          duration: 4000,
          color: 'success',
          icon: 'checkmark-circle-outline'
        });
        await toast.present();
      }

      // Reload loan details
      delete this.loanDetailsCache[loan.loanId];
      await this.loadLoanDetails(loan.loanId);
      
      return true;
    } catch (error: any) {
      await loading.dismiss();
      console.error('Grace extension error:', error);
      
      const toast = await this.toastController.create({
        message: error.error?.message || 'Failed to extend grace period',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
      
      return false;
    }
  }

  /**
   * Quick "Can't Collect Today" action
   */
  async quickCantCollectToday() {
    const eligibleLoans = this.filteredCustomers().filter(loan => 
      loan.status !== 'collected' && 
      loan.outstandingBalance > 0
    );

    if (eligibleLoans.length === 0) {
      const toast = await this.toastController.create({
        message: 'No customers to extend grace period',
        duration: 2000,
        color: 'info'
      });
      await toast.present();
      return;
    }

    const alert = await this.alertController.create({
      header: 'Cannot Collect Today',
      message: `Extend grace period for ${eligibleLoans.length} customer(s)`,
      inputs: [
        {
          type: 'radio',
          label: 'Heavy rain/typhoon (2 days)',
          value: JSON.stringify({ days: 2, reason: 'weather', detail: 'Heavy rain preventing collection' }),
          checked: true
        },
        {
          type: 'radio',
          label: 'Holiday (1 day)',
          value: JSON.stringify({ days: 1, reason: 'holiday', detail: 'National/local holiday' })
        },
        {
          type: 'radio',
          label: 'Road closed (3 days)',
          value: JSON.stringify({ days: 3, reason: 'infrastructure', detail: 'Road closed due to construction/repair' })
        },
        {
          type: 'radio',
          label: 'Collector sick (2 days)',
          value: JSON.stringify({ days: 2, reason: 'collector_emergency', detail: 'Collector unable to work due to illness' })
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: `Apply to ${eligibleLoans.length} Customer(s)`,
          handler: async (selectedOption: string) => {
            if (!selectedOption) {
              return false;
            }
            const option = JSON.parse(selectedOption) as { days: number; reason: string; detail: string };
            return this.submitBulkGraceExtension(eligibleLoans, option.days, option.reason, option.detail);
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Submit bulk grace extension
   */
  async submitBulkGraceExtension(
    loans: RouteCustomer[],
    extensionDays: number,
    reasonCategory: string,
    detailedReason: string
  ) {
    const loading = await this.toastController.create({
      message: `Processing 0 of ${loans.length} loans...`,
      duration: 0
    });
    await loading.present();

    let successCount = 0;
    let failCount = 0;
    let approvalNeededCount = 0;

    try {
      for (let i = 0; i < loans.length; i++) {
        const loan = loans[i];
        loading.message = `Processing ${i + 1} of ${loans.length} loans...`;

        try {
          let details = this.getLoanDetailsFromCache(loan.loanId);
          if (!details) {
            await this.loadLoanDetails(loan.loanId);
            details = this.getLoanDetailsFromCache(loan.loanId);
          }

          if (!details) {
            failCount++;
            continue;
          }

          const eligibleInstallments = details.schedule?.filter((inst: any) => 
            inst.status === 'overdue' || 
            inst.status === 'pending' ||
            inst.status === 'partially_paid'
          ) || [];

          if (eligibleInstallments.length === 0) {
            failCount++;
            continue;
          }

          const promises = eligibleInstallments.map((inst: any) => 
            lastValueFrom(this.apiService.grantGraceExtension({
              loanId: loan.loanId,
              installmentId: inst.installmentId || inst.id,
              extensionDays: parseInt(extensionDays.toString()),
              reasonCategory: reasonCategory,
              detailedReason: `BULK: ${detailedReason.trim()}`
            }))
          );

          const results = await Promise.all(promises);
          
          if (results.some(r => r.data?.approvalStatus === 'pending')) {
            approvalNeededCount++;
          } else {
            successCount++;
          }

          delete this.loanDetailsCache[loan.loanId];
          await this.loadLoanDetails(loan.loanId);

        } catch (error) {
          console.error(`Failed to extend grace for loan ${loan.loanId}:`, error);
          failCount++;
        }
      }

      await loading.dismiss();

      const alert = await this.alertController.create({
        header: 'Bulk Grace Extension Complete',
        message: `
          Success: ${successCount}
          Pending Approval: ${approvalNeededCount}
          Failed: ${failCount}
        `,
        buttons: ['OK']
      });
      await alert.present();

      await this.loadRouteData();
      return true;

    } catch (error) {
      await loading.dismiss();
      console.error('Bulk grace extension error:', error);
      
      const toast = await this.toastController.create({
        message: 'Failed to process bulk grace extension',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
      
      return false;
    }
  }
}
