/**
 * Shared TypeScript Models
 * Inlined for the loanflow app to avoid cross-workspace resolution issues.
 */

// ==================== Money Loan Models ====================

export interface CashFloat {
  id: number;
  collectorId: number;
  collectorName: string;
  floatDate: string;
  floatAmount: number;
  dailyCap: number;
  status: 'pending' | 'confirmed' | 'handed_over';
  issuedAt: string;
  confirmedAt?: string;
  notes?: string;
}

export interface PendingFloat {
  id: number;
  amount: number;
  dailyCap: number;
  floatDate: string;
  cashierFirstName: string;
  cashierLastName: string;
  createdAt: string;
  issuanceLatitude?: number;
  issuanceLongitude?: number;
  notes?: string;
}

export interface CollectorCashBalance {
  collectorId: number;
  collectorName: string;
  balanceDate?: string;
  onHandCash: number;
  openingFloat: number;
  totalCollections: number;
  totalDisbursements: number;
  dailyCap: number;
  availableForDisbursement: number;
  floatConfirmed: boolean;
  lastTransactionTime?: string;
  status: 'active' | 'pending_confirmation' | 'inactive';
}

export interface CashHandover {
  id: number;
  collectorId: number;
  collectorName: string;
  handoverDate: string;
  openingBalance: number;
  totalCollections: number;
  totalDisbursements: number;
  expectedAmount: number;
  actualAmount: number;
  variance: number;
  notes?: string;
  initiatedAt: string;
  confirmedAt?: string;
  status: 'pending' | 'confirmed' | 'rejected';
}

export interface GraceExtension {
  id: number;
  tenantId: number;
  loanId: number;
  installmentId: number;
  customerId: number;
  originalGraceDays: number;
  extensionDays: number;
  totalGraceDays: number;
  newPenaltyStartDate: string;
  reasonCategory:
    | 'weather'
    | 'holiday'
    | 'customer_emergency'
    | 'collector_emergency'
    | 'infrastructure'
    | 'company_policy'
    | 'goodwill'
    | 'other';
  detailedReason: string;
  grantedBy: number;
  grantedAt: string;
  approvalStatus: 'auto_approved' | 'pending' | 'approved' | 'rejected';
  paymentMadeWithinExtension: boolean;
  actualPaymentDate?: string;
}

export interface Loan {
  id: number;
  loanNumber: string;
  customerId: number;
  customerName?: string;
  productId: number;
  principalAmount: number;
  interestRate: number;
  loanTerm: number;
  loanTermUnit: 'days' | 'weeks' | 'months' | 'years';
  disbursementDate: string;
  maturityDate: string;
  status: 'pending' | 'approved' | 'disbursed' | 'active' | 'paid' | 'overdue' | 'defaulted' | 'rejected';
  assignedCollectorId?: number;
  assignedCollectorName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  middleName?: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  status: 'active' | 'inactive' | 'blacklisted';
  createdAt: string;
}

export interface Payment {
  id: number;
  loanId: number;
  amount: number;
  paymentDate: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'gcash' | 'paymaya' | 'check' | 'other';
  collectedBy?: number;
  collectorName?: string;
  notes?: string;
  createdAt: string;
}

// ==================== API Response Wrappers ====================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ==================== Dashboard Stats ====================

export interface CashierStats {
  pendingFloats: number;
  pendingHandovers: number;
  totalCashOut: number;
  activeCollectors: number;
}

export interface CollectorStats {
  onHandCash: number;
  collectionsToday: number;
  disbursementsToday: number;
  routesCompleted: number;
  pendingCollections: number;
}

// ==================== User & Auth ====================

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
  tenantId: number;
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  user: User;
}
