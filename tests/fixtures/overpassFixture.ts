/** Respuesta de Overpass API con dos iglesias cercanas */
export const overpassNearbyResponseFixture = {
  version:   0.6,
  generator: "Overpass API 0.7.61",
  elements: [
    {
      type: "node",
      id:   123456789,
      lat:  40.4150,
      lon:  -3.7143,
      tags: {
        amenity:            "place_of_worship",
        religion:           "christian",
        denomination:       "catholic",
        name:               "Catedral de la Almudena",
        "addr:street":      "Calle Bailén",
        "addr:city":        "Madrid",
        opening_hours:      "Mo-Su 09:00-20:00",
      },
    },
    {
      type:   "way",
      id:     987654321,
      center: { lat: 40.4166, lon: -3.7089 },
      tags: {
        amenity:            "place_of_worship",
        religion:           "christian",
        name:               "Parroquia de San Ginés",
        "addr:street":      "Calle Arenal",
        "addr:housenumber": "13",
        "addr:city":        "Madrid",
      },
    },
  ],
};

/** Respuesta con cero elementos */
export const overpassZeroResultsFixture = {
  version:   0.6,
  generator: "Overpass API",
  elements:  [],
};

/** Respuesta de detalle para la Almudena (node:123456789) */
export const overpassDetailResponseFixture = {
  version:   0.6,
  generator: "Overpass API",
  elements: [
    {
      type: "node",
      id:   123456789,
      lat:  40.4150,
      lon:  -3.7143,
      tags: {
        amenity:       "place_of_worship",
        religion:      "christian",
        denomination:  "catholic",
        name:          "Catedral de la Almudena",
        "addr:street": "Calle Bailén",
        "addr:city":   "Madrid",
        phone:         "+34 913 65 22 00",
        website:       "https://www.catedraldelaalmudena.es",
        // Lunes–Sábado 09–20, Domingo 10–20
        opening_hours: "Mo-Sa 09:00-20:00; Su 10:00-20:00",
      },
    },
  ],
};
