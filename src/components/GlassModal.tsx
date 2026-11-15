import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface GlassModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const GlassModal: React.FC<GlassModalProps> = ({
  isOpen,
  title,
  onClose,
  children,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[900] bg-slate-900/25 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden touch-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="lg-ice-frame w-full max-w-[392px] max-h-[86dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lg-inner-glass flex flex-col max-h-[calc(86dvh-14px)]">
          <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0 border-b border-white/60">
            <h2 className="text-[17px] font-bold text-slate-800 truncate pr-2">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="關閉"
              className="lg-btn bg-white/60 border border-white/80 flex items-center justify-center text-slate-700 !min-w-[40px] !min-h-[40px] w-10 h-10 shrink-0"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>
          <div className="px-5 py-4 overflow-y-auto overscroll-contain touch-pan-y flex-1">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
