// `prepare` entry point: install git hooks locally, skip in CI / Vercel / production installs
// (where husky, a root devDependency, may not be installed).
if (process.env.CI || process.env.VERCEL || process.env.NODE_ENV === "production") process.exit(0);

try {
  const husky = (await import("husky")).default;
  console.log(husky());
} catch {
  // husky not installed (dev dependencies omitted): nothing to do
}
