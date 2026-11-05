import crypto from "node:crypto";

/**
 * Ali Oda — Kriptografik Kanıt, HMAC Timing-Safe Doğrulama ve Dosya Güvenliği
 */

const ALLOWED_EVIDENCE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "application/pdf",
]);

const MAX_EVIDENCE_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

export function computeSha256(content: string | Buffer): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export function generateClaimIntegritySeal(payload: {
  rmaNumber: string;
  orderNumber: string;
  serialNumber: string;
  issueCategory: string;
  evidenceHashes: string[];
  timestampIso: string;
}): string {
  const secret = process.env.CLAIMFLOW_HMAC_SECRET || "claimflow-fallback-secret-key-2026";
  const canonical = [
    payload.rmaNumber,
    payload.orderNumber,
    payload.serialNumber,
    payload.issueCategory,
    payload.evidenceHashes.sort().join(","),
    payload.timestampIso,
  ].join("|");

  return crypto.createHmac("sha256", secret).update(canonical).digest("hex");
}

/**
 * Timing-attack korumalı HMAC / Token doğrulaması
 */
export function verifyTimingSafeSignature(expectedHex: string, providedHex: string): boolean {
  try {
    const a = Buffer.from(expectedHex, "hex");
    const b = Buffer.from(providedHex, "hex");
    if (a.length === 0 || a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function validateEvidenceFileMeta(file: {
  fileName: string;
  mimeType: string;
  fileSize: number;
}): { valid: boolean; error?: string } {
  if (!file.fileName || file.fileName.length > 180) {
    return { valid: false, error: "Geçersiz veya çok uzun dosya adı." };
  }

  // Çift uzantı / çalıştırılabilir dosya engeli
  const lower = file.fileName.toLowerCase();
  if (
    lower.endsWith(".exe") ||
    lower.endsWith(".sh") ||
    lower.endsWith(".php") ||
    lower.endsWith(".js") ||
    lower.endsWith(".html") ||
    lower.endsWith(".svg")
  ) {
    return {
      valid: false,
      error: "Güvenlik ihlali: Yürütülebilir veya script tabanlı dosyalar (SVG/HTML/JS/EXE) kanıt olarak yüklenemez.",
    };
  }

  if (!ALLOWED_EVIDENCE_MIMES.has(file.mimeType)) {
    return {
      valid: false,
      error: `Desteklenmeyen dosya tipi (${file.mimeType}). Sadece JPG, PNG, WEBP, MP4 ve PDF kabul edilir.`,
    };
  }

  if (file.fileSize <= 0 || file.fileSize > MAX_EVIDENCE_FILE_SIZE) {
    return {
      valid: false,
      error: "Dosya boyutu 0 byte'dan büyük ve en fazla 15 MB olmalıdır.",
    };
  }

  return { valid: true };
}
