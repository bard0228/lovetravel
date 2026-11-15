export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  defaultRate: number;
  country: string;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
  JPY: { code: "JPY", name: "日圓", symbol: "¥", defaultRate: 0.212, country: "日本" },
  KRW: { code: "KRW", name: "韓元", symbol: "₩", defaultRate: 0.024, country: "韓國" },
  USD: { code: "USD", name: "美金", symbol: "$", defaultRate: 32.2, country: "美國" },
  EUR: { code: "EUR", name: "歐元", symbol: "€", defaultRate: 34.8, country: "歐洲" },
  THB: { code: "THB", name: "泰銖", symbol: "฿", defaultRate: 0.94, country: "泰國" },
  GBP: { code: "GBP", name: "英鎊", symbol: "£", defaultRate: 41.5, country: "英國" },
  CNY: { code: "CNY", name: "人民幣", symbol: "¥", defaultRate: 4.45, country: "中國" },
  HKD: { code: "HKD", name: "港幣", symbol: "HK$", defaultRate: 4.12, country: "香港" },
  SGD: { code: "SGD", name: "新加坡幣", symbol: "S$", defaultRate: 24.2, country: "新加坡" },
  VND: { code: "VND", name: "越南盾", symbol: "₫", defaultRate: 0.0013, country: "越南" },
  AUD: { code: "AUD", name: "澳幣", symbol: "A$", defaultRate: 21.3, country: "澳洲" },
  TWD: { code: "TWD", name: "新台幣", symbol: "NT$", defaultRate: 1.0, country: "台灣" },
};

export function getDefaultRatesMap(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const [k, v] of Object.entries(SUPPORTED_CURRENCIES)) {
    map[k] = v.defaultRate;
  }
  return map;
}

export function formatTwd(amount: number): string {
  return `NT$ ${Math.round(amount).toLocaleString()}`;
}

export function formatForeign(amount: number, currencyCode: string): string {
  const info = SUPPORTED_CURRENCIES[currencyCode];
  const symbol = info ? info.symbol : currencyCode;
  const isNoDecimal = ["JPY", "KRW", "VND", "TWD"].includes(currencyCode);
  const formattedNum = isNoDecimal
    ? Math.round(amount).toLocaleString()
    : amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${symbol} ${formattedNum}`;
}

export async function fetchLiveExchangeRates(
  fallback: Record<string, number> = getDefaultRatesMap()
): Promise<Record<string, number>> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!res.ok) return fallback;
    const data = await res.json();
    if (!data?.rates?.TWD) return fallback;
    const usdToTwd = data.rates.TWD;
    const updated: Record<string, number> = { ...fallback };
    for (const curr of Object.keys(SUPPORTED_CURRENCIES)) {
      if (curr === "TWD") {
        updated[curr] = 1.0;
      } else if (data.rates[curr]) {
        updated[curr] = Math.round((usdToTwd / data.rates[curr]) * 10000) / 10000;
      }
    }
    return updated;
  } catch {
    return fallback;
  }
}
