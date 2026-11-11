// PreToolUse (Bash): block destructive or history-rewriting git commands.
// Exit code 2 blocks the tool call and feeds stderr back to Claude.
import { readFileSync } from "node:fs";

const input = JSON.parse(readFileSync(0, "utf8"));
const command = input.tool_input?.command ?? "";

const rules = [
  [/\bgit\s+push\b.*(\s--force(-with-lease)?\b|\s-f\b)/, "force push"],
  [/\bgit\s+push\b.*\s(\S+:)?(refs\/heads\/)?main(\s|$)/, "push to main (open a PR instead)"],
  [/\bgit\s+reset\s+.*--hard\b/, "git reset --hard"],
  [/\bgit\s+clean\s+.*-\w*f/, "git clean -f"],
  [/\bgit\s+branch\s+.*-D\b/, "git branch -D"],
  [/\bgit\s+checkout\s+(\S+\s+)?--\s+\.(\s|$)/, "git checkout -- . (discards all changes)"],
  [/\bgit\s+restore\s+(?!.*--staged)(.*\s)?\.(\s|$)/, "git restore . (discards all changes)"],
];

for (const [pattern, label] of rules) {
  if (pattern.test(command)) {
    console.error(`Blocked by guard-git hook: ${label}. Ask the user to run it themselves if it is really needed.`);
    process.exit(2);
  }
}
