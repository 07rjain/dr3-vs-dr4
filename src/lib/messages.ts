export const messages = {
  empty: "Enter a domain to check.",
  invalid:
    "That doesn't look like a domain. Try ahrefs.com, or paste a URL like https://www.example.com/path.",
  unrated:
    "Ahrefs has no Domain Rating for that host on either model. It may be outside their index.",
  upstream: "Ahrefs didn't return scores just now. Try again in a moment.",
  timeout: "Ahrefs took too long to answer. Try again in a moment.",
  network: "Could not reach Ahrefs. Try again in a moment.",
  notConfigured:
    "This server has no Ahrefs API key, so it can't load live scores. Set AHREFS_API_KEY and redeploy.",
  unauthorized: "Ahrefs rejected the API key configured on this server.",
  forbidden:
    "Ahrefs refused the request. The API key may be invalid, or Ahrefs may be blocking this server.",
  badTarget: "Ahrefs didn't accept that target. Check the domain and try again.",
  rateLimited(seconds: number) {
    const wait = Math.max(1, seconds);
    return `Too many checks right now. Wait ${wait} ${wait === 1 ? "second" : "seconds"} and try again.`;
  },
} as const;

export type ErrorCode =
  | "empty"
  | "invalid_domain"
  | "unrated"
  | "upstream"
  | "rate_limited"
  | "not_configured"
  | "unauthorized"
  | "forbidden";
