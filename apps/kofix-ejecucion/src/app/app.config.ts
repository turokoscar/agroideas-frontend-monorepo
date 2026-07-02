import { authInterceptor, AUTH_TOKEN_KEY } from '@agroideas/auth';
import { STORAGE_KEYS } from '@agroideas/utils';
import { ApplicationConfig, provideZoneChangeDetection, Provider, computed, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';

import { AuthRepository } from './domain/repositories/auth.repository';
import { AuthRepositoryImpl } from './data/repositories/auth.repository.impl';
import { DesembolsoRepository } from './domain/repositories/desembolso.repository';
import { DesembolsoRepositoryImpl } from './data/repositories/desembolso.repository.impl';
import { NoObjecionRepository } from './domain/repositories/no-objecion.repository';
import { NoObjecionRepositoryImpl } from './data/repositories/no-objecion.repository.impl';
import { ProgramacionRepository } from './domain/repositories/programacion.repository';
import { ProgramacionRepositoryImpl } from './data/repositories/programacion.repository.impl';
import { CatalogoRepository } from './domain/repositories/catalogo.repository';
import { CatalogoRepositoryImpl } from './data/repositories/catalogo.repository.impl';
import { ConvenioRepository } from './domain/repositories/convenio.repository';
import { ConvenioRepositoryImpl } from './data/repositories/convenio.repository.impl';
import { RendicionRepository } from './domain/repositories/rendicion.repository';
import { RendicionRepositoryImpl } from './data/repositories/rendicion.repository.impl';
import { MenuRepository } from './domain/repositories/menu.repository';
import { MenuRepositoryImpl } from './data/repositories/menu.repository.impl';
import { CarteraRepository } from './domain/repositories/cartera.repository';
import { CarteraRepositoryImpl } from './data/repositories/cartera.repository.impl';
import { KardexRepository } from './domain/repositories/kardex.repository';
import { KardexRepositoryImpl } from './data/repositories/kardex.repository.impl';

import { USER_PERMISSIONS_PROVIDER } from '@agroideas/security';
import { AUTH_LOGOUT_HANDLER } from '@agroideas/auth';

/**
 * Raíz de composición: enlaza cada token abstracto de repositorio a su
 * implementación. Se usa `useExisting` para reutilizar el singleton
 * `providedIn: 'root'` del impl (una sola instancia), en lugar de `useClass`
 * que crearía una instancia paralela.
 *
 * Los UseCases no se registran aquí: son `@Injectable({ providedIn: 'root' })`
 * y se auto-resuelven. Las páginas/componentes inyectan por token abstracto
 * y NO deben re-proveer estos servicios.
 *
 * Se exporta como constante para reutilizarlo en el test de humo de DI.
 */
export const repositoryProviders: Provider[] = [
  { provide: AuthRepository, useExisting: AuthRepositoryImpl },
  { provide: DesembolsoRepository, useExisting: DesembolsoRepositoryImpl },
  { provide: NoObjecionRepository, useExisting: NoObjecionRepositoryImpl },
  { provide: ProgramacionRepository, useExisting: ProgramacionRepositoryImpl },
  { provide: CatalogoRepository, useExisting: CatalogoRepositoryImpl },
  { provide: ConvenioRepository, useExisting: ConvenioRepositoryImpl },
  { provide: RendicionRepository, useExisting: RendicionRepositoryImpl },
  { provide: MenuRepository, useExisting: MenuRepositoryImpl },
  { provide: CarteraRepository, useExisting: CarteraRepositoryImpl },
  { provide: KardexRepository, useExisting: KardexRepositoryImpl },
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    ...repositoryProviders,
    {
      provide: USER_PERMISSIONS_PROVIDER,
      useFactory: () => {
        const authRepo = inject(AuthRepositoryImpl);
        return {
          permissions: authRepo.userPermissions$,
          userRoles: computed(() => authRepo.user$()?.roles ?? []),
          initialized$: authRepo.permissionsInitialized$
        };
      }
    },
    {
      provide: AUTH_LOGOUT_HANDLER,
      useFactory: (authRepo: AuthRepository) => ({
        logout: () => authRepo.logout()
      }),
      deps: [AuthRepository]
    },
    {
      provide: AUTH_TOKEN_KEY,
      useValue: STORAGE_KEYS.TOKEN
    }
  ]
};

