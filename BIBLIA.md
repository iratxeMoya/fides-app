# BIBLIA.md — Sistema de Lecturas Litúrgicas Diarias

Documento técnico de referencia sobre cómo la app Fides obtiene, procesa y muestra las lecturas litúrgicas del día.

---

## 1. Visión general

Cada vez que el usuario abre la pantalla "Lectura", la app:

1. Consulta qué lecturas corresponden a ese día según el calendario litúrgico católico.
2. Obtiene el texto completo de cada lectura en español.
3. Calcula el tiempo litúrgico y el color asociado.
4. Muestra la Primera Lectura, el Salmo y el Evangelio.
5. Permite al usuario reflexionar mediante notas propias o chat con IA.

---

## 2. APIs externas

El sistema usa dos APIs externas encadenadas:

### 2.1 CPBJR — Leccionario (referencias del día)

```
https://cpbjr.github.io/catholic-readings-api/readings/{YYYY}/{MM-DD}.json
```

- **Fuente:** repositorio estático en GitHub basado en el leccionario **USCCB** (U.S. Conference of Catholic Bishops).
- **Qué devuelve:** las referencias bíblicas del día (no el texto).
- **Formato de respuesta:**

```json
{
  "date": "2025-04-27",
  "season": "Easter",
  "readings": {
    "firstReading": "Acts 4:8-12",
    "psalm":        "Psalm 118:1, 8-9, 21-23, 26, 28, 29",
    "secondReading": null,
    "gospel":       "John 10:11-18"
  }
}
```

- **Notas:** el campo `secondReading` solo aparece en domingos y solemnidades. Los días laborables ordinarios solo incluyen `firstReading`, `psalm` y `gospel`.

### 2.2 HelloAO Bible API — Texto completo en español

```
https://bible.helloao.org/api/spa_blm/{OSIS}/{capitulo}.json
```

- **Qué devuelve:** todos los versículos de un capítulo en español (Biblia de La Merced, `spa_blm`).
- **Incluye deuterocanónicos** (Tobías, Judit, Macabeos, Sabiduría, Sirácida, Baruc), relevantes para el leccionario católico.
- La app extrae solo los versículos del rango indicado por la referencia (p. ej., versículos 11–18 del capítulo 10 de Juan).

---

## 3. Flujo de datos paso a paso

```
cargarLectura()   [app/(tabs)/lectura.tsx:129]
       │
       ▼
getLecturaDelDia(hoy)   [lib/api/biblia.ts:198]
       │
       ├─ 1. Verifica caché en memoria (TTL 24h)
       │        clave: "lectura-del-dia:2025-04-27"
       │
       ├─ 2. GET cpbjr/.../2025/04-27.json
       │        → { gospel: "John 10:11-18", firstReading: "Acts 4:8-12", psalm: "Psalm 118:..." }
       │
       ├─ 3. parseRef("John 10:11-18")
       │        → { bookId: "JHN", chapter: 10, verseStart: 11, verseEnd: 18 }
       │
       ├─ 4. Promise.all([
       │        fetchPassageText("John 10:11-18"),    // obligatorio
       │        fetchPassageText("Acts 4:8-12"),      // opcional
       │        fetchPassageText("Psalm 118:...")     // opcional
       │     ])
       │        cada uno hace GET helloao/.../JHN/10.json y filtra versículos
       │
       ├─ 5. calcularTiempoLiturgico(fecha)   [constants/liturgical.ts:57]
       │        → "pascua"  →  colorLiturgico: "blanco"
       │
       ├─ 6. Construye LecturaDelDia { titulo, referencia, texto, evangelio,
       │                               primeraLectura?, salmo?, colorLiturgico }
       │
       └─ 7. Guarda en caché (TTL 24h) y retorna Result<LecturaDelDia>
```

---

## 4. Cómo se sabe qué lectura toca cada día

El CPBJR expone un JSON por fecha. Ese JSON sigue el **Leccionario Romano** (versión USCCB para domingos y semana).

El leccionario organiza las lecturas según:

- **Ciclo dominical A / B / C** (se repite cada 3 años): determina los evangelios de los domingos.
- **Ciclo ferial I / II** (años impares / pares): determina las lecturas de los días laborables.
- El **tiempo litúrgico** del día (Adviento, Navidad, Cuaresma, Pascua, Tiempo Ordinario) condiciona qué lecturas se proclaman.

La app **no calcula internamente** qué lectura bíblica corresponde a cada día del leccionario; delega ese cálculo al CPBJR. Lo que sí calcula localmente es el **tiempo litúrgico** (para el color y el título) mediante `calcularTiempoLiturgico()`.

---

## 5. Lógica litúrgica local (`constants/liturgical.ts`)

### 5.1 Algoritmo de Pascua — Meeus / Jones / Butcher

`calcularFechaPascua(anio)` determina el Domingo de Resurrección para cualquier año gregoriano. Es el ancla de todo el calendario litúrgico móvil.

### 5.2 `calcularTiempoLiturgico(fecha)`

A partir de la diferencia en días respecto a Pascua (`diffPascua`):

| Rango de `diffPascua` | Tiempo litúrgico |
|-----------------------|------------------|
| -7 a -1               | Semana Santa     |
| 0 a 48                | Tiempo de Pascua |
| 49                    | Pentecostés      |
| -46 a -8              | Cuaresma         |
| < -46                 | Adviento o Tiempo Ordinario (según fecha) |

Fechas fijas:
- **25 dic – 6 ene:** Navidad
- **Domingo más cercano al 30 nov hasta 24 dic:** Adviento

### 5.3 Colores litúrgicos

| Tiempo | Color |
|--------|-------|
| Adviento | Morado |
| Navidad | Blanco |
| Cuaresma | Morado |
| Semana Santa | Rojo |
| Pascua | Blanco |
| Pentecostés | Rojo |
| Tiempo Ordinario | Verde |

---

## 6. Tipos e interfaces clave

### `LecturaDelDia` — `lib/api/biblia.ts:23`

```typescript
export type LecturaDelDia = {
  titulo: string;           // "Tiempo de Pascua"
  referencia: string;       // "John 10:11-18"
  texto: string;            // Texto completo del Evangelio
  evangelio: string;        // Referencia del Evangelio (ídem a referencia)
  primeraLectura?: { referencia: string; texto: string };
  salmo?: { referencia: string; texto: string };
  colorLiturgico: string;   // "blanco" | "verde" | "morado" | "rojo" | "rosa"
};
```

### `CpbjrDay` — `lib/api/biblia.ts:128` (tipo interno)

```typescript
type CpbjrDay = {
  date?: string;
  season?: string;
  readings?: {
    firstReading?: string;
    psalm?: string;
    secondReading?: string;
    gospel?: string;
  };
};
```

---

## 7. Mapeos de libros bíblicos

La app mantiene dos mapeos manuales en `lib/api/biblia.ts`:

- **`BOOK_ID`** (línea ~42): nombre en inglés → código OSIS (p. ej., `"John" → "JHN"`, `"Psalm" → "PSA"`). Se usa para construir la URL de HelloAO.
- **`BOOK_NAME_ES`** (línea ~73): nombre en inglés → nombre en español (p. ej., `"John" → "Juan"`). Se usa para traducir las referencias visibles al usuario.

La función `translateRefES("John 10:11-18")` devuelve `"Juan 10:11-18"`.

---

## 8. Caché

`apiCache` es un singleton en memoria con TTL configurable. La clave para la lectura del día es:

```
lectura-del-dia:{YYYY}-{MM}-{DD}
```

TTL: **24 horas**. Mientras el caché esté vigente, no se realizan peticiones de red. Esto significa que si el usuario abre la app varias veces en el mismo día, solo la primera apertura hace las llamadas HTTP.

---

## 9. Parseo de referencias bíblicas

`parseRef(ref)` en `lib/api/biblia.ts:143` convierte una cadena como `"Psalm 91:1-2, 14-15b"` en:

```typescript
{ bookId: "PSA", chapter: 91, verseStart: 1, verseEnd: 2 }
```

- Descarta los rangos adicionales separados por coma (solo usa el primero).
- Elimina sufijos como `a`, `b` en los números de versículo.
- Si la referencia no tiene versículo, usa el capítulo completo.

---

## 10. Persistencia local

### Favoritos — tabla `lecturas_favoritas`

```typescript
{
  id:            "2025-04-27-evangelio",   // fecha + sufijo
  fecha:         "2025-04-27",
  titulo:        "Tiempo de Pascua",
  fuente:        "Jn 10:11-18",
  textoCompleto: JSON.stringify({ evangelio, primeraLectura, salmo }),
  notasUsuario:  null
}
```

### Chat / Notas — tabla `chat_mensajes`

```typescript
{
  id:           uuid,
  lecturaFecha: "2025-04-27",
  role:         "user" | "assistant" | "nota_personal",
  content:      "...",
  createdAt:    Date
}
```

---

## 11. Pantalla y componentes (`app/(tabs)/lectura.tsx`)

La pantalla gestiona su propio estado local:

```typescript
const [lectura, setLectura] = useState<LecturaDelDia | null>(null);
```

Al montar el componente llama a `cargarLectura()` que invoca `getLecturaDelDia(hoy)`.

El componente `LecturaDelDiaTab` renderiza en este orden:

1. **Header:** fecha en español, nombre del tiempo litúrgico, badge de color.
2. **Primera Lectura** (si existe): título + referencia + texto.
3. **Salmo Responsorial** (si existe): estilizado en recuadro.
4. **Evangelio:** con borde izquierdo rojo (`#FF7D7D`), siempre presente.
5. **Botón guardar:** persiste en SQLite con Drizzle.
6. **Modo reflexión:** toggle entre "Mis notas" (texto libre) y "Reflexión guiada" (chat streaming con IA).

---

## 12. Archivos relevantes

| Archivo | Responsabilidad |
|---------|----------------|
| [lib/api/biblia.ts](lib/api/biblia.ts) | Fetch CPBJR + HelloAO, parseo, caché, `getLecturaDelDia()` |
| [constants/liturgical.ts](constants/liturgical.ts) | Pascua, tiempos litúrgicos, colores, días de precepto |
| [constants/biblia.ts](constants/biblia.ts) | Array de 66 libros bíblicos con códigos OSIS y número de capítulos |
| [lib/store/lecturaStore.ts](lib/store/lecturaStore.ts) | Store Zustand (declarado, actualmente no usado en UI; la pantalla usa `useState`) |
| [lib/db/schema.ts](lib/db/schema.ts) | Tablas `lecturas_favoritas` y `chat_mensajes` |
| [app/(tabs)/lectura.tsx](app/%28tabs%29/lectura.tsx) | Pantalla principal: 4 tabs (Del día, Libros, Guardados, Biblia) |
| [components/lectura/LecturaDelDiaTab.tsx](components/lectura/LecturaDelDiaTab.tsx) | Renderizado de la lectura, favoritos, notas y chat |

---

## 13. Diagrama de dependencias

```
lectura.tsx
  └── getLecturaDelDia()  ──► apiCache (memoria, TTL 24h)
                          ──► CPBJR API  (referencias por fecha)
                          ──► HelloAO API (texto en español, por capítulo)
                          ──► calcularTiempoLiturgico()  ──► calcularFechaPascua()

LecturaDelDiaTab.tsx
  └── translateRefES()    ──► BOOK_NAME_ES
  └── saveLecturaFavorita() ──► SQLite (lecturas_favoritas)
  └── chat streaming      ──► Anthropic Haiku (claude-haiku-4-5-20251001)
```
