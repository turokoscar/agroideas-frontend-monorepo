import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon } from 'sweetalert2';
import { ResponseDto } from '../../domain/models/response-dto.model';

@Injectable({
    providedIn: 'root'
})
export class AlertService {

    constructor() { }

    /**
     * Muestra una alerta básica de SweetAlert2
     */
    async show(title: string, message: string, icon: SweetAlertIcon = 'info') {
        return Swal.fire({
            title: title,
            text: message,
            icon: icon,
            confirmButtonText: 'Aceptar',
            confirmButtonColor: '#008F49', // Midagri Green Dark
            customClass: {
                popup: 'rounded-xl border-none shadow-2xl font-display',
                confirmButton: 'px-8 py-2.5 rounded-lg bg-midagri-green-dark text-white font-bold hover:brightness-110'
            }
        });
    }

    /**
     * Muestra una notificación tipo Toast (esquina)
     */
    toast(message: string, icon: SweetAlertIcon = 'success') {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast: any) => {
                toast.onmouseenter = Swal.stopTimer;
                toast.onmouseleave = Swal.resumeTimer;
            }
        });
        Toast.fire({
            icon: icon,
            title: message
        });
    }

    /**
     * Muestra una alerta basada en el ResponseDto del servidor
     */
    showResponse(res: ResponseDto) {
        const icon: SweetAlertIcon = res.exitoso ? 'success' : 'error';
        const title = res.exitoso ? '¡Éxito!' : 'Ups...';

        return this.show(title, res.mensaje, icon);
    }

    /**
     * Muestra una alerta de confirmación
     */
    async confirm(title: string, text: string) {
        return Swal.fire({
            title: title,
            text: text,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#008F49',
            cancelButtonColor: '#DA8824', // Midagri Earth
            confirmButtonText: 'Sí, continuar',
            cancelButtonText: 'Cancelar',
            customClass: {
                popup: 'rounded-xl font-display',
                confirmButton: 'px-6 py-2 rounded-lg font-bold',
                cancelButton: 'px-6 py-2 rounded-lg font-bold'
            }
        });
    }
}
