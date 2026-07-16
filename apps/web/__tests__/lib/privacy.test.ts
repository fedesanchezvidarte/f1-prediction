import {
  PRIVACY_POLICY_LAST_UPDATED,
  isRegistrationConsentValid,
} from "@f1/shared/lib/privacy";

describe("privacy", () => {
  describe("isRegistrationConsentValid", () => {
    it("blocks registration when the privacy consent box is unchecked", () => {
      expect(isRegistrationConsentValid(false)).toBe(false);
    });

    it("allows registration when the privacy consent box is checked", () => {
      expect(isRegistrationConsentValid(true)).toBe(true);
    });
  });

  describe("PRIVACY_POLICY_LAST_UPDATED", () => {
    it("is a valid ISO date string", () => {
      expect(PRIVACY_POLICY_LAST_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(PRIVACY_POLICY_LAST_UPDATED))).toBe(false);
    });
  });
});
