/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        fondo: {
          profundo: "#0A0A0A",
          base: "#111111",
          elevado: "#1A1A1A",
        },
        texto: {
          principal: "#FFFFFF",
          secundario: "#A0A0A0",
          tenue: "#888888",
        },
        acento: "#FF7D7D",
        borde: "#2A2A2A",
      },
      fontFamily: {
        // Cormorant Garamond — títulos litúrgicos/editoriales
        "cormorant": ["CormorantGaramond_400Regular"],
        "cormorant-light": ["CormorantGaramond_300Light"],
        "cormorant-medium": ["CormorantGaramond_500Medium"],
        "cormorant-semibold": ["CormorantGaramond_600SemiBold"],
        "cormorant-bold": ["CormorantGaramond_700Bold"],
        "cormorant-italic": ["CormorantGaramond_400Regular_Italic"],
        "cormorant-light-italic": ["CormorantGaramond_300Light_Italic"],
        // Inter — texto de cuerpo
        "inter": ["Inter_400Regular"],
        "inter-medium": ["Inter_500Medium"],
        "inter-semibold": ["Inter_600SemiBold"],
        "inter-bold": ["Inter_700Bold"],
      },
    },
  },
  plugins: [],
};
