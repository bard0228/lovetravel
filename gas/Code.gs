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
    const rows = body.expenses.map((x) => ({
      ...x,
      imagesJson: JSON.stringify((x.images || []).map((img) => ({ id: img.id, typeHint: img.typeHint, name: img.name, driveUrl: img.driveUrl })))
    }));
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
