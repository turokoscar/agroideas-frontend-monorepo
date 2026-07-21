import { ChangeDetectionStrategy, Component, OnInit, inject, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConvenioRepository } from '../../../domain/repositories/convenio.repository';
import { UIButtonComponent } from '@agroideas/ui';
import { AlertService } from '@agroideas/feedback';

@Component({
  selector: 'app-cronograma-consolidado',
  standalone: true,
  imports: [CommonModule, UIButtonComponent],
  templateUrl: './cronograma-consolidado.component.html',
  styleUrls: ['./cronograma-consolidado.component.sass'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CronogramaConsolidadoComponent implements OnInit {
  convenioId = input.required<number>();
  
  private convenioRepo = inject(ConvenioRepository);
  private alertService = inject(AlertService);

  items = signal<any[]>([]);
  loading = signal<boolean>(false);
  mesesArray = Array.from({ length: 36 }, (_, i) => i + 1);

  ngOnInit(): void {
    this.loadCronogramaConsolidado();
  }

  loadCronogramaConsolidado(): void {
    this.loading.set(true);
    this.convenioRepo.getCronogramasMensuales(this.convenioId()).subscribe({
      next: (res: any) => {
        if (!res || !res.cronograma || res.cronograma.length === 0) {
          this.items.set([]);
          this.loading.set(false);
          return;
        }

        const itemsConCronograma = res.cronograma.map((item: any) => {
          const mesesMap: Record<number, any> = {};
          
          // Inicializar los 36 meses
          this.mesesArray.forEach(m => {
            mesesMap[m] = { fisica: 0, financiera: 0 };
          });

          // Rellenar con los datos reales devueltos del backend
          (item.meses || []).forEach((c: any) => {
            if (mesesMap[c.mes]) {
              mesesMap[c.mes] = {
                fisica: c.metaFisica || 0,
                financiera: c.metaFinanciera || 0
              };
            }
          });

          return {
            id: item.itemMlId,
            item: item.descripcion,
            tipo: item.tipo,
            montoAprobado: item.montoAprobado,
            montoProgramado: item.montoProgramado,
            meses: mesesMap
          };
        });

        this.items.set(itemsConCronograma);
        this.loading.set(false);
      },
      error: (err) => {
        // Error handled by AlertService or removed
        this.loading.set(false);
      }
    });
  }

  exportExcel(): void {
    if (this.items().length === 0) {
      this.alertService.show('Sin Datos', 'No hay datos de programación para exportar.', 'warning');
      return;
    }

    const monthsHeader = this.mesesArray.map(m => `<th>Mes ${m}</th>`).join('');
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          th { background-color: #008F49; color: #ffffff; font-weight: bold; }
          td, th { border: 0.5pt solid #cccccc; text-align: left; }
          .number { text-align: right; }
        </style>
      </head>
      <body>
        <h2>Reporte de Programación Consolidado (36 Meses)</h2>
        <p>Convenio ID: ${this.convenioId()}</p>
        <table>
          <thead>
            <tr>
              <th>Actividad / Bien</th>
              <th>Categoría</th>
              <th>Total Aprobado</th>
              <th>Total Programado</th>
              ${monthsHeader}
            </tr>
          </thead>
          <tbody>
    `;

    this.items().forEach(item => {
      let monthsCells = '';
      this.mesesArray.forEach(m => {
        const val = item.meses[m]?.financiera || 0;
        monthsCells += `<td class="number">${val > 0 ? val : ''}</td>`;
      });
      html += `
        <tr>
          <td>${item.item}</td>
          <td>${item.tipo}</td>
          <td class="number">${item.montoAprobado}</td>
          <td class="number">${item.montoProgramado}</td>
          ${monthsCells}
        </tr>
      `;
    });

    html += `</tbody></table></body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cronograma_36_Meses_Convenio_${this.convenioId()}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    this.alertService.toast('Exportación a Excel completada con éxito.');
  }

  exportPdf(): void {
    if (this.items().length === 0) {
      this.alertService.show('Sin Datos', 'No hay datos de programación para exportar.', 'warning');
      return;
    }

    this.alertService.toast('Generando reporte PDF...');

    const monthsHeader = this.mesesArray.map(m => `<th>M${m}</th>`).join('');
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Reporte de Programación Consolidado (36 Meses)</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #333333;
            margin: 0;
            padding: 0;
            font-size: 9px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #008F49;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .title {
            font-size: 14px;
            font-weight: bold;
            color: #008F49;
            margin: 0;
            text-transform: uppercase;
          }
          .meta-info {
            font-size: 9px;
            color: #666666;
            margin-top: 3px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 7px;
          }
          th {
            background-color: #008F49;
            color: #ffffff;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 7px;
            padding: 5px 3px;
            border: 0.5pt solid #dddddd;
          }
          td {
            padding: 4px 3px;
            border: 0.5pt solid #dddddd;
            font-weight: 500;
          }
          .activity-cell {
            font-weight: bold;
            color: #111111;
            max-width: 150px;
            word-wrap: break-word;
          }
          .number-cell {
            text-align: right;
          }
          .active-month {
            background-color: rgba(0, 178, 227, 0.15) !important;
            color: #007599;
            font-weight: bold;
            text-align: center;
          }
          .empty-month {
            background-color: #fcfcfc;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">Reporte de Programación Consolidado (36 Meses)</h1>
            <div class="meta-info">
              <strong>Convenio ID:</strong> ${this.convenioId()} | <strong>Generado el:</strong> ${new Date().toLocaleDateString('es-PE')}
            </div>
          </div>
          <div style="font-weight: bold; color: #666; font-size: 10px;">AGROIDEAS</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="text-align: left; width: 150px;">Actividad / Bien</th>
              <th style="width: 70px;">Categoría</th>
              <th style="text-align: right; width: 70px;">Monto Aprob.</th>
              <th style="text-align: right; width: 70px;">Monto Prog.</th>
              ${monthsHeader}
            </tr>
          </thead>
          <tbody>
    `;

    this.items().forEach(item => {
      let monthsCells = '';
      this.mesesArray.forEach(m => {
        const val = item.meses[m]?.financiera || 0;
        if (val > 0) {
          monthsCells += `<td class="active-month">M${m}</td>`;
        } else {
          monthsCells += `<td class="empty-month"></td>`;
        }
      });
      html += `
        <tr>
          <td class="activity-cell">${item.item}</td>
          <td>${item.tipo}</td>
          <td class="number-cell">${this.formatCurrency(item.montoAprobado)}</td>
          <td class="number-cell">${this.formatCurrency(item.montoProgramado)}</td>
          ${monthsCells}
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    } else {
      document.body.removeChild(iframe);
      this.alertService.show('Error', 'No se pudo iniciar el proceso de impresión.', 'error');
    }
  }

  formatCurrency(value?: number): string {
    if (!value) return '-';
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0 }).format(value);
  }
}
