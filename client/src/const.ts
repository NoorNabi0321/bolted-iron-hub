export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Whether Manus OAuth is configured for this deployment. Off Manus (e.g. Railway)
// it isn't, so the OAuth button can be hidden and login uses email/password.
export const isOAuthConfigured = Boolean(import.meta.env.VITE_OAUTH_PORTAL_URL);

// Generate login URL at runtime so redirect URI reflects the current origin.
// Returns "" when OAuth isn't configured so we never construct an invalid URL
// (which would crash the whole app on render).
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  if (!oauthPortalUrl) return "";

  try {
    const redirectUri = `${window.location.origin}/api/oauth/callback`;
    const state = btoa(redirectUri);

    const url = new URL(`${oauthPortalUrl}/app-auth`);
    url.searchParams.set("appId", appId ?? "");
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");

    return url.toString();
  } catch {
    return "";
  }
};
