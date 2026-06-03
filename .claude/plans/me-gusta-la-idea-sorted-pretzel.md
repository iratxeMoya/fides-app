# Plan: Donación orgánica en Fides — "Enciende una vela"

## Context

El usuario quiere integrar un equivalente a "Buy Me a Coffee" que sea coherente con la identidad de Fides: una app de acompañamiento espiritual católico, con tono recogido y serio. El objetivo es permitir donaciones voluntarias sin que se sientan comerciales ni fuera de lugar. **Sin comisiones de ningún tipo** — Bizum como método principal.

---

## La metáfora: "Enciende una vela"

En las iglesias católicas, encender una vela es un gesto de ofrenda voluntaria y anónima. Es exactamente lo que queremos: das lo que puedes, sin presión, como signo de gratitud.

---

## Bizum — ¿se puede hacer directamente?

**Sí, y es la mejor opción para España. Cero comisiones.**

**Cómo funciona en la app:**
- No existe un esquema de URL universal `bizum://` que funcione en todos los bancos (cada banco implementa Bizum diferente en su app)
- Lo que sí se puede hacer: mostrar el número de teléfono y que el usuario lo copie o lo introduzca manualmente en su app bancaria
- Bizum es tan conocido en España que "busca este número en Bizum" es suficiente instrucción — 0 fricción adicional

**Flujo UX:**
1. Usuario pulsa "Encender una vela"
2. Se abre un **bottom sheet o modal** con:
   - El número de teléfono (grande, legible)
   - Botón `Copiar número` (copia al portapapeles)
   - Instrucción breve: "Abre tu app bancaria → Bizum → pega este número"
   - Importe sugerido: libre (el usuario decide)
3. Sin redirigir a ningún sitio externo — todo en la app

**Ventajas:**
- 0% de comisión (ni Bizum ni ningún intermediario)
- Familiar para cualquier usuario español
- No requiere crear cuenta en Ko-fi ni nada externo
- Más íntimo y directo — coherente con el tono de la app

**Inconveniente menor:** el usuario tiene que abrir su app bancaria manualmente. Pero dado que el público objetivo es España y Bizum es ubicuo, esto no es una barrera real.

---

## Copy final

```
Enciende una vela

Si Fides te es útil y te ayuda, puedes contribuir
con lo que quieras — es voluntario y se agradece.
Las contribuciones se destinan exclusivamente
al mantenimiento de la app.

[ 🕯 Encender una vela ]
```

---

## Propuesta de diseño

### Posición
**Última sección del scroll en la pantalla de inicio**, después de `LecturaCard`. Sigue el patrón de animaciones en cascada (sección 6, delay 650ms). Se descubre al llegar al final — no interrumpe.

### Visual del bloque en home
- Separador sutil (1px `#1A1A1A`) antes de la sección
- Sección centrada, sin borde completo de card — más ligera que las tarjetas
- Icono `flame-outline` Ionicons, `#FF7D7D`, 22px
- Título **Cormorant Garamond SemiBold** 18px blanco: *"Enciende una vela"*
- Subtítulo **Inter Regular** 13px `#666666`, 3 líneas
- Botón pill pequeño: borde `rgba(255,125,125,0.3)`, fondo `rgba(255,125,125,0.08)`, texto `#FF7D7D`

### Modal/Bottom sheet al pulsar
Usa `@gorhom/bottom-sheet` (ya está instalado en el proyecto).

Contenido del sheet:
- Icono `flame-outline` grande centrado
- Título "Enciende una vela" (Cormorant, 22px)
- Párrafo con el copy completo
- Número de teléfono grande y legible (Inter SemiBold, 22px, blanco)
- Botón `Copiar número` — copia al portapapeles con feedback visual ("¡Copiado!")
- Instrucción: "Abre tu app bancaria → Bizum → pega este número"
- Nota en gris pequeño: "Importe libre · Sin comisiones"

---

## Implementación

### Archivos a crear/modificar

1. **`components/home/VelaSection.tsx`** — nuevo componente
   - Bloque estático en home con icono + título + subtítulo recortado + botón
   - Abre el bottom sheet al pulsar
   - Contiene el `BottomSheet` con el detalle del número Bizum

2. **`app/(tabs)/index.tsx`**
   - Importar `VelaSection`
   - Añadir como sección 6 en el `ScrollView` (después de `LecturaCard`)
   - Envolver en `Animated.View` con delay 650ms (mismo patrón que las otras)

3. **`constants/donacion.ts`** (nuevo)
   - `BIZUM_NUMERO = "+34 6XX XXX XXX"` (número real a rellenar por el usuario)

### Patrón de animación a reutilizar (de `index.tsx`)
```tsx
// El patrón existente para todas las secciones:
const sectionAnim = useRef(new Animated.Value(0)).current;
// delay: 0, 130, 260, 390, 520 para las 5 secciones actuales → 650 para la 6ª
```

### Dependencias
- `@gorhom/bottom-sheet` — ya instalado
- `Clipboard` de `@react-native-clipboard/clipboard` o `Expo Clipboard` — verificar si está disponible; si no, usar `Share` de React Native como fallback
- `Ionicons` — ya en uso

---

## Verificación

1. La sección aparece al final del scroll, animada igual que las demás
2. Al pulsar "Encender una vela" se abre el bottom sheet
3. El número se muestra correctamente y el botón "Copiar" copia al portapapeles
4. Feedback visual tras copiar (texto cambia a "¡Copiado!" 2 segundos)
5. El sheet se cierra con swipe down o tap fuera
6. En el número de teléfono hay que poner el número real antes de buildear
