const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);
const nativeWindConfig = withNativeWind(config, { input: "./global.css" });

// Chain @/ path alias resolution with NativeWind's resolver.
// tsconfig.json maps "@/*" → "./*" (project root), but Metro has no built-in
// tsconfig-paths support in this setup — we handle it here instead.
const nativeWindResolveRequest = nativeWindConfig.resolver.resolveRequest;
nativeWindConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith("@/")) {
    const absolutePath = path.resolve(__dirname, moduleName.slice(2));
    const next = nativeWindResolveRequest ?? context.resolveRequest;
    return next(context, absolutePath, platform);
  }
  const next = nativeWindResolveRequest ?? context.resolveRequest;
  return next(context, moduleName, platform);
};

// Inject DOMException polyfill before any module code runs.
// RN 0.81's setUpDefaultReactNativeEnvironment loads streams polyfills that
// reference DOMException as a bare global before Hermes registers it natively.
const originalGetPolyfills = nativeWindConfig.serializer.getPolyfills;
nativeWindConfig.serializer.getPolyfills = (ctx) => {
  const existing = originalGetPolyfills ? originalGetPolyfills(ctx) : [];
  return [
    path.resolve(__dirname, "polyfill-domexception.js"),
    ...existing,
  ];
};

module.exports = nativeWindConfig;
