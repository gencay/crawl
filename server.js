const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Load data
const data = require('./data/quotes.json');
const { quotes, authors } = data;

// ─── Helpers ──────────────────────────────────────────────────

function getAllTags() {
  const tagSet = new Set();
  quotes.forEach(q => q.tags.forEach(t => tagSet.add(t)));
  return Array.from(tagSet).sort();
}

function getTagsWithCounts() {
  const counts = {};
  quotes.forEach(q => q.tags.forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
  return getAllTags().map(name => ({ name, count: counts[name] }));
}

function getQuotesByTag(tag) {
  return quotes.filter(q => q.tags.includes(tag));
}

function getQuotesByAuthor(slug) {
  return quotes.filter(q => q.author === slug);
}

function getAuthorQuoteCounts() {
  const counts = {};
  quotes.forEach(q => { counts[q.author] = (counts[q.author] || 0) + 1; });
  return counts;
}

function getSimilarQuotes(id) {
  const quote = quotes.find(q => q.id === id);
  if (!quote) return [];
  return quotes.filter(q => q.id !== id && q.tags.some(t => quote.tags.includes(t)));
}

function getSimilarGroupedByTag(id) {
  const quote = quotes.find(q => q.id === id);
  if (!quote) return {};
  const grouped = {};
  quote.tags.forEach(tag => {
    const matching = quotes.filter(q => q.id !== id && q.tags.includes(tag));
    if (matching.length > 0) grouped[tag] = matching;
  });
  return grouped;
}

function paginateArray(arr, page, perPage = 5) {
  const start = (page - 1) * perPage;
  return {
    items: arr.slice(start, start + perPage),
    currentPage: page,
    totalPages: Math.ceil(arr.length / perPage),
    total: arr.length
  };
}

// ─── Rate-limit header on all responses ───────────────────────
let requestCount = 0;
app.use((req, res, next) => {
  requestCount++;
  res.set('X-RateLimit-Remaining', String(Math.max(0, 100 - (requestCount % 100))));
  next();
});

// ─── X-Robots-Tag for admin routes ────────────────────────────
app.use('/admin', (req, res, next) => {
  res.set('X-Robots-Tag', 'noindex');
  next();
});

// ─── Level 0: Homepage ────────────────────────────────────────
app.get('/', (req, res) => {
  res.render('index', { quotes, authors });
});

// ─── Level 1: Listings ───────────────────────────────────────

function renderQuotes(req, res, page) {
  let sorted = [...quotes];
  if (req.query.sort === 'newest') sorted.reverse();
  const paginated = paginateArray(sorted, page);
  res.render('quotes', {
    quotes: paginated.items,
    authors,
    currentPage: paginated.currentPage,
    totalPages: paginated.totalPages
  });
}

app.get('/quotes', (req, res) => renderQuotes(req, res, 1));
app.get('/quotes/', (req, res) => renderQuotes(req, res, 1));
app.get('/quotes/index', (req, res) => renderQuotes(req, res, 1));

app.get('/authors', (req, res) => {
  res.render('authors', { authors, quoteCounts: getAuthorQuoteCounts() });
});

app.get('/tags', (req, res) => {
  res.render('tags', { tags: getTagsWithCounts() });
});

app.get('/about', (req, res) => {
  res.render('about');
});

// ─── Level 2: Paginated / Filtered ───────────────────────────

app.get('/quotes/page/:page', (req, res) => {
  const page = parseInt(req.params.page, 10) || 1;
  renderQuotes(req, res, page);
});

app.get('/authors/:slug', (req, res) => {
  const author = authors[req.params.slug];
  if (!author) return res.status(404).send('Author not found');
  const authorQuotes = getQuotesByAuthor(req.params.slug);
  res.render('author-detail', { author, slug: req.params.slug, quotes: authorQuotes });
});

app.get('/tags/:tag', (req, res) => {
  const tagQuotes = getQuotesByTag(req.params.tag);
  res.render('tag-quotes', { tag: req.params.tag, quotes: tagQuotes, authors });
});

// ─── Level 3: Individual items ───────────────────────────────

app.get('/quotes/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const quote = quotes.find(q => q.id === id);
  if (!quote) return res.status(404).send('Quote not found');
  res.render('quote-detail', { quote, authors });
});

app.get('/authors/:slug/quotes', (req, res) => {
  const author = authors[req.params.slug];
  if (!author) return res.status(404).send('Author not found');
  const authorQuotes = getQuotesByAuthor(req.params.slug);
  res.render('author-quotes', { author, slug: req.params.slug, quotes: authorQuotes });
});

// ─── Level 4: Deep pages ────────────────────────────────────

app.get('/quotes/:id/similar', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const quote = quotes.find(q => q.id === id);
  if (!quote) return res.status(404).send('Quote not found');
  const similar = getSimilarQuotes(id);
  res.render('similar', { quote, similar, authors });
});

app.get('/authors/:slug/bio', (req, res) => {
  const author = authors[req.params.slug];
  if (!author) return res.status(404).send('Author not found');
  res.render('author-bio', { author, slug: req.params.slug });
});

// ─── Level 5: Deepest ───────────────────────────────────────

app.get('/quotes/:id/similar/by-tag', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const quote = quotes.find(q => q.id === id);
  if (!quote) return res.status(404).send('Quote not found');
  const grouped = getSimilarGroupedByTag(id);
  res.render('similar-by-tag', { quote, grouped, authors });
});

// ─── Edge cases ─────────────────────────────────────────────

app.get('/admin/dashboard', (req, res) => {
  res.render('admin', {
    totalQuotes: quotes.length,
    totalAuthors: Object.keys(authors).length
  });
});

app.get('/private/internal', (req, res) => {
  res.render('private');
});

// Redirects
app.get('/old-quotes', (req, res) => res.redirect(301, '/quotes'));
app.get('/legacy/authors', (req, res) => res.redirect(302, '/authors'));
app.get('/redirect-chain', (req, res) => res.redirect(301, '/redirect-step2'));
app.get('/redirect-step2', (req, res) => res.redirect(301, '/quotes'));

// Infinite depth trap
app.get('/infinite', (req, res) => res.redirect(302, '/infinite/2024/01/01'));

app.get('/infinite/:year/:month/:day', (req, res) => {
  const year = parseInt(req.params.year, 10);
  const month = parseInt(req.params.month, 10);
  const day = parseInt(req.params.day, 10);

  const current = new Date(year, month - 1, day);
  const next = new Date(current); next.setDate(next.getDate() + 1);
  const prev = new Date(current); prev.setDate(prev.getDate() - 1);

  const pad = n => String(n).padStart(2, '0');

  res.render('infinite', {
    year: pad(year), month: pad(month), day: pad(day),
    nextYear: next.getFullYear(), nextMonth: pad(next.getMonth() + 1), nextDay: pad(next.getDate()),
    prevYear: prev.getFullYear(), prevMonth: pad(prev.getMonth() + 1), prevDay: pad(prev.getDate())
  });
});

// Slow page
app.get('/slow-page', (req, res) => {
  setTimeout(() => res.render('slow'), 2000);
});

// Sitemap HTML page
app.get('/sitemap', (req, res) => {
  res.render('sitemap', {
    quotes,
    authors,
    authorSlugs: Object.keys(authors),
    allTags: getAllTags()
  });
});

// Sitemap.xml
app.get('/sitemap.xml', (req, res) => {
  res.set('Content-Type', 'application/xml');
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  const urls = ['/', '/quotes', '/authors', '/tags', '/about'];
  quotes.forEach(q => urls.push('/quotes/' + q.id));
  Object.keys(authors).forEach(s => urls.push('/authors/' + s));
  getAllTags().forEach(t => urls.push('/tags/' + t));

  urls.forEach(u => {
    xml += '  <url><loc>http://localhost:3000' + u + '</loc></url>\n';
  });
  xml += '</urlset>\n';
  res.send(xml);
});

// ─── Start ──────────────────────────────────────────────────

if (require.main === module) {
  app.listen(PORT, () => {
    console.log('Quotes & Authors site running at http://localhost:' + PORT);
  });
}

module.exports = app;
