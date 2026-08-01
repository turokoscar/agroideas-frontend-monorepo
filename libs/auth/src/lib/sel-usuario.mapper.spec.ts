import {
    iniciales,
    mapSelUsuario,
    nombreCompleto,
    normalizarRol,
    SelUsuarioDto
} from './sel-usuario.mapper';

/** Respuesta real de `POST https://localhost:7101/api/Auth/login`. */
const usuarioApi: SelUsuarioDto = {
    id: 165,
    dni: '71236937',
    nombres: 'ANDERSON MAXWELL',
    apellidoPaterno: 'CUBAS',
    apellidoMaterno: 'DELGADO',
    email: '1901606@esan.edu.pe',
    usuario: '20605569481',
    telefono: '974862781',
    sigla: 'AMDC',
    foto: null,
    roles: ['Postulante']
};

describe('mapSelUsuario', () => {
    it('mapea el usuario de la API a la sesión', () => {
        expect(mapSelUsuario(usuarioApi)).toEqual({
            id: '165',
            nombre: 'ANDERSON MAXWELL CUBAS DELGADO',
            iniciales: 'AC',
            usuario: '20605569481',
            email: '1901606@esan.edu.pe',
            sigla: 'AMDC',
            rol: 'POSTULANTE'
        });
    });

    it('tolera sigla y email ausentes', () => {
        const sesion = mapSelUsuario({ ...usuarioApi, sigla: null, email: '' });
        expect(sesion.sigla).toBe('');
        expect(sesion.email).toBe('');
    });
});

describe('nombreCompleto', () => {
    it('omite el apellido materno cuando no viene', () => {
        expect(nombreCompleto({ ...usuarioApi, apellidoMaterno: null })).toBe('ANDERSON MAXWELL CUBAS');
    });

    it('no deja espacios sobrantes con apellidos vacíos', () => {
        expect(nombreCompleto({ ...usuarioApi, apellidoPaterno: '', apellidoMaterno: '  ' })).toBe('ANDERSON MAXWELL');
    });
});

describe('iniciales', () => {
    it('toma la primera letra del nombre y la del apellido paterno', () => {
        expect(iniciales(usuarioApi)).toBe('AC');
    });

    it('devuelve una sola letra si falta el apellido paterno', () => {
        expect(iniciales({ ...usuarioApi, apellidoPaterno: '' })).toBe('A');
    });

    it('devuelve cadena vacía sin nombres ni apellidos', () => {
        expect(iniciales({ ...usuarioApi, nombres: '  ', apellidoPaterno: '' })).toBe('');
    });
});

describe('normalizarRol', () => {
    it('normaliza el rol capitalizado de la API', () => {
        expect(normalizarRol(['Postulante'])).toBe('POSTULANTE');
    });

    it('trata OA como POSTULANTE', () => {
        expect(normalizarRol(['OA'])).toBe('POSTULANTE');
    });

    it('respeta los demás roles', () => {
        expect(normalizarRol(['UR'])).toBe('UR');
    });

    it('usa el valor por defecto si no hay roles', () => {
        expect(normalizarRol([])).toBe('POSTULANTE');
        expect(normalizarRol(null)).toBe('POSTULANTE');
    });
});
