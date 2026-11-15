import React from "react";
import { GlassModal } from "./GlassModal";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  targetName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  targetName,
  onConfirm,
  onCancel,
}) => {
  return (
    <GlassModal isOpen={isOpen} title="確定刪除" onClose={onCancel}>
      <div className="space-y-4">
        <p className="text-sm text-slate-700 leading-relaxed">
          即將刪除「<span className="font-bold text-slate-900">{targetName}</span>」，此動作無法復原。
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="lg-btn bg-white/80 border border-white text-slate-700 font-bold text-sm"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="lg-btn bg-[#a86c72] text-white font-bold text-sm"
          >
            確定刪除
          </button>
        </div>
      </div>
    </GlassModal>
  );
};
