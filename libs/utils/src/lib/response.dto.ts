export interface ResponseDto<T = unknown> {
    respuesta: string; // "OK" | "ERROR"
    mensaje: string;
    datos: T;
}
