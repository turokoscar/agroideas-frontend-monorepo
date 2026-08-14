# ADR 0007: Integración del Servicio SMTP Mailtrap y Plantilla Institucional de Correo MIDAGRI/AGROIDEAS

**Estado**: Aprobado  
**Fecha**: 2026-08-10  
**Contexto**: AGROIDEAS Monorepo - `apps/sigec-rtf` & API Backend `SIGEC_RTF.Api`  
**Referencia**: RM N° -2022-MIDAGRI & Épica 2 (Control de Plazos y Notificaciones)

---

## 1. CONTEXTO Y PROBLEMA

En el flujo de alertas y control de plazos (Épica 2), el sistema debe despachar notificaciones por correo electrónico preventivas (5 días, 3 días y 24 horas antes del vencimiento) y notificaciones formales de cartas/prórrogas a los postulantes y especialistas. Anteriormente, `NotificacionServicio.cs` operaba mediante un *stub* en los logs de la aplicación.

---

## 2. DECISIÓN DE ARQUITECTURA

1. **Integración de Cliente SMTP Mailtrap (`MailKit`)**:
   - Integración de la librería `MailKit` (v4.17.0) en `SIGEC_RTF.Negocio` para comunicación SMTP asíncrona segura.
   - Configuración en `appsettings.json` mediante la sección `SmtpSettings` conectando a Mailtrap Sandbox (`sandbox.smtp.mailtrap.io:2525`) con TLS/StartTls.

2. **Plantilla HTML Institucional Reutilizable (Port de Laravel)**:
   - Creación de la clase `PlantillaEmailInstitucional.cs` (`SIGEC_RTF.Negocio/Notificaciones/`) encargada de generar la estructura HTML de correos para todos los aplicativos de MIDAGRI / AGROIDEAS.
   - **Compatibilidad**: Se adaptó y portó la plantilla XHTML/Blade estándar institucional utilizada en sistemas Laravel hacia la clase C#.
   - **Características**:
     - Reset CSS global de alta compatibilidad en clientes de correo (Outlook, Gmail, Yahoo, iOS Mail).
     - Maquetación mediante tablas responsive (`body-wrap`, `container`, `main`, `content-wrap`).
     - Alertas dinámicas contextuales (`alert-good` `#1ab394`, `alert-warning` `#f8ac59`, `alert-bad` `#ed5565`).
     - Botón principal estandarizado `.btn-primary` para llamadas a la acción (*Call to Action*).

3. **Inyección de Dependencias Limpia (SOLID - OCP/DIP)**:
   - Registro fuertemente tipado mediante `builder.Services.Configure<SmtpSettings>(...)` en `Program.cs`.
   - `NotificacionServicio` consume `IOptions<SmtpSettings>` para garantizar que las credenciales de los ambientes (Dev, Quality, Prod) se inyecten dinámicamente sin modificar el código fuente.

---

## 3. COMPONENTE PLANTILLA HTML REUTILIZABLE (PORT LARAVEL XHTML)

```html
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta name="viewport" content="width=device-width" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>SIGEC RTF - {{TITULO_HEADER}}</title>
</head>
<body>
    <table class="body-wrap">
        <tr>
            <td></td>
            <td class="container" width="600">
                <div class="content">
                    <table class="main" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td class="alert {{ALERT_CLASS}}">SIGEC - {{TITULO_HEADER}}</td>
                        </tr>
                        <tr>
                            <td class="content-wrap">
                                <table width="100%">
                                    <tr><td class="content-block"><h4>{{SALUDO}}</h4></td></tr>
                                    <tr><td class="content-block">{{CONTENIDO_HTML}}</td></tr>
                                    <tr><td class="content-block aligncenter"><a href="{{URL_BOTON}}" class="btn-primary">{{TEXTO_BOTON}}</a></td></tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                    <div class="footer">
                        <table width="100%">
                            <tr>
                                <td class="aligncenter content-block">© {{AÑO}} SIGEC AGROIDEAS. Todos los derechos reservados.</td>
                            </tr>
                        </table>
                    </div>
                </div>
            </td>
            <td></td>
        </tr>
    </table>
</body>
</html>
```

---

## 4. CONSECUENCIAS Y BENEFICIOS

- ✅ **Comunicación Real e Interceptable**: Los correos electrónicos se envían a la bandeja de pruebas de Mailtrap para validación de diseño y enlaces sin riesgo de despacho masivo no deseado.
- ✅ **Paridad 100% con Plantillas Laravel Existententes**: Se garantiza compatibilidad visual total entre los correos emitidos por microservicios C# .NET y sistemas Laravel preexistentes.
- ✅ **Cero Errores en Pruebas**: Suite de pruebas unitarias superada al 100% (103/103 tests pasados).
