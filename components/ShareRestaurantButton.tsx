"use client";

import { useState } from "react";
import { Share2, Check, Copy } from "lucide-react";

/**
 * Public web URL for the customer restaurant page. Same host the
 * customer + merchant apps share to in foodspark-web/lib/shareUrl.ts.
 * Inlined here because the admin app doesn't import from that repo.
 */
const WEB_HOST = "https://foodspark.techsparks-co-th.com";

type Props = {
  restaurantId: string;
  restaurantName: string;
  category?: string | null;
  className?: string;
};

/**
 * Admin-side one-tap share for a restaurant detail page.
 *
 * Mirrors the customer/merchant share button in foodspark-web — we want
 * admins (ops + support) to be able to share a shop's link too, e.g.
 * when onboarding a merchant via DM and walking them through how their
 * page looks to a real customer.
 *
 * Strategy:
 *   1. Try `navigator.share` (Web Share API) — opens iOS / Android /
 *      LINE share sheet. Most admins are on desktop where this is
 *      undefined and we fall through.
 *   2. `navigator.clipboard.writeText` — copy URL + intro text. Flash
 *      "คัดลอกแล้ว" for 1.8s.
 *   3. `window.prompt` last-resort — when clipboard is also blocked.
 */
export default function ShareRestaurantButton({
  restaurantId,
  restaurantName,
  category,
  className = "",
}: Props) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleShare = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const url = `${WEB_HOST}/liff/restaurant/${encodeURIComponent(restaurantId)}`;
      const lines = [`🍔 ${restaurantName} บน FoodSpark`];
      if (category) lines.push(`หมวด: ${category}`);
      lines.push("กดลิงก์เพื่อสั่งอาหารเลย 👇");
      const text = lines.join("\n");

      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        try {
          await navigator.share({
            title: `${restaurantName} · FoodSpark`,
            text,
            url,
          });
          return;
        } catch (e) {
          // User cancelled the share sheet — silent return.
          if ((e as { name?: string })?.name === "AbortError") return;
          // Other share failures fall through to clipboard.
        }
      }

      // Clipboard fallback — copy text + URL together.
      const payload = `${text}\n${url}`;
      try {
        await navigator.clipboard.writeText(payload);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      } catch {
        if (typeof window !== "undefined") {
          window.prompt("คัดลอกลิงก์นี้ไปแชร์", url);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 flex-shrink-0 transition-colors disabled:opacity-60 ${className}`}
      title="แชร์ลิงก์ร้านนี้ให้ลูกค้า"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-600" /> คัดลอกแล้ว
        </>
      ) : (
        <>
          <Share2 className="w-3.5 h-3.5" /> แชร์ <Copy className="w-3 h-3 text-gray-400" aria-hidden />
        </>
      )}
    </button>
  );
}
