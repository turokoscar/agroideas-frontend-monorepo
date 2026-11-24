/** Evaluación de proveedores de una N.O. (API ADR-032 entrega 2). */
export type ResultadoEvaluacion = 'VALIDADO' | 'NO_VALIDADO' | null;

export interface EvaluacionCabecera {
    cartaOa?: string | null;
    fechaCartaOa?: string | null;
    fechaRecepcion?: string | null;
    expediente?: string | null;
    expedienteSgd?: string | null;
    docCarta?: boolean | null;
    docActa?: boolean | null;
    docDeclaracion?: boolean | null;
    docCuadro?: boolean | null;
    docCotizaciones?: boolean | null;
    observacionExpediente?: string | null;
    informeProveedor?: string | null;
    fechaInformeProveedor?: string | null;
    consultorProveedor?: string | null;
    informeInfraestructura?: string | null;
    fechaInformeInfraestructura?: string | null;
    consultorInfraestructura?: string | null;
    cartaObservaciones?: string | null;
    fechaCartaObservaciones?: string | null;
    levantamiento?: string | null;
    fechaLevantamiento?: string | null;
    poa?: string | null;
    pasoCritico?: string | null;
    comentario?: string | null;
    evaluador?: string | null;
    cargoEvaluador?: string | null;
}

export interface EvaluacionItem {
    itemMlId: number;
    cantidad: number;
    resultado: ResultadoEvaluacion;
    motivo?: string | null;
    observacion?: string | null;
    justificacionCotizaciones?: string | null;
    justificacionPrecio?: string | null;
}

export interface EvaluacionPrecio {
    itemMlId: number;
    precioUnitario: number | null;
    /** Sin valor por defecto: lo marca el especialista. */
    cumple: boolean | null;
    adjudicado: boolean;
}

export interface EvaluacionCotizacion {
    ruc: string;
    razonSocial?: string | null;
    verificado?: boolean;
    estadoSunat?: string | null;
    condicionSunat?: string | null;
    fechaInscripcion?: string | null;
    fechaCotizacion?: string | null;
    precios: EvaluacionPrecio[];
}

export interface EvaluacionNoObjecion extends EvaluacionCabecera {
    id: number;
    postulanteId: number;
    noObjecionId?: number | null;
    estado: string;
    editable: boolean;
    observacionSupervisor?: string | null;
    version: number;
    versionInforme?: number | null;
    items: EvaluacionItem[];
    cotizaciones: EvaluacionCotizacion[];
}

export interface MontosEvaluacion {
    ofertado: number;
    base: number;
    agroideas: number;
    oa: number;
    diferencia: number;
}

export interface EvaluacionItemCalculado {
    itemMlId: number;
    orden: number;
    nombre: string;
    tipo?: string;
    unidadMedida?: string;
    especificaciones?: string;
    cantidad: number;
    porcentajeAgroideas: number;
    aprobado?: MontosEvaluacion | null;
    rucSugerido?: string | null;
    rucAdjudicado?: string | null;
    adjudicado?: MontosEvaluacion | null;
}

export interface EvaluacionDetalle {
    evaluacion: EvaluacionNoObjecion;
    items: EvaluacionItemCalculado[];
    pendientes: string[];
}

export interface EvaluacionResumen {
    id: number;
    noObjecionId?: number | null;
    estado: string;
    numeroInforme?: string | null;
    cartaOa?: string | null;
    expediente?: string | null;
    fechaRecepcion?: string | null;
    fechaCreacion: string;
    numItems: number;
}

export interface EvaluacionPropuestas {
    poa?: string | null;
    planNegocio?: string | null;
    /** Especialista asignado al convenio: se propone como evaluador. */
    especialista?: string | null;
    representante?: string | null;
    ubigeo?: string | null;
    razonSocial?: string | null;
}

export interface EvaluacionEnvio {
    version: number;
    numeroInforme: string;
    fechaInforme: string;
    ideArchivo: string;
}

/** Campos de la cabecera que se envían al guardar. */
const CAMPOS_CABECERA: (keyof EvaluacionCabecera)[] = [
    'cartaOa', 'fechaCartaOa', 'fechaRecepcion', 'expediente', 'expedienteSgd', 'docCarta', 'docActa', 'docDeclaracion',
    'docCuadro', 'docCotizaciones', 'observacionExpediente', 'informeProveedor', 'fechaInformeProveedor',
    'consultorProveedor', 'informeInfraestructura', 'fechaInformeInfraestructura', 'consultorInfraestructura',
    'cartaObservaciones', 'fechaCartaObservaciones', 'levantamiento', 'fechaLevantamiento', 'poa', 'pasoCritico',
    'comentario', 'evaluador', 'cargoEvaluador'
];

const vacioANulo = (v: unknown) => (v === '' || v === undefined ? null : v);

/** Solo fecha (yyyy-MM-dd), como la usan los input type="date". */
export function soloFecha(fecha?: string | null): string | null {
    return fecha ? fecha.substring(0, 10) : null;
}

export function esRucValido(ruc: string): boolean {
    return /^\d{11}$/.test(ruc);
}

/**
 * Cuerpo a guardar. Una hoja con RUC incompleto o repetido todavía se está escribiendo: se omite hasta que sea
 * válida, para que el guardado automático no falle.
 */
export function aSolicitud(e: EvaluacionNoObjecion): Record<string, unknown> {
    const cabecera = Object.fromEntries(CAMPOS_CABECERA.map(c => [c, vacioANulo(e[c])]));
    const vistos = new Set<string>();
    const ids = new Set(e.items.map(i => i.itemMlId));
    const hojas = e.cotizaciones.filter(c => {
        if (!esRucValido(c.ruc) || vistos.has(c.ruc)) return false;
        vistos.add(c.ruc);
        return true;
    });
    return {
        ...cabecera,
        version: e.version,
        items: e.items.map(i => ({ ...i, cantidad: i.cantidad ?? 0 })),
        cotizaciones: hojas.map(c => ({
            ruc: c.ruc,
            razonSocial: vacioANulo(c.razonSocial),
            fechaCotizacion: vacioANulo(c.fechaCotizacion),
            precios: c.precios.filter(p => ids.has(p.itemMlId) && (p.precioUnitario ?? 0) > 0)
        }))
    };
}

/** Precio del ítem en la hoja; lo crea si no existe. */
export function precioDe(hoja: EvaluacionCotizacion, itemMlId: number): EvaluacionPrecio {
    let precio = hoja.precios.find(p => p.itemMlId === itemMlId);
    if (!precio) {
        precio = { itemMlId, precioUnitario: null, cumple: null, adjudicado: false };
        hoja.precios.push(precio);
    }
    return precio;
}

/** Un solo adjudicado por ítem; `ruc` nulo lo quita. */
export function adjudicar(e: EvaluacionNoObjecion, itemMlId: number, ruc: string | null): void {
    for (const hoja of e.cotizaciones) {
        for (const p of hoja.precios.filter(x => x.itemMlId === itemMlId)) p.adjudicado = hoja.ruc === ruc;
    }
}

/** Suma de la hoja (cantidad × precio), para contrastarla con el total del papel. */
export function totalHoja(e: EvaluacionNoObjecion, hoja: EvaluacionCotizacion): number {
    const total = hoja.precios.reduce((suma, p) => {
        const item = e.items.find(i => i.itemMlId === p.itemMlId);
        return suma + (item ? (item.cantidad || 0) * (p.precioUnitario || 0) : 0);
    }, 0);
    return Math.round(total * 100) / 100;
}

/** Hojas con precio para el ítem. */
export function ofertasDe(e: EvaluacionNoObjecion, itemMlId: number): { hoja: EvaluacionCotizacion; precio: EvaluacionPrecio }[] {
    return e.cotizaciones.flatMap(hoja => hoja.precios
        .filter(p => p.itemMlId === itemMlId && (p.precioUnitario ?? 0) > 0)
        .map(precio => ({ hoja, precio })));
}

/** Un RUC no activo o no habido no puede adjudicarse. */
export function activoYHabido(hoja: EvaluacionCotizacion): boolean {
    return hoja.estadoSunat?.toUpperCase() === 'ACTIVO' && hoja.condicionSunat?.toUpperCase() === 'HABIDO';
}

/** El adjudicado ofertó más que el menor precio que cumple: exige justificación. */
export function adjudicadoNoEsElMenor(e: EvaluacionNoObjecion, itemMlId: number): boolean {
    const ofertas = ofertasDe(e, itemMlId);
    const adjudicado = ofertas.find(o => o.precio.adjudicado)?.precio.precioUnitario;
    const precios = ofertas.filter(o => o.precio.cumple && (!o.hoja.verificado || activoYHabido(o.hoja))).map(o => o.precio.precioUnitario ?? 0);
    return adjudicado != null && precios.length > 0 && adjudicado > Math.min(...precios);
}
