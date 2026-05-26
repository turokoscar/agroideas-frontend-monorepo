const nx = require('@nx/eslint-plugin');

/**
 * Límites de módulos del monorepo AGROIDEAS (ver docs/adr/0001).
 *
 * Tags por proyecto (project.json):
 *   scope:kofix | scope:sat | scope:shared
 *   type:app | type:feature | type:ui | type:data-access | type:util
 */
module.exports = [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?js$'],
          depConstraints: [
            // --- por scope ---
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: ['scope:shared'],
            },
            {
              sourceTag: 'scope:kofix',
              onlyDependOnLibsWithTags: ['scope:kofix', 'scope:shared'],
            },
            {
              sourceTag: 'scope:sat',
              onlyDependOnLibsWithTags: ['scope:sat', 'scope:shared'],
            },
            // --- por type ---
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: [
                'type:feature',
                'type:ui',
                'type:data-access',
                'type:util',
              ],
            },
            {
              sourceTag: 'type:feature',
              onlyDependOnLibsWithTags: [
                'type:feature',
                'type:ui',
                'type:data-access',
                'type:util',
              ],
            },
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: ['type:ui', 'type:util'],
            },
            {
              sourceTag: 'type:data-access',
              onlyDependOnLibsWithTags: ['type:data-access', 'type:util'],
            },
            {
              sourceTag: 'type:util',
              onlyDependOnLibsWithTags: ['type:util'],
            },
          ],
        },
      ],
    },
  },
  {
    // Invariante: las apps consumen @agroideas/ui, no el proveedor directo.
    // NOTA: durante el lift & shift de KOFIX (Fase 2) y hasta completar la
    // extracción de @agroideas/ui (Fase 3), kofix-ejecucion puede requerir un
    // override local temporal en apps/kofix-ejecucion/eslint.config.js.
    files: ['apps/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'sweetalert2',
              message: 'Usa @agroideas/feedback (AlertService) en lugar de SweetAlert2 directo.',
            },
          ],
          patterns: [
            {
              group: ['primeng', 'primeng/*'],
              message: 'No importes PrimeNG en apps: consúmelo vía @agroideas/ui.',
            },
            {
              group: ['@angular/material', '@angular/material/*'],
              message: 'Angular Material está descontinuado en el portafolio: usa @agroideas/ui.',
            },
            {
              group: ['@angular/cdk', '@angular/cdk/*'],
              message: 'Accede a CDK a través de @agroideas/ui, no desde apps.',
            },
            {
              group: ['@ng-bootstrap/*', 'bootstrap'],
              message: 'Bootstrap/ng-bootstrap solo dentro de @agroideas/ui.',
            },
            {
              group: ['leaflet'],
              message: 'Usa el componente ui-map de @agroideas/ui en lugar de Leaflet directo.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    // Override o reglas adicionales aquí.
    rules: {},
  },
  {
    // angular-eslint usa el parser de plantillas en .html. Las reglas TS
    // "universales" de @nx/eslint-plugin (declaradas sin `files`) se filtran a
    // los .html; `@typescript-eslint/ban-ts-comment` revienta sobre el AST de
    // plantilla (no tiene comentarios). Se desactiva en plantillas. Debe ir al
    // final para ganar por precedencia de flat config.
    files: ['**/*.html'],
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },
];
