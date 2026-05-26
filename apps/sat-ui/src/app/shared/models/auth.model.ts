export type UserRole = 'admin' | 'asistente';

export interface AuthUser {
  id: string;
  nombre: string;
  usuario: string;
  role: UserRole;
}

export interface AuthResponse {
  token?: string;
  user: AuthUser;
}
