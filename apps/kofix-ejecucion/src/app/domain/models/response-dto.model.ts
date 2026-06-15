export interface ResponseDto<T = any> {
    respuesta?: string; // "OK" | "ERROR"
    mensaje?: string;
    datos?: T;
    exitoso?: boolean;
    total?: number;
}

