export interface User {
    id: number;
    name: string;
    apellidoPaterno: string;
    email: string;
    role: string;
    roles: string[];
}

export interface UserDto {
    id: number;
    dni: string;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    email: string;
    usuario: string;
    telefono: string;
    sigla: string;
    foto: string | null;
    roles: string[];
}

export enum Role {
    JEFE = 'Jefe de Unidad de Negocios',
    SUPERVISOR = 'Supervisor de Monitoreo',
    ESPECIALISTA = 'Especialista de Monitoreo'
}

export interface AuthResponse {
    exitoso: boolean;
    mensaje?: string;
    datos?: {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        user: UserDto;
    };
}
