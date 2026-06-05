import type { ConfigContext, ExpoConfig } from "expo/config";

// app.config.ts extiende app.json y añade las claves de entorno.
// Las variables de proceso se inyectan en build-time mediante un .env local
// (desarrollo) o mediante EAS Secrets (producción).

const IS_DEV = process.env.APP_VARIANT === "development";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV ? "Fides (dev)" : "Fides",
  slug: "fides-app",
  android: {
    ...config.android,
    package: IS_DEV ? "com.fides.app.dev" : "com.fides.app",
  },
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
      projectId: process.env.EAS_PROJECT_ID ?? "bfc111cc-eabb-4a7e-9051-a07ceefbc4c0",
    },
  },
});
