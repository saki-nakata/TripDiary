import { cache } from "react";
import { logger } from "@/lib/logger";
import { getThemePreferenceService } from "@/lib/services/user.service";
import type { ThemeChoice } from "@/components/ui/theme";

// 同一リクエスト内で複数箇所からテーマを取得しても実DBアクセスは1回にする
export const getThemePreferenceCached = cache(getThemePreferenceService);

// RootLayoutから呼ばれる、Cookie/DBの優先順位を確定させる唯一の入口。
// DB取得に失敗しても画面全体を落とさず、Cookie値またはsystemへフォールバックする
export async function resolveThemeForRequest({
  userId,
  cookieValue,
}: {
  userId: string | undefined;
  cookieValue: ThemeChoice;
}): Promise<ThemeChoice> {
  if (!userId) return cookieValue;

  try {
    const dbValue = await getThemePreferenceCached(userId);
    return dbValue ?? cookieValue;
  } catch (e) {
    logger.error({ err: e, userId }, "テーマ設定のDB取得に失敗したためCookie/systemへフォールバックします");
    return cookieValue;
  }
}
