// TypeScript shim for Firebase JS SDK v12 React Native Auth APIs.
// Some toolchains may not pick up the correct typedefs for these symbols.
// This augmentation ensures TS recognizes them during build.
declare module 'firebase/auth' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function getReactNativePersistence(storage: any): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function initializeAuth(app: any, options: { persistence: any }): any;
}
