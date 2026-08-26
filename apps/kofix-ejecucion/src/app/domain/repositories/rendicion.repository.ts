import { Observable } from 'rxjs';
import { GastoF1, Rendicion, RendicionDetalle, RendicionRequest, RendicionListResponse } from '../models/rendicion.model';

export abstract class RendicionRepository {
    abstract getByConvenio(postulanteId: number, offset: number, limit: number, sunatCpeId?: number, numeroSolicitud?: string): Observable<RendicionListResponse>;
    abstract getById(id: number): Observable<RendicionDetalle>;
    abstract create(request: RendicionRequest): Observable<any>;
    abstract update(id: number, request: RendicionRequest): Observable<any>;
    abstract delete(id: number): Observable<any>;
    abstract uploadFile(file: File): Observable<{ fileUrl: string }>;
    abstract downloadFile(fileUrl: string): Observable<Blob>;
    abstract getPendientes(postulanteId: number): Observable<any[]>;
    abstract getGastosF1(postulanteId: number): Observable<GastoF1[]>;
}
