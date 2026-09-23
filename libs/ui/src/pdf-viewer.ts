// Punto de entrada aparte (`@agroideas/ui/pdf-viewer`): pdf.js solo entra en los
// bundles lazy que lo usan, no en el inicial vía el barrel `@agroideas/ui`.
export * from './lib/ui-pdf-viewer/ui-pdf-viewer.component';
