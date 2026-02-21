import Image from "next/image";
import { Linkedin, Github, Coffee } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex flex-col items-center gap-4 px-4 py-6 sm:flex-row sm:justify-between sm:px-6">
        <div className="hidden items-center gap-2 sm:flex">
          <Image src="/logo.svg" alt="F1 Prediction" width={24} height={24} />
          <span className="text-sm font-semibold text-f1-white">
            F1 Prediction
          </span>
          <span className="text-xs text-muted">Season 2026</span>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
          <a
            href="https://buymeacoffee.com/fedesanchezvidarte"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-f1-amber/50 hover:text-f1-amber"
            aria-label="Buy me a coffee"
          >
            <Coffee size={13} />
            <span>buy me a coffee</span>
          </a>

          <div className="flex items-center gap-4">
            <span className="text-xs text-muted">
              &copy; {new Date().getFullYear()} F1 Prediction
            </span>
            <a
              href="https://www.linkedin.com/in/fedesanchezvidarte/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted transition-colors hover:text-f1-white"
              aria-label="LinkedIn"
            >
              <Linkedin size={16} />
            </a>
            <a
              href="https://github.com/fedesanchezvidarte/f1-prediction"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted transition-colors hover:text-f1-white"
              aria-label="GitHub"
            >
              <Github size={16} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
