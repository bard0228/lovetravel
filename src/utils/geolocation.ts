export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  formatted: string;
}

export async function fetchDeviceCoordinates(): Promise<GpsCoordinates | null> {
  if (typeof window === "undefined" || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        resolve({ latitude: lat, longitude: lng, formatted: `${lat}, ${lng}` });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

export function parseCoordinates(coordStr?: string): { lat: number; lng: number } | null {
  if (!coordStr || typeof coordStr !== "string") return null;
  const parts = coordStr.split(/[,，\s]+/).filter(Boolean);
  if (parts.length >= 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }
  return null;
}

export function formatCoordinates(lat: number, lng: number): string {
  return `${Number(lat.toFixed(6))}, ${Number(lng.toFixed(6))}`;
}

export function getGoogleMapsUrl(coordStr: string): string {
  const parsed = parseCoordinates(coordStr);
  if (parsed) {
    return `https://www.google.com/maps/search/?api=1&query=${parsed.lat},${parsed.lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordStr)}`;
}
