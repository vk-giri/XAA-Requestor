import { useEffect } from "react";
import type { StepInfo } from "./StepCard";
import { HttpCallCard } from "./HttpCallCard";
import { TokenCard } from "./TokenCard";

export function StepDetailModal({ step, onClose }: { step: StepInfo; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-base font-semibold">
            Step {step.n} — {step.title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-2xl leading-none text-slate-500 hover:text-slate-800"
          >
            ×
          </button>
        </header>
        <div className="space-y-4 p-5">
          {step.call && <HttpCallCard call={step.call} />}
          {step.token && <TokenCard label={step.tokenLabel ?? "token"} token={step.token} />}
        </div>
      </div>
    </div>
  );
}
