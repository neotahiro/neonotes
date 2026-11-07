import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Server-side only. Reads secrets from environment variables:
 *   AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, ALLOWED_EMAIL
 * (and optionally ALLOWED_GOOGLE_SUB).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/drive.file",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    // Keep Google's refresh token inside the encrypted session cookie. It is never added to the
    // session object, so the browser cannot read it; only our server routes can.
    jwt({ token, account }) {
      if (account?.refresh_token) token.refreshToken = account.refresh_token;
      return token;
    },
    // The allow-list. Anything that doesn't match is refused, including when settings are missing.
    signIn({ account, profile }) {
      if (account?.provider !== "google") return false;
      const allowedEmail = process.env.ALLOWED_EMAIL?.trim().toLowerCase();
      if (!allowedEmail) return false;
      if (profile?.email_verified !== true) return false;
      if (profile.email?.toLowerCase() !== allowedEmail) return false;
      const allowedSub = process.env.ALLOWED_GOOGLE_SUB?.trim();
      if (allowedSub && profile.sub !== allowedSub) return false;
      return true;
    },
  },
});
