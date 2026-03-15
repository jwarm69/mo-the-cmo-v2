"""CLI entry point: python -m competitor_scraper

Usage:
    python -m competitor_scraper --org-slug bite-club
    python -m competitor_scraper --competitor-id <uuid>
    python -m competitor_scraper --org-slug bite-club --stale-days 7
"""

import argparse
import logging
import sys
import json

from .db import (
    get_competitors_for_org,
    get_competitor_by_id,
    get_stale_competitors,
    store_scraped_content,
    update_last_scraped,
)
from .scraper import scrape_url, detect_platform
from .social import scrape_social_profile

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("competitor_scraper")


def scrape_competitor(competitor: dict) -> int:
    """Scrape all URLs for a competitor. Returns count of successfully scraped URLs."""
    comp_id = str(competitor["id"])
    org_id = str(competitor["org_id"])
    name = competitor["name"]
    urls = competitor.get("urls") or []
    social_profiles = competitor.get("social_profiles") or {}

    # Collect all URLs to scrape: regular URLs + social profile URLs
    all_urls = list(urls)
    for platform_name, profile_url in social_profiles.items():
        if profile_url and profile_url not in all_urls:
            all_urls.append(profile_url)

    if not all_urls:
        logger.warning("No URLs for competitor '%s' (%s)", name, comp_id)
        return 0

    logger.info("Scraping competitor '%s' — %d URL(s)", name, len(all_urls))
    scraped_count = 0

    for url in all_urls:
        platform = detect_platform(url)

        # Use social-specific scraper for social profiles
        if platform in ("instagram", "tiktok", "twitter"):
            result = scrape_social_profile(url, platform)
        else:
            result = scrape_url(url)

        if result is None:
            logger.warning("  ✗ Failed: %s", url)
            continue

        store_scraped_content(
            competitor_id=comp_id,
            org_id=org_id,
            url=url,
            content=result["content"],
            platform=result.get("platform"),
        )
        logger.info("  ✓ Scraped: %s (%d chars)", url, len(result["content"]))
        scraped_count += 1

    if scraped_count > 0:
        update_last_scraped(comp_id)
        logger.info("  Updated last_scraped_at for '%s'", name)

    return scraped_count


def main():
    parser = argparse.ArgumentParser(
        description="Scrapling-powered competitor scraper for Mo the CMO"
    )
    parser.add_argument(
        "--org-slug",
        help="Scrape all competitors for this organization slug",
    )
    parser.add_argument(
        "--competitor-id",
        help="Scrape a specific competitor by UUID",
    )
    parser.add_argument(
        "--stale-days",
        type=int,
        default=0,
        help="Only scrape competitors not scraped within N days (0 = scrape all)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON (for programmatic use)",
    )
    args = parser.parse_args()

    if not args.org_slug and not args.competitor_id:
        parser.error("Provide --org-slug or --competitor-id")

    competitors = []
    results = {"total": 0, "scraped": 0, "failed": 0, "skipped": 0}

    if args.competitor_id:
        comp = get_competitor_by_id(args.competitor_id)
        if not comp:
            logger.error("Competitor not found: %s", args.competitor_id)
            sys.exit(1)
        competitors = [comp]
    elif args.stale_days > 0:
        competitors = get_stale_competitors(args.org_slug, args.stale_days)
        logger.info(
            "Found %d stale competitors (>%d days) for org '%s'",
            len(competitors),
            args.stale_days,
            args.org_slug,
        )
    else:
        competitors = get_competitors_for_org(args.org_slug)
        logger.info(
            "Found %d competitors for org '%s'",
            len(competitors),
            args.org_slug,
        )

    results["total"] = len(competitors)

    if not competitors:
        logger.info("No competitors to scrape.")
        if args.json:
            print(json.dumps(results))
        sys.exit(0)

    for comp in competitors:
        count = scrape_competitor(comp)
        if count > 0:
            results["scraped"] += 1
        else:
            results["failed"] += 1

    logger.info(
        "Done: %d/%d competitors scraped successfully",
        results["scraped"],
        results["total"],
    )

    if args.json:
        print(json.dumps(results))


if __name__ == "__main__":
    main()
