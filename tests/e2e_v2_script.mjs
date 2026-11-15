export default async function ({ page, assert }) {
  await page.waitForSelector("#btn-memories", { visible: true, timeout: 5000 });

  // 1. 檢查歡迎頁「旅記」標題字體大小 >= 80px
  const h1Size = await page.evaluate(() => {
    const h1 = document.querySelector("h1");
    return h1 ? parseFloat(getComputedStyle(h1).fontSize) : 0;
  });
  assert(h1Size >= 80, `歡迎頁「旅記」字體應放大至 >= 80px，目前僅 ${h1Size}px`);

  // 2. 進入回憶 -> 檢查刪除旅程會跳出確認視窗
  await page.click("#btn-memories");
  await new Promise((r) => setTimeout(r, 400));
  const trashBtn = await page.$("button[aria-label='刪除旅程']");
  assert(trashBtn, "找不到刪除旅程按鈕");
  await trashBtn.click();
  await new Promise((r) => setTimeout(r, 300));
  const confirmText = await page.evaluate(() => document.body.innerText);
  assert(confirmText.includes("確定刪除"), "刪除旅程未跳出確認視窗");
  await page.click("button[aria-label='關閉']");
  await new Promise((r) => setTimeout(r, 250));

  // 3. 進入東京長岡花火主頁 -> 檢查日期分組與一鍵全部展開/全部收起按鈕
  await page.click("div.lg-card");
  await new Promise((r) => setTimeout(r, 450));
  const bodyText = await page.evaluate(() => document.body.innerText);
  assert(bodyText.includes("全部展開") && bodyText.includes("全部收起"), "缺少一鍵全部展開/全部收起按鈕");

  // 4. 檢查底部「匯出報告 / 記一筆」Dock 固定在視口底部，未與上方內容重疊
  const dockRect = await page.evaluate(() => {
    const dock = document.querySelector("#bottom-action-dock");
    if (!dock) return null;
    const r = dock.getBoundingClientRect();
    return { bottom: r.bottom, top: r.top, winH: window.innerHeight };
  });
  assert(
    dockRect && dockRect.bottom <= dockRect.winH && dockRect.top >= dockRect.winH - 120,
    `底部 Dock 位置異常: ${JSON.stringify(dockRect)}`
  );

  // 5. 切到「足跡地圖」再搜尋 -> 應自動切回「明細」
  await page.click("div.grid-cols-3.p-1\\.5 button:nth-of-type(2)");
  await new Promise((r) => setTimeout(r, 350));
  await page.click("button[aria-label='篩選']");
  await new Promise((r) => setTimeout(r, 350));
  await page.type("input[placeholder='搜尋品項或商家']", "一蘭");
  await new Promise((r) => setTimeout(r, 300));
  const isListActive = await page.evaluate(() =>
    Boolean(document.querySelector("[data-testid='expense-list-panel']"))
  );
  assert(isListActive, "搜尋時未自動切回「明細」頁籤");
}
