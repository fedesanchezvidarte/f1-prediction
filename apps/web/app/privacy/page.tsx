"use client";

import Link from "next/link";
import { PRIVACY_POLICY_LAST_UPDATED } from "@f1/shared/lib/privacy";
import { F1Logo } from "@/components/F1Logo";
import { AuthFooter } from "@/components/AuthFooter";
import { AuthLanguageSwitcher } from "@/components/auth/AuthLanguageSwitcher";
import { useLanguage } from "@/components/providers/LanguageProvider";

export default function PrivacyPage() {
  const { t, language } = useLanguage();

  const lastUpdated = new Date(PRIVACY_POLICY_LAST_UPDATED).toLocaleDateString(
    language === "es" ? "es-ES" : "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-between px-4">
      <div className="absolute top-4 right-4">
        <AuthLanguageSwitcher />
      </div>

      <div className="flex w-full max-w-2xl flex-1 flex-col items-center gap-8 py-16">
        <F1Logo />

        <div className="w-full space-y-6 overflow-hidden rounded-2xl border border-border bg-background p-6 sm:p-8">
          {/* Header */}
          <div className="space-y-1 text-center">
            <h1 className="text-3xl font-semibold text-f1-white">{t.privacy.title}</h1>
            <p className="text-sm text-muted">{t.privacy.subtitle}</p>
            <p className="text-xs text-muted/60">
              {t.privacy.lastUpdated}: {lastUpdated}
            </p>
          </div>

          {/* Not-legal-advice disclaimer */}
          <div
            role="note"
            className="rounded-lg border border-f1-amber/20 bg-f1-amber/10 px-4 py-3 text-sm text-f1-amber"
          >
            <span className="font-semibold">{t.privacy.disclaimerLabel}:</span>{" "}
            {t.privacy.disclaimer}
          </div>

          {/* Intro */}
          <p className="text-sm leading-relaxed text-muted">{t.privacy.intro}</p>

          {/* What data we collect */}
          <Section title={t.privacy.dataTitle}>
            <p className="text-sm leading-relaxed text-muted">{t.privacy.dataIntro}</p>
            <BulletList
              items={[t.privacy.dataEmail, t.privacy.dataName, t.privacy.dataAvatar]}
            />
          </Section>

          {/* Why we use your data */}
          <Section title={t.privacy.purposesTitle}>
            <p className="text-sm leading-relaxed text-muted">{t.privacy.purposesIntro}</p>
            <BulletList
              items={[
                t.privacy.purposeAccount,
                t.privacy.purposeAuth,
                t.privacy.purposeProfile,
              ]}
            />
          </Section>

          {/* Legal basis */}
          <Section title={t.privacy.legalBasisTitle}>
            <p className="text-sm leading-relaxed text-muted">{t.privacy.legalBasisBody}</p>
          </Section>

          {/* Processors */}
          <Section title={t.privacy.processorsTitle}>
            <p className="text-sm leading-relaxed text-muted">{t.privacy.processorsIntro}</p>
            <BulletList
              items={[t.privacy.processorSupabase, t.privacy.processorGoogle]}
            />
            <p className="text-sm leading-relaxed text-muted">{t.privacy.processorsRegion}</p>
          </Section>

          {/* Retention & deletion */}
          <Section title={t.privacy.retentionTitle}>
            <p className="text-sm leading-relaxed text-muted">{t.privacy.retentionBody}</p>
          </Section>

          {/* Rights */}
          <Section title={t.privacy.rightsTitle}>
            <p className="text-sm leading-relaxed text-muted">{t.privacy.rightsIntro}</p>
            <BulletList
              items={[
                t.privacy.rightAccess,
                t.privacy.rightRectification,
                t.privacy.rightErasure,
                t.privacy.rightPortability,
                t.privacy.rightObjection,
              ]}
            />
            <p className="text-sm leading-relaxed text-muted">{t.privacy.rightsHow}</p>
          </Section>

          {/* Contact */}
          <Section title={t.privacy.contactTitle}>
            <p className="text-sm leading-relaxed text-muted">
              {t.privacy.contactBody}{" "}
              <a
                href={`mailto:${t.privacy.contactEmail}`}
                className="font-medium text-f1-white underline underline-offset-2 transition-colors hover:text-f1-red"
              >
                {t.privacy.contactEmail}
              </a>
            </p>
          </Section>

          <div className="pt-2 text-center">
            <Link
              href="/login"
              className="inline-block text-sm font-medium text-f1-white transition-colors hover:text-f1-red"
            >
              {t.privacy.backToLogin}
            </Link>
          </div>
        </div>
      </div>

      <AuthFooter />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-f1-white">{title}</h2>
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted marker:text-f1-red">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
