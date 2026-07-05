# 🏛️ Monorepo Frontend — AGROIDEAS

<div align="center">
  <img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="90" alt="Nx Logo" />
  <h3>Ecosistema Unificado de Aplicaciones Frontend para AGROIDEAS</h3>
  <p>Monorepo de alto rendimiento basado en <strong>Nx 19.8.14</strong> y <strong>Angular 18.2 (Standalone)</strong> con un sistema de diseño agnóstico y modular.</p>

  [![Nx](https://img.shields.io/badge/Nx-19.8.14-blueviolet?style=flat-square&logo=nx)](https://nx.dev)
  [![Angular](https://img.shields.io/badge/Angular-18.2.0-red?style=flat-square&logo=angular)](https://angular.io)
  [![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4.17-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
  [![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
</div>

---

## 📋 Descripción General

Este repositorio unifica las aplicaciones frontend de **AGROIDEAS** bajo una arquitectura robusta de monorepo. Utiliza un **Sistema de Diseño (Design System)** propio y agnóstico que implementa la identidad visual institucional de **MIDAGRI / INIA** utilizando colores estandarizados (`#346b00` verde primario) y prohíbe el uso directo de proveedores de componentes terceros en las aplicaciones para garantizar consistencia, mantenibilidad y escalabilidad.

---

## 📂 Arquitectura del Repositorio

El monorepo se organiza bajo la convención de **Nx** en aplicaciones (`apps/`) y librerías transversales (`libs/`), con límites estrictos de dependencias configurados en el linter (`@nx/enforce-module-boundaries`).

```
├── apps/
│   ├── kofix-ejecucion/     # Aplicación de ejecución de planes (referencia de diseño) [Puerto: 7100]
│   ├── kofix-ejecucion-e2e/ # Pruebas End-to-End con Playwright para kofix
│   ├── sat-ui/              # Aplicación de Seguimiento y Acompañamiento Técnico [Puerto: 4200]
│   ├── sat-ui-e2e/          # Pruebas End-to-End con Playwright para sat-ui
│   ├── sigec-rtf/           # Módulo de Reporte Técnico Financiero - SIGEC [Puerto: 4300]
│   ├── sigec-rtf-e2e/       # Pruebas End-to-End con Playwright para sigec-rtf
│   ├── sigec-cierre/        # Módulo de Cierre de Convenios - SIGEC [Puerto: 4400]
│   └── sigec-cierre-e2e/    # Pruebas End-to-End con Playwright para sigec-cierre
│
└── libs/
    ├── theme/               # @agroideas/theme     -> Tokens de diseño HSL y preset de TailwindCSS
    ├── ui/                  # @agroideas/ui        -> Componentes de UI reutilizables (ui-button, ui-card, etc.)
    ├── auth/                # @agroideas/auth      -> Autenticación JWT, Interceptor, Guard y Login
    ├── http/                # @agroideas/http      -> Respuestas estandarizadas (ResponseDto) y cliente HTTP base
    ├── feedback/            # @agroideas/feedback  -> Centralización de alertas y diálogos (SweetAlert2)
    ├── security/            # @agroideas/security  -> Directivas y servicios de control de acceso por permisos
    └── utils/               # @agroideas/utils     -> Utilidades puras de TypeScript (formatos, JWT, storage-keys)
```

---

## 🛠️ Requisitos Previos

Asegúrate de tener instaladas las siguientes herramientas en tu entorno de desarrollo local:
*   [Node.js](https://nodejs.org/) (Versión **18.x** o **20.x** LTS recomendada)
*   [npm](https://www.npmjs.com/) (Gestor de paquetes integrado con Node.js)

---

## 🚀 Proceso de Instalación

Sigue estos pasos para poner en marcha el proyecto localmente:

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/turokoscar/agroideas-frontend-monorepo.git
    cd agroideas-frontend-monorepo
    ```

2.  **Instalar las dependencias de npm:**
    > [vanilla] [IMPORTANT]
    > No utilices comandos de actualización global ni actualices individualmente las dependencias de ESLint o TypeScript-ESLint, ya que están fijadas en un stack compatible específico.
    
    ```bash
    npm install
    ```

3.  **Visualizar el grafo de dependencias (Opcional pero altamente recomendado):**
    Permite comprender visualmente la estructura y dependencias entre las aplicaciones y las librerías transversales:
    ```bash
    npx nx graph
    ```

---

## 💻 Desarrollo Local (Comandos Clave)

Todos los comandos se deben ejecutar utilizando el comando `npx nx` para asegurar el uso de la versión de Nx local del proyecto. **No ejecutes scripts de npm directamente.**

### Servidor de Desarrollo
Para levantar los servidores de desarrollo de manera local:

*   **SAT UI** (Seguimiento Técnico):
    ```bash
    npx nx serve sat-ui
    ```
    *Accede localmente en: http://localhost:4200*

*   **KOFIX** (Ejecución):
    ```bash
    npx nx serve kofix-ejecucion
    ```
    *Accede localmente en: http://localhost:7100*

*   **SIGEC RTF** (Reporte Técnico Financiero):
    ```bash
    npx nx serve sigec-rtf --port=4300
    ```
    *Accede localmente en: http://localhost:4300*

*   **SIGEC CIERRE** (Cierre de Convenios):
    ```bash
    npx nx serve sigec-cierre --port=4400
    ```
    *Accede localmente en: http://localhost:4400*

### Asegurar Calidad (Linting y Testing)
*   **Analizar el código con el Linter:**
    ```bash
    npx nx lint <proyecto>     # Ejemplo: npx nx lint sigec-rtf
    ```
*   **Ejecutar pruebas unitarias (Jest):**
    ```bash
    npx nx test <proyecto>     # Ejemplo: npx nx test sigec-rtf
    ```
*   **Ejecutar tareas únicamente en proyectos afectados por cambios locales:**
    ```bash
    npx nx affected -t lint,test,build
    ```

---

## 🔀 Reglas de Límites de Módulos (Module Boundaries)

Para evitar dependencias circulares y asegurar una arquitectura desacoplada, se aplican las siguientes reglas de arquitectura controladas por ESLint:

1.  **Sin dependencias cruzadas entre aplicaciones:** Las aplicaciones (`sat-ui`, `kofix-ejecucion`, `sigec-rtf`, `sigec-cierre`) no pueden importarse entre sí.
2.  **Arquitectura Unidireccional:** Las aplicaciones dependen de librerías en `libs/`.
3.  **Prohibición de Proveedores Directos:** Las aplicaciones **no deben importar directamente** librerías externas de UI como `primeng`, `@angular/material`, `@angular/cdk`, `bootstrap`, `sweetalert2` o `leaflet`. Todo el consumo debe realizarse de forma indirecta consumiendo `@agroideas/ui`, `@agroideas/feedback`, etc.

---

## 🌐 Proceso de Despliegue

El despliegue de las aplicaciones en producción consta de dos pasos principales: **compilación (build)** y **distribución estática**.

### 1. Compilación para Producción (Build)

Genera los archivos optimizados (minificados, con tree-shaking y compilación AOT) ejecutando:

*   **Construir SAT UI:**
    ```bash
    npx nx build sat-ui
    ```
*   **Construir KOFIX:**
    ```bash
    npx nx build kofix-ejecucion
    ```
*   **Construir SIGEC RTF:**
    ```bash
    npx nx build sigec-rtf
    ```
*   **Construir SIGEC CIERRE:**
    ```bash
    npx nx build sigec-cierre
    ```
*   **Construir todos los proyectos:**
    ```bash
    npx nx run-many -t build
    ```

Los archivos resultantes se generarán en la ruta:
*   `dist/apps/sat-ui/browser/`
*   `dist/apps/kofix-ejecucion/browser/`
*   `dist/apps/sigec-rtf/browser/`
*   `dist/apps/sigec-cierre/browser/`

### 2. Configuración y Despliegue en el Servidor (Hosting)

Dado que las aplicaciones son SPA (Single Page Applications) generadas como archivos estáticos (HTML, CSS y JS), se pueden servir mediante cualquier servidor web de alto rendimiento.

#### Opción A: Despliegue mediante Nginx (Recomendado)
A continuación se presenta un archivo de configuración básico de Nginx (`nginx.conf`) que incluye el manejo correcto de rutas para Angular (redirección a `index.html` para evitar errores `404` en recargas de página):

```nginx
server {
    listen 80;
    server_name sat.agroideas.gob.pe;

    location / {
        root /usr/share/nginx/html/sat-ui;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

#### Opción B: Contenedores Docker (Producción)
Se puede empaquetar la aplicación en una imagen ligera de Docker utilizando Nginx:

```dockerfile
# Paso 1: Servir con Nginx
FROM nginx:alpine
COPY dist/apps/sat-ui/browser /usr/share/nginx/html/sat-ui
# Opcional: Reemplazar configuración default de Nginx
# COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Opción C: Servicios Cloud / CDN
Puedes subir el contenido de la carpeta `dist/apps/<app>/browser/` directamente a:
*   **AWS S3** habilitado para Static Website Hosting + CloudFront.
*   **Azure Blob Storage** + Azure CDN.
*   **Cloudflare Pages** o **Vercel**.

---

## 🤝 Documentación Adicional

*   [`CONTRIBUTING.md`](./CONTRIBUTING.md): Guía de desarrollo local, convenciones de tags y creación de nuevos componentes/librerías con los generadores estándar.
*   [`AGENTS.md`](./AGENTS.md): Guía detallada para asistentes inteligentes de codificación y diseño del sistema.
*   [`docs/adr/`](./docs/adr/): Registro de Decisiones de Arquitectura (ADR) del proyecto.
*   [`docs/plan-implementacion-monorepo.md`](./docs/plan-implementacion-monorepo.md): Plan de implementación por fases del monorepo.
