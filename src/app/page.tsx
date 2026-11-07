import { Checker } from "@/components/checker";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-14">
      <a
        href="#checker"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-paper focus:px-3 focus:py-2"
      >
        Skip to domain check
      </a>

      <header className="max-w-2xl">
        <p className="text-xs font-medium tracking-[0.18em] text-dr4 uppercase">
          Independent comparison · Not an Ahrefs product
        </p>
        <h1 className="mt-3 font-display text-[clamp(2.7rem,8vw,4.6rem)] leading-[0.95] tracking-tight text-foreground">
          See how DR4 moves a domain.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
          Drift looks up one host and asks Ahrefs for two Domain Ratings: the model in use today
          (DR3) and the preview model (DR4) that Ahrefs plans to show in its own product on
          December 1, 2026.
        </p>
      </header>

      <Suspense fallback={null}>
        <ConfigurationNotice />
      </Suspense>

      <div className="mt-8">
        <Checker />
      </div>

      <section className="mt-14" aria-labelledby="explainer-heading">
        <h2 id="explainer-heading" className="font-display text-3xl tracking-tight">
          What these numbers mean
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-border bg-paper/80 p-4">
            <h3 className="font-medium text-foreground">Relative backlink strength</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Domain Rating is Ahrefs&apos; logarithmic 0–100 measure of how strong a site&apos;s
              backlink profile is compared with other sites in the Ahrefs index. It does not grade
              the writing, the product, or the organization.
            </p>
          </article>
          <article className="rounded-2xl border border-border bg-paper/80 p-4">
            <h3 className="font-medium text-foreground">Two advertised changes</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Ahrefs says that on December 1, 2026, DR4 goes live in the Ahrefs interface.
              Subdomains get their own ratings instead of inheriting the root, and the pool of
              referring domains that can move a score gets smaller and is held to a higher quality
              bar.
            </p>
          </article>
          <article className="rounded-2xl border border-border bg-paper/80 p-4">
            <h3 className="font-medium text-foreground">A lower preview is not a verdict</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              A lower DR4 is not a judgment of content quality. Ahrefs describes it as a different
              reading of the backlink profile. The scale is relative, so one point near the top is
              a wider gap than one point in the middle.
            </p>
          </article>
        </div>
        <p className="mt-5 text-sm leading-6 text-muted-foreground">
          In its preview post, Ahrefs uses help.ahrefs.com as a published illustration: DR 91 on
          the current model and DR 75 on DR4, while describing ahrefs.com at DR 92 in that same
          discussion. Those figures are Ahrefs&apos; own examples, not a substitute for the live
          lookup above.{" "}
          <External href="https://ahrefs.com/blog/domain-rating-dr4/">
            Read the official DR4 preview post
          </External>
          .
        </p>
      </section>

      <footer className="mt-14 border-t border-border pt-6 text-sm leading-6 text-muted-foreground">
        <p>
          Scores from Ahrefs&apos; Domain Rating API.{" "}
          <External href="https://ahrefs.com/">Domain Rating by Ahrefs</External>. Figures come
          from Ahrefs and may change, including after DR4 replaces the current model. Ahrefs has
          said the API will keep DR3 available for a short time after the December 1, 2026
          interface update.
        </p>
        <p className="mt-3">
          Your browser only talks to this site. This site asks Ahrefs. Any API key stays on the
          server. Repeat lookups of the same host may be served from a 10-minute server cache, and
          new checks are rate limited, so the tool does not harvest ratings in bulk.
        </p>
        <p className="mt-3">
          Drift is an independent project. The required Ahrefs attribution is not an endorsement,
          affiliation, or sponsorship.{" "}
          <External href="https://ahrefs.com/legal/domain-rating-license">
            Domain Rating license
          </External>
          {" · "}
          <External href="https://docs.ahrefs.com/en/api/reference/public/get-domain-rating-free">
            API reference
          </External>
        </p>
      </footer>
    </main>
  );
}

async function ConfigurationNotice() {
  await connection();
  const env = process.env;
  if (env.AHREFS_API_KEY?.trim()) return null;
  return (
    <p
      role="status"
      className="mt-6 rounded-2xl border border-dr4/40 bg-paper px-4 py-3 text-sm leading-6 text-foreground"
    >
      Live scores are paused. This server has no Ahrefs API key configured, so a lookup cannot
      reach Ahrefs yet.
    </p>
  );
}

function External({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-foreground underline decoration-dr4/70 underline-offset-4 hover:decoration-dr4"
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
