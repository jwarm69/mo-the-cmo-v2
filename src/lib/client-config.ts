const fallbackOrgSlug = "default-org";
const fallbackOrgName = "Your Brand";

export const CLIENT_DEFAULT_ORG_SLUG =
  process.env.NEXT_PUBLIC_DEFAULT_ORG_SLUG ?? fallbackOrgSlug;

export const CLIENT_DEFAULT_ORG_NAME =
  process.env.NEXT_PUBLIC_DEFAULT_ORG_NAME ?? fallbackOrgName;

export const CLIENT_APP_API_KEY = process.env.NEXT_PUBLIC_APP_API_KEY ?? "";

export function buildClientApiHeaders(
  extraHeaders: Record<string, string> = {}
): Record<string, string> {
  const headers: Record<string, string> = {
    "x-org-slug": CLIENT_DEFAULT_ORG_SLUG,
    ...extraHeaders,
  };

  if (CLIENT_APP_API_KEY && !headers["x-api-key"]) {
    headers["x-api-key"] = CLIENT_APP_API_KEY;
  }

  return headers;
}
