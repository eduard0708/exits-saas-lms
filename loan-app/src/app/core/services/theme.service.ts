import { Injectable, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

export type ThemeVariant = 'emerald' | 'night' | 'corporate' | 'business' | 'luxury';

const STORAGE_KEY = 'theme';
const AVAILABLE_THEMES: ThemeVariant[] = ['emerald', 'night', 'corporate', 'business', 'luxury'];
const FALLBACK_THEME: ThemeVariant = 'corporate';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly currentTheme = signal<ThemeVariant>(FALLBACK_THEME);

  constructor() {
    this.applyTheme(FALLBACK_THEME);
    void this.initializeTheme();
  }

  private isValidTheme(theme: unknown): theme is ThemeVariant {
    return typeof theme === 'string' && (AVAILABLE_THEMES as string[]).includes(theme);
  }

  private getSystemTheme(): ThemeVariant {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'night' : 'corporate';
    }
    return FALLBACK_THEME;
  }

  async initializeTheme(): Promise<void> {
    const saved = await Preferences.get({ key: STORAGE_KEY });
    let theme: ThemeVariant | null = null;

    if (this.isValidTheme(saved.value)) {
      theme = saved.value;
    } else if (typeof window !== 'undefined') {
      const stored = window.localStorage?.getItem(STORAGE_KEY);
      if (this.isValidTheme(stored)) {
        theme = stored;
      }
    }

    this.setTheme(theme ?? this.getSystemTheme(), false);
  }

  getThemes(): ThemeVariant[] {
    return [...AVAILABLE_THEMES];
  }

  getTheme(): ThemeVariant {
    return this.currentTheme();
  }

  setTheme(theme: ThemeVariant, persist = true): void {
    if (!AVAILABLE_THEMES.includes(theme)) {
      return;
    }

    this.currentTheme.set(theme);
    this.applyTheme(theme);

    if (persist) {
      Preferences.set({ key: STORAGE_KEY, value: theme });
      if (typeof window !== 'undefined') {
        window.localStorage?.setItem(STORAGE_KEY, theme);
      }
    }
  }

  private applyTheme(theme: ThemeVariant): void {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;
    const body = document.body;
    root.setAttribute('data-theme', theme);
    body?.setAttribute('data-theme', theme);

    const isDarkTheme = theme === 'night' || theme === 'business';
    root.classList.toggle('dark', isDarkTheme);
  }

  toggleTheme(): void {
    const themes = AVAILABLE_THEMES;
    const index = themes.indexOf(this.currentTheme());
    const next = themes[(index + 1) % themes.length];
    this.setTheme(next);
  }

  isDark(): boolean {
    return this.currentTheme() === 'night' || this.currentTheme() === 'business';
  }
}
