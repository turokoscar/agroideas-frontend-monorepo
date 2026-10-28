import { alternarLista, continuarLista } from './formato-ligero';

describe('alternarLista', () => {
  it('convierte en viñetas las líneas seleccionadas y respeta las vacías', () => {
    const texto = 'Primero\n\nSegundo';
    expect(alternarLista(texto, 0, texto.length, 'vinetas')).toEqual({ texto: '• Primero\n\n• Segundo', inicio: 0, fin: 20 });
  });

  it('sin selección actúa sobre la línea del cursor', () => {
    expect(alternarLista('Uno\nDos\nTres', 5, 5, 'numerada').texto).toBe('Uno\n1. Dos\nTres');
  });

  it('si todas ya son de ese tipo, quita la lista; si son de otro, la reemplaza y numera desde 1', () => {
    expect(alternarLista('• A\n• B', 0, 7, 'vinetas').texto).toBe('A\nB');
    expect(alternarLista('• A\n• B', 0, 7, 'numerada').texto).toBe('1. A\n2. B');
    expect(alternarLista('3. A\n7. B', 0, 9, 'numerada').texto).toBe('A\nB');
  });

  it('en una línea vacía empieza la lista y deja el cursor para escribir', () => {
    expect(alternarLista('', 0, 0, 'vinetas')).toEqual({ texto: '• ', inicio: 2, fin: 2 });
    expect(alternarLista('Hola\n', 5, 5, 'numerada')).toEqual({ texto: 'Hola\n1. ', inicio: 8, fin: 8 });
  });

  it('una selección que termina tras un salto de línea no toca la línea siguiente', () => {
    expect(alternarLista('A\nB', 0, 2, 'vinetas').texto).toBe('• A\nB');
  });
});

describe('continuarLista', () => {
  it('Enter en un ítem abre el siguiente', () => {
    expect(continuarLista('• Uno', 5)).toEqual({ texto: '• Uno\n• ', inicio: 8, fin: 8 });
    expect(continuarLista('1. Uno', 6)?.texto).toBe('1. Uno\n2. ');
  });

  it('Enter en un ítem vacío termina la lista', () => {
    expect(continuarLista('• Uno\n• ', 8)).toEqual({ texto: '• Uno\n', inicio: 6, fin: 6 });
  });

  it('fuera de una lista no hace nada', () => {
    expect(continuarLista('Texto normal', 12)).toBeNull();
  });
});
