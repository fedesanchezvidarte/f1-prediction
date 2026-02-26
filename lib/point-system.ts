import type { PointSystemSection } from "@/types";

/**
 * Static point system rules.
 * These are constants that define how scoring works — not fetched from DB.
 * Could be moved to the database in the future.
 */
export const POINT_SYSTEM: PointSystemSection[] = [
  {
    title: "Race Predictions",
    rules: [
      { category: "Top 10 Drivers", description: "1 point per exact match in position", points: 10 },
      { category: "Fastest Lap", description: "Exact match for fastest lap driver", points: 1 },
      { category: "Pole Position", description: "Exact match for pole position driver", points: 1 },
      { category: "Fastest Pit Stop", description: "Exact match for fastest pit stop driver", points: 1 },
      { category: "Perfect Podium", description: "Exact top 3 in correct order", points: 10 },
      { category: "Match Podium", description: "Correct top 3 in any order (if not perfect)", points: 5 },
      { category: "Perfect Top 10", description: "Exact top 10 in correct order", points: 10 },
      { category: "Match Top 10", description: "Correct top 10 in any order (if not perfect)", points: 5 },
    ],
    maxPoints: 42,
  },
  {
    title: "Sprint Race Predictions",
    rules: [
      { category: "Top 8 Drivers", description: "1 point per exact match in position", points: 8 },
      { category: "Fastest Lap", description: "Exact match for fastest lap driver", points: 1 },
      { category: "Pole Position", description: "Exact match for pole position driver", points: 1 },
      { category: "Perfect Podium", description: "Exact top 3 in correct order", points: 5 },
      { category: "Match Podium", description: "Correct top 3 in any order (if not perfect)", points: 2 },
      { category: "Perfect Top 8", description: "Exact top 8 in correct order", points: 5 },
      { category: "Match Top 8", description: "Correct top 8 in any order (if not perfect)", points: 2 },
    ],
    maxPoints: 20,
  },
  {
    title: "Championship Predictions",
    rules: [
      { category: "WDC Winner", description: "Correct World Drivers' Champion", points: 20 },
      { category: "WCC Winner", description: "Correct World Constructors' Champion", points: 20 },
    ],
    maxPoints: 40,
  },
];
