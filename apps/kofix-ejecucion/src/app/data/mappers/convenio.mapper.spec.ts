import { ConvenioMapper, ConvenioDto } from './convenio.mapper';

describe('ConvenioMapper', () => {
    const baseDto: ConvenioDto = {
        id: 1,
        numeroConvenio: 'CONV-001',
        ruc: '20100000001',
        razonSocial: 'Asociación Central',
        fechaInicio: '2026-01-01',
        fechaFin: '2026-12-31',
        estado: 'VIGENTE'
    };

    it('should pass through the values the API already provides, without falling back', () => {
        const dto: ConvenioDto = {
            ...baseDto,
            montoAprobado: 1000,
            montoProgramado: 500,
            montoEjecutado: 200,
            saldoPorProgramar: 300,
            saldoPorEjecutar: 800,
            programacionAcumulada: 500,
            ejecucionAcumulada: 200,
            saldoDisponible: 800,
            region: 'Cusco',
            asignadoA: 'María López',
            email: 'maria@test.com',
            periodo: 2026,
            duracion: 12
        };

        const result = ConvenioMapper.fromApi(dto);

        expect(result.montoEjecutado).toBe(200);
        expect(result.programacionAcumulada).toBe(500);
        expect(result.saldoDisponible).toBe(800);
        expect(result.region).toBe('Cusco');
        expect(result.asignadoA).toBe('María López');
    });

    it('should apply the fallback chain when optional fields are missing', () => {
        const dto: ConvenioDto = {
            ...baseDto,
            montoAprobado: 1000,
            montoProgramado: 500,
            ejecucionAcumulada: 300,
            ubicacion: 'Lima / San Isidro',
            especialista: 'Juan Pérez'
            // montoEjecutado, programacionAcumulada, saldoDisponible, region y asignadoA se omiten a propósito
        };

        const result = ConvenioMapper.fromApi(dto);

        expect(result.montoEjecutado).toBe(300); // cae a ejecucionAcumulada
        expect(result.programacionAcumulada).toBe(500); // cae a montoProgramado
        expect(result.saldoDisponible).toBe(700); // 1000 - 300
        expect(result.region).toBe('Lima'); // primer segmento de ubicacion, sin espacios
        expect(result.asignadoA).toBe('Juan Pérez'); // cae a especialista
        expect(result.saldoPorProgramar).toBe(0);
        expect(result.saldoPorEjecutar).toBe(0);
        expect(result.email).toBe('');
        expect(result.periodo).toBe(0);
        expect(result.duracion).toBe(0);
    });

    it('should map a list of DTOs and default to an empty array when none is given', () => {
        const result = ConvenioMapper.fromApiList([baseDto, { ...baseDto, id: 2 }]);
        expect(result).toHaveLength(2);
        expect(result[1].id).toBe(2);

        expect(ConvenioMapper.fromApiList(undefined as unknown as ConvenioDto[])).toEqual([]);
    });
});
