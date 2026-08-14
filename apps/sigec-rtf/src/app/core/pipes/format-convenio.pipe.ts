import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatConvenio',
  standalone: true
})
export class FormatConvenioPipe implements PipeTransform {
  transform(value: string | number | null | undefined, year?: number): string {
    if (!value) return '';

    const str = String(value).trim();
    // Si ya viene formateado con -ST (ej: "0176-2023-ST")
    if (str.endsWith('-ST')) {
      return str;
    }

    const numInt = parseInt(str, 10);
    if (isNaN(numInt)) {
      return str;
    }

    const paddedNum = String(numInt).padStart(4, '0');
    const anioFirma = year && year > 1900 ? year : 2023;

    return `${paddedNum}-${anioFirma}-ST`;
  }
}
