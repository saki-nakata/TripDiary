type LogoVariant = "authenticated" | "guest";

// 2026-08-01決定: ログイン状態で色味を維持しつつ、6箇所（Sidebar×2・GuestMobileNav・
// (public)/layout・login・signup）で使われていた微妙に異なる緑→ティールの2色指定を
// 3色グラデーションへ統一する。各色は`bg-surface`（ダークモードは#18181b）または
// 白背景に対しWCAG通常テキスト基準（4.5:1）を満たすことを確認済み。
// 開始色から系統が分かるよう、authenticatedは緑(green)系統、guestはエメラルド(emerald)系統
// で色ファミリー自体を分け、末尾もシアン系／スカイブルー系で書き分ける（2026-08-01再調整）。
const GRADIENTS: Record<LogoVariant, { light: string; dark: string }> = {
  // green系統: 深緑→ティール→シアン
  authenticated: {
    light: "from-[#166534] via-[#0f766e] to-[#0e7490]",
    dark: "dark:from-[#4ade80] dark:via-[#2dd4bf] dark:to-[#22d3ee]",
  },
  // emerald系統: 深いエメラルド→エメラルド→スカイブルー。login/signup画面もこちらを使用する
  guest: {
    light: "from-[#065f46] via-[#047857] to-[#0369a1]",
    dark: "dark:from-[#34d399] dark:via-[#2dd4bf] dark:to-[#38bdf8]",
  },
};

export function Logo({
  variant,
  className,
}: {
  variant: LogoVariant;
  className?: string;
}) {
  const g = GRADIENTS[variant];
  return (
    <span className={`bg-gradient-to-r ${g.light} ${g.dark} bg-clip-text text-transparent ${className ?? ""}`}>
      TripDiary
    </span>
  );
}
