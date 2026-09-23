// Punto de entrada aparte (`@agroideas/ui/map`): Leaflet solo entra en los
// bundles lazy que lo usan, no en el inicial vía el barrel `@agroideas/ui`.
export * from './lib/ui-map/ui-map.component';
