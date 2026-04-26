"use client";

import { useEffect, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

/**
 * Intercepts in-app link clicks and routes them through React's useTransition
 * so the previous page stays mounted while the next route loads. This keeps
 * real content visible behind the LoadingOverlay backdrop blur during navigation.
 *
 * External links, modified clicks (cmd/ctrl/shift), and target=_blank are left alone.
 * Programmatic router.push calls (form submissions, sign-out, etc.) are not affected;
 * those flows already manage their own LoadingOverlay state.
 */
export function NavigationProgressProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      // Internal routes only
      if (!href.startsWith("/") || href.startsWith("//")) return;

      const [pathOnly] = href.split("#");
      if (pathOnly === pathname) return;

      event.preventDefault();
      event.stopPropagation();
      startTransition(() => {
        router.push(href);
      });
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [router, pathname]);

  return (
    <>
      {children}
      <LoadingOverlay isLoading={isPending} />
    </>
  );
}
