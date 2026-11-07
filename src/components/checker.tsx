"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeDomain } from "@/lib/domain";
import {
  deltaLabel,
  deltaSentence,
  directionWord,
  formatScore,
  type Direction,
} from "@/lib/format";
import { messages } from "@/lib/messages";
import type { RatingFailure, RatingSuccess } from "@/lib/types";
import { useEffect, useId, useRef, useState } from "react";

const EXAMPLES = ["ahrefs.com", "help.ahrefs.com", "wikipedia.org", "github.com"] as const;

export function Checker() {
  const inputId = useId();
  const hintId = useId();
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RatingSuccess | null>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const didSubmit = useRef(false);

  useEffect(() => {
    if (!didSubmit.current || loading) return;
    const node = statusRef.current;
    if (!node) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
    node.focus();
  }, [loading, error, result]);

  async function check(value: string) {
    didSubmit.current = true;
    const trimmed = value.trim();
    setDomain(trimmed);
    const normalized = normalizeDomain(trimmed);
    if (!normalized.ok) {
      setResult(null);
      setError(normalized.reason === "empty" ? messages.empty : messages.invalid);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/domain-rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: trimmed }),
      });
      const data = (await response.json()) as RatingSuccess | RatingFailure | null;
      if (!response.ok || !data || typeof data !== "object" || !("host" in data)) {
        const message =
          data && typeof data === "object" && "message" in data && typeof data.message === "string"
            ? data.message
            : messages.upstream;
        setResult(null);
        setError(message);
        return;
      }
      setResult(data);
    } catch {
      setResult(null);
      setError(messages.network);
    } finally {
      setLoading(false);
    }
  }

  const validationError = error === messages.empty || error === messages.invalid;

  return (
    <div id="checker" className="scroll-mt-8">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void check(domain);
        }}
        aria-busy={loading}
      >
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          Domain or URL
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input
            id={inputId}
            name="domain"
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            placeholder="example.com"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode="url"
            enterKeyHint="search"
            aria-invalid={validationError || undefined}
            aria-describedby={hintId}
            disabled={loading}
            className="h-12 rounded-xl bg-paper px-4 text-base md:text-base"
          />
          <Button
            type="submit"
            disabled={loading}
            className="h-12 rounded-xl px-6 text-base sm:min-w-32"
          >
            {loading ? "Checking" : "Check"}
          </Button>
        </div>
        <p id={hintId} className="mt-2 text-sm text-muted-foreground">
          A bare host, www host, or full URL is fine. Paths are ignored. Subdomains are kept,
          because DR4 rates them on their own.
        </p>
      </form>

      <div className="mt-4" role="group" aria-label="Example domains">
        <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Try a public site
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLES.map((host) => (
            <Button
              key={host}
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => void check(host)}
              className="h-8 rounded-full bg-paper px-3 font-mono text-[0.8rem]"
            >
              {host}
            </Button>
          ))}
        </div>
      </div>

      <div ref={statusRef} tabIndex={-1} className="mt-6 scroll-mt-6 outline-none">
        {loading ? <LoadingState /> : null}
        {!loading && error ? (
          <p
            role="alert"
            className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-foreground"
          >
            {error}
          </p>
        ) : null}
        {!loading && !error && result ? <ResultCard result={result} /> : null}
        {!loading && !error && !result ? <EmptyState /> : null}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[1.6rem] border border-dashed border-border bg-paper/70 px-5 py-10 text-center">
      <p className="font-display text-2xl text-foreground">No domain checked yet.</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        Enter a host, or pick one of the public sites above. The current rating and the DR4
        preview will show up side by side.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div role="status" className="rounded-[1.6rem] border border-border bg-paper px-5 py-8">
      <p className="text-sm text-foreground">Asking Ahrefs for the current rating and the DR4 preview…</p>
      <div className="mt-5 grid grid-cols-2 gap-3" aria-hidden="true">
        <div className="h-36 animate-pulse rounded-2xl bg-dr3/90 motion-reduce:animate-none" />
        <div className="h-36 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: RatingSuccess }) {
  const missing =
    result.dr3 === null ? "Ahrefs returned no current DR3 for this host." : result.dr4 === null
      ? "Ahrefs returned no DR4 preview for this host."
      : null;
  const retrieved = new Date(result.retrievedAt);

  return (
    <article className="overflow-hidden rounded-[1.6rem] border border-border bg-paper shadow-[0_20px_50px_-36px_oklch(0.28_0.03_155/0.7)]" aria-labelledby="result-heading">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 id="result-heading" className="font-display text-2xl tracking-tight text-foreground sm:text-3xl">
            {result.host}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <time dateTime={result.retrievedAt}>
              {Number.isNaN(retrieved.valueOf())
                ? "Retrieved from Ahrefs"
                : retrieved.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </time>
            {result.cached ? " · served from a short server cache" : " · just fetched"}
          </p>
        </div>
        <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">Scores from Ahrefs</p>
      </div>

      <div className="grid grid-cols-2">
        <ScorePanel
          eyebrow="Current model"
          name="DR3"
          value={result.dr3}
          tone="current"
        />
        <ScorePanel
          eyebrow="Preview"
          name="DR4"
          value={result.dr4}
          tone="preview"
        />
      </div>

      <div className="border-t border-border px-5 py-4">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="font-display text-4xl whitespace-nowrap tabular-nums text-foreground">
            {deltaLabel(result.direction, result.delta)}
          </p>
          <p className={`text-sm font-medium ${toneClass(result.direction)}`}>
            {directionWord(result.direction)}
          </p>
        </div>
        <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
          {deltaSentence(result.direction, result.delta)}
        </p>
        {missing ? <p className="mt-3 text-sm text-foreground">{missing}</p> : null}
        {result.subdomain ? (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This host sits under a root domain. DR4 scores that host from its own backlinks. DR3
            usually repeats the root domain&apos;s rating, which is why the two numbers can split
            apart here.
          </p>
        ) : null}
      </div>
    </article>
  );
}

function ScorePanel({
  eyebrow,
  name,
  value,
  tone,
}: {
  eyebrow: string;
  name: string;
  value: number | null;
  tone: "current" | "preview";
}) {
  const current = tone === "current";
  return (
    <section
      className={current ? "bg-dr3 px-4 py-6 text-paper sm:px-6 sm:py-8" : "bg-paper px-4 py-6 text-foreground sm:px-6 sm:py-8"}
      aria-label={`${eyebrow} ${name}`}
    >
      <p className={current ? "text-xs tracking-[0.16em] text-paper/70 uppercase" : "text-xs tracking-[0.16em] text-dr4 uppercase"}>
        {eyebrow}
      </p>
      <h3 className="mt-2 font-mono text-sm">{name}</h3>
      <p className={`mt-4 font-display text-[clamp(3.1rem,11vw,6.25rem)] leading-none tabular-nums ${current ? "text-paper" : "text-dr4"}`}>
        {formatScore(value)}
      </p>
    </section>
  );
}

function toneClass(direction: Direction): string {
  if (direction === "up") return "text-emerald-800";
  if (direction === "down") return "text-dr4";
  return "text-muted-foreground";
}
