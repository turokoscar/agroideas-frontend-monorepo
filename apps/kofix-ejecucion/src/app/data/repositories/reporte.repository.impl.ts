import { ResponseDto } from '@agroideas/utils';
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ArchivoReporte, FormatoReporteAvance, ReporteRepository } from '../../domain/repositories/reporte.repository';
import { ReporteAvance } from '../../domain/models/reporte/reporte-avance.model';

/** Extrae el nombre del archivo de Content-Disposition (RFC 5987 filename* o filename clásico). */
export const extraerNombreArchivo = (contentDisposition: string | null, porDefecto: string): string => {
    if (!contentDisposition) return porDefecto;
    const utf8 = /filename\*=UTF-8''([^;\s]+)/i.exec(contentDisposition);
    if (utf8?.[1]) {
        try {
            return decodeURIComponent(utf8[1]);
        } catch {
            return utf8[1];
        }
    }
    const clasico = /filename="?([^";]+)"?/i.exec(contentDisposition);
    return clasico?.[1]?.trim() || porDefecto;
};

@Injectable({ providedIn: 'root' })
export class ReporteRepositoryImpl extends ReporteRepository {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiEjecucion}/reportes`;

    override getAvanceMensual(fechaInicio: string, fechaFin: string): Observable<ReporteAvance> {
        const params = new HttpParams().set('fechaInicio', fechaInicio).set('fechaFin', fechaFin);
        return this.http.get<ResponseDto<ReporteAvance>>(`${this.apiUrl}/avance-mensual`, { params }).pipe(
            map(res => res.datos as ReporteAvance)
        );
    }

    override descargarAvanceMensual(fechaInicio: string, fechaFin: string, formato: FormatoReporteAvance): Observable<ArchivoReporte> {
        const params = new HttpParams().set('fechaInicio', fechaInicio).set('fechaFin', fechaFin);
        const ext = formato === 'excel' ? 'xlsx' : 'pdf';
        const porDefecto = `avance-mensual_${fechaInicio}_${fechaFin}.${ext}`;

        return this.http.get(`${this.apiUrl}/avance-mensual/${formato}`, {
            params,
            observe: 'response',
            responseType: 'blob'
        }).pipe(
            map(res => ({
                blob: res.body as Blob,
                nombreArchivo: extraerNombreArchivo(res.headers.get('Content-Disposition'), porDefecto)
            }))
        );
    }
}
