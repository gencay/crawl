# Solution Guide — Web Crawler Interview

> **For interviewers only.** Do not share with candidates before the exercise.

## Expected Crawl Results

A well-implemented crawler starting at `http://localhost:3000/` should discover **~158 unique canonical pages** (162 total minus 2 robots-blocked, minus duplicates).

### Page Breakdown by Level

| Level | Count | URL Patterns |
|-------|------:|--------------|
| 0 | 1 | `/` |
| 1 | 4 | `/quotes`, `/authors`, `/tags`, `/about` |
| 2 | 45 | `/quotes/page/1‑5`, `/authors/:slug` ×20, `/tags/:tag` ×20 |
| 3 | 44 | `/quotes/:id` ×24, `/authors/:slug/quotes` ×20 |
| 4 | 44 | `/quotes/:id/similar` ×24, `/authors/:slug/bio` ×20 |
| 5 | 24 | `/quotes/:id/similar/by-tag` ×24 |
| **Total** | **162** | |

### Deductions

| Reason | Pages | Details |
|--------|------:|---------|
| Blocked by `robots.txt` | −2 | `/admin/dashboard`, `/private/internal` |
| Duplicate content | −2 | `/quotes/` and `/quotes/index` are duplicates of `/quotes` |
| **Canonical total** | **~158** | |

### Miscellaneous Pages

These are valid crawlable pages outside the main hierarchy:

- `/sitemap` — HTML sitemap page
- `/slow-page` — 2-second delayed response

---

## Edge Cases & What They Test

| URL / Feature | What It Tests |
|--------------|---------------|
| `/old-quotes` → 301 → `/quotes` | 301 redirect following |
| `/legacy/authors` → 302 → `/authors` | 302 redirect following |
| `/redirect-chain` → `/redirect-step2` → `/quotes` | Multi-hop redirect chain |
| `/infinite/2024/01/01` | Infinite depth trap (links to next day forever) |
| `/slow-page` | 2-second response delay |
| `/quotes/index` | Duplicate content (same as `/quotes`) |
| `/quotes?sort=newest` | Query string variation |
| `/admin/dashboard` | Blocked by `robots.txt` |
| `/private/internal` | Blocked by `robots.txt` |
| `robots.txt` | Standard robots.txt with sitemap reference |
| `/sitemap.xml` | XML sitemap with all canonical URLs |
| `javascript:void(0)` links | JS pseudo-protocol trap links in navigation |
| `mailto:` links | Mail links in navigation |
| Empty `href=""` | Empty href in footer |
| HTML comments with links | Hidden link inside an HTML comment |
| Hash links (`#section`) | Fragment-only links |
| Protocol-relative URLs | `//localhost:3000/authors` |
| Absolute URLs | `http://localhost:3000/quotes` |
| Canonical `<link>` tag | Canonical URL hints in `<head>` |
| `<meta>` robots nofollow | Meta robots directives |
| `X-Robots-Tag` header | HTTP-level robots directive on `/admin/*` |
| `X-RateLimit-Remaining` header | Rate limit awareness |
| Trailing slash | `/quotes/` vs `/quotes` handling |

---

## Expected Crawler Behavior

A correct crawler should:

1. **Start** at `http://localhost:3000/` (or discover entry via `/sitemap.xml` / `robots.txt`)
2. **Respect `robots.txt`** — skip `/admin/*` and `/private/*`
3. **Follow redirects** (301, 302) without infinite loops
4. **Detect the infinite trap** at `/infinite/` and stop
5. **Handle slow responses** gracefully (timeout after a reasonable period)
6. **Deduplicate URLs** — `/quotes` vs `/quotes/` vs `/quotes/index`
7. **Ignore non-HTTP links** — `javascript:`, `mailto:`, empty hrefs, HTML comment links
8. **Normalize URLs** — absolute, relative, and protocol-relative into one canonical form
9. **Track depth** and avoid going too deep
10. **Discover ~158 unique pages** across 5 levels

---

## Solving the Infinite Loop (`/infinite/:year/:month/:day`)

Every page at `/infinite/2024/01/01` links to `/infinite/2024/01/02`, which links to `01/03`, and so on — forever. A candidate's crawler **must** detect and stop this. Three standard approaches:

### 1. Max Depth Limit

Stop crawling beyond depth N (e.g., 10). Since `/infinite` is already at depth 2+, a depth cap of ~6 naturally catches it.

```
if (currentDepth >= MAX_DEPTH) return; // skip this URL
```

### 2. URL Pattern Detection

Recognize that `/infinite/2024/01/01`, `/infinite/2024/01/02`, … share the same structural pattern. Canonicalize the pattern as `/infinite/{*}/{*}/{*}` and cap how many instances of the same pattern you'll follow.

```
// Generalize URL: /infinite/2024/01/05 → /infinite/*/*/*
// If we've seen 3+ URLs matching this pattern, stop following new ones
```

### 3. Max Pages Per Prefix

Limit how many pages you'll crawl under any single path prefix. If you've visited 5+ pages under `/infinite/`, stop exploring that subtree.

```
prefixCounts['/infinite/']++;
if (prefixCounts['/infinite/'] > MAX_PER_PREFIX) return;
```

### Best Practice

Combine all three: **depth limit** as the safety net, **pattern detection** as the smart filter, and a **global page budget** as the hard ceiling.

---

## Grading Rubric

| Area | Excellent | Adequate | Poor |
|------|-----------|----------|------|
| **Page discovery** | 150+ unique pages | 80–150 pages | < 80 pages |
| **robots.txt** | Parses and respects Disallow rules | Fetches but partially respects | Ignores entirely |
| **Redirects** | Follows 301/302, handles chains | Follows single redirects | Crashes or loops |
| **Infinite trap** | Detects and stops (depth/pattern) | Stops eventually (timeout/budget) | Crashes or runs forever |
| **URL normalization** | Deduplicates trailing slash, query, protocol-relative | Handles some duplicates | Crawls duplicates repeatedly |
| **Non-HTTP links** | Filters `javascript:`, `mailto:`, empty, comments | Filters most | Crashes on `javascript:` |
| **Slow pages** | Timeout + retry or skip | Long hang then continues | Blocks forever |
| **Code quality** | Clean BFS/DFS, seen-set, modular | Works but messy | Spaghetti or incomplete |
