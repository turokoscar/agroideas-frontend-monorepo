import { ResponseDto } from '@agroideas/utils';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CartaBorrador, CartaEmision, CartaHistorial, CartaNoObjecion } from '../../domain/models/carta-no-objecion.model';
import { CartaNoObjecionRepository } from '../../domain/repositories/carta-no-objecion.repository';
import { FileStorageService } from '../../shared/services/file-storage.service';

@Injectable({ providedIn: 'root' })
export class CartaNoObjecionRepositoryImpl extends CartaNoObjecionRepository {
    private http = inject(HttpClient);
    private archivos = inject(FileStorageService);

    private url(noObjecionId: number): string {
        return `${environment.apiEjecucion}/no-objeciones/${noObjecionId}`;
    }

    override get(noObjecionId: number): Observable<CartaNoObjecion> {
        return this.http.get<ResponseDto<CartaNoObjecion>>(`${this.url(noObjecionId)}/carta`).pipe(
            map(r => r.datos as CartaNoObjecion));
    }

    override getHistorial(noObjecionId: number): Observable<CartaHistorial[]> {
        return this.http.get<ResponseDto<CartaHistorial[]>>(`${this.url(noObjecionId)}/cartas`).pipe(
            map(r => r.datos ?? []));
    }

    override guardar(noObjecionId: number, borrador: CartaBorrador): Observable<void> {
        return this.http.put<ResponseDto>(`${this.url(noObjecionId)}/carta`, borrador).pipe(map(() => undefined));
    }

    override generar(noObjecionId: number): Observable<Blob> {
        return this.http.post(`${this.url(noObjecionId)}/carta/word`, {}, { responseType: 'blob' });
    }

    override emitir(noObjecionId: number, emision: CartaEmision): Observable<{ mensaje?: string }> {
        return this.http.post<ResponseDto>(`${this.url(noObjecionId)}/carta/emision`, emision);
    }

    override anular(noObjecionId: number, justificacion: string): Observable<{ mensaje?: string }> {
        return this.http.post<ResponseDto>(`${this.url(noObjecionId)}/carta/anulacion`, { justificacion });
    }

    override subir(archivo: File): Observable<{ fileUrl: string }> {
        return this.archivos.uploadFile(archivo, 'no-objeciones');
    }

    override descargar(ideArchivo: string): Observable<Blob> {
        return this.archivos.downloadFile(ideArchivo);
    }
}
