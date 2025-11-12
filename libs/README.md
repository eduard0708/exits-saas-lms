# 📚 Shared Libraries - Simple Monorepo

## Structure

```
libs/
├── shared-models/      ← TypeScript interfaces & types
├── shared-api/         ← API services & utilities  
└── shared-ui/          ← Reusable components (future)
```

## Usage

### Import Models
```typescript
import type { CashFloat, CollectorCashBalance } from '@shared/models';
```

### Use API Services
```typescript
import { CashFloatApiService, formatCurrency } from '@shared/api';

constructor(private cashFloatApi: CashFloatApiService) {}

ngOnInit() {
  this.cashFloatApi.getCashierStats().subscribe(stats => {
    console.log(formatCurrency(stats.total_cash_out));
  });
}
```

## What's Available

### Models (`@shared/models`)
- `CashFloat` - Float issuance data
- `CollectorCashBalance` - Real-time balances
- `CashHandover` - End-of-day handovers
- `GraceExtension` - Grace period extensions
- `Loan`, `Customer`, `Payment` - Core entities
- `ApiResponse<T>`, `PaginatedResponse<T>` - API wrappers
- `CashierStats`, `CollectorStats` - Dashboard stats

### API Services (`@shared/api`)
- `CashFloatApiService` - All cash float endpoints
- `GraceExtensionApiService` - Grace extension endpoints
- `formatCurrency()` - Format PHP amounts
- `formatDate()` - Format dates
- `formatTime()` - Format times

## Example: Migrating a Component

**Before:**
```typescript
import { HttpClient } from '@angular/common/http';

interface CashFloat {
  id: number;
  // ... copied interface
}

constructor(private http: HttpClient) {}

loadData() {
  this.http.get<CashFloat[]>('/api/money-loan/cash/pending').subscribe(...);
}
```

**After:**
```typescript
import { CashFloatApiService } from '@shared/api';
import type { CashFloat } from '@shared/models';

constructor(private cashFloatApi: CashFloatApiService) {}

loadData() {
  this.cashFloatApi.getPendingConfirmations().subscribe(...);
}
```

## Benefits

✅ No code duplication between web and loanflow  
✅ Type-safe API calls  
✅ Single source of truth for models  
✅ Easy to maintain and update  
✅ No complex tooling (just TypeScript path aliases)

## Next Steps

1. Gradually migrate components to use shared libs
2. Remove duplicate interfaces from components
3. Replace direct HttpClient calls with service methods
4. Add more shared utilities as needed

**Note:** This is a simple approach using TypeScript path aliases. No Nx, no complex build system. Just clean, shareable code!
