# LECTURAS_ANALISIS.md — Auditoría del sistema de lecturas litúrgicas en Fides

Documento técnico comparando la implementación actual de Fides (descrita en `BIBLIA.md`) con el funcionamiento real del Leccionario Romano.

---

## 1. Cómo funciona el Leccionario Romano (referencia canónica)

### 1.1 Estructura de ciclos

El Leccionario Romano post-Vaticano II organiza las lecturas en **dos ciclos independientes**:

| Ciclo | Aplicación | Duración | Lógica |
|-------|-----------|----------|--------|
| **Dominical A / B / C** | Domingos y solemnidades | 3 años | A=Mateo, B=Marcos+Jn 6, C=Lucas. Juan en todos los tiempos fuertes. |
| **Ferial I / II** | Días laborables | 2 años | Años impares = Año I, años pares = Año II |

El año litúrgico **empieza el I Domingo de Adviento** (finales de noviembre/principios de diciembre), no el 1 de enero. En 2026 el año litúrgico es: Ciclo A (domingos) + Año II (feriales).

### 1.2 Estructura de lecturas por tipo de día

| Tipo de día | Primera Lectura | Salmo | Segunda Lectura | Evangelio |
|-------------|----------------|-------|----------------|-----------|
| **Domingo / Solemnidad** | Sí (AT la mayoría del año; Hechos en Pascua) | Sí | **Sí (obligatoria)** | Sí |
| **Feria** (día laborable ordinario) | Sí | Sí | No | Sí |
| **Fiesta del Señor** (ej. Bautismo, Transfiguración) | Sí | Sí | A veces | Sí |
| **Memoria obligatoria de santo** | Del día (o del santo si tiene propias) | Sí | No | Sí |
| **Memoria opcional de santo** | Del día (preferible) | Sí | No | Sí |

### 1.3 Precedencia litúrgica (quién «gana» cuando coinciden)

El orden de precedencia determina qué lecturas se usan si un día tiene múltiples celebraciones posibles:

1. **Triduo Pascual** (Jueves Santo tarde – Domingo de Resurrección)
2. **Solemnidades** (ej. Navidad, Ascensión, Corpus, Inmaculada)
3. **Domingos** (de Adviento, Cuaresma, Pascua > Tiempo Ordinario)
4. **Fiestas** (del Señor, de la Virgen, de los Apóstoles)
5. **Memorias obligatorias**
6. **Memorias opcionales** (el sacerdote puede elegir entre lecturas del santo o del día)
7. **Ferias** (días laborables ordinarios)

Una solemnidad siempre trae sus **tres lecturas propias** (Primera + Salmo + Segunda + Evangelio), incluso si cae en feria.

### 1.4 Semanas «saltadas» en Tiempo Ordinario

El Tiempo Ordinario tiene 34 semanas numeradas. Cuaresma interrumpe la serie y, tras Pentecostés, la numeración **no retoma desde donde se dejó**: se calcula cuántas semanas quedan hasta el fin del año litúrgico y se arranca en la semana que corresponde para llegar exactamente a la semana 34 (Cristo Rey). Esto significa que **algunas semanas intermedias se omiten** cada año, y la semana de inicio tras Pentecostés varía de un año a otro.

---

## 2. Análisis de la implementación actual en Fides

### 2.1 Lo que funciona correctamente ✅

- **Delegación del leccionario al CPBJR API**: la app no intenta calcular por sí misma qué pasajes corresponden a cada día, sino que consulta una fuente externa verificada contra la USCCB. Esto es correcto y robusto.
- **Caché de 24h**: evita peticiones redundantes y es coherente con la granularidad diaria de los datos.
- **Cálculo local del tiempo litúrgico**: el algoritmo de Pascua (Meeus/Jones/Butcher) es el estándar académico y está correctamente usado como ancla del calendario móvil.
- **Inclusión de deuterocanónicos**: la API HelloAO (`spa_blm`) los incluye, lo cual es imprescindible para el leccionario católico (Tobías, Sabiduría, Sirácida, etc. aparecen con frecuencia en ferias).

---

### 2.2 Problemas identificados 🔴

#### PROBLEMA 1 — La Segunda Lectura se muestra solo en domingos: lógica incompleta

**Situación actual** (`BIBLIA.md`, sección 2.1 + sección 11):
```
"el campo secondReading solo aparece en domingos y solemnidades"
```
El documento indica que en "días laborables ordinarios solo incluyen firstReading, psalm y gospel". El componente `LecturaDelDiaTab` renderiza la `primeraLectura?` como opcional, lo que es correcto.

**Problema real**:
La segunda lectura existe también en **solemnidades que caen en fería** (no solo en domingos). El CPBJR API ya lo devuelve cuando corresponde, pero hay que asegurarse de que el tipo `LecturaDelDia` y el componente lo manejen.

**Verificación necesaria**:
Revisar si en `LecturaDelDiaTab.tsx` existe lógica que renderice la `secondReading` cuando la API la devuelve en un día que no es domingo. Si la pantalla solo comprueba si `primeraLectura` existe pero no tiene un slot para `secondReading`, esa lectura se perdería silenciosamente.

**Cambio requerido**:
```typescript
// En lib/api/biblia.ts — ampliar el tipo LecturaDelDia
export type LecturaDelDia = {
  // ...campos existentes...
  segundaLectura?: { referencia: string; texto: string }; // ← añadir
};
```
Y en `getLecturaDelDia()`, mapear `cpbjrDay.readings.secondReading` igual que se hace con `firstReading`.
En `LecturaDelDiaTab.tsx`, añadir un bloque de renderizado condicional entre el Salmo y el Evangelio para `segundaLectura`.

---

#### PROBLEMA 2 — La fuente de lecturas es USCCB (EE.UU.), no la Conferencia Episcopal Española

**Situación actual**:
El CPBJR API está explícitamente basado en el calendario USCCB estadounidense. La app Fides es española (usuario en Barcelona, interfaz en español). Las diferencias son reales:

| Aspecto | USCCB (EE.UU.) | CEE (España) |
|---------|----------------|--------------|
| **Ascensión** | Trasladada al domingo en la mayoría de diócesis | Se celebra el jueves (día 40 de Pascua) |
| **Santos propios** | Santos estadounidenses (ej. Elizabeth Ann Seton, Juan Neumann) | Santos españoles (ej. Isidro Labrador, Teresa de Ávila como solemnidad, Santiago Apóstol como fiesta de precepto nacional) |
| **Corpus Christi** | Trasladado al domingo en EE.UU. | Jueves (en algunas diócesis españolas) o domingo |
| **Epifanía** | Segundo domingo tras Navidad en EE.UU. | 6 de enero (fecha fija en España) |
| **Texto bíblico en español** | Lecturas: leccionario mexicano; Salmos: leccionario español | Leccionario propio de la CEE (traducción española) |

**Impacto concreto**:
- Un usuario en España que abra la app el **jueves de Ascensión** verá lecturas de "Jueves de la VI semana de Pascua" (feria) cuando debería ver las propias de la Ascensión.
- El **6 de enero** (Epifanía, festivo civil en España) la app mostrará lecturas de feria en lugar de la solemnidad.
- Los santos del día mostrarán nombres anglosajones en lugar de los del santoral español.

**Cambio recomendado** (por orden de viabilidad):

*Opción A — Solución mínima (alto impacto, bajo coste)*:
Implementar un fichero local `constants/solemnidades-es.ts` con las fechas que difieren entre USCCB y CEE y que tienen lecturas propias. Para esos días, ignorar la respuesta del CPBJR e inyectar las referencias correctas (que sí existen en HelloAO). Las diferencias clave son pocas (Epifanía fija el 6/1, Ascensión el jueves 40, Santiago el 25/7 como fiesta de precepto en España).

*Opción B — Solución completa (media complejidad)*:
Usar una fuente alternativa basada en el calendario de la CEE. Existe el proyecto [universalis.com](https://universalis.com) con API no oficial, o bien construir un fichero JSON anual propio basado en el calendario litúrgico publicado cada año por la CEE (disponible en PDF en su web).

*Opción C — Nota de transparencia (coste cero)*:
Si no se corrige a corto plazo, añadir un aviso en la pantalla: *"Las lecturas siguen el calendario de la USCCB (EE.UU.). Algunas solemnidades pueden diferir del calendario español."*

---

#### PROBLEMA 3 — El texto bíblico en español es de la Biblia de La Merced (`spa_blm`), no del leccionario litúrgico

**Situación actual**:
HelloAO devuelve el texto de la `spa_blm` (Biblia de La Merced). Esta es una traducción bíblica válida, pero **no es el texto litúrgico** que se proclama en la misa en España.

**Qué se usa realmente en la liturgia española**:
En España se usa el **Leccionario de la CEE** (basado en la traducción de la propia Conferencia Episcopal Española). Las diferencias son perceptibles: vocabulario, puntuación de los versículos, incipit (frases introductorias como "En aquel tiempo..." o "Hermanos:") y en ocasiones versículos incluidos o excluidos dentro de la perícopa.

**Impacto**:
El texto que ve el usuario no es literalmente el mismo que escucha en misa, lo que puede generar confusión o sensación de discordancia. No es un error técnico grave, pero sí una fricción para el objetivo espiritual de la app.

**Cambio recomendado**:
Añadir una nota de atribución debajo del texto: *"Texto: Biblia de La Merced. El texto proclamado en la liturgia puede diferir."* Esto es honesto y fácil de implementar.

A largo plazo, considerar usar la API de la USCCB en español (`https://bible.usccb.org/es/lectura-diaria-biblia`) como fuente del texto, aunque tiene restricciones de copyright que impiden scraping.

---

#### PROBLEMA 4 — El tiempo litúrgico local puede desincronizarse del CPBJR

**Situación actual**:
La app calcula el tiempo litúrgico localmente (`calcularTiempoLiturgico`) y lo usa para mostrar el color y el título, pero el CPBJR también devuelve un campo `season`. Si ambos discrepan (por ejemplo, en días de transición o por diferencias de calendario), el color/título mostrado puede ser incorrecto aunque las lecturas sí sean las correctas.

**Cambio recomendado**:
Priorizar el `season` devuelto por el CPBJR para el título y el color litúrgico, usando el cálculo local solo como fallback si la API no responde. Esto garantiza consistencia entre lecturas y contexto litúrgico.

```typescript
// En getLecturaDelDia(), al construir LecturaDelDia:
const tiempoLiturgico = cpbjrDay.season
  ? mapCpbjrSeasonToSpanish(cpbjrDay.season)   // ← usar el dato de la API
  : calcularTiempoLiturgico(fecha);              // ← fallback local

// Añadir función de mapeo:
function mapCpbjrSeasonToSpanish(season: string): string {
  const map: Record<string, string> = {
    'Ordinary Time': 'Tiempo Ordinario',
    'Advent': 'Adviento',
    'Christmas': 'Navidad',
    'Lent': 'Cuaresma',
    'Holy Week': 'Semana Santa',
    'Easter': 'Tiempo de Pascua',
  };
  return map[season] ?? season;
}
```

---

#### PROBLEMA 5 — `parseRef` descarta rangos múltiples de versículos

**Situación actual** (`BIBLIA.md`, sección 9):
```
"Descarta los rangos adicionales separados por coma (solo usa el primero)"
// Ejemplo: "Psalm 91:1-2, 14-15b" → solo extrae versículos 1-2
```

**Impacto real**:
Los salmos responsoriales del leccionario habitualmente tienen versículos discontinuos, como `Psalm 118:1, 8-9, 21-23, 26, 28-29`. Al descartar todo menos el primer rango, el usuario ve solo los primeros versículos, no el salmo completo tal como se proclama en la misa.

**Cambio recomendado**:
Extender `parseRef` para devolver múltiples rangos y `fetchPassageText` para concatenar los fragmentos:

```typescript
// lib/api/biblia.ts

type VerseRange = { bookId: string; chapter: number; verseStart: number; verseEnd: number };

function parseAllRanges(ref: string): VerseRange[] {
  // Ejemplo: "Psalm 118:1, 8-9, 21-23"
  // → extraer bookId y chapter del prefijo, luego iterar cada rango
  const [bookChapter, ...rangeParts] = ref.split(':');
  const bookName = bookChapter.trim().replace(/\s+\d+$/, '');
  const chapterStr = bookChapter.trim().split(/\s+/).pop() ?? '1';
  const bookId = BOOK_ID[bookName] ?? bookName;
  const chapter = parseInt(chapterStr);

  const allRanges = rangeParts.join(':').split(',').map(s => s.trim());
  return allRanges.map(range => {
    const [start, end] = range.replace(/[a-z]/g, '').split('-').map(Number);
    return { bookId, chapter, verseStart: start, verseEnd: end ?? start };
  });
}

async function fetchPassageTextMultiRange(ref: string): Promise<string> {
  const ranges = parseAllRanges(ref);
  const texts = await Promise.all(ranges.map(r => fetchVerseRange(r)));
  return texts.filter(Boolean).join('\n');
}
```

Este cambio tiene el mayor impacto perceptible para el usuario porque el salmo incompleto es visible y frecuente.

---

## 3. Resumen priorizado de cambios

| # | Problema | Impacto litúrgico | Dificultad | Prioridad |
|---|----------|-------------------|-----------|-----------|
| 5 | Salmos con versículos discontinuos truncados | **Alto** — lectura incompleta a diario | Media | 🔴 Alta |
| 1 | Segunda lectura ausente en solemnidades en fería | Medio — poco frecuente | Baja | 🟡 Media |
| 4 | Desincronización tiempo litúrgico local vs. API | Bajo-Medio | Baja | 🟡 Media |
| 2 | Calendario USCCB vs. CEE España | **Alto** para usuarios en España | Alta | 🟠 Estratégico |
| 3 | Texto bíblico no es el litúrgico oficial | Medio — fricción perceptible | Baja (nota UI) | 🟢 Fácil |

---

## 4. Cambio inmediato recomendado (quick win)

El cambio más impactante con menos riesgo es **el salmo completo (Problema 5)**. Es visible en el 100% de las aperturas, es técnicamente localizado en `parseRef` y `fetchPassageText`, y no requiere cambios en la base de datos ni en el esquema.

El segundo cambio más fácil es **la nota de atribución del texto bíblico (Problema 3)**: una sola línea de UI.

---

## 5. Consideración sobre el público objetivo

Fides está orientada a usuarios católicos en España. Si el mercado objetivo es **España exclusivamente**, el Problema 2 (calendario USCCB vs. CEE) debe tratarse como crítico, aunque sea el más costoso. Si el objetivo es **hispanohablantes globalmente**, el CPBJR con calendario USCCB es una base razonable para la mayoría de usuarios (América Latina sigue el mismo calendario ferial que EE.UU. con algunas diferencias de santos locales).

Una solución pragmática intermedia sería implementar la **Opción A del Problema 2** (sobreescribir solo las 4-5 fechas que difieren significativamente en España: Epifanía el 6/1, Ascensión el jueves 40, Santiago el 25/7) sin reemplazar el backend completo.

---

*Documento generado el 10 de junio de 2026 a partir del análisis de `BIBLIA.md` y la investigación del Leccionario Romano (USCCB, CEE, catholic-resources.org).*
