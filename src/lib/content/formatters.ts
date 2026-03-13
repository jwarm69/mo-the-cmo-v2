import type { ContentItem } from "@/lib/types";

function formatTikTok(item: ContentItem): string {
  const parts: string[] = [];
  if (item.hook) parts.push(item.hook);
  if (item.body) parts.push(item.body);
  if (item.cta) parts.push(item.cta);
  const caption = parts.join(" ");

  if (item.hashtags.length > 0) {
    return caption + "\n\n" + item.hashtags.join(" ");
  }
  return caption;
}

function formatInstagram(item: ContentItem): string {
  const sections: string[] = [];
  if (item.hook) sections.push(item.hook);
  if (item.body) sections.push(item.body);
  if (item.cta) sections.push(item.cta);
  if (item.hashtags.length > 0) sections.push(item.hashtags.join(" "));
  return sections.join("\n\n");
}

function formatTwitter(item: ContentItem): string {
  const text = item.body || "";
  if (text.length <= 280) return text;
  return text.slice(0, 277) + "...";
}

function formatEmail(item: ContentItem): string {
  const sections: string[] = [];
  if (item.hook) sections.push(`Subject: ${item.hook}`);
  if (item.body) sections.push(item.body);
  if (item.cta) sections.push(item.cta);
  return sections.join("\n\n");
}

function formatBlog(item: ContentItem): string {
  const sections: string[] = [];
  if (item.hook) sections.push(`# ${item.hook}`);
  if (item.body) sections.push(item.body);
  if (item.cta) sections.push(`---\n${item.cta}`);
  return sections.join("\n\n");
}

function formatDefault(item: ContentItem): string {
  const parts: string[] = [];
  if (item.hook) parts.push(item.hook);
  if (item.body) parts.push(item.body);
  if (item.cta) parts.push(item.cta);
  return parts.join("\n\n");
}

export function formatForClipboard(item: ContentItem): string {
  switch (item.platform) {
    case "tiktok":
      return formatTikTok(item);
    case "instagram":
      return formatInstagram(item);
    case "twitter":
      return formatTwitter(item);
    case "email":
      return formatEmail(item);
    case "blog":
      return formatBlog(item);
    default:
      return formatDefault(item);
  }
}
