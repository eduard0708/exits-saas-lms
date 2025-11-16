# Reusable UI Components Guide

This guide explains how to use the reusable UI components created from the Transaction History page pattern.

## Components Overview

1. **PageHeaderComponent** - Consistent page headers with icon, title, and description
2. **StatCardComponent** - Stat/metric cards with icons and values
3. **SharedButtonComponent** - Consistent button system with variants, sizes, and loading state
4. **FilterSectionComponent** - Comprehensive filter section with search, selects, dates, and pagination
5. **DataTableComponent** - Feature-rich data table with sorting, selection, loading states, and custom templates

---

## 1. PageHeaderComponent

### Basic Usage

```typescript
import { PageHeaderComponent } from '@app/shared/components/ui';

@Component({
  imports: [PageHeaderComponent],
  template: `
    <app-page-header
      icon="🧾"
      title="Transaction History"
      description="View all your subscription payments and transactions"
    />
  `
})
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | string | '📄' | Emoji or icon to display |
| `title` | string | '' | Main heading text |
| `description` | string | '' | Subtitle/description text |

---

## 2. StatCardComponent

### Basic Usage

```typescript
import { StatCardComponent } from '@shared/ui';

@Component({
  imports: [StatCardComponent],
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <shared-stat-card
        title="Total"
        [value]="totalCount"
        subtitle="Overall records"
        variant="default">
        <span icon>📊</span>
      </shared-stat-card>

      <shared-stat-card
        title="Completed"
        [value]="completedCount"
        subtitle="Approved items"
        variant="success">
        <span icon>✅</span>
      </shared-stat-card>

      <shared-stat-card
        title="Pending"
        [value]="pendingCount"
        subtitle="Waiting for review"
        variant="warning">
        <span icon>⏳</span>
      </shared-stat-card>

      <shared-stat-card
        title="Failed"
        [value]="failedCount"
        subtitle="Requires attention"
        variant="danger">
        <span icon>❌</span>
      </shared-stat-card>
    </div>
  `
})
```

### Inputs

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | string | '' | Heading text rendered in uppercase style |
| `value` | string \| number | '' | Primary value displayed in large font |
| `valuePrelude` | string | undefined | Optional text rendered before the value (e.g., currency symbol) |
| `valueSuffix` | string | undefined | Optional text rendered after the value (e.g., % sign) |
| `subtitle` | string | '' | Secondary description below the value |
| `trendLabel` | string | undefined | Short label for trend data (e.g., "vs yesterday") |
| `trendValue` | string | undefined | Trend numeric/string value |
| `trendDirection` | 'up' \| 'down' \| 'neutral' | 'neutral' | Controls the color of the trend text |
| `variant` | 'default' \| 'success' \| 'warning' \| 'danger' \| 'info' | 'default' | Applies matching border & icon colors |

> **Icon slot:** place any markup inside `<span icon>...</span>` to render a custom emoji, SVG, or icon component inside the stat card's icon container.

---

## 3. SharedButtonComponent

### Basic Usage

```typescript
import { SharedButtonComponent } from '@shared/ui';

@Component({
  standalone: true,
  imports: [SharedButtonComponent],
  template: `
    <div class="flex flex-wrap gap-3">
      <shared-button variant="primary" size="md">
        Create Record
      </shared-button>
      <shared-button variant="warning" size="lg" class="gap-2">
        <span>⚠️</span>
        Review Pending Items
      </shared-button>
      <shared-button variant="info" size="sm" [loading]="isSyncing">
        Sync Balances
      </shared-button>
      <shared-button variant="outline" size="sm" [fullWidth]="true">
        Secondary Action
      </shared-button>
    </div>
  `
})
export class ActionsComponent {
  isSyncing = false;
}
```

The `cashier-dashboard.component.ts` quick actions now use this component exclusively so admin shortcuts inherit the same hover/focus feel as the collector mobile app.

### Inputs

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | 'primary' \| 'secondary' \| 'success' \| 'danger' \| 'warning' \| 'info' \| 'outline' \| 'ghost' | 'primary' | Controls background/border styles |
| `size` | 'xs' \| 'sm' \| 'md' \| 'lg' | 'md' | Adjusts padding and font size |
| `fullWidth` | boolean | false | Stretch button to 100% width |
| `type` | 'button' \| 'submit' \| 'reset' | 'button' | Underlying `<button>` type |
| `disabled` | boolean | false | Explicitly disable the button |
| `loading` | boolean | false | Shows spinner + disables button |

> **Tip:** Apply utility classes (e.g., `class="gap-2"`) on `<shared-button>` when pairing emojis/icons with text.

---

## 4. FilterSectionComponent

### Basic Usage

```typescript
import { FilterSectionComponent, FilterConfig } from '@app/shared/components/ui';

export class MyComponent {
  filterConfig: FilterConfig[] = [
    {
      type: 'search',
      label: '🔍 Search',
      placeholder: 'Search transactions...',
      modelKey: 'search'
    },
    {
      type: 'select',
      label: 'Status',
      modelKey: 'status',
      options: [
        { value: 'all', label: 'All Status' },
        { value: 'completed', label: 'Completed' },
        { value: 'pending', label: 'Pending' },
        { value: 'failed', label: 'Failed' }
      ]
    },
    {
      type: 'select',
      label: 'Type',
      modelKey: 'type',
      options: [
        { value: 'all', label: 'All Types' },
        { value: 'subscription', label: 'Subscription' },
        { value: 'payment', label: 'Payment' }
      ]
    },
    {
      type: 'date',
      label: 'Date',
      modelKey: 'date'
    }
  ];

  currentPage = 1;
  totalPages = 10;
  pageSize = 10;

  onFilterChange(filters: any) {
    console.log('Filters changed:', filters);
    // Apply filters to your data
  }

  onClearFilters() {
    console.log('Filters cleared');
    // Reset your data
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    // Reload data with new page size
  }

  onPageChange(page: number) {
    this.currentPage = page;
    // Load new page
  }
}

@Component({
  imports: [FilterSectionComponent],
  template: `
    <app-filter-section
      [filters]="filterConfig"
      [currentPage]="currentPage"
      [totalPages]="totalPages"
      [pageSize]="pageSize"
      [showPageSize]="true"
      [showPagination]="true"
      (filterChange)="onFilterChange($event)"
      (clearFilters)="onClearFilters()"
      (pageSizeChange)="onPageSizeChange($event)"
      (pageChange)="onPageChange($event)"
    />
  `
})
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `filters` | FilterConfig[] | [] | Array of filter configurations |
| `showPageSize` | boolean | true | Show page size selector |
| `showPagination` | boolean | true | Show pagination controls |
| `currentPage` | number | 1 | Current page number |
| `totalPages` | number | 1 | Total number of pages |
| `pageSize` | number | 10 | Items per page |
| `pageSizeOptions` | number[] | [10, 25, 50, 100] | Page size options |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `filterChange` | Object | Emitted when any filter changes |
| `clearFilters` | void | Emitted when clear filters is clicked |
| `pageSizeChange` | number | Emitted when page size changes |
| `pageChange` | number | Emitted when page changes |

---

## 5. DataTableComponent

### Basic Usage

```typescript
import { DataTableComponent, TableColumn } from '@app/shared/components/ui';

export class MyComponent {
  columns: TableColumn[] = [
    {
      key: 'description',
      label: 'Description',
      icon: '📝',
      sortable: true,
      type: 'text'
    },
    {
      key: 'type',
      label: 'Type',
      icon: '🏷️',
      sortable: true,
      type: 'badge',
      getBadgeClass: (value) => 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
    },
    {
      key: 'amount',
      label: 'Amount',
      icon: '💰',
      sortable: true,
      type: 'number',
      align: 'right',
      format: (value) => `₱${value.toFixed(2)}`
    },
    {
      key: 'status',
      label: 'Status',
      icon: '🔘',
      sortable: true,
      type: 'badge',
      getBadgeClass: (status) => {
        switch (status) {
          case 'completed':
            return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
          case 'pending':
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
          case 'failed':
            return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
          default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
      },
      format: (value) => value.charAt(0).toUpperCase() + value.slice(1)
    },
    {
      key: 'date',
      label: 'Date',
      icon: '📅',
      sortable: true,
      type: 'date',
      format: (date) => new Date(date).toLocaleDateString()
    }
  ];

  data = [
    { id: 1, description: 'Monthly subscription', type: 'subscription', amount: 999, status: 'completed', date: new Date() },
    { id: 2, description: 'Upgrade to Pro', type: 'upgrade', amount: 1999, status: 'pending', date: new Date() }
  ];

  selectedIds = new Set<number>();
  selectAll = false;
  loading = false;
  sortColumn = 'date';
  sortDirection: 'asc' | 'desc' = 'desc';

  onSelectionChange(ids: Set<number>) {
    this.selectedIds = ids;
  }

  onSelectAllChange(value: boolean) {
    this.selectAll = value;
    if (value) {
      this.selectedIds = new Set(this.data.map(item => item.id));
    } else {
      this.selectedIds = new Set();
    }
  }

  onSortChange(event: { column: string; direction: 'asc' | 'desc' }) {
    this.sortColumn = event.column;
    this.sortDirection = event.direction;
    // Apply sorting to your data
  }

  exportCSV() {
    console.log('Export selected:', Array.from(this.selectedIds));
  }
}

@Component({
  imports: [DataTableComponent],
  template: `
    <app-data-table
      [columns]="columns"
      [data]="data"
      [loading]="loading"
      [selectable]="true"
      [selectedIds]="selectedIds"
      [selectAll]="selectAll"
      [sortColumn]="sortColumn"
      [sortDirection]="sortDirection"
      rowIdKey="id"
      emptyIcon="🔍"
      emptyTitle="No transactions found"
      emptyMessage="Try adjusting your filters"
      (selectionChange)="onSelectionChange($event)"
      (selectAllChange)="onSelectAllChange($event)"
      (sortChange)="onSortChange($event)"
    >
      <!-- Bulk Actions -->
      <ng-container bulkActions>
        <button (click)="exportCSV()" class="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium">
          <span>📊</span> Export CSV
        </button>
      </ng-container>

      <!-- Empty State Actions -->
      <ng-container emptyActions>
        <button class="px-4 py-2 text-xs bg-blue-50 rounded">
          Clear Filters
        </button>
      </ng-container>
    </app-data-table>
  `
})
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | TableColumn[] | [] | Column configurations |
| `data` | any[] | [] | Table data |
| `loading` | boolean | false | Show loading skeleton |
| `selectable` | boolean | false | Enable row selection |
| `rowIdKey` | string | 'id' | Property to use as row identifier |
| `selectedIds` | Set<any> | new Set() | Set of selected IDs |
| `selectAll` | boolean | false | Select all state |
| `sortColumn` | string \| null | null | Currently sorted column |
| `sortDirection` | 'asc' \| 'desc' | 'desc' | Sort direction |
| `emptyIcon` | string | '🔍' | Icon for empty state |
| `emptyTitle` | string | 'No data found' | Title for empty state |
| `emptyMessage` | string | 'Try adjusting your filters' | Message for empty state |
| `showFooter` | boolean | false | Show footer section |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `selectionChange` | Set<any> | Emitted when selection changes |
| `selectAllChange` | boolean | Emitted when select all changes |
| `sortChange` | { column: string; direction: 'asc' \| 'desc' } | Emitted when sort changes |

### Content Projection

- `[bulkActions]` - Custom bulk action buttons
- `[emptyActions]` - Custom actions in empty state
- `[footer]` - Custom footer content

---

## Complete Example

Here's how to combine all components to create a page like Transaction History:

```typescript
import { Component, signal, computed } from '@angular/core';
import { StatCardComponent } from '@shared/ui';
import { 
  PageHeaderComponent, 
  FilterSectionComponent, 
  DataTableComponent,
  FilterConfig,
  TableColumn 
} from '@app/shared/components/ui';

@Component({
  selector: 'app-my-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    StatCardComponent,
    FilterSectionComponent,
    DataTableComponent
  ],
  template: `
    <div class="space-y-4 p-6">
      <!-- Header -->
      <app-page-header
        icon="🧾"
        title="My Data Page"
        description="Manage your data efficiently"
      />

      <!-- Stats -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <shared-stat-card
          title="Total"
          [value]="stats.total"
          subtitle="Overall records"
        >
          <span icon>📊</span>
        </shared-stat-card>
        <shared-stat-card
          title="Active"
          [value]="stats.active"
          subtitle="Currently available"
          variant="success"
        >
          <span icon>✅</span>
        </shared-stat-card>
      </div>

      <!-- Filters -->
      <app-filter-section
        [filters]="filterConfig"
        [currentPage]="currentPage"
        [totalPages]="totalPages"
        [pageSize]="pageSize"
        (filterChange)="onFilterChange($event)"
        (clearFilters)="onClearFilters()"
        (pageSizeChange)="onPageSizeChange($event)"
        (pageChange)="onPageChange($event)"
      />

      <!-- Table -->
      <app-data-table
        [columns]="columns"
        [data]="paginatedData"
        [loading]="loading"
        [selectable]="true"
        [selectedIds]="selectedIds"
        [selectAll]="selectAll"
        [sortColumn]="sortColumn"
        [sortDirection]="sortDirection"
        (selectionChange)="onSelectionChange($event)"
        (selectAllChange)="onSelectAllChange($event)"
        (sortChange)="onSortChange($event)"
      >
        <ng-container bulkActions>
          <button (click)="exportSelected()">Export</button>
        </ng-container>
      </app-data-table>
    </div>
  `
})
export class MyPageComponent {
  // Component logic here
}
```

---

## Styling Customization

All components use Tailwind CSS and support dark mode. You can customize:

1. **Colors**: Modify the color classes in props
2. **Spacing**: Adjust padding/margin in parent containers
3. **Borders**: Override border classes
4. **Shadows**: Change shadow utilities

Example:

```html
<shared-stat-card
  title="Custom"
  [value]="42"
  valuePrelude="~"
  subtitle="Example styling"
  variant="info"
>
  <span icon>🎨</span>
</shared-stat-card>
```

---

## Best Practices

1. **Use signals** for reactive state management
2. **Keep data fetching** in parent components
3. **Use computed signals** for derived state (filtering, sorting)
4. **Leverage content projection** for custom content
5. **Follow the established patterns** for consistency

---

## Migration Tips

To migrate an existing page:

1. Replace custom header HTML with `<app-page-header>`
2. Convert stat cards to `<shared-stat-card>` components
3. Extract filter logic to use `<app-filter-section>`
4. Migrate table to `<app-data-table>` with column configs
5. Move sorting/filtering to parent component logic
6. Use signals for reactive state

This ensures a consistent, maintainable UI across your application!
