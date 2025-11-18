import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { KnexService } from '../../database/knex.service';
import {
  IssueFloatDto,
  ConfirmHandoverDto,
  ConfirmFloatReceiptDto,
  RecordCashCollectionDto,
  RecordCashDisbursementDto,
  InitiateHandoverDto,
  CashAdjustmentDto,
  GetCashFlowHistoryDto,
} from '../dto/collector-cash.dto';

@Injectable()
export class CollectorCashService {
  constructor(private knexService: KnexService) {}

  // ========== CASHIER OPERATIONS ==========

  /**
   * Issue float to collector (Morning operation)
   */
  async issueFloat(tenantId: number, cashierId: number, dto: IssueFloatDto) {
    const knex = this.knexService.instance;
    const floatDate = dto.floatDate || new Date().toISOString().split('T')[0];

    // Check if float already issued for this collector today
    const existingFloat = await knex('money_loan_cash_floats')
      .where({
        tenant_id: tenantId,
        collector_id: dto.collectorId,
        float_date: floatDate,
        type: 'issuance',
      })
      .whereIn('status', ['pending', 'confirmed'])
      .first();

    if (existingFloat) {
      throw new BadRequestException(
        `Float already issued to this collector for ${floatDate}. Status: ${existingFloat.status}`
      );
    }

    // Create float issuance record
    const [floatRecord] = await knex('money_loan_cash_floats')
      .insert({
        tenant_id: tenantId,
        collector_id: dto.collectorId,
        cashier_id: cashierId,
        amount: dto.amount,
        type: 'issuance',
        status: 'pending',
        daily_cap: dto.dailyCap,
        float_date: floatDate,
        issuance_latitude: dto.latitude,
        issuance_longitude: dto.longitude,
        notes: dto.notes,
        cashier_confirmed_at: new Date(),
      })
      .returning('*');

    // Initialize collector balance record
    await knex('money_loan_collector_cash_balances')
      .insert({
        tenant_id: tenantId,
        collector_id: dto.collectorId,
        balance_date: floatDate,
        opening_float: dto.amount,
        current_balance: dto.amount,
        daily_cap: dto.dailyCap,
        available_for_disbursement: Math.min(dto.amount, dto.dailyCap),
        is_float_confirmed: false,
        float_issuance_id: floatRecord.id,
      })
      .onConflict(['tenant_id', 'collector_id', 'balance_date'])
      .merge();

    console.log(`✅ Float issued: ${dto.amount} to collector ${dto.collectorId}`);
    return floatRecord;
  }

  /**
   * Confirm handover receipt from collector (End of day)
   */
  async confirmHandover(tenantId: number, cashierId: number, dto: ConfirmHandoverDto) {
    const knex = this.knexService.instance;

    const handover = await knex('money_loan_cash_floats')
      .where({
        id: dto.handoverId,
        tenant_id: tenantId,
        type: 'handover',
        status: 'pending',
      })
      .first();

    if (!handover) {
      throw new NotFoundException('Handover record not found or already processed');
    }

    // Calculate variance
    const variance = dto.actualAmount - handover.expectedHandover;

    // Update handover record
    await knex('money_loan_cash_floats')
      .where({ id: dto.handoverId })
      .update({
        status: 'confirmed',
        actual_handover: dto.actualAmount,
        variance,
        cashier_confirmed_at: new Date(),
        handover_latitude: dto.latitude,
        handover_longitude: dto.longitude,
        notes: dto.notes || handover.notes,
      });

    // Update balance record
    await knex('money_loan_collector_cash_balances')
      .where({
        tenant_id: tenantId,
        collector_id: handover.collectorId,
        balance_date: handover.floatDate,
      })
      .update({
        is_day_closed: true,
        day_closed_at: new Date(),
        handover_id: dto.handoverId,
      });

    // Log transaction
    await knex('money_loan_cash_transactions').insert({
      tenant_id: tenantId,
      collector_id: handover.collectorId,
      transaction_date: handover.floatDate,
      transaction_type: 'handover',
      amount: dto.actualAmount,
      balance_before: handover.expectedHandover,
      balance_after: 0,
      float_id: dto.handoverId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      notes: `Handover confirmed by cashier. Variance: ${variance}`,
    });

    console.log(`✅ Handover confirmed: ${dto.actualAmount} from collector ${handover.collectorId}`);
    return await this.getHandoverDetails(tenantId, dto.handoverId);
  }

  /**
   * Get pending handovers awaiting cashier confirmation
   */
  async getPendingHandovers(tenantId: number, collectorId?: number) {
    const knex = this.knexService.instance;

    let query = knex('money_loan_cash_floats as cf')
      .select(
        'cf.*',
        'collector.first_name as collector_first_name',
        'collector.last_name as collector_last_name',
        'collector.email as collector_email',
        'cashier.first_name as cashier_first_name',
        'cashier.last_name as cashier_last_name'
      )
      .leftJoin('users as collector', 'cf.collector_id', 'collector.id')
      .leftJoin('users as cashier', 'cf.cashier_id', 'cashier.id')
      .where({
        'cf.tenant_id': tenantId,
        'cf.type': 'handover',
        'cf.status': 'pending',
      })
      .orderBy('cf.created_at', 'asc');

    if (collectorId) {
      query = query.where({ 'cf.collector_id': collectorId });
    }

    return await query;
  }

  // ========== COLLECTOR OPERATIONS ==========

  /**
   * Collector confirms float receipt
   */
  async confirmFloatReceipt(tenantId: number, collectorId: number, dto: ConfirmFloatReceiptDto) {
    const knex = this.knexService.instance;

    const floatRecord = await knex('money_loan_cash_floats')
      .where({
        id: dto.floatId,
        tenant_id: tenantId,
        collector_id: collectorId,
        type: 'issuance',
        status: 'pending',
      })
      .first();

    if (!floatRecord) {
      throw new NotFoundException('Float record not found or already confirmed');
    }

    // Update float record
    await knex('money_loan_cash_floats')
      .where({ id: dto.floatId })
      .update({
        status: 'confirmed',
        collector_confirmed_at: new Date(),
      });

    // Update balance record
    await knex('money_loan_collector_cash_balances')
      .where({
        tenant_id: tenantId,
        collector_id: collectorId,
        balance_date: floatRecord.floatDate,
      })
      .update({
        is_float_confirmed: true,
      });

    // Log transaction
    await knex('money_loan_cash_transactions').insert({
      tenant_id: tenantId,
      collector_id: collectorId,
      transaction_date: floatRecord.floatDate,
      transaction_type: 'float_received',
      amount: floatRecord.amount,
      balance_before: 0,
      balance_after: floatRecord.amount,
      float_id: dto.floatId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      notes: 'Float confirmed by collector',
    });

    console.log(`✅ Float confirmed by collector ${collectorId}: ${floatRecord.amount}`);
    return await this.getCurrentBalance(tenantId, collectorId);
  }

  /**
   * Record cash collection from borrower
   */
  async recordCollection(tenantId: number, collectorId: number, dto: RecordCashCollectionDto) {
    const knex = this.knexService.instance;
    const today = new Date().toISOString().split('T')[0];

    const balance = await this.getCurrentBalance(tenantId, collectorId, today);

    const newBalance = balance.currentBalance + dto.amount;
    const newTotalCollections = balance.totalCollections + dto.amount;

    // Update balance
    await knex('money_loan_collector_cash_balances')
      .where({
        tenant_id: tenantId,
        collector_id: collectorId,
        balance_date: today,
      })
      .update({
        total_collections: newTotalCollections,
        current_balance: newBalance,
      });

    // Log transaction
    await knex('money_loan_cash_transactions').insert({
      tenant_id: tenantId,
      collector_id: collectorId,
      transaction_date: today,
      transaction_type: 'collection',
      amount: dto.amount,
      balance_before: balance.currentBalance,
      balance_after: newBalance,
      loan_id: dto.loanId,
      payment_id: dto.paymentId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      notes: dto.notes || `Collection from loan ${dto.loanId}`,
    });

    console.log(`✅ Collection recorded: ${dto.amount} for loan ${dto.loanId}`);
    return await this.getCurrentBalance(tenantId, collectorId);
  }

  /**
   * Record cash disbursement to borrower
   */
  async recordDisbursement(tenantId: number, collectorId: number, dto: RecordCashDisbursementDto) {
    const knex = this.knexService.instance;
    const today = new Date().toISOString().split('T')[0];

    const balance = await this.getCurrentBalance(tenantId, collectorId, today);

    // SAFETY CHECKS
    if (dto.amount > balance.currentBalance) {
      throw new BadRequestException(
        `Insufficient cash on hand. Available: ₱${balance.currentBalance}, Requested: ₱${dto.amount}`
      );
    }

    const totalDisbursedSoFar = balance.totalDisbursements;
    if (totalDisbursedSoFar + dto.amount > balance.dailyCap) {
      throw new BadRequestException(
        `Daily disbursement cap exceeded. Cap: ₱${balance.dailyCap}, Already disbursed: ₱${totalDisbursedSoFar}, Requested: ₱${dto.amount}`
      );
    }

    const newBalance = balance.currentBalance - dto.amount;
    const newTotalDisbursements = balance.totalDisbursements + dto.amount;
    const remainingCap = balance.dailyCap - newTotalDisbursements;
    const newAvailable = Math.min(newBalance, remainingCap);

    // Update balance
    await knex('money_loan_collector_cash_balances')
      .where({
        tenant_id: tenantId,
        collector_id: collectorId,
        balance_date: today,
      })
      .update({
        total_disbursements: newTotalDisbursements,
        current_balance: newBalance,
        available_for_disbursement: newAvailable,
      });

    // Log transaction
    await knex('money_loan_cash_transactions').insert({
      tenant_id: tenantId,
      collector_id: collectorId,
      transaction_date: today,
      transaction_type: 'disbursement',
      amount: dto.amount,
      balance_before: balance.currentBalance,
      balance_after: newBalance,
      loan_id: dto.loanId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      notes: dto.notes || `Disbursement for loan ${dto.loanId}`,
    });

    console.log(`✅ Disbursement recorded: ${dto.amount} for loan ${dto.loanId}`);
    return await this.getCurrentBalance(tenantId, collectorId);
  }

  /**
   * Initiate end-of-day handover
   */
  async initiateHandover(tenantId: number, collectorId: number, dto: InitiateHandoverDto) {
    const knex = this.knexService.instance;
    const today = new Date().toISOString().split('T')[0];

    const balance = await this.getCurrentBalance(tenantId, collectorId, today);

    if (balance.isDayClosed) {
      throw new BadRequestException('Day already closed for this collector');
    }

    // Calculate expected handover
    const expectedHandover = balance.openingFloat + balance.totalCollections - balance.totalDisbursements;

    // Create handover record
    const [handover] = await knex('money_loan_cash_floats')
      .insert({
        tenant_id: tenantId,
        collector_id: collectorId,
        cashier_id: balance.cashierId, // Same cashier who issued float
        amount: dto.actualHandover,
        type: 'handover',
        status: 'pending',
        float_date: today,
        starting_float: balance.openingFloat,
        collections: balance.totalCollections,
        disbursements: balance.totalDisbursements,
        expected_handover: expectedHandover,
        actual_handover: dto.actualHandover,
        variance: dto.actualHandover - expectedHandover,
        collector_confirmed_at: new Date(),
        issuance_latitude: dto.latitude,
        issuance_longitude: dto.longitude,
        notes: dto.notes,
      })
      .returning('*');

    console.log(`✅ Handover initiated by collector ${collectorId}: ${dto.actualHandover} (expected: ${expectedHandover})`);
    return handover;
  }

  /**
   * Get current cash balance for collector
   */
  async getCurrentBalance(tenantId: number, collectorId: number, date?: string) {
    const knex = this.knexService.instance;
    const balanceDate = date || new Date().toISOString().split('T')[0];

    const balance = await knex('money_loan_collector_cash_balances')
      .where({
        tenant_id: tenantId,
        collector_id: collectorId,
        balance_date: balanceDate,
      })
      .first();

    if (!balance) {
      // Return zero balance if no float issued yet
      return {
        collectorId,
        balanceDate,
        openingFloat: 0,
        totalCollections: 0,
        totalDisbursements: 0,
        currentBalance: 0,
        dailyCap: 0,
        availableForDisbursement: 0,
        isFloatConfirmed: false,
        isDayClosed: false,
      };
    }

    return {
      collectorId: balance.collectorId,
      balanceDate: balance.balanceDate,
      openingFloat: parseFloat(balance.openingFloat),
      totalCollections: parseFloat(balance.totalCollections),
      totalDisbursements: parseFloat(balance.totalDisbursements),
      currentBalance: parseFloat(balance.currentBalance),
      dailyCap: parseFloat(balance.dailyCap),
      availableForDisbursement: parseFloat(balance.availableForDisbursement),
      isFloatConfirmed: balance.isFloatConfirmed,
      isDayClosed: balance.isDayClosed,
      cashierId: balance.cashierId,
    };
  }

  /**
   * Get cash flow transaction history
   */
  async getCashFlowHistory(tenantId: number, collectorId: number, dto: GetCashFlowHistoryDto) {
    const knex = this.knexService.instance;
    const page = dto.page || 1;
    const limit = dto.limit || 50;
    const offset = (page - 1) * limit;

    let query = knex('money_loan_cash_transactions as ct')
      .select(
        'ct.*',
        'l.loan_number'
      )
      .leftJoin('money_loan_loans as l', 'ct.loan_id', 'l.id')
      .where({
        'ct.tenant_id': tenantId,
        'ct.collector_id': collectorId,
      })
      .orderBy('ct.created_at', 'desc');

    if (dto.startDate) {
      query = query.where('ct.transaction_date', '>=', dto.startDate);
    }

    if (dto.endDate) {
      query = query.where('ct.transaction_date', '<=', dto.endDate);
    }

    if (dto.transactionType) {
      query = query.where('ct.transaction_type', dto.transactionType);
    }

    const [countResult] = await query.clone().count('* as total');
    const total = parseInt(countResult.total as string, 10);

    const transactions = await query.limit(limit).offset(offset);

    return {
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get pending float notifications for collector
   */
  async getPendingFloats(tenantId: number, collectorId: number) {
    const knex = this.knexService.instance;

    return await knex('money_loan_cash_floats as cf')
      .select(
        'cf.*',
        'cashier.first_name as cashier_first_name',
        'cashier.last_name as cashier_last_name'
      )
      .leftJoin('users as cashier', 'cf.cashier_id', 'cashier.id')
      .where({
        'cf.tenant_id': tenantId,
        'cf.collector_id': collectorId,
        'cf.type': 'issuance',
        'cf.status': 'pending',
      })
      .orderBy('cf.created_at', 'desc');
  }

  /**
   * Get handover details
   */
  async getHandoverDetails(tenantId: number, handoverId: number) {
    const knex = this.knexService.instance;

    const handover = await knex('money_loan_cash_floats as cf')
      .select(
        'cf.*',
        'collector.first_name as collector_first_name',
        'collector.last_name as collector_last_name',
        'cashier.first_name as cashier_first_name',
        'cashier.last_name as cashier_last_name'
      )
      .leftJoin('users as collector', 'cf.collector_id', 'collector.id')
      .leftJoin('users as cashier', 'cf.cashier_id', 'cashier.id')
      .where({
        'cf.id': handoverId,
        'cf.tenant_id': tenantId,
      })
      .first();

    if (!handover) {
      throw new NotFoundException('Handover record not found');
    }

    return handover;
  }

  /**
   * Get all collectors with their current status
   */
  async getCollectorsCashStatus(tenantId: number, date?: string) {
    const knex = this.knexService.instance;
    const statusDate = date || new Date().toISOString().split('T')[0];

    return await knex('money_loan_collector_cash_balances as cb')
      .select(
        'cb.*',
        'u.first_name',
        'u.last_name',
        'u.email'
      )
      .leftJoin('users as u', 'cb.collector_id', 'u.id')
      .where({
        'cb.tenant_id': tenantId,
        'cb.balance_date': statusDate,
      })
      .orderBy('u.first_name', 'asc');
  }

  /**
   * Get pending floats for cashier (floats awaiting collector confirmation)
   */
  async getPendingFloatsForCashier(tenantId: number) {
    const knex = this.knexService.instance;

    return await knex('money_loan_cash_floats as cf')
      .select(
        'cf.*',
        'collector.first_name as collector_first_name',
        'collector.last_name as collector_last_name',
        'collector.email as collector_email'
      )
      .leftJoin('users as collector', 'cf.collector_id', 'collector.id')
      .where({
        'cf.tenant_id': tenantId,
        'cf.type': 'issuance',
        'cf.status': 'pending',
      })
      .orderBy('cf.created_at', 'desc');
  }

  /**
   * Get pending floats for a specific collector
   */
  async getPendingFloatsForCollector(tenantId: number, collectorId: number) {
    const knex = this.knexService.instance;

    return await knex('money_loan_cash_floats as cf')
      .select(
        'cf.*',
        'cashier.first_name as cashier_first_name',
        'cashier.last_name as cashier_last_name'
      )
      .leftJoin('users as cashier', 'cf.cashier_id', 'cashier.id')
      .where({
        'cf.tenant_id': tenantId,
        'cf.collector_id': collectorId,
        'cf.type': 'issuance',
        'cf.status': 'pending',
      })
      .orderBy('cf.created_at', 'desc');
  }

  /**
   * Get float issuance history
   */
  async getFloatHistory(tenantId: number, fromDate?: string, toDate?: string) {
    const knex = this.knexService.instance;

    let query = knex('money_loan_cash_floats as cf')
      .select(
        'cf.*',
        'collector.first_name as collector_first_name',
        'collector.last_name as collector_last_name',
        'cashier.first_name as cashier_first_name',
        'cashier.last_name as cashier_last_name'
      )
      .leftJoin('users as collector', 'cf.collector_id', 'collector.id')
      .leftJoin('users as cashier', 'cf.cashier_id', 'cashier.id')
      .where({
        'cf.tenant_id': tenantId,
        'cf.type': 'issuance',
      })
      .orderBy('cf.created_at', 'desc');

    if (fromDate) {
      query = query.where('cf.float_date', '>=', fromDate);
    }

    if (toDate) {
      query = query.where('cf.float_date', '<=', toDate);
    }

    return await query;
  }
}
