// Punto de entrada aparte (`@agroideas/ui/chart`): Chart.js solo entra en los
// bundles lazy que lo usan, no en el inicial vía el barrel `@agroideas/ui`.
export * from './lib/ui-chart/ui-chart.component';
