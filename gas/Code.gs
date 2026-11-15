const SHEET_ID = "1Y6CyKLqJg2iR_YJa4WmaF6m3f771bmFuASqxVCXQxIw";

function doGet(e) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const trips = readSheetObjects_(ss.getSheetByName("Trips"));
  const expenses = readSheetObjects_(ss.getSheetByName("Expenses")).map((row) => {
    let images = [];
    try { images = JSON.parse(row.imagesJson || "[]"); } catch (_) {}
    return {
      id: row.id,
      tripId: row.tripId,
      date: row.date,
      time: row.time || undefined,
      category: row.category || "其他",
      title: row.title,
      merchant: row.merchant || undefined,
      originalAmount: Number(row.originalAmount) || 0,
      originalCurrency: row.originalCurrency || "JPY",
      exchangeRate: Number(row.exchangeRate) || 1,
      amountTwd: Number(row.amountTwd) || 0,
      paymentMethod: row.paymentMethod || "信用卡",
      coordinates: row.coordinates || undefined,
      notes: row.notes || undefined,
      images,
      createdAt: Number(row.createdAt) || 0,
    };
  });
  return ContentService.createTextOutput(JSON.stringify({ trips, expenses }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents || "{}");
  const ss = SpreadsheetApp.openById(SHEET_ID);
  if (Array.isArray(body.trips)) {
    writeSheetObjects_(ss.getSheetByName("Trips"),
      ["id","name","destination","defaultCurrency","budgetTwd","startDate","endDate","driveFolderId","updatedAt"],
      body.trips
    );
  }
  if (Array.isArray(body.expenses)) {
    // 找出本次同步前已經存在的 Drive 照片
    const oldRows = readSheetObjects_(ss.getSheetByName("Expenses"));
    const oldDriveFileIds = new Set();
    oldRows.forEach((row) => {
      try {
        const imgs = JSON.parse(row.imagesJson || "[]");
        imgs.forEach((img) => {
          if (img.driveUrl) {
            const m = String(img.driveUrl).match(/[-\w]{25,}/);
            if (m) oldDriveFileIds.add(m[0]);
          }
        });
      } catch (_) {}
    });

    const currentDriveFileIds = new Set();
    const rows = body.expenses.map((x) => {
      (x.images || []).forEach((img) => {
        if (img.driveUrl) {
          const m = String(img.driveUrl).match(/[-\w]{25,}/);
          if (m) currentDriveFileIds.add(m[0]);
        }
      });
      return {
        ...x,
        imagesJson: JSON.stringify((x.images || []).map((img) => ({ id: img.id, typeHint: img.typeHint, name: img.name, driveUrl: img.driveUrl })))
      };
    });

    // 自動將已從 App 刪除的照片檔案移入 Drive 垃圾桶
    oldDriveFileIds.forEach((fileId) => {
      if (!currentDriveFileIds.has(fileId)) {
        try {
          DriveApp.getFileById(fileId).setTrashed(true);
        } catch (_) {}
      }
    });

    writeSheetObjects_(ss.getSheetByName("Expenses"),
      ["id","tripId","date","time","category","title","merchant","originalAmount","originalCurrency","exchangeRate","amountTwd","paymentMethod","coordinates","notes","imagesJson","createdAt"],
      rows
    );
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function readSheetObjects_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = r[i]; });
    return obj;
  });
}

function writeSheetObjects_(sheet, headers, items) {
  sheet.clearContents();
  const rows = [headers].concat(items.map((item) => headers.map((h) => item[h] !== undefined && item[h] !== null ? item[h] : "")));
  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
}
