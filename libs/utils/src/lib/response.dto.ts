export interface ResponseDto<T = unknown> {
    respuesta?: string; // "OK" | "ERROR"
    mensaje?: string;
    datos?: T;
    exitoso?: boolean;
    total?: number;
}

export function isSuccess(res: ResponseDto): boolean {
    return !!res.exitoso || res.respuesta === 'OK';
}

