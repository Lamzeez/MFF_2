/**
 * Platform & Role Security Policy for Mati FoodFinder
 *
 * Controls role availability across device types:
 * - Development / Rapid Testing (default): Developers can test all mobile and web
 *   roles directly on their PC using F12 DevTools (responsive mode).
 * - Production Strict Mode (EXPO_PUBLIC_STRICT_PLATFORM_GUARDS=true): Enforces strict
 *   device boundaries:
 *     - System Admin: Computer web browser ONLY (never mobile).
 *     - Customers & Riders: Mobile phone / tablet app ONLY.
 *     - Store Admins: Web Dashboard on computer, Kitchen display on tablet & mobile phone.
 */

export const ENFORCE_STRICT_PLATFORM_GUARDS =
  process.env.EXPO_PUBLIC_STRICT_PLATFORM_GUARDS === "true";

/**
 * Safely resolves the active platform OS across React Native, React Native Web, and Node tests.
 */
export function getPlatformOS(override?: string): string {
  if (override) return override;
  try {
    // Dynamic access to avoid esbuild parsing react-native flow syntax in pure node tests
    const req = typeof require !== "undefined" ? require : null;
    if (req) {
      const rn = req("react-native");
      if (rn?.Platform?.OS) return rn.Platform.OS;
    }
  } catch {
    // Fallback for environments where react-native is not bundled
  }
  return typeof window !== "undefined" ? "web" : "web";
}

/**
 * Evaluates whether the current runtime or viewport represents a mobile device.
 * On native iOS/Android, this is always true.
 * On Web, evaluates true if the viewport width is below 768px (standard mobile breakpoint).
 */
export function isMobileDevice(width: number, platformOS?: string): boolean {
  const os = getPlatformOS(platformOS);
  if (os !== "web") return true;
  return width < 768;
}

/**
 * Evaluates whether the current runtime represents a desktop computer.
 * On native iOS/Android, this is false.
 * On Web, evaluates true if viewport width is >= 768px.
 */
export function isDesktopDevice(width: number, platformOS?: string): boolean {
  const os = getPlatformOS(platformOS);
  if (os !== "web") return false;
  return width >= 768;
}

/**
 * Evaluates whether the current runtime represents a tablet.
 */
export function isTabletDevice(width: number, platformOS?: string): boolean {
  return width >= 768 && width < 1024;
}

/**
 * Determines whether mobile customer and rider screens can be rendered.
 * In development, returns true so developers can test in F12 mobile view.
 * In strict production mode, requires a mobile viewport or native platform.
 */
export function canAccessMobileScreens(width: number, platformOS?: string): boolean {
  if (!ENFORCE_STRICT_PLATFORM_GUARDS) return true;
  return isMobileDevice(width, platformOS);
}

/**
 * System Admin is STRICTLY restricted to desktop computer workstations.
 * Mobile phones (native or web viewports < 768px) are ALWAYS blocked.
 */
export function canAccessSystemAdmin(width: number, platformOS?: string): boolean {
  const os = getPlatformOS(platformOS);
  return os === "web" && width >= 768;
}

/**
 * Store Admin Web Dashboard is designed for computer desktop browsers.
 */
export function canAccessStoreAdminWeb(width: number, platformOS?: string): boolean {
  if (!ENFORCE_STRICT_PLATFORM_GUARDS) return true;
  return isDesktopDevice(width, platformOS);
}

/**
 * Store Admin Kitchen display is designed for tablet and mobile phone screens.
 */
export function canAccessStoreAdminKitchen(width: number, platformOS?: string): boolean {
  return true;
}
