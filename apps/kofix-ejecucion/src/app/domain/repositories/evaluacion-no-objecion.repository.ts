import { Observable } from 'rxjs';
import { EvaluacionDetalle, EvaluacionEnvio, EvaluacionNoObjecion, EvaluacionPropuestas, EvaluacionResumen } from '../models/evaluacion-no-objecion.model';

export abstract class EvaluacionNoObjecionRepository {
    abstract getByPostulante(postulanteId: number): Observable<EvaluacionResumen[]>;
    abstract get(id: number): Observable<EvaluacionDetalle>;
    abstract getPropuestas(id: number): Observable<EvaluacionPropuestas>;
    abstract crear(postulanteId: number): Observable<number>;
    /** Devuelve la nueva versión. */
    abstract guardar(evaluacion: EvaluacionNoObjecion): Observable<number>;
    abstract eliminar(id: number): Observable<void>;
    abstract generarInforme(id: number): Observable<Blob>;
    abstract enviar(id: number, envio: EvaluacionEnvio): Observable<{ mensaje?: string }>;
    abstract subirInforme(archivo: File): Observable<{ fileUrl: string }>;
}
