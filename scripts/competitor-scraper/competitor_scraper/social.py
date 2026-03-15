"""Social media profile scraping with structured data extraction.

Extends the base scraper with platform-specific structured output:
follower counts, post metrics, content breakdowns, etc.
"""

import re
import json
import logging
from typing import Optional

from scrapling.fetchers import StealthyFetcher

from .config import MAX_CONTENT_LENGTH

logger = logging.getLogger(__name__)


def scrape_social_profile(url: str, platform: str) -> Optional[dict]:
    """
    Scrape a social media profile URL and extract structured data.
    Returns:
        {
            "content": str,       # Readable summary for GPT analysis
            "title": str,
            "platform": str,
            "url": str,
            "structured": dict,   # Platform-specific structured metrics
        }
    or None on failure.
    """
    try:
        logger.info("Scraping social profile: %s (%s)", url, platform)
        page = StealthyFetcher.fetch(url, headless=True, timeout=45000)

        if platform == "instagram":
            return _scrape_instagram_profile(page, url)
        elif platform == "tiktok":
            return _scrape_tiktok_profile(page, url)
        elif platform == "twitter":
            return _scrape_twitter_profile(page, url)
        else:
            logger.warning("Unsupported social platform: %s", platform)
            return None

    except Exception as e:
        logger.error("Social scrape failed for %s: %s", url, e)
        return None


def _scrape_instagram_profile(page, url: str) -> Optional[dict]:
    """Extract structured Instagram profile data."""
    structured = {
        "platform": "instagram",
        "bio": "",
        "followers": None,
        "following": None,
        "post_count": None,
        "recent_posts": [],
    }

    # Extract from meta description (most reliable for public profiles)
    # Format: "123K Followers, 456 Following, 789 Posts - See Instagram photos..."
    meta_desc = page.css_first('meta[name="description"]')
    if meta_desc:
        desc = meta_desc.attrib.get("content", "")
        # Parse follower/following/post counts
        counts = re.findall(r"([\d,.]+[KkMm]?)\s+(Followers?|Following|Posts?)", desc)
        for count_str, label in counts:
            num = _parse_count(count_str)
            label_lower = label.lower()
            if "follower" in label_lower:
                structured["followers"] = num
            elif "following" in label_lower:
                structured["following"] = num
            elif "post" in label_lower:
                structured["post_count"] = num

    # Bio from header
    header = page.css_first("header")
    if header:
        # Try to find the bio text within header
        bio_el = header.css_first(".-vDIg span, .FrS-d span")
        if bio_el:
            structured["bio"] = bio_el.text().strip()
        else:
            # Fallback: look for spans that aren't counts
            spans = header.css("span")
            for span in spans:
                text = span.text().strip()
                if len(text) > 20 and not re.match(r"^[\d,.]+", text):
                    structured["bio"] = text
                    break

    # og:description fallback for bio
    if not structured["bio"]:
        og_desc = page.css_first('meta[property="og:description"]')
        if og_desc:
            desc = og_desc.attrib.get("content", "")
            # OG description often starts with bio then stats
            if desc:
                structured["bio"] = desc[:500]

    # Recent posts from article elements
    articles = page.css("article")
    for article in articles[:12]:
        post_data = {"caption": "", "type": "photo"}
        # Check for video indicators
        if article.css_first("video, svg[aria-label='Reel'], svg[aria-label='Video']"):
            post_data["type"] = "video"
        elif article.css_first('[aria-label="Carousel"]'):
            post_data["type"] = "carousel"

        # Caption text
        text = article.text().strip()
        if text:
            post_data["caption"] = text[:500]
            structured["recent_posts"].append(post_data)

    # Build readable content summary
    content_parts = [f"Instagram Profile: {url}"]
    if structured["bio"]:
        content_parts.append(f"Bio: {structured['bio']}")
    if structured["followers"] is not None:
        content_parts.append(f"Followers: {structured['followers']:,}")
    if structured["post_count"] is not None:
        content_parts.append(f"Posts: {structured['post_count']:,}")

    if structured["recent_posts"]:
        content_parts.append(f"\nRecent posts ({len(structured['recent_posts'])}):")
        type_counts = {}
        for p in structured["recent_posts"]:
            type_counts[p["type"]] = type_counts.get(p["type"], 0) + 1
            if p["caption"]:
                content_parts.append(f"- [{p['type']}] {p['caption'][:200]}")
        content_parts.append(f"\nContent breakdown: {json.dumps(type_counts)}")

    content = "\n".join(content_parts)

    title_el = page.css_first("title")
    title = title_el.text() if title_el else f"Instagram: {url}"

    return {
        "content": content[:MAX_CONTENT_LENGTH],
        "title": title[:500],
        "platform": "instagram",
        "url": url,
        "structured": structured,
    }


def _scrape_tiktok_profile(page, url: str) -> Optional[dict]:
    """Extract structured TikTok profile data."""
    structured = {
        "platform": "tiktok",
        "bio": "",
        "followers": None,
        "following": None,
        "likes": None,
        "recent_videos": [],
    }

    # Bio
    bio_el = page.css_first('[data-e2e="user-bio"]')
    if bio_el:
        structured["bio"] = bio_el.text().strip()

    # Stats from data-e2e attributes
    followers_el = page.css_first('[data-e2e="followers-count"]')
    if followers_el:
        structured["followers"] = _parse_count(followers_el.text())

    following_el = page.css_first('[data-e2e="following-count"]')
    if following_el:
        structured["following"] = _parse_count(following_el.text())

    likes_el = page.css_first('[data-e2e="likes-count"]')
    if likes_el:
        structured["likes"] = _parse_count(likes_el.text())

    # Fallback: meta description
    if structured["followers"] is None:
        meta_desc = page.css_first('meta[name="description"]')
        if meta_desc:
            desc = meta_desc.attrib.get("content", "")
            counts = re.findall(r"([\d,.]+[KkMm]?)\s+(Followers?|Following|Likes?)", desc)
            for count_str, label in counts:
                num = _parse_count(count_str)
                label_lower = label.lower()
                if "follower" in label_lower and structured["followers"] is None:
                    structured["followers"] = num
                elif "following" in label_lower and structured["following"] is None:
                    structured["following"] = num
                elif "like" in label_lower and structured["likes"] is None:
                    structured["likes"] = num

    # Video descriptions
    video_descs = page.css('[data-e2e="video-desc"]')
    for desc in video_descs[:10]:
        video_data = {
            "description": desc.text().strip()[:500],
            "hashtags": [],
        }
        # Extract hashtags
        hashtags = re.findall(r"#(\w+)", desc.text())
        video_data["hashtags"] = hashtags
        structured["recent_videos"].append(video_data)

    # Build readable content
    content_parts = [f"TikTok Profile: {url}"]
    if structured["bio"]:
        content_parts.append(f"Bio: {structured['bio']}")
    if structured["followers"] is not None:
        content_parts.append(f"Followers: {structured['followers']:,}")
    if structured["likes"] is not None:
        content_parts.append(f"Total likes: {structured['likes']:,}")

    if structured["recent_videos"]:
        content_parts.append(f"\nRecent videos ({len(structured['recent_videos'])}):")
        all_hashtags = {}
        for v in structured["recent_videos"]:
            content_parts.append(f"- {v['description'][:200]}")
            for h in v["hashtags"]:
                all_hashtags[h] = all_hashtags.get(h, 0) + 1
        if all_hashtags:
            top_tags = sorted(all_hashtags.items(), key=lambda x: x[1], reverse=True)[:10]
            content_parts.append(f"\nTop hashtags: {', '.join(f'#{t}({c})' for t, c in top_tags)}")

    content = "\n".join(content_parts)

    title_el = page.css_first("title")
    title = title_el.text() if title_el else f"TikTok: {url}"

    return {
        "content": content[:MAX_CONTENT_LENGTH],
        "title": title[:500],
        "platform": "tiktok",
        "url": url,
        "structured": structured,
    }


def _scrape_twitter_profile(page, url: str) -> Optional[dict]:
    """Extract structured Twitter/X profile data."""
    structured = {
        "platform": "twitter",
        "bio": "",
        "name": "",
        "followers": None,
        "following": None,
        "recent_tweets": [],
    }

    # Profile name
    name_el = page.css_first('[data-testid="UserName"]')
    if name_el:
        structured["name"] = name_el.text().strip()

    # Bio
    bio_el = page.css_first('[data-testid="UserDescription"]')
    if bio_el:
        structured["bio"] = bio_el.text().strip()

    # Follower/following from profile header links
    follow_links = page.css('a[href*="/followers"], a[href*="/following"], a[href*="/verified_followers"]')
    for link in follow_links:
        text = link.text().strip()
        if "follower" in text.lower():
            num = _parse_count(re.sub(r"[^\d,.KkMm]", "", text))
            if num:
                structured["followers"] = num
        elif "following" in text.lower():
            num = _parse_count(re.sub(r"[^\d,.KkMm]", "", text))
            if num:
                structured["following"] = num

    # Fallback: meta description
    meta_desc = page.css_first('meta[name="description"]')
    if meta_desc:
        desc = meta_desc.attrib.get("content", "")
        if desc and not structured["bio"]:
            structured["bio"] = desc[:500]

    # Tweets
    tweet_els = page.css('[data-testid="tweetText"]')
    for tweet in tweet_els[:20]:
        tweet_data = {
            "text": tweet.text().strip()[:500],
            "has_media": False,
            "hashtags": [],
        }
        # Extract hashtags
        hashtags = re.findall(r"#(\w+)", tweet.text())
        tweet_data["hashtags"] = hashtags
        structured["recent_tweets"].append(tweet_data)

    # Build readable content
    content_parts = [f"Twitter/X Profile: {url}"]
    if structured["name"]:
        content_parts.append(f"Name: {structured['name']}")
    if structured["bio"]:
        content_parts.append(f"Bio: {structured['bio']}")
    if structured["followers"] is not None:
        content_parts.append(f"Followers: {structured['followers']:,}")
    if structured["following"] is not None:
        content_parts.append(f"Following: {structured['following']:,}")

    if structured["recent_tweets"]:
        content_parts.append(f"\nRecent tweets ({len(structured['recent_tweets'])}):")
        for t in structured["recent_tweets"]:
            content_parts.append(f"- {t['text'][:200]}")

    content = "\n".join(content_parts)

    title_el = page.css_first("title")
    title = title_el.text() if title_el else f"Twitter: {url}"

    return {
        "content": content[:MAX_CONTENT_LENGTH],
        "title": title[:500],
        "platform": "twitter",
        "url": url,
        "structured": structured,
    }


def _parse_count(text: str) -> Optional[int]:
    """Parse human-readable counts like '12.3K', '1.5M', '1,234'."""
    if not text:
        return None
    text = text.strip().replace(",", "")
    try:
        if text[-1].upper() == "K":
            return int(float(text[:-1]) * 1_000)
        elif text[-1].upper() == "M":
            return int(float(text[:-1]) * 1_000_000)
        elif text[-1].upper() == "B":
            return int(float(text[:-1]) * 1_000_000_000)
        else:
            return int(float(text))
    except (ValueError, IndexError):
        return None
