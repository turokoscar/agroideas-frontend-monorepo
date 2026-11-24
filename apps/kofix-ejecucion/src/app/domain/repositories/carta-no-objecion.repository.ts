import { Observable } from 'rxjs';
import { CartaBorrador, CartaEmision, CartaHistorial, CartaNoObjecion } from '../models/carta-no-objecion.model';

export abstract class CartaNoObjecionRepository {
    abstract get(noObjecionId: number): Observable<CartaNoObjecion>;
    abstract getHistorial(noObjecionId: number): Observable<CartaHistorial[]>;
    abstract guardar(noObjecionId: number, borrador: CartaBorrador): Observable<void>;
    abstract generar(noObjecionId: number): Observable<Blob>;
    abstract emitir(noObjecionId: number, emision: CartaEmision): Observable<{ mensaje?: string }>;
    abstract anular(noObjecionId: number, justificacion: string): Observable<{ mensaje?: string }>;
    abstract subir(archivo: File): Observable<{ fileUrl: string }>;
    abstract descargar(ideArchivo: string): Observable<Blob>;
}
