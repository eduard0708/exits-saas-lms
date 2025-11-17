import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'outline' | 'ghost';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

@Component({
  selector: 'shared-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'inline-flex',
  },
  template: `
    <button
      [attr.type]="type"
      [disabled]="disabled || loading"
      [attr.class]="buttonClass"
    >
      @if (loading) {
        <span class="mr-2 inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-r-transparent"></span>
      }
      <ng-content></ng-content>
    </button>
  `,
})
export class SharedButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() fullWidth = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() loading = false;

  private readonly baseClass = 'inline-flex items-center justify-center rounded-xl font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

  private readonly variantClassMap: Record<ButtonVariant, string> = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:outline-indigo-600',
    secondary: 'bg-slate-800 text-white hover:bg-slate-700 focus-visible:outline-slate-800',
    success: 'bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:outline-emerald-600',
    danger: 'bg-rose-600 text-white hover:bg-rose-500 focus-visible:outline-rose-600',
  warning: 'bg-amber-500 text-white hover:bg-amber-400 focus-visible:outline-amber-600',
  info: 'bg-purple-600 text-white hover:bg-purple-500 focus-visible:outline-purple-600',
    outline: 'border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-50 focus-visible:outline-slate-400',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:outline-slate-400',
  };

  private readonly sizeClassMap: Record<ButtonSize, string> = {
    xs: 'text-xs px-3 py-1 min-h-[28px]',
    sm: 'text-sm px-3 py-1.5 min-h-[32px]',
    md: 'text-sm px-4 py-2 min-h-[36px]',
    lg: 'text-base px-5 py-2.5 min-h-[44px]',
  };

  get buttonClass(): string {
    const variantClass = this.variantClassMap[this.variant] ?? this.variantClassMap.primary;
    const sizeClass = this.sizeClassMap[this.size] ?? this.sizeClassMap.md;
    const widthClass = this.fullWidth ? 'w-full' : '';
    return `${this.baseClass} ${variantClass} ${sizeClass} ${widthClass}`.trim();
  }
}
