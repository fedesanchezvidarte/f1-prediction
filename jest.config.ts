import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/__tests__"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  // Ignore lucide-react and other ESM modules that ts-jest can't handle directly
  transformIgnorePatterns: ["/node_modules/(?!lucide-react)"],
};

export default config;
