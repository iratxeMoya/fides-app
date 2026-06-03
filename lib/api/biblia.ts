/**
 * Módulo de lecturas bíblicas.
 *
 * Lectura del día  →  cpbjr.github.io/catholic-readings-api  (referencia USCCB)
 *                     + bible.helloao.org/api/spa_blm         (texto español, incluye deuterocanónicos)
 *
 * Búsqueda de pasaje  →  bible.helloao.org/api/spa_blm (mismo motor)
 */

import { ok, tryCatch, type Result } from "./result";
import { apiCache, TTL_1H, TTL_24H } from "./cache";
import { calcularTiempoLiturgico, COLOR_LITURGICO, NOMBRE_TIEMPO_LITURGICO } from "@/constants/liturgical";

// ─── URLs ─────────────────────────────────────────────────────────────────────

const URL_CPBJR   = "https://cpbjr.github.io/catholic-readings-api/readings";
const URL_HELLOAO = "https://bible.helloao.org/api/spa_blm";

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export type LecturaDelDia = {
  /** Nombre litúrgico del tiempo — "Tiempo de Pascua" */
  titulo: string;
  /** Referencia del Evangelio — "John 10:11-18" */
  referencia: string;
  /** Texto completo del Evangelio */
  texto: string;
  /** Íncipit/título del Evangelio (igual que referencia) */
  evangelio: string;
  /** Primera lectura (si está disponible) */
  primeraLectura?: { referencia: string; texto: string };
  /** Salmo responsorial (si está disponible) */
  salmo?: { referencia: string; texto: string };
  /** Color litúrgico del día */
  colorLiturgico: string;
};

// ─── Mapeo de nombres de libros (USCCB → OSIS) ───────────────────────────────

const BOOK_ID: Record<string, string> = {
  // Antiguo Testamento
  Genesis: "GEN", Exodus: "EXO", Leviticus: "LEV", Numbers: "NUM",
  Deuteronomy: "DEU", Joshua: "JOS", Judges: "JDG", Ruth: "RUT",
  "1 Samuel": "1SA", "2 Samuel": "2SA", "1 Kings": "1KI", "2 Kings": "2KI",
  "1 Chronicles": "1CH", "2 Chronicles": "2CH", Ezra: "EZR", Nehemiah: "NEH",
  Tobit: "TOB", Judith: "JDT", Esther: "EST",
  "1 Maccabees": "1MA", "2 Maccabees": "2MA",
  Job: "JOB", Psalm: "PSA", Psalms: "PSA", Proverbs: "PRO",
  Ecclesiastes: "ECC", "Song of Songs": "SNG", "Song of Solomon": "SNG",
  Wisdom: "WIS", Sirach: "SIR",
  Isaiah: "ISA", Jeremiah: "JER", Lamentations: "LAM", Baruch: "BAR",
  Ezekiel: "EZK", Daniel: "DAN",
  Hosea: "HOS", Joel: "JOL", Amos: "AMO", Obadiah: "OBA",
  Jonah: "JON", Micah: "MIC", Nahum: "NAM", Habakkuk: "HAB",
  Zephaniah: "ZEP", Haggai: "HAG", Zechariah: "ZEC", Malachi: "MAL",
  // Nuevo Testamento
  Matthew: "MAT", Mark: "MRK", Luke: "LUK", John: "JHN",
  Acts: "ACT", Romans: "ROM",
  "1 Corinthians": "1CO", "2 Corinthians": "2CO",
  Galatians: "GAL", Ephesians: "EPH", Philippians: "PHP",
  Colossians: "COL", "1 Thessalonians": "1TH", "2 Thessalonians": "2TH",
  "1 Timothy": "1TI", "2 Timothy": "2TI", Titus: "TIT", Philemon: "PHM",
  Hebrews: "HEB", James: "JAS",
  "1 Peter": "1PE", "2 Peter": "2PE",
  "1 John": "1JN", "2 John": "2JN", "3 John": "3JN",
  Jude: "JUD", Revelation: "REV",
};

// ─── Nombres en español de los libros bíblicos ───────────────────────────────

const BOOK_NAME_ES: Record<string, string> = {
  Genesis: "Génesis", Exodus: "Éxodo", Leviticus: "Levítico",
  Numbers: "Números", Deuteronomy: "Deuteronomio", Joshua: "Josué",
  Judges: "Jueces", Ruth: "Rut",
  "1 Samuel": "1 Samuel", "2 Samuel": "2 Samuel",
  "1 Kings": "1 Reyes", "2 Kings": "2 Reyes",
  "1 Chronicles": "1 Crónicas", "2 Chronicles": "2 Crónicas",
  Ezra: "Esdras", Nehemiah: "Nehemías",
  Tobit: "Tobías", Judith: "Judit", Esther: "Ester",
  "1 Maccabees": "1 Macabeos", "2 Maccabees": "2 Macabeos",
  Job: "Job", Psalm: "Salmo", Psalms: "Salmos",
  Proverbs: "Proverbios", Ecclesiastes: "Eclesiastés",
  "Song of Songs": "Cantar de los Cantares",
  "Song of Solomon": "Cantar de los Cantares",
  Wisdom: "Sabiduría", Sirach: "Sirácida",
  Isaiah: "Isaías", Jeremiah: "Jeremías", Lamentations: "Lamentaciones",
  Baruch: "Baruc", Ezekiel: "Ezequiel", Daniel: "Daniel",
  Hosea: "Oseas", Joel: "Joel", Amos: "Amós", Obadiah: "Abdías",
  Jonah: "Jonás", Micah: "Miqueas", Nahum: "Nahúm",
  Habakkuk: "Habacuc", Zephaniah: "Sofonías", Haggai: "Ageo",
  Zechariah: "Zacarías", Malachi: "Malaquías",
  Matthew: "Mateo", Mark: "Marcos", Luke: "Lucas", John: "Juan",
  Acts: "Hechos", Romans: "Romanos",
  "1 Corinthians": "1 Corintios", "2 Corinthians": "2 Corintios",
  Galatians: "Gálatas", Ephesians: "Efesios", Philippians: "Filipenses",
  Colossians: "Colosenses",
  "1 Thessalonians": "1 Tesalonicenses", "2 Thessalonians": "2 Tesalonicenses",
  "1 Timothy": "1 Timoteo", "2 Timothy": "2 Timoteo",
  Titus: "Tito", Philemon: "Filemón", Hebrews: "Hebreos",
  James: "Santiago",
  "1 Peter": "1 Pedro", "2 Peter": "2 Pedro",
  "1 John": "1 Juan", "2 John": "2 Juan", "3 John": "3 Juan",
  Jude: "Judas", Revelation: "Apocalipsis",
};

/** Traduce una referencia bíblica en formato USCCB (inglés) al español para mostrar en UI.
 *  "2 Peter 1:2-7" → "2 Pedro 1:2-7" | "Psalm 91:1-2, 14-15b" → "Salmo 91:1-2, 14-15b"
 */
export function translateRefES(ref: string): string {
  const keys = Object.keys(BOOK_NAME_ES).sort((a, b) => b.length - a.length);
  for (const en of keys) {
    if (ref.startsWith(en)) {
      return BOOK_NAME_ES[en] + ref.slice(en.length);
    }
  }
  return ref;
}

// ─── Tipos de la API helloao ──────────────────────────────────────────────────

type HelloaoContentItem = string | { text: string; wordsOfJesus?: boolean; poem?: number };
type HelloaoVerse = { type: string; number: number; content: HelloaoContentItem[] };

// ─── Tipos de la API cpbjr ────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

type ParsedRef = { bookId: string; chapter: number; verseStart: number; verseEnd: number };

function parseRef(ref: string): ParsedRef | null {
  // Strip additional comma-separated ranges: "Psalm 91:1-2, 14-15b" → "Psalm 91:1-2"
  const clean = ref.split(",")[0].trim();

  // "Book Chapter:VerseStart[-VerseEnd]" (handles "2 Peter 1:2-7", "John 10:11-18")
  const m = clean.match(/^(.*?)\s+(\d+):(\d+)[a-c]?(?:-(\d+)[a-c]?)?/);
  if (m) {
    const bookId = BOOK_ID[m[1].trim()];
    if (!bookId) return null;
    return { bookId, chapter: +m[2], verseStart: +m[3], verseEnd: +(m[4] ?? m[3]) };
  }

  // Single-chapter books: "Philemon 9-10"
  const s = clean.match(/^(.*?)\s+(\d+)[a-c]?(?:-(\d+)[a-c]?)?$/);
  if (s) {
    const bookId = BOOK_ID[s[1].trim()];
    if (!bookId) return null;
    return { bookId, chapter: 1, verseStart: +s[2], verseEnd: +(s[3] ?? s[2]) };
  }

  return null;
}

function itemToText(item: HelloaoContentItem): string {
  return typeof item === "string" ? item : (item.text ?? "");
}

function versesToText(content: HelloaoVerse[], from: number, to: number): string {
  return content
    .filter(v => v.type === "verse" && v.number >= from && v.number <= to)
    .map(v => v.content.map(itemToText).join(" "))
    .join(" ")
    .trim();
}

async function fetchPassageText(ref: string): Promise<string | null> {
  const parsed = parseRef(ref);
  if (!parsed) return null;

  const res = await fetch(`${URL_HELLOAO}/${parsed.bookId}/${parsed.chapter}.json`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;

  const data = await res.json();
  const text = versesToText(data.chapter?.content ?? [], parsed.verseStart, parsed.verseEnd);
  return text || null;
}

// ─── getLecturaDelDia ─────────────────────────────────────────────────────────

/**
 * Devuelve la lectura litúrgica del día.
 * Cachea el resultado 24 horas (las lecturas solo cambian a medianoche).
 */
export async function getLecturaDelDia(
  date: Date = new Date()
): Promise<Result<LecturaDelDia>> {
  const y  = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const cacheKey = `lectura-del-dia:${y}-${mm}-${dd}`;

  const cached = apiCache.get<LecturaDelDia>(cacheKey);
  if (cached) return ok(cached);

  return tryCatch(async () => {
    // 1. Obtener referencias del leccionario
    const refRes = await fetch(`${URL_CPBJR}/${y}/${mm}-${dd}.json`, {
      headers: { Accept: "application/json" },
    });
    if (!refRes.ok) throw new Error(`Lectionary API respondió ${refRes.status}`);

    const refData: CpbjrDay = await refRes.json();
    const gospelRef = refData.readings?.gospel;
    if (!gospelRef) throw new Error("La respuesta no contiene el Evangelio del día");

    // 2. Texto del Evangelio (obligatorio)
    const gospelText = await fetchPassageText(gospelRef);
    if (!gospelText) throw new Error(`No se pudo obtener el texto del Evangelio: "${gospelRef}"`);

    // 3. Primera lectura y salmo en paralelo (opcionales, los fallos no bloquean)
    const firstRef = refData.readings?.firstReading;
    const psalmRef = refData.readings?.psalm;

    const [firstText, psalmText] = await Promise.all([
      firstRef ? fetchPassageText(firstRef).catch(() => null) : Promise.resolve(null),
      psalmRef ? fetchPassageText(psalmRef).catch(() => null) : Promise.resolve(null),
    ]);

    const tiempo = calcularTiempoLiturgico(date);
    const lectura: LecturaDelDia = {
      titulo:         NOMBRE_TIEMPO_LITURGICO[tiempo],
      colorLiturgico: COLOR_LITURGICO[tiempo],
      referencia:     gospelRef,
      texto:          gospelText,
      evangelio:      gospelRef,
      ...(firstRef && firstText ? { primeraLectura: { referencia: firstRef, texto: firstText } } : {}),
      ...(psalmRef && psalmText ? { salmo: { referencia: psalmRef, texto: psalmText } } : {}),
    };

    apiCache.set(cacheKey, lectura, TTL_24H);
    return lectura;
  }, "getLecturaDelDia");
}

// ─── getBusquedaPasaje ────────────────────────────────────────────────────────

/**
 * Obtiene el texto de un pasaje bíblico por referencia (USCCB format).
 *
 * @param referencia — "John 3:16", "Matthew 5:1-12", "Psalm 23", etc.
 */
export async function getBusquedaPasaje(
  referencia: string
): Promise<Result<string>> {
  const cacheKey = `pasaje:${referencia}`;
  const cached = apiCache.get<string>(cacheKey);
  if (cached) return ok(cached);

  return tryCatch(async () => {
    const texto = await fetchPassageText(referencia);
    if (!texto) throw new Error(`No se encontró texto para "${referencia}"`);
    apiCache.set(cacheKey, texto, TTL_1H);
    return texto;
  }, "getBusquedaPasaje");
}
