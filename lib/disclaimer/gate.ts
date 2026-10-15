// The disclaimer gate: shown until the running app version has been accepted, then gone until
// the version changes. The accepted version lives in a cookie on this device.

export const ACCEPTANCE_COOKIE = "foodi-dex-disclaimer";

/**
 * @param accepted [string | undefined] the version this device last accepted, if any
 * @param current [string] the running app version
 * @return [boolean] true when the disclaimer must be shown
 */
export function needsAcceptance(accepted: string | undefined, current: string): boolean {
  return accepted !== current;
}

/** @return [string] the running app version, set from package.json at build time by next.config.ts */
export function appVersion(): string {
  const version = process.env.APP_VERSION;
  if (!version) throw new Error("APP_VERSION is not set: next.config.ts sets it from package.json");
  return version;
}
