import { Observable } from 'rxjs';
import { Rendicion, RendicionRequest, RendicionListResponse } from '../models/rendicion.model';

export abstract class RendicionRepository {
    abstract getByConvenio(postulanteId: number, offset: number, limit: number, sunatCpeId?: number, numeroSolicitud?: string): Observable<RendicionListResponse>;
    abstract create(request: RendicionRequest): Observable<any>;
    abstract update(id: number, request: RendicionRequest): Observable<any>;
    abstract delete(id: number): Observable<any>;
    abstract uploadFile(file: File): Observable<{ fileUrl: string }>;
    abstract getPendientes(postulanteId: number): Observable<any[]>;
}
