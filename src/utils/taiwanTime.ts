export interface TaiwanTimeInfo {
  dateStr: string;
  timeStr: string;
  isoStr: string;
}

export function getTaiwanTimeInfo(date: Date = new Date()): TaiwanTimeInfo {
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.format(date).split(" ");
  const dateStr = parts[0] || "";
  const timeStr = (parts[1] || "00:00:00").slice(0, 5);
  return {
    dateStr,
    timeStr,
    isoStr: `${dateStr}T${parts[1] || "00:00:00"}+08:00`,
  };
}
