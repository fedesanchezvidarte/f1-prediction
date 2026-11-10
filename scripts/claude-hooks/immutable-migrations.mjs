// PreToolUse (Edit|Write|MultiEdit): migrations already on main are immutable.
// A schema change is always a new file created with `supabase migration new`.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const input = JSON.parse(readFileSync(0, "utf8"));
const filePath = input.tool_input?.file_path;
if (!filePath) process.exit(0);

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input.cwd;
const relative = path.relative(projectDir, filePath).split(path.sep).join("/");
if (!/^supabase\/migrations\/.+\.sql$/.test(relative)) process.exit(0);

try {
  execFileSync("git", ["cat-file", "-e", `origin/main:${relative}`], { cwd: projectDir, stdio: "ignore" });
} catch {
  process.exit(0); // not on main yet: still editable
}

console.error(
  `Blocked by immutable-migrations hook: ${relative} is already on main. ` +
    "Create a new migration with `supabase migration new <name>` instead of editing it."
);
process.exit(2);
