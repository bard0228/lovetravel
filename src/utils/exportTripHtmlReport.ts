import { Trip, ExpenseItem, CompressedImage } from "../types";
import { formatForeign, formatTwd } from "./currencies";
import { normalizeDate } from "./tripDates";

/**
 * 匯出報告照片過濾鐵律：
 * 若照片屬於發票、收據、帳單明細（typeHint === "receipt" 或檔名含關鍵字），
 * 報告中一律自動隱藏不附圖，僅呈現實品照 / 風景美食照。
 */
export function getReportDisplayImages(item: ExpenseItem): CompressedImage[] {
  if (!item.images || item.images.length === 0) return [];
  return item.images.filter((img) => {
    if (img.typeHint === "receipt") return false;
    if (img.name && /收據|發票|帳單|明細|簽單|receipt|invoice|bill/i.test(img.name)) {
      return false;
    }
    return true;
  });
}

function escapeHtml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function buildTripReportHtml(trip: Trip, expenses: ExpenseItem[]): string {
  const sorted = [...expenses].sort((a, b) =>
    normalizeDate(a.date).localeCompare(normalizeDate(b.date))
  );
  const totalTwd = sorted.reduce((s, e) => s + (e.amountTwd || 0), 0);

  const rows = sorted
    .map((e) => {
      const imgs = getReportDisplayImages(e);
      const imgsHtml = imgs
        .map((img) => {
          const src = img.dataUrl || img.driveUrl || "";
          return src
            ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(e.title)}" style="max-width:180px;border-radius:12px;margin-top:8px;display:block;" />`
            : "";
        })
        .join("");

      return `<tr>
        <td class="num">${escapeHtml(e.date)}</td>
        <td><span class="badge">${escapeHtml(e.category)}</span></td>
        <td><strong>${escapeHtml(e.title)}</strong>${e.merchant ? `<div class="sub">${escapeHtml(e.merchant)}</div>` : ""}${imgsHtml}</td>
        <td class="num" style="text-align:right;">
          <div>${escapeHtml(formatTwd(e.amountTwd))}</div>
          <div class="sub">${escapeHtml(formatForeign(e.originalAmount, e.originalCurrency))}</div>
        </td>
      </tr>`;
    })
    .join("");

  return `<!doctype html>
<html lang="zh-TW">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(trip.name)} · 旅記報告</title>
<style>
  body { font-family: "Plus Jakarta Sans", "Noto Sans TC", sans-serif; background: #f0f3f8; color: #1e293b; margin: 0; padding: 24px; }
  .wrap { max-width: 820px; margin: 0 auto; background: rgba(255,255,255,0.82); border: 1px solid rgba(255,255,255,0.9); border-radius: 24px; padding: 24px; box-shadow: 0 12px 32px rgba(60,74,92,0.08); }
  h1 { margin: 0 0 6px; font-size: 26px; }
  .meta { color: #64748b; font-size: 13px; margin-bottom: 18px; }
  .total { font-size: 24px; font-weight: 800; color: #5b8270; margin-bottom: 18px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 12px 10px; border-bottom: 1px solid rgba(100,116,139,0.14); text-align: left; font-size: 14px; vertical-align: top; }
  th { font-size: 12px; color: #64748b; font-weight: 700; }
  .badge { display: inline-block; padding: 3px 9px; border-radius: 999px; background: rgba(91,130,112,0.14); color: #3d5d4e; font-size: 12px; font-weight: 600; }
  .sub { font-size: 12px; color: #64748b; margin-top: 2px; }
  .num { font-variant-numeric: tabular-nums; }
</style>
</head>
<body>
  <div class="wrap">
    <h1>${escapeHtml(trip.name)}</h1>
    <div class="meta">${escapeHtml(trip.destination)} · ${escapeHtml(trip.startDate)}${trip.endDate ? ` ~ ${escapeHtml(trip.endDate)}` : ""} · 共 ${sorted.length} 筆</div>
    <div class="total num">總計 ${escapeHtml(formatTwd(totalTwd))}</div>
    <table>
      <thead><tr><th>日期</th><th>分類</th><th>消費內容</th><th style="text-align:right;">金額</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</body>
</html>`;
}

export function downloadTripReportHtml(trip: Trip, expenses: ExpenseItem[]): void {
  const htmlContent = buildTripReportHtml(trip, expenses);
  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${trip.name}_旅記報告.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
