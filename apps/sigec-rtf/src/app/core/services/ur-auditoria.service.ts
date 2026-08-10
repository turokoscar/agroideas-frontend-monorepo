import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  RtfCabeceraDto,
  UrCompletoDto,
  UrEvaluacionItemDto,
  UrEvaluacionRequestDto,
  ApiResponse,
  EvidenceDto,
  GastoF1Dto,
  IndicadorDto,
  MetaFisicaDto
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class UrAuditoriaService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // UR State Signals
  urRtfList = signal<RtfCabeceraDto[]>([]);
  urSelectedRtfId = signal<number | null>(null);
  urEvaluacionItems = signal<UrEvaluacionItemDto[]>([]);
  urActaCampoArchivo = signal<File | null>(null);

  // RTF Seleccionado State
  rtfId = signal<number | null>(null);
  rtfStatus = signal<string>('PENDIENTE');
  metas = signal<MetaFisicaDto[]>([]);
  indicadores = signal<IndicadorDto[]>([]);
  evidencias = signal<EvidenceDto[]>([]);
  gastosF1 = signal<GastoF1Dto[]>([]);

  loadBandejaUr() {
    return this.http.get<ApiResponse<RtfCabeceraDto[]>>(`${this.apiUrl}/rtfs?estado=EN_REVISION`).pipe(
      map(res => {
        this.urRtfList.set(res.datos || []);
        return res.datos;
      }),
      catchError(err => {
        console.error('Error loading UR bandeja', err);
        return throwError(() => err);
      })
    );
  }

  loadRtfCompleto(rtfId: number) {
    return this.http.get<ApiResponse<UrCompletoDto>>(`${this.apiUrl}/rtfs/completo/${rtfId}`).pipe(
      map(res => {
        const data = res.datos;
        if (data) {
          this.rtfId.set(data.cabecera.ideRtf!);
          this.rtfStatus.set(data.cabecera.estRtf || 'PENDIENTE');
          this.metas.set(data.metas || []);
          this.indicadores.set(data.indicadores || []);
          this.evidencias.set(data.evidencias || []);
          this.gastosF1.set(data.gastos || []);
        }
        return data;
      }),
      catchError(err => {
        console.error('Error loading RTF completo', err);
        return throwError(() => err);
      })
    );
  }

  uploadActaCampo(rtfId: number, archivo: File) {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/rtfs/${rtfId}/acta-campo`, formData).pipe(
      map(res => {
        this.urActaCampoArchivo.set(archivo);
        return res;
      }),
      catchError(err => {
        console.error('Error uploading acta campo', err);
        return throwError(() => err);
      })
    );
  }

  guardarEvaluacionUr(rtfId: number, items: UrEvaluacionItemDto[]) {
    const body: UrEvaluacionRequestDto = { ideRtf: rtfId, items };
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/rtfs/${rtfId}/evaluacion-ur`, body).pipe(
      map(res => {
        this.urEvaluacionItems.set(items);
        return res;
      }),
      catchError(err => {
        console.error('Error saving UR evaluation', err);
        return throwError(() => err);
      })
    );
  }

  derivarUn(rtfId: number) {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/rtfs/${rtfId}/derivar-un`, {}).pipe(
      map(res => {
        this.rtfStatus.set('IN_REVISION_UN');
        return res;
      }),
      catchError(err => {
        console.error('Error deriving RTF to UN', err);
        return throwError(() => err);
      })
    );
  }

  devolverRtf(rtfId: number, observacion: string) {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/rtfs/${rtfId}/devolver`, JSON.stringify(observacion), {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      map(res => {
        this.rtfStatus.set('EN_EDICION');
        return res;
      }),
      catchError(err => {
        console.error('Error devolviendo RTF', err);
        return throwError(() => err);
      })
    );
  }
}
