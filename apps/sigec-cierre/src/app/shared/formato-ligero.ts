/**
 * Formato ligero para los textos largos (ADR 0015): listas con viñetas o numeradas escritas como texto plano ("• " y
 * "1. "). Se guarda y se imprime tal cual, sin HTML: la API y el PDF no cambian.
 */
export type TipoLista = 'vinetas' | 'numerada';

/** Texto resultante y la selección que debe quedar en el campo. */
export interface EdicionTexto {
  texto: string;
  inicio: number;
  fin: number;
}

const VINETA = '• ';
const NUMERO = /^(\d+)\.\s/;

const quitarPrefijo = (linea: string) => (linea.startsWith(VINETA) ? linea.slice(VINETA.length) : linea.replace(NUMERO, ''));

/**
 * Convierte en lista las líneas que toca la selección (o la línea del cursor); si todas ya lo eran del mismo tipo, la
 * quita. Una lista de otro tipo se reemplaza y la numerada se numera desde 1. Las líneas vacías se respetan.
 */
export function alternarLista(texto: string, inicio: number, fin: number, tipo: TipoLista): EdicionTexto {
  // Una selección que termina justo tras un salto de línea no incluye la línea siguiente.
  const finEfectivo = fin > inicio && texto[fin - 1] === '\n' ? fin - 1 : fin;
  const desde = texto.lastIndexOf('\n', inicio - 1) + 1;
  const saltoFinal = texto.indexOf('\n', finEfectivo);
  const hasta = saltoFinal < 0 ? texto.length : saltoFinal;
  const lineas = texto.slice(desde, hasta).split('\n');
  const prefijo = (n: number) => (tipo === 'vinetas' ? VINETA : `${n}. `);

  let bloque: string;
  if (lineas.length === 1 && !lineas[0].trim()) {
    // Línea vacía: se empieza la lista para escribir en ella.
    bloque = prefijo(1);
    const reemplazado = texto.slice(0, desde) + bloque + texto.slice(hasta);
    return { texto: reemplazado, inicio: desde + bloque.length, fin: desde + bloque.length };
  }
  const yaEs = (linea: string) => (tipo === 'vinetas' ? linea.startsWith(VINETA) : NUMERO.test(linea));
  const quitar = lineas.filter(l => l.trim()).every(yaEs);
  let n = 0;
  bloque = lineas
    .map(linea => {
      if (!linea.trim()) return linea;
      const base = quitarPrefijo(linea);
      return quitar ? base : prefijo(++n) + base;
    })
    .join('\n');
  return { texto: texto.slice(0, desde) + bloque + texto.slice(hasta), inicio: desde, fin: desde + bloque.length };
}

/**
 * Enter dentro de un ítem de lista: abre el siguiente ítem ("• " o el número que sigue). En un ítem vacío termina la
 * lista (quita su viñeta o número). Fuera de una lista devuelve null y Enter hace lo de siempre.
 */
export function continuarLista(texto: string, cursor: number): EdicionTexto | null {
  const desde = texto.lastIndexOf('\n', cursor - 1) + 1;
  const antes = texto.slice(desde, cursor);
  const numero = NUMERO.exec(antes);
  const siguiente = antes.startsWith(VINETA) ? VINETA : numero ? `${Number(numero[1]) + 1}. ` : null;
  if (!siguiente) return null;

  const saltoFinal = texto.indexOf('\n', cursor);
  const despues = texto.slice(cursor, saltoFinal < 0 ? texto.length : saltoFinal);
  if (!quitarPrefijo(antes).trim() && !despues.trim()) {
    const reemplazado = texto.slice(0, desde) + texto.slice(cursor);
    return { texto: reemplazado, inicio: desde, fin: desde };
  }
  const insercion = '\n' + siguiente;
  const posicion = cursor + insercion.length;
  return { texto: texto.slice(0, cursor) + insercion + texto.slice(cursor), inicio: posicion, fin: posicion };
}
