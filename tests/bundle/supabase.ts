// Build-only entry ensures Metro compiles the otherwise-unused foundation client.
// Not a route, not imported by the prototype, and makes no backend requests.
import { AppState } from "react-native";
import { getSupabaseClient } from "../../lib/supabase/client";
import { bindNativeAuthLifecycle } from "../../lib/supabase/lifecycle";

export function foundationBundleProbe() {
  return bindNativeAuthLifecycle(getSupabaseClient().auth, AppState, () => {});
}
