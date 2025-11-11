import { IsNumber, IsString, IsOptional, IsEnum, IsDateString, Min } from 'class-validator';

// ========== CASHIER OPERATIONS ==========

export class IssueFloatDto {
  @IsNumber()
  @Min(0)
  collectorId: number;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsNumber()
  @Min(0)
  dailyCap: number;

  @IsDateString()
  @IsOptional()
  floatDate?: string; // Defaults to today if not provided

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ConfirmHandoverDto {
  @IsNumber()
  handoverId: number;

  @IsNumber()
  @Min(0)
  actualAmount: number; // Amount actually received by cashier

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ========== COLLECTOR OPERATIONS ==========

export class ConfirmFloatReceiptDto {
  @IsNumber()
  floatId: number;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class RecordCashCollectionDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsNumber()
  loanId: number;

  @IsNumber()
  @IsOptional()
  paymentId?: number; // Link to actual payment record

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RecordCashDisbursementDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsNumber()
  loanId: number;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class InitiateHandoverDto {
  @IsNumber()
  @Min(0)
  actualHandover: number; // Amount collector is returning

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CashAdjustmentDto {
  @IsNumber()
  collectorId: number;

  @IsNumber()
  amount: number; // Can be positive (add) or negative (deduct)

  @IsString()
  reason: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

// ========== QUERY DTOs ==========

export class GetCashBalanceQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string; // Defaults to today
}

export class GetCashFlowHistoryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(['float_received', 'collection', 'disbursement', 'handover', 'adjustment'])
  transactionType?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class GetPendingHandoversDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsNumber()
  collectorId?: number;
}
