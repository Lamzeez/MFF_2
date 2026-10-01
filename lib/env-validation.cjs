/** Public configuration, never a security boundary. Never include values in errors. */
/** @param {string | undefined} rawUrl @param {string | undefined} rawKey */
function parseSupabaseEnvironment(rawUrl, rawKey) {
  if (!rawUrl?.trim() || !rawKey?.trim()) {
    throw new Error("Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }
  let url;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error("Invalid Supabase URL.");
  }
  const local = ["localhost", "127.0.0.1", "[::1]", "10.0.2.2"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
      url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("Supabase URL must be an HTTPS origin (HTTP is allowed only for local development hosts).");
  }
  const publishableKey = rawKey.trim();
  // Accept only modern publishable keys. Legacy JWT anon keys intentionally unsupported:
  // accepting arbitrary JWTs would risk accidentally bundling a service-role credential.
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)) {
    throw new Error("Use a Supabase publishable key. Secret keys and legacy JWT keys are not accepted in the Expo client.");
  }
  return { url: url.origin, publishableKey };
}

module.exports = { parseSupabaseEnvironment };
