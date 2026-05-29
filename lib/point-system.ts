import type { PointSystemSection } from "@/types";
import type { Messages } from "@/messages/en";

type PointSystemText = Messages["pointSystem"]["sections"];

/**
 * Builds the display-ready point-system sections.
 *
 * Point values and section maxima are the source of truth here; the labels,
 * descriptions and worked-example tooltips come from the i18n layer
 * (`t.pointSystem.sections`), so the modal renders fully translated.
 * Could be moved to the database in the future.
 */
export function buildPointSystem(s: PointSystemText): PointSystemSection[] {
  return [
    {
      title: s.race.title,
      maxPoints: 92,
      rules: [
        { category: s.race.top10.category, description: s.race.top10.description, points: 3, example: s.race.top10.example },
        { category: s.race.qualifyingTop3.category, description: s.race.qualifyingTop3.description, points: 3, example: s.race.qualifyingTop3.example },
        { category: s.race.fastestLap.category, description: s.race.fastestLap.description, points: 1 },
        { category: s.race.fastestPitStop.category, description: s.race.fastestPitStop.description, points: 1 },
        { category: s.race.driverOfTheDay.category, description: s.race.driverOfTheDay.description, points: 1 },
        { category: s.race.perfectPodium.category, description: s.race.perfectPodium.description, points: 10, example: s.race.perfectPodium.example },
        { category: s.race.matchPodium.category, description: s.race.matchPodium.description, points: 5, example: s.race.matchPodium.example },
        { category: s.race.perfectTop10.category, description: s.race.perfectTop10.description, points: 30, example: s.race.perfectTop10.example },
        { category: s.race.matchTop10.category, description: s.race.matchTop10.description, points: 15, example: s.race.matchTop10.example },
        { category: s.race.perfectQualifying.category, description: s.race.perfectQualifying.description, points: 10, example: s.race.perfectQualifying.example },
        { category: s.race.matchQualifying.category, description: s.race.matchQualifying.description, points: 5, example: s.race.matchQualifying.example },
      ],
    },
    {
      title: s.sprint.title,
      maxPoints: 78,
      rules: [
        { category: s.sprint.top8.category, description: s.sprint.top8.description, points: 3, example: s.sprint.top8.example },
        { category: s.sprint.qualifyingTop3.category, description: s.sprint.qualifyingTop3.description, points: 3, example: s.sprint.qualifyingTop3.example },
        { category: s.sprint.fastestLap.category, description: s.sprint.fastestLap.description, points: 1 },
        { category: s.sprint.perfectPodium.category, description: s.sprint.perfectPodium.description, points: 10, example: s.sprint.perfectPodium.example },
        { category: s.sprint.matchPodium.category, description: s.sprint.matchPodium.description, points: 5, example: s.sprint.matchPodium.example },
        { category: s.sprint.perfectTop8.category, description: s.sprint.perfectTop8.description, points: 24, example: s.sprint.perfectTop8.example },
        { category: s.sprint.matchTop8.category, description: s.sprint.matchTop8.description, points: 12, example: s.sprint.matchTop8.example },
        { category: s.sprint.perfectQualifying.category, description: s.sprint.perfectQualifying.description, points: 10, example: s.sprint.perfectQualifying.example },
        { category: s.sprint.matchQualifying.category, description: s.sprint.matchQualifying.description, points: 5, example: s.sprint.matchQualifying.example },
      ],
    },
    {
      title: s.championship.title,
      maxPoints: 92,
      rules: [
        { category: s.championship.wdc.category, description: s.championship.wdc.description, points: 20 },
        { category: s.championship.wcc.category, description: s.championship.wcc.description, points: 20 },
        { category: s.championship.mostDnfs.category, description: s.championship.mostDnfs.description, points: 10 },
        { category: s.championship.mostPodiums.category, description: s.championship.mostPodiums.description, points: 10 },
        { category: s.championship.mostWins.category, description: s.championship.mostWins.description, points: 10 },
        { category: s.championship.teamBestDriver.category, description: s.championship.teamBestDriver.description, points: 2 },
      ],
    },
  ];
}
