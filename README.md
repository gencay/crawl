# Quotes & Authors — Crawler Interview Target

A purpose-built website designed as an interview exercise for web crawler / spider questions. It features a realistic Quotes & Authors site with five levels of page depth, various link formats, and common edge cases that crawlers must handle.

## Quick Start

\`\`\`bash
cd /Users/alig/dev/crawl-site
npm install
npm start
# => http://localhost:3000
\`\`\`

## URL Structure (5 Levels)

| Level | Example URLs | Description |
|-------|-------------|-------------|
| 0 | \`/\` | Homepage |
| 1 | \`/quotes\`, \`/authors\`, \`/tags\`, \`/about\` | Main listing pages |
| 2 | \`/quotes/page/2\`, \`/authors/albert-einstein\`, \`/tags/wisdom\` | Paginated / filtered |
| 3 | \`/quotes/1\`, \`/authors/albert-einstein/quotes\` | Individual items |
| 4 | \`/quotes/1/similar\`, \`/authors/albert-einstein/bio\` | Deep pages |
| 5 | \`/quotes/1/similar/by-tag\` | Deepest level |

## Edge Cases & What They Test

| URL / Feature | What It Tests |
|--------------|---------------|
| \`/old-quotes\` -> 301 -> \`/quotes\` | 301 redirect following |
| \`/legacy/authors\` -> 302 -> \`/authors\` | 302 redirect following |
| \`/redirect-chain\` -> \`/redirect-step2\` -> \`/quotes\` | Multi-hop redirect chain |
| \`/infinite/2024/01/01\` | Infinite depth trap (links to next day) |
| \`/slow-page\` | 2-second response delay |
| \`/quotes/index\` | Duplicate content (same as \`/quotes\`) |
| \`/quotes?sort=newest\` | Query string variation |
| \`/admin/dashboard\` | Blocked by robots.txt |
| \`/private/internal\` | Blocked by robots.txt |
| \`robots.txt\` | Standard robots.txt with sitemap |
| \`/sitemap.xml\` | XML sitemap with all canonical URLs |
| \`javascript:void(0)\` links | JS trap links in navigation |
| \`mailto:\` links | Mail links in navigation |
| Empty href | Empty href in footer |
| HTML comments with links | Hidden link in footer comment |
| Hash links | Fragment-only links |
| Protocol-relative URLs | \`//localhost:3000/authors\` |
| Absolute URLs | \`http://localhost:3000/quotes\` |
| Canonical link tag | Canonical URL hints |
| Meta robots nofollow | Meta robots directives |
| X-Robots-Tag header | HTTP-level robots directive |
| X-RateLimit-Remaining | Rate limit awareness |
| Trailing slash | \`/quotes/\` handling |

## Expected Crawler Behavior

A correct crawler should:

1. Start at http://localhost:3000/ (or use /sitemap.xml / robots.txt)
2. Respect robots.txt — skip /admin/ and /private/
3. Follow redirects (301, 302) without infinite loops
4. Detect the infinite trap at /infinite/ and stop
5. Handle slow responses gracefully (timeout)
6. Deduplicate URLs (/quotes vs /quotes/ vs /quotes/index)
7. Ignore javascript:, mailto:, empty hrefs, and HTML comment links
8. Normalize absolute, relative, and protocol-relative URLs
9. Track depth and avoid going too deep
10. Discover ~80-100 unique pages across 5 levels

## Data

- 24 quotes from 20 diverse authors
- 20 tags: inspiration, wisdom, life, motivation, science, leadership, perseverance, happiness, dreams, future, knowledge, change, courage, action, philosophy, imagination, fear, kindness, success, time

## Tech Stack

- Express 4.x with EJS templates
- Server-rendered HTML (no client-side rendering)
- Single server.js entry point
- Data stored in data/quotes.json
