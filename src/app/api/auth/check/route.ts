export const dynamic = "force-dynamic";

// TEMPORARY: reports the shape of the settings, never the secrets. Delete after use.
export async function GET() {
  const id = process.env.AUTH_GOOGLE_ID ?? "";
  const secret = process.env.AUTH_GOOGLE_SECRET ?? "";
  return Response.json(
    {
      vercelEnv: process.env.VERCEL_ENV ?? null,
      googleId: {
        length: id.length,
        first12: id.slice(0, 12),
        endsWithGoogleSuffix: id.endsWith(".apps.googleusercontent.com"),
        containsAtSign: id.includes("@"),
      },
      googleSecret: {
        length: secret.length,
        startsWithGOCSPX: secret.startsWith("GOCSPX-"),
        containsAtSign: secret.includes("@"),
      },
      allowedEmailSet: Boolean(process.env.ALLOWED_EMAIL),
      authSecretLength: (process.env.AUTH_SECRET ?? "").length,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
