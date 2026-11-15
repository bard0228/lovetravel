import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  ChevronLeft,
  ChevronsDownUp,
  ChevronsUpDown,
  Clock,
  Cloud,
  Download,
  Edit3,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Plane,
  X,
} from "lucide-react";
import { CategoryType, ExpenseItem, Trip } from "./types";
import {
  fetchLiveExchangeRates,
  formatForeign,
  formatTwd,
  getDefaultRatesMap,
} from "./utils/currencies";
import {
  computeTripBudgetMetrics,
  getPrimaryOngoingTrip,
  getUpcomingTrip,
  normalizeDate,
} from "./utils/tripDates";
import { downloadTripReportHtml } from "./utils/exportTripHtmlReport";
import { attachAndroidEdgeStretch } from "./utils/overscroll";
import {
  getLocalDbItem,
  requestPersistentStorage,
  setLocalDbItem,
} from "./services/localDb";
import {
  DEFAULT_GAS_URL,
  fetchSeedData,
  KEY_EXPENSES,
  KEY_GAS_URL,
  KEY_RATES,
  KEY_TRIPS,
  mergeExpenses,
  mergeTrips,
  pullFromGas,
  pushToGas,
} from "./services/cloudSync";
import { CATEGORY_COLORS, CATEGORY_LIST, CategoryIcon } from "./components/CategoryIcon";
import { TripMapView } from "./components/TripMapView";
import { StatsView } from "./components/StatsView";
import { TripFormModal } from "./components/TripFormModal";
import { ExpenseFormModal } from "./components/ExpenseFormModal";
import { ExpenseDetailModal } from "./components/ExpenseDetailModal";
import { SyncSettingsModal } from "./components/SyncSettingsModal";
import { ConfirmDeleteModal } from "./components/ConfirmDeleteModal";

type ViewMode = "welcome" | "catalog" | "main";
type MainTab = "list" | "map" | "stats";

export default function App() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [rates, setRates] = useState<Record<string, number>>(getDefaultRatesMap);
  const [gasUrl, setGasUrl] = useState<string>(() => localStorage.getItem(KEY_GAS_URL) || DEFAULT_GAS_URL);
  const [ready, setReady] = useState(false);

  const [view, setView] = useState<ViewMode>("welcome");
  const [viewDir, setViewDir] = useState<"left" | "right">("right");
  const [currentTripId, setCurrentTripId] = useState<string>("");

  const [activeTab, setActiveTab] = useState<MainTab>("list");
  const [tabDir, setTabDir] = useState<"left" | "right">("right");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryType | null>(null);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [pendingDeleteTrip, setPendingDeleteTrip] = useState<Trip | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [detailExpense, setDetailExpense] = useState<ExpenseItem | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  // 初始化資料與即時匯率
  useEffect(() => {
    let mounted = true;
    (async () => {
      await requestPersistentStorage();
      const [localTrips, localExpenses, localRates, seed] = await Promise.all([
        getLocalDbItem<Trip[]>(KEY_TRIPS, []),
        getLocalDbItem<ExpenseItem[]>(KEY_EXPENSES, []),
        getLocalDbItem<Record<string, number>>(KEY_RATES),
        fetchSeedData(),
      ]);

      let mergedTrips = mergeTrips(localTrips || [], seed?.trips || []);
      let mergedExpenses = mergeExpenses(localExpenses || [], seed?.expenses || []);

      const activeGas = localStorage.getItem(KEY_GAS_URL) || DEFAULT_GAS_URL;
      if (activeGas) {
        const remote = await pullFromGas(activeGas);
        if (remote) {
          mergedTrips = mergeTrips(mergedTrips, remote.trips);
          mergedExpenses = mergeExpenses(mergedExpenses, remote.expenses);
        }
      }

      if (!mounted) return;
      setTrips(mergedTrips);
      setExpenses(mergedExpenses);
      if (localRates) setRates(localRates);

      const ongoing = getPrimaryOngoingTrip(mergedTrips);
      if (ongoing) {
        setCurrentTripId(ongoing.id);
        setView("main");
      } else if (mergedTrips.length > 0) {
        setCurrentTripId(mergedTrips[0].id);
      }
      setReady(true);

      const live = await fetchLiveExchangeRates(localRates || getDefaultRatesMap());
      if (mounted) {
        setRates(live);
        await setLocalDbItem(KEY_RATES, live);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Android 12 Edge Overscroll Stretch
  useEffect(() => {
    return attachAndroidEdgeStretch(
      document.scrollingElement as HTMLElement | null,
      document.querySelector("#app-shell") as HTMLElement | null
    );
  }, [ready]);

  const persistAll = async (nextTrips: Trip[], nextExpenses: ExpenseItem[]) => {
    setTrips(nextTrips);
    setExpenses(nextExpenses);
    await Promise.all([
      setLocalDbItem(KEY_TRIPS, nextTrips),
      setLocalDbItem(KEY_EXPENSES, nextExpenses),
    ]);
    if (gasUrl) {
      pushToGas(gasUrl, nextTrips, nextExpenses);
    }
  };

  const navigateView = (next: ViewMode, dir: "left" | "right", pushHistory = true) => {
    setViewDir(dir);
    setView(next);
    if (pushHistory && next !== "welcome") {
      try {
        window.history.pushState({ view: next }, "");
      } catch {}
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 手機系統返回手勢 / 返回鍵攔截
  useEffect(() => {
    const onPopState = () => {
      if (pendingDeleteTrip) {
        setPendingDeleteTrip(null);
        return;
      }
      if (detailExpense) {
        setDetailExpense(null);
        return;
      }
      if (isExpenseModalOpen) {
        setIsExpenseModalOpen(false);
        return;
      }
      if (isTripModalOpen) {
        setIsTripModalOpen(false);
        return;
      }
      if (isSyncModalOpen) {
        setIsSyncModalOpen(false);
        return;
      }
      if (view === "main") {
        navigateView("catalog", "left", false);
      } else if (view === "catalog") {
        navigateView("welcome", "left", false);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [view, pendingDeleteTrip, detailExpense, isExpenseModalOpen, isTripModalOpen, isSyncModalOpen]);

  // 彈窗開啟時推入歷史狀態以便手機返回手勢關閉彈窗
  useEffect(() => {
    if (isTripModalOpen || isExpenseModalOpen || Boolean(detailExpense) || isSyncModalOpen || Boolean(pendingDeleteTrip)) {
      try {
        window.history.pushState({ modal: true }, "");
      } catch {}
    }
  }, [isTripModalOpen, isExpenseModalOpen, detailExpense, isSyncModalOpen, pendingDeleteTrip]);

  const switchMainTab = (next: MainTab) => {
    const order: MainTab[] = ["list", "map", "stats"];
    const dir = order.indexOf(next) >= order.indexOf(activeTab) ? "right" : "left";
    setTabDir(dir);
    setActiveTab(next);
  };

  const currentTrip = useMemo(
    () => trips.find((t) => t.id === currentTripId) || trips[0] || null,
    [trips, currentTripId]
  );

  const tripExpenses = useMemo(
    () =>
      currentTrip
        ? expenses
            .filter((e) => e.tripId === currentTrip.id)
            .sort((a, b) => normalizeDate(b.date).localeCompare(normalizeDate(a.date)) || b.createdAt - a.createdAt)
        : [],
    [expenses, currentTrip]
  );

  const filteredExpenses = useMemo(() => {
    return tripExpenses.filter((e) => {
      if (categoryFilter && e.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          e.title.toLowerCase().includes(q) ||
          (e.merchant || "").toLowerCase().includes(q) ||
          (e.notes || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tripExpenses, categoryFilter, searchQuery]);

  // 依日期分組
  const groupedByDate = useMemo(() => {
    const map = new Map<string, ExpenseItem[]>();
    for (const e of filteredExpenses) {
      const d = normalizeDate(e.date) || "未分類日期";
      const list = map.get(d) || [];
      list.push(e);
      map.set(d, list);
    }
    return Array.from(map.entries()).map(([date, items]) => ({
      date,
      items,
      totalTwd: items.reduce((s, x) => s + (x.amountTwd || 0), 0),
    }));
  }, [filteredExpenses]);

  // 切換旅程時預設僅展開最新一天
  useEffect(() => {
    if (groupedByDate.length > 0) {
      setExpandedDates({ [groupedByDate[0].date]: true });
    }
  }, [currentTripId]);

  const isDateExpanded = (date: string) => {
    if (searchQuery.trim() || categoryFilter) return true;
    return Boolean(expandedDates[date]);
  };

  const expandAllDates = () => {
    const next: Record<string, boolean> = {};
    groupedByDate.forEach((g) => {
      next[g.date] = true;
    });
    setExpandedDates(next);
  };

  const collapseAllDates = () => {
    setExpandedDates({});
  };

  const metrics = useMemo(
    () => (currentTrip ? computeTripBudgetMetrics(currentTrip, tripExpenses) : null),
    [currentTrip, tripExpenses]
  );

  const ongoingTrip = useMemo(() => getPrimaryOngoingTrip(trips), [trips]);
  const upcomingTrip = useMemo(() => getUpcomingTrip(trips), [trips]);

  const handleSaveTrip = async (trip: Trip) => {
    const exists = trips.some((t) => t.id === trip.id);
    const nextTrips = exists
      ? trips.map((t) => (t.id === trip.id ? trip : t))
      : [trip, ...trips];
    await persistAll(nextTrips, expenses);
    setCurrentTripId(trip.id);
    navigateView("main", "right");
  };

  const handleDeleteTrip = async (tripId: string) => {
    const nextTrips = trips.filter((t) => t.id !== tripId);
    const nextExpenses = expenses.filter((e) => e.tripId !== tripId);
    await persistAll(nextTrips, nextExpenses);
    if (currentTripId === tripId) {
      setCurrentTripId(nextTrips[0]?.id || "");
    }
  };

  const handleSaveExpense = async (expense: ExpenseItem) => {
    const exists = expenses.some((e) => e.id === expense.id);
    const nextExpenses = exists
      ? expenses.map((e) => (e.id === expense.id ? expense : e))
      : [expense, ...expenses];
    await persistAll(trips, nextExpenses);
    setExpandedDates((prev) => ({ ...prev, [normalizeDate(expense.date)]: true }));
  };

  const handleDeleteExpense = async (id: string) => {
    const nextExpenses = expenses.filter((e) => e.id !== id);
    await persistAll(trips, nextExpenses);
  };

  const handleSyncNow = async () => {
    if (!gasUrl) return;
    const remote = await pullFromGas(gasUrl);
    const nextTrips = remote ? mergeTrips(trips, remote.trips) : trips;
    const nextExpenses = remote ? mergeExpenses(expenses, remote.expenses) : expenses;
    await persistAll(nextTrips, nextExpenses);
  };

  // 頁面右滑返回手勢
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const target = e.target as HTMLElement | null;
    if (target && target.closest(".leaflet-container, [role='dialog']")) return;
    swipeStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!swipeStartRef.current || e.changedTouches.length !== 1) return;
    const dx = e.changedTouches[0].clientX - swipeStartRef.current.x;
    const dy = Math.abs(e.changedTouches[0].clientY - swipeStartRef.current.y);
    swipeStartRef.current = null;
    if (dx > 85 && dx > dy * 1.8) {
      if (view === "main") navigateView("catalog", "left");
      else if (view === "catalog") navigateView("welcome", "left");
    }
  };

  if (!ready) {
    return (
      <>
        <div className="lg-ambient-bg" />
        <div className="min-h-dvh flex items-center justify-center text-[28px] sm:text-[32px] font-extrabold text-slate-700 tracking-tight">
          旅記
        </div>
      </>
    );
  }

  const tabIndex = activeTab === "list" ? 0 : activeTab === "map" ? 1 : 2;
  const viewAnimClass = viewDir === "left" ? "anim-slide-left" : "anim-slide-right";
  const tabAnimClass = tabDir === "left" ? "anim-slide-left" : "anim-slide-right";

  return (
    <>
      <div className="lg-ambient-bg" />

      <main
        id="app-shell"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="w-full max-w-[430px] min-h-dvh mx-auto px-4 pt-4 pb-32 relative overflow-x-hidden"
      >
        {/* View 1: Welcome */}
        {view === "welcome" && (
          <section key="view-welcome" className={`min-h-[calc(100dvh-110px)] flex flex-col justify-center items-center gap-8 relative ${viewAnimClass}`}>
            <button
              type="button"
              onClick={() => setIsSyncModalOpen(true)}
              aria-label="雲端同步"
              className="lg-btn lg-glass absolute top-0 right-0 !min-w-[48px] !min-h-[48px] w-12 h-12 flex items-center justify-center text-slate-700"
            >
              <Cloud size={20} strokeWidth={2} />
            </button>

            <div className="text-center select-none">
              <h1 className="text-[46px] font-extrabold text-slate-800 relative inline-block leading-none tracking-tight">
                旅記
                <span className="absolute -left-2 -right-2 -bottom-1 h-3 bg-[#5b8270]/30 rounded-full -z-10" />
              </h1>
            </div>

            <div className="w-full max-w-[300px] grid grid-rows-2 gap-3.5">
              <button
                id="btn-new-trip"
                type="button"
                onClick={() => {
                  setEditingTrip(null);
                  setIsTripModalOpen(true);
                }}
                className="lg-btn w-full h-[156px] rounded-[22px] bg-[#5b8270] text-white border border-white/40 shadow-lg flex flex-col items-center justify-center gap-2.5"
              >
                <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/35 flex items-center justify-center">
                  <Plane size={20} strokeWidth={2} />
                </div>
                <span className="text-lg font-bold">開啟新旅程</span>
              </button>

              <button
                id="btn-memories"
                type="button"
                onClick={() => navigateView("catalog", "right")}
                className="lg-btn lg-glass w-full h-[156px] rounded-[22px] text-slate-800 flex flex-col items-center justify-center gap-2"
              >
                <div className="w-10 h-10 rounded-xl bg-white/75 border border-white flex items-center justify-center text-slate-700">
                  <Clock size={20} strokeWidth={2} />
                </div>
                <span className="text-lg font-bold">回憶</span>
                <span className="tabular-nums text-xs font-semibold text-slate-600 bg-white/75 px-3 py-0.5 rounded-full">
                  {trips.length} 段旅程
                </span>
              </button>
            </div>
          </section>
        )}

        {/* View 2: Catalog */}
        {view === "catalog" && (
          <section key="view-catalog" className={`space-y-3 ${viewAnimClass}`}>
            <header className="lg-glass px-3.5 py-2.5 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => navigateView("welcome", "left")}
                aria-label="返回"
                className="lg-btn bg-white/60 border border-white/80 !min-w-[44px] !min-h-[44px] w-11 h-11 flex items-center justify-center text-slate-700"
              >
                <ChevronLeft size={20} strokeWidth={2} />
              </button>
              <h2 className="text-base font-bold text-slate-800">回憶旅程</h2>
              <div className="w-11 h-11" aria-hidden="true" />
            </header>

            <div className="space-y-2.5">
              {trips.map((t) => {
                const tExps = expenses.filter((e) => e.tripId === t.id);
                const tTotal = tExps.reduce((s, e) => s + (e.amountTwd || 0), 0);
                const isOngoing = ongoingTrip?.id === t.id;
                const isUpcoming = upcomingTrip?.id === t.id;

                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setCurrentTripId(t.id);
                      navigateView("main", "right");
                    }}
                    className="lg-card p-4 cursor-pointer transition active:scale-[0.98]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-bold text-slate-800 truncate">{t.name}</span>
                          {isOngoing && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#5b8270]/15 text-[#3e5e4f]">
                              進行中
                            </span>
                          )}
                          {isUpcoming && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#62768c]/15 text-[#455668]">
                              即將到來
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 tabular-nums mt-1">
                          {t.destination ? `${t.destination} · ` : ""}
                          {t.startDate}
                          {t.endDate ? ` ~ ${t.endDate}` : ""}
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label="刪除旅程"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDeleteTrip(t);
                        }}
                        className="lg-btn bg-white/60 border border-white/80 !min-w-[40px] !min-h-[40px] w-10 h-10 flex items-center justify-center text-slate-500 hover:text-[#a86c72]"
                      >
                        <Trash2 size={16} strokeWidth={2} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-200/60 text-xs font-semibold">
                      <span className="text-slate-500 tabular-nums">{tExps.length} 筆消費</span>
                      <span className="text-sm font-bold text-slate-800 tabular-nums">{formatTwd(tTotal)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* View 3: Trip Main */}
        {view === "main" && currentTrip && metrics && (
          <section key="view-main" className={`space-y-3.5 ${viewAnimClass}`}>
            <header className="lg-glass px-3 py-2.5 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => navigateView("catalog", "left")}
                aria-label="返回"
                className="lg-btn bg-white/60 border border-white/80 !min-w-[44px] !min-h-[44px] w-11 h-11 flex items-center justify-center text-slate-700"
              >
                <ChevronLeft size={20} strokeWidth={2} />
              </button>
              <div className="text-center min-w-0 flex-1">
                <div className="text-[15px] font-bold text-slate-800 truncate">{currentTrip.name}</div>
                <div className="text-[11px] text-slate-500 tabular-nums">
                  {currentTrip.startDate}
                  {currentTrip.endDate ? ` ~ ${currentTrip.endDate}` : ""} · {currentTrip.defaultCurrency}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsFilterOpen((v) => !v)}
                  aria-label="篩選"
                  className="lg-btn bg-white/60 border border-white/80 !min-w-[44px] !min-h-[44px] w-11 h-11 flex items-center justify-center text-slate-700"
                >
                  <SlidersHorizontal size={18} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTrip(currentTrip);
                    setIsTripModalOpen(true);
                  }}
                  aria-label="編輯旅程"
                  className="lg-btn bg-white/60 border border-white/80 !min-w-[44px] !min-h-[44px] w-11 h-11 flex items-center justify-center text-slate-700"
                >
                  <Edit3 size={18} strokeWidth={2} />
                </button>
              </div>
            </header>

            {/* 手風琴篩選條 */}
            <div className={`lg-accordion ${isFilterOpen ? "is-open" : ""}`}>
              <div className="lg-accordion-inner">
                <div className="lg-card p-3 space-y-2.5">
                  <div className="relative">
                    <Search size={15} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="搜尋品項或商家"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (activeTab !== "list") {
                          switchMainTab("list");
                        }
                      }}
                      className="w-full min-h-[42px] pl-9 pr-9 rounded-xl bg-white/75 border border-white text-xs text-slate-800"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        aria-label="清除搜尋"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition"
                      >
                        <X size={14} strokeWidth={2.2} />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCategoryFilter(null)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                        categoryFilter === null ? "bg-[#5b8270] text-white" : "bg-white/75 text-slate-600"
                      }`}
                    >
                      全部
                    </button>
                    {CATEGORY_LIST.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoryFilter(cat === categoryFilter ? null : cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                          categoryFilter === cat ? "bg-[#5b8270] text-white" : "bg-white/75 text-slate-600"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 預算燃燒率儀表板 */}
            <div className="lg-glass p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold text-slate-600">累積花費</span>
                <span className="text-xs font-bold text-[#5b8270] tabular-nums">
                  1 {currentTrip.defaultCurrency} = {rates[currentTrip.defaultCurrency] ?? 1} TWD
                </span>
              </div>
              <div className="text-[28px] font-extrabold text-slate-800 tabular-nums mt-0.5">
                {formatTwd(metrics.totalSpentTwd)}
              </div>

              {metrics.burnRatePct !== null && (
                <div className="h-2 rounded-full bg-slate-500/15 overflow-hidden mt-3">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${metrics.burnRatePct}%`,
                      background: metrics.burnRatePct > 90 ? "#a86c72" : "#5b8270",
                    }}
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="bg-white/55 border border-white/80 rounded-[14px] p-2.5 text-center">
                  <div className="text-[11px] text-slate-500">日均花費</div>
                  <div className="text-[13px] font-bold text-slate-800 tabular-nums mt-0.5">
                    {formatTwd(metrics.dailyAverageTwd)}
                  </div>
                </div>
                <div className="bg-white/55 border border-white/80 rounded-[14px] p-2.5 text-center">
                  <div className="text-[11px] text-slate-500">
                    {metrics.remainingBudgetTwd !== null ? "剩餘預算" : "天數"}
                  </div>
                  <div className="text-[13px] font-bold text-slate-800 tabular-nums mt-0.5">
                    {metrics.remainingBudgetTwd !== null
                      ? formatTwd(metrics.remainingBudgetTwd)
                      : `${metrics.tripDays} 天`}
                  </div>
                </div>
                <div className="bg-white/55 border border-white/80 rounded-[14px] p-2.5 text-center">
                  <div className="text-[11px] text-slate-500">消費筆數</div>
                  <div className="text-[13px] font-bold text-slate-800 tabular-nums mt-0.5">
                    {tripExpenses.length} 筆
                  </div>
                </div>
              </div>
            </div>

            {/* 3 大頁籤 + 平滑指示條 */}
            <div className="lg-glass relative grid grid-cols-3 p-1.5 rounded-[18px]">
              <div
                className="absolute top-1.5 left-1.5 h-[calc(100%-12px)] rounded-[13px] bg-white/90 shadow-sm pointer-events-none transition-transform duration-300"
                style={{
                  width: "calc((100% - 12px) / 3)",
                  transform: `translateX(${tabIndex * 100}%)`,
                  transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              />
              {(
                [
                  { id: "list", label: "明細" },
                  { id: "map", label: "足跡地圖" },
                  { id: "stats", label: "統計" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => switchMainTab(tab.id)}
                  className={`relative z-10 min-h-[42px] text-[13px] font-semibold transition-colors ${
                    activeTab === tab.id ? "text-slate-800" : "text-slate-500"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 頁籤內容方向性滑入 */}
            <div className="overflow-hidden">
              {activeTab === "list" && (
                <div key="tab-list" data-testid="expense-list-panel" className={`space-y-2.5 ${tabAnimClass}`}>
                  {groupedByDate.length > 0 && (() => {
                    const allExpanded = groupedByDate.every((g) => isDateExpanded(g.date));
                    return (
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          data-testid="toggle-all-dates"
                          onClick={allExpanded ? collapseAllDates : expandAllDates}
                          className="px-3 py-1.5 rounded-full bg-white/70 border border-white text-xs font-bold text-slate-700 flex items-center gap-1 transition active:scale-95"
                        >
                          {allExpanded ? (
                            <>
                              <ChevronsDownUp size={13} strokeWidth={2} />
                              <span>全部收起</span>
                            </>
                          ) : (
                            <>
                              <ChevronsUpDown size={13} strokeWidth={2} />
                              <span>全部展開</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })()}

                  {groupedByDate.length === 0 ? (
                    <div className="lg-card p-8 text-center text-sm text-slate-500">尚無消費紀錄</div>
                  ) : (
                    groupedByDate.map((group) => {
                      const open = isDateExpanded(group.date);
                      return (
                        <div key={group.date} className="space-y-2">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedDates((prev) => ({ ...prev, [group.date]: !open }))
                            }
                            className="lg-glass w-full px-3.5 py-2.5 rounded-[16px] flex items-center justify-between text-left"
                          >
                            <div className="flex items-center gap-2">
                              <ChevronDown
                                size={16}
                                strokeWidth={2}
                                className={`text-slate-500 transition-transform duration-300 ${open ? "rotate-0" : "-rotate-90"}`}
                              />
                              <span className="text-xs font-bold text-slate-800 tabular-nums">{group.date}</span>
                              <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                                {group.items.length} 筆
                              </span>
                            </div>
                            <span className="text-xs font-bold text-[#5b8270] tabular-nums">
                              {formatTwd(group.totalTwd)}
                            </span>
                          </button>

                          <div className={`lg-accordion ${open ? "is-open" : ""}`}>
                            <div className="lg-accordion-inner space-y-2">
                              {group.items.map((exp) => {
                                const meta = CATEGORY_COLORS[exp.category] || CATEGORY_COLORS["其他"];
                                return (
                                  <div
                                    key={exp.id}
                                    onClick={() => setDetailExpense(exp)}
                                    className="lg-card p-3.5 flex items-center justify-between gap-3 cursor-pointer transition active:scale-[0.98]"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                        style={{ background: meta.bg, color: meta.color }}
                                      >
                                        <CategoryIcon category={exp.category} size={18} />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="text-sm font-bold text-slate-800 truncate">{exp.title}</div>
                                        <div className="text-[11px] text-slate-500 tabular-nums truncate">
                                          {exp.category}
                                          {exp.merchant ? ` · ${exp.merchant}` : ""}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <div className="text-sm font-bold text-slate-800 tabular-nums">
                                        {formatTwd(exp.amountTwd)}
                                      </div>
                                      <div className="text-[11px] text-slate-500 tabular-nums">
                                        {formatForeign(exp.originalAmount, exp.originalCurrency)}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeTab === "map" && (
                <div key="tab-map" className={tabAnimClass}>
                  <TripMapView
                    expenses={filteredExpenses}
                    onSelectExpense={(exp) => setDetailExpense(exp)}
                  />
                </div>
              )}

              {activeTab === "stats" && (
                <div key="tab-stats" className={tabAnimClass}>
                  <StatsView
                    expenses={tripExpenses}
                    onSelectCategory={(cat) => {
                      setCategoryFilter(cat);
                      setIsFilterOpen(true);
                      switchMainTab("list");
                    }}
                  />
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Bottom Dock Portaled to document.body so transform animations never break position:fixed */}
      {view === "main" && currentTrip &&
        createPortal(
          <div
            id="bottom-action-dock"
            className="lg-glass fixed left-1/2 -translate-x-1/2 bottom-[max(16px,env(safe-area-inset-bottom,16px))] w-[calc(100%-32px)] max-w-[398px] p-2 flex items-center gap-2 z-50"
          >
            <button
              type="button"
              onClick={() => downloadTripReportHtml(currentTrip, tripExpenses)}
              className="lg-btn flex-1 bg-white/70 border border-white/90 text-slate-800 text-sm font-semibold flex items-center justify-center gap-1.5"
            >
              <Download size={16} strokeWidth={2} />
              <span>匯出報告</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingExpense(null);
                setIsExpenseModalOpen(true);
              }}
              className="lg-btn flex-[1.4] bg-[#5b8270] text-white text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Plus size={18} strokeWidth={2} />
              <span>記一筆</span>
            </button>
          </div>,
          document.body
        )}

      {/* Modals (Portaled to document.body) */}
      <TripFormModal
        isOpen={isTripModalOpen}
        editingTrip={editingTrip}
        onClose={() => setIsTripModalOpen(false)}
        onSave={handleSaveTrip}
      />

      {currentTrip && (
        <ExpenseFormModal
          isOpen={isExpenseModalOpen}
          trip={currentTrip}
          rates={rates}
          editingExpense={editingExpense}
          onClose={() => setIsExpenseModalOpen(false)}
          onSave={handleSaveExpense}
        />
      )}

      <ExpenseDetailModal
        expense={detailExpense}
        onClose={() => setDetailExpense(null)}
        onEdit={(exp) => {
          setEditingExpense(exp);
          setIsExpenseModalOpen(true);
        }}
        onDelete={handleDeleteExpense}
      />

      <SyncSettingsModal
        isOpen={isSyncModalOpen}
        gasUrl={gasUrl}
        trips={trips}
        expenses={expenses}
        onSaveGasUrl={(url) => {
          setGasUrl(url);
          localStorage.setItem(KEY_GAS_URL, url);
        }}
        onSyncNow={handleSyncNow}
        onImportBackup={async (t, e) => {
          await persistAll(t, e);
          if (t[0]) setCurrentTripId(t[0].id);
        }}
        onClose={() => setIsSyncModalOpen(false)}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(pendingDeleteTrip)}
        targetName={pendingDeleteTrip?.name || ""}
        onCancel={() => setPendingDeleteTrip(null)}
        onConfirm={() => {
          if (pendingDeleteTrip) handleDeleteTrip(pendingDeleteTrip.id);
          setPendingDeleteTrip(null);
        }}
      />
    </>
  );
}
