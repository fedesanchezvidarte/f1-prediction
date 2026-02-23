"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";

export function AuthFooter() {
  const { t } = useLanguage();

  return (
    <footer className="py-6 text-center font-mono text-xs text-muted">
      <p>
        {t.authFooter.madeWith}{" "}
        <a
          href="https://github.com/fedesanchezvidarte/f1-prediction"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 transition-colors hover:text-f1-white"
        >
          Github
        </a>
      </p>
      <p className="mt-1">
        {t.authFooter.findMe}{" "}
        <a
          href="https://www.linkedin.com/in/fedesanchezvidarte/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 transition-colors hover:text-f1-white"
        >
          LinkedIn
        </a>
      </p>
    </footer>
  );
}
