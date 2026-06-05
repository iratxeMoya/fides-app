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
| IA | Claude Haiku (claude-haiku-4-5-20251001) vía API de Anthropic |
| CI/CD | GitHub Actions → EAS prebuild → IPA sin firmar (artifact) |

---

## Estado actual — v1.1

### Pantallas

#### Inicio (home)
Pantalla principal con scroll vertical y animaciones en cascada. Seis secciones:

1. **Header litúrgico** — Título "FIDES" en Cormorant + fecha y tiempo litúrgico del día ("Domingo, 3 de junio · Tiempo Ordinario").
2. **Esta semana** — Grid horizontal de 7 días (lunes a domingo) con indicadores de día de precepto en rojo. El día actual aparece resaltado; los pasados, atenuados.
3. **Card de precepto** *(condicional)* — Aparece si hay un día de precepto hoy o en lo que queda de semana. Muestra la fiesta y la obligación.
4. **Card de iglesia cercana** — Iglesia más próxima con distancia en km y hora de la próxima misa hoy. Usa geolocalización del dispositivo + misas.org.
5. **Card de lectura del día** — Evangelio del día con referencia bíblica, extracto de 180 caracteres, color litúrgico y una frase contemplativa generada por IA (Claude Haiku). CTA a la pantalla de lectura completa.
6. **Enciende una vela** — Sección de donación voluntaria vía Bizum. Abre un bottom sheet con el número, botón de compartir y descripción.

#### Mapa de iglesias
Mapa interactivo oscuro (MapLibre + CARTO) centrado en la ubicación del usuario. Bottom sheet con lista de iglesias cercanas en un radio de 5 km. Búsqueda por texto (Nominatim + OSM REST API). La iglesia seleccionada se resalta en el mapa y muestra el horario semanal completo.

La fuente primaria de horarios es **misas.org** (`/api/parishsearch`). Para obtener el calendario completo — el API filtra por día de la semana del `date` pasado — se hacen **7 llamadas paralelas** (una por cada día de la semana siguiente) y se fusionan los resultados, deduplicando por `(hora, días)`. El resultado es el horario semanal completo desde la carga inicial, sin necesidad de consultas adicionales al seleccionar una iglesia.

Cuando una iglesia no tiene domingo en misas.org, se activa un fallback a **buscarmisas.es**: primero se prueban slugs directos derivados del nombre; si fallan, se descarga la página de ciudad y se busca la iglesia por solapamiento de palabras significativas.

#### Lectura
Tres pestañas:
- **Del día** — Lectura completa del evangelio del día + primera lectura + salmo responsorial. El texto bíblico viene de la API española (bible.helloao.org, traducción BLM).
- **Recomendadas** — Biblioteca curada de libros católicos (filosofía, teología, espiritualidad, apologética). Cada libro tiene ficha con descripción, ISBN y enlace de compra.
- **Guardados** — Lecturas guardadas por el usuario con notas personales.

#### Detalle de lectura guardada
Pantalla de inmersión: texto completo y notas personales editables.

#### Detalle de libro
Ficha de libro recomendado con portada, autor, categoría, descripción y enlace de compra.

### Lógica litúrgica
Algoritmo de Meeus-Jones-Butcher para el cálculo de la Pascua. Determinación del tiempo litúrgico (Adviento, Navidad, Tiempo Ordinario, Cuaresma, Semana Santa, Pascua, Pentecostés) para cualquier fecha. Días de precepto hardcodeados para 2025–2026 con las fiestas propias del rito hispano (Ascensión el 17 de mayo, Corpus el 7 de junio).

### Horarios de misa — modelo de datos
El tipo `HorarioMisa` tiene tres flags opcionales:

- `esVigilia: true` — misa del sábado vespertino que anticipa el precepto dominical (misas.org día 7). Se muestra como sábado pero computa para el domingo litúrgico.
- `inferido: true` — horario estimado calculado a partir de `opening_hours` de OSM (no de `service_times` ni de misas.org). La UI puede señalarlo como aproximado.
- `esVigilia` y `inferido` pueden coexistir en el mismo array para el mismo `dia`, ya que `IglesiaListCard` combina todas las entradas del día con `filter().flatMap()`.

### Persistencia local
SQLite con Drizzle ORM. Tablas: `iglesias` (caché de iglesias con horarios completos), `lecturas_favoritas`, `lecturas_recomendadas`, `chat_mensajes`.

- Caché en memoria (TTL 1 h) para respuestas de red en la sesión activa.
- Caché persistente en SQLite (TTL 24 h) para iglesias con horarios — permite consultas rápidas en recargas y funciona sin conexión.
- Para IDs de misas.org, el caché de BD solo se considera válido si incluye misas en domingo; de lo contrario se relanza el fallback a buscarmisas.es.

---

## Ideas para v2.0

### 1. Notificaciones litúrgicas personalizables
El plugin de `expo-notifications` ya está configurado pero sin uso. Casos de uso naturales: recordatorio del Ángelus a las 12:00, aviso de misa en el día de precepto la tarde anterior, lectura del día a primera hora. El usuario elige qué quiere recibir y cuándo.

### 2. Calendario litúrgico anual completo
Vista de calendario mensual con todas las solemnidades, fiestas, memorias obligatorias y memorias libres. Colores litúrgicos por día. Tap en cualquier fecha para ver la lectura del evangelio de ese día (retroactivo y futuro). Útil para planificar retiros, preparar catequesis, seguir el año litúrgico con perspectiva.

### 3. Biblia completa navegable
Acceso a todos los libros de la Biblia (incluidos deuterocanónicos, ya soportados por la API actual) con búsqueda por referencia o por texto. Posibilidad de guardar versículos favoritos y añadirlos a las notas personales de cualquier lectura guardada. La infraestructura de `biblia.ts` ya tiene el mapping completo de libros.

### 4. Integración de IA con NVIDIA NIM
Chat de reflexión sobre la lectura del día y recomendaciones de lecturas bíblicas específicas contextualizadas en el evangelio de cada jornada. El proveedor sería NVIDIA NIM en lugar de Claude, manteniendo la misma interfaz de streaming ya definida en `lib/api/chat.ts`. Las recomendaciones combinarían el texto del evangelio del día, el tiempo litúrgico calculado y el historial de lecturas guardadas del usuario para personalizar las sugerencias.

### 5. Comunidad *(v3.0)*
Registro y login de usuarios. Blog general de comunidad más subblogs temáticos o parroquiales abiertos al público — cualquiera puede unirse a uno o varios. Moderación automática por IA que filtra mensajes hirientes, desinformación y malas praxis antes de la publicación. Cada subforo cuenta además con un moderador humano como último recurso. La identidad de la plataforma es la misma que la app: recogida, sin engagement artificial, orientada a la reflexión compartida.
