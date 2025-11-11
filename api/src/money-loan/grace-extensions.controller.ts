import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  UseGuards,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import {
  CollectorGraceExtensionsService,
  GraceExtensionDto,
} from './services/collector-grace-extensions.service';

@Controller('money-loan/grace-extensions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class GraceExtensionsController {
  constructor(
    private readonly graceExtensionsService: CollectorGraceExtensionsService,
  ) {}

  /**
   * Bulk grace extension - all, select, or by date
   */
  @Post('bulk')
  @Permissions('money-loan:collector:grace-extension')
  async bulkGraceExtension(@Req() req: any, @Body() dto: GraceExtensionDto) {
    const tenantId = req.user?.tenantId;
    const collectorId = req.user?.id;

    if (!tenantId || !collectorId) {
      throw new BadRequestException('Tenant and collector context required');
    }

    return this.graceExtensionsService.bulkGraceExtension(
      tenantId,
      collectorId,
      dto,
    );
  }

  /**
   * Get grace extension history for a loan
   */
  @Get('loan/:loanId')
  @Permissions('money-loan:loans:read')
  async getGraceExtensionHistory(
    @Req() req: any,
    @Param('loanId', ParseIntPipe) loanId: number,
  ) {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      throw new BadRequestException('Tenant context required');
    }

    const history = await this.graceExtensionsService.getGraceExtensionHistory(
      tenantId,
      loanId,
    );

    return {
      success: true,
      data: history,
    };
  }

  /**
   * Get collector's grace extension statistics
   */
  @Get('collector/:collectorId/stats')
  @Permissions('money-loan:collector:read')
  async getCollectorExtensionStats(
    @Req() req: any,
    @Param('collectorId', ParseIntPipe) collectorId: number,
  ) {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      throw new BadRequestException('Tenant context required');
    }

    const stats = await this.graceExtensionsService.getCollectorExtensionStats(
      tenantId,
      collectorId,
    );

    return {
      success: true,
      data: stats,
    };
  }
}
