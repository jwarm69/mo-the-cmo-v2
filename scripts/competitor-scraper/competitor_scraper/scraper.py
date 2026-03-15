"""Core scraping logic using Scrapling with anti-bot bypass."""

import re
import logging
from typing import Optional

from scrapling.fetchers import StealthyFetcher, Fetcher

from .config import MAX_CONTENT_LENGTH

logger = logging.getLogger(__name__)


def detect_platform(url: str) -> Optional[str]:
    """Detect social platform from URL."""
    url_lower = url.lower()
    if "instagram.com" in url_lower:
        return "instagram"
    if "tiktok.com" in url_lower:
        return "tiktok"
    if "twitter.com" in url_lower or "x.com" in url_lower:
        return "twitter"
    if "facebook.com" in url_lower:
        return "facebook"
    if "linkedin.com" in url_lower:
        return "linkedin"
    return None


def scrape_url(url: str) -> Optional[dict]:
    """
    Scrape a URL with Scrapling. Returns:
        {"content": str, "title": str, "platform": str|None, "url": str}
    or None on failure.
    """
    platform = detect_platform(url)

    try:
        if platform in ("instagram", "tiktok", "twitter"):
            # Social profiles need stealth browser to render JS
            logger.info("Using StealthyFetcher for %s (%s)", url, platform)
            page = StealthyFetcher.fetch(url, headless=True, timeout=30000)
        else:
            # Regular websites — try basic first, fall back to stealth
            try:
                logger.info("Trying Fetcher for %s", url)
                page = Fetcher.get(url, timeout=15)
            except Exception:
                logger.info("Basic fetch failed, falling back to StealthyFetcher for %s", url)
                page = StealthyFetcher.fetch(url, headless=True, timeout=30000)

        # Extract title
        title_el = page.css_first("title")
        title = title_el.text() if title_el else ""

        # Extract main content — try semantic selectors first
        content = _extract_content(page, platform)

        if not content or len(content.strip()) < 50:
            logger.warning("Insufficient content from %s (length=%d)", url, len(content or ""))
            return None

        return {
            "content": content[:MAX_CONTENT_LENGTH],
            "title": title[:500] if title else "",
            "platform": platform,
            "url": url,
        }

    except Exception as e:
        logger.error("Scrape failed for %s: %s", url, e)
        return None


def _extract_content(page, platform: Optional[str]) -> str:
    """Extract text content from a scraped page, with platform-aware selectors."""

    if platform == "instagram":
        return _extract_instagram(page)
    elif platform == "tiktok":
        return _extract_tiktok(page)
    elif platform == "twitter":
        return _extract_twitter(page)

    # Generic website extraction — try semantic elements first
    for selector in ["main", "article", '[role="main"]', "#content", ".content"]:
        el = page.css_first(selector)
        if el and len(el.text().strip()) > 100:
            return _clean_text(el.text())

    # Fallback: get body text minus nav/footer/script
    body = page.css_first("body")
    if body:
        return _clean_text(body.text())

    return ""


def _extract_instagram(page) -> str:
    """Extract public Instagram profile data."""
    parts = []

    # Bio / header section
    header = page.css_first("header")
    if header:
        parts.append(header.text())

    # Meta description often contains bio + stats
    meta_desc = page.css_first('meta[name="description"]')
    if meta_desc:
        desc = meta_desc.attrib.get("content", "")
        if desc:
            parts.append(f"Meta: {desc}")

    # Post captions from article elements
    articles = page.css("article")
    for article in articles[:12]:
        text = article.text().strip()
        if text:
            parts.append(text)

    # og:description often has follower stats
    og_desc = page.css_first('meta[property="og:description"]')
    if og_desc:
        desc = og_desc.attrib.get("content", "")
        if desc:
            parts.append(f"OG: {desc}")

    return _clean_text("\n\n".join(parts))


def _extract_tiktok(page) -> str:
    """Extract public TikTok profile data."""
    parts = []

    # Profile header with bio and stats
    header = page.css_first('[data-e2e="user-page"]')
    if header:
        parts.append(header.text())

    # Bio
    bio = page.css_first('[data-e2e="user-bio"]')
    if bio:
        parts.append(f"Bio: {bio.text()}")

    # Stats (followers, following, likes)
    stats = page.css('[data-e2e="user-stats"]')
    for stat in stats:
        parts.append(stat.text())

    # Video descriptions
    video_descs = page.css('[data-e2e="video-desc"]')
    for desc in video_descs[:10]:
        parts.append(desc.text())

    # Fallback: meta tags
    meta_desc = page.css_first('meta[name="description"]')
    if meta_desc:
        desc = meta_desc.attrib.get("content", "")
        if desc:
            parts.append(f"Meta: {desc}")

    return _clean_text("\n\n".join(parts))


def _extract_twitter(page) -> str:
    """Extract public Twitter/X profile data."""
    parts = []

    # Profile bio area
    bio = page.css_first('[data-testid="UserDescription"]')
    if bio:
        parts.append(f"Bio: {bio.text()}")

    # Profile header name
    name = page.css_first('[data-testid="UserName"]')
    if name:
        parts.append(f"Name: {name.text()}")

    # Tweets
    tweets = page.css('[data-testid="tweetText"]')
    for tweet in tweets[:20]:
        parts.append(tweet.text())

    # Fallback: meta description
    meta_desc = page.css_first('meta[name="description"]')
    if meta_desc:
        desc = meta_desc.attrib.get("content", "")
        if desc:
            parts.append(f"Meta: {desc}")

    # og:description often has full profile summary
    og_desc = page.css_first('meta[property="og:description"]')
    if og_desc:
        desc = og_desc.attrib.get("content", "")
        if desc:
            parts.append(f"OG: {desc}")

    return _clean_text("\n\n".join(parts))


def _clean_text(text: str) -> str:
    """Normalize whitespace and remove excessive blank lines."""
    # Collapse multiple spaces/tabs within lines
    text = re.sub(r"[^\S\n]+", " ", text)
    # Collapse 3+ newlines into 2
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()
