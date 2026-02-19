const fallbackOrgSlug = "default-org";
const fallbackOrgName = "Your Brand";

export const CLIENT_DEFAULT_ORG_SLUG =
  process.env.NEXT_PUBLIC_DEFAULT_ORG_SLUG ?? fallbackOrgSlug;

export const CLIENT_DEFAULT_ORG_NAME =
  process.env.NEXT_PUBLIC_DEFAULT_ORG_NAME ?? fallbackOrgName;

export function buildClientApiHeaders(
  extraHeaders: Record<string, string> = {}
): Record<string, string> {
  return {
    "x-org-slug": CLIENT_DEFAULT_ORG_SLUG,
    ...extraHeaders,
  };
}
