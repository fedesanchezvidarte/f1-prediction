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
  coverageThreshold: {
    // No hard global floor — targets are set per-scope below
    global: {},
    // High bar for pure business logic — these are fully testable in isolation
    "lib/": {
      lines: 85,
      branches: 75,
      functions: 90,
      statements: 85,
    },
    // Lower bar for API route handlers — some paths require integration context
    "app/api/": {
      lines: 65,
      branches: 50,
      functions: 80,
      statements: 63,
    },
  },
};

export default config;
