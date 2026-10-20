import { HttpErrorResponse } from '@angular/common/http';
import { mensajeErrorLogin } from './login.component';

describe('mensajeErrorLogin', () => {
  it('muestra el mensaje del sobre MIDAGRI (credenciales inválidas responde 400)', () => {
    const err = new HttpErrorResponse({ status: 400, error: { respuesta: 'ERROR', mensaje: 'Credenciales inválidas.', datos: null } });
    expect(mensajeErrorLogin(err)).toBe('Credenciales inválidas.');
  });

  it('muestra el primer error de validación de ProblemDetails', () => {
    const err = new HttpErrorResponse({
      status: 400,
      error: { title: 'One or more validation errors occurred.', errors: { Username: ['El nombre de usuario es requerido.'] } }
    });
    expect(mensajeErrorLogin(err)).toBe('El nombre de usuario es requerido.');
  });

  it('reserva "Error de conexión" para cuando no hubo respuesta', () => {
    expect(mensajeErrorLogin(new HttpErrorResponse({ status: 0 }))).toBe('Error de conexión con el servidor de seguridad.');
  });

  it('sin cuerpo útil, usa un mensaje genérico', () => {
    expect(mensajeErrorLogin(new HttpErrorResponse({ status: 500, error: null }))).toBe('No se pudo iniciar sesión.');
  });
});
