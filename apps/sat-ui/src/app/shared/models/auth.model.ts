export type UserRole = 'ADMINISTRADOR' | 'TECNICO';

export interface AuthUser {
  id: string;
  nombre: string;
  iniciales: string;
  usuario: string;
  role: UserRole;
}

export interface AuthResponse {
  token?: string;
  user: AuthUser;
}
