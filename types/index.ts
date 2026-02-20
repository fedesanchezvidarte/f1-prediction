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

export interface RacePrediction {
  raceId: number;
  raceName: string;
  round: number;
  status: "pending" | "submitted" | "scored";
  top10: Driver[];
  fastestLap?: Driver;
  polePosition?: Driver;
  fastestPitStop?: Driver;
  pointsEarned?: number;
  maxPoints: number;
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
