import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type StatCardVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

@Component({
  selector: 'shared-stat-card',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [attr.class]="containerClass">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {{ title }}
          </p>
          <p class="text-2xl font-bold text-slate-900 dark:text-white">
            @if (valuePrelude) { {{ valuePrelude }} }
            {{ value }}
            @if (valueSuffix) { {{ valueSuffix }} }
          </p>
        </div>
        <div [attr.class]="iconClass">
          <ng-content select="[icon]"></ng-content>
        </div>
      </div>

      <div class="mt-3 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>{{ subtitle }}</span>
        @if (trendLabel || trendValue) {
          <span [attr.class]="trendTextClass">
            {{ trendLabel }} {{ trendValue }}
          </span>
        }
      </div>
    </div>
  `,
})
export class StatCardComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) value!: string | number;
  @Input() valuePrelude?: string;
  @Input() valueSuffix?: string;
  @Input() subtitle = '';
  @Input() trendLabel?: string;
  @Input() trendValue?: string;
  @Input() trendDirection: 'up' | 'down' | 'neutral' = 'neutral';
  @Input() variant: StatCardVariant = 'default';

  private readonly baseContainerClass = 'rounded-2xl border bg-white/90 p-4 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900/70';
  private readonly baseIconClass = 'flex h-12 w-12 items-center justify-center rounded-2xl text-2xl';

  private readonly variantBorderMap: Record<StatCardVariant, string> = {
    default: 'border-slate-200',
    success: 'border-emerald-200',
    warning: 'border-amber-200',
    danger: 'border-rose-200',
    info: 'border-sky-200',
  };

  private readonly variantIconMap: Record<StatCardVariant, string> = {
    default: 'bg-slate-100 text-slate-600',
    success: 'bg-emerald-100 text-emerald-600',
    warning: 'bg-amber-100 text-amber-600',
    danger: 'bg-rose-100 text-rose-600',
    info: 'bg-sky-100 text-sky-600',
  };

  get containerClass(): string {
    return `${this.baseContainerClass} ${this.variantBorderMap[this.variant] ?? this.variantBorderMap.default}`;
  }

  get iconClass(): string {
    return `${this.baseIconClass} ${this.variantIconMap[this.variant] ?? this.variantIconMap.default}`;
  }

  get trendTextClass(): string {
    const base = 'font-semibold';
    switch (this.trendDirection) {
      case 'up':
        return `${base} text-emerald-600`;
      case 'down':
        return `${base} text-rose-600`;
      default:
        return `${base} text-slate-500`;
    }
  }
}
