import { Construction } from "lucide-react";

export function PlaceholderCard() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-5 sm:p-6">
      <Construction size={20} className="text-muted/40" />
      <p className="text-[10px] text-muted/40">Still cooking...</p>
    </div>
  );
}
