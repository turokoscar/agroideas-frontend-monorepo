import { Injectable, inject } from '@angular/core';
import { AlertService } from '@agroideas/feedback';
import { KardexRepository } from '../../domain/repositories/kardex.repository';
import { ConvenioRepository } from '../../domain/repositories/convenio.repository';

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  private alertService = inject(AlertService);
  private kardexRepo = inject(KardexRepository);
  private convenioRepo = inject(ConvenioRepository);

  exportKardexConsolidado(convenioId: number, numeroConvenio: string): void {
    this.alertService.toast('Generando reporte Kardex...');
    this.kardexRepo.getConsolidado(convenioId).subscribe({
      next: (data) => {
        if (!data || data.length === 0) {
          this.alertService.show('Sin Datos', `No hay movimientos contables registrados en el Kardex para el convenio ${numeroConvenio}.`, 'warning');
          return;
        }

        let html = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta charset="utf-8" />
            <style>
              th { background-color: #008F49; color: #ffffff; font-weight: bold; }
              td, th { border: 0.5pt solid #cccccc; text-align: left; padding: 4px; }
              .number { text-align: right; }
            </style>
          </head>
          <body>
            <h2>Consolidado del Ciclo Financiero - Kardex Ledger</h2>
            <p>Convenio: ${numeroConvenio}</p>
            <table>
              <thead>
                <tr>
                  <th>Metas Financieras (Item/Bien)</th>
                  <th>Programado</th>
                  <th>Comprometido (N.O.)</th>
                  <th>Ejecutado (Kardex)</th>
                  <th>Rendido</th>
                  <th>Saldo Disponible</th>
                </tr>
              </thead>
              <tbody>
        `;

        data.forEach(item => {
          html += `
            <tr>
              <td>${item.itemDescripcion}</td>
              <td class="number">${item.montoProgramado}</td>
              <td class="number">${item.montoComprometido}</td>
              <td class="number">${item.montoEfectivizado}</td>
              <td class="number">${item.montoRendido}</td>
              <td class="number">${item.saldo}</td>
            </tr>
          `;
        });

        html += `</tbody></table></body></html>`;
        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Kardex_Consolidado_Convenio_${numeroConvenio}.xls`;
        a.click();
        URL.revokeObjectURL(url);
        this.alertService.toast('Exportación de Kardex completada.');
      },
      error: (err) => {
        this.alertService.show('Error', 'No se pudo generar el reporte del Kardex.', 'error');
      }
    });
  }

  exportProgramacionReporte(convenioId: number, numeroConvenio: string): void {
    this.alertService.toast('Generando reporte PDF de programación...');
    this.convenioRepo.getCronogramasMensuales(convenioId).subscribe({
      next: (res) => {
        if (!res || !res.cronograma || res.cronograma.length === 0) {
          this.alertService.show('Sin Datos', `No hay datos de programación cargados para el convenio ${numeroConvenio}.`, 'warning');
          return;
        }

        const mesesArray = Array.from({ length: 36 }, (_, i) => i + 1);
        const monthsHeader = mesesArray.map(m => `<th>M${m}</th>`).join('');

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
                  <strong>Convenio:</strong> ${numeroConvenio} | <strong>Generado el:</strong> ${new Date().toLocaleDateString('es-PE')}
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

        res.cronograma.forEach((item: any) => {
          const mesesMap: Record<number, number> = {};
          mesesArray.forEach(m => { mesesMap[m] = 0; });
          (item.meses || []).forEach((c: any) => {
            if (mesesMap[c.mes] !== undefined) {
              mesesMap[c.mes] = c.metaFinanciera || 0;
            }
          });

          let monthsCells = '';
          mesesArray.forEach(m => {
            const val = mesesMap[m] || 0;
            if (val > 0) {
              monthsCells += `<td class="active-month">M${m}</td>`;
            } else {
              monthsCells += `<td class="empty-month"></td>`;
            }
          });

          html += `
            <tr>
              <td class="activity-cell">${item.descripcion}</td>
              <td>${item.tipo}</td>
              <td class="number-cell">${new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0 }).format(item.montoAprobado)}</td>
              <td class="number-cell">${new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0 }).format(item.montoProgramado)}</td>
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
      },
      error: (err) => {
        this.alertService.show('Error', 'No se pudo generar el reporte de programación.', 'error');
      }
    });
  }
}
