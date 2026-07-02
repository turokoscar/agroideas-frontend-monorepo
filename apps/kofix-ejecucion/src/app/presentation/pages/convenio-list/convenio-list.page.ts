import { PermissionService } from '@agroideas/security';
import { PERMISSIONS } from '@agroideas/utils';
import { StatusType, TableColumn, UIButtonComponent, UiDataTableComponent, UiFilterBarComponent, UiProgressBarComponent, UiStatusPillComponent } from '@agroideas/ui';
import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GetAsignadosUseCase } from '../../../domain/usecases/get-asignados.usecase';
import { GetTodosConveniosUseCase } from '../../../domain/usecases/get-todos-convenios.usecase';
import { Convenio } from '../../../domain/models/convenio.model';
import { AlertService } from '@agroideas/feedback';
import { KardexRepository } from '../../../domain/repositories/kardex.repository';
import { ConvenioRepository } from '../../../domain/repositories/convenio.repository';

@Component({
    selector: 'app-convenio-list-page',
    standalone: true,
    imports: [CommonModule, FormsModule, UiDataTableComponent, UiFilterBarComponent, UiProgressBarComponent, UiStatusPillComponent, UIButtonComponent],
    templateUrl: './convenio-list.page.html',
    styleUrls: ['./convenio-list.page.sass']
})
export class ConvenioListPageComponent implements OnInit {
    private permissionService = inject(PermissionService);
    private getAsignadosUseCase = inject(GetAsignadosUseCase);
    private getTodosConveniosUseCase = inject(GetTodosConveniosUseCase);
    private alertService = inject(AlertService);
    private router = inject(Router);
    private kardexRepo = inject(KardexRepository);
    private convenioRepo = inject(ConvenioRepository);

    convenios = signal<Convenio[]>([]);
    totalRecords = signal<number>(0);
    loading = signal<boolean>(false);
    search = '';
    estadoFilter = '';
    pageSize = 10;

    columns: TableColumn[] = [
        { field: 'numeroConvenio', header: 'N° Convenio', width: '120px' },
        { field: 'razonSocial', header: 'Organización', type: 'custom' },
        { field: 'region', header: 'Región', width: '130px' },
        { field: 'vigencia', header: 'Vigencia', type: 'custom', width: '160px' },
        { field: 'montoAprobado', header: 'Monto Aprobado', type: 'currency', align: 'right', width: '145px' },
        { field: 'montoEjecutado', header: 'Ejecutado', type: 'custom', width: '160px' },
        { field: 'estado', header: 'Estado', type: 'custom', align: 'center', width: '110px' }
    ];

    ngOnInit(): void {
        this.loadData({ first: 0, rows: this.pageSize });
    }

    loadData(event?: any): void {
        setTimeout(() => this.loading.set(true));
        const page = event ? Math.floor(event.first / event.rows) + 1 : 1;
        const rows = event?.rows || this.pageSize;

        const useCase = this.permissionService.hasPermission(PERMISSIONS.VER_TODOS_CONVENIOS)
            ? this.getTodosConveniosUseCase
            : this.getAsignadosUseCase;

        useCase.execute(page, rows, this.search).subscribe({
            next: (res) => {
                let datos = res.datos;

                if (this.estadoFilter) {
                    datos = datos.filter((c: Convenio) => c.estado === this.estadoFilter);
                }

                this.convenios.set(datos);
                this.totalRecords.set(res.total);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
            }
        });
    }

    onSearch(): void {
        this.loadData({ first: 0, rows: this.pageSize });
    }

    goToDetail(id: number): void {
        this.router.navigate(['/main/convenios', id]);
    }

    goToProgramacion(id: number): void {
        this.router.navigate(['/main/convenios', id], { queryParams: { tab: 'programacion' } });
    }

    goToKardex(id: number): void {
        this.router.navigate(['/main/convenios', id], { queryParams: { tab: 'kardex' } });
    }

    downloadConvenioFisico(id: number, numero: string): void {
        this.alertService.show(
            'Descarga de Convenio',
            `La descarga del convenio físico original para el convenio ${numero} estará disponible próximamente en línea.`,
            'info'
        );
    }

    downloadKardexResumen(id: number, numero: string): void {
        this.alertService.toast('Generando reporte Kardex...');
        this.kardexRepo.getConsolidado(id).subscribe({
            next: (data) => {
                if (!data || data.length === 0) {
                    this.alertService.show('Sin Datos', `No hay movimientos contables registrados en el Kardex para el convenio ${numero}.`, 'warning');
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
                    <p>Convenio: ${numero}</p>
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
                a.download = `Kardex_Consolidado_Convenio_${numero}.xls`;
                a.click();
                URL.revokeObjectURL(url);
                this.alertService.toast('Exportación de Kardex completada.');
            },
            error: (err) => {
                console.error('Error al descargar Kardex:', err);
                this.alertService.show('Error', 'No se pudo generar el reporte del Kardex.', 'error');
            }
        });
    }

    downloadReporteProgramacion(id: number, numero: string): void {
        this.alertService.toast('Generando reporte PDF de programación...');
        this.convenioRepo.getCronogramasMensuales(id).subscribe({
            next: (res) => {
                if (!res || !res.cronograma || res.cronograma.length === 0) {
                    this.alertService.show('Sin Datos', `No hay datos de programación cargados para el convenio ${numero}.`, 'warning');
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
                          <strong>Convenio:</strong> ${numero} | <strong>Generado el:</strong> ${new Date().toLocaleDateString('es-PE')}
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
                console.error('Error al descargar cronograma:', err);
                this.alertService.show('Error', 'No se pudo generar el reporte de programación.', 'error');
            }
        });
    }

    formatConvenioNumber(convenio: Convenio): string {
        if (!convenio.numeroConvenio) return '-';
        if (convenio.numeroConvenio.includes('-ST')) {
            return convenio.numeroConvenio;
        }
        const padded = convenio.numeroConvenio.toString().padStart(4, '0');
        const year = convenio.fechaInicio ? new Date(convenio.fechaInicio).getFullYear() : '----';
        return `${padded}-${year}-ST`;
    }

    getSaldo(convenio: Convenio): number {
        return convenio.saldoPorEjecutar ?? (convenio.montoAprobado - convenio.montoEjecutado);
    }

    getRiesgo(convenio: Convenio): 'success' | 'warning' | 'danger' {
        const saldo = this.getSaldo(convenio);
        const porcentajeSaldo = saldo / convenio.montoAprobado;

        if (porcentajeSaldo > 0.5) return 'success';
        if (porcentajeSaldo > 0.15) return 'warning';
        return 'danger';
    }

    getStatusType(estado: string): StatusType {
        const map: Record<string, StatusType> = {
            'VIGENTE': 'Activo',
            'POR_INICIAR': 'Pendiente',
            'FINALIZADO': 'Finalizado',
            'SUSPENDIDO': 'Suspendido'
        };
        return map[estado] ?? 'Finalizado';
    }

    getStatusLabel(estado: string): string {
        const map: Record<string, string> = {
            'VIGENTE': 'Activo',
            'POR_INICIAR': 'Por Iniciar',
            'FINALIZADO': 'Finalizado',
            'SUSPENDIDO': 'Suspendido'
        };
        return map[estado] ?? estado;
    }

    getSemaphoreClass(estado: string): string {
        const map: Record<string, string> = {
            'VIGENTE': 'semaforo--green',
            'POR_INICIAR': 'semaforo--yellow',
            'FINALIZADO': 'semaforo--red',
            'SUSPENDIDO': 'semaforo--gray'
        };
        return map[estado] ?? 'semaforo--gray';
    }

    formatDate(date: string): string {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    getPorcentajeEjecucion(convenio: Convenio): number {
        if (!convenio.montoAprobado || convenio.montoAprobado <= 0) return 0;
        return Math.round((convenio.montoEjecutado / convenio.montoAprobado) * 100);
    }
}