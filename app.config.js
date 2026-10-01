const { parseSupabaseEnvironment } = require("./lib/env-validation.cjs");

/** Validate before Expo inlines public values into bundles. Keep app.json authoritative. */
module.exports = ({ config }) => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url !== undefined || key !== undefined) parseSupabaseEnvironment(url, key);
  return config;
};
