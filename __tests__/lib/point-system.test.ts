/**
 * Tests for lib/point-system.ts — static data integrity checks.
 *
 * Verifies that POINT_SYSTEM has consistent structure and expected sections.
 */
import { POINT_SYSTEM } from "@/lib/point-system";

describe("POINT_SYSTEM", () => {
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

  it("Race Predictions maxPoints is 34", () => {
    const raceSection = POINT_SYSTEM.find((s) => s.title === "Race Predictions")!;
    expect(raceSection.maxPoints).toBe(34);
  });

  it("Sprint Race Predictions maxPoints is 20", () => {
    const sprintSection = POINT_SYSTEM.find((s) => s.title === "Sprint Race Predictions")!;
    expect(sprintSection.maxPoints).toBe(20);
  });

  it("Championship Predictions maxPoints is 92", () => {
    const champSection = POINT_SYSTEM.find((s) => s.title === "Championship Predictions")!;
    expect(champSection.maxPoints).toBe(92);
  });
});
