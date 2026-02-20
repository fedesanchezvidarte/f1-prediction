import Image from "next/image";

export function F1Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Image
        src="/logo.svg"
        alt="F1 Prediction logo"
        width={44}
        height={44}
        priority
      />
      <div>
        <h1 className="text-xl font-bold tracking-tight text-f1-white">
          F1 Prediction
        </h1>
        <p className="text-xs text-muted">Season 2026</p>
      </div>
    </div>
  );
}
