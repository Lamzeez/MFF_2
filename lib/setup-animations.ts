import "react-native-reanimated";
import { configureReanimatedLogger, ReanimatedLogLevel } from "react-native-reanimated";

// Disable Reanimated strict mode warning (recommended for NativeWind on native).
try {
  configureReanimatedLogger({
    level: ReanimatedLogLevel.warn,
    strict: false,
  });
} catch {
  // Graceful fallback for older versions
}
