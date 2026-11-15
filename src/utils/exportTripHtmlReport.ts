import { Trip, ExpenseItem, CompressedImage } from "../types";
import { formatForeign, formatTwd } from "./currencies";
import { normalizeDate } from "./tripDates";

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
  const safeName = escapeHtml(trip.name || "旅記報告");

  const itemsHtml = sorted
    .map((e) => {
      const imgs = getReportDisplayImages(e);
      const imgsRowHtml =
        imgs.length > 0
          ? `<div class="photo-row">${imgs
              .map((img) => {
                const src = img.dataUrl || img.driveUrl || "";
                return src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(e.title)}" />` : "";
              })
              .join("")}</div>`
          : "";

      return `<div class="exp-block">
        <div class="exp-row">
          <div class="col-date num">${escapeHtml(e.date)}</div>
          <div class="col-cat"><span class="badge">${escapeHtml(e.category)}</span></div>
          <div class="col-title">
            <strong>${escapeHtml(e.title)}</strong>
            ${e.merchant ? `<div class="sub">${escapeHtml(e.merchant)}</div>` : ""}
          </div>
          <div class="col-amt num">
            <div>${escapeHtml(formatTwd(e.amountTwd))}</div>
            <div class="sub">${escapeHtml(formatForeign(e.originalAmount, e.originalCurrency))}</div>
          </div>
        </div>
        ${imgsRowHtml}
      </div>`;
    })
    .join("");

  return `<!doctype html>
<html lang="zh-TW">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${safeName} · 旅記報告</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js" defer></script>
<style>
  body { font-family: "Plus Jakarta Sans", "Noto Sans TC", sans-serif; background: #f0f3f8; color: #1e293b; margin: 0; padding: 18px; }
  .toolbar { max-width: 820px; margin: 0 auto 14px; display: flex; justify-content: flex-end; gap: 10px; }
  .pdf-btn { min-height: 44px; padding: 0 18px; border: none; border-radius: 14px; background: #5b8270; color: #fff; font-weight: 700; font-size: 14px; cursor: pointer; box-shadow: 0 6px 16px rgba(91,130,112,0.28); }
  .wrap { max-width: 820px; margin: 0 auto; background: rgba(255,255,255,0.94); border: 1px solid #fff; border-radius: 22px; padding: 22px; box-shadow: 0 12px 32px rgba(60,74,92,0.08); }
  h1 { margin: 0 0 6px; font-size: 24px; }
  .meta { color: #64748b; font-size: 13px; margin-bottom: 14px; }
  .total { font-size: 22px; font-weight: 800; color: #5b8270; margin-bottom: 16px; }
  .list-head { display: grid; grid-template-columns: 92px 60px 1fr 100px; gap: 8px; padding: 8px 6px; border-bottom: 1.5px solid rgba(100,116,139,0.2); font-size: 12px; color: #64748b; font-weight: 700; }
  .list-head .col-amt { text-align: right; }
  .exp-block { border-bottom: 1px solid rgba(100,116,139,0.14); padding: 10px 6px; break-inside: avoid; page-break-inside: avoid; }
  .exp-row { display: grid; grid-template-columns: 92px 60px 1fr 100px; gap: 8px; align-items: start; font-size: 13px; }
  .col-amt { text-align: right; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: rgba(91,130,112,0.14); color: #3d5d4e; font-size: 11px; font-weight: 700; white-space: nowrap; }
  .sub { font-size: 11px; color: #64748b; margin-top: 2px; }
  .num { font-variant-numeric: tabular-nums; }
  .photo-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; width: 100%; }
  .photo-row img { height: 112px; width: auto; max-width: calc(33.333% - 6px); object-fit: cover; border-radius: 10px; display: block; }
  @media (max-width: 520px) {
    .list-head, .exp-row { grid-template-columns: 78px 48px 1fr 78px; gap: 6px; font-size: 12px; }
    .photo-row img { height: 92px; max-width: calc(50% - 4px); }
  }
  @media print { .toolbar { display: none !important; } body { background: #fff; padding: 0; } .wrap { box-shadow: none; border: none; } }
</style>
</head>
<body>
  <div class="toolbar">
    <button id="btn-pdf-share" type="button" class="pdf-btn" onclick="exportAndSharePdf()">轉存 PDF 並分享</button>
  </div>
  <div id="report-root" class="wrap">
    <h1>${safeName}</h1>
    <div class="meta">${escapeHtml(trip.destination)} · ${escapeHtml(trip.startDate)}${trip.endDate ? ` ~ ${escapeHtml(trip.endDate)}` : ""} · 共 ${sorted.length} 筆</div>
    <div class="total num">總計 ${escapeHtml(formatTwd(totalTwd))}</div>
    <div class="list-head">
      <div>日期</div><div>分類</div><div>消費內容</div><div class="col-amt">金額</div>
    </div>
    ${itemsHtml}
  </div>
  <script>
    async function exportAndSharePdf() {
      var btn = document.getElementById("btn-pdf-share");
      var el = document.getElementById("report-root");
      var filename = "${safeName}_旅記報告.pdf";
      if (!window.html2pdf) {
        window.print();
        return;
      }
      btn.disabled = true;
      btn.textContent = "PDF 產生中...";
      try {
        var opt = { margin: 10, filename: filename, image: { type: "jpeg", quality: 0.92 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: "mm", format: "a4", orientation: "portrait" } };
        var pdfBlob = await window.html2pdf().set(opt).from(el).outputPdf("blob");
        var file = new File([pdfBlob], filename, { type: "application/pdf" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: filename });
        } else {
          var url = URL.createObjectURL(pdfBlob);
          var a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } catch (e) {
        if (e && e.name !== "AbortError") window.print();
      } finally {
        btn.disabled = false;
        btn.textContent = "轉存 PDF 並分享";
      }
    }
  </script>
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
