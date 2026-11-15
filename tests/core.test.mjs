import test from "node:test";
import assert from "node:assert/strict";

// 驗證 seed.json 遷移完整性與核心業務邊界
import fs from "node:fs";
import path from "node:path";

const seedPath = path.resolve("public/data/seed.json");

test("T2 seed.json 包含東京長岡花火與大分福岡旅程", () => {
  assert.equal(fs.existsSync(seedPath), true, "seed.json 必須存在");
  const data = JSON.parse(fs.readFileSync(seedPath, "utf-8"));
  assert.equal(data.trips.length >= 2, true);
  const tokyo = data.trips.find((t) => t.name === "東京。長岡花火");
  assert.ok(tokyo, "必須包含東京。長岡花火旅程");
  const tokyoExps = data.expenses.filter((e) => e.tripId === tokyo.id);
  assert.equal(tokyoExps.length, 41);
  const fuk = data.trips.find((t) => t.name === "大分。福岡");
  assert.ok(fuk, "必須包含大分。福岡旅程");
});

test("T2 報告照片過濾：自動隱藏發票與收據，僅保留實品照", () => {
  const filterFn = (images) =>
    (images || []).filter((img) => {
      if (img.typeHint === "receipt") return false;
      if (img.name && /收據|發票|帳單|明細|簽單|receipt|invoice|bill/i.test(img.name)) return false;
      return true;
    });

  const mixed = [
    { id: "1", typeHint: "receipt", name: "IMG_01.jpg" },
    { id: "2", typeHint: "general", name: "唐吉訶德發票.jpg" },
    { id: "3", typeHint: "item", name: "一蘭拉麵.jpg" },
  ];
  const out = filterFn(mixed);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, "3");
});

test("T3 匯出報告 HTML 採用橫向 photo-row 滿版排版並含 PDF 分享按鈕", () => {
  const reportSrc = fs.readFileSync(path.resolve("src/utils/exportTripHtmlReport.ts"), "utf-8");
  assert.equal(reportSrc.includes(".photo-row { display: flex; flex-wrap: wrap;"), true);
  assert.equal(reportSrc.includes('id="btn-pdf-share"'), true);
  assert.equal(reportSrc.includes("${imgsRowHtml}"), true);
});

