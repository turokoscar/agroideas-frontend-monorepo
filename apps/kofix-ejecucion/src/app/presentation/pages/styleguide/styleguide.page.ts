import { UIButtonComponent, UICardComponent, UIModalComponent } from '@agroideas/ui';
import { Component } from '@angular/core';


@Component({
    selector: 'app-styleguide',
    standalone: true,
    imports: [UIButtonComponent, UICardComponent, UIModalComponent],
    template: `
        <div class="p-8">
            <header class="mb-10">
                <h1 class="text-3xl font-medium text-slate-800 mb-2">Design System Midagri</h1>
                <p class="text-slate-500">Guía de estilos y componentes reutilizables (Estilo Flat Profesional).</p>
            </header>

            <section class="mb-12">
                <h2 class="text-xl font-medium text-slate-700 mb-6 border-b pb-2">Botones (ui-button)</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <ui-card title="Variantes de Color" subtitle="Diferentes severidades para acciones.">
                        <div class="flex flex-wrap gap-4">
                            <ui-button severity="primary">Primario</ui-button>
                            <ui-button severity="secondary">Secundario</ui-button>
                            <ui-button severity="accent">Acento</ui-button>
                            <ui-button severity="outline">Contorno</ui-button>
                            <ui-button severity="ghost">Ghost</ui-button>
                            <ui-button severity="subtle">Sutil</ui-button>
                            <ui-button severity="subtle" iconOnly icon="arrow_back" ariaLabel="Atrás"></ui-button>
                        </div>
                    </ui-card>
                    <ui-card title="Estados y Extras" subtitle="Iconos, carga y deshabilitado.">
                        <div class="flex flex-wrap gap-4">
                            <ui-button icon="check">Con Icono</ui-button>
                            <ui-button [loading]="true">Cargando</ui-button>
                            <ui-button [disabled]="true">Deshabilitado</ui-button>
                        </div>
                    </ui-card>
                </div>
            </section>

            <section class="mb-12">
                <h2 class="text-xl font-medium text-slate-700 mb-6 border-b pb-2">Tarjetas (ui-card)</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <ui-card title="Tarjeta Simple" subtitle="Encabezado estándar.">
                        Contenido básico dentro de la tarjeta con tipografía Roboto.
                    </ui-card>
                    <ui-card title="Tarjeta con Icono" icon="monitoring" subtitle="Uso de iconos MIDAGRI.">
                        Ideal para KPIs y resúmenes ejecutivos.
                    </ui-card>
                    <ui-card title="Tarjeta con Footer" [hasFooter]="true">
                        Acciones principales abajo.
                        <div footer class="flex justify-end gap-2">
                            <ui-button severity="ghost">Omitir</ui-button>
                            <ui-button severity="outline">Guardar</ui-button>
                        </div>
                    </ui-card>
                </div>
            </section>

            <section class="mb-12">
                <h2 class="text-xl font-medium text-slate-700 mb-6 border-b pb-2">Modales (ui-modal)</h2>
                <ui-card title="Control de Diálogos">
                    <ui-button severity="primary" (onClick)="showModal = true">Abrir Modal de Ejemplo</ui-button>
                    
                    <app-ui-modal 
                        [visible]="showModal" 
                        header="Confirmación de Acción" 
                        (onClose)="showModal = false"
                        (onConfirm)="handleConfirm()">
                        <p class="text-slate-600">¿Está seguro que desea procesar esta solicitud? Esta acción es irreversible.</p>
                    </app-ui-modal>
                </ui-card>
            </section>
        </div>
    `
})
export class StyleguidePageComponent {
    showModal = false;

    handleConfirm() {
        this.showModal = false;
    }
}

