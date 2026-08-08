// 本番に恒久的に残るテキスト。02-post-create.demo.spec.ts・01-feed-engage.demo.spec.ts・
// 04-record-and-reflect.demo.spec.tsが参照する。テスト由来の文言（`E2Eテスト投稿_${Date.now()}`等）
// は本番へ絶対に残さない。

export const DEMO_POST = {
  title: "デモ動画用の旅の記録",
  body: "TripDiary公式デモアカウントから、投稿・地図機能をご紹介します。",
  category: "観光",
  location: "東京都",
} as const;

export const DEMO_COMMENT_BODY = "素敵な写真ですね、行ってみたくなりました！";

export const DEMO_PLAN_TITLE = "気になるスポット巡りプラン";
