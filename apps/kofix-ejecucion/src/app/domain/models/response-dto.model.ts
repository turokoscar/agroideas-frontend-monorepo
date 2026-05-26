export interface ResponseDto<T = any> {
    exitoso: boolean;
    respuesta: number;
    codigo: string | null;
    mensaje: string;
    datos: T;
    total: number | null;
}
