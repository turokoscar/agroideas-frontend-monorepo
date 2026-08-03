import { separarMensajeError, mensajeParaUsuario, codigoDeError } from './error-message';

describe('separarMensajeError', () => {
    it('separa el codigo del detalle en el formato MCVS-604', () => {
        const r = separarMensajeError('ERROR_0503:El servicio de organizaciones no está disponible.');
        expect(r.codigo).toBe('ERROR_0503');
        expect(r.detalle).toBe('El servicio de organizaciones no está disponible.');
    });

    it('devuelve intacto un mensaje sin codigo', () => {
        const r = separarMensajeError('Visita programada no encontrada.');
        expect(r.codigo).toBeNull();
        expect(r.detalle).toBe('Visita programada no encontrada.');
    });

    it('no trunca un mensaje que contiene dos puntos pero no lleva codigo', () => {
        // Mensaje real de ProgramacionVisitaService.
        const texto = 'Estado inválido. Valores permitidos: PENDIENTE, COMPLETADA, CANCELADA.';
        const r = separarMensajeError(texto);
        expect(r.codigo).toBeNull();
        expect(r.detalle).toBe(texto);
    });

    it('tolera espacios alrededor de los dos puntos', () => {
        const r = separarMensajeError('ERROR_0400 : La solicitud no pudo procesarse.');
        expect(r.codigo).toBe('ERROR_0400');
        expect(r.detalle).toBe('La solicitud no pudo procesarse.');
    });

    it('maneja nulo, indefinido y cadena vacia', () => {
        expect(separarMensajeError(null)).toEqual({ codigo: null, detalle: '' });
        expect(separarMensajeError(undefined)).toEqual({ codigo: null, detalle: '' });
        expect(separarMensajeError('   ')).toEqual({ codigo: null, detalle: '' });
    });
});

describe('mensajeParaUsuario', () => {
    it('devuelve el detalle sin el codigo', () => {
        const err = { error: { respuesta: 'ERROR', mensaje: 'ERROR_0500:Ocurrió un error interno.' } };
        expect(mensajeParaUsuario(err, 'por defecto')).toBe('Ocurrió un error interno.');
    });

    it('usa el texto por defecto si la respuesta no trae mensaje', () => {
        expect(mensajeParaUsuario({ error: {} }, 'Error al registrar asistente.'))
            .toBe('Error al registrar asistente.');
        expect(mensajeParaUsuario({}, 'Error al registrar asistente.'))
            .toBe('Error al registrar asistente.');
        expect(mensajeParaUsuario(null, 'Error al registrar asistente.'))
            .toBe('Error al registrar asistente.');
    });

    it('respeta los mensajes de negocio que ya son legibles', () => {
        const err = { error: { mensaje: 'Credenciales inválidas o cuenta inactiva.' } };
        expect(mensajeParaUsuario(err, 'por defecto')).toBe('Credenciales inválidas o cuenta inactiva.');
    });
});

describe('codigoDeError', () => {
    it('extrae el codigo para diagnostico', () => {
        expect(codigoDeError({ error: { mensaje: 'ERROR_0401:No autorizado.' } })).toBe('ERROR_0401');
    });

    it('devuelve null cuando no hay codigo', () => {
        expect(codigoDeError({ error: { mensaje: 'Informe no encontrado' } })).toBeNull();
        expect(codigoDeError({})).toBeNull();
    });
});
