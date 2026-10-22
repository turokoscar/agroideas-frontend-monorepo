import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { registerLocaleData } from '@angular/common';
import localeEsPe from '@angular/common/locales/es-PE';

import { appRoutes } from './app.routes';
import { AuthService } from './core/services/auth.service';
import { authInterceptor, AUTH_LOGOUT_HANDLER } from '@agroideas/auth';

// es-PE, igual que sigec-rtf y kofix-ejecucion: días y meses en español ("jue 01/01/2026", "setiembre") y montos
// con coma de miles y punto decimal. Afecta a todos los pipes date/number/percent.
registerLocaleData(localeEsPe);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    { provide: LOCALE_ID, useValue: 'es-PE' },
    {
      provide: AUTH_LOGOUT_HANDLER,
      useFactory: (authService: AuthService) => ({
        logout: () => authService.logout()
      }),
      deps: [AuthService]
    }
  ],
};
