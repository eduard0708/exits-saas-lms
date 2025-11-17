import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type StatusBadgeVariant =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

@Component({
  selector: 'shared-status-badge',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [attr.class]="badgeClass">
      @if (showDot) {
        <span [attr.class]="dotClass"></span>
      }
      <ng-content></ng-content>
      @if (!hasProjectedContent) {
        {{ label }}
      }
    </span>
  `,
})
export class StatusBadgeComponent {
  @Input() label = '';
  @Input() variant: StatusBadgeVariant = 'neutral';
  @Input() showDot = true;
  @Input() hasProjectedContent = false;

  private readonly baseBadgeClass = 'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide';

  private readonly variantMap: Record<StatusBadgeVariant, string> = {
    neutral: 'border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300',
    success: 'border-emerald-200 text-emerald-700 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200',
    warning: 'border-amber-200 text-amber-700 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200',
    danger: 'border-rose-200 text-rose-700 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200',
    info: 'border-sky-200 text-sky-700 bg-sky-50 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200',
  };

  private readonly dotMap: Record<StatusBadgeVariant, string> = {
    neutral: 'bg-slate-400',
    success: 'bg-emerald-500',
    warning: 'bg-amber-400',
    danger: 'bg-rose-500',
    info: 'bg-sky-500',
  };

  get badgeClass(): string {
    return `${this.baseBadgeClass} ${this.variantMap[this.variant] ?? this.variantMap.neutral}`;
  }

  get dotClass(): string {
    return `mr-1 h-2 w-2 rounded-full ${this.dotMap[this.variant] ?? this.dotMap.neutral}`;
  }
}
