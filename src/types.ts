export type CategoryType = "機票" | "交通" | "住宿" | "吃喝" | "購物" | "其他";

export type PaymentMethod = "信用卡" | "現金" | "行動支付" | "其他";

export interface CompressedImage {
  id: string;
  dataUrl?: string; // Base64 or Drive thumbnail URL
  driveUrl?: string;
  originalSizeKb?: number;
  compressedSizeKb?: number;
  typeHint?: "item" | "receipt" | "general";
  name?: string;
}

export interface ExpenseItem {
  id: string;
  tripId: string;
  title: string;
  category: CategoryType;
  originalAmount: number;
  originalCurrency: string;
  exchangeRate: number;
  amountTwd: number;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  merchant?: string;
  paymentMethod: PaymentMethod;
  coordinates?: string; // WGS 84 "lat, lng"
  notes?: string;
  images: CompressedImage[];
  aiAnalysisSummary?: string;
  createdAt: number;
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  defaultCurrency: string;
  budgetTwd?: number | null;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  driveFolderId?: string;
  updatedAt?: string;
}

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface BackupPayload {
  version: number;
  exportedAt: string;
  trips: Trip[];
  expenses: ExpenseItem[];
  exchangeRates?: Record<string, number>;
}
