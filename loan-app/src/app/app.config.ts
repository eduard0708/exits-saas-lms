import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { routes } from './app.routes';
import { authInterceptorFn } from './core/interceptors/auth.interceptor.fn';
import { LucideAngularModule } from 'lucide-angular';
import { LUCIDE_ICONS } from './config/lucide.icons';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptorFn])),
    provideAnimations(),
    provideIonicAngular(),
    importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS))
  ]
};
