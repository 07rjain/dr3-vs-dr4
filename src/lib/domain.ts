const MULTI_PART_SUFFIXES = new Set([
  "ac.uk",
  "co.id",
  "co.in",
  "co.jp",
  "co.kr",
  "co.nz",
  "co.uk",
  "co.za",
  "com.ar",
  "com.au",
  "com.br",
  "com.co",
  "com.hk",
  "com.mx",
  "com.sg",
  "com.tr",
  "com.tw",
  "gov.uk",
  "ne.jp",
  "net.au",
  "or.jp",
  "org.au",
  "org.nz",
  "org.uk",
]);

const LABEL = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)$/;

export type NormalizeResult =
  | { ok: true; host: string; subdomain: boolean }
  | { ok: false; reason: "empty" | "invalid" };

export function normalizeDomain(input: string): NormalizeResult {
  const raw = input.trim();
  if (!raw) return { ok: false, reason: "empty" };
  if (raw.length > 2048) return { ok: false, reason: "invalid" };
  if (/[\s<>"'\\]/.test(raw)) return { ok: false, reason: "invalid" };

  let candidate = raw;
  if (!/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return { ok: false, reason: "invalid" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "invalid" };
  }
  if (url.username || url.password) return { ok: false, reason: "invalid" };

  let host = url.hostname.toLowerCase();
  if (host.endsWith(".")) host = host.slice(0, -1);
  if (!host || host.length > 253) return { ok: false, reason: "invalid" };
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    return { ok: false, reason: "invalid" };
  }
  if (host.includes(":") || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return { ok: false, reason: "invalid" };
  }

  const labels = host.split(".");
  if (labels.length < 2) return { ok: false, reason: "invalid" };
  if (labels.some((label) => !LABEL.test(label))) return { ok: false, reason: "invalid" };

  const tld = labels[labels.length - 1] ?? "";
  if (tld.length < 2 || /^\d+$/.test(tld)) return { ok: false, reason: "invalid" };

  const suffix = labels.slice(-2).join(".");
  const registrableLabels = MULTI_PART_SUFFIXES.has(suffix) ? 3 : 2;
  if (labels.length < registrableLabels) return { ok: false, reason: "invalid" };

  return {
    ok: true,
    host,
    subdomain: labels.length > registrableLabels,
  };
}
