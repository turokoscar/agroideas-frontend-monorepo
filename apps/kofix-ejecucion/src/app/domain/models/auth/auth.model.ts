export interface User {
    name: string;
    email: string;
    role: string;
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
        userName: string;
        email: string;
        roles: string[];
    };
}
