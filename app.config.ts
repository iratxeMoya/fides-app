import type { ConfigContext, ExpoConfig } from "expo/config";

// app.config.ts extiende app.json y añade las claves de entorno.
// Las variables de proceso se inyectan en build-time mediante un .env local
// (desarrollo) o mediante EAS Secrets (producción).
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Fides",
  slug: "fides-app",
  ios: {
    ...config.ios,
    infoPlist: {
      ...((config.ios as Record<string, unknown>)?.infoPlist ?? {}),
      NSLocationWhenInUseUsageDescription:
        "Fides necesita tu ubicación para mostrarte las iglesias más cercanas.",
    },
  },
  extra: {
    ...config.extra,
    // esbiblica.com Bible API
    esbiblicaApiKey: process.env.ESBIBLICA_API_KEY ?? "",
    // Anthropic Claude API — para citas inspiradoras (solo llamar desde backend en producción)
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? "",
    },
  },
});
