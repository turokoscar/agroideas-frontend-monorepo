import { ResponseDto } from '@agroideas/utils';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EvaluacionCabecera, EvaluacionDetalle, EvaluacionEnvio, EvaluacionNoObjecion, EvaluacionPropuestas, EvaluacionResumen, aSolicitud, soloFecha } from '../../domain/models/evaluacion-no-objecion.model';
import { EvaluacionNoObjecionRepository } from '../../domain/repositories/evaluacion-no-objecion.repository';
import { FileStorageService } from '../../shared/services/file-storage.service';

const FECHAS: (keyof EvaluacionCabecera)[] = [
    'fechaCartaOa', 'fechaRecepcion', 'fechaInformeProveedor', 'fechaInformeInfraestructura', 'fechaCartaObservaciones',
    'fechaLevantamiento'
];

@Injectable({ providedIn: 'root' })
export class EvaluacionNoObjecionRepositoryImpl extends EvaluacionNoObjecionRepository {
    private http = inject(HttpClient);
    private archivos = inject(FileStorageService);
    private apiUrl = `${environment.apiEjecucion}/evaluaciones-no-objecion`;

    override getByPostulante(postulanteId: number): Observable<EvaluacionResumen[]> {
        return this.http.get<ResponseDto<EvaluacionResumen[]>>(`${this.apiUrl}/postulante/${postulanteId}`).pipe(
            map(r => r.datos ?? []));
    }

    override get(id: number): Observable<EvaluacionDetalle> {
        return this.http.get<ResponseDto<EvaluacionDetalle>>(`${this.apiUrl}/${id}`).pipe(map(r => {
            const detalle = r.datos as EvaluacionDetalle;
            const cabecera = detalle.evaluacion as unknown as Record<string, string | null>;
            for (const campo of FECHAS) cabecera[campo] = soloFecha(cabecera[campo]);
            // La API omite los nulos: los selectores necesitan el null explícito.
            detalle.evaluacion.cargoEvaluador ??= null;
            for (const i of detalle.evaluacion.items) i.resultado ??= null;
            for (const c of detalle.evaluacion.cotizaciones) {
                c.fechaCotizacion = soloFecha(c.fechaCotizacion);
                for (const p of c.precios) p.cumple ??= null;
            }
            return detalle;
        }));
    }

    override getPropuestas(id: number): Observable<EvaluacionPropuestas> {
        return this.http.get<ResponseDto<EvaluacionPropuestas>>(`${this.apiUrl}/${id}/propuestas`).pipe(
            map(r => r.datos as EvaluacionPropuestas));
    }

    override crear(postulanteId: number): Observable<number> {
        return this.http.post<ResponseDto<{ id: number }>>(this.apiUrl, { postulanteId }).pipe(
            map(r => (r.datos as { id: number }).id));
    }

    override guardar(evaluacion: EvaluacionNoObjecion): Observable<number> {
        return this.http.put<ResponseDto<{ version: number }>>(`${this.apiUrl}/${evaluacion.id}`, aSolicitud(evaluacion))
            .pipe(map(r => (r.datos as { version: number }).version));
    }

    override eliminar(id: number): Observable<void> {
        return this.http.delete<ResponseDto>(`${this.apiUrl}/${id}`).pipe(map(() => undefined));
    }

    override generarInforme(id: number): Observable<Blob> {
        return this.http.post(`${this.apiUrl}/${id}/informe`, {}, { responseType: 'blob' });
    }

    override enviar(id: number, envio: EvaluacionEnvio): Observable<{ mensaje?: string }> {
        return this.http.post<ResponseDto>(`${this.apiUrl}/${id}/envio`, envio);
    }

    override subirInforme(archivo: File): Observable<{ fileUrl: string }> {
        return this.archivos.uploadFile(archivo, 'no-objeciones');
    }
}
