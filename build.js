#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');

const GITHUB_PAGES_URL = 'https://gencay.github.io/crawl';
const BASE_PATH = '/crawl';
const DOCS_DIR = path.join(__dirname, 'docs');

const app = require('./server');
const data = require('./data/quotes.json');
const { quotes, authors } = data;

// ── Helpers ──────────────────────────────────────────────────

function getAllTags() {
  const tagSet = new Set();
  quotes.forEach(q => q.tags.forEach(t => tagSet.add(t)));
  return Array.from(tagSet).sort();
}

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function fetchURL(port, urlPath) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1',
      port,
      path: urlPath,
      method: 'GET',
      headers: { 'Accept': 'text/html' },
    };
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(new Error(`Timeout: ${urlPath}`)); });
    req.end();
  });
}

function replaceLocalhost(html, port) {
  let result = html
    .replace(/http:\/\/localhost:3000/g, GITHUB_PAGES_URL)
    .replace(/\/\/localhost:3000/g, `//${GITHUB_PAGES_URL.replace('https://', '')}`)
    .replace(new RegExp(`http://127\\.0\\.0\\.1:${port}`, 'g'), GITHUB_PAGES_URL)
    .replace(new RegExp(`//127\\.0\\.0\\.1:${port}`, 'g'), `//${GITHUB_PAGES_URL.replace('https://', '')}`)
    .replace(/localhost:3000/g, GITHUB_PAGES_URL.replace('https://', ''));

  // Rewrite root-relative URLs in HTML attributes for GitHub Pages subpath
  // (?!\/) avoids matching protocol-relative URLs like //example.com
  result = result.replace(/((?:href|src|action)\s*=\s*")\/(?!\/)/g, `$1${BASE_PATH}/`);

  // Rewrite meta refresh redirect targets
  result = result.replace(/(content="0;\s*url=)\/(?!\/)/g, `$1${BASE_PATH}/`);

  // Fix any accidental double base paths
  result = result.replace(new RegExp(`(${BASE_PATH}){2,}`, 'g'), BASE_PATH);

  return result;
}

function writeStaticPage(urlPath, html) {
  const clean = urlPath.replace(/^\//, '') || 'index.html';
  let filePath;
  if (clean === 'index.html') {
    filePath = path.join(DOCS_DIR, 'index.html');
  } else {
    filePath = path.join(DOCS_DIR, clean, 'index.html');
  }
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, html, 'utf8');
  return filePath;
}

function writeRedirectPage(urlPath, targetUrl) {
  const fullTarget = BASE_PATH + targetUrl;
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=${fullTarget}">
  <link rel="canonical" href="${fullTarget}">
  <title>Redirecting...</title>
</head>
<body>
  <p>Redirecting to <a href="${fullTarget}">${fullTarget}</a>...</p>
</body>
</html>`;
  return writeStaticPage(urlPath, html);
}

// ── Build all URLs ──────────────────────────────────────────

async function build() {
  console.log('🔨 Starting static site build...\n');

  // Clean docs dir
  if (fs.existsSync(DOCS_DIR)) {
    fs.rmSync(DOCS_DIR, { recursive: true });
  }
  mkdirp(DOCS_DIR);

  // Start server on random port
  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
    s.on('error', reject);
  });
  const port = server.address().port;
  console.log(`  Server started on port ${port}\n`);

  // Collect all URLs to fetch
  const pageURLs = [];
  const totalPages = Math.ceil(quotes.length / 5);
  const allTags = getAllTags();
  const authorSlugs = Object.keys(authors);

  // Level 0
  pageURLs.push('/');

  // Level 1
  pageURLs.push('/quotes');
  pageURLs.push('/authors');
  pageURLs.push('/tags');
  pageURLs.push('/about');

  // Paginated quotes
  for (let p = 1; p <= totalPages; p++) {
    pageURLs.push(`/quotes/page/${p}`);
  }

  // Individual quotes + deep pages
  for (const q of quotes) {
    pageURLs.push(`/quotes/${q.id}`);
    pageURLs.push(`/quotes/${q.id}/similar`);
    pageURLs.push(`/quotes/${q.id}/similar/by-tag`);
  }

  // Authors + sub-pages
  for (const slug of authorSlugs) {
    pageURLs.push(`/authors/${slug}`);
    pageURLs.push(`/authors/${slug}/quotes`);
    pageURLs.push(`/authors/${slug}/bio`);
  }

  // Tags
  for (const tag of allTags) {
    pageURLs.push(`/tags/${tag}`);
  }

  // Misc pages
  pageURLs.push('/sitemap');
  pageURLs.push('/admin/dashboard');
  pageURLs.push('/private/internal');
  pageURLs.push('/slow-page');

  // Infinite depth (5 days only)
  const infiniteDays = [
    '/infinite/2024/01/01',
    '/infinite/2024/01/02',
    '/infinite/2024/01/03',
    '/infinite/2024/01/04',
    '/infinite/2024/01/05',
  ];
  pageURLs.push(...infiniteDays);

  // Fetch and write all pages
  let success = 0;
  let errors = 0;

  for (const url of pageURLs) {
    try {
      const res = await fetchURL(port, url);
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const html = replaceLocalhost(res.body, port);
        const file = writeStaticPage(url, html);
        console.log(`  ✅ ${url} → ${path.relative(DOCS_DIR, file)}`);
        success++;
      } else if (res.statusCode >= 300 && res.statusCode < 400) {
        // Follow redirect - but we handle known redirects separately below
        console.log(`  ⏭️  ${url} → redirect (${res.statusCode}), skipping`);
      } else {
        console.log(`  ❌ ${url} → HTTP ${res.statusCode}`);
        errors++;
      }
    } catch (err) {
      console.log(`  ❌ ${url} → ${err.message}`);
      errors++;
    }
  }

  // Write redirect pages
  console.log('\n  Writing redirect pages...');
  const redirects = [
    { from: '/old-quotes', to: '/quotes/' },
    { from: '/legacy/authors', to: '/authors' },
    { from: '/redirect-chain', to: '/redirect-step2' },
    { from: '/redirect-step2', to: '/quotes' },
    { from: '/infinite', to: '/infinite/2024/01/01' },
  ];

  for (const r of redirects) {
    const file = writeRedirectPage(r.from, r.to);
    console.log(`  ↪️  ${r.from} → ${r.to} (${path.relative(DOCS_DIR, file)})`);
  }

  // Copy static files
  console.log('\n  Copying static files...');
  const robotsTxt = fs.readFileSync(path.join(__dirname, 'public', 'robots.txt'), 'utf8');
  fs.writeFileSync(
    path.join(DOCS_DIR, 'robots.txt'),
    robotsTxt.replace(/http:\/\/localhost:3000/g, GITHUB_PAGES_URL),
    'utf8'
  );
  console.log('  📄 robots.txt');

  fs.copyFileSync(
    path.join(__dirname, 'public', 'style.css'),
    path.join(DOCS_DIR, 'style.css')
  );
  console.log('  📄 style.css');

  // Generate sitemap.xml
  console.log('\n  Generating sitemap.xml...');
  try {
    const res = await fetchURL(port, '/sitemap.xml');
    if (res.statusCode === 200) {
      const xml = replaceLocalhost(res.body, port);
      fs.writeFileSync(path.join(DOCS_DIR, 'sitemap.xml'), xml, 'utf8');
      console.log('  📄 sitemap.xml');
    } else {
      console.log(`  ❌ sitemap.xml → HTTP ${res.statusCode}`);
    }
  } catch (err) {
    console.log(`  ❌ sitemap.xml → ${err.message}`);
  }

  // Create .nojekyll
  fs.writeFileSync(path.join(DOCS_DIR, '.nojekyll'), '', 'utf8');
  console.log('  📄 .nojekyll');

  // Close server
  server.close();

  console.log(`\n✅ Build complete! ${success} pages rendered, ${errors} errors.`);
  console.log(`📁 Output: ${DOCS_DIR}\n`);
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
