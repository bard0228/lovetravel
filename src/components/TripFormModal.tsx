import React, { useState, useEffect } from "react";
import { Trip } from "../types";
import { SUPPORTED_CURRENCIES } from "../utils/currencies";
import { getTaiwanTimeInfo } from "../utils/taiwanTime";
import { normalizeDate } from "../utils/tripDates";
import { GlassModal } from "./GlassModal";

interface TripFormModalProps {
  isOpen: boolean;
  editingTrip?: Trip | null;
  onClose: () => void;
  onSave: (trip: Trip) => void;
}

export const TripFormModal: React.FC<TripFormModalProps> = ({
  isOpen,
  editingTrip,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("JPY");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budgetStr, setBudgetStr] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (editingTrip) {
        setName(editingTrip.name);
        setDestination(editingTrip.destination);
        setDefaultCurrency(editingTrip.defaultCurrency);
        setStartDate(normalizeDate(editingTrip.startDate));
        setEndDate(normalizeDate(editingTrip.endDate));
        setBudgetStr(editingTrip.budgetTwd ? String(editingTrip.budgetTwd) : "");
      } else {
        setName("");
        setDestination("");
        setDefaultCurrency("JPY");
        setStartDate(getTaiwanTimeInfo().dateStr);
        setEndDate("");
        setBudgetStr("");
      }
    }
  }, [isOpen, editingTrip]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate) return;
    const trip: Trip = {
      id: editingTrip?.id || `trip_${Date.now()}`,
      name: name.trim(),
      destination: destination.trim(),
      defaultCurrency,
      startDate,
      endDate: endDate.trim() || undefined,
      budgetTwd: budgetStr.trim() ? Number(budgetStr) : null,
      driveFolderId: editingTrip?.driveFolderId,
      updatedAt: new Date().toISOString(),
    };
    onSave(trip);
    onClose();
  };

  return (
    <GlassModal isOpen={isOpen} title={editingTrip ? "編輯旅程" : "建立新旅程"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">旅程名稱</label>
          <input
            type="text"
            required
            placeholder="東京秋楓之旅"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full min-h-[46px] px-3 rounded-[13px] border border-slate-400/25 bg-white/75 text-sm text-slate-800"
          />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">目的地</label>
            <input
              type="text"
              placeholder="東京"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full min-h-[46px] px-3 rounded-[13px] border border-slate-400/25 bg-white/75 text-sm text-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">預設幣別</label>
            <select
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value)}
              className="w-full min-h-[46px] px-2.5 rounded-[13px] border border-slate-400/25 bg-white/75 text-sm text-slate-800"
            >
              {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">啟程日期</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full min-h-[46px] px-2.5 rounded-[13px] border border-slate-400/25 bg-white/75 text-sm text-slate-800 tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">回程日期 (選填)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full min-h-[46px] px-2.5 rounded-[13px] border border-slate-400/25 bg-white/75 text-sm text-slate-800 tabular-nums"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">預算 TWD (選填)</label>
          <input
            type="number"
            inputMode="numeric"
            placeholder="80000"
            value={budgetStr}
            onChange={(e) => setBudgetStr(e.target.value)}
            className="w-full min-h-[46px] px-3 rounded-[13px] border border-slate-400/25 bg-white/75 text-sm text-slate-800 tabular-nums"
          />
        </div>
        <button
          type="submit"
          className="lg-btn w-full bg-[#5b8270] text-white font-bold text-sm shadow-sm mt-2"
        >
          {editingTrip ? "儲存變更" : "建立旅程"}
        </button>
      </form>
    </GlassModal>
  );
};
