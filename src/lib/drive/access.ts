import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Server-only. Turns the signed-in session into a short-lived Google access token.
 * The long-lived refresh token lives only inside the encrypted session cookie and is never sent to the browser.
 */
export class DriveAuthError extends Error {
  constructor(public reason: "signed-out" | "reauth") {
    super(reason);
  }
}

// Access tokens last about an hour. Keep them in memory so we don't ask Google on every request.
const cache = new Map<string, { token: string; expiresAt: number }>();

export async function getDriveAccess(req: NextRequest): Promise<string> {
  const secureCookie = req.nextUrl.protocol === "https:";
  const jwt = await getToken({ req, secret: process.env.AUTH_SECRET, secureCookie });
  if (!jwt) throw new DriveAuthError("signed-out");

  // Re-check the allow-list on every call, in case it changed after the session was issued.
  const allowed = process.env.ALLOWED_EMAIL?.trim().toLowerCase();
  if (!allowed || String(jwt.email ?? "").toLowerCase() !== allowed) throw new DriveAuthError("signed-out");

  const refreshToken = typeof jwt.refreshToken === "string" ? jwt.refreshToken : null;
  if (!refreshToken) throw new DriveAuthError("reauth"); // session from before Drive was added

  const hit = cache.get(refreshToken);
  if (hit && hit.expiresAt > Date.now() + 60_000) return hit.token;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID ?? "",
      client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (body.error === "invalid_grant") {
      cache.delete(refreshToken);
      throw new DriveAuthError("reauth"); // access was revoked or expired
    }
    throw new Error(`Token refresh failed (${res.status})`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cache.set(refreshToken, { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 });
  return data.access_token;
}
