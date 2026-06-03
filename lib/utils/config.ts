import Constants from "expo-constants";

type AppExtra = {
  esbiblicaApiKey: string;
  anthropicApiKey: string;
  eas: { projectId: string };
};

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<AppExtra>;

export const Config = {
  esbiblicaApiKey: extra.esbiblicaApiKey ?? "",
  anthropicApiKey: extra.anthropicApiKey ?? "",
} as const;

export function hasApiKey(key: keyof typeof Config): boolean {
  return Config[key].length > 0;
}
