import { Controller, Post, Get, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CollectorCashService } from '../services/collector-cash.service';
import {
  IssueFloatDto,
  ConfirmHandoverDto,
  ConfirmFloatReceiptDto,
  RecordCashCollectionDto,
  RecordCashDisbursementDto,
  InitiateHandoverDto,
  GetCashFlowHistoryDto,
} from '../dto/collector-cash.dto';

@Controller('money-loan/cash')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CollectorCashController {
  constructor(private collectorCashService: CollectorCashService) {}

  // ========== CASHIER/MANAGER OPERATIONS ==========

  /**
   * Issue float to collector (Morning operation)
   * POST /api/money-loan/cash/issue-float
   */
  @Post('issue-float')
  @Permissions('money-loan:cash:issue')
  async issueFloat(@Req() req: any, @Body() dto: IssueFloatDto) {
    const float = await this.collectorCashService.issueFloat(
      req.user.tenantId,
      req.user.id,
      dto
    );
    return {
      success: true,
      message: `Float of ₱${dto.amount} issued to collector successfully`,
      data: float,
    };
  }

  /**
   * Confirm handover receipt from collector (End of day)
   * PUT /api/money-loan/cash/confirm-handover
   */
  @Put('confirm-handover')
  @Permissions('money-loan:cash:receive')
  async confirmHandover(@Req() req: any, @Body() dto: ConfirmHandoverDto) {
    const handover = await this.collectorCashService.confirmHandover(
      req.user.tenantId,
      req.user.id,
      dto
    );
    return {
      success: true,
      message: `Handover of ₱${dto.actualAmount} confirmed successfully`,
      data: handover,
    };
  }

  /**
   * Get pending handovers awaiting confirmation
   * GET /api/money-loan/cash/pending-handovers
   */
  @Get('pending-handovers')
  @Permissions('money-loan:cash:read')
  async getPendingHandovers(
    @Req() req: any,
    @Query('collectorId') collectorId?: string
  ) {
    const handovers = await this.collectorCashService.getPendingHandovers(
      req.user.tenantId,
      collectorId ? parseInt(collectorId) : undefined
    );
    return {
      success: true,
      data: handovers,
    };
  }

  /**
   * Get all collectors cash status (Dashboard view)
   * GET /api/money-loan/cash/collectors-status
   */
  @Get('collectors-status')
  @Permissions('money-loan:cash:read')
  async getCollectorsCashStatus(
    @Req() req: any,
    @Query('date') date?: string
  ) {
    const status = await this.collectorCashService.getCollectorsCashStatus(
      req.user.tenantId,
      date
    );
    return {
      success: true,
      data: status,
    };
  }

  // ========== COLLECTOR OPERATIONS ==========

  /**
   * Confirm float receipt (Collector accepts float)
   * POST /api/money-loan/cash/confirm-float
   */
  @Post('confirm-float')
  @Permissions('money-loan:collector')
  async confirmFloatReceipt(@Req() req: any, @Body() dto: ConfirmFloatReceiptDto) {
    const balance = await this.collectorCashService.confirmFloatReceipt(
      req.user.tenantId,
      req.user.id,
      dto
    );
    return {
      success: true,
      message: 'Float confirmed successfully',
      data: balance,
    };
  }

  /**
   * Record cash collection from borrower
   * POST /api/money-loan/cash/record-collection
   */
  @Post('record-collection')
  @Permissions('money-loan:collector')
  async recordCollection(@Req() req: any, @Body() dto: RecordCashCollectionDto) {
    const balance = await this.collectorCashService.recordCollection(
      req.user.tenantId,
      req.user.id,
      dto
    );
    return {
      success: true,
      message: `Collection of ₱${dto.amount} recorded successfully`,
      data: balance,
    };
  }

  /**
   * Record cash disbursement to borrower
   * POST /api/money-loan/cash/record-disbursement
   */
  @Post('record-disbursement')
  @Permissions('money-loan:collector')
  async recordDisbursement(@Req() req: any, @Body() dto: RecordCashDisbursementDto) {
    const balance = await this.collectorCashService.recordDisbursement(
      req.user.tenantId,
      req.user.id,
      dto
    );
    return {
      success: true,
      message: `Disbursement of ₱${dto.amount} recorded successfully`,
      data: balance,
    };
  }

  /**
   * Initiate end-of-day handover
   * POST /api/money-loan/cash/initiate-handover
   */
  @Post('initiate-handover')
  @Permissions('money-loan:collector')
  async initiateHandover(@Req() req: any, @Body() dto: InitiateHandoverDto) {
    const handover = await this.collectorCashService.initiateHandover(
      req.user.tenantId,
      req.user.id,
      dto
    );
    return {
      success: true,
      message: 'Handover initiated successfully. Awaiting cashier confirmation.',
      data: handover,
    };
  }

  /**
   * Get current cash balance
   * GET /api/money-loan/cash/balance
   */
  @Get('balance')
  @Permissions('money-loan:collector', 'money-loan:cash:read')
  async getCurrentBalance(
    @Req() req: any,
    @Query('date') date?: string,
    @Query('collectorId') collectorId?: string
  ) {
    const targetCollectorId = collectorId ? parseInt(collectorId) : req.user.id;
    
    // If not querying own balance, require admin permission
    if (targetCollectorId !== req.user.id && !req.user.permissions?.includes('money-loan:cash:read')) {
      return {
        success: false,
        message: 'Unauthorized to view other collectors balance',
      };
    }

    const balance = await this.collectorCashService.getCurrentBalance(
      req.user.tenantId,
      targetCollectorId,
      date
    );
    return {
      success: true,
      data: balance,
    };
  }

  /**
   * Get cash flow transaction history
   * GET /api/money-loan/cash/history
   */
  @Get('history')
  @Permissions('money-loan:collector', 'money-loan:cash:read')
  async getCashFlowHistory(
    @Req() req: any,
    @Query() dto: GetCashFlowHistoryDto,
    @Query('collectorId') collectorId?: string
  ) {
    const targetCollectorId = collectorId ? parseInt(collectorId) : req.user.id;
    
    // If not querying own history, require admin permission
    if (targetCollectorId !== req.user.id && !req.user.permissions?.includes('money-loan:cash:read')) {
      return {
        success: false,
        message: 'Unauthorized to view other collectors history',
      };
    }

    const history = await this.collectorCashService.getCashFlowHistory(
      req.user.tenantId,
      targetCollectorId,
      dto
    );
    return {
      success: true,
      ...history,
    };
  }

  /**
   * Get pending float notifications for collector
   * GET /api/money-loan/cash/pending-floats
   */
  @Get('pending-floats')
  @Permissions('money-loan:collector')
  async getPendingFloats(@Req() req: any) {
    const floats = await this.collectorCashService.getPendingFloats(
      req.user.tenantId,
      req.user.id
    );
    return {
      success: true,
      data: floats,
    };
  }

  /**
   * Get handover details
   * GET /api/money-loan/cash/handover/:id
   */
  @Get('handover/:id')
  @Permissions('money-loan:collector', 'money-loan:cash:read')
  async getHandoverDetails(@Req() req: any, @Param('id') id: string) {
    const handover = await this.collectorCashService.getHandoverDetails(
      req.user.tenantId,
      parseInt(id)
    );
    return {
      success: true,
      data: handover,
    };
  }
}
