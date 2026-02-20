import Image from "next/image";
import { Linkedin, Github } from "lucide-react";

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

        <div className="flex items-center gap-4">
          <span className="text-xs text-muted">
            &copy; {new Date().getFullYear()} F1 Prediction
          </span>
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted transition-colors hover:text-f1-white"
            aria-label="LinkedIn"
          >
            <Linkedin size={16} />
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted transition-colors hover:text-f1-white"
            aria-label="GitHub"
          >
            <Github size={16} />
          </a>
        </div>
      </div>
    </footer>
  );
}
