import React from "react";
import { CategoryType, ExpenseItem } from "../types";
import { CATEGORY_LIST, CATEGORY_COLORS, CategoryIcon } from "./CategoryIcon";
import { formatTwd } from "../utils/currencies";

interface StatsViewProps {
  expenses: ExpenseItem[];
  onSelectCategory: (category: CategoryType) => void;
}

export const StatsView: React.FC<StatsViewProps> = ({ expenses, onSelectCategory }) => {
  const totalTwd = expenses.reduce((sum, e) => sum + (e.amountTwd || 0), 0);

  const stats = CATEGORY_LIST.map((cat) => {
    const items = expenses.filter((e) => e.category === cat);
    const catTotal = items.reduce((sum, e) => sum + (e.amountTwd || 0), 0);
    const pct = totalTwd > 0 ? Math.round((catTotal / totalTwd) * 100) : 0;
    return {
      category: cat,
      count: items.length,
      totalTwd: catTotal,
      pct,
      meta: CATEGORY_COLORS[cat],
    };
  }).sort((a, b) => b.totalTwd - a.totalTwd);

  return (
    <div className="space-y-2.5">
      {stats.map((row) => (
        <button
          key={row.category}
          type="button"
          onClick={() => onSelectCategory(row.category)}
          className="lg-btn lg-card w-full p-3.5 text-left block"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: row.meta.bg, color: row.meta.color }}
              >
                <CategoryIcon category={row.category} size={17} />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800">{row.category}</div>
                <div className="text-[11px] text-slate-500 tabular-nums">{row.count} 筆</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-slate-800 tabular-nums">{formatTwd(row.totalTwd)}</div>
              <div className="text-[11px] text-slate-500 tabular-nums">{row.pct}%</div>
            </div>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-400/15 overflow-hidden mt-2.5">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${row.pct}%`, backgroundColor: row.meta.color }}
            />
          </div>
        </button>
      ))}
    </div>
  );
};
