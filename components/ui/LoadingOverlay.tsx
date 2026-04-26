"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SpeedTrailSpinner } from "./SpeedTrailSpinner";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface LoadingOverlayProps {
  isLoading: boolean;
}

/**
 * Fullscreen overlay shown during client-side redirects.
 * Portals to document.body so no parent stacking context can interfere
 * with the backdrop-filter blur. Tint adapts to theme via CSS class.
 */
export function LoadingOverlay({ isLoading }: LoadingOverlayProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isLoading || !mounted) return null;

  const overlay = (
    <div
      role="status"
      aria-live="polite"
      aria-label={t.loading.redirecting}
      className="loading-backdrop fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backdropFilter: "blur(20px) saturate(140%)",
        WebkitBackdropFilter: "blur(20px) saturate(140%)",
      }}
    >
      <SpeedTrailSpinner size={56} />
    </div>
  );

  return createPortal(overlay, document.body);
}
