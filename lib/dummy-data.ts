import type {
  Driver,
  Race,
  LeaderboardEntry,
  DetailedLeaderboardEntry,
  UserStats,
  RacePrediction,
  PointSystemSection,
  FullRacePrediction,
  SprintPrediction,
  ChampionPrediction,
  RaceResult,
  SprintResult,
} from "@/types";

export const DRIVERS_2026: Driver[] = [
  // Ordered by 2025 WDC standings
  { driverNumber: 1, firstName: "Lando", lastName: "Norris", nameAcronym: "NOR", teamName: "McLaren", teamColor: "FF8000" },
  { driverNumber: 3, firstName: "Max", lastName: "Verstappen", nameAcronym: "VER", teamName: "Red Bull Racing", teamColor: "3671C6" },
  { driverNumber: 81, firstName: "Oscar", lastName: "Piastri", nameAcronym: "PIA", teamName: "McLaren", teamColor: "FF8000" },
  { driverNumber: 63, firstName: "George", lastName: "Russell", nameAcronym: "RUS", teamName: "Mercedes", teamColor: "27F4D2" },
  { driverNumber: 16, firstName: "Charles", lastName: "Leclerc", nameAcronym: "LEC", teamName: "Ferrari", teamColor: "E8002D" },
  { driverNumber: 44, firstName: "Lewis", lastName: "Hamilton", nameAcronym: "HAM", teamName: "Ferrari", teamColor: "E8002D" },
  { driverNumber: 12, firstName: "Kimi", lastName: "Antonelli", nameAcronym: "ANT", teamName: "Mercedes", teamColor: "27F4D2" },
  { driverNumber: 23, firstName: "Alexander", lastName: "Albon", nameAcronym: "ALB", teamName: "Williams", teamColor: "1868DB" },
  { driverNumber: 55, firstName: "Carlos", lastName: "Sainz", nameAcronym: "SAI", teamName: "Williams", teamColor: "1868DB" },
  { driverNumber: 14, firstName: "Fernando", lastName: "Alonso", nameAcronym: "ALO", teamName: "Aston Martin", teamColor: "229971" },
  { driverNumber: 27, firstName: "Nico", lastName: "Hulkenberg", nameAcronym: "HUL", teamName: "Audi", teamColor: "E0002B" },
  { driverNumber: 6, firstName: "Isack", lastName: "Hadjar", nameAcronym: "HAD", teamName: "Red Bull Racing", teamColor: "3671C6" },
  { driverNumber: 87, firstName: "Oliver", lastName: "Bearman", nameAcronym: "BEA", teamName: "Haas", teamColor: "B6BABD" },
  { driverNumber: 30, firstName: "Liam", lastName: "Lawson", nameAcronym: "LAW", teamName: "Racing Bulls", teamColor: "6692FF" },
  { driverNumber: 31, firstName: "Esteban", lastName: "Ocon", nameAcronym: "OCO", teamName: "Haas", teamColor: "B6BABD" },
  { driverNumber: 18, firstName: "Lance", lastName: "Stroll", nameAcronym: "STR", teamName: "Aston Martin", teamColor: "229971" },
  { driverNumber: 10, firstName: "Pierre", lastName: "Gasly", nameAcronym: "GAS", teamName: "Alpine", teamColor: "0093CC" },
  { driverNumber: 5, firstName: "Gabriel", lastName: "Bortoleto", nameAcronym: "BOR", teamName: "Audi", teamColor: "E0002B" },
  { driverNumber: 43, firstName: "Franco", lastName: "Colapinto", nameAcronym: "COL", teamName: "Alpine", teamColor: "0093CC" },
  { driverNumber: 11, firstName: "Sergio", lastName: "Perez", nameAcronym: "PER", teamName: "Cadillac", teamColor: "1E1E1E" },
  { driverNumber: 77, firstName: "Valtteri", lastName: "Bottas", nameAcronym: "BOT", teamName: "Cadillac", teamColor: "1E1E1E" },
  { driverNumber: 41, firstName: "Arvid", lastName: "Lindblad", nameAcronym: "LIN", teamName: "Racing Bulls", teamColor: "6692FF" },
];

export const RACES_2026: Race[] = [
  // Round 1 & 2: completed (dates in the past)
  { meetingKey: 1280, raceName: "Australian Grand Prix", officialName: "FORMULA 1 ROLEX AUSTRALIAN GRAND PRIX 2026", circuitShortName: "Melbourne", countryName: "Australia", countryCode: "AUS", location: "Albert Park", dateStart: "2026-02-07T03:30:00+00:00", dateEnd: "2026-02-09T06:00:00+00:00", round: 1, hasSprint: false },
  { meetingKey: 1281, raceName: "Chinese Grand Prix", officialName: "FORMULA 1 HEINEKEN CHINESE GRAND PRIX 2026", circuitShortName: "Shanghai", countryName: "China", countryCode: "CHN", location: "Shanghai", dateStart: "2026-02-14T04:30:00+00:00", dateEnd: "2026-02-16T07:00:00+00:00", round: 2, hasSprint: true },
  // Round 3: live right now (straddles today Feb 21, 2026)
  { meetingKey: 1282, raceName: "Japanese Grand Prix", officialName: "FORMULA 1 LENOVO JAPANESE GRAND PRIX 2026", circuitShortName: "Suzuka", countryName: "Japan", countryCode: "JPN", location: "Suzuka", dateStart: "2026-02-20T03:30:00+00:00", dateEnd: "2026-02-22T06:00:00+00:00", round: 3, hasSprint: false },
  // Rounds 4 & 5: upcoming
  { meetingKey: 1283, raceName: "Bahrain Grand Prix", officialName: "FORMULA 1 GULF AIR BAHRAIN GRAND PRIX 2026", circuitShortName: "Sakhir", countryName: "Bahrain", countryCode: "BHR", location: "Sakhir", dateStart: "2026-03-06T12:30:00+00:00", dateEnd: "2026-03-08T15:00:00+00:00", round: 4, hasSprint: false },
  { meetingKey: 1284, raceName: "Saudi Arabian Grand Prix", officialName: "FORMULA 1 STC SAUDI ARABIAN GRAND PRIX 2026", circuitShortName: "Jeddah", countryName: "Saudi Arabia", countryCode: "SAU", location: "Jeddah", dateStart: "2026-03-13T14:30:00+00:00", dateEnd: "2026-03-15T17:00:00+00:00", round: 5, hasSprint: false },
];

export const DUMMY_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, userId: "u1", displayName: "Poncefifa", totalPoints: 156, predictionsCount: 5 },
  { rank: 2, userId: "u2", displayName: "Joven Agustín", totalPoints: 142, predictionsCount: 5 },
  { rank: 3, userId: "u3", displayName: "Guillotina", totalPoints: 138, predictionsCount: 5 },
  { rank: 4, userId: "u4", displayName: "ORMA_Cachi", totalPoints: 131, predictionsCount: 4 },
  { rank: 5, userId: "u5", displayName: "MAYCAM_EliotGT", totalPoints: 127, predictionsCount: 5 },
  { rank: 6, userId: "u6", displayName: "URT_Renzo", totalPoints: 119, predictionsCount: 5 },
  { rank: 7, userId: "u7", displayName: "Playfedex", totalPoints: 112, predictionsCount: 4 },
  { rank: 8, userId: "u8", displayName: "Sabueso_veloz", totalPoints: 105, predictionsCount: 5 },
  { rank: 9, userId: "u9", displayName: "NahueQ22", totalPoints: 98, predictionsCount: 5 },
  { rank: 10, userId: "u10", displayName: "Manco", totalPoints: 91, predictionsCount: 4 },
];

const DETAILED_USERS: Array<{ userId: string; displayName: string; r: (number | null)[] }> = [
  { userId: "u1",  displayName: "Poncefifa",       r: [35, 28, 32, 31, 30] },
  { userId: "u2",  displayName: "Joven Agustín",   r: [30, 32, 26, 29, 25] },
  { userId: "u3",  displayName: "Guillotina",      r: [28, 25, 30, 27, 28] },
  { userId: "u4",  displayName: "ORMA_Cachi",      r: [32, 27, null, 38, 34] },
  { userId: "u5",  displayName: "MAYCAM_EliotGT",  r: [24, 26, 28, 25, 24] },
  { userId: "u6",  displayName: "URT_Renzo",       r: [22, 24, 25, 24, 24] },
  { userId: "u7",  displayName: "Playfedex",       r: [26, null, 30, 28, 28] },
  { userId: "u8",  displayName: "Sabueso_veloz",   r: [20, 22, 21, 22, 20] },
  { userId: "u9",  displayName: "NahueQ22",        r: [18, 20, 22, 19, 19] },
  { userId: "u10", displayName: "Max773",          r: [22, 24, null, 22, 23] },
  { userId: "u11", displayName: "Tetto",           r: [16, 18, 20, 16, 18] },
  { userId: "u12", displayName: "Bonica",          r: [20, 15, 18, 14, 17] },
  { userId: "u13", displayName: "Joystrikker",     r: [14, 16, 17, 18, 16] },
  { userId: "u14", displayName: "DeLaCuchilla",    r: [18, 14, 15, 12, 19] },
  { userId: "u15", displayName: "Luca_F1",         r: [12, 18, 14, 16, 14] },
  { userId: "u16", displayName: "Pole_Sitter",     r: [16, 12, 16, 10, 15] },
  { userId: "u17", displayName: "DRS_Enabled",     r: [10, 14, 12, 15, 12] },
  { userId: "u18", displayName: "BoxBox_Now",      r: [14, 10, 10, 12, 14] },
  { userId: "u19", displayName: "Grainer",         r: [8, 12, 14, 11, 10] },
  { userId: "u20", displayName: "PitWall_Pro",     r: [12, 8, 8, 14, 8] },
  { userId: "u21", displayName: "Apex_Legend",     r: [10, 10, 6, 8, 12] },
  { userId: "u22", displayName: "SC_Delta",        r: [6, 8, 12, 6, 10] },
  { userId: "u23", displayName: "Rev_Limiter",     r: [8, 6, 4, 10, 8] },
  { userId: "u24", displayName: "Rookie_Pace",     r: [4, 4, 8, 4, 6] },
];

export const DETAILED_LEADERBOARD: DetailedLeaderboardEntry[] = DETAILED_USERS
  .map((u) => {
    const raceKeys = RACES_2026.map((race) => race.meetingKey);
    const racePoints: Record<number, number | null> = {};
    raceKeys.forEach((key, i) => {
      racePoints[key] = u.r[i] ?? null;
    });
    const totalPoints = u.r.reduce((sum: number, p) => sum + (p ?? 0), 0);
    const predictionsCount = u.r.filter((p) => p !== null).length;
    return {
      userId: u.userId,
      displayName: u.displayName,
      totalPoints,
      predictionsCount,
      racePoints,
      rank: 0,
    };
  })
  .sort((a, b) => b.totalPoints - a.totalPoints)
  .map((entry, i) => ({ ...entry, rank: i + 1 }));

export const DUMMY_USER_STATS: UserStats = {
  totalPoints: 70,
  rank: 3,
  totalUsers: 24,
  predictionsSubmitted: 3,
  perfectPodiums: 1,
  bestRacePoints: 33,
};

export const DUMMY_PREDICTIONS: RacePrediction[] = [
  {
    raceId: 1280,
    raceName: "Australian Grand Prix",
    round: 1,
    status: "pending",
    top10: [],
    maxPoints: 42,
  },
  {
    raceId: 1281,
    raceName: "Chinese Grand Prix",
    round: 2,
    status: "pending",
    top10: [],
    maxPoints: 42,
  },
];

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

export const TEAMS_2026 = [
  // Ordered by 2025 WCC standings + new entry
  "McLaren",
  "Mercedes",
  "Red Bull Racing",
  "Ferrari",
  "Williams",
  "Racing Bulls",
  "Aston Martin",
  "Haas",
  "Audi",
  "Alpine",
  "Cadillac",
];

const d = (acronym: string) =>
  DRIVERS_2026.find((dr) => dr.nameAcronym === acronym)!;

export const DUMMY_RACE_RESULTS: Record<number, RaceResult> = {
  // Round 1: various result types — some exact, some close (driver in top10 but wrong position), some wrong
  1280: {
    raceId: 1280,
    polePosition: d("VER"),
    raceWinner: d("VER"),
    top10: [d("VER"), d("NOR"), d("LEC"), d("PIA"), d("HAM"), d("RUS"), d("ALO"), d("SAI"), d("PER"), d("ALB")],
    fastestLap: d("NOR"),
    fastestPitStop: d("RUS"),
  },
  // Round 2: user predicted everything perfectly
  1281: {
    raceId: 1281,
    polePosition: d("NOR"),
    raceWinner: d("NOR"),
    top10: [d("NOR"), d("VER"), d("LEC"), d("PIA"), d("RUS"), d("HAM"), d("SAI"), d("ALO"), d("PER"), d("GAS")],
    fastestLap: d("NOR"),
    fastestPitStop: d("PIA"),
  },
};

export const DUMMY_SPRINT_RESULTS: Record<number, SprintResult> = {
  // Round 2: user predicted sprint perfectly
  1281: {
    raceId: 1281,
    sprintPole: d("NOR"),
    sprintWinner: d("NOR"),
    top8: [d("NOR"), d("VER"), d("LEC"), d("PIA"), d("HAM"), d("RUS"), d("SAI"), d("ALO")],
    fastestLap: d("VER"),
  },
};

export const DUMMY_FULL_PREDICTIONS: FullRacePrediction[] = [
  // Round 1 (Australia): completed & scored — various result types (some exact, some close, some wrong)
  // Pole ✓, P1 ✓, P4-P7/P10 exact ✓, P2/P3 swapped (in top10, wrong pos), P8/P9 swapped, fastest lap ✗, fastest pit ✗, match podium, match top10
  {
    raceId: 1280,
    userId: "current",
    status: "scored",
    polePosition: d("VER"),
    raceWinner: d("VER"),
    restOfTop10: [d("LEC"), d("NOR"), d("PIA"), d("HAM"), d("RUS"), d("ALO"), d("PER"), d("SAI"), d("ALB")],
    fastestLap: d("VER"),
    fastestPitStop: d("HAM"),
    pointsEarned: 17,
  },
  // Round 2 (China): completed & scored — ALL predictions correct (perfect score)
  // Perfect podium, perfect top10, pole ✓, fastest lap ✓, fastest pit ✓
  {
    raceId: 1281,
    userId: "current",
    status: "scored",
    polePosition: d("NOR"),
    raceWinner: d("NOR"),
    restOfTop10: [d("VER"), d("LEC"), d("PIA"), d("RUS"), d("HAM"), d("SAI"), d("ALO"), d("PER"), d("GAS")],
    fastestLap: d("NOR"),
    fastestPitStop: d("PIA"),
    pointsEarned: 33,
  },
  // Round 3 (Japan): live event — form already submitted, awaiting results
  {
    raceId: 1282,
    userId: "current",
    status: "submitted",
    polePosition: d("VER"),
    raceWinner: d("VER"),
    restOfTop10: [d("NOR"), d("LEC"), d("PIA"), d("HAM"), d("RUS"), d("SAI"), d("ALO"), d("ANT"), d("ALB")],
    fastestLap: d("NOR"),
    fastestPitStop: d("RUS"),
    pointsEarned: null,
  },
  // Round 4 (Bahrain): upcoming — no prediction yet
  {
    raceId: 1283,
    userId: "current",
    status: "pending",
    polePosition: null,
    raceWinner: null,
    restOfTop10: [null, null, null, null, null, null, null, null, null],
    fastestLap: null,
    fastestPitStop: null,
    pointsEarned: null,
  },
  // Round 5 (Saudi Arabia): upcoming — no prediction yet
  {
    raceId: 1284,
    userId: "current",
    status: "pending",
    polePosition: null,
    raceWinner: null,
    restOfTop10: [null, null, null, null, null, null, null, null, null],
    fastestLap: null,
    fastestPitStop: null,
    pointsEarned: null,
  },
];

export const DUMMY_SPRINT_PREDICTIONS: SprintPrediction[] = [
  // Round 2 (China): scored — ALL sprint predictions correct (perfect score: 20pts)
  // Perfect podium, perfect top8, sprint pole ✓, fastest lap ✓
  {
    raceId: 1281,
    userId: "current",
    status: "scored",
    sprintPole: d("NOR"),
    sprintWinner: d("NOR"),
    restOfTop8: [d("VER"), d("LEC"), d("PIA"), d("HAM"), d("RUS"), d("SAI"), d("ALO")],
    fastestLap: d("VER"),
    pointsEarned: 20,
  },
];

export const DUMMY_CHAMPION_PREDICTION: ChampionPrediction = {
  userId: "current",
  status: "submitted",
  wdcWinner: d("VER"),
  wccWinner: "McLaren",
  pointsEarned: null,
  isHalfPoints: false,
};

export function getNextRace(): Race | undefined {
  const now = new Date();
  return RACES_2026.find((race) => new Date(race.dateEnd) > now);
}

export function getRaceStatus(race: Race): "upcoming" | "live" | "completed" {
  const now = new Date();
  const start = new Date(race.dateStart);
  const end = new Date(race.dateEnd);
  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "live";
  return "completed";
}
