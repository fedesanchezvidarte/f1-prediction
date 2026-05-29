/**
 * Tests for lib/point-system.ts — localized point-system builder.
 *
 * Verifies that buildPointSystem produces consistent structure and the
 * expected sections/maxima when given the English locale strings.
 */
import { buildPointSystem } from "@/lib/point-system";
import en from "@/messages/en";

const POINT_SYSTEM = buildPointSystem(en.pointSystem.sections);

describe("buildPointSystem", () => {
  it("has exactly 3 sections", () => {
    expect(POINT_SYSTEM).toHaveLength(3);
  });

  it("contains Race Predictions, Sprint Race Predictions, and Championship Predictions", () => {
    const titles = POINT_SYSTEM.map((s) => s.title);
    expect(titles).toContain("Race Predictions");
    expect(titles).toContain("Sprint Race Predictions");
    expect(titles).toContain("Championship Predictions");
  });

  it.each(POINT_SYSTEM.map((s) => [s.title, s]))("section '%s' has all rules with non-empty category, description, and points > 0", (_title, section) => {
    for (const rule of section.rules) {
      expect(rule.category).toBeTruthy();
      expect(rule.description).toBeTruthy();
      expect(rule.points).toBeGreaterThan(0);
    }
  });

  it("each section has a positive maxPoints value", () => {
    for (const section of POINT_SYSTEM) {
      expect(section.maxPoints).toBeGreaterThan(0);
    }
  });

  it("Race Predictions maxPoints is 92", () => {
    const raceSection = POINT_SYSTEM.find((s) => s.title === "Race Predictions")!;
    expect(raceSection.maxPoints).toBe(92);
  });

  it("Sprint Race Predictions maxPoints is 78", () => {
    const sprintSection = POINT_SYSTEM.find((s) => s.title === "Sprint Race Predictions")!;
    expect(sprintSection.maxPoints).toBe(78);
  });

  it("Championship Predictions maxPoints is 92", () => {
    const champSection = POINT_SYSTEM.find((s) => s.title === "Championship Predictions")!;
    expect(champSection.maxPoints).toBe(92);
  });
});
