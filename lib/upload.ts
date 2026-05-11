// Shared image-upload helper for admin pages.
// Posts a base64-encoded file to /api/upload and surfaces a readable
// error when the server replies with non-JSON (e.g. 413 plain-text
// "Request Entity Too Large" from the proxy / Express body parser).

const CLIENT_MAX_BYTES = 15 * 1024 * 1024; // 15MB on disk, matches server cap

export async function uploadToR2(file: File, token: string | null): Promise<string> {
  if (file.size > CLIENT_MAX_BYTES) {
    throw new Error(`ไฟล์ใหญ่เกินไป (สูงสุด ${Math.floor(CLIENT_MAX_BYTES / 1024 / 1024)}MB)`);
  }
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const res = await fetch("/api/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ base64, mimeType: file.type }),
  });

  // 413 / 502 / 504 from the proxy come back as plain text, not JSON —
  // parsing them as JSON yields the "Unexpected token 'R'" error users
  // see in the screenshot. Read once as text, then try to parse.
  const raw = await res.text();
  let data: any = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    // Not JSON — surface the most useful message we can derive
    if (res.status === 413) {
      throw new Error("ไฟล์ใหญ่เกินไป — ลองลดขนาดรูปหรือ export เป็น JPG/WebP คุณภาพต่ำลง");
    }
    if (res.status === 502 || res.status === 504) {
      throw new Error("เซิร์ฟเวอร์ไม่ตอบ ลองอีกครั้ง");
    }
    throw new Error(`อัปโหลดไม่สำเร็จ (HTTP ${res.status})`);
  }

  if (!res.ok || !data?.url) {
    throw new Error(data?.error ?? `อัปโหลดไม่สำเร็จ (HTTP ${res.status})`);
  }
  return data.url as string;
}
