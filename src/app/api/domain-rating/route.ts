import { fetchDomainRating, readApiKey, type ParsedRating } from "@/lib/ahrefs";
import { normalizeDomain } from "@/lib/domain";
import { scoreDelta } from "@/lib/format";
import { messages, type ErrorCode } from "@/lib/messages";
import { createRateLimiter } from "@/lib/rate-limit";
import { createTtlCache } from "@/lib/ttl-cache";
import type { RatingFailure, RatingSuccess } from "@/lib/types";
import { NextResponse } from "next/server";

const CACHE_TTL_MS = 10 * 60 * 1000;
const scoreCache = createTtlCache<{
  dr3: number | null;
  dr4: number | null;
  license: string | null;
  retrievedAt: string;
}>(CACHE_TTL_MS);

const perIp = createRateLimiter(12, 5 * 60 * 1000);
const globalLimit = createRateLimiter(24, 60 * 1000);

type FailureKind = Exclude<ParsedRating, { ok: true }>["kind"] | "timeout" | "network";

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > 8_000) {
    return fail(400, "invalid_domain", messages.invalid);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return fail(400, "invalid_domain", messages.invalid);
  }

  const domain =
    payload &&
    typeof payload === "object" &&
    "domain" in payload &&
    typeof payload.domain === "string"
      ? payload.domain
      : "";

  const normalized = normalizeDomain(domain);
  if (!normalized.ok) {
    return fail(
      400,
      normalized.reason === "empty" ? "empty" : "invalid_domain",
      normalized.reason === "empty" ? messages.empty : messages.invalid,
    );
  }

  const cached = scoreCache.get(normalized.host);
  if (cached) {
    if (cached.dr3 === null && cached.dr4 === null) {
      return fail(404, "unrated", messages.unrated);
    }
    return NextResponse.json(toSuccess(normalized.host, normalized.subdomain, cached, true), {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const apiKey = readApiKey();
  if (!apiKey) {
    return fail(503, "not_configured", messages.notConfigured);
  }

  const ip = clientIp(request);
  const ipLimit = perIp.take(ip);
  if (!ipLimit.ok) {
    return fail(429, "rate_limited", messages.rateLimited(ipLimit.retryAfterSeconds), {
      "Retry-After": String(ipLimit.retryAfterSeconds),
    });
  }
  const shared = globalLimit.take("global");
  if (!shared.ok) {
    return fail(429, "rate_limited", messages.rateLimited(shared.retryAfterSeconds), {
      "Retry-After": String(shared.retryAfterSeconds),
    });
  }

  const [dr3Result, dr4Result] = await Promise.all([
    loadVersion(normalized.host, "dr3", apiKey),
    loadVersion(normalized.host, "dr4", apiKey),
  ]);

  const problem = firstProblem(dr3Result, dr4Result);
  if (problem) {
    return fail(statusFor(problem.kind), codeFor(problem.kind), messageFor(problem.kind));
  }

  if (!dr3Result.ok || !dr4Result.ok) {
    return fail(502, "upstream", messages.upstream);
  }

  const record = {
    dr3: dr3Result.rating,
    dr4: dr4Result.rating,
    license: dr3Result.license ?? dr4Result.license,
    retrievedAt: new Date().toISOString(),
  };
  scoreCache.set(normalized.host, record);

  if (record.dr3 === null && record.dr4 === null) {
    return fail(404, "unrated", messages.unrated);
  }

  return NextResponse.json(toSuccess(normalized.host, normalized.subdomain, record, false), {
    headers: { "Cache-Control": "no-store" },
  });
}

async function loadVersion(
  target: string,
  version: "dr3" | "dr4",
  apiKey: string,
): Promise<ParsedRating | { ok: false; kind: "timeout" | "network"; message: string }> {
  try {
    return await fetchDomainRating(target, version, apiKey);
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      return { ok: false, kind: "timeout", message: "timeout" };
    }
    return { ok: false, kind: "network", message: "network" };
  }
}

function firstProblem(
  left: ParsedRating | { ok: false; kind: FailureKind; message: string },
  right: ParsedRating | { ok: false; kind: FailureKind; message: string },
): { kind: FailureKind } | null {
  const order: FailureKind[] = [
    "unauthorized",
    "forbidden",
    "rate_limited",
    "timeout",
    "network",
    "upstream",
    "bad_target",
  ];
  const kinds = [left, right].filter((item) => !item.ok).map((item) => item.kind);
  for (const kind of order) {
    if (kinds.includes(kind)) return { kind };
  }
  return null;
}

function statusFor(kind: FailureKind): number {
  switch (kind) {
    case "unauthorized":
      return 401;
    case "forbidden":
      return 403;
    case "rate_limited":
      return 429;
    case "bad_target":
      return 400;
    default:
      return 502;
  }
}

function codeFor(kind: FailureKind): ErrorCode {
  switch (kind) {
    case "unauthorized":
      return "unauthorized";
    case "forbidden":
      return "forbidden";
    case "rate_limited":
      return "rate_limited";
    case "bad_target":
      return "invalid_domain";
    default:
      return "upstream";
  }
}

function messageFor(kind: FailureKind): string {
  switch (kind) {
    case "unauthorized":
      return messages.unauthorized;
    case "forbidden":
      return messages.forbidden;
    case "rate_limited":
      return messages.rateLimited(60);
    case "timeout":
      return messages.timeout;
    case "network":
      return messages.network;
    case "bad_target":
      return messages.badTarget;
    default:
      return messages.upstream;
  }
}

function toSuccess(
  host: string,
  subdomain: boolean,
  record: {
    dr3: number | null;
    dr4: number | null;
    license: string | null;
    retrievedAt: string;
  },
  cached: boolean,
): RatingSuccess {
  const { delta, direction } = scoreDelta(record.dr3, record.dr4);
  return {
    host,
    subdomain,
    dr3: record.dr3,
    dr4: record.dr4,
    delta,
    direction,
    license: record.license,
    retrievedAt: record.retrievedAt,
    cached,
  };
}

function fail(status: number, error: ErrorCode, message: string, extra?: HeadersInit) {
  const body: RatingFailure = { error, message };
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...Object.fromEntries(new Headers(extra).entries()),
    },
  });
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 80);
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 80);
  return "unknown";
}
