/* eslint-disable @angular-eslint/directive-selector */
import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect } from '@angular/core';
import { PermissionService } from './permission.service';

@Directive({
    selector: '[appHasPermission]',
    standalone: true
})
export class HasPermissionDirective {
    private permissionService = inject(PermissionService);
    private templateRef = inject(TemplateRef<unknown>);
    private viewContainer = inject(ViewContainerRef);

    private permissions: string[] = [];
    private logicalOp: 'AND' | 'OR' = 'OR';

    @Input() set appHasPermission(val: string | string[]) {
        this.permissions = Array.isArray(val) ? val : [val];
    }

    @Input() set appHasPermissionOp(op: 'AND' | 'OR') {
        this.logicalOp = op;
    }

    constructor() {
        // Reaccionar a cambios en los permisos globales
        effect(() => {
            // Se lee el signal para registrar la dependencia reactiva
            this.permissionService.permissions();
            this.updateView();
        });
    }

    private updateView() {
        let hasAccess = false;

        if (this.logicalOp === 'OR') {
            hasAccess = this.permissionService.hasAnyPermission(this.permissions);
        } else {
            hasAccess = this.permissionService.hasAllPermissions(this.permissions);
        }

        if (hasAccess) {
            if (this.viewContainer.length === 0) {
                this.viewContainer.createEmbeddedView(this.templateRef);
            }
        } else {
            this.viewContainer.clear();
        }
    }
}
