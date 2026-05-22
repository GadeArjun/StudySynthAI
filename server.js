// ddg-mixed-rich-search.js
// Node.js 18+
//
// INSTALL:
// npm install node-fetch cheerio p-limit
//
// FEATURES:
// - DuckDuckGo text search
// - DuckDuckGo image search
// - Rich page extraction
// - Fast concurrent enrichment
// - Reusable modular exports
// - Optimized performance
// - Clean architecture

import fetch from "node-fetch";
import { load } from "cheerio";
import pLimit from "p-limit";
import http from "node:http";
import https from "node:https";

/* =========================================================
 * CONSTANTS
 * =======================================================*/

const DDG_BASE = "https://duckduckgo.com";
const HTML_SEARCH = `${DDG_BASE}/html/`;
const IMAGE_API = `${DDG_BASE}/i.js`;

/* =========================================================
 * CONFIGURATION
 * =======================================================*/

export const CONFIG = {
  MAX_RESULTS: 3,
  IMAGE_MAX_RESULTS: 3,
  REQUEST_TIMEOUT: 8000,
  CONCURRENT_FETCHES: 3,
  POLITE_DELAY_MS: 250,
  MAX_CONTENT_LENGTH: 5000,
  RETRY_COUNT: 2,
};

/* =========================================================
 * KEEP-ALIVE AGENTS
 * Faster HTTP reuse
 * =======================================================*/

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 10,
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 10,
});

/* =========================================================
 * SIMPLE MEMORY CACHE
 * =======================================================*/

const vqdCache = new Map();

/* =========================================================
 * UTILITY: Delay
 * =======================================================*/

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* =========================================================
 * UTILITY: Normalize URLs
 * =======================================================*/

export function normalizeUrl(raw) {
  if (!raw) return null;

  try {
    // Decode DuckDuckGo redirect URLs
    if (raw.includes("uddg=")) {
      const u = new URL(raw, DDG_BASE);
      const uddg = u.searchParams.get("uddg");

      if (uddg) return decodeURIComponent(uddg);
    }

    // Protocol-relative URLs
    if (raw.startsWith("//")) {
      return `https:${raw}`;
    }

    // Add missing protocol
    if (!/^https?:\/\//i.test(raw)) {
      return `https://${raw}`;
    }

    return raw;
  } catch {
    return raw;
  }
}

/* =========================================================
 * UTILITY: Safe Fetch with Retry
 * =======================================================*/

export async function fetchWithRetry(
  url,
  options = {},
  retries = CONFIG.RETRY_COUNT
) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, CONFIG.REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        agent: (parsedURL) =>
          parsedURL.protocol === "http:" ? httpAgent : httpsAgent,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response;
    } catch (err) {
      clearTimeout(timeout);

      if (attempt >= retries) {
        throw err;
      }

      await delay(300 * (attempt + 1));
    }
  }
}

/* =========================================================
 * DUCKDUCKGO TEXT SEARCH
 * =======================================================*/

export async function ddgTextSearch(query, maxResults = CONFIG.MAX_RESULTS) {
  const params = new URLSearchParams({ q: query });

  const response = await fetchWithRetry(`${HTML_SEARCH}?${params.toString()}`, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  const html = await response.text();
  const $ = load(html);

  const results = [];

  $(".result").each((_, element) => {
    if (results.length >= maxResults) return false;

    const titleElement = $(element).find(".result__a");
    const snippetElement = $(element).find(".result__snippet");

    const title = titleElement.text().trim();
    const snippet = snippetElement.text().trim();

    const rawUrl = titleElement.attr("href");

    const url = normalizeUrl(rawUrl);

    if (!url) return;

    results.push({
      title,
      snippet,
      url,
    });
  });

  return results;
}

/* =========================================================
 * GET VQD TOKEN
 * Required for image search
 * Cached for speed
 * =======================================================*/

export async function getVQD(query) {
  if (vqdCache.has(query)) {
    return vqdCache.get(query);
  }

  const response = await fetchWithRetry(
    `${DDG_BASE}/?q=${encodeURIComponent(query)}`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    }
  );

  const html = await response.text();

  const match = html.match(/vqd='([^']+)'/) || html.match(/vqd="([^"]+)"/);

  if (!match) {
    throw new Error("Unable to extract vqd token");
  }

  const token = match[1];

  vqdCache.set(query, token);

  return token;
}

/* =========================================================
 * DUCKDUCKGO IMAGE SEARCH
 * =======================================================*/

export async function ddgImageSearch(
  query,
  maxResults = CONFIG.IMAGE_MAX_RESULTS
) {
  const vqd = await getVQD(query);

  const params = new URLSearchParams({
    q: query,
    o: "json",
    l: "wt-wt",
    p: "-1",
    s: "0",
    vqd,
  });

  const response = await fetchWithRetry(`${IMAGE_API}?${params.toString()}`, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Referer: DDG_BASE,
    },
  });

  const json = await response.json();

  if (!json.results) {
    return [];
  }

  return json.results.slice(0, maxResults).map((img) => ({
    title: img.title || null,
    image: img.image || null,
    thumbnail: img.thumbnail || null,
    url: normalizeUrl(img.url),
    width: img.width || null,
    height: img.height || null,
    source: img.source || null,
  }));
}

/* =========================================================
 * FETCH PAGE HTML
 * =======================================================*/

export async function fetchPage(url) {
  try {
    const response = await fetchWithRetry(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const html = await response.text();

    return load(html);
  } catch {
    return null;
  }
}

/* =========================================================
 * CONTENT CLEANER
 * =======================================================*/

function cleanText(text) {
  return text.replace(/\s+/g, " ").trim();
}

// =========================================================
// PAGE DETAILS EXTRACTION
// Optimized + Inline Link Preservation
// =========================================================

export async function extractPageDetails(url) {
  /* =====================================================
   * NORMALIZE URL
   * ===================================================*/

  const normalized = normalizeUrl(url);

  if (!normalized) return null;

  /* =====================================================
   * FETCH PAGE
   * ===================================================*/

  const $ = await fetchPage(normalized);

  if (!$) return null;

  /* =====================================================
   * REMOVE USELESS ELEMENTS
   * Improves speed + reduces noisy extraction
   * ===================================================*/

  $(
    `
      script,
      style,
      noscript,
      iframe,
      svg,
      nav,
      footer,
      header,
      form,
      aside,
      ads,
      .ads,
      .advertisement,
      .sidebar,
      .popup,
      .cookie,
      .banner,
      .comments
      `
  ).remove();

  /* =====================================================
   * BASIC METADATA
   * ===================================================*/

  const pageTitle = cleanText($("title").first().text());

  const metaDesc =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="twitter:description"]').attr("content") ||
    null;

  const h1 = cleanText($("h1").first().text());

  /* =====================================================
   * CONTENT STORAGE
   * ===================================================*/

  const content = [];

  /* =====================================================
   * CONTENT EXTRACTION
   * Preserves inline links
   * ===================================================*/

  $("article, section, p, li, h2, h3, h4").each((_, el) => {
    // Clone so original DOM is untouched
    const cloned = $(el).clone();

    /* ===============================================
     * CONVERT LINKS INTO INLINE TEXT
     * Example:
     * React Docs (https://react.dev)
     * =============================================*/

    cloned.find("a[href]").each((_, a) => {
      try {
        const href = $(a).attr("href");

        if (!href) return;

        // Ignore junk links
        if (
          href.startsWith("#") ||
          href.startsWith("javascript:") ||
          href.startsWith("mailto:") ||
          href.startsWith("tel:")
        ) {
          $(a).remove();
          return;
        }

        // Convert relative → absolute URL
        const absoluteUrl = new URL(href, normalized).href;

        // Clean anchor text
        const anchorText = cleanText($(a).text()) || absoluteUrl;

        // Replace anchor with inline URL text
        $(a).replaceWith(`${anchorText} (${absoluteUrl})`);
      } catch {
        // Remove malformed links
        $(a).remove();
      }
    });

    /* ===============================================
     * CLEAN FINAL TEXT
     * =============================================*/

    const text = cleanText(cloned.text());

    // Ignore tiny/noisy content
    if (text.length > 40) {
      content.push(text);
    }
  });

  /* =====================================================
   * JOIN CONTENT
   * ===================================================*/

  let allPageContent = content.join("\n");

  /* =====================================================
   * REMOVE EXCESSIVE EMPTY LINES
   * ===================================================*/

  allPageContent = allPageContent.replace(/\n\s*\n/g, "\n").trim();

  /* =====================================================
   * SMART TRUNCATION
   * Prevents token explosion
   * ===================================================*/

  if (allPageContent.length > CONFIG.MAX_CONTENT_LENGTH) {
    allPageContent =
      allPageContent.slice(0, CONFIG.MAX_CONTENT_LENGTH) + "\n...[truncated]";
  }

  /* =====================================================
   * RETURN STRUCTURED DATA
   * ===================================================*/

  return {
    pageTitle,
    metaDesc,
    h1,
    allPageContent,
  };
}

/* =========================================================
 * IMAGE MATCHING
 * =======================================================*/

function attachBestImage(result, images, used) {
  // Match by hostname first
  try {
    const host = new URL(result.url).hostname;

    for (const img of images) {
      if (used.has(img.image)) continue;

      if (img.url?.includes(host)) {
        used.add(img.image);
        return img;
      }
    }
  } catch {}

  // Match by title similarity
  const resultWords = result.title?.toLowerCase().split(" ").slice(0, 4);

  if (resultWords?.length) {
    for (const img of images) {
      if (used.has(img.image)) continue;

      const imgTitle = img.title?.toLowerCase() || "";

      const matched = resultWords.some((w) => imgTitle.includes(w));

      if (matched) {
        used.add(img.image);
        return img;
      }
    }
  }

  // Fallback
  for (const img of images) {
    if (!used.has(img.image)) {
      used.add(img.image);
      return img;
    }
  }

  return null;
}

/* =========================================================
 * MAIN MIXED SEARCH
 * =======================================================*/

export async function ddgMixedRichSearch(
  query,
  maxResults = CONFIG.MAX_RESULTS
) {
  // Run searches in parallel
  const [textResults, imageResults] = await Promise.all([
    ddgTextSearch(query, maxResults),
    ddgImageSearch(query, maxResults),
  ]);

  const usedImages = new Set();

  // Attach images
  const combined = textResults.map((result) => {
    const image = attachBestImage(result, imageResults, usedImages);

    return {
      ...result,
      image: image
        ? {
            url: image.image || image.thumbnail,
            title: image.title,
            source: image.source,
          }
        : null,
    };
  });

  // Concurrent enrichment
  const limit = pLimit(CONFIG.CONCURRENT_FETCHES);

  const enriched = await Promise.all(
    combined.map((item) =>
      limit(async () => {
        const details = item.url ? await extractPageDetails(item.url) : null;

        return {
          ...item,
          details,
        };
      })
    )
  );

  return enriched;
}

/* =========================================================
 * CONFIG SETTER
 * =======================================================*/

export function setConfig(newConfig = {}) {
  Object.assign(CONFIG, newConfig);
}

/* =========================================================
 * CLI SUPPORT
 * =======================================================*/

async function runCLI() {
  try {
    const query = `First Year Engineering (FE) Engineering mathematics 1 notes`;

    const results = await ddgMixedRichSearch(query);

    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error("ERROR:", err.message);
    process.exit(1);
  }
}

runCLI();
