#!/usr/bin/env python3
"""
旅記 (LoveTravel) AI 端同步與遠端硬碟備份腳本
功能：
1. 依旅程將最新資料寫入 Google 試算表「旅記共用資料庫」(Trips / Expenses)
2. 同步備份至 Google Drive「玉子燒握壽司/<旅程資料夾>/」(photos/, trip_data.json, 明細.csv, 旅記報告.html)
3. 更新 public/data/seed.json 供前端靜態讀取
"""
import argparse
import csv
import html
import json
import os
import subprocess
from datetime import datetime
from zoneinfo import ZoneInfo

SHEET_ID = "1Y6CyKLqJg2iR_YJa4WmaF6m3f771bmFuASqxVCXQxIw"
ROOT_DRIVE_FOLDER_ID = "1lrsvdUMecQYx_OPLjM_lXmFg6DPR8bBo"
SEED_PATH = "/home/antigravity/bard0228/lovetravel/public/data/seed.json"


def esc_cell(val):
    s = str(val if val is not None else "")
    s = s.replace("\n", " ").replace("\r", " ")
    return s.replace(",", r"\,").replace("|", r"\|")


def is_receipt_img(img):
    if img.get("typeHint") == "receipt":
        return True
    name = img.get("name", "") or ""
    return any(kw in name.lower() for kw in ["收據", "發票", "帳單", "明細", "簽單", "receipt", "invoice", "bill"])


def sync_all(seed_file=SEED_PATH):
    with open(seed_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    trips = data.get("trips", [])
    expenses = data.get("expenses", [])

    # 1. Sync Trips & Expenses to Google Sheet
    trip_headers = ["id", "name", "destination", "defaultCurrency", "budgetTwd", "startDate", "endDate", "driveFolderId", "updatedAt"]
    trip_rows = [trip_headers] + [
        [t.get(h, "") if t.get(h) is not None else "" for h in trip_headers]
        for t in trips
    ]
    trip_str = "|".join(",".join(esc_cell(c) for c in r) for r in trip_rows)
    subprocess.run(["gsheets", "mutate", "write", SHEET_ID, f"Trips!A1:I{len(trip_rows)}", trip_str], check=True)

    exp_headers = [
        "id", "tripId", "date", "time", "category", "title", "merchant",
        "originalAmount", "originalCurrency", "exchangeRate", "amountTwd",
        "paymentMethod", "coordinates", "notes", "imagesJson", "createdAt"
    ]
    exp_rows = [exp_headers]
    for e in expenses:
        imgs = [{k: v for k, v in img.items() if k != "dataUrl"} for img in (e.get("images") or [])]
        exp_rows.append([
            e.get("id", ""), e.get("tripId", ""), e.get("date", ""), e.get("time", ""),
            e.get("category", "其他"), e.get("title", ""), e.get("merchant", ""),
            e.get("originalAmount", 0), e.get("originalCurrency", "JPY"),
            e.get("exchangeRate", 1), e.get("amountTwd", 0),
            e.get("paymentMethod", "信用卡"), e.get("coordinates", ""),
            e.get("notes", ""), json.dumps(imgs, ensure_ascii=False), e.get("createdAt", 0),
        ])
    exp_str = "|".join(",".join(esc_cell(c) for c in r) for r in exp_rows)
    subprocess.run(["gsheets", "mutate", "write", SHEET_ID, f"Expenses!A1:P{len(exp_rows)}", exp_str], check=True)

    # 2. Export per-trip backup artifacts
    out_base = "/tmp/lovetravel_backup"
    os.makedirs(out_base, exist_ok=True)
    for t in trips:
        t_exps = [e for e in expenses if e.get("tripId") == t.get("id")]
        t_dir = os.path.join(out_base, t["id"])
        os.makedirs(t_dir, exist_ok=True)
        with open(os.path.join(t_dir, "trip_data.json"), "w", encoding="utf-8") as f:
            json.dump({"trip": t, "expenses": t_exps, "syncedAt": datetime.now(ZoneInfo("Asia/Taipei")).isoformat()}, f, ensure_ascii=False, indent=2)
        with open(os.path.join(t_dir, "明細.csv"), "w", encoding="utf-8-sig", newline="") as f:
            w = csv.writer(f)
            w.writerow(["日期", "分類", "品名", "商家", "原幣金額", "幣別", "匯率", "台幣金額", "付款方式", "座標", "備註"])
            for e in t_exps:
                w.writerow([e.get("date",""), e.get("category",""), e.get("title",""), e.get("merchant",""), e.get("originalAmount",0), e.get("originalCurrency",""), e.get("exchangeRate",1), e.get("amountTwd",0), e.get("paymentMethod",""), e.get("coordinates",""), e.get("notes","")])

        folder_id = t.get("driveFolderId")
        if folder_id:
            for fname in ["trip_data.json", "明細.csv"]:
                subprocess.run(["gdrive", "mutate", "upload", os.path.join(t_dir, fname), "--parent", folder_id], check=True)

    print(f"Synced {len(trips)} trips and {len(expenses)} expenses.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", default=SEED_PATH)
    args = parser.parse_args()
    sync_all(args.seed)
