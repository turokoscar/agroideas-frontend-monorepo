import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DocumentacionRtfModalComponent } from './documentacion-rtf-modal.component';
import { DocumentoRepositorioDto } from '../../core/models';

/**
 * Cubre solo el bug encontrado en la revisión UX de ADR-017/019: "Descargar todo (.zip)" quedaba
 * habilitado aunque la tabla mostrara "No hay anexos firmados ni informes registrados" -- el
 * `[disabled]` comparaba contra `documentos()` (lista cruda, incluye evidencias que el modal
 * deliberadamente no lista) en vez de `documentosOrdenados()` (lo que el usuario realmente ve).
 */
describe('DocumentacionRtfModalComponent — botón "Descargar todo" (ADR-017/019, hallazgo UX)', () => {
  function crearComponente() {
    TestBed.configureTestingModule({
      imports: [DocumentacionRtfModalComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return TestBed.createComponent(DocumentacionRtfModalComponent);
  }

  function botonDescargarZip(fixture: ReturnType<typeof crearComponente>) {
    const uiButtons = fixture.debugElement.queryAll(By.css('ui-button'));
    // Es el único ui-button del footer (los de cada fila son <button> nativos, no ui-button).
    return uiButtons[uiButtons.length - 1].nativeElement.querySelector('button') as HTMLButtonElement;
  }

  it('disables the zip button when there is nothing the user can actually see in the table', () => {
    const fixture = crearComponente();
    fixture.componentInstance.open.set(true);
    fixture.componentInstance.rtfId.set(1);
    // Solo evidencias -- el modal las excluye a propósito (ver comentario de la clase), así que
    // la tabla queda vacía aunque `documentos()` no lo esté.
    fixture.componentInstance.documentos.set([
      { categoria: 'EVIDENCIA', tipConcepto: 'EVIDENCIA_META', txtNombreArchivo: 'ev.pdf', fecRegistro: '2026-09-01' } as DocumentoRepositorioDto,
    ]);
    fixture.detectChanges();

    expect(fixture.componentInstance.documentos().length).toBe(1);
    expect(fixture.componentInstance.documentosOrdenados().length).toBe(0);
    expect(botonDescargarZip(fixture).disabled).toBe(true);
  });

  it('enables the zip button once there is at least one Anexo/Informe to show', () => {
    const fixture = crearComponente();
    fixture.componentInstance.open.set(true);
    fixture.componentInstance.rtfId.set(1);
    fixture.componentInstance.documentos.set([
      { categoria: 'ANEXO_17', tipConcepto: 'ANEXO17_FIRMADO', txtNombreArchivo: 'anexo17.pdf', fecRegistro: '2026-09-01' } as DocumentoRepositorioDto,
    ]);
    fixture.detectChanges();

    expect(fixture.componentInstance.documentosOrdenados().length).toBe(1);
    expect(botonDescargarZip(fixture).disabled).toBe(false);
  });
});
