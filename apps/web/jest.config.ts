import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/apps/web/tsconfig.json" }],
  },
  // rootDir is the repo root so coverage can include packages/shared
  rootDir: "../..",
  roots: ["<rootDir>/apps/web/__tests__"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/apps/web/$1",
    "^@f1/shared/(.*)$": "<rootDir>/packages/shared/$1",
  },
  // Ignore lucide-react and other ESM modules that ts-jest can't handle directly
  transformIgnorePatterns: ["/node_modules/(?!lucide-react)"],
  coverageThreshold: {
    // No hard global floor — targets are set per-scope below
    global: {},
    // High bar for pure business logic — these are fully testable in isolation
    // (threshold paths resolve against the cwd, i.e. apps/web)
    "../../packages/shared/lib/": {
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
