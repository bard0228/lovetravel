import React, { useState, useEffect, useRef } from "react";
import { Calculator, Locate, Image as ImageIcon, Trash2 } from "lucide-react";
import { CategoryType, CompressedImage, ExpenseItem, PaymentMethod, Trip } from "../types";
import { SUPPORTED_CURRENCIES, formatTwd } from "../utils/currencies";
import { getTaiwanTimeInfo } from "../utils/taiwanTime";
import { fetchDeviceCoordinates } from "../utils/geolocation";
import { compressImageFile } from "../utils/compression";
import { CATEGORY_LIST } from "./CategoryIcon";
import { MiniCalculator } from "./MiniCalculator";
import { GlassModal } from "./GlassModal";

interface ExpenseFormModalProps {
  isOpen: boolean;
  trip: Trip;
  rates: Record<string, number>;
  editingExpense?: ExpenseItem | null;
  onClose: () => void;
  onSave: (expense: ExpenseItem) => void;
}

const PAYMENT_METHODS: PaymentMethod[] = ["信用卡", "現金", "行動支付", "其他"];

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  trip,
  rates,
  editingExpense,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<CategoryType>("吃喝");
  const [amountStr, setAmountStr] = useState("");
  const [currency, setCurrency] = useState(trip.defaultCurrency || "JPY");
  const [date, setDate] = useState("");
  const [merchant, setMerchant] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("信用卡");
  const [coordinates, setCoordinates] = useState("");
  const [notes, setNotes] = useState("");
  const [images, setImages] = useState<CompressedImage[]>([]);
  const [showCalc, setShowCalc] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setShowCalc(false);
      if (editingExpense) {
        setTitle(editingExpense.title);
        setCategory(editingExpense.category);
        setAmountStr(String(editingExpense.originalAmount));
        setCurrency(editingExpense.originalCurrency);
        setDate(editingExpense.date);
        setMerchant(editingExpense.merchant || "");
        setPaymentMethod(editingExpense.paymentMethod);
        setCoordinates(editingExpense.coordinates || "");
        setNotes(editingExpense.notes || "");
        setImages(editingExpense.images || []);
      } else {
        setTitle("");
        setCategory("吃喝");
        setAmountStr("");
        setCurrency(trip.defaultCurrency || "JPY");
        setDate(getTaiwanTimeInfo().dateStr);
        setMerchant("");
        setPaymentMethod("信用卡");
        setCoordinates("");
        setNotes("");
        setImages([]);
      }
    }
  }, [isOpen, editingExpense, trip]);

  const rate = rates[currency] ?? SUPPORTED_CURRENCIES[currency]?.defaultRate ?? 1;
  const originalAmount = parseFloat(amountStr) || 0;
  const amountTwd = Math.round(originalAmount * rate);

  const handleLocate = async () => {
    setIsLocating(true);
    const gps = await fetchDeviceCoordinates();
    if (gps) setCoordinates(gps.formatted);
    setIsLocating(false);
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      const compressed = await compressImageFile(f, "item");
      setImages((prev) => [...prev, compressed]);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const toggleImageType = (id: string) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === id
          ? { ...img, typeHint: img.typeHint === "receipt" ? "item" : "receipt" }
          : img
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const item: ExpenseItem = {
      id: editingExpense?.id || `exp_${Date.now()}`,
      tripId: trip.id,
      title: title.trim(),
      category,
      originalAmount,
      originalCurrency: currency,
      exchangeRate: rate,
      amountTwd,
      date: date || getTaiwanTimeInfo().dateStr,
      merchant: merchant.trim() || undefined,
      paymentMethod,
      coordinates: coordinates.trim() || undefined,
      notes: notes.trim() || undefined,
      images,
      createdAt: editingExpense?.createdAt || Date.now(),
    };
    onSave(item);
    onClose();
  };

  return (
    <GlassModal isOpen={isOpen} title={editingExpense ? "編輯消費" : "新增消費"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">消費品項</label>
          <input
            type="text"
            required
            placeholder="一蘭拉麵"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full min-h-[46px] px-3 rounded-[13px] border border-slate-400/25 bg-white/75 text-sm text-slate-800"
          />
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {CATEGORY_LIST.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`min-h-[40px] rounded-xl text-xs font-bold border transition active:scale-95 ${
                category === cat
                  ? "bg-[#5b8270] text-white border-[#5b8270]"
                  : "bg-white/70 text-slate-700 border-white/90"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-2 items-end">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">幣別</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full min-h-[46px] px-2 rounded-[13px] border border-slate-400/25 bg-white/75 text-sm text-slate-800"
            >
              {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                <option key={c.code} value={c.code}>{c.code}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">金額</label>
            <input
              type="number"
              step="any"
              required
              inputMode="decimal"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              className="w-full min-h-[46px] px-3 rounded-[13px] border border-slate-400/25 bg-white/75 text-sm text-slate-800 tabular-nums"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowCalc((v) => !v)}
            aria-label="計算機"
            className="lg-btn bg-white/75 border border-white/90 !min-h-[46px] flex items-center justify-center text-slate-700"
          >
            <Calculator size={18} strokeWidth={2} />
          </button>
        </div>

        <div className={`lg-accordion ${showCalc ? "is-open" : ""}`}>
          <div className="lg-accordion-inner">
            <MiniCalculator onApply={(val) => setAmountStr(String(val))} />
          </div>
        </div>

        <div className="text-right text-xs font-bold text-[#5b8270] tabular-nums">
          約 {formatTwd(amountTwd)}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full min-h-[46px] px-2.5 rounded-[13px] border border-slate-400/25 bg-white/75 text-sm text-slate-800 tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">付款方式</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full min-h-[46px] px-2.5 rounded-[13px] border border-slate-400/25 bg-white/75 text-sm text-slate-800"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">商家 (選填)</label>
          <input
            type="text"
            placeholder="新宿中央東口店"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            className="w-full min-h-[46px] px-3 rounded-[13px] border border-slate-400/25 bg-white/75 text-sm text-slate-800"
          />
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-600 mb-1">位置座標 (選填)</label>
            <input
              type="text"
              placeholder="35.6912, 139.7023"
              value={coordinates}
              onChange={(e) => setCoordinates(e.target.value)}
              className="w-full min-h-[46px] px-3 rounded-[13px] border border-slate-400/25 bg-white/75 text-sm text-slate-800 tabular-nums"
            />
          </div>
          <button
            type="button"
            onClick={handleLocate}
            disabled={isLocating}
            className="lg-btn bg-white/75 border border-white/90 !min-h-[46px] px-3 flex items-center justify-center text-slate-700"
          >
            <Locate size={18} strokeWidth={2} />
          </button>
        </div>

        <div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="lg-btn w-full bg-white/70 border border-white/90 text-xs font-bold text-slate-700 flex items-center justify-center gap-2"
          >
            <ImageIcon size={16} strokeWidth={2} />
            <span>加入照片</span>
          </button>
          {images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pt-2">
              {images.map((img) => (
                <div key={img.id} className="relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-white">
                  <img src={img.dataUrl || img.driveUrl} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => toggleImageType(img.id)}
                    className="absolute bottom-0 inset-x-0 bg-slate-900/65 text-white text-[10px] py-0.5 text-center"
                  >
                    {img.typeHint === "receipt" ? "收據" : "實品"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setImages((p) => p.filter((x) => x.id !== img.id))}
                    className="absolute top-0.5 right-0.5 bg-slate-900/65 text-white rounded-full p-0.5"
                  >
                    <Trash2 size={10} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="lg-btn w-full bg-[#5b8270] text-white font-bold text-sm shadow-sm"
        >
          儲存紀錄
        </button>
      </form>
    </GlassModal>
  );
};
