import { Pipe, PipeTransform } from '@angular/core';
import { formatConvenioNumber } from '../convenio-number';

/** `{{ numeroConvenio | formatConvenio: fechaFirma }}` → "0048-2023-ST". Ver `formatConvenioNumber`. */
@Pipe({
  name: 'formatConvenio',
  standalone: true
})
export class FormatConvenioPipe implements PipeTransform {
  transform(numeroConvenio: string | number | null | undefined, fechaFirma?: string | Date | null): string {
    return formatConvenioNumber(numeroConvenio, fechaFirma);
  }
}
