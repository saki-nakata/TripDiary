import NextAuth from "next-auth";
import { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { RateLimitError } from "@/lib/errors";

// ログイン試行回数が上限を超えた場合に code="rate_limit" として
// /login ページのURLに ?error=CredentialsSignin&code=rate_limit の形で伝播する。
class RateLimitSignInError extends CredentialsSignin {
  code = "rate_limit";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        // DBのemailカラムは大文字小文字を区別しない照合順序（utf8mb4_unicode_ci）のため、
        // レート制限キーも同じ基準で正規化しないと大文字小文字違いのバリエーションで
        // 5回/15分の制限を実質無制限に回避できてしまう
        const normalizedEmail = email.toLowerCase();

        try {
          checkRateLimit(`login:${normalizedEmail}`, 5, 15 * 60 * 1000);
        } catch (e) {
          if (e instanceof RateLimitError) throw new RateLimitSignInError();
          throw e;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) return null;

        const isValid = await compare(password, user.password);
        if (!isValid) return null;

        return { id: user.id, nickname: user.nickname, email: user.email, image: user.image ?? null };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      if (user?.nickname) token.nickname = user.nickname;
      return token;
    },
    async session({ session, token }) {
      if (token?.id) session.user.id = token.id as string;
      if (token?.nickname) session.user.nickname = token.nickname as string;
      return session;
    },
  },
});
