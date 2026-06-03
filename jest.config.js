/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  // Compile all packages that ship as ESM or require Babel transforms.
  // react-native-reanimated and react-native-gesture-handler are deliberately
  // excluded: their native modules are mocked in jest.setup.ts and they
  // must NOT be compiled here to avoid triggering the react-native-worklets/plugin dependency.
  transformIgnorePatterns: [
    "node_modules/(?!(" +
      "(jest-)?react-native" +
      "|@react-native(-community)?" +
      "|expo(nent)?" +
      "|@expo(nent)?/.*" +
      "|@expo-google-fonts/.*" +
      "|react-navigation" +
      "|@react-navigation/.*" +
      "|@unimodules/.*" +
      "|unimodules" +
      "|nativewind" +
      "|tailwindcss" +
      "|@gorhom/.*" +
      "|drizzle-orm" +
      "|react-native-maps" +
      "|react-native-safe-area-context" +
    "))",
  ],

  // Resolve @/ alias to project root.
  // msw/node: Jest's resolver doesn't read package.json "exports", so map it
  // explicitly to the CJS bundle (lib/node/index.js).
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^msw/node$": "<rootDir>/node_modules/msw/lib/node/index.js",
  },

  testMatch: ["<rootDir>/tests/**/*.test.{ts,tsx}"],

  collectCoverageFrom: [
    "constants/**/*.ts",
    "lib/**/*.ts",
    "components/**/*.tsx",
    "app/(tabs)/**/*.tsx",
    "!**/*.d.ts",
  ],
};
