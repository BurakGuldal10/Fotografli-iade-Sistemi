import { lookup } from "node:dns/promises";
import net from "node:net";

/**
 * Ali Oda — SSRF Kalkanı (Server-Side Request Forgery Protection)
 * ERP / E-Ticaret sistemlerine gönderilen RMA karar webhook'larının
 * iç ağlara (localhost, 127.0.0.1, 10.x, 172.16-31.x, 192.168.x, 169.254.169.254)
 * erişmesini kesin olarak engeller.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  const cleanIp = ip.toLowerCase().trim();

  if (cleanIp === "::1" || cleanIp === "0.0.0.0" || cleanIp === "::") {
    return true;
  }

  // IPv4-mapped IPv6 kontrolü (::ffff:127.0.0.1)
  if (cleanIp.startsWith("::ffff:")) {
    const mappedIpv4 = cleanIp.replace("::ffff:", "");
    if (net.isIPv4(mappedIpv4)) {
      return isPrivateOrReservedIp(mappedIpv4);
    }
  }

  if (net.isIPv6(cleanIp)) {
    return (
      cleanIp.startsWith("fc") ||
      cleanIp.startsWith("fd") ||
      cleanIp.startsWith("fe80")
    );
  }

  if (!net.isIPv4(cleanIp)) {
    return true;
  }

  const parts = cleanIp.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    return true;
  }

  const [a, b] = parts;

  // Loopback (127.0.0.0/8)
  if (a === 127) return true;
  // Private Class A (10.0.0.0/8)
  if (a === 10) return true;
  // Private Class B (172.16.0.0/12)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // Private Class C (192.168.0.0/16)
  if (a === 192 && b === 168) return true;
  // Cloud Metadata & Link-Local (169.254.0.0/16)
  if (a === 169 && b === 254) return true;
  // CGNAT (100.64.0.0/10)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // Broadcast / Current network
  if (a === 0 || a >= 224) return true;

  return false;
}

export async function validateSafeWebhookUrl(rawUrl: string): Promise<{
  safe: boolean;
  reason?: string;
  normalizedUrl?: string;
}> {
  try {
    const parsed = new URL(rawUrl);

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { safe: false, reason: "Sadece HTTP/HTTPS protokollerine izin verilir." };
    }

    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      return { safe: false, reason: "Yerel ağ adreslerine (localhost/internal) erişim engellendi." };
    }

    if (net.isIP(hostname)) {
      if (isPrivateOrReservedIp(hostname)) {
        return { safe: false, reason: "Özel veya ayrılmış IP adreslerine webhook gönderilemez." };
      }
      return { safe: true, normalizedUrl: parsed.toString() };
    }

    const records = await lookup(hostname, { all: true });
    if (!records || records.length === 0) {
      return { safe: false, reason: "Alan adı DNS kaydı çözümlenemedi." };
    }

    for (const record of records) {
      if (isPrivateOrReservedIp(record.address)) {
        return {
          safe: false,
          reason: `DNS Rebinding / İç IP tespit edildi (${record.address}). Erişim reddedildi.`,
        };
      }
    }

    return { safe: true, normalizedUrl: parsed.toString() };
  } catch {
    return { safe: false, reason: "Geçersiz URL formatı." };
  }
}
