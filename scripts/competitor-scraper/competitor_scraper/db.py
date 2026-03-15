"""Direct PostgreSQL writes to Supabase for scraped competitor content."""

import json
import uuid
from datetime import datetime, timezone
from typing import Optional

import psycopg2
import psycopg2.extras

from .config import DATABASE_URL

psycopg2.extras.register_uuid()


def _connect():
    return psycopg2.connect(DATABASE_URL)


def get_competitors_for_org(org_slug: str) -> list[dict]:
    """Fetch all competitor profiles for an org slug."""
    with _connect() as conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            SELECT cp.id, cp.org_id, cp.name, cp.urls, cp.social_profiles,
                   cp.last_scraped_at, cp.metadata
            FROM competitor_profiles cp
            JOIN organizations o ON o.id = cp.org_id
            WHERE o.slug = %s
            ORDER BY cp.updated_at DESC
            """,
            (org_slug,),
        )
        rows = cur.fetchall()
        # Convert jsonb fields
        for row in rows:
            if isinstance(row.get("urls"), str):
                row["urls"] = json.loads(row["urls"])
            if isinstance(row.get("social_profiles"), str):
                row["social_profiles"] = json.loads(row["social_profiles"])
        return rows


def get_competitor_by_id(competitor_id: str) -> Optional[dict]:
    """Fetch a single competitor profile by ID."""
    with _connect() as conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, org_id, name, urls, social_profiles,
                   last_scraped_at, metadata
            FROM competitor_profiles
            WHERE id = %s
            """,
            (competitor_id,),
        )
        row = cur.fetchone()
        if row:
            if isinstance(row.get("urls"), str):
                row["urls"] = json.loads(row["urls"])
            if isinstance(row.get("social_profiles"), str):
                row["social_profiles"] = json.loads(row["social_profiles"])
        return row


def store_scraped_content(
    competitor_id: str,
    org_id: str,
    url: str,
    content: str,
    platform: Optional[str] = None,
    published_at: Optional[datetime] = None,
) -> str:
    """Upsert scraped content. Returns the content row ID."""
    content_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    with _connect() as conn, conn.cursor() as cur:
        # Delete old content for this competitor+url to avoid unbounded growth
        cur.execute(
            """
            DELETE FROM competitor_content
            WHERE competitor_id = %s AND url = %s
            """,
            (competitor_id, url),
        )
        cur.execute(
            """
            INSERT INTO competitor_content (id, competitor_id, org_id, url, content, platform, published_at, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (content_id, competitor_id, org_id, url, content, platform, published_at, now),
        )
        conn.commit()
    return content_id


def update_last_scraped(competitor_id: str):
    """Set last_scraped_at = now() on the competitor profile."""
    now = datetime.now(timezone.utc)
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
            UPDATE competitor_profiles
            SET last_scraped_at = %s, updated_at = %s
            WHERE id = %s
            """,
            (now, now, competitor_id),
        )
        conn.commit()


def get_stale_competitors(org_slug: str, stale_days: int) -> list[dict]:
    """Return competitors whose last_scraped_at is older than stale_days (or never scraped)."""
    with _connect() as conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            SELECT cp.id, cp.org_id, cp.name, cp.urls, cp.social_profiles,
                   cp.last_scraped_at
            FROM competitor_profiles cp
            JOIN organizations o ON o.id = cp.org_id
            WHERE o.slug = %s
              AND (cp.last_scraped_at IS NULL
                   OR cp.last_scraped_at < NOW() - INTERVAL '%s days')
            ORDER BY cp.last_scraped_at ASC NULLS FIRST
            """,
            (org_slug, stale_days),
        )
        rows = cur.fetchall()
        for row in rows:
            if isinstance(row.get("urls"), str):
                row["urls"] = json.loads(row["urls"])
            if isinstance(row.get("social_profiles"), str):
                row["social_profiles"] = json.loads(row["social_profiles"])
        return rows
