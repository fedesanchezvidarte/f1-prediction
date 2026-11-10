// PostToolUse (Edit|Write|MultiEdit): lint the edited file and report errors back to Claude.
// Warnings pass; only ESLint errors (exit code 1) are fed back via exit code 2.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const input = JSON.parse(readFileSync(0, "utf8"));
const filePath = input.tool_input?.file_path;
if (!filePath || !/\.(ts|tsx|js|mjs)$/.test(filePath)) process.exit(0);

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input.cwd;
const relative = path.relative(projectDir, filePath).split(path.sep).join("/");
const app = relative.match(/^apps\/(web|mobile)\//)?.[1];
if (!app) process.exit(0);

const appDir = path.join(projectDir, "apps", app);
const eslintBin = path.join(projectDir, "node_modules", "eslint", "bin", "eslint.js");
const result = spawnSync(process.execPath, [eslintBin, "--quiet", path.relative(appDir, filePath)], {
  cwd: appDir,
  encoding: "utf8",
});

if (result.status === 1) {
  console.error(`ESLint errors in ${relative}:\n${result.stdout}${result.stderr}`);
  process.exit(2);
}
