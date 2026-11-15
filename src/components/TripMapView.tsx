import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { MapPin, ExternalLink } from "lucide-react";
import { ExpenseItem } from "../types";
import { parseCoordinates, getGoogleMapsUrl } from "../utils/geolocation";
import { formatForeign, formatTwd } from "../utils/currencies";
import { normalizeDate } from "../utils/tripDates";
import { CATEGORY_COLORS } from "./CategoryIcon";

interface TripMapViewProps {
  expenses: ExpenseItem[];
  onSelectExpense: (expense: ExpenseItem) => void;
}

export const TripMapView: React.FC<TripMapViewProps> = ({
  expenses,
  onSelectExpense,
}) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<L.Map | null>(null);
  const [focusedExpense, setFocusedExpense] = useState<ExpenseItem | null>(null);

  const located = React.useMemo(() => {
    return expenses
      .map((e) => ({ expense: e, coords: parseCoordinates(e.coordinates) }))
      .filter((x): x is { expense: ExpenseItem; coords: { lat: number; lng: number } } => x.coords !== null)
      .sort((a, b) => normalizeDate(a.expense.date).localeCompare(normalizeDate(b.expense.date)));
  }, [expenses]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (instanceRef.current) {
      instanceRef.current.remove();
      instanceRef.current = null;
    }

    const defaultCenter: [number, number] =
      located.length > 0 ? [located[0].coords.lat, located[0].coords.lng] : [35.681236, 139.767125];

    const map = L.map(mapRef.current, {
      center: defaultCenter,
      zoom: located.length > 0 ? 11 : 5,
      zoomControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OSM",
      maxZoom: 19,
    }).addTo(map);

    if (located.length > 1) {
      const latlngs = located.map((x) => [x.coords.lat, x.coords.lng] as [number, number]);
      L.polyline(latlngs, {
        color: "#5b8270",
        weight: 2.5,
        dashArray: "6 6",
        opacity: 0.75,
      }).addTo(map);
    }

    const bounds: [number, number][] = [];
    located.forEach(({ expense, coords }, idx) => {
      bounds.push([coords.lat, coords.lng]);
      const catColor = (CATEGORY_COLORS[expense.category] || CATEGORY_COLORS["其他"]).color;
      const icon = L.divIcon({
        className: "lv-map-pin",
        html: `<div style="transform:translate(-50%,-50%);background:rgba(255,255,255,0.92);backdrop-filter:blur(8px);border:1.5px solid ${catColor};color:#1e293b;border-radius:999px;padding:3px 9px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 4px 12px rgba(45,58,76,0.16);">${idx + 1}. ${expense.title.slice(0, 8)}</div>`,
        iconSize: [0, 0],
      });
      const marker = L.marker([coords.lat, coords.lng], { icon }).addTo(map);
      marker.on("click", () => setFocusedExpense(expense));
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 14 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 15);
    }

    setTimeout(() => map.invalidateSize(), 150);
    instanceRef.current = map;

    return () => {
      if (instanceRef.current) {
        instanceRef.current.remove();
        instanceRef.current = null;
      }
    };
  }, [located]);

  return (
    <div className="space-y-3">
      <div className="lg-card p-3">
        <div className="flex items-center justify-between px-1 pb-2.5 text-xs font-semibold text-slate-600">
          <span className="flex items-center gap-1.5">
            <MapPin size={14} strokeWidth={2} />
            <span>已定位足跡</span>
          </span>
          <span className="tabular-nums">{located.length} / {expenses.length} 筆</span>
        </div>
        <div ref={mapRef} className="w-full h-[340px] rounded-[18px] bg-slate-200/60 overflow-hidden" />
      </div>

      {focusedExpense && (
        <div
          onClick={() => onSelectExpense(focusedExpense)}
          className="lg-card p-3.5 flex items-center justify-between gap-3 cursor-pointer"
        >
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-800 truncate">{focusedExpense.title}</div>
            <div className="text-xs text-slate-500 tabular-nums mt-0.5">
              {focusedExpense.date} · {focusedExpense.merchant || focusedExpense.category}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <div className="text-sm font-bold text-slate-800 tabular-nums">
                {formatTwd(focusedExpense.amountTwd)}
              </div>
              <div className="text-[11px] text-slate-500 tabular-nums">
                {formatForeign(focusedExpense.originalAmount, focusedExpense.originalCurrency)}
              </div>
            </div>
            {focusedExpense.coordinates && (
              <a
                href={getGoogleMapsUrl(focusedExpense.coordinates)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="lg-btn bg-white/70 border border-white/90 !min-w-[40px] !min-h-[40px] w-10 h-10 flex items-center justify-center text-slate-600"
              >
                <ExternalLink size={15} strokeWidth={2} />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
