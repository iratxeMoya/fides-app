/** Respuesta válida mínima de Google Places Nearby Search */
export const googleNearbyResponseFixture = {
  status: "OK",
  results: [
    {
      place_id:  "ChIJSRl_T5AoQg0Rf0vqOL2R_vs",
      name:      "Catedral de la Almudena",
      vicinity:  "Calle Bailén, Madrid",
      geometry: {
        location: { lat: 40.4150, lng: -3.7143 },
      },
      opening_hours: { open_now: true },
      business_status: "OPERATIONAL",
    },
    {
      place_id:  "ChIJKoXxONMpQg0R0mMmI9pVl4Y",
      name:      "Parroquia de San Ginés",
      vicinity:  "Calle Arenal, 13, Madrid",
      geometry: {
        location: { lat: 40.4166, lng: -3.7089 },
      },
      opening_hours: { open_now: false },
      business_status: "OPERATIONAL",
    },
  ],
};

/** Respuesta con cero resultados (ZERO_RESULTS) */
export const googleZeroResultsFixture = {
  status: "ZERO_RESULTS",
  results: [],
};

/** Respuesta completa de Places Details para la Almudena */
export const googleDetailResponseFixture = {
  status: "OK",
  result: {
    place_id:          "ChIJSRl_T5AoQg0Rf0vqOL2R_vs",
    name:              "Catedral de la Almudena",
    formatted_address: "C/ Bailén, s/n, 28071 Madrid, España",
    geometry: {
      location: { lat: 40.4150, lng: -3.7143 },
    },
    formatted_phone_number: "+34 913 65 22 00",
    website: "https://www.catedraldelaalmudena.es",
    opening_hours: {
      open_now: true,
      periods: [
        // Lunes (1): 9:00 - 20:00
        { open: { day: 1, time: "0900" }, close: { day: 1, time: "2000" } },
        // Martes (2): 9:00 - 20:00
        { open: { day: 2, time: "0900" }, close: { day: 2, time: "2000" } },
        // Miércoles (3): 9:00 - 20:00
        { open: { day: 3, time: "0900" }, close: { day: 3, time: "2000" } },
        // Jueves (4): 9:00 - 20:00
        { open: { day: 4, time: "0900" }, close: { day: 4, time: "2000" } },
        // Viernes (5): 9:00 - 20:00
        { open: { day: 5, time: "0900" }, close: { day: 5, time: "2000" } },
        // Sábado (6): 9:00 - 20:00
        { open: { day: 6, time: "0900" }, close: { day: 6, time: "2000" } },
        // Domingo (0): 10:00 - 20:00
        { open: { day: 0, time: "1000" }, close: { day: 0, time: "2000" } },
      ],
      weekday_text: [
        "lunes: 9:00–20:00",
        "martes: 9:00–20:00",
        "miércoles: 9:00–20:00",
        "jueves: 9:00–20:00",
        "viernes: 9:00–20:00",
        "sábado: 9:00–20:00",
        "domingo: 10:00–20:00",
      ],
    },
    photos: [
      { photo_reference: "photo_ref_almudena_1", height: 1080, width: 1920 },
      { photo_reference: "photo_ref_almudena_2", height: 720, width: 1280 },
    ],
    business_status: "OPERATIONAL",
  },
};

/** Respuesta de cpbjr.github.io para el IV Domingo de Pascua (2025-04-27) */
export const evangelizoResponseFixture = {
  date: "2025-04-27",
  monthDay: "4/27",
  season: "Easter",
  readings: {
    firstReading: "Acts 4:8-12",
    psalm: "Psalm 118:1, 8-9, 21-23, 26, 28, 29",
    gospel: "John 10:11-18",
  },
  usccbLink: "https://bible.usccb.org/bible/readings/042725.cfm",
};

/** Respuesta de bible.helloao.org/api/spa_blm/JHN/10.json (simplificada) */
export const helloaoJohn10Fixture = {
  chapter: {
    number: 10,
    content: [
      { type: "verse", number: 11, content: [{ text: "Yo soy el buen pastor. El buen pastor da su vida por las ovejas.", wordsOfJesus: true }] },
      { type: "verse", number: 12, content: [{ text: "El asalariado, que no es pastor ni dueño del rebaño...", wordsOfJesus: true }] },
      { type: "verse", number: 13, content: [{ text: "Porque es asalariado y no le importan las ovejas.", wordsOfJesus: true }] },
      { type: "verse", number: 14, content: [{ text: "Yo soy el buen pastor; conozco a mis ovejas y ellas me conocen a mí.", wordsOfJesus: true }] },
      { type: "verse", number: 15, content: [{ text: "Así como el Padre me conoce a mí y yo conozco al Padre...", wordsOfJesus: true }] },
      { type: "verse", number: 16, content: [{ text: "Tengo además otras ovejas que no son de este redil...", wordsOfJesus: true }] },
      { type: "verse", number: 17, content: [{ text: "Por eso me ama el Padre: porque entrego mi vida...", wordsOfJesus: true }] },
      { type: "verse", number: 18, content: [{ text: "Nadie me la quita, sino que yo la entrego por mi propia voluntad.", wordsOfJesus: true }] },
    ],
  },
};

/** Respuesta de bible.helloao.org/api/spa_blm/ACT/4.json (simplificada) */
export const helloaoActs4Fixture = {
  chapter: {
    number: 4,
    content: [
      { type: "verse", number: 8,  content: [{ text: "Entonces Pedro, lleno del Espíritu Santo, les dijo..." }] },
      { type: "verse", number: 9,  content: [{ text: "Si hoy se nos llama a juicio por haber sanado a un inválido..." }] },
      { type: "verse", number: 10, content: [{ text: "Sepan todos ustedes y todo el pueblo de Israel..." }] },
      { type: "verse", number: 11, content: [{ text: "Este Jesús es la piedra que desecharon ustedes los constructores..." }] },
      { type: "verse", number: 12, content: [{ text: "De hecho, en ningún otro hay salvación..." }] },
    ],
  },
};
