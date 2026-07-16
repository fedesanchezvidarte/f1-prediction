/**
 * Privacy / data-protection constants and pure helpers.
 *
 * Framework-agnostic: no I/O, no React, no Next.js. Safe to import from both
 * the web app and (later) the mobile app.
 */

/**
 * Canonical "last updated" date of the privacy policy (ISO 8601).
 * Rendered — localized — on the /privacy page. Bump this whenever the
 * policy wording changes so users can see the revision date.
 */
export const PRIVACY_POLICY_LAST_UPDATED = "2026-07-15";

/**
 * Whether registration is allowed to proceed given the user's privacy-policy
 * consent state. Consent is mandatory (GDPR art. 6 — consent as a legal basis),
 * so account creation is blocked until the user explicitly agrees.
 *
 * Used to gate BOTH the email/password signup form and the Google OAuth button
 * on the web register page.
 */
export function isRegistrationConsentValid(agreedToPrivacyPolicy: boolean): boolean {
  return agreedToPrivacyPolicy === true;
}
