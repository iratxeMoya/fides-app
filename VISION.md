# Fides — Visión del proyecto

## Qué es Fides

Fides es una app de acompañamiento espiritual católico para el día a día. No es un misal digital ni una enciclopedia religiosa: es una herramienta pensada para quien quiere vivir la fe de forma ordinaria, sin que la app se interponga. El tono es recogido y serio — sin gamificación, sin notificaciones invasivas, sin rastro de red social.

El nombre viene del latín *fides* — fe, confianza, fidelidad. Es también la virtud teologal que sostiene todo lo demás.

---

## Público objetivo

Católico practicante hispanohablante, 25–55 años, con smartphone. No necesariamente "muy piadoso" — sí alguien que va a misa, intenta rezar y quiere una referencia espiritual fiable en el bolsillo. España como mercado principal.

---

## Principios de diseño

- **Oscuro y sereno.** Fondo `#0A0A0A`, tipografía serif (Cormorant Garamond) para los títulos litúrgicos, Inter para el texto funcional. El rojo `#FF7D7D` como único acento — discreto, cálido, nunca agresivo.
- **Sin ruido.** Cada pantalla tiene una sola cosa que hacer. Nada de carruseles, nada de engagement mechanics.
- **Sin dependencia de backend propio.** Las fuentes de datos son APIs públicas (OSM, cpbjr lectionary, bible.helloao) o locales (SQLite). La IA es Claude Haiku vía API directa.
- **Animaciones en cascada.** El home aparece sección a sección con stagger de 130ms. El movimiento es lento y deliberado, no snappy.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Expo SDK 54 + React Native 0.81 (New Architecture) |
| Routing | Expo Router v6 (file-based) |
| UI | NativeWind v4 (Tailwind) + StyleSheet inline |
| Tipografía | Cormorant Garamond SemiBold + Inter (Google Fonts via Expo) |
| Mapa | MapLibre React Native (tiles CARTO dark-matter) |
| Base de datos local | Expo SQLite + Drizzle ORM |
| Estado global | Zustand v5 |
| Bottom sheets | @gorhom/bottom-sheet v5 |
| IA | NVIDIA NIM (meta/llama-3.1-8b-instruct) vía API compatible OpenAI |
| CI/CD | GitHub Actions → EAS prebuild → IPA sin firmar (artifact) |

---

## Estado actual — v1.2.6

### Pantallas

#### Inicio (home)
Pantalla principal con scroll vertical y animaciones en cascada. Seis secciones:

1. **Header litúrgico** — Título "FIDES" en Cormorant + fecha y tiempo litúrgico del día ("Domingo, 3 de junio · Tiempo Ordinario").
2. **Esta semana** — Grid horizontal de 7 días (lunes a domingo) con indicadores de día de precepto en rojo. El día actual aparece resaltado; los pasados, atenuados. CTA "Ver calendario →" que abre el calendario litúrgico anual.
3. **Card de precepto** *(condicional)* — Aparece si hay un día de precepto hoy o en lo que queda de semana. Muestra la fiesta y la obligación.
4. **Card de iglesia cercana** — Iglesia más próxima con distancia en km y hora de la próxima misa hoy. Usa geolocalización del dispositivo + misas.org.
5. **Card de lectura del día** — Evangelio del día con referencia bíblica, extracto de 180 caracteres, color litúrgico y una frase contemplativa generada por IA (Claude Haiku). CTA a la pantalla de lectura completa.
6. **Enciende una vela** — Sección de donación voluntaria vía Bizum. Abre un bottom sheet con el número, botón de compartir y descripción.

#### Mapa de iglesias
Mapa interactivo oscuro (MapLibre + CARTO) centrado en la ubicación del usuario. Bottom sheet con lista de iglesias cercanas en un radio de 5 km. Búsqueda por texto (Nominatim + OSM REST API). La iglesia seleccionada se resalta en el mapa y muestra el horario semanal completo. El botón "Más información →" al pie del horario expandido abre la pantalla de detalle de iglesia.

La fuente primaria de horarios es **misas.org** (`/api/parishsearch`). Para obtener el calendario completo — el API filtra por día de la semana del `date` pasado — se hacen **7 llamadas paralelas** (una por cada día de la semana siguiente) y se fusionan los resultados, deduplicando por `(hora, días)`. El resultado es el horario semanal completo desde la carga inicial, sin necesidad de consultas adicionales al seleccionar una iglesia.

Cuando una iglesia no tiene domingo en misas.org, se activa un fallback a **buscarmisas.es**: primero se prueban slugs directos derivados del nombre; si fallan, se descarga la página de ciudad y se busca la iglesia por solapamiento de palabras significativas.

#### Detalle de iglesia *(Stack anidado dentro del tab Mapa)*
Pantalla accesible desde "Más información →" en la card expandida del mapa. La tab bar permanece visible. Muestra: mini-mapa CARTO dark centrado en la iglesia (o foto si la iglesia tiene tag `image`/`wikimedia_commons` en OSM), nombre en Cormorant, dirección, horario semanal completo, y sección de contacto con teléfono y web si están disponibles. Al pie, botón fijo "¿Horario incorrecto? Repórtalo" que abre `mailto:` prefilled con nombre, dirección e ID de la iglesia y el horario actual serializado.

#### Lectura
Cuatro pestañas:
- **Del día** — Lectura completa del evangelio del día + primera lectura + salmo responsorial. El texto bíblico viene de la API española (bible.helloao.org, traducción BLM).
- **Libros** — Biblioteca curada de libros católicos (filosofía, teología, espiritualidad, apologética). Cada libro tiene ficha con descripción, ISBN y enlace de compra.
- **Guardados** — Lecturas guardadas por el usuario con notas personales.
- **Biblia** — Navegación completa de los 73 libros de la Biblia católica (ver sección Biblia más abajo).

#### Detalle de lectura guardada
Pantalla de inmersión: texto completo y notas personales editables.

#### Detalle de libro
Ficha de libro recomendado con portada, autor, categoría, descripción y enlace de compra.

#### Ajustes
Cuarto tab. Dos secciones:

- **Notificaciones** — Tres toggles: Ángelus (defecto 12:00), Día de precepto (defecto 18:00 del día anterior) y Lectura del día (defecto 08:00). Cada toggle, cuando está activado, muestra la hora en rojo presionable. Al pulsar la hora se abre el `HoraPicker` — un sheet propio con ruedas de horas y minutos en Cormorant Garamond, editables tanto con flechas como tecleando directamente. Al activar el primer toggle, si no hay permiso se solicita al sistema; si se deniega, el toggle vuelve a off y aparece un banner de aviso con enlace a los ajustes del sistema. Las preferencias (toggles + horas) persisten en AsyncStorage vía `preferenciasStore` (Zustand + `persist`). El scheduling real está implementado: Ángelus y Lectura usan trigger `DAILY`; Precepto programa ~16 alarmas individuales (`DATE`) para el día previo a cada solemnidad de los próximos 2 años. Al cambiar la hora o al arrancar la app se reprograman automáticamente.
- **Acerca de** — Fila fija al pie de la pantalla (fuera del scroll). Abre la pantalla de contacto.

#### Calendario litúrgico *(pantalla de Stack)*
Pantalla accesible desde el CTA de la sección "Esta semana". Muestra los 12 meses del año seleccionado en un scroll vertical. Cada día es un círculo de 32px con fondo teñido por tiempo litúrgico (verde oscuro = Ordinario, morado = Adviento/Cuaresma, dorado = Navidad/Pascua, rojo oscuro = Semana Santa/Pentecostés). Los días de precepto llevan un borde rojo semitransparente; el día actual se rellena en `#FF7D7D`. Los días pasados aparecen al 45% de opacidad. El domingo (columna D) se muestra en blanco más brillante. Selector de año `< 2026 >` en el header. Leyenda de colores al pie del scroll. El tiempo litúrgico de los 365 días se precomputa con `useMemo` (solo recalcula al cambiar de año); los días de precepto también con `useMemo` en un `Set`.

#### Acerca de *(pantalla de Stack)*
Pantalla accesible desde el tab Ajustes. Muestra nombre y email de la desarrolladora (email tappable, abre el cliente de correo), una card de invitación a enviar sugerencias en Cormorant itálico y la versión de la app leída en runtime desde `app.json` vía `expo-constants`.

### Lógica litúrgica
Algoritmo de Meeus-Jones-Butcher para el cálculo de la Pascua. Determinación del tiempo litúrgico (Adviento, Navidad, Tiempo Ordinario, Cuaresma, Semana Santa, Pascua, Pentecostés) para cualquier fecha. Días de precepto hardcodeados para 2025–2026 con las fiestas propias del rito hispano (Ascensión el 17 de mayo, Corpus el 7 de junio).

### Horarios de misa — modelo de datos
El tipo `HorarioMisa` tiene tres flags opcionales:

- `esVigilia: true` — misa del sábado vespertino que anticipa el precepto dominical (misas.org día 7). Se muestra como sábado pero computa para el domingo litúrgico.
- `inferido: true` — horario estimado calculado a partir de `opening_hours` de OSM (no de `service_times` ni de misas.org). La UI puede señalarlo como aproximado.
- `esVigilia` y `inferido` pueden coexistir en el mismo array para el mismo `dia`, ya que `IglesiaListCard` combina todas las entradas del día con `filter().flatMap()`.

### Persistencia local
SQLite con Drizzle ORM. Tablas: `iglesias` (caché de iglesias con horarios completos), `lecturas_favoritas`, `lecturas_recomendadas`, `chat_mensajes`.

**AsyncStorage** para preferencias de usuario (`preferenciasStore`) y progreso de lectura bíblica (`bibliaStore`): toggles de notificación, horas configuradas y capítulos leídos. Zustand `persist` con wrapper try/catch para evitar errores no capturados en la New Architecture.

- Caché en memoria (TTL 1 h) para respuestas de red en la sesión activa.
- Caché persistente en SQLite (TTL 24 h) para iglesias con horarios — permite consultas rápidas en recargas y funciona sin conexión.
- Para IDs de misas.org, el caché de BD solo se considera válido si incluye misas en domingo; de lo contrario se relanza el fallback a buscarmisas.es.

---

## Ideas para v2.0

### 1. ~~Página de gestión de usuario~~ ✓ *Implementado en v1.2.1*
Tab "Ajustes" con estructura extensible: sección Notificaciones (toggles + horas configurables) y sección Acerca de fija al pie. Nuevas funcionalidades se añaden como nuevas secciones o filas dentro de `SeccionAjuste` / `FilaAjuste`.

### 2. ~~Notificaciones litúrgicas personalizables~~ ✓ *Implementado en v1.2.2*
Scheduling real con `expo-notifications`: Ángelus y Lectura del día usan `SchedulableTriggerInputTypes.DAILY`; Día de precepto programa notificaciones individuales (`DATE`) para el día anterior a cada precepto de los próximos 2 años (~16 alarmas). Los identificadores fijos (`fides-angelus`, `fides-lectura`, `fides-precepto-YYYY-MM-DD`) permiten cancelar y reprogramar sin almacenar IDs. La inicialización se lanza en `_layout.tsx` una vez que Zustand termina de hidratar AsyncStorage (`_hasHydrated`).

### 3. ~~Calendario litúrgico anual completo~~ ✓ *Implementado en v1.2.3*
Pantalla `app/calendario.tsx` accesible desde el CTA "Ver calendario →" en la sección Esta semana del home. Los 12 meses del año se renderizan en un scroll vertical con cuadrícula lun–dom. Fondo de cada día teñido por tiempo litúrgico; borde rojo para días de precepto; relleno `#FF7D7D` para hoy; 45% de opacidad para pasados. Navegación entre años con `< >`. Leyenda de 5 entradas al pie. El pendiente de v2.0 es añadir tap en fecha para abrir la lectura del evangelio de ese día.

### 4. ~~Biblia completa navegable~~ ✓ *Implementado en v1.2.4*
Tab "Biblia" dentro de la pantalla Lectura. Tres vistas con navegación interna (sin rutas Stack): lista de 73 libros (AT + NT) con buscador que ignora tildes y mayúsculas, grid de capítulos (7 columnas) con dot rojo para capítulos leídos, y lector de capítulo con navegación por gestos (swipe izquierda/derecha) y botones `< >`. Al final de cada capítulo: botón "Marcar como leído" que persiste en `bibliaStore` (Zustand + AsyncStorage). En la lista de libros se muestra el progreso `X/Y` o `✓` cuando el libro está completo. El texto bíblico viene de `bible.helloao.org/api/spa_blm` (misma API que las lecturas del día, traducción BLM, incluye deuterocanónicos).

### 5. ~~Más información sobre iglesias~~ ✓ *Implementado en v1.2.5*
Pantalla de detalle de iglesia accesible desde "Más información →" en la card expandida del mapa. Muestra nombre, dirección, mini-mapa de ubicación (o foto si está en OSM), horario semanal de misas, contacto (teléfono/web) y botón fijo "¿Horario incorrecto? Repórtalo" con mailto prefilled. La tab bar permanece visible (Stack anidado dentro del tab Mapa). Pendiente para iteración futura: horarios de hora santa y confesiones (requiere identificar fuente de datos).

### 6. Integración de IA con NVIDIA NIM

#### ~~6.1. Agregar proveedor sin funcionalidades~~ ✓ *Implementado en v1.2.6*
Proveedor NVIDIA NIM (`lib/api/nim.ts`) con interfaz idéntica a `lib/api/chat.ts`: `enviarMensajeChatNIM` (streaming SSE, `choices[0].delta.content`) y `generarCitaNIM` (no-streaming, caché 24 h). La API key se inyecta en `app.config.js` vía `NVIDIA_NIM_API_KEY` para builds EAS y vía `EXPO_PUBLIC_NVIDIA_NIM_API_KEY` para dev client con Metro inline. Tests unitarios en `tests/unit/nim.test.ts` cubren los dos métodos: auth Bearer, parsing SSE, key ausente, errores HTTP y caché.

#### ~~6.2. Chat de reflexión~~ ✓ *Implementado en v1.2.6*
En la pantalla "Del día" (tab Lectura), selector de dos modos tras el texto: **Mis notas** (notas personales libres, guardadas en SQLite, con CRUD completo) y **Reflexión guiada** (chat con NIM). Al activar la reflexión guiada, la IA abre la sesión con una pregunta sobre el evangelio del día sin esperar al usuario; cada respuesta termina con una nueva pregunta que profundiza la reflexión (estilo lectio divina, máximo 60 palabras). El historial se persiste en `chat_mensajes` (SQLite) por fecha litúrgica: si el usuario cierra y reabre la app, la conversación continúa desde donde la dejó. El historial del día siguiente empieza limpio.

#### 6.3. Recomendaciones de lectura
En base al texto de lectura del día, recomendar en la pantalla de Recomendaciones libros, secciones de la Biblia o textos de otros ámbitos que ayuden a contextualizar o ampliar la lectura.

### 7. Comunidad *(v3.0)*
Registro y login de usuarios. Blog general de comunidad más subblogs temáticos o parroquiales abiertos al público — cualquiera puede unirse a uno o varios. Moderación automática por IA que filtra mensajes hirientes, desinformación y malas praxis antes de la publicación. Cada subforo cuenta además con un moderador humano como último recurso. La identidad de la plataforma es la misma que la app: recogida, sin engagement artificial, orientada a la reflexión compartida.
