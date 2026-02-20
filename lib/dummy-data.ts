import type {
  Driver,
  Race,
  LeaderboardEntry,
  UserStats,
  RacePrediction,
  PointSystemSection,
} from "@/types";

export const DRIVERS_2026: Driver[] = [
  { driverNumber: 1, firstName: "Max", lastName: "Verstappen", nameAcronym: "VER", teamName: "Red Bull Racing", teamColor: "3671C6" },
  { driverNumber: 4, firstName: "Lando", lastName: "Norris", nameAcronym: "NOR", teamName: "McLaren", teamColor: "FF8000" },
  { driverNumber: 16, firstName: "Charles", lastName: "Leclerc", nameAcronym: "LEC", teamName: "Ferrari", teamColor: "E8002D" },
  { driverNumber: 81, firstName: "Oscar", lastName: "Piastri", nameAcronym: "PIA", teamName: "McLaren", teamColor: "FF8000" },
  { driverNumber: 44, firstName: "Lewis", lastName: "Hamilton", nameAcronym: "HAM", teamName: "Ferrari", teamColor: "E8002D" },
  { driverNumber: 63, firstName: "George", lastName: "Russell", nameAcronym: "RUS", teamName: "Mercedes", teamColor: "27F4D2" },
  { driverNumber: 14, firstName: "Fernando", lastName: "Alonso", nameAcronym: "ALO", teamName: "Aston Martin", teamColor: "229971" },
  { driverNumber: 55, firstName: "Carlos", lastName: "Sainz", nameAcronym: "SAI", teamName: "Williams", teamColor: "1868DB" },
  { driverNumber: 11, firstName: "Sergio", lastName: "Perez", nameAcronym: "PER", teamName: "Red Bull Racing", teamColor: "3671C6" },
  { driverNumber: 23, firstName: "Alexander", lastName: "Albon", nameAcronym: "ALB", teamName: "Williams", teamColor: "1868DB" },
  { driverNumber: 18, firstName: "Lance", lastName: "Stroll", nameAcronym: "STR", teamName: "Aston Martin", teamColor: "229971" },
  { driverNumber: 10, firstName: "Pierre", lastName: "Gasly", nameAcronym: "GAS", teamName: "Alpine", teamColor: "0093CC" },
  { driverNumber: 31, firstName: "Esteban", lastName: "Ocon", nameAcronym: "OCO", teamName: "Haas", teamColor: "B6BABD" },
  { driverNumber: 22, firstName: "Yuki", lastName: "Tsunoda", nameAcronym: "TSU", teamName: "Racing Bulls", teamColor: "6692FF" },
  { driverNumber: 27, firstName: "Nico", lastName: "Hulkenberg", nameAcronym: "HUL", teamName: "Sauber", teamColor: "52E252" },
  { driverNumber: 87, firstName: "Oliver", lastName: "Bearman", nameAcronym: "BEA", teamName: "Haas", teamColor: "B6BABD" },
  { driverNumber: 12, firstName: "Andrea", lastName: "Kimi Antonelli", nameAcronym: "ANT", teamName: "Mercedes", teamColor: "27F4D2" },
  { driverNumber: 43, firstName: "Franco", lastName: "Colapinto", nameAcronym: "COL", teamName: "Alpine", teamColor: "0093CC" },
  { driverNumber: 30, firstName: "Liam", lastName: "Lawson", nameAcronym: "LAW", teamName: "Racing Bulls", teamColor: "6692FF" },
  { driverNumber: 5, firstName: "Gabriel", lastName: "Bortoleto", nameAcronym: "BOR", teamName: "Sauber", teamColor: "52E252" },
];

export const RACES_2026: Race[] = [
  { meetingKey: 1280, raceName: "Australian Grand Prix", officialName: "FORMULA 1 ROLEX AUSTRALIAN GRAND PRIX 2026", circuitShortName: "Melbourne", countryName: "Australia", countryCode: "AUS", location: "Albert Park", dateStart: "2026-03-13T03:30:00+00:00", dateEnd: "2026-03-15T06:00:00+00:00", round: 1, hasSprint: false },
  { meetingKey: 1281, raceName: "Chinese Grand Prix", officialName: "FORMULA 1 HEINEKEN CHINESE GRAND PRIX 2026", circuitShortName: "Shanghai", countryName: "China", countryCode: "CHN", location: "Shanghai", dateStart: "2026-03-27T04:30:00+00:00", dateEnd: "2026-03-29T07:00:00+00:00", round: 2, hasSprint: true },
  { meetingKey: 1282, raceName: "Japanese Grand Prix", officialName: "FORMULA 1 LENOVO JAPANESE GRAND PRIX 2026", circuitShortName: "Suzuka", countryName: "Japan", countryCode: "JPN", location: "Suzuka", dateStart: "2026-04-03T03:30:00+00:00", dateEnd: "2026-04-05T06:00:00+00:00", round: 3, hasSprint: false },
  { meetingKey: 1283, raceName: "Bahrain Grand Prix", officialName: "FORMULA 1 GULF AIR BAHRAIN GRAND PRIX 2026", circuitShortName: "Sakhir", countryName: "Bahrain", countryCode: "BHR", location: "Sakhir", dateStart: "2026-04-10T12:30:00+00:00", dateEnd: "2026-04-12T15:00:00+00:00", round: 4, hasSprint: false },
  { meetingKey: 1284, raceName: "Saudi Arabian Grand Prix", officialName: "FORMULA 1 STC SAUDI ARABIAN GRAND PRIX 2026", circuitShortName: "Jeddah", countryName: "Saudi Arabia", countryCode: "SAU", location: "Jeddah", dateStart: "2026-04-17T14:30:00+00:00", dateEnd: "2026-04-19T17:00:00+00:00", round: 5, hasSprint: false },
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

export const DUMMY_USER_STATS: UserStats = {
  totalPoints: 127,
  rank: 5,
  totalUsers: 24,
  predictionsSubmitted: 5,
  perfectPodiums: 1,
  bestRacePoints: 32,
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
