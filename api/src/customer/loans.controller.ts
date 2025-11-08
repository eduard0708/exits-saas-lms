import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { KnexService } from '../database/knex.service';

@Controller('loans')
export class LoansController {
  constructor(
    private customerService: CustomerService,
    private knexService: KnexService,
  ) {}

  @Get('customer/:id')
  async getCustomerLoans(@Param('id') id: string) {
    // Get customer's tenant_id first
    const loans = await this.customerService.getLoansById(parseInt(id));
    return loans;
  }
}

@Controller('loan-products')
export class LoanProductsController {
  constructor(private knexService: KnexService) {}

  private transformProductFields(product: any) {
    // Knex already converts snake_case to camelCase via postProcessResponse
    // So we just return the product with proper field selection
    return {
      id: product.id,
      tenantId: product.tenantId,
      productCode: product.productCode,
      name: product.name,
      description: product.description,
      minAmount: product.minAmount,
      maxAmount: product.maxAmount,
      interestRate: product.interestRate,
      interestType: product.interestType,
      loanTermType: product.loanTermType,
      fixedTermDays: product.fixedTermDays,
      minTermDays: product.minTermDays,
      maxTermDays: product.maxTermDays,
      processingFeePercent: product.processingFeePercent,
      platformFee: product.platformFee,
      latePaymentPenaltyPercent: product.latePaymentPenaltyPercent,
      gracePeriodDays: product.gracePeriodDays,
      paymentFrequency: product.paymentFrequency,
      isActive: product.isActive,
      deductPlatformFeeInAdvance: product.deductPlatformFeeInAdvance ?? false,
      deductProcessingFeeInAdvance: product.deductProcessingFeeInAdvance ?? false,
      deductInterestInAdvance: product.deductInterestInAdvance ?? false,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  @Get()
  async getLoanProducts() {
    const knex = this.knexService.instance;
    
    // Get all active loan products - Public endpoint for customer browsing
    const products = await knex('money_loan_products')
      .select('*')
      .where({ is_active: true })
      .orderBy('created_at', 'desc');

    console.log(`📦 Fetched ${products.length} loan products (all tenants)`);
    
    // Transform database fields to camelCase
    const transformed = products.map(product => this.transformProductFields(product));
    
    return transformed;
  }

  @Get('tenant/:tenantId')
  async getLoanProductsByTenant(
    @Param('tenantId') tenantId: string,
    @Query('customerId') customerIdStr?: string
  ) {
    const knex = this.knexService.instance;
    const customerId = customerIdStr ? parseInt(customerIdStr, 10) : undefined;
    
    console.log('🔵 [LOAN-PRODUCTS CONTROLLER] getLoanProductsByTenant called');
    console.log('   - tenantId:', tenantId);
    console.log('   - customerId from query:', customerIdStr);
    console.log('   - customerId parsed:', customerId);
    
    const products = await knex('money_loan_products')
      .select(
        'id',
        'tenant_id',
        'product_code',
        'name',
        'description',
        'min_amount',
        'max_amount',
        'interest_rate',
        'interest_type',
        'loan_term_type',
        'fixed_term_days',
        'min_term_days',
        'max_term_days',
        'processing_fee_percent',
        'platform_fee',
        'late_payment_penalty_percent',
        'grace_period_days',
        'payment_frequency',
        'is_active',
        'availability_type',
        'deduct_platform_fee_in_advance',
        'deduct_processing_fee_in_advance',
        'deduct_interest_in_advance',
        'created_at',
        'updated_at'
      )
      .where({ 
        tenant_id: parseInt(tenantId),
        is_active: true 
      })
      .orderBy('created_at', 'desc');

    console.log(`📦 [LOAN-PRODUCTS] Fetched ${products.length} loan products from DB for tenant ${tenantId}`);
    console.log(`📦 [LOAN-PRODUCTS] Full product object keys:`, products.map(p => ({ id: p.id, name: p.name, keys: Object.keys(p) })));
    console.log(`📦 [LOAN-PRODUCTS] Checking availability_type field:`, products.map(p => ({ 
      id: p.id, 
      name: p.name, 
      snake: p['availability_type'],
      camel: p['availabilityType']
    })));
    
    // Transform database fields to camelCase with proper formatting
    const transformed = await Promise.all(products.map(async (product) => {
      const baseProduct = this.transformProductFields(product);
      
      // Get availability_type from snake_case column (Knex doesn't auto-convert)
      const availType = product.availability_type || product.availabilityType || 'all';
      
      console.log(`🔍 Product ${product.id} availability_type check:`, {
        snake_case: product.availability_type,
        camelCase: product.availabilityType,
        final: availType
      });
      
      // Add availability fields
      let selectedCustomerIds: number[] = [];
      if (availType === 'selected') {
        const assignments = await knex('money_loan_product_customers')
          .where('product_id', product.id)
          .pluck('customer_id');
        selectedCustomerIds = assignments;
        console.log(`   📋 Product ${product.id} assigned to customers:`, selectedCustomerIds);
      }
      
      return {
        ...baseProduct,
        availabilityType: availType,
        selectedCustomerIds,
      };
    }));
    
    console.log('🔄 [LOAN-PRODUCTS] Transformed products:', transformed.map(p => ({ id: p.id, name: p.name, availabilityType: p.availabilityType, selectedCustomerIds: p.selectedCustomerIds })));
    
    // Filter by customer availability if customerId is provided
    if (customerId) {
      console.log('🔍 [LOAN-PRODUCTS] FILTERING for customer ID:', customerId);
      
      const filtered = transformed.filter(product => {
        if (product.availabilityType === 'all') {
          console.log(`   ✅ Product "${product.name}" (ID: ${product.id}) INCLUDED - availabilityType='all'`);
          return true;
        }
        
        if (product.availabilityType === 'selected') {
          const isAvailable = product.selectedCustomerIds.includes(customerId);
          console.log(`   ${isAvailable ? '✅' : '❌'} Product "${product.name}" (ID: ${product.id}) ${isAvailable ? 'INCLUDED' : 'EXCLUDED'} - selectedCustomerIds=[${product.selectedCustomerIds}], looking for ${customerId}`);
          return isAvailable;
        }
        
        console.log(`   ⚠️  Product "${product.name}" (ID: ${product.id}) INCLUDED - unknown availabilityType: ${product.availabilityType}`);
        return true;
      });
      
      console.log('🟢 [LOAN-PRODUCTS] Filtered products count:', filtered.length);
      console.log('🟢 [LOAN-PRODUCTS] Returning filtered products:', filtered.map(p => ({ id: p.id, name: p.name })));
      return filtered;
    }
    
    console.log('🟢 [LOAN-PRODUCTS] NO FILTER - Returning all products count:', transformed.length);
    return transformed;
  }
}
