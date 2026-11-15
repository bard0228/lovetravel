import React, { useState } from "react";
import { Edit3, Trash2, MapPin, ExternalLink } from "lucide-react";
import { ExpenseItem } from "../types";
import { formatForeign, formatTwd } from "../utils/currencies";
import { getGoogleMapsUrl } from "../utils/geolocation";
import { normalizeDate } from "../utils/tripDates";
import { resolveImageUrl } from "../utils/imageUrl";
import { GlassModal } from "./GlassModal";
import { ImageLightboxModal } from "./ImageLightboxModal";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

interface ExpenseDetailModalProps {
  expense: ExpenseItem | null;
  onClose: () => void;
  onEdit: (expense: ExpenseItem) => void;
  onDelete: (id: string) => void;
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  expense,
  onClose,
  onEdit,
  onDelete,
}) => {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!expense) return null;

  return (
    <>
      <GlassModal isOpen={Boolean(expense)} title={expense.title} onClose={onClose}>
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/70 border border-white/90 text-center">
            <div className="text-2xl font-extrabold text-slate-800 tabular-nums">
              {formatTwd(expense.amountTwd)}
            </div>
            <div className="text-xs font-semibold text-slate-500 tabular-nums mt-1">
              {formatForeign(expense.originalAmount, expense.originalCurrency)}
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1.5 border-b border-slate-200/60">
              <span className="text-slate-500">日期</span>
              <span className="font-semibold text-slate-800 tabular-nums">{normalizeDate(expense.date)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200/60">
              <span className="text-slate-500">分類</span>
              <span className="font-semibold text-slate-800">{expense.category}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200/60">
              <span className="text-slate-500">付款方式</span>
              <span className="font-semibold text-slate-800">{expense.paymentMethod}</span>
            </div>
            {expense.merchant && (
              <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                <span className="text-slate-500">商家</span>
                <span className="font-semibold text-slate-800">{expense.merchant}</span>
              </div>
            )}
            {expense.coordinates && (
              <div className="flex items-center justify-between py-1.5 border-b border-slate-200/60">
                <span className="text-slate-500 flex items-center gap-1">
                  <MapPin size={14} strokeWidth={2} />
                  <span>座標</span>
                </span>
                <a
                  href={getGoogleMapsUrl(expense.coordinates)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#5b8270] flex items-center gap-1 tabular-nums text-xs"
                >
                  <span>{expense.coordinates}</span>
                  <ExternalLink size={12} strokeWidth={2} />
                </a>
              </div>
            )}
            {expense.notes && (
              <div className="py-1.5">
                <div className="text-slate-500 text-xs mb-1">備註</div>
                <div className="p-2.5 rounded-xl bg-white/60 text-xs text-slate-700 whitespace-pre-wrap">
                  {expense.notes}
                </div>
              </div>
            )}
          </div>

          {expense.images && expense.images.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {expense.images.map((img, idx) => {
                const src = resolveImageUrl(img.dataUrl || img.driveUrl);
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setLightboxIdx(idx)}
                    className="relative rounded-xl overflow-hidden border border-white cursor-zoom-in block w-full bg-slate-100 min-h-[112px]"
                  >
                    <img
                      src={src}
                      alt={img.name || expense.title}
                      loading="lazy"
                      className="w-full h-28 object-cover"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (img.driveUrl && !target.dataset.fallback) {
                          target.dataset.fallback = "true";
                          const m = img.driveUrl.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
                          if (m) target.src = `https://drive.google.com/thumbnail?id=${m[1]}&sz=w800`;
                        }
                      }}
                    />
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-slate-900/60 text-white text-[10px]">
                      {img.typeHint === "receipt" ? "憑證" : "實品"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(expense);
              }}
              className="lg-btn bg-white/80 border border-white text-slate-800 font-bold text-sm flex items-center justify-center gap-1.5"
            >
              <Edit3 size={16} strokeWidth={2} />
              <span>編輯</span>
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="lg-btn bg-[#a86c72] text-white font-bold text-sm flex items-center justify-center gap-1.5"
            >
              <Trash2 size={16} strokeWidth={2} />
              <span>刪除</span>
            </button>
          </div>
        </div>
      </GlassModal>

      <ImageLightboxModal
        images={expense.images || []}
        initialIndex={lightboxIdx}
        onClose={() => setLightboxIdx(null)}
      />

      <ConfirmDeleteModal
        isOpen={confirmOpen}
        targetName={expense.title}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete(expense.id);
          onClose();
        }}
      />
    </>
  );
};
