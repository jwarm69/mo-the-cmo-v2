/**
 * Simple URL scraper utility for competitor content monitoring.
 * Uses native fetch with a timeout and basic HTML-to-text extraction.
 */

const MAX_CONTENT_LENGTH = 10_000;
const FETCH_TIMEOUT_MS = 10_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; Mo-CMO-Bot/1.0; +https://mo-cmo.com)";

/**
 * Scrape a single URL and return extracted text content and page title.
 * Returns null on any error (network, timeout, invalid content, etc.).
 */
export async function scrapeUrl(
  url: string
): Promise<{ content: string; title: string } | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,*/*",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const html = await res.text();

    // Extract title from <title> tag
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch
      ? decodeEntities(titleMatch[1].trim())
      : new URL(url).hostname;

    // Strip HTML to plain text
    const content = stripHtml(html);

    if (content.length < 50) return null;

    return {
      content: content.slice(0, MAX_CONTENT_LENGTH),
      title: title.slice(0, 500),
    };
  } catch {
    return null;
  }
}

/**
 * Strip HTML tags, scripts, styles, and decode common entities.
 * Produces clean whitespace-normalized plain text.
 */
function stripHtml(html: string): string {
  return decodeEntities(
    html
      // Remove script and style blocks entirely
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "")
      // Remove all remaining HTML tags
      .replace(/<[^>]+>/g, " ")
      // Collapse whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Decode common HTML entities into their plain-text equivalents.
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_match, code) =>
      String.fromCharCode(parseInt(code, 10))
    )
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
}
