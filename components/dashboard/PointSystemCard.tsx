"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { PointSystemModal } from "./PointSystemModal";
import { POINT_SYSTEM } from "@/lib/dummy-data";

export function PointSystemCard() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex h-full w-full flex-col items-center justify-center gap-3 p-5 text-center transition-colors hover:bg-card-hover sm:p-6"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-f1-purple/10">
          <HelpCircle size={20} className="text-f1-purple" />
        </div>
        <div>
          <p className="text-xs font-medium text-f1-white">Point System</p>
          <p className="mt-0.5 text-[10px] text-muted">
            Tap to view scoring rules
          </p>
        </div>
      </button>

      {isModalOpen && (
        <PointSystemModal
          sections={POINT_SYSTEM}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
