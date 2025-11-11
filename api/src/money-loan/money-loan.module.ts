import { Module } from '@nestjs/common';
import { MoneyLoanController } from './money-loan.controller';
import { MoneyLoanTenantController } from './money-loan-tenant.controller';
import { MoneyLoanService } from './money-loan.service';
import { CollectorsController } from './collectors.controller';
import { CollectorActionsController } from './collector-actions.controller';
import { CollectorManagementController } from './collector-management.controller';
import { CollectorAssignmentService } from './services/collector-assignment.service';
import { CollectorApplicationsService } from './services/collector-applications.service';
import { CollectorDisbursementsService } from './services/collector-disbursements.service';
import { CollectorPenaltyWaiversService } from './services/collector-penalty-waivers.service';
import { CollectorVisitsService } from './services/collector-visits.service';
import { CollectorGraceExtensionsService } from './services/collector-grace-extensions.service';
import { CollectorCashService } from './services/collector-cash.service';
import { GraceExtensionsController } from './grace-extensions.controller';
import { CollectorCashController } from './controllers/collector-cash.controller';
import { CollectorGuard } from '../common/guards/collector.guard';
import { KnexModule } from '../database/knex.module';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [KnexModule, RbacModule],
  controllers: [
    MoneyLoanController,
    MoneyLoanTenantController,
    CollectorsController,
    CollectorActionsController,
    CollectorManagementController,
    GraceExtensionsController,
    CollectorCashController,
  ],
  providers: [
    MoneyLoanService,
    CollectorAssignmentService,
    CollectorApplicationsService,
    CollectorDisbursementsService,
    CollectorPenaltyWaiversService,
    CollectorVisitsService,
    CollectorGraceExtensionsService,
    CollectorCashService,
    CollectorGuard,
  ],
  exports: [MoneyLoanService],
})
export class MoneyLoanModule {}
