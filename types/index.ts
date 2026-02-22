export interface Driver {
  driverNumber: number;
  firstName: string;
  lastName: string;
  nameAcronym: string;
  teamName: string;
  teamColor: string;
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
  polePosition?: Driver;
  fastestPitStop?: Driver;
  pointsEarned?: number;
  maxPoints: number;
}

export interface FullRacePrediction {
  raceId: number;
  userId: string;
  status: PredictionStatus;
  polePosition: Driver | null;
  raceWinner: Driver | null;
  /** P2 through P10 (9 slots, excluding the race winner who is P1) */
  restOfTop10: (Driver | null)[];
  fastestLap: Driver | null;
  fastestPitStop: Driver | null;
  pointsEarned: number | null;
}

export interface SprintPrediction {
  raceId: number;
  userId: string;
  status: PredictionStatus;
  sprintPole: Driver | null;
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
  pointsEarned: number | null;
  isHalfPoints: boolean;
}

export interface RaceResult {
  raceId: number;
  polePosition: Driver;
  raceWinner: Driver;
  top10: Driver[];
  fastestLap: Driver;
  fastestPitStop: Driver;
}

export interface SprintResult {
  raceId: number;
  sprintPole: Driver;
  sprintWinner: Driver;
  top8: Driver[];
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
  predictionsSubmitted: number;
  perfectPodiums: number;
  bestRacePoints: number;
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
