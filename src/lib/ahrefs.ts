export const AHREFS_DR_ENDPOINT = "https://api.ahrefs.com/v3/public/domain-rating-free";

export type RatingVersion = "dr3" | "dr4";

export type ParsedRating =
  | { ok: true; rating: number | null; license: string | null }
  | {
      ok: false;
      kind: "unauthorized" | "forbidden" | "rate_limited" | "bad_target" | "upstream";
      message: string;
    };

export function domainRatingUrl(target: string, version: RatingVersion): string {
  const url = new URL(AHREFS_DR_ENDPOINT);
  url.searchParams.set("target", target);
  url.searchParams.set("version", version);
  url.searchParams.set("output", "json");
  return url.toString();
}

export function readApiKey(): string | undefined {
  const value = process.env.AHREFS_API_KEY?.trim();
  if (!value) {
    return undefined;
  }
  if (value.startsWith("xor5a:")) {
    return decodeXorHexPayload(value.slice(6), 0x5a);
  }
  return value;
}

function decodeXorHexPayload(hex: string, xorKey: number): string | undefined {
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
    return undefined;
  }
  try {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16) ^ xorKey;
    }
    const decoded = new TextDecoder().decode(bytes).trim();
    return decoded || undefined;
  } catch {
    return undefined;
  }
}

export function parseAhrefsResponse(status: number, body: unknown): ParsedRating {
  const tuple = readErrorTuple(body);
  const errorField = readErrorField(body);
  const message = tuple ?? errorField ?? `HTTP ${status}`;

  if (status === 401 || tuple === "Unauthorized") {
    return { ok: false, kind: "unauthorized", message };
  }
  if (status === 403 || tuple === "Forbidden") {
    return { ok: false, kind: "forbidden", message };
  }
  if (status === 429) {
    return { ok: false, kind: "rate_limited", message };
  }
  if (status === 400) {
    return { ok: false, kind: "bad_target", message };
  }
  if (status !== 200) {
    return { ok: false, kind: "upstream", message };
  }

  const rating = extractRating(body);
  const license = extractLicense(body);
  if (typeof rating === "number") {
    return { ok: true, rating, license };
  }
  if (errorField && !isMissingRatingMessage(errorField)) {
    return { ok: false, kind: "upstream", message: errorField };
  }
  return { ok: true, rating: null, license };
}

export async function fetchDomainRating(
  target: string,
  version: RatingVersion,
  apiKey: string,
  signal?: AbortSignal,
): Promise<ParsedRating> {
  const timeout = AbortSignal.timeout(15_000);
  const response = await fetch(domainRatingUrl(target, version), {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      "User-Agent": "Drift/1.0 (independent Domain Rating comparison)",
    },
    cache: "no-store",
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = text;
    }
  }
  return parseAhrefsResponse(response.status, body);
}

function extractRating(body: unknown): number | null | undefined {
  const block = ratingBlock(body);
  if (!block) return undefined;
  const value = block.domain_rating;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  if (value === null) return null;
  return undefined;
}

function extractLicense(body: unknown): string | null {
  const block = ratingBlock(body);
  const license = block?.license;
  return typeof license === "string" && license.length > 0 ? license : null;
}

function ratingBlock(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const block = (body as Record<string, unknown>).domain_rating;
  if (!block || typeof block !== "object" || Array.isArray(block)) return null;
  return block as Record<string, unknown>;
}

function readErrorTuple(body: unknown): string | null {
  if (!Array.isArray(body) || body[0] !== "Error") return null;
  return typeof body[1] === "string" ? body[1] : "Error";
}

function readErrorField(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const error = (body as Record<string, unknown>).error;
  return typeof error === "string" && error.trim() ? error.trim() : null;
}

function isMissingRatingMessage(message: string): boolean {
  return /not found|no data|unknown|unrated|no rating|does not exist/i.test(message);
}
