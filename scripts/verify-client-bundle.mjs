import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const outputDir = path.join(root, "dist", "foundation-client");
mkdirSync(outputDir, { recursive: true });
const cli = path.join(root, "node_modules", "expo", "bin", "cli");
for (const platform of ["android", "ios"]) {
  const result = spawnSync(process.execPath, [cli, "export:embed", "--entry-file", "tests/bundle/supabase.ts", "--platform", platform,
    "--dev", "false", "--minify", "false", "--max-workers", "2", "--bundle-output", path.join(outputDir, `${platform}.js`)],
  { cwd: root, stdio: "inherit" });
  if (result.error || result.status !== 0) process.exit(1);
}
