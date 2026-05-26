const fs = require('fs');
const path = require('path');

const targetDir = '/home/opazos/MyProjects/AGROIDEAS/YACHAP_APP/agroideas-frontend-monorepo/apps/kofix-ejecucion/src/app';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(filePath));
        } else {
            if (filePath.endsWith('.ts') || filePath.endsWith('.html')) {
                results.push(filePath);
            }
        }
    });
    return results;
}

const files = walk(targetDir);
console.log(`Encontrados ${files.length} archivos para procesar.`);

let updatedCount = 0;

files.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Re-apuntar componentes UI: de '../shared/components/ui-button/ui-button.component' (o similar) a '@agroideas/ui'
    // Regex para capturar cualquier import de ui-components
    content = content.replace(
        /import\s+\{([^}]+)\}\s+from\s+['"][^'"]*shared\/components\/ui-([^'"]+)['"];?/g,
        "import { $1 } from '@agroideas/ui';"
    );
    
    // Para capturar especificamente imports directos a los archivos del componente
    content = content.replace(
        /import\s+\{([^}]+)\}\s+from\s+['"][^'"]*shared\/components\/ui-([^/]+)\/[^'"]+['"];?/g,
        "import { $1 } from '@agroideas/ui';"
    );

    // 2. Re-apuntar utilitarios: de '../shared/utils/...' a '@agroideas/utils'
    content = content.replace(
        /import\s+\{([^}]+)\}\s+from\s+['"][^'"]*shared\/utils\/[^'"]+['"];?/g,
        "import { $1 } from '@agroideas/utils';"
    );

    // 3. Re-apuntar alert service: de '../shared/services/alert.service' a '@agroideas/feedback'
    content = content.replace(
        /import\s+\{([^}]+)\}\s+from\s+['"][^'"]*shared\/services\/alert\.service['"];?/g,
        "import { $1 } from '@agroideas/feedback';"
    );

    // 4. Re-apuntar permission service y directiva:
    content = content.replace(
        /import\s+\{([^}]+)\}\s+from\s+['"][^'"]*shared\/services\/permission\.service['"];?/g,
        "import { $1 } from '@agroideas/security';"
    );
    content = content.replace(
        /import\s+\{([^}]+)\}\s+from\s+['"][^'"]*shared\/directives\/has-permission\.directive['"];?/g,
        "import { $1 } from '@agroideas/security';"
    );

    // 5. Re-apuntar ResponseDto:
    content = content.replace(
        /import\s+\{([^}]+)\}\s+from\s+['"][^'"]*(?:domain\/models\/response-dto\.model|shared\/utils\/response\.dto)['"];?/g,
        "import { $1 } from '@agroideas/utils';"
    );

    // 6. Re-apuntar authInterceptor
    content = content.replace(
        /import\s+\{([^}]+)\}\s+from\s+['"][^'"]*auth\.interceptor['"];?/g,
        "import { $1 } from '@agroideas/auth';"
    );

    // 7. Corrección especial para imports duplicados de la misma librería
    // (A veces al sustituir varios archivos independientes, quedan imports repetidos de '@agroideas/ui' o '@agroideas/utils')
    if (filePath.endsWith('.ts')) {
        const lines = content.split('\n');
        const importsByLib = {};
        const cleanedLines = [];

        lines.forEach(line => {
            const match = line.match(/^import\s+\{([^}]+)\}\s+from\s+['"](@agroideas\/[^'"]+)['"];?/);
            if (match) {
                const lib = match[2];
                const specifiers = match[1].split(',').map(s => s.trim()).filter(Boolean);
                if (!importsByLib[lib]) {
                    importsByLib[lib] = [];
                }
                importsByLib[lib].push(...specifiers);
            } else {
                cleanedLines.push(line);
            }
        });

        // Insertar los imports combinados al principio de los cleanedLines (o antes del primer import restante)
        const combinedImports = [];
        for (const [lib, specifiers] of Object.entries(importsByLib)) {
            const uniqueSpecifiers = [...new Set(specifiers)].sort();
            combinedImports.push(`import { ${uniqueSpecifiers.join(', ')} } from '${lib}';`);
        }

        content = combinedImports.concat(cleanedLines).join('\n');
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Actualizado: ${path.basename(filePath)}`);
        updatedCount++;
    }
});

console.log(`Proceso completado. Se actualizaron ${updatedCount} archivos.`);
