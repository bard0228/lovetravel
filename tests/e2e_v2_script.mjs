export default async function ({ page, assert }) {
  await page.waitForSelector("#btn-memories", { visible: true, timeout: 5000 });

  // 1. 檢查歡迎頁「旅記」標題已恢復原本大小 (~46px)
  const h1Size = await page.evaluate(() => {
    const h1 = document.querySelector("h1");
    return h1 ? parseFloat(getComputedStyle(h1).fontSize) : 0;
  });
  assert(h1Size >= 42 && h1Size <= 56, `歡迎頁「旅記」字體應恢復原本大小 (~46px)，目前為 ${h1Size}px`);

  // 1.1 檢查右上角雲端同步按鈕為透明玉子燒圖示，且點擊能開啟同步彈窗
  const syncBtnImg = await page.$("button[aria-label='雲端同步'] img[src*='tamago-sushi-nobg.png']");
  assert(syncBtnImg, "歡迎頁雲端同步按鈕未包含透明玉子燒圖示");
  await page.click("button[aria-label='雲端同步']");
  await new Promise((r) => setTimeout(r, 300));
  const syncModalTitle = await page.evaluate(() => document.body.innerText);
  assert(syncModalTitle.includes("雲端同步與備份"), "點擊玉子燒按鈕未能開啟同步彈窗");
  await page.click("button[aria-label='關閉']");
  await new Promise((r) => setTimeout(r, 250));

  // 2. 進入回憶 -> 檢查右上角已移除「+」按鈕、且刪除旅程會跳出確認視窗
  await page.click("#btn-memories");
  await new Promise((r) => setTimeout(r, 400));
  const addTripBtnInCatalog = await page.$("button[aria-label='新增旅程']");
  assert(!addTripBtnInCatalog, "回憶旅程頁面右上角不應再有「新增旅程 (+)」按鈕");

  const trashBtn = await page.$("button[aria-label='刪除旅程']");
  assert(trashBtn, "找不到刪除旅程按鈕");
  await trashBtn.click();
  await new Promise((r) => setTimeout(r, 300));
  const confirmText = await page.evaluate(() => document.body.innerText);
  assert(confirmText.includes("確定刪除"), "刪除旅程未跳出確認視窗");
  await page.click("button[aria-label='關閉']");
  await new Promise((r) => setTimeout(r, 250));

  // 3. 進入東京長岡花火主頁 -> 檢查單一「全部展開 / 全部收起」切換按鈕
  await page.click("div.lg-card");
  await new Promise((r) => setTimeout(r, 450));
  const toggleBtn = await page.$("[data-testid='toggle-all-dates']");
  assert(toggleBtn, "缺少單一全部展開/全部收起切換按鈕");
  const initialToggleText = await page.evaluate((el) => el.innerText.trim(), toggleBtn);
  assert(
    initialToggleText === "全部展開" || initialToggleText === "全部收起",
    `切換按鈕文字異常: ${initialToggleText}`
  );
  await toggleBtn.click();
  await new Promise((r) => setTimeout(r, 200));
  const toggledText = await page.evaluate((el) => el.innerText.trim(), toggleBtn);
  assert(toggledText !== initialToggleText, `點擊切換按鈕後狀態應改變，仍為 ${toggledText}`);

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

  // 5. 切到「足跡地圖」再搜尋 -> 應自動切回「明細」，且輸入後右側出現叉叉可一鍵清除
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

  const clearBtn = await page.$("button[aria-label='清除搜尋']");
  assert(clearBtn, "搜尋輸入文字後右側缺少叉叉清除按鈕");
  await clearBtn.click();
  await new Promise((r) => setTimeout(r, 200));
  const clearedVal = await page.$eval("input[placeholder='搜尋品項或商家']", (el) => el.value);
  assert(clearedVal === "", `點擊叉叉後搜尋欄應清空，目前為 "${clearedVal}"`);
}
