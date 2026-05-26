export interface ResponseDto<T = unknown> {
    exitoso: boolean;
    respuesta: number;
    codigo: string | null;
    mensaje: string;
    datos: T;
    total: number | null;
}
