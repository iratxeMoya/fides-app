import type { LecturaDelDia } from "@/lib/api/biblia";

/** Lectura del IV Domingo de Pascua (ciclo B), con primera carta, salmo y evangelio */
export const lecturaFixture: LecturaDelDia = {
  titulo:         "IV Domingo de Pascua",
  referencia:     "Jn 10:11-18",
  texto:
    "En aquel tiempo, dijo Jesús: Yo soy el buen Pastor. " +
    "El buen Pastor da su vida por las ovejas. El mercenario, " +
    "como no es el pastor ni las ovejas son suyas propias, " +
    "ve venir al lobo, abandona las ovejas y huye: y el lobo hace " +
    "presa en ellas y las dispersa. El mercenario huye porque es " +
    "asalariado y no le importan las ovejas. Yo soy el buen Pastor, " +
    "que conozco a mis ovejas y las mías me conocen a mí, " +
    "igual que el Padre me conoce a mí y yo conozco al Padre: " +
    "y doy mi vida por las ovejas. Tengo, además, otras ovejas " +
    "que no son de este aprisco; también a ésas las tengo que traer, " +
    "y escucharán mi voz, y habrá un solo rebaño, un solo Pastor.",
  evangelio:      "Yo soy el buen Pastor",
  colorLiturgico: "blanco",
  primeraLectura: {
    referencia: "Hch 4:8-12",
    texto:
      "En aquellos días, Pedro, lleno del Espíritu Santo, dijo: " +
      "Jefes del pueblo y ancianos, si hoy se nos interroga " +
      "sobre el beneficio hecho a un hombre enfermo y sobre " +
      "quién lo ha curado, sépanlo todos ustedes y todo el " +
      "pueblo de Israel: este hombre está sano gracias al " +
      "nombre de Jesucristo de Nazaret, a quien ustedes " +
      "crucificaron y a quien Dios resucitó de entre los muertos.",
  },
  salmo: {
    referencia: "Sal 117",
    texto:
      "Den gracias al Señor porque es bueno, porque su amor es eterno. " +
      "Mejor es refugiarse en el Señor que fiarse de los hombres. " +
      "La diestra del Señor es poderosa, la diestra del Señor es excelsa.",
  },
};

/** Lectura mínima sin primera carta ni salmo (para tests simplificados) */
export const lecturaMinimaFixture: LecturaDelDia = {
  titulo:         "Lunes de la Semana IV",
  referencia:     "Mc 6:53-56",
  texto:
    "En aquel tiempo, Jesús y sus discípulos, terminada la travesía, " +
    "llegaron a tierra en Genesaret y atracaron allí.",
  evangelio:      "Jesús curó a todos los enfermos",
  colorLiturgico: "verde",
};
