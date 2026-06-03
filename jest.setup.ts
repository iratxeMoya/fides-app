// TLRN v12.4+ ships its own jest matchers; extend-expect is no longer needed.
// Import the built-in matchers so toBeVisible(), toHaveStyle(), etc. are available.
import "@testing-library/react-native/extend-expect";

// ─── expo-sqlite ──────────────────────────────────────────────────────────────
// Tests declare their own per-test behavior via global.__sqliteMock
jest.mock("expo-sqlite", () => ({
  openDatabaseSync: jest.fn(() => ({
    execSync: jest.fn(),
    getAllSync: jest.fn(() => []),
    getFirstSync: jest.fn(() => null),
    runSync: jest.fn(() => ({ changes: 1, lastInsertRowId: 1 })),
    withExclusiveTransactionAsync: jest.fn(async (cb: any) => cb()),
    withTransactionAsync: jest.fn(async (cb: any) => cb()),
    closeSync: jest.fn(),
  })),
}));

// ─── expo-location ────────────────────────────────────────────────────────────
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 40.4168, longitude: -3.7038, accuracy: 10 },
    timestamp: Date.now(),
  }),
  Accuracy: { Lowest: 1, Low: 2, Balanced: 3, High: 4, Highest: 5, BestForNavigation: 6 },
}));

// ─── expo-router ──────────────────────────────────────────────────────────────
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn() };
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
  router: mockRouter,
  Link: ({ children }: any) => children,
  Tabs: ({ children }: any) => children,
  Stack: ({ children }: any) => children,
}));

// ─── @maplibre/maplibre-react-native ─────────────────────────────────────────
jest.mock("@maplibre/maplibre-react-native", () => {
  const React = require("react");
  const { View } = require("react-native");

  const MapView = React.forwardRef(
    ({ children, testID, ...rest }: any, _ref: any) =>
      React.createElement(View, { testID: testID ?? "map-view", ...rest }, children)
  );

  const Camera = React.forwardRef((_props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      flyTo:     jest.fn(),
      setCamera: jest.fn(),
    }));
    return null;
  });

  const PointAnnotation = ({ id, children, testID, ...rest }: any) =>
    React.createElement(View, { testID: testID ?? `marker-${id}`, ...rest }, children);

  const UserLocation = () => null;

  const MapLibreGL = { MapView, Camera, PointAnnotation, UserLocation };

  return { __esModule: true, default: MapLibreGL, ...MapLibreGL };
});

// ─── @gorhom/bottom-sheet ─────────────────────────────────────────────────────
jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react");
  const { View, FlatList } = require("react-native");

  const BottomSheet = React.forwardRef(({ children, ...rest }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      snapToIndex: jest.fn(),
      close: jest.fn(),
      expand: jest.fn(),
      collapse: jest.fn(),
    }));
    return React.createElement(View, { testID: "bottom-sheet" }, children);
  });

  const BottomSheetView = ({ children, ...rest }: any) =>
    React.createElement(View, { testID: "bottom-sheet-view", ...rest }, children);

  const BottomSheetFlatList = (props: any) =>
    React.createElement(FlatList, { testID: "bottom-sheet-flatlist", ...props });

  return {
    __esModule: true,
    default: BottomSheet,
    BottomSheetView,
    BottomSheetFlatList,
  };
});

// ─── @expo/vector-icons ───────────────────────────────────────────────────────
// virtual: true porque el paquete no está en node_modules (viene bundleado con Expo)
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Ionicons: ({ name, testID }: any) =>
      React.createElement(Text, { testID: testID ?? `icon-${name}` }, name),
  };
}, { virtual: true });

// ─── react-native-safe-area-context ──────────────────────────────────────────
jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    SafeAreaView: ({ children, ...props }: any) =>
      React.createElement(View, { testID: "safe-area-view", ...props }, children),
    SafeAreaProvider: ({ children }: any) =>
      React.createElement(View, {}, children),
    useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

// ─── react-native-reanimated ──────────────────────────────────────────────────
jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");
  Reanimated.default.call = jest.fn();
  return Reanimated;
});

// ─── expo-constants ───────────────────────────────────────────────────────────
// __esModule: true is required so that `import Constants from "expo-constants"`
// resolves to the `default` value (not the whole mock object).
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        anthropicApiKey: "TEST_ANTHROPIC_KEY",
        esbiblicaApiKey: "TEST_ESBIBLICA_KEY",
      },
    },
  },
}));

// ─── Suppress console.error spam from missing fonts ──────────────────────────
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    const msg = args[0];
    if (typeof msg === "string" && msg.includes("fontFamily")) return;
    originalError(...args);
  };
});
afterAll(() => {
  console.error = originalError;
});
