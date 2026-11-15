import React, { useRef, useState } from "react";
import { Download, Upload, RefreshCw } from "lucide-react";
import { Trip, ExpenseItem } from "../types";
import { GlassModal } from "./GlassModal";

interface SyncSettingsModalProps {
  isOpen: boolean;
  gasUrl: string;
  trips: Trip[];
  expenses: ExpenseItem[];
  onSaveGasUrl: (url: string) => void;
  onSyncNow: () => Promise<void>;
  onImportBackup: (trips: Trip[], expenses: ExpenseItem[]) => void;
  onClose: () => void;
}

export const SyncSettingsModal: React.FC<SyncSettingsModalProps> = ({
  isOpen,
  gasUrl,
  trips,
  expenses,
  onSaveGasUrl,
  onSyncNow,
  onImportBackup,
  onClose,
}) => {
  const [urlInput, setUrlInput] = useState(gasUrl);
  const [isSyncing, setIsSyncing] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleExportJson = () => {
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      trips,
      expenses,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lovetravel_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || "{}"));
        const p = parsed.payload || parsed;
        if (Array.isArray(p.trips) && Array.isArray(p.expenses)) {
          onImportBackup(p.trips, p.expenses);
          onClose();
        }
      } catch {}
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleSync = async () => {
    setIsSyncing(true);
    onSaveGasUrl(urlInput.trim());
    await onSyncNow();
    setIsSyncing(false);
  };

  return (
    <GlassModal isOpen={isOpen} title="雲端同步與備份" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">GAS Live Sync URL</label>
          <input
            type="url"
            placeholder="https://script.google.com/macros/s/.../exec"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="w-full min-h-[46px] px-3 rounded-[13px] border border-slate-400/25 bg-white/75 text-xs text-slate-800"
          />
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className="lg-btn w-full bg-[#5b8270] text-white font-bold text-sm mt-2 flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} strokeWidth={2} className={isSyncing ? "animate-spin" : ""} />
            <span>立即同步</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-200/70">
          <button
            type="button"
            onClick={handleExportJson}
            className="lg-btn bg-white/80 border border-white text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5"
          >
            <Download size={15} strokeWidth={2} />
            <span>匯出 JSON</span>
          </button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={handleImportJson} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="lg-btn bg-white/80 border border-white text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5"
          >
            <Upload size={15} strokeWidth={2} />
            <span>匯入還原</span>
          </button>
        </div>
      </div>
    </GlassModal>
  );
};
