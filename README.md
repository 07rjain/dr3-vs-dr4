# Drift

Drift is an independent, single-page lookup for [Ahrefs Domain Rating](https://ahrefs.com/). Enter a domain and it shows the current score (DR3) next to the DR4 preview, plus the numeric difference.

It is not an official Ahrefs product. Scores come from Ahrefs' Domain Rating API. [Domain Rating by Ahrefs](https://ahrefs.com/).

Ahrefs plans to show DR4 in its own interface on December 1, 2026. Their write-up: [Introducing a Preview of DR4](https://ahrefs.com/blog/domain-rating-dr4/).

## API

Verified against the official docs on November 7, 2026:

- Reference: [Domain rating free (GET)](https://docs.ahrefs.com/en/api/reference/public/get-domain-rating-free)
- Changelog: on October 6, 2026 the free endpoint gained `version=dr3|dr4` (`dr3` is the default). On August 10, 2026 the same endpoint started requiring an API key. Calls stay free and do not consume API units.
- License: [Domain Rating license](https://ahrefs.com/legal/domain-rating-license). Attribution next to the scores is required. Bulk harvesting is not allowed; this app checks one host at a time and rate limits new lookups.

Exact request, issued twice in parallel (once per model):

```http
GET https://api.ahrefs.com/v3/public/domain-rating-free?target=ahrefs.com&version=dr4&output=json
Accept: application/json
Authorization: Bearer $AHREFS_API_KEY
```

| Query param | Required | Values |
| --- | --- | --- |
| `target` | yes | Domain or URL. Drift sends the normalized host. |
| `version` | no | `dr3` (default, current model) or `dr4` (preview). |
| `output` | no | `json` (also `csv`, `xml`, `php` on GET). Drift sends `json`. |

Documented 200 shape:

```json
{
  "domain_rating": {
    "domain_rating": 0,
    "license": "http://ahrefs.com/legal/domain-rating-license"
  }
}
```

`domain_rating` inside the object is a float. The `0` and `"string"` placeholders in the docs are the schema sample, not a live score. A real zero is kept; a JSON `null` is treated as "no score for this model."

Live calls from this environment, without a usable key:

```json
["Error", "Forbidden"]
```

HTTP 403 when `Authorization` is omitted.

```json
["Error", "Unauthorized"]
```

HTTP 401 when the bearer token is invalid.

An API key is required. There is no remaining unauthenticated public method. Put a free API v3 key in `AHREFS_API_KEY` on the server. The browser never sees it. Ahrefs documents the default limit as 60 requests per minute; this app stays under that on one instance by allowing 24 uncached lookups per minute globally (two upstream calls each) and 12 uncached lookups per 5 minutes per IP. Successful lookups are cached in memory for 10 minutes. That cache is per server instance, so several Vercel instances can still exceed Ahrefs' account limit together.

Ahrefs has said that after DR4 ships in the product, DR3 remains on the API only for a short time. If `version=dr3` later starts failing, the page shows an upstream error instead of inventing a number.

## Local development

```bash
npm install
cp .env.example .env.local
# edit .env.local and set AHREFS_API_KEY
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

```bash
npm test
npm run lint
npm run build
```

Optional live probe (prints both JSON bodies, never prints the key):

```bash
AHREFS_API_KEY=your_key node scripts/probe-ahrefs.mjs ahrefs.com
```

## Deploy on Vercel

The app is a Next.js App Router project. Import the repo in Vercel, or from a linked directory:

```bash
npx vercel --prod
```

Before the first production deploy, set `AHREFS_API_KEY` for Production (and Preview, if you want preview URLs to return live scores). Vercel injects it into server functions. Do not mark it as exposed to the browser.

If you add the key after a deploy, redeploy so the configuration notice (which reads the variable at request time) and the API route both see it. No other environment variables are required. There is no database, no account system, and no analytics beyond what Vercel enables by default.
