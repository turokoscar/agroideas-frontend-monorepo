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

export abstract class CarteraRepository {
    abstract getCartera(
        busqueda?: string,
        offset?: number,
        limit?: number
    ): Observable<{ items: CarteraItem[], total: number }>;

    abstract getEspecialistas(): Observable<Especialista[]>;

    abstract reasignar(request: ReasignarRequest): Observable<{ exitoso: boolean; mensaje: string }>;
}
