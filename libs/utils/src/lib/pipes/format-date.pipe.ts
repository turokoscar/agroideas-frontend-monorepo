import { Pipe, PipeTransform } from '@angular/core';
import { formatDate } from '../date-formatter';

@Pipe({
  name: 'formatDate',
  standalone: true
})
export class FormatDatePipe implements PipeTransform {
  transform(
    value: string | null | undefined,
    options?: Intl.DateTimeFormatOptions,
    fallback?: string
  ): string {
    return formatDate(value, options, fallback);
  }
}
