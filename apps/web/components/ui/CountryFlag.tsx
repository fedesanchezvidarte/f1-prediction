"use client";

import type { ComponentType, SVGProps } from "react";
import * as Flags from "country-flag-icons/react/3x2";
import { hasFlag } from "country-flag-icons";

/**
 * Maps F1 alpha-3 (or custom) country codes to ISO 3166-1 alpha-2.
 * Alpha-2 is what `country-flag-icons` expects.
 */
const ALPHA3_TO_ALPHA2: Record<string, string> = {
  AUS: "AU", CHN: "CN", JPN: "JP", BHR: "BH", SAU: "SA", USA: "US",
  MIA: "US", LVG: "US", ESP: "ES", MON: "MC", MCO: "MC", CAN: "CA", AUT: "AT",
  GBR: "GB", BEL: "BE", HUN: "HU", NLD: "NL", ITA: "IT", AZE: "AZ",
  SGP: "SG", MEX: "MX", BRA: "BR", QAT: "QA", UAE: "AE", ABU: "AE", ARE: "AE",
  POR: "PT", TUR: "TR", RUS: "RU", IND: "IN", KOR: "KR", MYS: "MY",
  ZAF: "ZA", ARG: "AR", DEU: "DE", FRA: "FR", SWE: "SE",
};

interface CountryFlagProps {
  /** F1 alpha-3 country code (e.g. "AUS", "GBR") or ISO alpha-2 (e.g. "AU", "GB") */
  countryCode: string;
  className?: string;
}

export function CountryFlag({ countryCode, className = "inline-block h-3 w-4 rounded-[1px]" }: CountryFlagProps) {
  const upper = countryCode.toUpperCase();

  // Try alpha-3 → alpha-2 mapping first, then treat as alpha-2 directly
  const alpha2 = ALPHA3_TO_ALPHA2[upper] ?? upper;

  if (!hasFlag(alpha2)) {
    return <span className={className} aria-hidden>🏁</span>;
  }

  // `country-flag-icons` types each flag as `(props: Props) => JSX.Element`,
  // where `Props` is its own intersection of React's HTML and SVG attribute
  // interfaces. That resolved inconsistently between a local build and Vercel's
  // (Vercel rejected a prop the local toolchain accepted), so pin the component
  // to React's standard SVG props instead of depending on the package's shape.
  const FlagComponent = Flags[alpha2 as keyof typeof Flags] as
    | ComponentType<SVGProps<SVGSVGElement>>
    | undefined;

  if (!FlagComponent) {
    return <span className={className} aria-hidden>🏁</span>;
  }

  // Decorative: every call site renders the race/country name immediately
  // beside the flag, so naming it here would just repeat that. This also drops
  // the old `title` attribute, which is not a reliable accessible name on an
  // <svg> anyway — SVG needs a <title> child element.
  return <FlagComponent className={className} aria-hidden focusable="false" />;
}
