import { ResponseDto } from '@agroideas/utils';

/** Sobre MIDAGRI `{ respuesta, mensaje, datos }` de sigec-api-cierre. */
export type ApiResponse<T> = ResponseDto<T>;

/** `DatosPaginados<T>` de la API: va dentro de `datos`. */
export interface DatosPaginados<T> {
  total: number;
  items: T[];
}
