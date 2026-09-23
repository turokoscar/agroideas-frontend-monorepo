# ADR-020: Resumen de avances — Módulo RTF de SIGEC (1 al 22 de setiembre de 2026)

> **Nota**: a diferencia de los demás documentos de esta carpeta, este no registra una decisión
> técnica nueva. Es un resumen en lenguaje simple, para reporte de avances, de todo lo que se
> decidió e implementó en el módulo RTF durante las primeras tres semanas de setiembre de 2026 —
> tanto en la pantalla que usan las organizaciones y los evaluadores, como en el motor que procesa
> la información detrás. No reemplaza a los documentos originales, solo los traduce.

## Estado
Informativo.

## Fecha
22/09/2026

## Responsables
Equipo AGROIDEAS (pantalla y motor) · Owner del módulo: Oscar Pazos

## Aplica a
Módulo RTF (Reporte Técnico Financiero) de SIGEC: la pantalla donde las organizaciones que
reciben apoyo de AGROIDEAS reportan su avance, y donde el equipo de AGROIDEAS (Unidad de Negocios)
lo revisa y aprueba o rechaza.

---

## En una frase

En tres semanas, el proceso de reportar y revisar avances pasó de estar "a medias" —con los
plazos legales incompletos, los documentos oficiales sin trazabilidad, y sin comunicación clara
entre quien reporta y quien evalúa— a tener el ciclo completo funcionando de principio a fin. En
el camino se encontraron y corrigieron **9 errores reales** que ya estaban afectando, o iban a
afectar, el uso diario del sistema.

## Qué es el RTF, en una frase

Cada organización que recibe financiamiento de AGROIDEAS debe informar periódicamente en qué
gastó el dinero y qué avances logró (el "RTF"). Un especialista de AGROIDEAS revisa ese informe,
puede pedir correcciones, y finalmente lo aprueba o lo rechaza. Si la organización no informa a
tiempo, la ley establece plazos y sanciones que el sistema debe aplicar solo, sin que nadie tenga
que estar pendiente manualmente.

## Qué se logró este mes

### 1. Los plazos legales ahora se cumplen solos
Antes, si una organización no enviaba su informe a tiempo, el sistema no hacía nada al respecto.
Ahora, de forma automática: avisa a la organización cuando se le vence el plazo, le envía un
recordatorio formal y, si sigue sin responder, una notificación notarial; y si aun así no
regulariza, bloquea su acceso y lo marca para que AGROIDEAS inicie el proceso de resolución del
convenio. También se creó una pantalla nueva para que los especialistas vean de un vistazo qué
organizaciones están atrasadas y en qué etapa del proceso legal se encuentran.

Se encontraron y corrigieron **2 errores reales** en este punto: un plazo automático que nunca se
activaba solo, y —el más grave— el bloqueo final por incumplimiento, que es el corazón de todo
este proceso legal, **no se estaba disparando nunca** en la práctica. Se corrigió y se comprobó
en vivo el mismo día que se detectó.

### 2. La comunicación entre la organización y el evaluador ahora es clara
Antes, cuando un especialista de AGROIDEAS encontraba algo mal en un informe, la organización no
tenía forma de saber con exactitud qué parte corregir. Ahora el sistema le muestra a la
organización, punto por punto, cada observación, y no la deja reenviar su informe hasta que las
haya atendido todas.

### 3. Los dos documentos oficiales del proceso ya funcionan bien
Este proceso tiene dos documentos formales, uno de cada lado:

- **Anexo 17** — el informe que firma la organización al presentar su avance. Antes se generaba
  incompleto (le faltaban páginas) y en algunos casos **ni siquiera quedaba guardado** al momento
  de enviarse. Ahora sale completo, y cada copia lleva un código de verificación único para
  detectar si alguien la modificó después de firmarla.
- **Anexo 18** — el informe final que emite el especialista de AGROIDEAS al cerrar la evaluación
  (sus conclusiones, recomendaciones y la calificación final). Su formulario ya funciona de forma
  completa; se corrigió además un error real que podía impedir guardarlo cuando la fecha del
  informe no quedaba registrada correctamente.

*Adicional (hoy, 22/09): se reorganizó visualmente el formulario del Anexo 18 para que sea más
fácil de llenar — ver punto 7.*

### 4. Los montos de dinero que se muestran ahora son correctos
Se encontró un error de cálculo real: en la pantalla que muestra cuánto puso AGROIDEAS y cuánto
puso la organización, un descuento se estaba aplicando dos veces, lo que mostraba montos
equivocados. Ya está corregido y se verificó cruzando la información con los otros sistemas de
AGROIDEAS.

### 5. Se cerraron dos brechas de seguridad reales
Primero, se encontraron contraseñas y llaves de acceso guardadas sin protección dentro del propio
sistema, además de conexiones que aceptaban cualquier certificado sin validarlo. Segundo, y más
delicado: cualquier organización que iniciaba sesión podía llegar a ver los informes de **otras
organizaciones**, no solo los suyos, porque esa restricción nunca se exigía del lado del servidor.
Ambas cosas ya están corregidas.

### 6. El rol de Administrador ahora tiene su propia sección
Antes, un Administrador del sistema hacía exactamente lo mismo que cualquier especialista
evaluador, sin ninguna herramienta adicional. Ahora tiene su propia área para configurar los
plazos legales sin depender de un cambio de sistema, y para ver reportes de cumplimiento de
plazos y de productividad por especialista.

### 7. La pantalla de revisión es más fácil de usar
Se reorganizó la pantalla donde el especialista revisa cada informe: antes había que bajar por
varios bloques de información uno debajo del otro; ahora están organizados en pestañas, y la
bandeja de trabajo separa "informes nuevos por revisar" de "convenios atrasados por gestionar".
También se rediseñó la pantalla de inicio de sesión con la imagen institucional de
MIDAGRI/AGROIDEAS.

*Adicional (hoy, 22/09, en revisión — todavía sin documento propio): se le dio un ordenamiento
visual más claro a esta misma pantalla de revisión, con un resumen del expediente más legible y
un panel fijo con la decisión del evaluador siempre visible, sin tener que bajar hasta el final
para actuar. También se reorganizó el formulario del Anexo 18 (punto 3): sus campos, antes
apilados uno debajo del otro en una columna angosta, ahora se distribuyen en dos columnas más
fáciles de leer y llenar.*

### 8. Limpieza de fondo
Se revisó y ordenó código que ya no se usaba (tablas antiguas que ya nadie llenaba, alertas de
calidad pendientes de resolver), dejando el sistema más fácil de mantener sin cambiar nada de lo
que ve el usuario final.

## En números

- **21 documentos de decisión** revisados para este resumen: 10 del lado de la pantalla y 11 del
  lado del motor.
- **9 errores reales** encontrados y corregidos en el camino, incluyendo 2 de seguridad y 1 pieza
  legal completa que no funcionaba en la práctica.
- **3 semanas** de trabajo (1 al 22 de setiembre).
- **0 errores** en las verificaciones automáticas del sistema al cierre de cada cambio.

## Qué queda pendiente / por vigilar

- Documentar como decisión aparte el ordenamiento visual adicional del 22/09 (punto 7) — hoy vive
  solo en el código, sin su propio documento.
- Una revisión interna del 16/09 encontró 2 contradicciones menores entre decisiones anteriores
  que aún no se resolvieron formalmente. No afectan el funcionamiento actual del sistema; son
  temas de orden documental.
- Seguir de cerca la pantalla de montos financieros (punto 4): dos ajustes distintos la tocaron el
  mismo día, y conviene confirmar que ambos quedaron alineados.

---

*Este resumen no reemplaza a los documentos de decisión originales — es una traducción a lenguaje
simple para reporte de avances. Para el detalle completo de cada punto: ADR-010 a ADR-019 (pantalla,
en esta carpeta y en `docs/adr/` de este repo) y ADR-008 a ADR-018 (motor, en el repo `sigec-api-rtf`).*
