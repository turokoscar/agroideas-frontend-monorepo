import { Observable } from 'rxjs';
import { NoObjecion, NoObjecionBalance } from '../models/no-objecion.model';
import { NoObjecionProgrammedItem } from '../models/no-objecion-programmed-item.model';

export abstract class NoObjecionRepository {
    abstract getById(id: number): Observable<NoObjecion>;
    abstract getByPostulante(postulanteId: number, offset?: number, limit?: number, numero?: string, fechaInicio?: string, fechaFin?: string): Observable<{ items: NoObjecion[], total: number }>;
    abstract create(noObjecion: NoObjecion): Observable<any>;
    abstract update(id: number, noObjecion: NoObjecion): Observable<any>;
    abstract delete(id: number): Observable<any>;
    abstract getBalances(postulanteId: number): Observable<Record<string, NoObjecionBalance>>;
    abstract getProgrammedItemsWithBalance(postulanteId: number, includeItemIds?: number[]): Observable<NoObjecionProgrammedItem[]>;
    abstract getItemsParaDesembolso(postulanteId: number): Observable<any[]>;
    abstract uploadFile(file: File): Observable<{ fileUrl: string }>;
    abstract downloadFile(fileUrl: string): Observable<Blob>;
    abstract getBandejaAprobacion(estado: string, offset?: number, limit?: number): Observable<{ items: any[], total: number }>;
    abstract evaluar(id: number, estado: string, observacion: string): Observable<any>;
}
