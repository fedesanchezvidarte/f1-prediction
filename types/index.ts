export interface Driver {
  driverNumber: number;
  firstName: string;
  lastName: string;
  nameAcronym: string;
  teamName: string;
  teamColor: string;
  teamId?: number;
  headshotUrl?: string;
}

export interface Race {
  meetingKey: number;
  raceName: string;
  officialName: string;
  circuitShortName: string;
  countryName: string;
  countryCode: string;
  location: string;
  dateStart: string;
  dateEnd: string;
  sprintDateEnd: string | null;
  round: number;
  hasSprint: boolean;
}

export type RaceStatus = "upcoming" | "live" | "completed";

export type PredictionStatus = "pending" | "submitted" | "scored";

export interface RacePrediction {
  raceId: number;
  raceName: string;
  round: number;
  status: PredictionStatus;
  top10: Driver[];
  fastestLap?: Driver;
  /** Qualifying top-3 prediction [Q1, Q2, Q3]. Q1 is the legacy pole. */
  qualifyingTop3?: (Driver | null)[];
  fastestPitStop?: Driver;
  pointsEarned?: number;
  maxPoints: number;
}

export interface FullRacePrediction {
  raceId: number;
  userId: string;
  status: PredictionStatus;
  /** Qualifying top-3 prediction [Q1, Q2, Q3]. Q1 is the legacy pole. */
  qualifyingTop3: (Driver | null)[];
  raceWinner: Driver | null;
  /** P2 through P10 (9 slots, excluding the race winner who is P1) */
  restOfTop10: (Driver | null)[];
  fastestLap: Driver | null;
  fastestPitStop: Driver | null;
  driverOfTheDay: Driver | null;
  pointsEarned: number | null;
}

export interface SprintPrediction {
  raceId: number;
  userId: string;
  status: PredictionStatus;
  /** Sprint qualifying top-3 prediction [Q1, Q2, Q3]. Q1 is the legacy sprint pole. */
  qualifyingTop3: (Driver | null)[];
  sprintWinner: Driver | null;
  /** P2 through P8 (7 slots, excluding the sprint winner who is P1) */
  restOfTop8: (Driver | null)[];
  fastestLap: Driver | null;
  pointsEarned: number | null;
}

export interface ChampionPrediction {
  userId: string;
  status: PredictionStatus;
  wdcWinner: Driver | null;
  wccWinner: string | null;
  mostDnfsDriver: Driver | null;
  mostPodiumsDriver: Driver | null;
  mostWinsDriver: Driver | null;
  pointsEarned: number | null;
  /** Per-field points earned. Each value is 0 until the award is scored. */
  wdcPoints: number;
  wccPoints: number;
  mostDnfsPoints: number;
  mostPodiumsPoints: number;
  mostWinsPoints: number;
  isHalfPoints: boolean;
}

export interface TeamBestDriverPrediction {
  teamId: number;
  teamName: string;
  teamColor: string;
  driverId: number | null;
  driverNumber: number | null;
  isHalfPoints: boolean;
  status: PredictionStatus;
  pointsEarned: number;
}

export interface SeasonAwardType {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  subjectType: "driver" | "team";
  scopeTeamId: number | null;
  pointsValue: number;
  sortOrder: number;
}

export interface SeasonAwardPrediction {
  id: string;
  awardTypeId: number;
  slug: string;
  name: string;
  subjectType: "driver" | "team";
  scopeTeamId: number | null;
  pointsValue: number;
  driverId: number | null;
  teamId: number | null;
  isHalfPoints: boolean;
  status: PredictionStatus;
  pointsEarned: number;
}

export interface TeamWithDrivers {
  id: number;
  name: string;
  color: string;
  drivers: { id: number; driverNumber: number; firstName: string; lastName: string; nameAcronym: string }[];
}

export interface RaceResult {
  raceId: number;
  /** Qualifying top-3 result [Q1, Q2, Q3]. Q1 is the legacy pole. */
  qualifyingTop3: Driver[];
  /** Driver who qualified Q4 — boundary for ±1 proximity on the Q3 prediction. */
  qualifyingP4?: Driver | null;
  raceWinner: Driver;
  top10: Driver[];
  /** Driver who finished P11 — boundary for ±1 proximity on the P10 prediction. */
  p11?: Driver | null;
  fastestLap: Driver;
  fastestPitStop?: Driver;
  driverOfTheDay?: Driver;
  dnfDriverIds?: number[];
}

export interface SprintResult {
  raceId: number;
  /** Sprint qualifying top-3 result [Q1, Q2, Q3]. Q1 is the legacy sprint pole. */
  qualifyingTop3: Driver[];
  /** Driver who qualified Q4 — boundary for ±1 proximity on the Q3 prediction. */
  qualifyingP4?: Driver | null;
  sprintWinner: Driver;
  top8: Driver[];
  /** Driver who finished P9 — boundary for ±1 proximity on the P8 prediction. */
  p9?: Driver | null;
  fastestLap: Driver;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  totalPoints: number;
  predictionsCount: number;
}

export interface UserStats {
  totalPoints: number;
  rank: number;
  totalUsers: number;
}

export interface DetailedLeaderboardEntry extends LeaderboardEntry {
  racePoints: Record<number, number | null>;
}

export interface Profile {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  countryCode: string | null;
  createdAt: string;
}

export interface PointSystemRule {
  category: string;
  description: string;
  points: number;
}

export interface PointSystemSection {
  title: string;
  rules: PointSystemRule[];
  maxPoints: number;
}

export type AchievementCategory = "predictions" | "accuracy" | "milestones" | "special";

export interface Achievement {
  id: number;
  slug: string;
  name: string;
  description: string;
  iconUrl: string | null;
  category: AchievementCategory;
  threshold: number | null;
  createdAt: string;
}

export interface UserAchievement {
  id: number;
  achievementId: number;
  earnedAt: string;
  achievement: Achievement;
}

export interface DriverStanding {
  rank: number;
  driverId: number;
  driver: Driver;
  points: number;
  wins: number;
  podiums: number;
  /** Per-position finish counts for race results, used for countback tie-breaking. Index 0 = P1 count, index 1 = P2 count, etc. */
  raceFinishCounts: number[];
}

export interface ConstructorStanding {
  rank: number;
  teamId: number;
  teamName: string;
  teamColor: string;
  points: number;
  wins: number;
  podiums: number;
  /** Per-position finish counts summed across both team drivers (race results only). Used for F1 countback tie-breaking. */
  raceFinishCounts: number[];
}

export interface StatLeader {
  driverId: number;
  driver: Driver;
  count: number;
}

export interface ChampionshipStandings {
  wdc: DriverStanding[];
  wcc: ConstructorStanding[];
  stats: {
    mostWins: StatLeader | null;
    mostPodiums: StatLeader | null;
    mostDnfs: StatLeader | null;
  };
}
