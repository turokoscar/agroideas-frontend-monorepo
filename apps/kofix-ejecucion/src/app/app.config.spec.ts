import { ProviderToken } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { repositoryProviders } from './app.config';

import { AuthRepository } from './domain/repositories/auth.repository';
import { DesembolsoRepository } from './domain/repositories/desembolso.repository';
import { NoObjecionRepository } from './domain/repositories/no-objecion.repository';
import { ProgramacionRepository } from './domain/repositories/programacion.repository';
import { CatalogoRepository } from './domain/repositories/catalogo.repository';
import { ConvenioRepository } from './domain/repositories/convenio.repository';
import { RendicionRepository } from './domain/repositories/rendicion.repository';
import { MenuRepository } from './domain/repositories/menu.repository';
import { CarteraRepository } from './domain/repositories/cartera.repository';
import { KardexRepository } from './domain/repositories/kardex.repository';

import { LoginUseCase } from './domain/usecases/auth/login.usecase';
import { GetCatalogoUseCase } from './domain/usecases/catalogo/get-catalogo.usecase';
import { GetDesembolsosByConvenioUseCase } from './domain/usecases/desembolso/get-desembolsos.usecase';
import { RegistrarDesembolsoUseCase } from './domain/usecases/desembolso/registrar-desembolso.usecase';
import { GetAsignadosUseCase } from './domain/usecases/get-asignados.usecase';
import { GetConvenioByIdUseCase } from './domain/usecases/get-convenio-by-id.usecase';
import { GetTodosConveniosUseCase } from './domain/usecases/get-todos-convenios.usecase';
import { GetVigenteConveniosUseCase } from './domain/usecases/get-vigente-convenios.usecase';
import { GetNoObjecionesByConvenioUseCase } from './domain/usecases/no-objecion/get-no-objeciones.usecase';
import { SaveNoObjecionUseCase } from './domain/usecases/no-objecion/save-no-objecion.usecase';
import { GetProgramacionResumenUseCase } from './domain/usecases/programacion/get-programacion-resumen.usecase';
import { GetProgramacionByConvenioUseCase } from './domain/usecases/programacion/get-programacion.usecase';
import { SaveProgramacionUseCase } from './domain/usecases/programacion/save-programacion.usecase';
import { DeleteRendicionUseCase } from './domain/usecases/rendicion/delete-rendicion.usecase';
import { GetPendientesRendicionUseCase } from './domain/usecases/rendicion/get-pendientes-rendicion.usecase';
import { GetRendicionesByConvenioUseCase } from './domain/usecases/rendicion/get-rendiciones.usecase';
import { RegistrarRendicionUseCase } from './domain/usecases/rendicion/registrar-rendicion.usecase';
import { UpdateRendicionUseCase } from './domain/usecases/rendicion/update-rendicion.usecase';
import { UploadFileUseCase } from './domain/usecases/rendicion/upload-file.usecase';

/**
 * Test de humo del grafo de DI: arranca el inyector raíz con el MISMO wiring
 * de producción (repositoryProviders) y verifica que cada token de repositorio
 * y cada UseCase resuelve. Un binding mal escrito o un UseCase sin
 * `@Injectable({ providedIn: 'root' })` haría fallar este test, algo que la
 * compilación no detecta.
 */
describe('DI wiring (app.config)', () => {
    const repositories: ProviderToken<unknown>[] = [
        AuthRepository,
        DesembolsoRepository,
        NoObjecionRepository,
        ProgramacionRepository,
        CatalogoRepository,
        ConvenioRepository,
        RendicionRepository,
        MenuRepository,
        CarteraRepository,
        KardexRepository,
    ];

    const useCases: ProviderToken<unknown>[] = [
        LoginUseCase,
        GetCatalogoUseCase,
        GetDesembolsosByConvenioUseCase,
        RegistrarDesembolsoUseCase,
        GetAsignadosUseCase,
        GetConvenioByIdUseCase,
        GetTodosConveniosUseCase,
        GetVigenteConveniosUseCase,
        GetNoObjecionesByConvenioUseCase,
        SaveNoObjecionUseCase,
        GetProgramacionResumenUseCase,
        GetProgramacionByConvenioUseCase,
        SaveProgramacionUseCase,
        DeleteRendicionUseCase,
        GetPendientesRendicionUseCase,
        GetRendicionesByConvenioUseCase,
        RegistrarRendicionUseCase,
        UpdateRendicionUseCase,
        UploadFileUseCase,
    ];

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting(), ...repositoryProviders],
        });
    });

    for (const token of repositories) {
        it(`resuelve el repositorio ${(token as { name: string }).name}`, () => {
            expect(TestBed.inject(token)).toBeTruthy();
        });
    }

    for (const token of useCases) {
        it(`resuelve el usecase ${(token as { name: string }).name}`, () => {
            expect(TestBed.inject(token)).toBeTruthy();
        });
    }
});
