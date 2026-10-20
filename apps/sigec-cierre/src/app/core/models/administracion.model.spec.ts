import { errorAlcance, nombreDepartamento } from './calendario.model';
import { errorParametro, grupoParametro } from './parametro.model';

describe('calendario.model', () => {
  it('el regional exige departamento y, si hay provincia, que sea de ese departamento', () => {
    expect(errorAlcance('REGIONAL', null, null)).toContain('departamento');
    expect(errorAlcance('REGIONAL', '12', null)).toBeNull();
    expect(errorAlcance('REGIONAL', '12', '1201')).toBeNull();
    expect(errorAlcance('REGIONAL', '12', '1501')).toContain('provincia');
    expect(errorAlcance('REGIONAL', '99', null)).toContain('departamento');
  });

  it('los nacionales y no laborables no llevan alcance', () => {
    expect(errorAlcance('FERIADO_NACIONAL', null, '')).toBeNull();
    expect(errorAlcance('NO_LABORABLE_PUBLICO', '15', null)).toContain('no llevan');
  });

  it('nombra el departamento por su ubigeo', () => {
    expect(nombreDepartamento('12')).toBe('Junín');
    expect(nombreDepartamento(null)).toBeNull();
  });
});

describe('parametro.model', () => {
  it('agrupa por código', () => {
    expect(['PLAZO_ANEXO20_DIAS', 'SEDE_COD_PROVINCIA', 'CORREO_UAJ', 'OTRO'].map(grupoParametro)).toEqual(['plazos', 'sede', 'correos', 'otros']);
  });

  it('valida como la API: días 1-365, ubigeos y correos', () => {
    expect(errorParametro('PLAZO_REVISION_UAJ_DIAS', '20')).toBeNull();
    expect(errorParametro('PLAZO_REVISION_UAJ_DIAS', '0')).toContain('entre 1 y 365');
    expect(errorParametro('PLAZO_REVISION_UAJ_DIAS', '2.5')).not.toBeNull();
    expect(errorParametro('SEDE_COD_DEPARTAMENTO', '15')).toBeNull();
    expect(errorParametro('SEDE_COD_PROVINCIA', '15')).toContain('4 dígitos');
    expect(errorParametro('CORREO_UAJ', 'a@x.pe; b@y.pe')).toBeNull();
    expect(errorParametro('CORREO_UAJ', '')).toBeNull();
    expect(errorParametro('CORREO_UAJ', 'a@x.pe, no-es-correo')).toContain('correos válidos');
  });
});
