import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { KnexService } from '../../database/knex.service';
import { Knex } from 'knex';

export interface GraceExtensionDto {
  loanIds?: number[];
  extensionDays: number;
  reason: string;
  detailedReason: string;
  mode: 'all' | 'select' | 'date';
  dateFilter?: {
    mode: 'single' | 'range';
    singleDate?: string;
    startDate?: string;
    endDate?: string;
  };
}

@Injectable()
export class CollectorGraceExtensionsService {
  constructor(private knexService: KnexService) {}

  private get knex(): Knex {
    return this.knexService.instance;
  }

  /**
   * Bulk grace extension for multiple loans/customers
   */
  async bulkGraceExtension(
    tenantId: number,
    collectorId: number,
    dto: GraceExtensionDto,
  ) {
    const trx = await this.knex.transaction();

    try {
      // Validate extension days
      if (dto.extensionDays < 1 || dto.extensionDays > 7) {
        throw new BadRequestException('Extension days must be between 1 and 7');
      }

      // Validate reason
      if (!dto.detailedReason || dto.detailedReason.length < 10) {
        throw new BadRequestException('Detailed reason must be at least 10 characters');
      }

      let targetLoans: any[] = [];

      // Get target loans based on mode
      if (dto.mode === 'all') {
        // Get all active loans for this collector using assigned_employee_id
        targetLoans = await trx('money_loan_loans as ml')
          .select('ml.id as loanId', 'ml.customer_id', 'mlp.payment_frequency')
          .join('customers as c', function() {
            this.on('c.id', '=', 'ml.customer_id')
              .andOn('c.tenant_id', '=', 'ml.tenant_id');
          })
          .join('money_loan_products as mlp', 'mlp.id', 'ml.loan_product_id')
          .where('ml.tenant_id', tenantId)
          .where('c.assigned_employee_id', collectorId)
          .whereIn('ml.status', ['active', 'overdue'])
          .andWhere('ml.outstanding_balance', '>', 0);
      } else if (dto.mode === 'select') {
        // Get selected loans
        if (!dto.loanIds || dto.loanIds.length === 0) {
          throw new BadRequestException('No loans selected');
        }

        targetLoans = await trx('money_loan_loans as ml')
          .select('ml.id as loanId', 'ml.customer_id', 'mlp.payment_frequency')
          .join('money_loan_products as mlp', 'mlp.id', 'ml.loan_product_id')
          .where('ml.tenant_id', tenantId)
          .whereIn('ml.id', dto.loanIds)
          .whereIn('ml.status', ['active', 'overdue'])
          .andWhere('ml.outstanding_balance', '>', 0);
      } else if (dto.mode === 'date') {
        // Get loans with installments due on specific date(s)
        const query = trx('money_loan_loans as ml')
          .select(
            'ml.id as loanId',
            'ml.customer_id',
            'mlp.payment_frequency',
            trx.raw('array_agg(DISTINCT mrs.id) as installment_ids')
          )
          .join('money_loan_repayment_schedules as mrs', function() {
            this.on('mrs.loan_id', '=', 'ml.id')
              .andOn('mrs.tenant_id', '=', 'ml.tenant_id');
          })
          .join('customers as c', function() {
            this.on('c.id', '=', 'ml.customer_id')
              .andOn('c.tenant_id', '=', 'ml.tenant_id');
          })
          .join('money_loan_products as mlp', 'mlp.id', 'ml.loan_product_id')
          .where('ml.tenant_id', tenantId)
          .where('c.assigned_employee_id', collectorId)
          .whereIn('ml.status', ['active', 'overdue'])
          .whereIn('mrs.status', ['pending', 'overdue', 'partially_paid'])
          .groupBy('ml.id', 'ml.customer_id', 'mlp.payment_frequency');

        if (dto.dateFilter?.mode === 'single' && dto.dateFilter.singleDate) {
          query.where('mrs.due_date', dto.dateFilter.singleDate);
        } else if (
          dto.dateFilter?.mode === 'range' &&
          dto.dateFilter.startDate &&
          dto.dateFilter.endDate
        ) {
          query.whereBetween('mrs.due_date', [
            dto.dateFilter.startDate,
            dto.dateFilter.endDate,
          ]);
        }

        targetLoans = await query;
      }

      if (targetLoans.length === 0) {
        throw new BadRequestException('No eligible loans found for extension');
      }

      const results = {
        total: targetLoans.length,
        successful: 0,
        failed: 0,
        errors: [] as any[],
      };

      // Process each loan
      for (const loan of targetLoans) {
        try {
          await this.applyGraceExtension(
            trx,
            tenantId,
            loan.loanId,
            loan.customerId,
            loan.payment_frequency,
            dto,
            collectorId,
          );
          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            loanId: loan.loanId,
            error: error.message,
          });
        }
      }

      await trx.commit();

      return {
        success: true,
        message: `Grace extension applied to ${results.successful} loan(s)`,
        results,
      };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Apply grace extension to a specific loan
   */
  private async applyGraceExtension(
    trx: Knex.Transaction,
    tenantId: number,
    loanId: number,
    customerId: number,
    paymentFrequency: string,
    dto: GraceExtensionDto,
    collectorId: number,
  ) {
    // Get loan details
    const loan = await trx('money_loan_loans')
      .where({ tenant_id: tenantId, id: loanId })
      .first();

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    const loanProduct = await trx('money_loan_products')
      .where({ tenant_id: tenantId, id: loan.loan_product_id })
      .first();

    const originalGraceDays = loanProduct?.grace_period_days || 0;

    // Get eligible installments based on payment frequency
    let installments: any[];

    if (paymentFrequency === 'daily') {
      // For daily loans: get all pending/overdue installments
      // Grace extension applies to all upcoming collections
      installments = await trx('money_loan_repayment_schedules')
        .where({ tenant_id: tenantId, loan_id: loanId })
        .whereIn('status', ['pending', 'overdue', 'partially_paid'])
        .orderBy('due_date', 'asc');
    } else {
      // For weekly/monthly: filter by date if provided, otherwise get next pending
      let query = trx('money_loan_repayment_schedules')
        .where({ tenant_id: tenantId, loan_id: loanId })
        .whereIn('status', ['pending', 'overdue', 'partially_paid']);

      if (dto.mode === 'date' && dto.dateFilter) {
        if (dto.dateFilter.mode === 'single' && dto.dateFilter.singleDate) {
          query = query.where('due_date', dto.dateFilter.singleDate);
        } else if (
          dto.dateFilter.mode === 'range' &&
          dto.dateFilter.startDate &&
          dto.dateFilter.endDate
        ) {
          query = query.whereBetween('due_date', [
            dto.dateFilter.startDate,
            dto.dateFilter.endDate,
          ]);
        }
      } else {
        // Get next pending installment
        query = query.orderBy('due_date', 'asc').limit(1);
      }

      installments = await query;
    }

    if (installments.length === 0) {
      throw new BadRequestException('No eligible installments found');
    }

    // Create grace extension records
    const extensionRecords = installments.map((installment) => ({
      tenant_id: tenantId,
      loan_id: loanId,
      installment_id: installment.id,
      customer_id: customerId,
      original_grace_days: originalGraceDays,
      extension_days: dto.extensionDays,
      total_grace_days: originalGraceDays + dto.extensionDays,
      reason_category: dto.reason,
      detailed_reason: dto.detailedReason,
      granted_by: collectorId,
      granted_at: trx.fn.now(),
      approval_status: dto.extensionDays <= 3 ? 'auto_approved' : 'pending',
    }));

    await trx('money_loan_grace_extensions').insert(extensionRecords);

    // Update installments
    const installmentIds = installments.map((i) => i.id);
    await trx('money_loan_repayment_schedules')
      .whereIn('id', installmentIds)
      .update({
        grace_period_extended: true,
        extended_grace_days: dto.extensionDays,
        total_grace_days: originalGraceDays + dto.extensionDays,
        updated_at: trx.fn.now(),
      });

    return {
      loanId,
      installmentsUpdated: installments.length,
      extensionDays: dto.extensionDays,
      totalGraceDays: originalGraceDays + dto.extensionDays,
    };
  }

  /**
   * Get grace extension history for a loan
   */
  async getGraceExtensionHistory(tenantId: number, loanId: number) {
    const extensions = await this.knex('money_loan_grace_extensions as ge')
      .select(
        'ge.*',
        'u.username as granted_by_username',
        'mrs.installment_number',
        'mrs.due_date',
        'mrs.status as installment_status',
      )
      .leftJoin('users as u', 'u.id', 'ge.granted_by')
      .leftJoin(
        'money_loan_repayment_schedules as mrs',
        'mrs.id',
        'ge.installment_id',
      )
      .where('ge.tenant_id', tenantId)
      .where('ge.loan_id', loanId)
      .orderBy('ge.granted_at', 'desc');

    return extensions;
  }

  /**
   * Get collector's extension statistics
   */
  async getCollectorExtensionStats(tenantId: number, collectorId: number) {
    const stats = await this.knex('money_loan_grace_extensions')
      .where({ tenant_id: tenantId, granted_by: collectorId })
      .select(
        this.knex.raw('COUNT(*) as total_extensions'),
        this.knex.raw('SUM(extension_days) as total_days_extended'),
        this.knex.raw('AVG(extension_days) as avg_days_per_extension'),
        this.knex.raw(
          "COUNT(CASE WHEN approval_status = 'auto_approved' THEN 1 END) as auto_approved_count",
        ),
        this.knex.raw(
          "COUNT(CASE WHEN approval_status = 'pending' THEN 1 END) as pending_approval_count",
        ),
      )
      .first();

    const reasonBreakdown = await this.knex('money_loan_grace_extensions')
      .where({ tenant_id: tenantId, granted_by: collectorId })
      .select('reason_category')
      .count('* as count')
      .groupBy('reason_category');

    return {
      ...stats,
      reasonBreakdown,
    };
  }
}
