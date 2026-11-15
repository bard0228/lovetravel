import React, { useState } from "react";
import { Delete } from "lucide-react";

interface MiniCalculatorProps {
  onApply: (value: number) => void;
}

export const MiniCalculator: React.FC<MiniCalculatorProps> = ({ onApply }) => {
  const [expr, setExpr] = useState("");

  const append = (ch: string) => {
    setExpr((prev) => prev + ch);
  };

  const evaluate = () => {
    try {
      const sanitized = expr.replace(/[^0-9+\-*/.]/g, "");
      if (!sanitized) return;
      // eslint-disable-next-line no-new-func
      const res = Function(`"use strict"; return (${sanitized})`)();
      if (typeof res === "number" && Number.isFinite(res)) {
        const rounded = Math.round(res * 100) / 100;
        setExpr(String(rounded));
        onApply(rounded);
      }
    } catch {}
  };

  const keys = ["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "=", "+"];

  return (
    <div className="p-3 rounded-2xl bg-white/60 border border-white/80 space-y-2">
      <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl bg-white/75 border border-slate-200/60">
        <span className="tabular-nums text-sm font-bold text-slate-800 truncate min-h-[20px]">
          {expr || "0"}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setExpr((p) => p.slice(0, -1))}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/50"
          >
            <Delete size={15} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => setExpr("")}
            className="px-2 py-1 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-200/50"
          >
            C
          </button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => (k === "=" ? evaluate() : append(k))}
            className={`h-10 rounded-xl font-bold text-sm tabular-nums transition active:scale-95 ${
              k === "="
                ? "bg-[#5b8270] text-white"
                : ["/", "*", "-", "+"].includes(k)
                ? "bg-slate-200/70 text-slate-700"
                : "bg-white/80 text-slate-800"
            }`}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
};
