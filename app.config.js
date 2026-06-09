// Extiende app.json añadiendo claves de entorno en tiempo de build.
// Expo fusiona automáticamente app.json en el parámetro `config`.
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    nvidiaApiKey: process.env.NVIDIA_NIM_API_KEY ?? "",
  },
});
