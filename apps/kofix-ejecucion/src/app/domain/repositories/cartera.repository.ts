import { Observable } from 'rxjs';
import { CarteraItem } from '../models/cartera.model';

export interface Especialista {
    id: number;
    nombresCompletos: string;
    email: string;
    dni: string;
    rol: string;
}

export interface ReasignarRequest {
    postulanteId: number;
    nuevoEspecialistaId: number;
    observacion?: string;
}

export interface CarteraFiltros {
    departamentoCodigo?: string;
    provinciaCodigo?: string;
    distritoCodigo?: string;
    especialistaId?: number;
}

export type NivelUbigeo = 'DEPARTAMENTO' | 'PROVINCIA' | 'DISTRITO';

export interface Ubigeo {
    codigo: string;
    nombre: string;
}

export abstract class CarteraRepository {
    abstract getCartera(
        busqueda?: string,
        offset?: number,
        limit?: number,
        filtros?: CarteraFiltros
    ): Observable<{ items: CarteraItem[], total: number }>;

    abstract getEspecialistas(): Observable<Especialista[]>;

    abstract getUbigeos(nivel: NivelUbigeo, padre?: string): Observable<Ubigeo[]>;

    abstract reasignar(request: ReasignarRequest): Observable<{ exitoso: boolean; mensaje: string }>;
}
