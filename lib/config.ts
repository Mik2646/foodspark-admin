export const PRODUCTION_API_BASE_URL = "https://apifoodspark.techsparks-co-th.com";

export function normalizeApiBaseUrl(raw: string | undefined | null): string {
  const value = (raw ?? "").trim() || PRODUCTION_API_BASE_URL;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
      return PRODUCTION_API_BASE_URL;
    }
    return url.origin.replace(/\/$/, "");
  } catch {
    return PRODUCTION_API_BASE_URL;
  }
}

export const API_BASE_URL = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
