import { ResponseDto } from '@agroideas/utils';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface FileUploadResult {
    fileUrl: string;
}

@Injectable({
    providedIn: 'root'
})
export class FileStorageService {
    private apiUrl = `${environment.apiArchivos}/archivos`;

    private readonly MAX_FILE_SIZE_MB = 10;
    private readonly ALLOWED_MIME_TYPE = 'application/pdf';
    private readonly ALLOWED_EXTENSIONS = ['.pdf'];

    constructor(private http: HttpClient) { }

    uploadFile(file: File, subDirectory = 'general'): Observable<FileUploadResult> {
        const validation = this.validateFile(file);
        if (!validation.valid) {
            return throwError(() => new Error(validation.error));
        }

        const formData = new FormData();
        formData.append('archivo', file);
        formData.append('codSistema', 'KOFIX');
        
        let codProceso = 'GENERAL';
        if (subDirectory === 'no-objeciones') {
            codProceso = 'NO_OBJECIONES';
        } else if (subDirectory === 'rendiciones') {
            codProceso = 'RENDICIONES';
        }
        formData.append('codProceso', codProceso);

        return this.http.post<ResponseDto<{ ideArchivo: string }>>(`${this.apiUrl}`, formData).pipe(
            map(res => ({ fileUrl: res.datos!.ideArchivo }))
        );
    }

    downloadFile(fileUrl: string): Observable<Blob> {
        const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fileUrl);
        if (isGuid) {
            return this.http.get(`${this.apiUrl}/${fileUrl}/descarga`, {
                responseType: 'blob'
            });
        }
        return this.http.get(`${environment.apiEjecucion}/archivos/download/${encodeURIComponent(fileUrl)}`, {
            responseType: 'blob'
        });
    }

    deleteFile(fileUrl: string): Observable<any> {
        const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fileUrl);
        if (isGuid) {
            return this.http.delete<any>(`${this.apiUrl}/${fileUrl}`);
        }
        return this.http.delete<any>(`${environment.apiEjecucion}/archivos/delete/${encodeURIComponent(fileUrl)}`);
    }

    validateFile(file: File): { valid: boolean; error?: string } {
        if (!file) {
            return { valid: false, error: 'No se proporcionó un archivo.' };
        }

        if (file.size === 0) {
            return { valid: false, error: 'El archivo está vacío.' };
        }

        const maxSizeBytes = this.MAX_FILE_SIZE_MB * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            return { valid: false, error: `El archivo excede el tamaño máximo de ${this.MAX_FILE_SIZE_MB}MB.` };
        }

        const extension = this.getFileExtension(file.name);
        if (!this.ALLOWED_EXTENSIONS.includes(extension)) {
            return { valid: false, error: `Formato inválido. Solo se permiten archivos PDF.` };
        }

        if (file.type !== this.ALLOWED_MIME_TYPE) {
            return { valid: false, error: `Formato inválido. Solo se permiten archivos PDF.` };
        }

        return { valid: true };
    }

    private getFileExtension(fileName: string): string {
        const lastDotIndex = fileName.lastIndexOf('.');
        return lastDotIndex >= 0 ? fileName.substring(lastDotIndex).toLowerCase() : '';
    }

    openFile(fileUrl: string): void {
        this.downloadFile(fileUrl).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = this.extractFileName(fileUrl) || 'documento.pdf';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            },
            error: (err) => {
                // Error handled by AlertService or removed
            }
        });
    }

    private extractFileName(fileUrl: string): string {
        try {
            const urlParts = fileUrl.split('/');
            return urlParts[urlParts.length - 1] || 'documento.pdf';
        } catch {
            return 'documento.pdf';
        }
    }
}