// Metro polyfill: must run before any module code (incl. InitializeCore).
// React Native 0.81 / Hermes does not register DOMException globally before
// the streams polyfill loaded by setUpDefaultReactNativeEnvironment accesses it.
if (typeof DOMException === "undefined") {
  global.DOMException = class DOMException extends Error {
    constructor(message, name) {
      super(message);
      this.name = name || "DOMException";
      this.code = 0;
    }
  };
}
