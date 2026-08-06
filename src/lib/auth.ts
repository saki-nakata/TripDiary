import NextAuth from "next-auth";
import { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "@node-rs/bcrypt";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { RateLimitError } from "@/lib/errors";
import { logger } from "@/lib/logger";

// ログイン試行回数が上限を超えた場合に code="rate_limit" として
// /login ページのURLに ?error=CredentialsSignin&code=rate_limit の形で伝播する。
class RateLimitSignInError extends CredentialsSignin {
  code = "rate_limit";
}

// テスト容易性のため、Credentials()のインライン関数ではなく名前付きexportとして切り出す
// （GATE-23）。ロジックはインライン時から変更していない。
//
// 既知のスコープ限定: ここでのレート制限キーは login:${normalizedEmail} のみでIPベースではない
// （IPベースの制限があるのはsignup:${getClientIp(req)}のみ）。そのため「1つのIPから大量の
// 別メールアドレスでログイン試行する」攻撃はこのレート制限にはかからず、
// reason: "invalid_credentials" のログが大量に出力されるだけになる。これはログによる
// 監視・検知の実現のみをスコープとした意図的な設計であり、IPベースのログイン試行制限は
// 追加していない（追加するとMAX_BUCKETS消費が実質倍増するため、単一プロセス前提の設計を
// 崩さないかの検討が別途必要）。
export async function authorizeCredentials(
  credentials: Partial<Record<"email" | "password", unknown>>,
  request: Request
) {
  const parsed = loginSchema.safeParse(credentials);
  if (!parsed.success) {
    logger.warn({ reason: "invalid_format" }, "Login attempt failed");
    return null;
  }

  const { email, password } = parsed.data;
  // DBのemailカラムは大文字小文字を区別しない照合順序（utf8mb4_unicode_ci）のため、
  // レート制限キーも同じ基準で正規化しないと大文字小文字違いのバリエーションで
  // 5回/15分の制限を実質無制限に回避できてしまう
  const normalizedEmail = email.toLowerCase();
  // Nginxが X-Forwarded-For を $remote_addr で上書き済み（appendではない）のため信頼できる
  const ip = getClientIp(request);

  try {
    checkRateLimit(`login:${normalizedEmail}`, 5, 15 * 60 * 1000);
  } catch (e) {
    if (e instanceof RateLimitError) {
      logger.warn({ ip, email: normalizedEmail, reason: "rate_limited" }, "Login attempt failed");
      throw new RateLimitSignInError();
    }
    throw e;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password) {
    logger.warn({ ip, email: normalizedEmail, reason: "invalid_credentials" }, "Login attempt failed");
    return null;
  }

  const isValid = await compare(password, user.password);
  if (!isValid) {
    logger.warn({ ip, email: normalizedEmail, reason: "invalid_credentials" }, "Login attempt failed");
    return null;
  }

  return { id: user.id, nickname: user.nickname, email: user.email, image: user.image ?? null };
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
      authorize: authorizeCredentials,
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
