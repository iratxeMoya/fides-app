module.exports = function (api) {
  api.cache(true);
  const isTest = process.env.NODE_ENV === "test";
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          // NativeWind JSX runtime is skipped in Jest: its babel transform injects
          // _ReactNativeCSSInterop into jest.mock() factories, which Babel's
          // hoisting rules forbid. Tailwind classes aren't tested for visual output.
          jsxImportSource: isTest ? undefined : "nativewind",
          // Disable the auto-added reanimated plugin in Jest — it requires
          // react-native-worklets-core which is a native-only runtime dep.
          // The module is mocked via react-native-reanimated/mock in jest.setup.ts.
          ...(isTest && { reanimated: false }),
        },
      ],
      // nativewind/babel also skipped in test mode for the same reason.
      ...(isTest ? [] : ["nativewind/babel"]),
    ],
    plugins: [],
  };
};
