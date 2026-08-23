#!/usr/bin/env bash
# ADR 0008 (Fase 1.5): detecta clases Tailwind que Tailwind JIT descarta en
# silencio porque no existen — el mismo tipo de bug visual que motivó el ADR
# (`text-indigo-650`, `dark:text-slate-250`, `bg-midagri-blue-light/10`).
#
# Dos chequeos:
#   1) Shade fuera de la escala estándar de Tailwind (50/100/.../900/950) sobre
#      un color real de la paleta por defecto — típicamente un typo (650, 250).
#   2) Clases que referencian el color de marca "midagri-*" directamente en vez
#      de los tokens de @agroideas/theme (`info`, `primary`, `secondary`, ...) —
#      ese nombre nunca estuvo declarado en libs/theme/src/tailwind-preset.js.
#
# Uso: bash apps/kofix-ejecucion/scripts/check-tailwind-tokens.sh
set -euo pipefail

SRC="apps/kofix-ejecucion/src"
PREFIXES="text|bg|border|ring|divide|from|via|to|fill|stroke|decoration|placeholder|caret"
COLORS="slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose"
VALID_SHADES="50|100|200|300|400|500|600|700|800|900|950"

FAIL=0

INVALID_SHADES=$(grep -rnoE "\b(${PREFIXES})-(${COLORS})-[0-9]+\b" "$SRC" --include="*.html" --include="*.ts" \
  | grep -vE -- "-(${VALID_SHADES})\b" || true)
if [ -n "$INVALID_SHADES" ]; then
  echo "✖ Shade fuera de la escala estándar de Tailwind (${VALID_SHADES}):"
  echo "$INVALID_SHADES"
  echo ""
  FAIL=1
fi

UNDECLARED_BRAND=$(grep -rnoE "\b(${PREFIXES})-midagri-[a-z-]+\b" "$SRC" --include="*.html" --include="*.ts" || true)
if [ -n "$UNDECLARED_BRAND" ]; then
  echo "✖ Color de marca no declarado en libs/theme/src/tailwind-preset.js:"
  echo "$UNDECLARED_BRAND"
  echo ""
  FAIL=1
fi

if [ "$FAIL" -eq 1 ]; then
  echo "Estas clases no generan CSS (Tailwind las descarta en silencio en build)."
  echo "Usa un shade válido de la paleta estándar o un token del preset (@agroideas/theme: primary, secondary, tertiary, accent, muted, destructive, success, warning, danger, info, card, popover, surface, sidebar)."
  exit 1
fi

echo "OK: sin clases Tailwind inválidas en ${SRC}."
