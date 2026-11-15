import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { CompressedImage } from "../types";
import { resolveImageUrl } from "../utils/imageUrl";

interface ImageLightboxModalProps {
  images: CompressedImage[];
  initialIndex: number | null;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  images,
  initialIndex,
  onClose,
}) => {
  const [index, setIndex] = useState(initialIndex ?? 0);

  useEffect(() => {
    if (initialIndex !== null) setIndex(initialIndex);
  }, [initialIndex]);

  if (initialIndex === null || !images[index]) return null;

  const current = images[index];
  const src = resolveImageUrl(current.dataUrl || current.driveUrl || "");

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[950] bg-slate-900/75 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="關閉圖片"
        className="lg-btn fixed top-[max(16px,env(safe-area-inset-top,16px))] right-4 bg-white/20 text-white border border-white/30 !min-w-[44px] !min-h-[44px] w-11 h-11 flex items-center justify-center z-10"
      >
        <X size={20} strokeWidth={2} />
      </button>

      <div
        className="relative max-w-full max-h-[82dvh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={current.name || ""}
          className="max-w-full max-h-[80dvh] rounded-2xl object-contain shadow-2xl"
        />
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}
              className="lg-btn absolute left-2 top-1/2 -translate-y-1/2 bg-white/25 text-white border border-white/35 !min-w-[44px] !min-h-[44px] w-11 h-11 flex items-center justify-center"
            >
              <ChevronLeft size={22} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % images.length)}
              className="lg-btn absolute right-2 top-1/2 -translate-y-1/2 bg-white/25 text-white border border-white/35 !min-w-[44px] !min-h-[44px] w-11 h-11 flex items-center justify-center"
            >
              <ChevronRight size={22} strokeWidth={2} />
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};
