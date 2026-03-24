# Quotes & Authors

A quotes and authors website with multiple levels of page depth. Built with Express and EJS.

## Quick Start

```bash
npm install
npm start
# => http://localhost:3000
```

Or visit the live version: https://gencay.github.io/crawl/

## The Exercise

Write a web crawler that starts at `http://localhost:3000/` and discovers as many unique pages as possible.

Your crawler should:

- Start from the homepage and follow links to discover pages
- Handle different types of URLs (relative, absolute, etc.)
- Avoid crawling the same page twice
- Be resilient to slow or misbehaving pages
- Check `robots.txt` for crawling rules

## Site Overview

The site contains:

- **Quotes** — browsable, paginated collection of quotes
- **Authors** — author profiles with bios and their quotes
- **Tags** — quotes organized by topic
- **About** — info page

Standard web features are present: `robots.txt`, `sitemap.xml`, pagination, and various link formats throughout the HTML.

## Running Locally

```bash
npm install
npm start
```

The server runs on port 3000 by default.

## Tech Stack

- Express 4.x with EJS templates
- Server-rendered HTML (no client-side rendering)
- Data stored in `data/quotes.json`
