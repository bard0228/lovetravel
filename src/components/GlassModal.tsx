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
      className="fixed inset-0 z-[900] bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="lg-ice-frame w-full max-w-[392px] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lg-inner-glass p-5 max-h-[86dvh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[17px] font-bold text-slate-800">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="關閉"
              className="lg-btn bg-white/60 border border-white/80 flex items-center justify-center text-slate-700 !min-w-[40px] !min-h-[40px] w-10 h-10"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
