// Custom entry point — polyfills must run synchronously before any module
// that references browser globals (e.g. react-native-worklets uses DOMException).

if (typeof DOMException === "undefined") {
  global.DOMException = class DOMException extends Error {
    constructor(message = "", name = "DOMException") {
      super(message);
      this.name = name;
      this.code = 0;
    }
  };
}

require("expo-router/entry");
