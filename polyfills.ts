// DOMException is not available in all Hermes builds bundled in Expo Go.
// react-native-worklets (reanimated 4.x) references it during initialization.
if (typeof DOMException === "undefined") {
  (global as any).DOMException = class DOMException extends Error {
    readonly code: number;
    constructor(message = "", name = "DOMException") {
      super(message);
      this.name = name;
      this.code = 0;
    }
  };
}
