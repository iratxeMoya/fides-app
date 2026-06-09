import Constants from "expo-constants";

type AppExtra = {
  esbiblicaApiKey: string;
  anthropicApiKey: string;
  nvidiaApiKey:    string;
  eas: { projectId: string };
};

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<AppExtra>;

export const Config = {
  esbiblicaApiKey: extra.esbiblicaApiKey ?? "",
  anthropicApiKey: extra.anthropicApiKey ?? "",
  // extra (EAS/producción) tiene prioridad; EXPO_PUBLIC_ funciona en dev builds vía Metro inline
  nvidiaApiKey:    extra.nvidiaApiKey    ?? process.env.EXPO_PUBLIC_NVIDIA_NIM_API_KEY ?? "",
} as const;

export function hasApiKey(key: keyof typeof Config): boolean {
  return Config[key].length > 0;
}
