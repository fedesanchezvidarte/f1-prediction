"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import type { PointSystemSection } from "@/types";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface PointSystemModalProps {
  sections: PointSystemSection[];
  onClose: () => void;
}

export function PointSystemModal({ sections, onClose }: PointSystemModalProps) {
  const { t } = useLanguage();

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <h2 className="text-lg font-bold text-f1-white">
            {t.pointSystem.modalTitle}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-card-hover hover:text-f1-white"
            aria-label={t.pointSystem.closeModal}
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {sections.map((section) => (
            <div key={section.title}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-f1-white">
                  {section.title}
                </h3>
                <span className="rounded-full bg-f1-red/10 px-2.5 py-0.5 text-[10px] font-semibold text-f1-red">
                  {t.pointSystem.max} {section.maxPoints} {t.pointSystem.pts}
                </span>
              </div>
              <div className="mt-3 space-y-1">
                {section.rules.map((rule) => (
                  <div
                    key={rule.category}
                    className="flex items-center justify-between rounded-md px-3 py-2 text-xs transition-colors hover:bg-card-hover"
                  >
                    <div>
                      <p className="font-medium text-f1-white">
                        {rule.category}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted">
                        {rule.description}
                      </p>
                    </div>
                    <span className="ml-4 whitespace-nowrap font-semibold tabular-nums text-f1-amber">
                      +{rule.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
