import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncThemeOnAuthBoundaryService, updateThemePreferenceService } from "@/lib/services/user.service";
import { themeUpdateSchema } from "@/lib/validations/user";
import { handleApiError } from "@/lib/api-error";
import { UnauthorizedError, ValidationError } from "@/lib/errors";
import { withRequestLogging } from "@/lib/request-logging";
import { parseThemeCookie, THEME_COOKIE_NAME, buildThemeCookieOptionsForResponse } from "@/lib/theme-cookie";

// ログイン直後・ログアウト直前の共通同期。DBに値があればCookieへミラーし、
// DBがnullなら検証済みCookie値（未設定はsystem）をDBへ昇格する
async function handlePOST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    const cookieValue = parseThemeCookie(req.cookies.get(THEME_COOKIE_NAME)?.value);
    const resolved = await syncThemeOnAuthBoundaryService(session.user.id, cookieValue);

    const response = NextResponse.json({ theme: resolved });
    response.cookies.set(
      THEME_COOKIE_NAME,
      resolved,
      buildThemeCookieOptionsForResponse(req.nextUrl.protocol === "https:")
    );
    return response;
  } catch (e) {
    return handleApiError(e);
  }
}

// ログイン済みユーザーによる明示的なテーマ変更
async function handlePATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    const json = await req.json();
    const parsed = themeUpdateSchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError("入力内容を確認してください", parsed.error.flatten().fieldErrors);
    }

    await updateThemePreferenceService(session.user.id, parsed.data.theme);

    const response = NextResponse.json({ theme: parsed.data.theme });
    response.cookies.set(
      THEME_COOKIE_NAME,
      parsed.data.theme,
      buildThemeCookieOptionsForResponse(req.nextUrl.protocol === "https:")
    );
    return response;
  } catch (e) {
    return handleApiError(e);
  }
}

export const POST = withRequestLogging(handlePOST);
export const PATCH = withRequestLogging(handlePATCH);
